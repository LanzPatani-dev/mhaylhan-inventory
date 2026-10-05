'use client';

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';

// BACKEND INTEGRATION POINT: Fetch paginated inventory from /api/inventory?page=&limit=&filters=

interface InventoryItem {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  expirationDate: string;
  stockStatus: 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock';
  expiryStatus: 'Valid' | 'Expiring Soon' | 'Expiring (7d)' | 'Expired';
  lastUpdated: string;
}

const inventoryData: InventoryItem[] = [
  { id: 'inv-001', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', category: 'Beverages', unit: 'Bottle', quantity: 60, minimumStock: 24, expirationDate: '12/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  { id: 'inv-002', barcode: '4800016012351', productName: 'Lucky Me Pancit Canton', category: 'Grocery', unit: 'Pack', quantity: 56, minimumStock: 30, expirationDate: '06/30/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  { id: 'inv-003', barcode: '4800057011126', productName: 'Datu Puti Vinegar 1L', category: 'Grocery', unit: 'Bottle', quantity: 44, minimumStock: 12, expirationDate: '09/15/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  { id: 'inv-004', barcode: '4800016001010', productName: 'Skyflakes Crackers 400g', category: 'Grocery', unit: 'Pack', quantity: 33, minimumStock: 20, expirationDate: '08/20/2026', stockStatus: 'Normal', expiryStatus: 'Expiring (7d)', lastUpdated: 'Aug 15, 2026' },
  { id: 'inv-005', barcode: '4800888100500', productName: 'Sprite 1L', category: 'Beverages', unit: 'Bottle', quantity: 65, minimumStock: 24, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  { id: 'inv-006', barcode: '4806501105010', productName: 'C2 Green Tea Apple', category: 'Beverages', unit: 'Bottle', quantity: 42, minimumStock: 30, expirationDate: '10/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  { id: 'inv-007', barcode: '4800016050012', productName: 'Eden Cheese 165g', category: 'Grocery', unit: 'Pack', quantity: 30, minimumStock: 15, expirationDate: '08/18/2026', stockStatus: 'Normal', expiryStatus: 'Expiring (7d)', lastUpdated: 'Aug 16, 2026' },
  { id: 'inv-008', barcode: '4800057034001', productName: 'Silver Swan Soy Sauce 1L', category: 'Grocery', unit: 'Bottle', quantity: 32, minimumStock: 12, expirationDate: '12/31/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  { id: 'inv-009', barcode: '4800061007897', productName: 'Milo 300g', category: 'Beverages', unit: 'Pack', quantity: 2, minimumStock: 10, expirationDate: '03/31/2027', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  { id: 'inv-010', barcode: '7891000246893', productName: 'Bear Brand Milk 300g', category: 'Grocery', unit: 'Can', quantity: 0, minimumStock: 12, expirationDate: '05/31/2027', stockStatus: 'Out of Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 13, 2026' },
  { id: 'inv-011', barcode: '4800567100001', productName: 'Nescafe 3-in-1 Original', category: 'Grocery', unit: 'Sachet', quantity: 4, minimumStock: 15, expirationDate: '08/31/2027', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  { id: 'inv-012', barcode: '4800101000021', productName: 'Marca Piña Pork Luncheon', category: 'Canned Goods', unit: 'Can', quantity: 8, minimumStock: 12, expirationDate: '08/10/2026', stockStatus: 'Low Stock', expiryStatus: 'Expired', lastUpdated: 'Aug 10, 2026' },
  { id: 'inv-013', barcode: '4800100000019', productName: 'CDO Chorizo de Bilbao', category: 'Canned Goods', unit: 'Can', quantity: 12, minimumStock: 8, expirationDate: '09/05/2026', stockStatus: 'Normal', expiryStatus: 'Expiring Soon', lastUpdated: 'Aug 12, 2026' },
  { id: 'inv-014', barcode: '4806511200332', productName: 'Tanduay Ice 330ml', category: 'Beverages', unit: 'Can', quantity: 6, minimumStock: 24, expirationDate: '12/31/2026', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 11, 2026' },
  { id: 'inv-015', barcode: '4800016000013', productName: 'Plastik Straw 100pcs', category: 'Plastic Products', unit: 'Pack', quantity: 25, minimumStock: 10, expirationDate: 'N/A', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 08, 2026' },
  { id: 'inv-016', barcode: '4800057080001', productName: 'UFC Banana Ketchup 320g', category: 'Grocery', unit: 'Bottle', quantity: 18, minimumStock: 12, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 09, 2026' },
  { id: 'inv-017', barcode: '4806501200015', productName: 'Wilkins Purified Water 1.5L', category: 'Beverages', unit: 'Bottle', quantity: 48, minimumStock: 36, expirationDate: '12/31/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 16, 2026' },
  { id: 'inv-018', barcode: '4800088100234', productName: 'Styro Cup 8oz 50pcs', category: 'Styro Materials', unit: 'Pack', quantity: 15, minimumStock: 10, expirationDate: 'N/A', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 07, 2026' },
  { id: 'inv-019', barcode: '4800016070001', productName: 'Del Monte Pineapple Juice', category: 'Canned Goods', unit: 'Can', quantity: 22, minimumStock: 12, expirationDate: '07/31/2027', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 10, 2026' },
  { id: 'inv-020', barcode: '4800057020001', productName: 'Mama Sita Sinigang Mix', category: 'Grocery', unit: 'Pack', quantity: 9, minimumStock: 15, expirationDate: '04/30/2027', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 12, 2026' },
  { id: 'inv-021', barcode: '4800016030002', productName: 'Royal Tru-Orange 1L', category: 'Beverages', unit: 'Bottle', quantity: 38, minimumStock: 24, expirationDate: '11/30/2026', stockStatus: 'Normal', expiryStatus: 'Valid', lastUpdated: 'Aug 14, 2026' },
  { id: 'inv-022', barcode: '4800016040003', productName: 'Chippy BBQ 110g', category: 'Grocery', unit: 'Pack', quantity: 3, minimumStock: 20, expirationDate: '09/30/2026', stockStatus: 'Critical', expiryStatus: 'Valid', lastUpdated: 'Aug 15, 2026' },
  { id: 'inv-023', barcode: '4800016050004', productName: 'Piattos Cheese 85g', category: 'Grocery', unit: 'Pack', quantity: 7, minimumStock: 20, expirationDate: '10/15/2026', stockStatus: 'Low Stock', expiryStatus: 'Valid', lastUpdated: 'Aug 13, 2026' },
];

export default function InventoryReportsClient() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return inventoryData;
    const q = search.toLowerCase();
    return inventoryData.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate and view inventory summary reports
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <input
          type="text"
          placeholder="Search report items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Barcode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.barcode}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.productName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-foreground">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.stockStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}