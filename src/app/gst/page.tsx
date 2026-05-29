'use client';
import { useState, useEffect } from 'react';
import { getRMPurchases, getSales } from '@/lib/storage';
import type { RawMaterialPurchase, SaleEntry } from '@/lib/types';
import { Card, SectionHeader, Table, StatCard, Badge } from '@/components/UI';
import { formatINR, monthLabel, currentMonth } from '@/lib/utils';

function groupByMonth<T extends { date: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const [dd, mm, yyyy] = item.date.split('/');
    const key = `${yyyy}-${mm}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function GSTPage() {
  const [purchases, setPurchases] = useState<RawMaterialPurchase[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  useEffect(() => {
    setPurchases(getRMPurchases());
    setSales(getSales());
  }, []);

  const purchasesByMonth = groupByMonth(purchases);
  const salesByMonth = groupByMonth(sales);
  const allMonths = [...new Set([...Object.keys(purchasesByMonth), ...Object.keys(salesByMonth)])].sort().reverse();

  const monthData = allMonths.map(month => {
    const mPurchases = purchasesByMonth[month] ?? [];
    const mSales = salesByMonth[month] ?? [];
    const gstPaid = mPurchases.filter(p => p.withGst).reduce((sum, p) => sum + (p.gstAmount ?? 0), 0);
    const salesTotal = mSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const theoreticalGSTOnSales = salesTotal * 0.18;
    const netBenefit = theoreticalGSTOnSales - gstPaid;
    return { month, gstPaid, salesTotal, theoreticalGSTOnSales, netBenefit };
  });

  const ytd = monthData.reduce((acc, m) => ({
    gstPaid: acc.gstPaid + m.gstPaid,
    theoreticalGSTOnSales: acc.theoreticalGSTOnSales + m.theoreticalGSTOnSales,
    netBenefit: acc.netBenefit + m.netBenefit,
  }), { gstPaid: 0, theoreticalGSTOnSales: 0, netBenefit: 0 });

  // Current month detail
  const mPurchases = purchasesByMonth[selectedMonth] ?? [];
  const gstPurchases = mPurchases.filter(p => p.withGst);
  const informalPurchases = mPurchases.filter(p => !p.withGst);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* YTD Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="GST Paid on Purchases (YTD)" value={formatINR(ytd.gstPaid)} color="red" subtext="Actual cash outflow" />
        <StatCard label="Theoretical GST on Sales (YTD)" value={formatINR(ytd.theoreticalGSTOnSales)} color="blue" subtext="If GST was charged on sales" />
        <StatCard
          label="Net GST Position (YTD)"
          value={formatINR(Math.abs(ytd.netBenefit))}
          color={ytd.netBenefit >= 0 ? 'green' : 'red'}
          subtext={ytd.netBenefit >= 0
            ? 'You save this much by not charging GST on sales'
            : 'You pay more GST on purchases than you\'d charge on sales — GST registration may help'
          }
        />
      </div>

      {/* Monthly Summary Table */}
      <Card>
        <SectionHeader title="GST Month-wise Summary" />
        <Table
          exportFilename="gst-monthly.csv"
          columns={[
            { key: 'month', label: 'Month', render: (r: Record<string, unknown>) => monthLabel(r.month as string) },
            { key: 'gstPaid', label: 'GST Paid on Purchases', render: (r: Record<string, unknown>) => formatINR(r.gstPaid as number) },
            { key: 'salesTotal', label: 'Sales Total', render: (r: Record<string, unknown>) => formatINR(r.salesTotal as number) },
            {
              key: 'theoreticalGSTOnSales', label: 'Expected GST on Sales',
              render: (r: Record<string, unknown>) => (
                <span style={{ color: 'var(--blue)' }}>{formatINR(r.theoreticalGSTOnSales as number)}</span>
              ),
            },
            {
              key: 'netBenefit', label: 'GST Saved',
              render: (r: Record<string, unknown>) => {
                const val = r.netBenefit as number;
                return (
                  <span className="font-bold" style={{ color: val >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {val >= 0 ? '' : '−'}{formatINR(Math.abs(val))}
                  </span>
                );
              },
            },
          ]}
          data={monthData as Record<string, unknown>[]}
        />
      </Card>

      {/* Month Detail */}
      <Card>
        <SectionHeader
          title="Monthly Purchase GST Detail"
          action={
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {allMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          }
        />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Purchases With GST Bill</div>
            <div className="font-bold">{gstPurchases.length} purchases</div>
            <div className="text-sm" style={{ color: 'var(--red)' }}>GST Paid: {formatINR(gstPurchases.reduce((s, p) => s + (p.gstAmount ?? 0), 0))}</div>
          </div>
          <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Purchases Without Bill</div>
            <div className="font-bold">{informalPurchases.length} purchases</div>
            <div className="text-sm" style={{ color: 'var(--amber)' }}>
              Undeclared Stock: {formatINR(informalPurchases.reduce((s, p) => s + (p.quantityReceived - p.billedQuantity) * p.pricePerUnit, 0))}
            </div>
          </div>
        </div>
        <Table
          searchable
          exportFilename={`gst-detail-${selectedMonth}.csv`}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'supplierName', label: 'Supplier' },
            { key: 'materialType', label: 'Material' },
            { key: 'quantityReceived', label: 'Qty Received' },
            { key: 'billedQuantity', label: 'Billed Qty' },
            {
              key: 'withGst', label: 'Type',
              render: (r: Record<string, unknown>) => r.withGst
                ? <Badge variant="blue">With GST Bill</Badge>
                : <Badge variant="amber">Informal</Badge>,
            },
            { key: 'hsnCode', label: 'HSN', render: (r: Record<string, unknown>) => r.hsnCode as string || '—' },
            {
              key: 'gstAmount', label: 'GST Amount',
              render: (r: Record<string, unknown>) => r.withGst ? formatINR(r.gstAmount as number ?? 0) : '—',
            },
          ]}
          data={mPurchases as unknown as Record<string, unknown>[]}
        />
      </Card>

      {/* Stock Reconciliation */}
      <Card>
        <SectionHeader title="Stock Check (Internal Only)" subtitle="Actual vs billed — Internal Record Only" />
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 mb-3">
          ⚠️ Internal record only. Undeclared stock = actual quantity received minus billed quantity.
          This section is for internal tracking and should not be shared externally.
        </div>
        <Table
          exportFilename="stock-reconciliation.csv"
          columns={[
            { key: 'month', label: 'Month', render: (r: Record<string, unknown>) => monthLabel(r.month as string) },
            { key: 'actualPurchases', label: 'Actual Qty Purchased' },
            { key: 'billedPurchases', label: 'Billed Qty' },
            {
              key: 'undeclared', label: 'Extra Stock (Internal)',
              render: (r: Record<string, unknown>) => (
                <span style={{ color: 'var(--amber)' }}>{r.undeclared as number}</span>
              ),
            },
          ]}
          data={allMonths.map(month => {
            const mP = purchasesByMonth[month] ?? [];
            const actual = mP.reduce((s, p) => s + p.quantityReceived, 0);
            const billed = mP.reduce((s, p) => s + p.billedQuantity, 0);
            return { month, actualPurchases: actual.toFixed(2), billedPurchases: billed.toFixed(2), undeclared: (actual - billed).toFixed(2) };
          }) as Record<string, unknown>[]}
        />
      </Card>
    </div>
  );
}
