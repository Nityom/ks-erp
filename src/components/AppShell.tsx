'use client';
import { useState } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import Sidebar, { MobileMenuButton } from './Sidebar';
import Header from './Header';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/production': 'Production',
  '/raw-materials': 'Raw Materials',
  '/finished-goods': 'Packed Stock',
  '/transport': 'Transport',
  '/sales': 'Sales & Billing',
  '/gst': 'GST Records',
  '/workers': 'Workers',
  '/maintenance': 'Maintenance',
  '/expenses': 'Expenses',
  '/cashflow': 'Profit & Loss',
  '/analytics': 'Reports',
  '/settings': 'Settings',
};

function ShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'KS Paper ERP';

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title={title}
          mobileMenuButton={<MobileMenuButton onClick={() => setMobileOpen(true)} />}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ShellInner>{children}</ShellInner>
    </AppProvider>
  );
}
