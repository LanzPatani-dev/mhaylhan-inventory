import AppLayout from '@/components/AppLayout';
import StockInClient from './components/StockInClient';

export default function StockInPage() {
  return (
    <AppLayout role="admin">
      <StockInClient />
    </AppLayout>
  );
}