import React from 'react';
import Link from 'next/link';

// BACKEND INTEGRATION POINT: Fetch expiring/expired products from /api/inventory/expiration-alerts

const expiringItems = [
  { id: 'prod-012', name: 'Eden Cheese 165g', barcode: '4800016050012', qty: 24, expiryDate: 'Aug 18, 2026', daysLeft: 2, status: 'Expiring (7d)' as const },
  { id: 'prod-045', name: 'Skyflakes Crackers 400g', barcode: '4800016001010', qty: 15, expiryDate: 'Aug 20, 2026', daysLeft: 4, status: 'Expiring (7d)' as const },
  { id: 'prod-067', name: 'Marca Piña Pork Luncheon', barcode: '4800101000021', qty: 8, expiryDate: 'Aug 10, 2026', daysLeft: -6, status: 'Expired' as const },
  { id: 'prod-089', name: 'CDO Chorizo de Bilbao', barcode: '4800100000019', qty: 12, expiryDate: 'Sep 05, 2026', daysLeft: 20, status: 'Expiring Soon' as const },
];

const statusStyle: Record<string, string> = {
  'Expiring (7d)': 'text-warning bg-warning/10',
  'Expired': 'text-danger bg-danger/10',
  'Expiring Soon': 'text-orange-600 bg-orange-50',
};

export default function ExpiringAlerts() {
  return (
    <div className="bg-card rounded-xl border border-danger/20 bg-danger/5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-danger/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-danger/10 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Expiration Alerts</h3>
            <p className="text-xs text-muted-foreground">3 expiring · 1 expired</p>
          </div>
        </div>
        <Link href="/inventory-list" className="text-xs text-primary font-semibold hover:underline">View all</Link>
      </div>
      <div className="divide-y divide-border">
        {expiringItems.map((item) => (
          <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.expiryDate} · Qty: {item.qty}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${item.daysLeft < 0 ? 'text-danger' : 'text-warning'}`}>
                {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft}d left`}
              </p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusStyle[item.status]}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}