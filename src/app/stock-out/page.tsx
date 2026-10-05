import AppLayout from '@/components/AppLayout';
import StockOutClient from './components/StockOutClient';

export default function StockOutPage() {
  return (
    <AppLayout role="admin">
      <StockOutClient />
    </AppLayout>
  );
}