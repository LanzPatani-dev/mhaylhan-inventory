'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Category {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  sortOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryForm {
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  sortOrder: number;
}

const emptyForm: CategoryForm = { name: '', description: '', status: 'Active', sortOrder: 0 };

export default function CategoryManagementClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<CategoryForm>>({});
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Get categories with product counts
      const { data: cats, error } = await supabase
        .from('categories')
        .select('id, name, description, status, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to load categories');
        return;
      }

      // Get product counts per category
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .eq('status', 'Active');

      const countMap: Record<string, number> = {};
      products?.forEach((p: { category_id: string }) => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });

      const mapped: Category[] = (cats || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        status: c.status as 'Active' | 'Inactive',
        sortOrder: c.sort_order || 0,
        productCount: countMap[c.id] || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      setCategories(mapped);
    } catch (err: any) {
      toast.error('Failed to load categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let data = [...categories];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') data = data.filter((c) => c.status === statusFilter);
    return data;
  }, [categories, search, statusFilter]);

  const openAdd = () => {
    setEditCategory(null);
    setForm({ ...emptyForm, sortOrder: categories.length + 1 });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCategory(cat);
    setForm({ name: cat.name, description: cat.description, status: cat.status, sortOrder: cat.sortOrder });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<CategoryForm> = {};
    if (!form.name.trim()) errs.name = 'Category name is required.';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    else {
      const duplicate = categories.find(
        (c) => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== editCategory?.id
      );
      if (duplicate) errs.name = 'A category with this name already exists.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (editCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: form.name.trim(),
            description: form.description.trim(),
            status: form.status,
            sort_order: form.sortOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editCategory.id);

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          toast.error('Failed to update category');
          return;
        }
        toast.success(`"${form.name}" updated successfully.`);
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: form.name.trim(),
            description: form.description.trim(),
            status: form.status,
            sort_order: form.sortOrder,
            created_by: user?.id,
          });

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          if (error.code === '23505') {
            setFormErrors({ name: 'A category with this name already exists.' });
            return;
          }
          toast.error('Failed to create category');
          return;
        }
        toast.success(`"${form.name}" category created successfully.`);
      }

      setModalOpen(false);
      setEditCategory(null);
      await loadCategories();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!deactivateTarget) return;
    const newStatus = deactivateTarget.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const { error } = await supabase
        .from('categories')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', deactivateTarget.id);

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to update status');
        return;
      }

      toast.success(`"${deactivateTarget.name}" ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`);
      setDeactivateTarget(null);
      await loadCategories();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const activeCount = categories.filter((c) => c.status === 'Active').length;
  const inactiveCount = categories.filter((c) => c.status === 'Inactive').length;
  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <AppLayout role="admin">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeCount} active categories · {totalProducts} products categorized
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Category
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Categories', value: categories.length, color: 'text-foreground', bg: 'bg-card' },
            { label: 'Active', value: activeCount, color: 'text-success', bg: 'bg-success/5 border-success/20' },
            { label: 'Inactive', value: inactiveCount, color: 'text-muted-foreground', bg: 'bg-muted/40' },
            { label: 'Total Products', value: totalProducts, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border border-border p-4 ${stat.bg}`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
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
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {(search || statusFilter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('All'); }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{filtered.length} categories found</p>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin w-6 h-6 text-primary mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No categories found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or add a new category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {['Category Name', 'Description', 'Products', 'Sort Order', 'Status', 'Last Updated', 'Actions'].map((h) => (
                      <th key={`cth-${h}`} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cat) => (
                    <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                          </div>
                          <span className="font-semibold text-foreground">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {cat.description || <span className="italic text-muted-foreground/50">No description</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                          {cat.productCount ?? 0} products
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{cat.sortOrder}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          cat.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.status === 'Active' ? 'bg-success' : 'bg-muted-foreground'}`} />
                          {cat.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(cat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit category"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeactivateTarget(cat)}
                            className={`p-1.5 rounded-md transition-colors ${
                              cat.status === 'Active' ? 'hover:bg-warning/10 text-muted-foreground hover:text-warning' : 'hover:bg-success/10 text-muted-foreground hover:text-success'
                            }`}
                            title={cat.status === 'Active' ? 'Deactivate' : 'Activate'}
                          >
                            {cat.status === 'Active' ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                {editCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    formErrors.name ? 'border-danger' : 'border-input focus:border-primary'
                  }`}
                  placeholder="e.g. Rice, Beverages, Canned Goods"
                />
                {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary resize-none"
                  placeholder="Brief description of this category"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : editCategory ? 'Update Category' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirm */}
      <ConfirmModal
        open={!!deactivateTarget}
        title={deactivateTarget?.status === 'Active' ? 'Deactivate Category' : 'Activate Category'}
        message={
          deactivateTarget?.status === 'Active'
            ? `Are you sure you want to deactivate "${deactivateTarget?.name}"? Products in this category will remain but the category won't appear in new product forms.`
            : `Activate "${deactivateTarget?.name}"? This category will be available for product assignment again.`
        }
        confirmLabel={deactivateTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={deactivateTarget?.status === 'Active' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AppLayout>
  );
}