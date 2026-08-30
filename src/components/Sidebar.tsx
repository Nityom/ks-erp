'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Factory, Package, ShoppingCart, Truck,
  Users, Wrench, BarChart3, TrendingUp, Settings, FileText,
  Receipt, PieChart, ChevronLeft, ChevronRight, X, Menu,
  Zap, Boxes, BookUser
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/production', label: 'Production', icon: Factory },
  { href: '/raw-materials', label: 'Raw Materials', icon: Package },
  { href: '/finished-goods', label: 'Finished Goods', icon: Boxes },
  { href: '/transport', label: 'Transport', icon: Truck },
  { href: '/sales', label: 'Sales & Billing', icon: ShoppingCart },
  { href: '/buyers', label: 'Buyers', icon: BookUser },
  { href: '/gst', label: 'GST Records', icon: Receipt },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/expenses', label: 'Expenses', icon: BarChart3 },
  { href: '/cashflow', label: 'Profit & Loss', icon: TrendingUp },
  { href: '/analytics', label: 'Reports', icon: PieChart },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">KS Paper</div>
            <div className="text-slate-400 text-xs">Manufacturing ERP</div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="hidden md:flex p-1.5 rounded hover:bg-slate-700 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronLeft size={16} className="text-slate-400" />}
        </button>
        <button onClick={onMobileClose} className="md:hidden p-1.5 rounded hover:bg-slate-700">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={classNames(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-colors text-sm',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
          v1.0 — Paper Cup &amp; Plate ERP
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={classNames(
          'hidden md:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 h-full flex flex-col">{content}</div>
          <div className="flex-1 bg-black/50" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
      <Menu size={20} />
    </button>
  );
}
