import React from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';

// BACKEND INTEGRATION POINT: Fetch recent transactions from /api/transactions?limit=10

const transactions = [
  { id: 'TXN-2026-0891', date: 'Aug 16', time: '09:14 AM', barcode: '4800888115657', product: 'Coca-Cola 1.5L', type: 'STOCK-IN' as const, qty: 48, prevQty: 12, newQty: 60, by: 'M. Santos' },
  { id: 'TXN-2026-0890', date: 'Aug 16', time: '08:52 AM', barcode: '4800016012351', product: 'Lucky Me Pancit Canton', type: 'STOCK-OUT' as const, qty: 24, prevQty: 80, newQty: 56, by: 'J. Reyes' },
  { id: 'TXN-2026-0889', date: 'Aug 16', time: '08:30 AM', barcode: '4800057011126', product: 'NutriAsia Datu Puti Vinegar', type: 'STOCK-IN' as const, qty: 36, prevQty: 8, newQty: 44, by: 'M. Santos' },
  { id: 'TXN-2026-0888', date: 'Aug 16', time: '07:58 AM', barcode: '4800016001010', product: 'Skyflakes Crackers 400g', type: 'STOCK-OUT' as const, qty: 12, prevQty: 45, newQty: 33, by: 'J. Reyes' },
  { id: 'TXN-2026-0887', date: 'Aug 15', time: '05:45 PM', barcode: '4800888100500', product: 'Sprite 1L', type: 'STOCK-IN' as const, qty: 60, prevQty: 5, newQty: 65, by: 'M. Santos' },
  { id: 'TXN-2026-0886', date: 'Aug 15', time: '04:22 PM', barcode: '4806501105010', product: 'C2 Green Tea Apple', type: 'STOCK-OUT' as const, qty: 30, prevQty: 72, newQty: 42, by: 'R. Cruz' },
  { id: 'TXN-2026-0885', date: 'Aug 15', time: '03:10 PM', barcode: '4800016050012', product: 'Eden Cheese 165g', type: 'STOCK-IN' as const, qty: 24, prevQty: 6, newQty: 30, by: 'M. Santos' },
  { id: 'TXN-2026-0884', date: 'Aug 15', time: '01:48 PM', barcode: '4800057034001', product: 'Silver Swan Soy Sauce', type: 'STOCK-OUT' as const, qty: 18, prevQty: 50, newQty: 32, by: 'J. Reyes' },
];

export default function RecentTransactions() {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground">Recent Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest 8 inventory movements</p>
        </div>
        <Link href="/inventory-list" className="text-xs text-primary font-semibold hover:underline">
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Transaction ID', 'Date', 'Product', 'Type', 'Qty', 'Before → After', 'By'].map((h) => (
                <th key={`rth-${h}`} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  <div>{tx.date}</div>
                  <div className="text-[10px]">{tx.time}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground truncate max-w-[160px]">{tx.product}</div>
                  <div className="text-xs text-muted-foreground font-mono">{tx.barcode}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={tx.type} />
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                  {tx.type === 'STOCK-IN' ? (
                    <span className="text-success">+{tx.qty}</span>
                  ) : (
                    <span className="text-danger">-{tx.qty}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                  {tx.prevQty} → <span className="font-semibold text-foreground">{tx.newQty}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{tx.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}