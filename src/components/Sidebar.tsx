'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  role: 'admin' | 'staff';
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const iconStroke = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const dashboardIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const packageIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const arrowDownIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
);

const arrowUpIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
);

const alertIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const calendarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const historyIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.5" />
  </svg>
);

const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const usersIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const tagIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const userIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const logoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const reportIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const auditIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const settingsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const adminNav: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin-dashboard', icon: dashboardIcon },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'All Products', href: '/inventory-list?view=all', icon: listIcon },
      { label: 'Stock-In', href: '/stock-in', icon: arrowDownIcon },
      { label: 'Stock-Out', href: '/stock-out', icon: arrowUpIcon },
      { label: 'Low Stock', href: '/inventory-list?view=low-stock', icon: alertIcon },
      { label: 'Expiration Monitoring', href: '/inventory-list?view=expiration', icon: calendarIcon },
      { label: 'Inventory History', href: '/transaction-log', icon: historyIcon },
    ],
  },
  {
    group: 'Products',
    items: [
      { label: 'Manage Products', href: '/product-management', icon: packageIcon },
      { label: 'Categories', href: '/category-management', icon: tagIcon },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Inventory Reports', href: '/inventory-reports', icon: reportIcon },
      { label: 'Transaction Log', href: '/transaction-log', icon: auditIcon },
    ],
  },
  {
    group: 'Users',
    items: [
      { label: 'Manage Users', href: '/user-management', icon: usersIcon },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'System Config', href: '/system-config', icon: settingsIcon },
    ],
  },
];

const staffNav: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/staff-dashboard', icon: dashboardIcon },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'All Products', href: '/inventory-list?view=all', icon: listIcon },
      { label: 'Stock-In', href: '/stock-in', icon: arrowDownIcon },
      { label: 'Stock-Out', href: '/stock-out', icon: arrowUpIcon },
      { label: 'Low Stock', href: '/inventory-list?view=low-stock', icon: alertIcon },
      { label: 'Expiration Monitoring', href: '/inventory-list?view=expiration', icon: calendarIcon },
      { label: 'Inventory History', href: '/transaction-log', icon: historyIcon },
    ],
  },
  {
    group: 'Reports',
    items: [
      { label: 'Transaction Log', href: '/transaction-log', icon: auditIcon },
    ],
  },
];

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose, role }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const navGroups = role === 'admin' ? adminNav : staffNav;

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split('?');
    if (hrefPath === '/') return pathname === '/';
    if (pathname !== hrefPath && !pathname.startsWith(hrefPath + '/')) return false;
    if (!hrefQuery) return true;

    const expected = new URLSearchParams(hrefQuery).get('view');
    return searchParams.get('view') === expected;
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      router.push('/');
    }
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={onMobileClose}
        title={collapsed ? item.label : undefined}
        className={`
          group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-500 transition-all duration-150
          ${active
            ? 'bg-primary/10 text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <span className={`shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span className="ml-auto bg-danger text-white text-2xs font-700 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-border ${collapsed ? 'justify-center px-2' : ''}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <div>
            <span className="font-800 text-sm text-foreground leading-none block">MhayLhan</span>
            <span className="text-2xs text-muted-foreground">Inventory System</span>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={`group-${group.group}`}>
            {!collapsed && (
              <p className="text-2xs font-600 text-muted-foreground uppercase tracking-widest px-3 mb-1">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemComponent key={`nav-${item.label}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="border-t border-border py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="text-2xs font-600 text-muted-foreground uppercase tracking-widest px-3 mb-1">
            Account
          </p>
        )}
        <Link
          href={role === 'admin' ? '/admin-dashboard' : '/staff-dashboard'}
          onClick={onMobileClose}
          title={collapsed ? 'Profile' : undefined}
          className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-500 transition-all duration-150 text-secondary-foreground hover:bg-muted hover:text-foreground ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="shrink-0 text-muted-foreground group-hover:text-foreground">{userIcon}</span>
          {!collapsed && <span className="flex-1 truncate">Profile</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-500 transition-all duration-150 text-secondary-foreground hover:bg-danger/10 hover:text-danger ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="shrink-0 text-muted-foreground group-hover:text-danger">{logoutIcon}</span>
          {!collapsed && <span className="flex-1 text-left truncate">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sidebar-transition overflow-hidden ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col sidebar-transition lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}