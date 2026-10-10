'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import StaffSignupApprovals from './StaffSignupApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

interface StaffUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: 'Admin' | 'Staff';
  status: 'Active' | 'Inactive';
  dateCreated: string;
  lastLogin: string;
}

interface UserFormData {
  fullName: string;
  username: string;
  email: string;
  role: 'Admin' | 'Staff';
  password: string;
  confirmPassword: string;
}

const emptyForm: UserFormData = { fullName: '', username: '', email: '', role: 'Staff', password: '', confirmPassword: '' };

export default function UserManagementClient() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { role: currentRole } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'approvals' ? 'approvals' : 'users';
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, username, role, is_active, last_login, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to load users');
        return;
      }

      const mapped: StaffUser[] = (data || []).map((u: any) => ({
        id: u.id,
        fullName: u.full_name || u.email,
        username: u.username || u.email.split('@')[0],
        email: u.email,
        role: u.role === 'admin' ? 'Admin' : 'Staff',
        status: u.is_active ? 'Active' : 'Inactive',
        dateCreated: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastLogin: u.last_login
          ? new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'Never',
      }));

      setUsers(mapped);
    } catch (err: any) {
      toast.error('Error loading users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let data = [...users];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'All') data = data.filter((u) => u.role === roleFilter);
    if (statusFilter !== 'All') data = data.filter((u) => u.status === statusFilter);
    return data;
  }, [users, search, roleFilter, statusFilter]);

  const openAdd = () => {
    setEditUser(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (user: StaffUser) => {
    setEditUser(user);
    setFormData({ fullName: user.fullName, username: user.username, email: user.email, role: user.role, password: '', confirmPassword: '' });
    setFormErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<UserFormData> = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!editUser) {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    } else if (formData.password) {
      if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }
    const dupEmail = users.find((u) => u.email === formData.email && u.id !== editUser?.id);
    if (dupEmail) errors.email = 'Email already registered';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (editUser) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.fullName,
            username: formData.username,
            role: formData.role.toLowerCase() as 'admin' | 'staff',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editUser.id);

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          toast.error('Failed to update user');
          return;
        }
        toast.success(`${formData.fullName}'s account updated successfully.`);
      } else {
        // Create auth user via Supabase admin signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              username: formData.username,
              role: formData.role.toLowerCase(),
            },
          },
        });

        if (authError) {
          toast.error('Failed to create account: ' + authError.message);
          return;
        }
        toast.success(`Staff account for ${formData.fullName} created successfully.`);
      }

      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleToggleStatus = async () => {
    if (!deactivateTarget) return;
    const newStatus = deactivateTarget.status === 'Active' ? false : true;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', deactivateTarget.id);

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        toast.error('Failed to update status');
        return;
      }
      toast.success(`${deactivateTarget.fullName}'s account ${newStatus ? 'reactivated' : 'deactivated'}.`);
      setDeactivateTarget(null);
      await loadUsers();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetTarget.email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        toast.error('Failed to send reset link: ' + error.message);
        return;
      }
      toast.success(`Password reset link sent to ${resetTarget.email}.`);
      setResetTarget(null);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'Active').length,
    inactive: users.filter((u) => u.status === 'Inactive').length,
    admins: users.filter((u) => u.role === 'Admin').length,
  }), [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-700 text-foreground">User Management</h1>
            <span className="px-2 py-0.5 bg-danger/10 text-danger text-xs font-700 rounded-full">Admin Only</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage staff accounts, roles, and access control</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Staff Account
        </button>
      </div>

      {currentRole === 'admin' && (
        <div className="flex gap-2 border-b border-border">
          <a href="/user-management" className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            Staff Accounts
          </a>
          <a href="/user-management?tab=approvals" className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'approvals' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            Signup Approvals
          </a>
        </div>
      )}

      {currentRole === 'admin' && <StaffSignupApprovals active={activeTab === 'approvals'} />}

      {/* Stats */}
      {activeTab === 'users' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', value: stats.total, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          { label: 'Active', value: stats.active, color: 'text-success', bg: 'bg-success/5 border-success/20' },
          { label: 'Inactive', value: stats.inactive, color: 'text-muted-foreground', bg: 'bg-card border-border' },
          { label: 'Admins', value: stats.admins, color: 'text-warning', bg: 'bg-warning/5 border-warning/20' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-700 tabular-nums mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>}

      {/* Filters */}
      {activeTab === 'users' && <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search by name, username, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>}

      {/* Table */}
      {activeTab === 'users' && <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-700 text-foreground">Staff Accounts</h2>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{filtered.length} accounts</span>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin w-6 h-6 text-primary mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {['User', 'Username', 'Role', 'Status', 'Date Created', 'Last Login', 'Actions'].map((h) => (
                    <th key={`uth-${h}`} className={`px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-700 shrink-0 ${user.role === 'Admin' ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'}`}>
                          {user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-600 text-foreground">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-700 ${user.role === 'Admin' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-700 ${user.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.dateCreated}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.lastLogin === 'Never' ? <span className="italic">Never logged in</span> : user.lastLogin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} title="Edit account" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => setResetTarget(user)} title="Reset password" className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </button>
                        <button onClick={() => setDeactivateTarget(user)} title={user.status === 'Active' ? 'Deactivate' : 'Reactivate'} className={`p-1.5 rounded-lg transition-colors ${user.status === 'Active' ? 'text-muted-foreground hover:text-danger hover:bg-danger/10' : 'text-muted-foreground hover:text-success hover:bg-success/10'}`}>
                          {user.status === 'Active' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No accounts found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* Add/Edit Modal */}
      {activeTab === 'users' && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-700 text-foreground">{editUser ? 'Edit Staff Account' : 'Add Staff Account'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editUser ? 'Update account details' : 'Create a new staff account'}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Full Name <span className="text-danger">*</span></label>
                <input type="text" value={formData.fullName} onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))} placeholder="e.g. Maria Santos" className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.fullName ? 'border-danger' : 'border-border'}`} />
                {formErrors.fullName && <p className="text-xs text-danger mt-1">{formErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Username <span className="text-danger">*</span></label>
                <input type="text" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} placeholder="e.g. maria.santos" className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.username ? 'border-danger' : 'border-border'}`} />
                {formErrors.username && <p className="text-xs text-danger mt-1">{formErrors.username}</p>}
              </div>
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Email Address <span className="text-danger">*</span></label>
                <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="e.g. maria@mhaylhan.ph" disabled={!!editUser} className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${formErrors.email ? 'border-danger' : 'border-border'}`} />
                {formErrors.email && <p className="text-xs text-danger mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Role <span className="text-danger">*</span></label>
                <select value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as 'Admin' | 'Staff' }))} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {!editUser && (
                <>
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Password <span className="text-danger">*</span></label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" className={`w-full h-10 px-3 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.password ? 'border-danger' : 'border-border'}`} />
                      <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{showPassword ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}</svg>
                      </button>
                    </div>
                    {formErrors.password && <p className="text-xs text-danger mt-1">{formErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Confirm Password <span className="text-danger">*</span></label>
                    <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-enter password" className={`w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.confirmPassword ? 'border-danger' : 'border-border'}`} />
                    {formErrors.confirmPassword && <p className="text-xs text-danger mt-1">{formErrors.confirmPassword}</p>}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-600 text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-600 hover:bg-green-700 active:scale-95 transition-all">{editUser ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deactivateTarget}
        title={deactivateTarget?.status === 'Active' ? 'Deactivate Account' : 'Reactivate Account'}
        message={deactivateTarget?.status === 'Active' ? `Deactivating ${deactivateTarget?.fullName}'s account will prevent them from logging in.` : `Reactivating ${deactivateTarget?.fullName}'s account will restore their access.`}
        confirmLabel={deactivateTarget?.status === 'Active' ? 'Deactivate' : 'Reactivate'}
        variant={deactivateTarget?.status === 'Active' ? 'danger' : 'primary'}
        onConfirm={handleToggleStatus}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmModal
        open={!!resetTarget}
        title="Reset Password"
        message={`Send a password reset link to ${resetTarget?.email}?`}
        confirmLabel="Send Reset Link"
        variant="warning"
        onConfirm={handleResetPassword}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
