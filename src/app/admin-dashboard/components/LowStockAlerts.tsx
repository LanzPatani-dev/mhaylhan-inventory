import React from 'react';
import Link from 'next/link';

// BACKEND INTEGRATION POINT: Fetch products at/below minimum stock from /api/inventory/low-stock

const lowStockItems = [
  { id: 'prod-021', name: 'Milo 300g', barcode: '4800061007897', current: 2, min: 10, status: 'Critical' as const },
  { id: 'prod-034', name: 'Bear Brand Milk 300g', barcode: '7891000246893', current: 0, min: 12, status: 'Out of Stock' as const },
  { id: 'prod-056', name: 'Nescafe 3-in-1 Original', barcode: '4800567100001', current: 4, min: 15, status: 'Critical' as const },
  { id: 'prod-078', name: 'Lucky Me Beef Noodles', barcode: '4800016010012', current: 8, min: 20, status: 'Low Stock' as const },
  { id: 'prod-091', name: 'Tanduay Ice 330ml', barcode: '4806511200332', current: 6, min: 24, status: 'Low Stock' as const },
];

const statusColor: Record<string, string> = {
  'Critical': 'text-orange-600 bg-orange-50',
  'Out of Stock': 'text-danger bg-danger/10',
  'Low Stock': 'text-warning bg-warning/10',
};

export default function LowStockAlerts() {
  return (
    <div className="bg-card rounded-xl border border-warning/30 bg-warning/5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-warning/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-warning/10 rounded-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Low Stock Alerts</h3>
            <p className="text-xs text-muted-foreground">{lowStockItems.length} products need restocking</p>
          </div>
        </div>
        <Link href="/inventory-list" className="text-xs text-primary font-semibold hover:underline">View all</Link>
      </div>
      <div className="divide-y divide-border">
        {lowStockItems.map((item) => (
          <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums text-foreground">{item.current}<span className="text-xs text-muted-foreground font-normal">/{item.min}</span></p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[item.status]}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}