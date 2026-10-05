'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import dynamic from 'next/dynamic';
import { findProductByBarcode, updateInventoryQuantity, computeStockStatus } from '@/lib/mockInventory';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), { ssr: false });

// BACKEND INTEGRATION POINT: Replace mock data with /api/products/search?barcode= and /api/transactions/stock-in

interface Product {
  id: string;
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  expirationDate: string;
  stockStatus: 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock';
  source?: 'database';
}

interface StockInFormValues {
  barcode: string;
  quantity: number;
  expirationDate: string;
  remarks: string;
}

interface RecentStockIn {
  id: string;
  date: string;
  time: string;
  barcode: string;
  productName: string;
  qtyAdded: number;
  prevQty: number;
  newQty: number;
  unit: string;
  expiryDate: string;
  remarks: string;
  recordedBy: string;
}

const initialRecentStockIn: RecentStockIn[] = [
  { id: 'TXN-2026-0891', date: 'Aug 16, 2026', time: '09:14 AM', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', qtyAdded: 48, prevQty: 12, newQty: 60, unit: 'Bottle', expiryDate: '12/31/2026', remarks: 'Regular restock', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0889', date: 'Aug 16, 2026', time: '08:30 AM', barcode: '4800057011126', productName: 'Datu Puti Vinegar 1L', qtyAdded: 36, prevQty: 8, newQty: 44, unit: 'Bottle', expiryDate: '09/15/2027', remarks: '', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0887', date: 'Aug 15, 2026', time: '05:45 PM', barcode: '4800888100500', productName: 'Sprite 1L', qtyAdded: 60, prevQty: 5, newQty: 65, unit: 'Bottle', expiryDate: '11/30/2026', remarks: 'Bulk delivery from supplier', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0885', date: 'Aug 15, 2026', time: '03:10 PM', barcode: '4800016050012', productName: 'Eden Cheese 165g', qtyAdded: 24, prevQty: 6, newQty: 30, unit: 'Pack', expiryDate: '08/18/2026', remarks: 'Near expiry batch', recordedBy: 'M. Santos' },
  { id: 'TXN-2026-0882', date: 'Aug 15, 2026', time: '10:22 AM', barcode: '4800061007897', productName: 'Milo 300g', qtyAdded: 20, prevQty: 0, newQty: 20, unit: 'Pack', expiryDate: '03/31/2027', remarks: 'Replenishment order', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0879', date: 'Aug 14, 2026', time: '04:00 PM', barcode: '7891000246893', productName: 'Bear Brand Milk 300g', qtyAdded: 36, prevQty: 0, newQty: 36, unit: 'Can', expiryDate: '05/31/2027', remarks: '', recordedBy: 'M. Santos' },
];

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeExpiryValue = (value: string) => {
  if (!value) return '';

  const trimmed = value.trim();
  const [month, day, year] = trimmed.split('/');
  if (month && day && year) {
    return formatDateForInput(new Date(`${year}-${month}-${day}`));
  }

  return trimmed;
};

const getBatchExpiryOptions = (product?: Product | null) => {
  const values = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  if (product?.expirationDate) {
    const normalized = normalizeExpiryValue(product.expirationDate);
    values.add(normalized);
    options.push({
      value: normalized,
      label: `${new Date(normalized).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (current product expiry)`,
    });
  }

  const baseDate = new Date();
  [3, 6, 9, 12, 18, 24].forEach((months) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, 1);
    const formatted = formatDateForInput(date);
    if (!values.has(formatted)) {
      values.add(formatted);
      options.push({
        value: formatted,
        label: `${new Date(formatted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${months} months)`,
      });
    }
  });

  return options;
};

