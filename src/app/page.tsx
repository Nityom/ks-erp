'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getSales, getCupProduction, getPlateProduction, getRMStock,
  getHeaters, getComponents,
} from '@/lib/storage';
import type { SaleEntry, CupProductionSession, PlateProductionSession } from '@/lib/types';
import { Card, StatCard, Alert } from '@/components/UI';
import { formatINR, formatNumber, todayDDMMYYYY, cupsUsedSince, currentMonth } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Factory, ShoppingCart, Package, Wrench, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getMonthStr(date: string) {
  const [dd, mm, yyyy] = date.split('/');
  return `${yyyy}-${mm}`;
}

export default function Home() {
  const { settings } = useApp();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [cupProd, setCupProd] = useState<CupProductionSession[]>([]);
  const [plateProd, setPlateProd] = useState<PlateProductionSession[]>([]);

  useEffect(() => {
    setSales(getSales());
    setCupProd(getCupProduction());
    setPlateProd(getPlateProduction());
  }, []);

  const today = todayDDMMYYYY();
  const month = currentMonth();
  const now = new Date();

  const todaySales = sales.filter(s => s.date === today);
  const todayCupsProduced = cupProd.filter(s => s.date === today).reduce((s, x) => s + x.actualCupsProduced, 0);
  const todayPlatesProduced = plateProd.filter(s => s.date === today).reduce((s, x) => s + x.platesProduced, 0);
  const todaySalesRevenue = todaySales.reduce((s, x) => s + x.totalAmount, 0);
  const todayCashIn = todaySales.reduce((s, x) => s + x.amountReceived, 0);
  const totalPending = sales.reduce((s, x) => s + x.pendingAmount, 0);

  const heaters = getHeaters();
  const components = getComponents();
  const maintenanceAlerts = [
    ...heaters.filter(h => {
      if (!h.lastReplacedDate) return false;
      const used = cupsUsedSince(h.machineId, h.lastReplacedDate, cupProd);
      return used >= (h.expectedCycleUnits ?? 500000) * 0.9;
    }).map(h => `Machine ${h.machineId} Heater ${h.heaterNumber}`),
    ...components.filter(c => {
      if (!c.lastReplacedDate) return false;
      const used = cupsUsedSince(c.machineId, c.lastReplacedDate, cupProd);
      return used >= (c.expectedCycleUnits ?? 300000) * 0.9;
    }).map(c => `Machine ${c.machineId} ${c.componentName ?? c.componentType}`),
  ];

  const stock = getRMStock();
  const lowStockAlerts: string[] = [];
  const thresholds = [
    { key: 'paperBlank', label: 'Paper Blank', threshold: settings.thresholdPaperBlank },
    { key: 'paperBottom', label: 'Paper Bottom', threshold: settings.thresholdPaperBottom },
    { key: 'paraffinOil', label: 'Paraffin Oil', threshold: settings.thresholdParaffinOil },
    { key: 'mobilOil', label: 'Mobil Oil', threshold: settings.thresholdMobilOil },
    { key: 'plateSheets', label: 'Plate Sheets', threshold: settings.thresholdPlateSheets },
  ];
  for (const t of thresholds) {
    const s = stock.find(x => x.materialType === t.key);
    if (t.threshold > 0 && (!s || s.actualQty <= t.threshold)) {
      lowStockAlerts.push(`${t.label}: ${s?.actualQty ?? 0}`);
    }
  }

  const thirtyPlusPending = sales.filter(s => {
    if (s.pendingAmount <= 0) return false;
    const [dd, mm, yyyy] = s.date.split('/');
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    return Math.ceil((new Date().getTime() - d.getTime()) / 86400000) > 30;
  });

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const ds = `${dd}/${mm}/${yyyy}`;
    return {
      label: `${dd}/${mm}`,
      hocker: sales.filter(s => s.date === ds && s.channel === 'hocker').reduce((s, x) => s + x.totalAmount, 0),
      wholesaler: sales.filter(s => s.date === ds && s.channel === 'wholesaler').reduce((s, x) => s + x.totalAmount, 0),
      retailer: sales.filter(s => s.date === ds && s.channel === 'retailer').reduce((s, x) => s + x.totalAmount, 0),
      friend: sales.filter(s => s.date === ds && s.channel === 'friend').reduce((s, x) => s + x.totalAmount, 0),
    };
  });

  const chartData = {
    labels: last7.map(d => d.label),
    datasets: [
      { label: 'Hocker', data: last7.map(d => d.hocker), backgroundColor: 'rgba(59,130,246,0.8)' },
      { label: 'Wholesaler', data: last7.map(d => d.wholesaler), backgroundColor: 'rgba(22,163,74,0.8)' },
      { label: 'Retailer', data: last7.map(d => d.retailer), backgroundColor: 'rgba(217,119,6,0.8)' },
      { label: 'Friend', data: last7.map(d => d.friend), backgroundColor: 'rgba(139,92,246,0.8)' },
    ],
  };

  const quickLinks = [
    { href: '/production', icon: Factory, label: '+ Production', color: 'var(--accent)' },
    { href: '/sales', icon: ShoppingCart, label: '+ Sale', color: 'var(--green)' },
    { href: '/raw-materials', icon: Package, label: '+ Purchase', color: 'var(--amber)' },
    { href: '/expenses', icon: BarChart3, label: '+ Expense', color: 'var(--red)' },
  ];

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Today: {today}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickLinks.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color }}>
                <Icon size={14} />{label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {(maintenanceAlerts.length > 0 || lowStockAlerts.length > 0 || thirtyPlusPending.length > 0) && (
        <div className="space-y-2">
          {maintenanceAlerts.length > 0 && (
            <Alert variant="red">
              <div className="flex items-center gap-2 font-semibold mb-1"><Wrench size={13} /> Maintenance Due Soon</div>
              <div className="flex flex-wrap gap-1.5">{maintenanceAlerts.map((a, i) => <span key={i} className="bg-red-200/50 text-red-900 dark:bg-red-800/30 dark:text-red-200 px-2 py-0.5 rounded text-xs">{a}</span>)}</div>
            </Alert>
          )}
          {lowStockAlerts.length > 0 && (
            <Alert variant="amber">
              <div className="flex items-center gap-2 font-semibold mb-1"><Package size={13} /> Low Stock</div>
              <div className="flex flex-wrap gap-1.5">{lowStockAlerts.map((a, i) => <span key={i} className="bg-amber-200/50 text-amber-900 dark:bg-amber-800/30 dark:text-amber-200 px-2 py-0.5 rounded text-xs">{a}</span>)}</div>
            </Alert>
          )}
          {thirtyPlusPending.length > 0 && (
            <Alert variant="red">
              <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle size={13} /> Overdue Payments (30+ days)</div>
              <div className="flex flex-wrap gap-1.5">
                {thirtyPlusPending.slice(0, 5).map((s, i) => <span key={i} className="bg-red-200/50 text-red-900 dark:bg-red-800/30 dark:text-red-200 px-2 py-0.5 rounded text-xs">{s.buyerName}: {formatINR(s.pendingAmount)}</span>)}
                {thirtyPlusPending.length > 5 && <span className="text-xs opacity-70">+{thirtyPlusPending.length - 5} more</span>}
              </div>
            </Alert>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Cups Produced Today" value={formatNumber(todayCupsProduced)} color="blue" />
        <StatCard label="Plates Produced Today" value={formatNumber(todayPlatesProduced)} color="blue" />
        <StatCard label="Sales Revenue Today" value={formatINR(todaySalesRevenue)} color="green" />
        <StatCard label="Cash Received Today" value={formatINR(todayCashIn)} color="green" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pending Receivable" value={formatINR(totalPending)} color="red" />
        <StatCard label="30+ Day Overdue" value={formatINR(thirtyPlusPending.reduce((s, x) => s + x.pendingAmount, 0))} color="red" />
        <StatCard label="Sales This Month" value={formatNumber(sales.filter(s => getMonthStr(s.date) === month).length)} />
        <StatCard label="Maintenance Alerts" value={maintenanceAlerts.length} color={maintenanceAlerts.length > 0 ? 'amber' : undefined} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Sales — Last 7 Days</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Channel-wise revenue</div>
          </div>
          <Link href="/analytics"><span className="text-xs" style={{ color: 'var(--accent)' }}>View Analytics →</span></Link>
        </div>
        <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          { href: '/production', icon: Factory, label: 'Production', sub: `${formatNumber(cupProd.filter(s => getMonthStr(s.date) === month).reduce((s, x) => s + x.actualCupsProduced, 0))} cups this month` },
          { href: '/sales', icon: ShoppingCart, label: 'Sales & Billing', sub: `${sales.filter(s => getMonthStr(s.date) === month).length} sales this month` },
          { href: '/raw-materials', icon: Package, label: 'Raw Materials', sub: `${stock.length} materials tracked` },
          { href: '/workers', icon: AlertTriangle, label: 'Workers', sub: 'Payroll & attendance' },
          { href: '/maintenance', icon: Wrench, label: 'Maintenance', sub: maintenanceAlerts.length > 0 ? `${maintenanceAlerts.length} alerts` : 'All OK' },
          { href: '/cashflow', icon: TrendingUp, label: 'Profit & Loss', sub: 'Profit reports' },
          { href: '/gst', icon: BarChart3, label: 'GST Records', sub: 'Input / output tax' },
          { href: '/analytics', icon: BarChart3, label: 'Reports', sub: 'Insights & charts' },
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href}>
            <Card className="hover:opacity-80 transition-opacity cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={15} style={{ color: 'var(--accent)' }} />
                <span className="font-semibold text-sm">{label}</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
