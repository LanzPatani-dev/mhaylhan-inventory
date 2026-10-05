import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import StockMovementChart from './components/StockMovementChart';
import RecentTransactions from './components/RecentTransactions';
import LowStockAlerts from './components/LowStockAlerts';
import ExpiringAlerts from './components/ExpiringAlerts';

export default function AdminDashboardPage() {
  return (
    <AppLayout role="admin">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-700 text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Inventory overview — Last updated: Aug 16, 2026 09:29 AM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-success font-600 bg-success/10 px-2.5 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* KPI bento grid */}
        <DashboardKPIs />

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <StockMovementChart />
          </div>
          <div>
            <LowStockAlerts />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <RecentTransactions />
          </div>
          <div>
            <ExpiringAlerts />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}