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

// BACKEND INTEGRATION POINT: Replace mock data with /api/products/search?barcode= and /api/transactions/stock-out

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
  expiryStatus: 'Valid' | 'Expiring Soon' | 'Expiring (7d)' | 'Expired';
  source?: 'database';
}

interface StockOutFormValues {
  barcode: string;
  quantityToRelease: number;
  remarks: string;
}

interface RecentStockOut {
  id: string;
  date: string;
  time: string;
  barcode: string;
  productName: string;
  qtyReleased: number;
  prevQty: number;
  newQty: number;
  unit: string;
  remarks: string;
  recordedBy: string;
}

const initialRecentStockOut: RecentStockOut[] = [
  { id: 'TXN-2026-0890', date: 'Aug 16, 2026', time: '08:52 AM', barcode: '4800016012351', productName: 'Lucky Me Pancit Canton', qtyReleased: 24, prevQty: 80, newQty: 56, unit: 'Pack', remarks: 'Wholesale order - Aling Nena', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0888', date: 'Aug 16, 2026', time: '07:58 AM', barcode: '4800016001010', productName: 'Skyflakes Crackers 400g', qtyReleased: 12, prevQty: 45, newQty: 33, unit: 'Pack', remarks: '', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0886', date: 'Aug 15, 2026', time: '04:22 PM', barcode: '4806501105010', productName: 'C2 Green Tea Apple', qtyReleased: 30, prevQty: 72, newQty: 42, unit: 'Bottle', remarks: 'Bulk sale to sari-sari store', recordedBy: 'R. Cruz' },
  { id: 'TXN-2026-0884', date: 'Aug 15, 2026', time: '01:48 PM', barcode: '4800057034001', productName: 'Silver Swan Soy Sauce', qtyReleased: 18, prevQty: 50, newQty: 32, unit: 'Bottle', remarks: '', recordedBy: 'J. Reyes' },
  { id: 'TXN-2026-0881', date: 'Aug 15, 2026', time: '11:05 AM', barcode: '4800888115657', productName: 'Coca-Cola 1.5L', qtyReleased: 36, prevQty: 96, newQty: 60, unit: 'Bottle', remarks: 'Event order', recordedBy: 'R. Cruz' },
  { id: 'TXN-2026-0878', date: 'Aug 14, 2026', time: '03:30 PM', barcode: '4800100000019', productName: 'CDO Chorizo de Bilbao', qtyReleased: 6, prevQty: 18, newQty: 12, unit: 'Can', remarks: '', recordedBy: 'J. Reyes' },
];

