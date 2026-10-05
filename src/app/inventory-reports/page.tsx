import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryReportsClient from './components/InventoryReportsClient';

export default function InventoryReportsPage() {
  return (
    <AppLayout role="admin">
      <InventoryReportsClient />
    </AppLayout>
  );
}
