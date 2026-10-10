import React from 'react';
import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import UserManagementClient from './components/UserManagementClient';

export default function UserManagementPage() {
  return (
    <AppLayout role="admin">
      <Suspense fallback={<div className="min-h-32" />}>
        <UserManagementClient />
      </Suspense>
    </AppLayout>
  );
}
