import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryListClient from './components/InventoryListClient';

export default function InventoryListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppLayout role="admin">
        <InventoryListClient />
      </AppLayout>
    </Suspense>
  );
}