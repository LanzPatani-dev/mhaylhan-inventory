import React from 'react';
import Link from 'next/link';

// BACKEND INTEGRATION POINT: Fetch KPI data from /api/dashboard/summary

interface KPICard {
  id: string;
  label: string;
  value: string | number;
  sub: string;
  trend?: string;
  trendUp?: boolean;
  variant: 'normal' | 'warning' | 'danger' | 'info' | 'primary';
  icon: React.ReactNode;
  span?: number;
  href?: string;
}

const iconSvg = (paths: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const kpiData: KPICard[] = [
  {
    id: 'kpi-total-products',
    label: 'Total Products',
    value: 148,
    sub: '142 active · 6 inactive',
    variant: 'primary',
    span: 2,
    href: '/product-management',
    icon: iconSvg(
      <>
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </>
    ),
  },
  {
    id: 'kpi-total-qty',
    label: 'Total Inventory Qty',
    value: '12,847',
    sub: 'Units across all categories',
    variant: 'info',
    icon: iconSvg(
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    id: 'kpi-low-stock',
    label: 'Low Stock Products',
    value: 14,
    sub: '5 critical · 9 low stock',
    variant: 'warning',
    href: '/inventory-list',
    icon: iconSvg(
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  },
  {
    id: 'kpi-expiring-soon',
    label: 'Expiring Soon',
    value: 8,
    sub: 'Within 30 days',
    variant: 'warning',
    href: '/inventory-list',
    icon: iconSvg(
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  {
    id: 'kpi-expired',
    label: 'Expired Products',
    value: 3,
    sub: 'Requires immediate removal',
    variant: 'danger',
    href: '/inventory-list',
    icon: iconSvg(
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  },
  {
    id: 'kpi-stock-in',
    label: "Today's Stock-In",
    value: 247,
    sub: '6 transactions today',
    trendUp: true,
    trend: '+12% vs yesterday',
    variant: 'normal',
    href: '/stock-in',
    icon: iconSvg(
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </>
    ),
  },
  {
    id: 'kpi-stock-out',
    label: "Today's Stock-Out",
    value: 183,
    sub: '9 transactions today',
    trendUp: false,
    trend: '-5% vs yesterday',
    variant: 'normal',
    href: '/stock-out',
    icon: iconSvg(
      <>
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </>
    ),
  },
];

const variantStyles: Record<KPICard['variant'], { card: string; icon: string; value: string }> = {
  primary: { card: 'bg-primary/5 border-primary/20', icon: 'text-primary bg-primary/10', value: 'text-primary' },
  info: { card: 'bg-info/5 border-info/20', icon: 'text-info bg-info/10', value: 'text-info' },
  warning: { card: 'bg-warning/5 border-warning/20', icon: 'text-warning bg-warning/10', value: 'text-warning' },
  danger: { card: 'bg-danger/5 border-danger/20', icon: 'text-danger bg-danger/10', value: 'text-danger' },
  normal: { card: 'bg-card border-border', icon: 'text-muted-foreground bg-muted', value: 'text-foreground' },
};

export default function DashboardKPIs() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpiData.map((card) => {
        const styles = variantStyles[card.variant];
        const Wrapper = card.href ? Link : 'div';
        const wrapperProps = card.href ? { href: card.href } : {};

        return (
          <Wrapper
            key={card.id}
            {...(wrapperProps as any)}
            className={`
              relative rounded-xl border p-5 flex flex-col gap-3 transition-all duration-150
              ${styles.card}
              ${card.href ? 'hover:shadow-md cursor-pointer hover:-translate-y-0.5' : ''}
              ${card.span === 2 ? 'col-span-2' : 'col-span-1'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${styles.icon}`}>
                {card.icon}
              </div>
              {card.trend && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.trendUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {card.trend}
                </span>
              )}
              {card.variant === 'danger' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full animate-pulse">
                  Action needed
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-1">{card.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${styles.value}`}>{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}