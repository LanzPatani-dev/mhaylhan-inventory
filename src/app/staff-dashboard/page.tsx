import React from 'react';
import AppLayout from '@/components/AppLayout';
import StaffDashboardClient from './components/StaffDashboardClient';

export default function StaffDashboardPage() {
  return (
    <AppLayout role="staff">
      <StaffDashboardClient />
    </AppLayout>
  );
}
