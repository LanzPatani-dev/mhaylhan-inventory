'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Product } from './ProductManagementClient';
import BarcodeScanner from '@/components/ui/BarcodeScanner';

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  onSave: (data: Partial<Product>) => void;
  onClose: () => void;
}

const CATEGORIES = ['Rice', 'Grocery', 'Beverages', 'Canned Goods', 'Plastic Products', 'Styro Materials', 'Other Merchandise'];
const UNITS = ['Pack', 'Bottle', 'Can', 'Sachet', 'Kilo', 'Piece', 'Box', 'Bag', 'Bundle'];

interface FormValues {
  barcode: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  expirationDate: string;
  status: 'Active' | 'Inactive';
}

export default function ProductFormModal({ open, product, onSave, onClose }: ProductFormModalProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    values: product ? {
      barcode: product.barcode,
      productName: product.productName,
      category: product.category,
      unit: product.unit,
      quantity: product.quantity,
      minimumStock: product.minimumStock,
      expirationDate: product.expirationDate === 'N/A' ? '' : product.expirationDate,
      status: product.status,
    } : {
      barcode: '',
      productName: '',
      category: 'Grocery',
      unit: 'Pack',
      quantity: 0,
      minimumStock: 10,
      expirationDate: '',
      status: 'Active',
    },
  });

  if (!open) return null;

  const onSubmit = async (data: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));
    onSave({
      ...data,
      expirationDate: data.expirationDate || 'N/A',
    });
    reset();
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto scrollbar-thin modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-700 text-foreground">{product ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{product ? `Editing: ${product.productName}` : 'Register a new product in the inventory catalog'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Barcode + Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Barcode <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Scan a barcode or enter it manually</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 4800888115657"
                  className={`min-w-0 flex-1 px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/30 bg-background ${errors.barcode ? 'border-danger' : 'border-input focus:border-primary'}`}
                  {...register('barcode', {
                    required: 'Barcode is required.',
                    pattern: { value: /^[0-9]{8,14}$/, message: 'Enter a valid 8–14 digit barcode.' },
                  })}
                />
                {!product && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 border border-primary/30 rounded-lg text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
                    aria-label="Scan product barcode"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9V5a2 2 0 0 1 2-2h4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" />
                      <path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2v-4" />
                      <rect x="9" y="9" width="6" height="6" />
                    </svg>
                    Scan
                  </button>
                )}
              </div>
              {errors.barcode && <p className="text-xs text-danger mt-1">{errors.barcode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Product Name <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Full product name including size/variant</p>
              <input
                type="text"
                placeholder="e.g. Coca-Cola 1.5L"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 bg-background ${errors.productName ? 'border-danger' : 'border-input focus:border-primary'}`}
                {...register('productName', {
                  required: 'Product name is required.',
                  minLength: { value: 2, message: 'Product name must be at least 2 characters.' },
                })}
              />
              {errors.productName && <p className="text-xs text-danger mt-1">{errors.productName.message}</p>}
            </div>
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Category <span className="text-danger">*</span>
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary bg-background"
                {...register('category', { required: true })}
              >
                {CATEGORIES.map((c) => <option key={`opt-cat-${c}`} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Unit of Measure <span className="text-danger">*</span>
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary bg-background"
                {...register('unit', { required: true })}
              >
                {UNITS.map((u) => <option key={`opt-unit-${u}`} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Quantity + Min Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Initial Quantity <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Current stock count on hand</p>
              <input
                type="number"
                min={0}
                placeholder="0"
                className={`w-full px-3 py-2 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30 bg-background ${errors.quantity ? 'border-danger' : 'border-input focus:border-primary'}`}
                {...register('quantity', {
                  required: 'Quantity is required.',
                  min: { value: 0, message: 'Quantity cannot be negative.' },
                  valueAsNumber: true,
                })}
              />
              {errors.quantity && <p className="text-xs text-danger mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Minimum Stock Level <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Alert threshold for low-stock monitoring</p>
              <input
                type="number"
                min={1}
                placeholder="10"
                className={`w-full px-3 py-2 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30 bg-background ${errors.minimumStock ? 'border-danger' : 'border-input focus:border-primary'}`}
                {...register('minimumStock', {
                  required: 'Minimum stock level is required.',
                  min: { value: 1, message: 'Minimum stock must be at least 1.' },
                  valueAsNumber: true,
                })}
              />
              {errors.minimumStock && <p className="text-xs text-danger mt-1">{errors.minimumStock.message}</p>}
            </div>
          </div>

          {/* Expiration Date + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Expiration Date
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Leave blank if product has no expiry (e.g. Plastic Products)</p>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary bg-background"
                {...register('expirationDate')}
              />
            </div>
            <div>
              <label className="block text-sm font-600 text-foreground mb-1.5">
                Status
              </label>
              <p className="text-xs text-muted-foreground mb-1.5">Inactive products cannot be used in transactions</p>
              <select
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary bg-background"
                {...register('status')}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Required fields note */}
          <p className="text-xs text-muted-foreground"><span className="text-danger">*</span> Required fields</p>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-600 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                product ? 'Save Changes' : 'Add Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    {scannerOpen && !product && (
      <BarcodeScanner
        onScan={(barcode) => {
          setValue('barcode', barcode.trim(), { shouldDirty: true, shouldValidate: true });
          setScannerOpen(false);
        }}
        onClose={() => setScannerOpen(false)}
      />
    )}
    </>
  );
}