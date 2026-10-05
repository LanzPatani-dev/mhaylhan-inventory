'use client';

import React, { useState, useMemo } from 'react';

// BACKEND INTEGRATION POINT: Replace with /api/transactions?search=&dateFrom=&dateTo=&type=&user=&barcode=&product=

type TxType = 'ALL' | 'STOCK-IN' | 'STOCK-OUT' | 'ADJUSTMENT';

interface Transaction {
  id: string;
  date: string;
  time: string;
  type: 'STOCK-IN' | 'STOCK-OUT' | 'ADJUSTMENT';
  barcode: string;
  productName: string;
  category: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  unit: string;
  performedBy: string;
  remarks: string;
}

const allTransactions: Transaction[] = [
  { id: 'TXN-2026-0891', date: '2026-08-16', time: '09:14 AM', type: 'STOCK-IN', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', category: 'Beverages', quantity: 48, previousQty: 12, newQty: 60, unit: 'Bottle', performedBy: 'M. Santos', remarks: 'Weekly restock' },
  { id: 'TXN-2026-0890', date: '2026-08-16', time: '08:52 AM', type: 'STOCK-OUT', barcode: '4800016012351', productName: 'Lucky Me Pancit Canton', category: 'Grocery', quantity: 24, previousQty: 80, newQty: 56, unit: 'Pack', performedBy: 'J. Reyes', remarks: 'Store replenishment' },
  { id: 'TXN-2026-0889', date: '2026-08-16', time: '08:30 AM', type: 'STOCK-IN', barcode: '4800057011126', productName: 'Datu Puti Vinegar 1L', category: 'Grocery', quantity: 36, previousQty: 8, newQty: 44, unit: 'Bottle', performedBy: 'M. Santos', remarks: 'Supplier delivery' },
  { id: 'TXN-2026-0888', date: '2026-08-16', time: '07:58 AM', type: 'STOCK-OUT', barcode: '4800016001010', productName: 'Skyflakes Crackers 400g', category: 'Grocery', quantity: 12, previousQty: 45, newQty: 33, unit: 'Pack', performedBy: 'J. Reyes', remarks: '' },
  { id: 'TXN-2026-0887', date: '2026-08-15', time: '05:45 PM', type: 'STOCK-IN', barcode: '4800888100500', productName: 'Sprite 1L', category: 'Beverages', quantity: 60, previousQty: 5, newQty: 65, unit: 'Bottle', performedBy: 'M. Santos', remarks: 'Delivery batch #44' },
  { id: 'TXN-2026-0886', date: '2026-08-15', time: '04:22 PM', type: 'STOCK-OUT', barcode: '4806501105010', productName: 'C2 Green Tea Apple', category: 'Beverages', quantity: 30, previousQty: 72, newQty: 42, unit: 'Bottle', performedBy: 'R. Cruz', remarks: '' },
  { id: 'TXN-2026-0885', date: '2026-08-15', time: '02:10 PM', type: 'STOCK-IN', barcode: '4800016050012', productName: 'Eden Cheese 165g', category: 'Grocery', quantity: 20, previousQty: 10, newQty: 30, unit: 'Pack', performedBy: 'M. Santos', remarks: 'Reorder' },
  { id: 'TXN-2026-0884', date: '2026-08-15', time: '11:05 AM', type: 'STOCK-OUT', barcode: '4800057034001', productName: 'Silver Swan Soy Sauce 1L', category: 'Grocery', quantity: 8, previousQty: 40, newQty: 32, unit: 'Bottle', performedBy: 'J. Reyes', remarks: '' },
  { id: 'TXN-2026-0883', date: '2026-08-14', time: '03:30 PM', type: 'STOCK-IN', barcode: '4800061007897', productName: 'Milo 300g', category: 'Beverages', quantity: 5, previousQty: 0, newQty: 5, unit: 'Pack', performedBy: 'M. Santos', remarks: 'Emergency restock' },
  { id: 'TXN-2026-0882', date: '2026-08-14', time: '10:15 AM', type: 'STOCK-OUT', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', category: 'Beverages', quantity: 24, previousQty: 36, newQty: 12, unit: 'Bottle', performedBy: 'R. Cruz', remarks: 'Store transfer' },
  { id: 'TXN-2026-0881', date: '2026-08-13', time: '09:00 AM', type: 'STOCK-IN', barcode: '4806501200015', productName: 'Wilkins Purified Water 1.5L', category: 'Beverages', quantity: 72, previousQty: 0, newQty: 72, unit: 'Bottle', performedBy: 'M. Santos', remarks: 'New stock' },
  { id: 'TXN-2026-0880', date: '2026-08-13', time: '08:45 AM', type: 'STOCK-OUT', barcode: '4806501200015', productName: 'Wilkins Purified Water 1.5L', category: 'Beverages', quantity: 24, previousQty: 72, newQty: 48, unit: 'Bottle', performedBy: 'J. Reyes', remarks: '' },
  { id: 'TXN-2026-0879', date: '2026-08-12', time: '04:00 PM', type: 'ADJUSTMENT', barcode: '4800101000021', productName: 'Marca Piña Pork Luncheon', category: 'Canned Goods', quantity: -3, previousQty: 11, newQty: 8, unit: 'Can', performedBy: 'M. Santos', remarks: 'Damaged goods write-off' },
  { id: 'TXN-2026-0878', date: '2026-08-12', time: '01:30 PM', type: 'STOCK-IN', barcode: '4800057080001', productName: 'UFC Banana Ketchup 320g', category: 'Grocery', quantity: 24, previousQty: 0, newQty: 24, unit: 'Bottle', performedBy: 'M. Santos', remarks: 'Supplier delivery' },
  { id: 'TXN-2026-0877', date: '2026-08-11', time: '10:00 AM', type: 'STOCK-OUT', barcode: '4806511200332', productName: 'Tanduay Ice 330ml', category: 'Beverages', quantity: 18, previousQty: 24, newQty: 6, unit: 'Can', performedBy: 'J. Reyes', remarks: '' },
  { id: 'TXN-2026-0876', date: '2026-08-11', time: '09:15 AM', type: 'ADJUSTMENT', barcode: '4800567100001', productName: 'Nescafe 3-in-1 Original', category: 'Grocery', quantity: -2, previousQty: 6, newQty: 4, unit: 'Sachet', performedBy: 'M. Santos', remarks: 'Inventory count correction' },
  { id: 'TXN-2026-0875', date: '2026-08-10', time: '03:00 PM', type: 'STOCK-IN', barcode: '4800016070001', productName: 'Del Monte Pineapple Juice', category: 'Canned Goods', quantity: 24, previousQty: 0, newQty: 24, unit: 'Can', performedBy: 'M. Santos', remarks: 'New stock' },
  { id: 'TXN-2026-0874', date: '2026-08-10', time: '11:00 AM', type: 'STOCK-OUT', barcode: '4800016070001', productName: 'Del Monte Pineapple Juice', category: 'Canned Goods', quantity: 2, previousQty: 24, newQty: 22, unit: 'Can', performedBy: 'R. Cruz', remarks: '' },
  { id: 'TXN-2026-0873', date: '2026-08-09', time: '02:45 PM', type: 'STOCK-IN', barcode: '4800057020001', productName: 'Mama Sita Sinigang Mix', category: 'Grocery', quantity: 30, previousQty: 0, newQty: 30, unit: 'Pack', performedBy: 'M. Santos', remarks: 'Reorder' },
  { id: 'TXN-2026-0872', date: '2026-08-09', time: '10:30 AM', type: 'STOCK-OUT', barcode: '4800057020001', productName: 'Mama Sita Sinigang Mix', category: 'Grocery', quantity: 21, previousQty: 30, newQty: 9, unit: 'Pack', performedBy: 'J. Reyes', remarks: 'Store replenishment' },
  { id: 'TXN-2026-0871', date: '2026-08-08', time: '09:00 AM', type: 'STOCK-IN', barcode: '4800016012351', productName: 'Lucky Me Pancit Canton', category: 'Grocery', quantity: 100, previousQty: 0, newQty: 100, unit: 'Pack', performedBy: 'M. Santos', remarks: 'Initial restock' },
];

export default function TransactionLogClient() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<TxType>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const users = useMemo(() => {
    const list = Array.from(new Set(allTransactions.map((tx) => tx.performedBy)));
    return ['ALL', ...list];
  }, []);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchesSearch =
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        tx.productName.toLowerCase().includes(search.toLowerCase()) ||
        tx.barcode.includes(search) ||
        tx.remarks.toLowerCase().includes(search.toLowerCase());

      const matchesType = selectedType === 'ALL' || tx.type === selectedType;
      const matchesUser = selectedUser === 'ALL' || tx.performedBy === selectedUser;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && tx.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && tx.date <= endDate;
      }

      return matchesSearch && matchesType && matchesUser && matchesDate;
    });
  }, [search, selectedType, selectedUser, startDate, endDate]);

  const clearFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setSelectedUser('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    const rows = filteredTransactions
      .map((tx) => `
        <tr>
          <td>${tx.id}</td>
          <td>${tx.date}</td>
          <td>${tx.time}</td>
          <td>${tx.type}</td>
          <td>${tx.barcode}</td>
          <td>${tx.productName}</td>
          <td>${tx.category}</td>
          <td>${tx.quantity}</td>
          <td>${tx.previousQty}</td>
          <td>${tx.newQty}</td>
          <td>${tx.unit}</td>
          <td>${tx.performedBy}</td>
          <td>${tx.remarks || '—'}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Transaction Log Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #1f2937;
              background: #ffffff;
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
            <h1>Transaction Log Report</h1>
            <div class="meta">Generated: ${new Date().toLocaleString()}</div>
            <div class="meta">Records: ${filteredTransactions.length}</div>
          </div>

          <div class="summary">
            <strong>Filters:</strong> Type: ${selectedType} | User: ${selectedUser} | Date: ${startDate || '—'} to ${endDate || '—'} | Search: ${search || '—'}
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Prev Qty</th>
                <th>New Qty</th>
                <th>Unit</th>
                <th>Recorded By</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="13">No records available.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transaction-log-report.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Audit trail for all stock-in, stock-out, and adjustment actions</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
            Print Report
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-green-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Search</label>
            <input
              type="text"
              placeholder="Search ID, product, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Transaction Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TxType)}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            >
              <option value="ALL">All Types</option>
              <option value="STOCK-IN">Stock-In</option>
              <option value="STOCK-OUT">Stock-Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Recorded By</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
            >
              {users.map((u) => (
                <option key={u} value={u}>
                  {u === 'ALL' ? 'All Personnel' : u}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full py-2 px-3 text-sm font-semibold border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      </div>

      {/* Table Display */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            Showing {filteredTransactions.length} of {allTransactions.length} records
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {['ID', 'Date & Time', 'Type', 'Barcode', 'Product', 'Qty Changed', 'Before → After', 'Remarks', 'Recorded By'].map((h) => (
                  <th key={`txh-${h}`} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    No transactions matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div>{tx.date}</div>
                      <div className="text-[10px]">{tx.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tx.type === 'STOCK-IN'
                            ? 'bg-success/10 text-success'
                            : tx.type === 'STOCK-OUT'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.barcode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-[160px]">{tx.productName}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.category}</p>
                    </td>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      <span className={tx.quantity > 0 ? 'text-success' : 'text-danger'}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1">{tx.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {tx.previousQty} → <span className="font-semibold text-foreground">{tx.newQty}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{tx.remarks || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.performedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}