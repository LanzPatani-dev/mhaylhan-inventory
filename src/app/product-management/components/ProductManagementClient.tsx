'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ProductFormModal from './ProductFormModal';

export interface Product {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  categoryId?: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  expirationDate: string;
  dateAdded: string;
  status: 'Active' | 'Inactive';
  stockStatus: 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock';
  expiryStatus: 'Valid' | 'Expiring Soon' | 'Expiring (7d)' | 'Expired';
}

const CATEGORIES = ['All', 'Rice', 'Grocery', 'Beverages', 'Canned Goods', 'Plastic Products', 'Styro Materials', 'Other Merchandise'];
const STOCK_STATUSES = ['All', 'Normal', 'Low Stock', 'Critical', 'Out of Stock'];
const STATUSES = ['All', 'Active', 'Inactive'];

function mapProduct(row: any, categories: Record<string, string>): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    productName: row.product_name,
    category: categories[row.category_id] || 'Uncategorized',
    categoryId: row.category_id,
    unit: row.unit,
    quantity: row.quantity,
    minimumStock: row.minimum_stock,
    expirationDate: row.expiration_date || 'N/A',
    dateAdded: row.date_added ? new Date(row.date_added).toLocaleDateString('en-US') : '',
    status: row.status as 'Active' | 'Inactive',
    stockStatus: row.stock_status as Product['stockStatus'],
    expiryStatus: row.expiry_status as Product['expiryStatus'],
  };
}

export default function ProductManagementClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<keyof Product>('productName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase.from('categories').select('id, name');
      const map: Record<string, string> = {};
      cats?.forEach((c: any) => { map[c.id] = c.name; });
      setCategoryMap(map);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_name', { ascending: true });

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to load products');
        return;
      }

      setProducts((data || []).map((row: any) => mapProduct(row, map)));
    } catch (err: any) {
      toast.error('Error loading products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let data = [...products];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((p) =>
        p.productName.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') data = data.filter((p) => p.category === categoryFilter);
    if (stockFilter !== 'All') data = data.filter((p) => p.stockStatus === stockFilter);
    if (statusFilter !== 'All') data = data.filter((p) => p.status === statusFilter);
    data.sort((a, b) => {
      const av = String(a[sortKey]);
      const bv = String(b[sortKey]);
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [products, search, categoryFilter, stockFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: keyof Product) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map((p) => p.id)));
  };

  const handleSave = async (data: Partial<Product>): Promise<boolean> => {
    try {
      // Find category_id from name
      const catId = Object.entries(categoryMap).find(([, name]) => name === data.category)?.[0] || null;

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            barcode: data.barcode,
            product_name: data.productName,
            category_id: catId,
            unit: data.unit,
            quantity: Number(data.quantity),
            minimum_stock: Number(data.minimumStock),
            expiration_date: data.expirationDate || 'N/A',
            status: data.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editProduct.id);

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          toast.error('Failed to update product');
          return false;
        }
        toast.success('Product updated successfully.');
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            barcode: data.barcode,
            product_name: data.productName,
            category_id: catId,
            unit: data.unit,
            quantity: Number(data.quantity) || 0,
            minimum_stock: Number(data.minimumStock) || 0,
            expiration_date: data.expirationDate || 'N/A',
            status: 'Active',
            stock_status: 'Normal',
            expiry_status: 'Valid',
            created_by: user?.id,
          });

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          if (error.code === '42501') {
            toast.error('Supabase blocked this product insert. Apply the latest products RLS migration and confirm your signed-in account is an admin or active staff user.');
            return false;
          }
          if (error.code === '23505') { toast.error('A product with this barcode already exists.'); return false; }
          toast.error('Failed to add product');
          return false;
        }
        toast.success('Product added successfully.');
      }

      setModalOpen(false);
      setEditProduct(null);
      await loadData();
      return true;
    } catch (err: any) {
      toast.error('Error: ' + err.message);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to delete product');
        return;
      }
      toast.success(`"${deleteTarget.productName}" has been deleted.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to update status');
        return;
      }
      toast.success(`"${product.productName}" ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const SortIcon = ({ col }: { col: keyof Product }) => (
    <span className="ml-1 opacity-50">
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Manage Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.filter(p => p.status === 'Active').length} active products in catalog</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by product name, barcode, category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30">
            {CATEGORIES.map((c) => <option key={`cat-${c}`} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30">
            {STOCK_STATUSES.map((s) => <option key={`stock-${s}`} value={s}>{s === 'All' ? 'All Stock Status' : s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30">
            {STATUSES.map((s) => <option key={`status-${s}`} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
          {(search || categoryFilter !== 'All' || stockFilter !== 'All' || statusFilter !== 'All') && (
            <button onClick={() => { setSearch(''); setCategoryFilter('All'); setStockFilter('All'); setStatusFilter('All'); setPage(1); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-colors">
              Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} products found</p>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-foreground text-background rounded-xl px-5 py-3 flex items-center gap-4 shadow-2xl slide-up">
          <span className="text-sm font-600">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-background/20" />
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-background/60 hover:text-background">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin w-6 h-6 text-primary mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary" />
                  </th>
                  {[
                    { label: 'Barcode', key: 'barcode' as keyof Product },
                    { label: 'Product Name', key: 'productName' as keyof Product },
                    { label: 'Category', key: 'category' as keyof Product },
                    { label: 'Unit', key: 'unit' as keyof Product },
                    { label: 'Qty', key: 'quantity' as keyof Product },
                    { label: 'Min Stock', key: 'minimumStock' as keyof Product },
                    { label: 'Expiry Date', key: 'expirationDate' as keyof Product },
                    { label: 'Stock Status', key: 'stockStatus' as keyof Product },
                    { label: 'Expiry Status', key: 'expiryStatus' as keyof Product },
                    { label: 'Status', key: 'status' as keyof Product },
                  ].map((col) => (
                    <th key={`th-${col.key}`} onClick={() => toggleSort(col.key)} className="px-4 py-3 text-left text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none">
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-600 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        <p className="font-600 text-foreground">No products found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
                        <button onClick={() => { setEditProduct(null); setModalOpen(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 transition-colors">Add First Product</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="w-4 h-4 rounded accent-primary" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{product.barcode}</td>
                      <td className="px-4 py-3"><p className="font-500 text-foreground">{product.productName}</p></td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{product.unit}</td>
                      <td className="px-4 py-3 font-600 tabular-nums text-foreground">{product.quantity}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{product.minimumStock}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{product.expirationDate}</td>
                      <td className="px-4 py-3"><StatusBadge status={product.stockStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={product.expiryStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={product.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditProduct(product); setModalOpen(true); }} title="Edit product" className="p-1.5 rounded-md hover:bg-info/10 text-muted-foreground hover:text-info transition-colors">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => handleToggleStatus(product)} title={product.status === 'Active' ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-md hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18.36 6.64A9 9 0 0 1 20.77 15" /><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(product)} title="Delete product" className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} products
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2.5 py-1.5 rounded-md text-xs font-500 border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button key={`page-${p}`} onClick={() => setPage(p)} className={`w-8 h-8 rounded-md text-xs font-600 transition-colors ${page === p ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>{p}</button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-2.5 py-1.5 rounded-md text-xs font-500 border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        product={editProduct}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditProduct(null); }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.productName}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}