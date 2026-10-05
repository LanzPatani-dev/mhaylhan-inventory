import React from 'react';

type StockStatus = 'Normal' | 'Low Stock' | 'Critical' | 'Out of Stock';
type ExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expiring (7d)' | 'Expired';
type UserStatus = 'Active' | 'Inactive';
type TransactionType = 'STOCK-IN' | 'STOCK-OUT';

type BadgeVariant = StockStatus | ExpiryStatus | UserStatus | TransactionType | 'active' | 'inactive';

interface StatusBadgeProps {
  status: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantMap: Record<string, string> = {
  'Normal': 'badge-normal',
  'Low Stock': 'badge-low',
  'Critical': 'badge-critical',
  'Out of Stock': 'badge-out',
  'Valid': 'badge-valid',
  'Expiring Soon': 'badge-expiring-soon',
  'Expiring (7d)': 'badge-expiring-soon',
  'Expired': 'badge-expired',
  'Active': 'badge-active',
  'active': 'badge-active',
  'Inactive': 'badge-inactive',
  'inactive': 'badge-inactive',
  'STOCK-IN': 'bg-info/10 text-info',
  'STOCK-OUT': 'bg-warning/10 text-warning',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cls = variantMap[status] || 'badge-inactive';
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-600 ${sizeClass} ${cls}`}>
      {status}
    </span>
  );
}