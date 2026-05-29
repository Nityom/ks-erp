'use client';
import { useState, useEffect, useRef } from 'react';
import {
  getSales, getCupProduction, getPlateProduction, getPieceRateEntries,
  getRMPurchases, getElectricityBills,
} from '@/lib/storage';
import type { SaleEntry, CupProductionSession, PlateProductionSession } from '@/lib/types';
import { Card, SectionHeader, Tabs, StatCard } from '@/components/UI';
import { formatINR, formatNumber, monthLabel } from '@/lib/utils';

// Chart.js dynamic import
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const COLORS = {
  blue: 'rgba(59, 130, 246, 0.8)',
  green: 'rgba(22, 163, 74, 0.8)',
  red: 'rgba(220, 38, 38, 0.8)',
  amber: 'rgba(217, 119, 6, 0.8)',
  purple: 'rgba(139, 92, 246, 0.8)',
  teal: 'rgba(20, 184, 166, 0.8)',
};

function getMonth(date: string) {
  const [dd, mm, yyyy] = date.split('/');
  return `${yyyy}-${mm}`;
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState('sales');
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [cupProd, setCupProd] = useState<CupProductionSession[]>([]);
  const [plateProd, setPlateProd] = useState<PlateProductionSession[]>([]);

  useEffect(() => {
    setSales(getSales());
    setCupProd(getCupProduction());
    setPlateProd(getPlateProduction());
  }, []);

  const allMonths = (() => {
    const s = new Set<string>();
    [...sales, ...cupProd, ...plateProd].forEach(x => {
      if ('date' in x) s.add(getMonth(x.date));
    });
    return [...s].sort().slice(-12);
  })();

  // ─── Sales Analytics ──────────────────────────────────────────────────────────

  const channelRevByMonth = allMonths.map(m => ({
    month: monthLabel(m),
    hocker: sales.filter(s => s.channel === 'hocker' && getMonth(s.date) === m).reduce((s, x) => s + x.totalAmount, 0),
    wholesaler: sales.filter(s => s.channel === 'wholesaler' && getMonth(s.date) === m).reduce((s, x) => s + x.totalAmount, 0),
    retailer: sales.filter(s => s.channel === 'retailer' && getMonth(s.date) === m).reduce((s, x) => s + x.totalAmount, 0),
    friend: sales.filter(s => s.channel === 'friend' && getMonth(s.date) === m).reduce((s, x) => s + x.totalAmount, 0),
  }));

  const salesBarData = {
    labels: channelRevByMonth.map(r => r.month),
    datasets: [
      { label: 'Hocker', data: channelRevByMonth.map(r => r.hocker), backgroundColor: COLORS.blue },
      { label: 'Wholesaler', data: channelRevByMonth.map(r => r.wholesaler), backgroundColor: COLORS.green },
      { label: 'Retailer', data: channelRevByMonth.map(r => r.retailer), backgroundColor: COLORS.amber },
      { label: 'Friend', data: channelRevByMonth.map(r => r.friend), backgroundColor: COLORS.purple },
    ],
  };

  // Product mix
  const productRevenue = ['50ml', '60ml', '210ml', '250ml', 'plate'].map(prod => ({
    prod,
    total: sales.filter(s => s.productType === prod).reduce((s, x) => s + x.totalAmount, 0),
  })).filter(p => p.total > 0);

  const productPieData = {
    labels: productRevenue.map(p => p.prod),
    datasets: [{
      data: productRevenue.map(p => p.total),
      backgroundColor: [COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.teal],
    }],
  };

  // ─── Production Efficiency ───────────────────────────────────────────────────

  const efficiencyData = {
    labels: cupProd.slice(-30).map(s => s.date),
    datasets: [
      { label: 'Efficiency %', data: cupProd.slice(-30).map(s => s.efficiency), borderColor: COLORS.blue, backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.3, fill: true },
    ],
  };

  const machineStats = ['A', 'B', 'C'].map(m => ({
    machine: `Machine ${m}`,
    totalCups: cupProd.filter(s => s.machineId === m).reduce((s, x) => s + x.actualCupsProduced, 0),
    avgEfficiency: (() => {
      const sessions = cupProd.filter(s => s.machineId === m);
      return sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + x.efficiency, 0) / sessions.length) : 0;
    })(),
  }));

  // ─── Monthly Production Volume ────────────────────────────────────────────────

  const productionByMonth = allMonths.map(m => ({
    month: monthLabel(m),
    cups: cupProd.filter(s => getMonth(s.date) === m).reduce((s, x) => s + x.actualCupsProduced, 0),
    plates: plateProd.filter(s => getMonth(s.date) === m).reduce((s, x) => s + x.platesProduced, 0),
  }));

  const prodBarData = {
    labels: productionByMonth.map(r => r.month),
    datasets: [
      { label: 'Cups', data: productionByMonth.map(r => r.cups), backgroundColor: COLORS.blue, yAxisID: 'y' },
      { label: 'Plates', data: productionByMonth.map(r => r.plates), backgroundColor: COLORS.green, yAxisID: 'y' },
    ],
  };

  // ─── Worker Productivity ──────────────────────────────────────────────────────

  const prEntries = getPieceRateEntries();
  const workerIds = [...new Set(prEntries.map(e => e.workerId))];

  // ─── Hocker Analysis ─────────────────────────────────────────────────────────

  const hockerSales = sales.filter(s => s.channel === 'hocker');
  const hockerNames = [...new Set(hockerSales.map(s => s.buyerName))];
  const hockerStats = hockerNames.map(name => ({
    name,
    total: hockerSales.filter(s => s.buyerName === name).reduce((s, x) => s + x.totalAmount, 0),
    count: hockerSales.filter(s => s.buyerName === name).length,
  })).sort((a, b) => b.total - a.total);

  const totalHockerRevenue = hockerSales.reduce((s, x) => s + x.totalAmount, 0);
  const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
  const hockerDependency = totalRevenue > 0 ? ((totalHockerRevenue / totalRevenue) * 100).toFixed(1) : '0';

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const }, title: { display: false } },
    scales: { x: { stacked: false }, y: { beginAtZero: true } },
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <Tabs
        tabs={[
          { key: 'sales', label: 'Sales Reports' },
          { key: 'production', label: 'Production Reports' },
          { key: 'hocker', label: 'Hocker Report' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Revenue (All Time)" value={formatINR(totalRevenue)} color="green" />
            <StatCard label="Total Sales" value={formatNumber(sales.length)} />
            <StatCard label="Best Channel" value={
              (() => {
                const ch = ['hocker','wholesaler','retailer','friend'].reduce((best, ch) => {
                  const rev = sales.filter(s => s.channel === ch).reduce((s, x) => s + x.totalAmount, 0);
                  const bestRev = sales.filter(s => s.channel === best).reduce((s, x) => s + x.totalAmount, 0);
                  return rev > bestRev ? ch : best;
                }, 'hocker');
                return ch.charAt(0).toUpperCase() + ch.slice(1);
              })()
            } />
            <StatCard label="Hocker Dependency" value={`${hockerDependency}%`} color="amber" subtext="% of total revenue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionHeader title="Monthly Sales by Channel" />
              <Bar data={salesBarData} options={chartOptions} />
            </Card>
            <Card>
              <SectionHeader title="All-Time Sales by Product" />
              {productRevenue.length > 0 ? (
                <Pie data={productPieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
              ) : (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No sales data</div>
              )}
            </Card>
          </div>

          <Card>
            <SectionHeader title="Best Selling Months" subtitle="Monthly revenue — latest first" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--surface2)' }}>
                  <tr>
                    {['Month', 'Total Revenue', 'Hocker', 'Wholesaler', 'Retailer', 'Friend'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channelRevByMonth.map((row, i) => {
                    const total = row.hocker + row.wholesaler + row.retailer + row.friend;
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2 font-medium">{row.month}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--green)' }}>{formatINR(total)}</td>
                        <td className="px-3 py-2">{formatINR(row.hocker)}</td>
                        <td className="px-3 py-2">{formatINR(row.wholesaler)}</td>
                        <td className="px-3 py-2">{formatINR(row.retailer)}</td>
                        <td className="px-3 py-2">{formatINR(row.friend)}</td>
                      </tr>
                    );
                  }).reverse()}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {machineStats.map(m => (
              <StatCard key={m.machine} label={m.machine} value={formatNumber(m.totalCups)} subtext={`Avg efficiency: ${m.avgEfficiency}%`} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <SectionHeader title="Monthly Production Volume" />
              <Bar data={prodBarData} options={chartOptions} />
            </Card>
            <Card>
              <SectionHeader title="Machine Efficiency (Last 30 Sessions)" />
              <Line data={efficiencyData} options={{ ...chartOptions, scales: { x: { display: false }, y: { beginAtZero: true, max: 110 } } }} />
            </Card>
          </div>

          <Card>
            <SectionHeader title="Machine Summary" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--surface2)' }}>
                  <tr>
                    {['Machine', 'Sessions', 'Total Cups', 'Avg Efficiency', 'Best Session'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['A', 'B', 'C'].map(m => {
                    const sessions = cupProd.filter(s => s.machineId === m);
                    const best = sessions.reduce((b, s) => s.efficiency > b ? s.efficiency : b, 0);
                    return (
                      <tr key={m} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2 font-semibold">Machine {m}</td>
                        <td className="px-3 py-2">{sessions.length}</td>
                        <td className="px-3 py-2 font-bold">{formatNumber(sessions.reduce((s, x) => s + x.actualCupsProduced, 0))}</td>
                        <td className="px-3 py-2">{machineStats.find(x => x.machine === `Machine ${m}`)?.avgEfficiency ?? 0}%</td>
                        <td className="px-3 py-2" style={{ color: 'var(--green)' }}>{best}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'hocker' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Hocker Revenue" value={formatINR(totalHockerRevenue)} color="blue" />
            <StatCard label="Hocker Dependency" value={`${hockerDependency}%`} color={parseFloat(hockerDependency) > 70 ? 'amber' : 'green'} subtext="% of total revenue" />
            <StatCard label="Unique Hockers" value={hockerNames.length} />
          </div>

          <Card>
            <SectionHeader title="Hocker Report" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--surface2)' }}>
                  <tr>
                    {['Hocker Name', 'Total Purchases', 'Total Revenue', '% Share', 'Pending'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hockerStats.map((h, i) => {
                    const pending = hockerSales.filter(s => s.buyerName === h.name).reduce((s, x) => s + x.pendingAmount, 0);
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2 font-semibold">{h.name}</td>
                        <td className="px-3 py-2">{h.count}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--green)' }}>{formatINR(h.total)}</td>
                        <td className="px-3 py-2">{totalHockerRevenue > 0 ? `${((h.total / totalHockerRevenue) * 100).toFixed(1)}%` : '0%'}</td>
                        <td className="px-3 py-2" style={{ color: pending > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{formatINR(pending)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {parseFloat(hockerDependency) > 70 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>High hocker dependency ({hockerDependency}%)</strong> — Over 70% of your revenue comes from hockers.
              Consider diversifying to wholesalers and retailers to reduce concentration risk.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
