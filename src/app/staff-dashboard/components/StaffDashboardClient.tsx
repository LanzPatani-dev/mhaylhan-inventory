'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), { ssr: false });

// BACKEND INTEGRATION POINT: Replace with /api/dashboard/staff-summary

interface RecentTransaction {
  id: string;
  date: string;
  time: string;
  type: 'STOCK-IN' | 'STOCK-OUT';
  productName: string;
  qty: number;
  unit: string;
  recordedBy: string;
}

const recentTransactions: RecentTransaction[] = [
  { id: 'TXN-2026-0891', date: 'Aug 16', time: '09:14 AM', type: 'STOCK-IN', productName: 'Coca-Cola 1.5L', qty: 48, unit: 'Bottle', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0890', date: 'Aug 16', time: '08:52 AM', type: 'STOCK-OUT', productName: 'Lucky Me Pancit Canton', qty: 24, unit: 'Pack', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0889', date: 'Aug 16', time: '08:30 AM', type: 'STOCK-IN', productName: 'Datu Puti Vinegar 1L', qty: 36, unit: 'Bottle', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0888', date: 'Aug 16', time: '07:58 AM', type: 'STOCK-OUT', productName: 'Skyflakes Crackers 400g', qty: 12, unit: 'Pack', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0887', date: 'Aug 15', time: '05:45 PM', type: 'STOCK-IN', productName: 'Sprite 1L', qty: 60, unit: 'Bottle', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0886', date: 'Aug 15', time: '04:22 PM', type: 'STOCK-OUT', productName: 'C2 Green Tea Apple', qty: 30, unit: 'Bottle', recordedBy: 'R. Cruz' },
];

const kpis = [
  {
    id: 'total-products',
    label: 'Total Products',
    value: '148',
    sub: '142 active',
    variant: 'primary' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'total-inventory',
    label: 'Current Inventory',
    value: '12,847',
    sub: 'Total units',
    variant: 'info' as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'low-stock',
    label: 'Low Stock',
    value: '14',
    sub: '5 critical',
    variant: 'warning' as const,
    href: '/inventory-list',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'expiring-soon',
    label: 'Expiring Soon',
    value: '8',
    sub: 'Within 30 days',
    variant: 'warning' as const,
    href: '/inventory-list',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'expired',
    label: 'Expired Products',
    value: '3',
    sub: 'Needs attention',
    variant: 'danger' as const,
    href: '/inventory-list',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

const variantStyles = {
  primary: { card: 'bg-primary/5 border-primary/20', icon: 'text-primary bg-primary/10', value: 'text-primary' },
  info: { card: 'bg-info/5 border-info/20', icon: 'text-info bg-info/10', value: 'text-info' },
  warning: { card: 'bg-warning/5 border-warning/20', icon: 'text-warning bg-warning/10', value: 'text-warning' },
  danger: { card: 'bg-danger/5 border-danger/20', icon: 'text-danger bg-danger/10', value: 'text-danger' },
};

const quickActions = [
  {
    label: 'Stock-In',
    description: 'Record incoming inventory',
    href: '/stock-in',
    color: 'bg-primary text-primary-foreground hover:bg-green-700',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
      </svg>
    ),
  },
  {
    label: 'Stock-Out',
    description: 'Release inventory',
    href: '/stock-out',
    color: 'bg-danger text-white hover:bg-red-600',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
      </svg>
    ),
  },
  {
    label: 'Inventory',
    description: 'View all products',
    href: '/inventory-list',
    color: 'bg-info text-white hover:bg-blue-600',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
];

export default function StaffDashboardClient() {
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanResult = (barcode: string) => {
    setScannerOpen(false);
    // Navigate to stock-in with barcode pre-filled
    window.location.href = `/stock-in?barcode=${encodeURIComponent(barcode)}`;
  };

  return (
    <div className="space-y-6">
      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Staff Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, J. Reyes — Aug 16, 2026</p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Scan Barcode
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const styles = variantStyles[kpi.variant];
          const Wrapper = kpi.href ? Link : 'div';
          const wrapperProps = kpi.href ? { href: kpi.href } : {};
          return (
            <Wrapper
              key={kpi.id}
              {...(wrapperProps as { href: string })}
              className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-150 ${styles.card} ${kpi.href ? 'hover:shadow-md cursor-pointer hover:-translate-y-0.5' : ''}`}
            >
              <div className={`p-2 rounded-lg w-fit ${styles.icon}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide mb-1">{kpi.label}</p>
                <p className={`text-2xl font-700 tabular-nums ${styles.value}`}>{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-base font-700 text-foreground mb-1">Quick Actions</h2>
        <p className="text-xs text-muted-foreground mb-4">Common tasks for inventory management</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl font-600 text-sm transition-all active:scale-95 ${action.color}`}
            >
              <span className="shrink-0">{action.icon}</span>
              <div>
                <p className="font-700">{action.label}</p>
                <p className="text-xs opacity-80 font-400 mt-0.5">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Scan barcode action */}
        <button
          onClick={() => setScannerOpen(true)}
          className="mt-3 w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-primary font-600 text-sm group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
            <path d="M3 9V5a2 2 0 0 1 2-2h4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" />
            <path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2v-4" />
            <rect x="9" y="9" width="6" height="6" />
          </svg>
          Scan Barcode — Auto-lookup product &amp; proceed to Stock-In/Out
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-700 text-foreground">Recent Transactions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest inventory activity</p>
          </div>
          <Link href="/inventory-list" className="text-xs font-600 text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
              {/* Type badge */}
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'STOCK-IN' ? 'bg-success/10' : 'bg-danger/10'}`}>
                {tx.type === 'STOCK-IN' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-foreground truncate">{tx.productName}</p>
                <p className="text-xs text-muted-foreground">{tx.date} · {tx.time} · {tx.recordedBy}</p>
              </div>
              {/* Qty */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-700 tabular-nums ${tx.type === 'STOCK-IN' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'STOCK-IN' ? '+' : '-'}{tx.qty}
                </p>
                <p className="text-xs text-muted-foreground">{tx.unit}</p>
              </div>
              {/* Type label */}
              <span className={`shrink-0 text-2xs font-700 px-2 py-0.5 rounded-full ${tx.type === 'STOCK-IN' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {tx.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