export default function StockOutClient() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<StockOutFormValues | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentStockOut[]>(initialRecentStockOut);
  const [insufficientError, setInsufficientError] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockOutFormValues>({
    defaultValues: { barcode: '', quantityToRelease: 1, remarks: '' },
  });

  const watchedQty = Number(watch('quantityToRelease')) || 0;
  const isInsufficient = foundProduct !== null && watchedQty > foundProduct.quantity;
  const isOutOfStock = foundProduct !== null && foundProduct.quantity === 0;

  const handleBarcodeSearch = async (barcode?: string) => {
    const code = (barcode || barcodeInput).trim();
    if (!code) return;
    setSearching(true);
    setFoundProduct(null);
    setNotFound(false);
    setInsufficientError(false);
    const { data: row, error } = await supabase
      .from('products')
      .select('id, barcode, product_name, category_id, unit, quantity, minimum_stock, expiration_date, stock_status, expiry_status, categories(name)')
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
          expiryStatus: row.expiry_status,
          source: 'database',
        }
      : findProductByBarcode(code);
    if (product) {
      setFoundProduct(product);
      reset({ barcode: code, quantityToRelease: 1, remarks: '' });
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

  const onSubmit = (data: StockOutFormValues) => {
    if (!foundProduct) return;
    if (data.quantityToRelease > foundProduct.quantity) {
      setInsufficientError(true);
      return;
    }
    if (foundProduct.quantity === 0) return;
    setInsufficientError(false);
    setPendingData(data);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!foundProduct || !pendingData) return;
    setConfirmOpen(false);
    // BACKEND INTEGRATION POINT: POST /api/transactions/stock-out
    await new Promise((r) => setTimeout(r, 800));

    const newQty = foundProduct.quantity - pendingData.quantityToRelease;
    const newTx: RecentStockOut = {
      id: `TXN-2026-${String(Math.floor(Math.random() * 9000 + 1000))}`,
      date: 'Aug 16, 2026',
      time: '09:29 AM',
      barcode: foundProduct.barcode,
      productName: foundProduct.productName,
      qtyReleased: pendingData.quantityToRelease,
      prevQty: foundProduct.quantity,
      newQty,
      unit: foundProduct.unit,
      remarks: pendingData.remarks,
      recordedBy: 'M. Santos',
    };

    const updatedStockStatus: Product['stockStatus'] =
      newQty === 0 ? 'Out of Stock' :
      newQty <= foundProduct.minimumStock * 0.5 ? 'Critical' :
      newQty <= foundProduct.minimumStock ? 'Low Stock' : 'Normal';

    if (foundProduct.source === 'database') {
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQty, stock_status: updatedStockStatus, updated_at: new Date().toISOString() })
        .eq('id', foundProduct.id)
        .select('id')
        .single();

      if (updateError) {
        toast.error(`Could not save the stock update: ${updateError.message}`);
        return;
      }

      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        transaction_ref: `STOCK-OUT-${crypto.randomUUID()}`,
        transaction_type: 'STOCK-OUT',
        product_id: foundProduct.id,
        barcode: foundProduct.barcode,
        product_name: foundProduct.productName,
        category: foundProduct.category,
        unit: foundProduct.unit,
        quantity: pendingData.quantityToRelease,
        previous_qty: foundProduct.quantity,
        new_qty: newQty,
        expiry_date: foundProduct.expirationDate,
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
      stockStatus: updatedStockStatus,
    });
    toast.success(`Stock-Out recorded. ${foundProduct.productName}: ${foundProduct.quantity} → ${newQty} ${foundProduct.unit}`);
    reset({ barcode: foundProduct.barcode, quantityToRelease: 1, remarks: '' });
    setPendingData(null);
  };

  const clearSearch = () => {
    setBarcodeInput('');
    setFoundProduct(null);
    setNotFound(false);
    setInsufficientError(false);
    reset({ barcode: '', quantityToRelease: 1, remarks: '' });
  };

  const stockPercentage = foundProduct
    ? Math.min(100, Math.round((foundProduct.quantity / Math.max(foundProduct.minimumStock * 2, 1)) * 100))
    : 0;

  const barColor =
    foundProduct?.stockStatus === 'Out of Stock' ? 'bg-danger' :
    foundProduct?.stockStatus === 'Critical' ? 'bg-orange-500' :
    foundProduct?.stockStatus === 'Low Stock' ? 'bg-warning' : 'bg-success';

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
          <h1 className="text-2xl font-700 text-foreground">Stock-Out</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record outgoing inventory — validate against available stock before releasing</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Scan Barcode
          </button>
          <div className="flex items-center gap-2 text-xs text-info bg-info/10 px-3 py-1.5 rounded-full font-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Recorded by: M. Santos (Admin)
          </div>
        </div>
      </div>

      {/* Main 2-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Search + product info */}
        <div className="space-y-4">
          {/* Barcode search */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-700 text-foreground mb-1">Find Product to Release</h3>
            <p className="text-xs text-muted-foreground mb-4">Scan barcode with camera or enter barcode number manually</p>

            {/* Camera scan button (prominent) */}
            <button
              onClick={() => setScannerOpen(true)}
              className="w-full mb-3 flex items-center justify-center gap-2.5 py-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-primary font-600 text-sm group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Open Camera to Scan Barcode
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-500">or enter manually</span>
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
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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

            <div className="mt-3 flex flex-wrap gap-1.5">
              <p className="text-xs text-muted-foreground w-full">Quick test barcodes:</p>
              {['4800888115657', '4800016012351', '4800061007897', '7891000246893'].map((bc) => (
                <button
                  key={`sobc-${bc}`}
                  onClick={() => { setBarcodeInput(bc); handleBarcodeSearch(bc); }}
                  className="text-xs font-mono text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                >
                  {bc}
                </button>
              ))}
            </div>
          </div>

          {/* Not found */}
          {notFound && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-5 slide-up">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-danger/10 rounded-lg shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="font-600 text-danger text-sm">Product not registered.</p>
                  <p className="text-xs text-muted-foreground mt-1">Barcode <span className="font-mono font-600">{barcodeInput}</span> was not found in the product catalog.</p>
                </div>
              </div>
            </div>
          )}

          {/* Product info card with stock indicator */}
          {foundProduct && (
            <div className="bg-card border border-border rounded-xl p-5 slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-500 uppercase tracking-wide mb-1">Product Found</p>
                  <h3 className="text-lg font-700 text-foreground">{foundProduct.productName}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{foundProduct.barcode}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={foundProduct.stockStatus} />
                  <StatusBadge status={foundProduct.expiryStatus} />
                </div>
              </div>

              {/* Stock level visual */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-600 text-muted-foreground">Available Stock</p>
                  <p className="text-sm font-700 tabular-nums text-foreground">
                    {foundProduct.quantity} <span className="text-xs text-muted-foreground font-400">/ min. {foundProduct.minimumStock} {foundProduct.unit}</span>
                  </p>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-2xs text-muted-foreground">0</span>
                  <span className="text-2xs text-muted-foreground">{foundProduct.minimumStock * 2} (target)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Category', value: foundProduct.category },
                  { label: 'Unit', value: foundProduct.unit },
                  { label: 'Expiry Date', value: foundProduct.expirationDate },
                ].map((item) => (
                  <div key={`soinfo-${item.label}`} className="bg-muted rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground font-500">{item.label}</p>
                    <p className="text-xs font-700 mt-0.5 text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              {foundProduct.expiryStatus === 'Expired' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Warning: This product is expired. Release with caution — confirm before proceeding.
                </div>
              )}

              {isOutOfStock && (
                <div className="mt-3 flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 font-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Out of Stock — cannot release any quantity from this product.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Stock-Out form */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-700 text-foreground mb-1">Stock-Out Details</h3>
          <p className="text-xs text-muted-foreground mb-5">
            {foundProduct ? `Releasing from: ${foundProduct.productName}` : 'Search for a product first to record stock-out.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Product field */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Product</label>
              <div className={`w-full px-3 py-2.5 rounded-lg border text-sm ${foundProduct ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'} border-input`}>
                {foundProduct ? foundProduct.productName : 'No product selected'}
              </div>
            </div>

            {/* Available quantity display */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Available Quantity</label>
              <div className={`w-full px-3 py-2.5 rounded-lg border text-sm font-700 tabular-nums ${
                foundProduct?.stockStatus === 'Out of Stock' ? 'bg-danger/10 border-danger/30 text-danger' :
                foundProduct?.stockStatus === 'Critical' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                foundProduct?.stockStatus === 'Low Stock'? 'bg-warning/10 border-warning/30 text-warning' : 'bg-success/10 border-success/30 text-success'
              } border-input`}>
                {foundProduct ? `${foundProduct.quantity} ${foundProduct.unit}` : '—'}
              </div>
            </div>

            {/* Quantity to release */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Quantity to Release <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Cannot exceed available quantity</p>
              <input
                type="number"
                min={1}
                max={foundProduct?.quantity || undefined}
                disabled={!foundProduct || isOutOfStock}
                placeholder="Enter quantity"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed bg-background ${
                  errors.quantityToRelease || isInsufficient ? 'border-danger focus:border-danger' : 'border-input focus:border-primary'
                }`}
                {...register('quantityToRelease', {
                  required: 'Quantity is required.',
                  min: { value: 1, message: 'Quantity must be at least 1.' },
                  valueAsNumber: true,
                  onChange: () => setInsufficientError(false),
                })}
              />
              {errors.quantityToRelease && <p className="text-xs text-danger mt-1">{errors.quantityToRelease.message}</p>}
              {(isInsufficient || insufficientError) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-danger font-600 slide-up">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Insufficient inventory. Available: {foundProduct?.quantity} {foundProduct?.unit}
                </div>
              )}
              {foundProduct && !isInsufficient && watchedQty > 0 && !isOutOfStock && (
                <p className="text-xs text-muted-foreground mt-1 font-500">
                  Remaining after release: <span className="font-700 text-foreground">{foundProduct.quantity - watchedQty} {foundProduct.unit}</span>
                  {foundProduct.quantity - watchedQty <= foundProduct.minimumStock && (
                    <span className="text-warning ml-1">(will trigger low-stock alert)</span>
                  )}
                </p>
              )}
            </div>

            {/* Transaction Date (readonly) */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Transaction Date & Time</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-muted text-muted-foreground">
                Aug 16, 2026 — 09:29 AM (auto-recorded)
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Remarks</label>
              <p className="text-xs text-muted-foreground mb-1.5">Optional: customer name, order reference, reason for release</p>
              <textarea
                rows={3}
                disabled={!foundProduct || isOutOfStock}
                placeholder="e.g. Wholesale order - Aling Nena, Bulk sale..."
                className="w-full px-3 py-2.5 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed bg-background resize-none"
                {...register('remarks')}
              />
            </div>

            {/* Recorded by */}
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">Recorded By</label>
              <div className="w-full px-3 py-2.5 rounded-lg border border-input text-sm bg-muted text-muted-foreground">
                M. Santos (Admin) — auto-filled from session
              </div>
            </div>

            <button
              type="submit"
              disabled={!foundProduct || isSubmitting || isOutOfStock}
              className="w-full py-3 bg-danger text-white rounded-lg text-sm font-600 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                  Confirm Stock-Out
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Stock-Out Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-700 text-foreground">Recent Stock-Out Transactions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 10 stock-out entries</p>
          </div>
          <span className="text-xs font-600 text-danger bg-danger/10 px-2.5 py-1 rounded-full">
            {recentTransactions.length} records
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {['Transaction ID', 'Date & Time', 'Barcode', 'Product', 'Qty Released', 'Before → After', 'Remarks', 'Recorded By'].map((h) => (
                  <th key={`soth-${h}`} className="px-4 py-2.5 text-left text-xs font-600 text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    <div>{tx.date}</div>
                    <div className="text-2xs">{tx.time}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.barcode}</td>
                  <td className="px-4 py-3">
                    <p className="font-500 text-foreground truncate max-w-[150px]">{tx.productName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-danger font-700 tabular-nums">-{tx.qtyReleased}</span>
                    <span className="text-xs text-muted-foreground ml-1">{tx.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {tx.prevQty} → <span className="font-600 text-foreground">{tx.newQty}</span>
                  </td>
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
        title="Confirm Stock-Out"
        message={`Release ${pendingData?.quantityToRelease} ${foundProduct?.unit} of "${foundProduct?.productName}"? Remaining quantity will be ${(foundProduct?.quantity || 0) - (pendingData?.quantityToRelease || 0)} ${foundProduct?.unit}.`}
        confirmLabel="Confirm Stock-Out"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setPendingData(null); }}
      />
    </div>
  );
}