'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type InventoryItem, getInventoryRows, computeExpiryStatus, computeStockStatus } from '@/lib/mockInventory';

// BACKEND INTEGRATION POINT: Fetch paginated inventory from /api/inventory?page=&limit=&filters=

const PAGE_SIZES = [10, 25, 50];
const CATEGORIES = ['All', 'Rice', 'Grocery', 'Beverages', 'Canned Goods', 'Plastic Products', 'Styro Materials', 'Other Merchandise'];
const STOCK_STATUSES = ['All', 'Normal', 'Low Stock', 'Critical', 'Out of Stock'];
const EXPIRY_STATUSES = ['All', 'Valid', 'Expiring Soon', 'Expiring (7d)', 'Expired'];

export default function InventoryListClient() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [expiryFilter, setExpiryFilter] = useState('All');
  const [sortKey, setSortKey] = useState<keyof InventoryItem>('productName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const inventoryView = searchParams.get('view');

  useEffect(() => {
    setSearch('');
    setCategoryFilter('All');
    setStockFilter('All');
    setExpiryFilter('All');
    setPage(1);
    setSelectedIds(new Set());
  }, [inventoryView]);

  const refreshInventory = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, barcode, product_name, category_id, unit, quantity, minimum_stock, expiration_date, updated_at, date_added, stock_status, expiry_status, categories(name)')
      .order('product_name', { ascending: true });

    if (error) {
      // Keep the local demo catalog usable when the database is unavailable.
      setInventoryData(getInventoryRows());
      toast.error('Could not refresh inventory from the database. Showing saved local inventory.');
      setIsLoadingInventory(false);
      return;
    }

    const rows: InventoryItem[] = (data || []).map((row: any) => {
      const category = Array.isArray(row.categories)
        ? row.categories[0]?.name
        : row.categories?.name;
      const quantity = Number(row.quantity) || 0;
      const minimumStock = Number(row.minimum_stock) || 0;
      const expirationDate = row.expiration_date || 'N/A';
      const updatedAt = row.updated_at || row.date_added;

      return {
        id: row.id,
        barcode: row.barcode,
        productName: row.product_name,
        category: category || 'Uncategorized',
        unit: row.unit,
        quantity,
        minimumStock,
        expirationDate,
        stockStatus: computeStockStatus(quantity, minimumStock),
        expiryStatus: computeExpiryStatus(expirationDate),
        lastUpdated: updatedAt
          ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—',
      };
    });

    // An empty result can happen when the database has not been seeded yet.
    // Preserve the app's bundled/local catalog so the list does not appear blank.
    setInventoryData(rows.length > 0 ? rows : getInventoryRows());
    setIsLoadingInventory(false);
  }, [supabase]);

  useEffect(() => {
    void refreshInventory();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshInventory();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshInventory]);

  const filtered = useMemo(() => {
    let data = [...inventoryData];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((i) =>
        i.productName.toLowerCase().includes(q) ||
        i.barcode.includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') data = data.filter((i) => i.category === categoryFilter);
    if (inventoryView === 'low-stock') {
      data = data.filter((i) => i.stockStatus !== 'Normal');
    } else if (stockFilter !== 'All') {
      data = data.filter((i) => i.stockStatus === stockFilter);
    }
    if (inventoryView === 'expiration') {
      data = data.filter((i) => i.expiryStatus !== 'Valid');
    } else if (expiryFilter !== 'All') {
      data = data.filter((i) => i.expiryStatus === expiryFilter);
    }
    data.sort((a, b) => {
      const av = String(a[sortKey]);
      const bv = String(b[sortKey]);
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [inventoryData, search, categoryFilter, stockFilter, expiryFilter, inventoryView, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const visiblePage = Math.min(page, Math.max(totalPages, 1));
  const paged = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  useEffect(() => {
    if (page !== visiblePage) setPage(visiblePage);
  }, [page, visiblePage]);

  const toggleSort = (key: keyof InventoryItem) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map((i) => i.id)));
  };

  const clearInventoryFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStockFilter('All');
    setExpiryFilter('All');
    setPage(1);
    setSelectedIds(new Set());
    // Remove any dashboard/sidebar view filter too, not just dropdown filters.
    router.replace('/inventory-list?view=all');
  };

  const handleExport = () => {
    const rows = filtered
      .map((item) => `
        <tr>
          <td>${item.barcode}</td>
          <td>${item.productName}</td>
          <td>${item.category}</td>
          <td>${item.unit}</td>
          <td>${item.quantity}</td>
          <td>${item.minimumStock}</td>
          <td>${item.expirationDate}</td>
          <td>${item.stockStatus}</td>
          <td>${item.expiryStatus}</td>
          <td>${item.lastUpdated}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Inventory Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #1f2937;
              background: #fff;
            }
            .report-header {
              border-bottom: 2px solid #1f2937;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 28px;
            }
            .meta {
              font-size: 12px;
              color: #4b5563;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 6px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              font-weight: bold;
            }
            .summary {
              margin-bottom: 16px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Inventory Report</h1>
            <div class="meta">Generated: ${new Date().toLocaleString()}</div>
            <div class="meta">Products: ${filtered.length}</div>
          </div>

          <div class="summary">
            <strong>Filters:</strong> Search: ${search || '—'} | Category: ${categoryFilter} | Stock: ${stockFilter} | Expiry: ${expiryFilter}
          </div>

          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Min Stock</th>
                <th>Expiry Date</th>
                <th>Stock Status</th>
                <th>Expiry Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="10">No records available.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-report.html';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory report downloaded.');
  };

  // Summary counts
  const outOfStock = inventoryData.filter((i) => i.stockStatus === 'Out of Stock').length;
  const critical = inventoryData.filter((i) => i.stockStatus === 'Critical').length;
  const expiredCount = inventoryData.filter((i) => i.expiryStatus === 'Expired').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoadingInventory ? 'Loading current stock…' : `Complete stock overview — ${inventoryData.length} products tracked`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/stock-in"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
            </svg>
            Stock-In
          </Link>
          <Link
            href="/stock-out"
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
            Stock-Out
          </Link>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Alert summary row */}
      {(outOfStock > 0 || critical > 0 || expiredCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {outOfStock > 0 && (
            <button
              onClick={() => { setStockFilter('Out of Stock'); setPage(1); }}
              className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {outOfStock} Out of Stock
            </button>
          )}
          {critical > 0 && (
            <button
              onClick={() => { setStockFilter('Critical'); setPage(1); }}
              className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {critical} Critical Stock
            </button>
          )}
          {expiredCount > 0 && (
            <button
              onClick={() => { setExpiryFilter('Expired'); setPage(1); }}
              className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {expiredCount} Expired Products
            </button>
          )}
          <button
            onClick={clearInventoryFilters}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-2 transition-colors"
          >
            Clear alerts filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search product name, barcode, or category..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {CATEGORIES.map((c) => <option key={`ilcat-${c}`} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {STOCK_STATUSES.map((s) => <option key={`ilstock-${s}`} value={s}>{s === 'All' ? 'All Stock Status' : s}</option>)}
          </select>
          <select
            value={expiryFilter}
            onChange={(e) => { setExpiryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            {EXPIRY_STATUSES.map((s) => <option key={`ilexpiry-${s}`} value={s}>{s === 'All' ? 'All Expiry Status' : s}</option>)}
          </select>
          {(search || categoryFilter !== 'All' || stockFilter !== 'All' || expiryFilter !== 'All') && (
            <button
              onClick={clearInventoryFilters}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isLoadingInventory ? 'Loading inventory…' : `${filtered.length} products found`}</span>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 border border-input rounded text-xs bg-background focus:outline-none"
            >
              {PAGE_SIZES.map((s) => <option key={`ps-${s}`} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-foreground text-background rounded-xl px-5 py-3 flex items-center gap-4 shadow-2xl slide-up">
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-background/20" />
          <button
            onClick={() => { toast.success('Export selected items — connect backend.'); }}
            className="text-sm font-medium hover:text-green-300 transition-colors"
          >Export Selected</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-background/60 hover:text-background">Cancel</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-primary" />
                </th>
                {[
                  { label: 'Barcode', key: 'barcode' as keyof InventoryItem },
                  { label: 'Product Name', key: 'productName' as keyof InventoryItem },
                  { label: 'Category', key: 'category' as keyof InventoryItem },
                  { label: 'Unit', key: 'unit' as keyof InventoryItem },
                  { label: 'Qty', key: 'quantity' as keyof InventoryItem },
                  { label: 'Min Stock', key: 'minimumStock' as keyof InventoryItem },
                  { label: 'Expiry Date', key: 'expirationDate' as keyof InventoryItem },
                  { label: 'Stock Status', key: 'stockStatus' as keyof InventoryItem },
                  { label: 'Expiry Status', key: 'expiryStatus' as keyof InventoryItem },
                  { label: 'Last Updated', key: 'lastUpdated' as keyof InventoryItem },
                ].map((col) => (
                  <th
                    key={`ilth-${col.key}`}
                    onClick={() => toggleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                  >
                    {col.label}
                    <span className="ml-1 opacity-50 text-xs">
                      {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingInventory ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-sm text-muted-foreground">Loading current inventory…</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <p className="font-semibold text-foreground">No inventory items found</p>
                      <p className="text-sm text-muted-foreground max-w-xs">No products match your current search or filter criteria. Try adjusting the filters above.</p>
                      <button
                        onClick={clearInventoryFilters}
                        className="text-sm text-primary font-semibold hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((item) => {
                  const isAlert = item.stockStatus === 'Out of Stock' || item.stockStatus === 'Critical' || item.expiryStatus === 'Expired';
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors group ${isAlert ? 'bg-danger/5' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.barcode}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{item.category}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold tabular-nums text-sm ${item.quantity === 0 ? 'text-danger' : item.quantity <= item.minimumStock ? 'text-warning' : 'text-foreground'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-muted-foreground">{item.minimumStock}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.expirationDate}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.stockStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.expiryStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.lastUpdated}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href="/stock-in"
                            title="Record Stock-In for this product"
                            className="p-1.5 rounded-md hover:bg-success/10 text-muted-foreground hover:text-success transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                            </svg>
                          </Link>
                          <Link
                            href="/stock-out"
                            title="Record Stock-Out for this product"
                            className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                            </svg>
                          </Link>
                          <Link
                            href="/product-management"
                            title="Edit product details"
                            className="p-1.5 rounded-md hover:bg-info/10 text-muted-foreground hover:text-info transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const startPage = Math.max(1, Math.min(page - 3, totalPages - 6));
                const p = startPage + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={`ilpage-${p}`}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-xs font-semibold transition-colors ${page === p ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}