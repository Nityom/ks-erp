'use client';
import { useState, useEffect } from 'react';
import {
  getSales,
  getRMPurchases, getSalaryPayments, getPieceRateEntries,
  getHeaters, getComponents, getPlateMaintenance,
  getPackagingSessions, getCupProduction,
  getElectricityBills, getMiscExpenses,
} from '@/lib/storage';
import type { SaleEntry } from '@/lib/types';
import { Card, SectionHeader, Table, StatCard, Tabs } from '@/components/UI';
import { formatINR, formatNumber, monthLabel, currentMonth } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

type PeriodType = 'monthly' | 'quarterly' | 'yearly' | 'alltime';

export default function CashflowPage() {
  const { settings } = useApp();
  const [tab, setTab] = useState('profit');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([currentMonth()]);

  useEffect(() => {
    const s = getSales();
    setSales(s);
    const months = new Set<string>();
    s.forEach(x => {
      const [, mm, yyyy] = x.date.split('/');
      months.add(`${yyyy}-${mm}`);
    });
    months.add(currentMonth());
    setAllMonths([...months].sort().reverse());
  }, []);

  const allYears = [...new Set(allMonths.map(m => m.split('-')[0]))].sort().reverse();
  const allQuarters = [...new Set(allMonths.map(m => {
    const [yyyy, mm] = m.split('-');
    return `${yyyy}-Q${Math.ceil(parseInt(mm) / 3)}`;
  }))].sort().reverse();

  // ── Period helpers ──────────────────────────────────────────────────────────
  const isMonthStrInPeriod = (monthStr: string): boolean => {
    if (periodType === 'monthly') return monthStr === selectedMonth;
    if (periodType === 'yearly') return monthStr.startsWith(selectedYear + '-');
    if (periodType === 'alltime') return true;
    const [qYear, qPart] = selectedQuarter.split('-');
    const qNum = parseInt(qPart.replace('Q', ''));
    const [mYear, mMM] = monthStr.split('-');
    const startMonth = (qNum - 1) * 3 + 1;
    const endMonth = qNum * 3;
    return mYear === qYear && parseInt(mMM) >= startMonth && parseInt(mMM) <= endMonth;
  };

  const isInPeriod = (date: string): boolean => {
    const [, mm, yyyy] = date.split('/');
    return isMonthStrInPeriod(`${yyyy}-${mm}`);
  };

  const getPeriodLabel = (): string => {
    if (periodType === 'monthly') return monthLabel(selectedMonth);
    if (periodType === 'quarterly') {
      const [yr, q] = selectedQuarter.split('-');
      const qNum = parseInt(q.replace('Q', ''));
      const ranges = ['', 'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
      return `${q} ${yr} (${ranges[qNum]})`;
    }
    if (periodType === 'yearly') return `Year ${selectedYear}`;
    return 'All Time';
  };

  const getSubPeriods = (): { key: string; label: string }[] => {
    if (periodType === 'monthly') return [];
    if (periodType === 'quarterly') {
      const [yr, q] = selectedQuarter.split('-');
      const qNum = parseInt(q.replace('Q', ''));
      const startMM = (qNum - 1) * 3 + 1;
      return [startMM, startMM + 1, startMM + 2].map(m => {
        const mm = String(m).padStart(2, '0');
        return { key: `${yr}-${mm}`, label: monthLabel(`${yr}-${mm}`) };
      });
    }
    if (periodType === 'yearly') {
      return allMonths.filter(m => m.startsWith(selectedYear + '-')).sort().map(m => ({ key: m, label: monthLabel(m) }));
    }
    return allYears.map(y => ({ key: y, label: `Year ${y}` }));
  };

  // ── Revenue ─────────────────────────────────────────────────────────────────
  const periodSales = sales.filter(s => isInPeriod(s.date));
  const grossRevenue = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const cashReceived = periodSales.reduce((sum, s) => sum + s.amountReceived, 0);
  const pendingReceivable = periodSales.reduce((sum, s) => sum + s.pendingAmount, 0);

  // ── Expenses ─────────────────────────────────────────────────────────────────
  const calcExpense = (filterFn: (date: string) => boolean, mFilterFn: (m: string) => boolean) => {
    let total = 0;
    total += getRMPurchases().filter(p => filterFn(p.date)).reduce((s, p) => s + p.quantityReceived * p.pricePerUnit + (p.inboundFreight ?? 0), 0);
    total += getSales().filter(x => filterFn(x.date)).reduce((s, x) => s + (x.outboundFreight ?? 0), 0);
    total += getSalaryPayments().filter(p => mFilterFn(p.month)).reduce((s, p) => s + p.netAmount, 0);
    total += getPieceRateEntries().filter(e => filterFn(e.date)).reduce((s, e) => s + e.earningsAmount, 0);
    total += getHeaters().reduce((s, h) => s + h.history.filter(e => filterFn(e.date)).reduce((a, e) => a + e.cost, 0), 0);
    total += getComponents().reduce((s, c) => s + c.history.filter(e => filterFn(e.date)).reduce((a, e) => a + e.cost, 0), 0);
    total += getPlateMaintenance().filter(p => filterFn(p.date)).reduce((s, p) => s + p.cost, 0);
    const pkg = getPackagingSessions().filter(p => filterFn(p.date));
    total += pkg.reduce((s, p) => s
      + (p.ptRollUsed ?? 0) * settings.ptRollRate
      + (p.tapeRollsUsed ?? 0) * settings.transparentTapeRate
      + (p.plasticRopeUsed ?? 0) * settings.plasticRopeRate
      + (p.cartonsUsed ?? 0) * settings.cartonBoxRate
      + (p.borasUsed ?? 0) * settings.boraBagRate, 0);
    const cups = getCupProduction().filter(x => filterFn(x.date));
    total += cups.reduce((s, c) => s + c.paraffinOilUsed * settings.paraffinOilRatePerLitre + c.mobilOilUsed * settings.mobilOilRatePerLitre, 0);
    total += getElectricityBills().filter(b => mFilterFn(b.billingPeriod)).reduce((s, b) => s + b.amount, 0);
    total += getMiscExpenses().filter(m => filterFn(m.date)).reduce((s, m) => s + m.amount, 0);
    return total;
  };

  const totalExpense = calcExpense(isInPeriod, isMonthStrInPeriod);
  const grossProfit = grossRevenue - totalExpense;
  const gstSaved = grossRevenue * 0.18;
  const netProfitWithGST = grossProfit + gstSaved;

  // ── Channel & product breakdown ──────────────────────────────────────────────
  const channelBreakdown = ['hocker', 'wholesaler', 'retailer', 'friend'].map(ch => {
    const chSales = periodSales.filter(s => s.channel === ch);
    const revenue = chSales.reduce((s, x) => s + x.totalAmount, 0);
    const freight = chSales.reduce((s, x) => s + (x.outboundFreight ?? 0), 0);
    const rmCost = chSales.reduce((s, x) => s + (x.rmCostTotal ?? 0), 0);
    return { channel: ch, revenue, freight, profit: revenue - freight - rmCost, count: chSales.length };
  });

  const productBreakdown = ['50ml', '60ml', '210ml', '250ml', 'plate'].map(prod => {
    const pSales = periodSales.filter(s => s.productType === prod);
    return { product: prod, revenue: pSales.reduce((s, x) => s + x.totalAmount, 0), qty: pSales.reduce((s, x) => s + x.quantity, 0) };
  });

  // ── Sub-period breakdown ─────────────────────────────────────────────────────
  const subPeriods = getSubPeriods();
  const subPeriodRows = subPeriods.map(({ key, label }) => {
    let rev = 0, cashIn = 0, exp = 0;
    if (periodType === 'alltime') {
      const byYear = (date: string) => { const [, , yyyy] = date.split('/'); return yyyy === key; };
      rev = sales.filter(s => byYear(s.date)).reduce((s, x) => s + x.totalAmount, 0);
      cashIn = sales.filter(s => byYear(s.date)).reduce((s, x) => s + x.amountReceived, 0);
      exp = calcExpense(byYear, (m) => m.startsWith(key + '-'));
    } else {
      const byMonth = (date: string) => { const [, mm, yyyy] = date.split('/'); return `${yyyy}-${mm}` === key; };
      rev = sales.filter(s => byMonth(s.date)).reduce((s, x) => s + x.totalAmount, 0);
      cashIn = sales.filter(s => byMonth(s.date)).reduce((s, x) => s + x.amountReceived, 0);
      exp = calcExpense(byMonth, (m) => m === key);
    }
    return { label, revenue: rev, cashIn, expense: exp, profit: rev - exp };
  });

  // ── Last 12 months trend ─────────────────────────────────────────────────────
  const last12 = allMonths.slice(0, 12).reverse();
  const trend = last12.map(month => {
    const mSales = sales.filter(s => { const [, mm, yyyy] = s.date.split('/'); return `${yyyy}-${mm}` === month; });
    return { month: monthLabel(month), revenue: mSales.reduce((s, x) => s + x.totalAmount, 0), cashIn: mSales.reduce((s, x) => s + x.amountReceived, 0) };
  });

  const periodLabel = getPeriodLabel();

  const periodBtn = (pt: PeriodType, label: string) => (
    <button key={pt} onClick={() => setPeriodType(pt)}
      className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
      style={{
        background: periodType === pt ? 'var(--accent)' : 'var(--surface)',
        color: periodType === pt ? '#fff' : 'var(--text)',
        borderColor: periodType === pt ? 'var(--accent)' : 'var(--border)',
      }}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4 max-w-5xl">
      <Tabs
        tabs={[
          { key: 'profit', label: 'Profit & Loss' },
          { key: 'channel', label: 'Sales by Channel' },
          { key: 'cashflow', label: 'Cash Flow' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Period:</span>
        {periodBtn('monthly', 'Monthly')}
        {periodBtn('quarterly', 'Quarterly')}
        {periodBtn('yearly', 'Yearly')}
        {periodBtn('alltime', 'All Time')}

        {periodType === 'monthly' && (
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
            {allMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        )}
        {periodType === 'quarterly' && (
          <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
            {allQuarters.map(q => {
              const [yr, qp] = q.split('-');
              const qNum = parseInt(qp.replace('Q', ''));
              const ranges = ['', 'Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
              return <option key={q} value={q}>{qp} {yr} ({ranges[qNum]})</option>;
            })}
          </select>
        )}
        {periodType === 'yearly' && (
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {periodType === 'alltime' && (
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>All records combined</span>
        )}
      </div>

      {tab === 'profit' && (
        <div className="space-y-4">
          {grossProfit < 0 && (
            <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid var(--red)' }}>
              ⚠️ In <strong>{periodLabel}</strong>, your expenses were <strong>{formatINR(Math.abs(grossProfit))}</strong> more than your revenue — this is a <strong>loss</strong>. Check if any big purchases or salaries were paid in this period.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={formatINR(grossRevenue)} color="green" subtext={periodLabel} />
            <StatCard label="Total Expenses" value={formatINR(totalExpense)} color="red" subtext={periodLabel} />
            <StatCard
              label={grossProfit >= 0 ? 'Gross Profit' : 'Gross Loss'}
              value={formatINR(Math.abs(grossProfit))}
              color={grossProfit >= 0 ? 'green' : 'red'}
              subtext={grossProfit < 0 ? 'Expenses exceeded revenue' : periodLabel}
            />
            <StatCard label="GST Saved (18%)" value={formatINR(gstSaved)} color="blue" subtext="Not charged on sales" />
          </div>

          <Card>
            <SectionHeader title={`Profit & Loss — ${periodLabel}`} />
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-medium">Total Revenue</span>
                <span className="font-bold text-lg" style={{ color: 'var(--green)' }}>{formatINR(grossRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-medium">Less: Total Costs</span>
                <span className="font-bold text-lg" style={{ color: 'var(--red)' }}>({formatINR(totalExpense)})</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 font-bold text-base" style={{ borderColor: 'var(--border)' }}>
                <span>
                  {grossProfit >= 0 ? 'Gross Profit' : 'Gross Loss'}
                  {grossProfit < 0 && <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}>LOSS</span>}
                </span>
                <span style={{ color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {grossProfit < 0 ? `(${formatINR(Math.abs(grossProfit))})` : formatINR(grossProfit)}
                </span>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--surface2)' }}>
                <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>GST SAVINGS (Internal Only)</div>
                <div className="flex justify-between text-sm">
                  <span>{grossProfit >= 0 ? 'Profit (without GST savings)' : 'Loss (without GST savings)'}</span>
                  <span style={{ color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {grossProfit < 0 ? `(${formatINR(Math.abs(grossProfit))})` : formatINR(grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>+ GST Saved on Sales @18%</span>
                  <span style={{ color: 'var(--blue)' }}>+{formatINR(gstSaved)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span>{netProfitWithGST >= 0 ? 'True Profit (with GST savings)' : 'True Loss (after GST savings)'}</span>
                  <span style={{ color: netProfitWithGST >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {netProfitWithGST < 0 ? `(${formatINR(Math.abs(netProfitWithGST))})` : formatINR(netProfitWithGST)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Sub-period breakdown (quarterly / yearly / alltime) */}
          {subPeriodRows.length > 0 && (
            <Card>
              <SectionHeader title={
                periodType === 'alltime' ? 'Year-wise Breakdown (All Time)' :
                periodType === 'yearly' ? `Month-wise Breakdown — ${selectedYear}` :
                `Month-wise Breakdown — ${selectedQuarter.replace('-', ' ')}`
              } />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--surface2)' }}>
                    <tr>
                      {['Period', 'Revenue', 'Expenses', 'Profit / Loss', 'Cash In'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subPeriodRows.map((row, i) => {
                      const isLoss = row.profit < 0;
                      return (
                        <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-3 py-2 font-medium">{row.label}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--green)' }}>{formatINR(row.revenue)}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--red)' }}>{formatINR(row.expense)}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: isLoss ? 'var(--red)' : 'var(--green)' }}>
                            {isLoss ? `(${formatINR(Math.abs(row.profit))})` : formatINR(row.profit)}
                            {isLoss && <span className="ml-1 text-xs font-normal">LOSS</span>}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--blue)' }}>{formatINR(row.cashIn)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2" style={{ color: 'var(--green)' }}>{formatINR(grossRevenue)}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--red)' }}>{formatINR(totalExpense)}</td>
                      <td className="px-3 py-2" style={{ color: grossProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {grossProfit < 0 ? `(${formatINR(Math.abs(grossProfit))})` : formatINR(grossProfit)}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--blue)' }}>{formatINR(cashReceived)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <SectionHeader title="Sales by Product" />
            <Table
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'qty', label: 'Qty Sold', render: (r: Record<string, unknown>) => formatNumber(r.qty as number) },
                { key: 'revenue', label: 'Revenue', render: (r: Record<string, unknown>) => formatINR(r.revenue as number) },
                { key: 'share', label: '% Share', render: (r: Record<string, unknown>) => grossRevenue > 0 ? `${(((r.revenue as number) / grossRevenue) * 100).toFixed(1)}%` : '0%' },
              ]}
              data={productBreakdown.filter(p => p.revenue > 0) as Record<string, unknown>[]}
            />
          </Card>
        </div>
      )}

      {tab === 'channel' && (
        <Card>
          <SectionHeader title={`Sales by Channel — ${periodLabel}`} />
          <Table
            exportFilename="channel-pl.csv"
            columns={[
              { key: 'channel', label: 'Sale Type', render: (r: Record<string, unknown>) => <span className="capitalize font-medium">{r.channel as string}</span> },
              { key: 'count', label: 'Sales', render: (r: Record<string, unknown>) => r.count as number },
              { key: 'revenue', label: 'Revenue', render: (r: Record<string, unknown>) => formatINR(r.revenue as number) },
              { key: 'freight', label: 'Transport Cost', render: (r: Record<string, unknown>) => <span style={{ color: 'var(--red)' }}>{formatINR(r.freight as number)}</span> },
              {
                key: 'profit', label: 'Net Profit',
                render: (r: Record<string, unknown>) => (
                  <span className="font-bold" style={{ color: (r.profit as number) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {(r.profit as number) < 0 ? `(${formatINR(Math.abs(r.profit as number))})` : formatINR(r.profit as number)}
                  </span>
                ),
              },
            ]}
            data={channelBreakdown.filter(c => c.revenue > 0) as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'cashflow' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cash In (Received)" value={formatINR(cashReceived)} color="green" subtext={periodLabel} />
            <StatCard label="Pending Receivable" value={formatINR(pendingReceivable)} color="amber" subtext={periodLabel} />
            <StatCard label="Total Invoiced" value={formatINR(grossRevenue)} subtext={periodLabel} />
          </div>

          <Card>
            <SectionHeader title="Monthly Sales Trend (Last 12 Months)" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ background: 'var(--surface2)' }}>
                  <tr>
                    {['Month', 'Revenue', 'Cash In', 'Collection %'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2 font-medium">{row.month}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--green)' }}>{formatINR(row.revenue)}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--blue)' }}>{formatINR(row.cashIn)}</td>
                      <td className="px-3 py-2">{row.revenue > 0 ? `${((row.cashIn / row.revenue) * 100).toFixed(0)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Unpaid Amounts by Channel" />
            <Table
              columns={[
                { key: 'channel', label: 'Sale Type', render: (r: Record<string, unknown>) => <span className="capitalize">{r.channel as string}</span> },
                { key: 'pending', label: 'Unpaid Amount', render: (r: Record<string, unknown>) => <span style={{ color: 'var(--red)' }}>{formatINR(r.pending as number)}</span> },
                { key: 'count', label: 'Unpaid Bills' },
              ]}
              data={['hocker', 'wholesaler', 'retailer', 'friend'].map(ch => ({
                channel: ch,
                pending: sales.filter(s => s.channel === ch).reduce((sum, s) => sum + s.pendingAmount, 0),
                count: sales.filter(s => s.channel === ch && s.pendingAmount > 0).length,
              })).filter(r => r.pending > 0) as Record<string, unknown>[]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
