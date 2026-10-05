'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';

interface SystemConfig {
  storeName: string;
  storeAddress: string;
  storeContact: string;
  lowStockThreshold: number;
  expiryWarningDays7: number;
  expiryWarningDays30: number;
  timezone: string;
  currency: string;
  itemsPerPage: number;
}

const defaultConfig: SystemConfig = {
  storeName: 'Mhay-Lhan Sari-Sari Store',
  storeAddress: 'Brgy. San Jose, Batangas City, Philippines',
  storeContact: '+63 912 345 6789',
  lowStockThreshold: 10,
  expiryWarningDays7: 7,
  expiryWarningDays30: 30,
  timezone: 'Asia/Manila',
  currency: 'PHP',
  itemsPerPage: 25,
};

const TIMEZONES = [
  'Asia/Manila',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Bangkok',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

export default function SystemConfigClient() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'store' | 'alerts' | 'display'>('store');
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value');

      if (error) {
        if (error.code?.startsWith('42')) throw error;
        setConfig(defaultConfig);
        return;
      }

      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((row: { config_key: string; config_value: string }) => {
          map[row.config_key] = row.config_value;
        });

        setConfig({
          storeName: map['store_name'] || defaultConfig.storeName,
          storeAddress: map['store_address'] || defaultConfig.storeAddress,
          storeContact: map['store_contact'] || defaultConfig.storeContact,
          lowStockThreshold: parseInt(map['low_stock_threshold'] || '10'),
          expiryWarningDays7: parseInt(map['expiry_warning_days_7'] || '7'),
          expiryWarningDays30: parseInt(map['expiry_warning_days_30'] || '30'),
          timezone: map['timezone'] || defaultConfig.timezone,
          currency: map['currency'] || defaultConfig.currency,
          itemsPerPage: parseInt(map['items_per_page'] || '25'),
        });
      }
    } catch (err: any) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { config_key: 'store_name', config_value: config.storeName, description: 'Store display name' },
        { config_key: 'store_address', config_value: config.storeAddress, description: 'Store address' },
        { config_key: 'store_contact', config_value: config.storeContact, description: 'Store contact number' },
        { config_key: 'low_stock_threshold', config_value: String(config.lowStockThreshold), description: 'Minimum quantity before low stock alert triggers' },
        { config_key: 'expiry_warning_days_7', config_value: String(config.expiryWarningDays7), description: 'Days before expiry for 7-day warning' },
        { config_key: 'expiry_warning_days_30', config_value: String(config.expiryWarningDays30), description: 'Days before expiry for 30-day warning' },
        { config_key: 'timezone', config_value: config.timezone, description: 'Store timezone for date/time display' },
        { config_key: 'currency', config_value: config.currency, description: 'Currency code for the store' },
        { config_key: 'items_per_page', config_value: String(config.itemsPerPage), description: 'Default number of items per page in lists' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .upsert({ ...update, updated_by: user?.id, updated_at: new Date().toISOString() }, { onConflict: 'config_key' });

        if (error) {
          if (error.code?.startsWith('42')) throw error;
          toast.error(`Failed to save ${update.config_key}`);
          return;
        }
      }

      toast.success('System configuration saved successfully.');
    } catch (err: any) {
      toast.error('Failed to save configuration: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'store' as const, label: 'Store Details', icon: '🏪' },
    { id: 'alerts' as const, label: 'Alert Thresholds', icon: '⚠️' },
    { id: 'display' as const, label: 'Display Settings', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <AppLayout role="admin">
        <div className="space-y-5">
          <div className="h-8 bg-muted animate-pulse rounded-lg w-64" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-700 text-foreground">System Configuration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage store settings, alert thresholds, and business rules</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all duration-150 disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Section tabs */}
          <div className="lg:w-56 shrink-0">
            <div className="bg-card rounded-xl border border-border p-2 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-all text-left ${
                    activeSection === s.id
                      ? 'bg-primary/10 text-primary' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Store Details */}
            {activeSection === 'store' && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-700 text-foreground mb-1">Store Details</h2>
                  <p className="text-sm text-muted-foreground">Basic information about your store displayed on reports and receipts.</p>
                </div>
                <div className="border-t border-border" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Store Name</label>
                    <input
                      type="text"
                      value={config.storeName}
                      onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                      placeholder="Enter store name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Store Address</label>
                    <textarea
                      value={config.storeAddress}
                      onChange={(e) => setConfig({ ...config, storeAddress: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary resize-none"
                      placeholder="Enter store address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Contact Number</label>
                    <input
                      type="text"
                      value={config.storeContact}
                      onChange={(e) => setConfig({ ...config, storeContact: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                      placeholder="+63 912 345 6789"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Report Header Preview</p>
                  <div className="text-center">
                    <p className="font-700 text-foreground">{config.storeName || 'Store Name'}</p>
                    <p className="text-xs text-muted-foreground">{config.storeAddress || 'Store Address'}</p>
                    <p className="text-xs text-muted-foreground">{config.storeContact || 'Contact Number'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Thresholds */}
            {activeSection === 'alerts' && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-700 text-foreground mb-1">Alert Thresholds</h2>
                  <p className="text-sm text-muted-foreground">Configure when low-stock and expiration warnings are triggered.</p>
                </div>
                <div className="border-t border-border" />

                <div className="space-y-6">
                  {/* Low stock */}
                  <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-600 text-foreground">Low Stock Alert Threshold</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Products with quantity at or below this value will trigger a low-stock alert.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={config.lowStockThreshold}
                          onChange={(e) => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) })}
                          className="w-full accent-warning"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1</span><span>50</span><span>100</span>
                        </div>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={config.lowStockThreshold}
                          onChange={(e) => setConfig({ ...config, lowStockThreshold: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 text-center font-600"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-warning mt-2">
                      ⚠️ Products with ≤ {config.lowStockThreshold} units will show as "Low Stock"
                    </p>
                  </div>

                  {/* Expiry warnings */}
                  <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-danger/10 rounded-lg">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-600 text-foreground">Expiration Warning Days</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Products expiring within these days will show expiration warnings.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-600 text-foreground mb-1.5">
                          Short-term Warning (days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={config.expiryWarningDays7}
                          onChange={(e) => setConfig({ ...config, expiryWarningDays7: Math.max(1, parseInt(e.target.value) || 7) })}
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Shows "Expiring ({config.expiryWarningDays7}d)" badge</p>
                      </div>
                      <div>
                        <label className="block text-xs font-600 text-foreground mb-1.5">
                          Long-term Warning (days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={config.expiryWarningDays30}
                          onChange={(e) => setConfig({ ...config, expiryWarningDays30: Math.max(1, parseInt(e.target.value) || 30) })}
                          className="w-full px-3 py-2 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Shows "Expiring Soon" badge</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Display Settings */}
            {activeSection === 'display' && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-700 text-foreground mb-1">Display Settings</h2>
                  <p className="text-sm text-muted-foreground">Configure timezone, currency, and pagination preferences.</p>
                </div>
                <div className="border-t border-border" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Timezone</label>
                    <select
                      value={config.timezone}
                      onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">All dates and times will be displayed in this timezone.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Currency</label>
                    <select
                      value={config.currency}
                      onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="PHP">PHP — Philippine Peso</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="SGD">SGD — Singapore Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-600 text-foreground mb-1.5">Items Per Page (default)</label>
                    <select
                      value={config.itemsPerPage}
                      onChange={(e) => setConfig({ ...config, itemsPerPage: parseInt(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n} items per page</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Default pagination size for inventory and transaction lists.</p>
                  </div>
                </div>

                {/* Current settings summary */}
                <div className="bg-muted/40 rounded-lg p-4 border border-border">
                  <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">Current Settings Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timezone:</span>
                      <span className="font-600 text-foreground">{config.timezone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-600 text-foreground">{config.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items/Page:</span>
                      <span className="font-600 text-foreground">{config.itemsPerPage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Low Stock:</span>
                      <span className="font-600 text-foreground">≤ {config.lowStockThreshold} units</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
