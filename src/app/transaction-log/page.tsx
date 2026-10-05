import React from 'react';
import AppLayout from '@/components/AppLayout';
import TransactionLogClient from './components/TransactionLogClient';

export default function TransactionLogPage() {
  return (
    <AppLayout role="admin">
      <TransactionLogClient />
    </AppLayout>
  );
}