export default function StockInClient() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<StockInFormValues | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentStockIn[]>(initialRecentStockIn);
  const [scannerOpen, setScannerOpen] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockInFormValues>({
    defaultValues: { barcode: '', quantity: 1, expirationDate: '', remarks: '' },
  });

  const watchedQty = watch('quantity');
  const batchExpiryOptions = getBatchExpiryOptions(foundProduct);

  const handleBarcodeSearch = async (barcode?: string) => {
    const code = (barcode || barcodeInput).trim();
    if (!code) return;
    setSearching(true);
    setFoundProduct(null);
    setNotFound(false);
    const { data: row, error } = await supabase
      .from('products')
      .select('id, barcode, product_name, unit, quantity, minimum_stock, expiration_date, stock_status, categories(name)')
      .eq('barcode', code)
      .maybeSingle();

    if (error) {
      toast.error('Unable to search inventory. Please try again.');
      setSearching(false);
      return;
    }

    const product: Product | null = row
      ? {
          id: row.id,
          barcode: row.barcode,
          productName: row.product_name,
          category: Array.isArray((row as any).categories)
            ? (row as any).categories[0]?.name || ''
            : (row as any).categories?.name || '',
          unit: row.unit,
          quantity: row.quantity,
          minimumStock: row.minimum_stock,
          expirationDate: row.expiration_date || 'N/A',
          stockStatus: row.stock_status,
          source: 'database',
        }
      : findProductByBarcode(code);
    if (product) {
      setFoundProduct(product);
      const normalizedExpiry = normalizeExpiryValue(product.expirationDate || '');
      reset({ barcode: code, quantity: 1, expirationDate: normalizedExpiry, remarks: '' });
    } else {
      setNotFound(true);
    }
    setSearching(false);
  };

  const handleScanResult = (barcode: string) => {
    setScannerOpen(false);
    setBarcodeInput(barcode);
    handleBarcodeSearch(barcode);
  };

  const onSubmit = (data: StockInFormValues) => {
    if (!foundProduct) return;
    if (data.quantity <= 0) return;
    setPendingData(data);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!foundProduct || !pendingData) return;
    setConfirmOpen(false);
    // BACKEND INTEGRATION POINT: POST /api/transactions/stock-in
    await new Promise((r) => setTimeout(r, 800));

    const newQty = foundProduct.quantity + pendingData.quantity;
    const newTx: RecentStockIn = {
      id: `TXN-2026-${String(Math.floor(Math.random() * 9000 + 1000))}`,
      date: 'Aug 16, 2026',
      time: '09:29 AM',
      barcode: foundProduct.barcode,
      productName: foundProduct.productName,
      qtyAdded: pendingData.quantity,
      prevQty: foundProduct.quantity,
      newQty,
      unit: foundProduct.unit,
      expiryDate: pendingData.expirationDate || foundProduct.expirationDate,
      remarks: pendingData.remarks,
      recordedBy: 'M. Santos',
    };

    if (foundProduct.source === 'database') {
      const stockStatus = computeStockStatus(newQty, foundProduct.minimumStock);
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQty, stock_status: stockStatus, updated_at: new Date().toISOString() })
        .eq('id', foundProduct.id)
        .select('id')
        .single();

      if (updateError) {
        toast.error(`Could not save the stock update: ${updateError.message}`);
        return;
      }

      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        transaction_ref: `STOCK-IN-${crypto.randomUUID()}`,
        transaction_type: 'STOCK-IN',
        product_id: foundProduct.id,
        barcode: foundProduct.barcode,
        product_name: foundProduct.productName,
        category: foundProduct.category,
        unit: foundProduct.unit,
        quantity: pendingData.quantity,
        previous_qty: foundProduct.quantity,
        new_qty: newQty,
        expiry_date: pendingData.expirationDate || foundProduct.expirationDate,
        remarks: pendingData.remarks,
        performed_by: user?.id ?? null,
        performed_by_name: user?.user_metadata?.full_name || user?.email || 'Staff',
      });

      if (transactionError) toast.warning('Stock was saved, but its transaction log could not be recorded.');
    }

    setRecentTransactions((prev) => [newTx, ...prev.slice(0, 9)]);
    const localProduct = updateInventoryQuantity(foundProduct.barcode, newQty);
    setFoundProduct({
      ...(foundProduct.source === 'database' ? foundProduct : localProduct ?? foundProduct),
      quantity: newQty,
      stockStatus: computeStockStatus(newQty, foundProduct.minimumStock),
    });
    toast.success(`Stock-In recorded. ${foundProduct.productName}: ${foundProduct.quantity} → ${newQty} ${foundProduct.unit}`);
    reset({ barcode: foundProduct.barcode, quantity: 1, expirationDate: '', remarks: '' });
    setPendingData(null);
  };

  const clearSearch = () => {
    setBarcodeInput('');
    setFoundProduct(null);
    setNotFound(false);
    reset({ barcode: '', quantity: 1, expirationDate: '', remarks: '' });
  };

  return (
    <div className="space-y-6">
      {/* Camera Scanner Modal */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock-In</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record incoming inventory — scan barcode or search by product</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Scan Barcode
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-info/10 text-info px-3 py-1.5 rounded-full font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Recorded by: M. Santos (Admin)
          </div>
        </div>
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Search panel */}
        <div className="space-y-4">
          {/* Barcode search */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground mb-1">Find Product</h3>
            <p className="text-xs text-muted-foreground mb-4">Scan barcode with camera or enter barcode number manually</p>

            {/* Camera scan button (prominent) */}
            <button
              onClick={() => setScannerOpen(true)}
              className="w-full mb-3 flex items-center justify-center gap-2.5 py-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-primary font-semibold text-sm group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Open Camera to Scan Barcode
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or enter manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9V5a2 2 0 0 1 2-2h4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" />
                  <path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2v-4" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter barcode number..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary bg-background"
                />
              </div>
              <button
                onClick={() => handleBarcodeSearch()}
                disabled={searching || !barcodeInput.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {searching ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
                Search
              </button>
              {(foundProduct || notFound) && (
                <button onClick={clearSearch} className="px-3 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Quick barcode shortcuts */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <p className="text-xs text-muted-foreground w-full">Quick test barcodes:</p>
              {['4800888115657', '4800016012351', '4800061007897', '7891000246893'].map((bc) => (
                <button
                  key={`bc-${bc}`}
                  onClick={() => { setBarcodeInput(bc); handleBarcodeSearch(bc); }}
                  className="text-xs font-mono text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                >
                  {bc}
                </button>
              ))}
            </div>
          </div>

          {/* Not found state */}
          {notFound && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-5 slide-up">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-danger/10 rounded-lg shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-danger text-sm">Product not registered.</p>
                  <p className="text-xs text-muted-foreground mt-1">Barcode <span className="font-mono font-semibold">{barcodeInput}</span> was not found in the product catalog.</p>
                  <button
                    onClick={() => { window.location.href = '/product-management'; }}
                    className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Register this product →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product info card */}
          {foundProduct && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Product Found</p>
                  <h3 className="text-lg font-bold text-foreground">{foundProduct.productName}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{foundProduct.barcode}</p>
                </div>
                <StatusBadge status={foundProduct.stockStatus} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', value: foundProduct.category },
                  { label: 'Unit', value: foundProduct.unit },
                  { label: 'Current Qty', value: String(foundProduct.quantity), highlight: foundProduct.quantity <= foundProduct.minimumStock },
                  { label: 'Min Stock Level', value: String(foundProduct.minimumStock) },
                  { label: 'Expiration Date', value: foundProduct.expirationDate },
                ].map((item) => (
                  <div key={`info-${item.label}`} className="bg-card rounded-lg p-3">
                    <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                    <p className={`text-sm font-bold mt-0.5 tabular-nums ${item.highlight ? 'text-warning' : 'text-foreground'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              {foundProduct.quantity <= foundProduct.minimumStock && (
                <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  This product is below minimum stock level — restocking is recommended.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Stock-In form */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-1">Stock-In Details</h3>
          <p className="text-xs text-muted-foreground mb-5">
            {foundProduct ? `Recording stock-in for ${foundProduct.productName}` : 'Search for a product first to record stock-in.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product field (readonly display) */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Product</label>
              <div className={`w-full px-3 py-2.5 rounded-lg border text-sm ${foundProduct ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} border-input`}>
                {foundProduct ? foundProduct.productName : 'No product selected'}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Quantity to Add <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Number of units being added to inventory</p>
              <input
                type="number"
                min={1}
                disabled={!foundProduct}
                placeholder="Enter quantity"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed bg-background ${errors.quantity ? 'border-danger' : 'border-input focus:border-primary'}`}
                {...register('quantity', {
                  required: 'Quantity is required.',
                  min: { value: 1, message: 'Quantity must be at least 1.' },
                  valueAsNumber: true,
                })}
              />
              {errors.quantity && <p className="text-xs text-danger mt-1">{errors.quantity.message}</p>}
              {foundProduct && watchedQty > 0 && (
                <p className="text-xs text-success mt-1 font-medium">
                  New quantity after stock-in: <span className="font-bold">{foundProduct.quantity + (Number(watchedQty) || 0)} {foundProduct.unit}</span>
                </p>
              )}
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Expiration Date of This Batch
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Choose the expiry date for this incoming batch</p>
              <select
                disabled={!foundProduct}
                className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed bg-background"
                {...register('expirationDate')}
              >
                <option value="">Select batch expiry date</option>
                {batchExpiryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Date (readonly) */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Transaction Date & Time</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-muted text-muted-foreground">
                Aug 16, 2026 — 09:29 AM (auto-recorded)
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Remarks</label>
              <p className="text-xs text-muted-foreground mb-1.5">Optional notes about this stock-in transaction</p>
              <textarea
                rows={3}
                disabled={!foundProduct}
                placeholder="e.g. Regular restock, Bulk delivery from supplier..."
                className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed bg-background resize-none"
                {...register('remarks')}
              />
            </div>

            {/* Recorded by */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Recorded By</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-muted text-muted-foreground">
                M. Santos (Admin) — auto-filled from session
              </div>
            </div>

            <button
              type="submit"
              disabled={!foundProduct || isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                  </svg>
                  Confirm Stock-In
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Stock-In Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Recent Stock-In Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 10 stock-in entries</p>
          </div>
          <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
            {recentTransactions.length} records
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {['Transaction ID', 'Date & Time', 'Barcode', 'Product', 'Qty Added', 'Before → After', 'Expiry Date', 'Remarks', 'Recorded By'].map((h) => (
                  <th key={`sith-${h}`} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    <div>{tx.date}</div>
                    <div className="text-[10px]">{tx.time}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.barcode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[150px]">{tx.productName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-success font-bold tabular-nums">+{tx.qtyAdded}</span>
                    <span className="text-xs text-muted-foreground ml-1">{tx.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {tx.prevQty} → <span className="font-semibold text-foreground">{tx.newQty}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tx.expiryDate || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{tx.remarks || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tx.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Stock-In"
        message={`Add ${pendingData?.quantity} ${foundProduct?.unit} of "${foundProduct?.productName}"? New quantity will be ${(foundProduct?.quantity || 0) + (pendingData?.quantity || 0)} ${foundProduct?.unit}.`}
        confirmLabel="Confirm Stock-In"
        variant="primary"
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setPendingData(null); }}
      />
    </div>
  );
}