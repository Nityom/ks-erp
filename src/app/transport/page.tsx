'use client';
import { useState, useEffect } from 'react';
import { getSales, getPayments } from '@/lib/storage';
import type { SaleEntry, PaymentEntry } from '@/lib/types';
import { Card, SectionHeader, Table, StatCard } from '@/components/UI';
import { formatINR, formatNumber } from '@/lib/utils';

export default function TransportPage() {
  const [sales, setSales] = useState<SaleEntry[]>([]);

  useEffect(() => {
    setSales(getSales());
  }, []);

  // Aggregate outbound transport per channel
  const channelFreight = ['hocker', 'wholesaler', 'retailer', 'friend'].map(ch => {
    const chSales = sales.filter(s => s.channel === ch);
    const total = chSales.reduce((sum, s) => sum + (s.outboundFreight || 0), 0);
    const revenue = chSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const pct = revenue > 0 ? ((total / revenue) * 100).toFixed(1) : '0';
    return { channel: ch, freight: total, revenue, pct };
  });

  const totalOutbound = channelFreight.reduce((s, c) => s + c.freight, 0);
  const totalRevenue = channelFreight.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Outbound Freight" value={formatINR(totalOutbound)} color="red" />
        <StatCard label="Freight as % of Revenue" value={totalRevenue > 0 ? `${((totalOutbound / totalRevenue) * 100).toFixed(1)}%` : '0%'} />
      </div>

      <Card>
        <SectionHeader title="Outbound Transport by Channel" subtitle="Freight paid per sales channel" />
        <Table
          columns={[
            { key: 'channel', label: 'Channel', render: (r: Record<string, unknown>) => <span className="capitalize font-medium">{r.channel as string}</span> },
            { key: 'freight', label: 'Total Freight', render: (r: Record<string, unknown>) => formatINR(r.freight as number) },
            { key: 'revenue', label: 'Total Revenue', render: (r: Record<string, unknown>) => formatINR(r.revenue as number) },
            { key: 'pct', label: 'Freight as % Revenue', render: (r: Record<string, unknown>) => `${r.pct}%` },
          ]}
          data={channelFreight as Record<string, unknown>[]}
          exportFilename="transport-summary.csv"
        />
      </Card>

      <Card>
        <SectionHeader title="Per-Dispatch Freight Log" subtitle="Outbound freight recorded per sale" />
        <Table
          searchable
          exportFilename="outbound-transport.csv"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'billNumber', label: 'Bill #' },
            { key: 'channel', label: 'Channel', render: (r: Record<string, unknown>) => <span className="capitalize">{r.channel as string}</span> },
            { key: 'buyerName', label: 'Buyer' },
            { key: 'productType', label: 'Product' },
            { key: 'quantity', label: 'Qty', render: (r: Record<string, unknown>) => formatNumber(r.quantity as number) },
            { key: 'outboundFreight', label: 'Freight', render: (r: Record<string, unknown>) => formatINR(r.outboundFreight as number) },
            {
              key: 'freightPerUnit', label: 'Per Unit',
              render: (r: Record<string, unknown>) => {
                const qty = r.quantity as number;
                const freight = r.outboundFreight as number;
                return qty > 0 ? formatINR(freight / qty) : '—';
              },
            },
          ]}
          data={sales.filter(s => s.outboundFreight > 0) as unknown as Record<string, unknown>[]}
        />
      </Card>
    </div>
  );
}
