import AppLayout from '@/components/AppLayout';
import ProductManagementClient from './components/ProductManagementClient';

export default function ProductManagementPage() {
  return (
    <AppLayout role="admin">
      <ProductManagementClient />
    </AppLayout>
  );
}