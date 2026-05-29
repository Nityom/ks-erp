// Shared UI components

import { classNames } from '@/lib/utils';
import { ChevronUp, ChevronDown, Search, Download } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { downloadCSV } from '@/lib/utils';

// ─── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={classNames('rounded-xl border p-4', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', ...style }}
    >
      {children}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'default';
  icon?: React.ReactNode;
}
export function StatCard({ label, value, subtext, color = 'default', icon }: StatCardProps) {
  const colorMap = {
    green: 'var(--green)',
    red: 'var(--red)',
    amber: 'var(--amber)',
    blue: 'var(--accent)',
    default: 'var(--text)',
  };
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
        {icon && <span style={{ color: colorMap[color] }}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold" style={{ color: colorMap[color] }}>{value}</div>
      {subtext && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtext}</div>}
    </Card>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'amber' | 'blue' | 'gray';
}
export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', styles[variant])}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}
export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeStyles = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'border text-sm hover:bg-slate-50 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  };
  return (
    <button
      className={classNames(base, sizeStyles[size], variantStyles[variant], className)}
      style={variant === 'secondary' ? { borderColor: 'var(--border)', color: 'var(--text)' } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <input
        className={classNames(
          'px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          className
        )}
        style={{
          background: 'var(--surface)',
          borderColor: error ? 'var(--red)' : 'var(--border)',
          color: 'var(--text)',
        }}
        {...rest}
      />
      {error && <span className="text-xs" style={{ color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}
export function Select({ label, children, className, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>}
      <select
        className={classNames('px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500', className)}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Sortable Table ───────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null;
interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}
interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  exportFilename?: string;
  emptyText?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns, data, searchable, exportFilename, emptyText = 'No records found'
}: TableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(s))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof T];
      const bv = b[sortKey as keyof T];
      if (av === undefined || bv === undefined) return 0;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {(searchable || exportFilename) && (
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          )}
          {exportFilename && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadCSV(sorted as Record<string, unknown>[], exportFilename)}
            >
              <Download size={13} /> CSV
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--surface2)' }}>
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={classNames('px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide', col.sortable !== false ? 'cursor-pointer select-none' : '')}
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === String(col.key) && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-3 py-2.5" style={{ color: 'var(--text)' }}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={classNames('relative w-full rounded-xl shadow-2xl overflow-hidden', width)}
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">✕</button>
        </div>
        <div className="overflow-y-auto max-h-[80vh] p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

interface AlertProps {
  variant: 'red' | 'amber' | 'green' | 'blue';
  children: React.ReactNode;
}
export function Alert({ variant, children }: AlertProps) {
  const styles = {
    red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
    green: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  };
  return (
    <div className={classNames('border rounded-lg px-4 py-3 text-sm', styles[variant])}>
      {children}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={classNames(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            active === t.key ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
          )}
          style={{ color: active === t.key ? 'var(--text)' : 'var(--text-muted)' }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
export function ConfirmDialog({ open, message, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirm">
      <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </div>
    </Modal>
  );
}
