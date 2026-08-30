'use client';
import { useState, useEffect, useRef } from 'react';
import { getSales, saveSales, getPayments, savePayments, getBuyers } from '@/lib/storage';
import type { SaleEntry, PaymentEntry, Channel, ProductType, QuantityUnit, FriendMode, Settings, Buyer } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Tabs, Badge, Alert, ConfirmDialog, StatCard,
} from '@/components/UI';
import {
  formatINR, formatNumber, generateId, generateBillNumber,
  todayDDMMYYYY, fromInputDate, toInputDate, currentMonth,
} from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { getAllProductPrices } from '@/lib/pricing';
import { Plus, Printer, AlertCircle } from 'lucide-react';

// Maps each product to its default sale rate key in Settings
const PRODUCT_RATE_KEYS: Record<string, keyof Settings> = {
  '50ml': 'defaultSaleRate50ml',
  '60ml': 'defaultSaleRate60ml',
  '210ml': 'defaultSaleRate210ml',
  '250ml': 'defaultSaleRate250ml',
  'plate': 'defaultSaleRatePlate',
};

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'hocker', label: 'Hocker' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'friend', label: 'Friend (Out-of-State)' },
];

const PRODUCTS: { value: ProductType; label: string }[] = [
  { value: '50ml', label: 'Cup 50 ml' },
  { value: '60ml', label: 'Cup 60 ml' },
  { value: '210ml', label: 'Cup 210 ml' },
  { value: '250ml', label: 'Cup 250 ml' },
  { value: 'plate', label: 'Buffet Plate 13"' },
];

const UNITS: { value: QuantityUnit; label: string }[] = [
  { value: 'cartons', label: 'Cartons' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'boras', label: 'Boras' },
  { value: 'loose', label: 'Loose Units' },
];

const EMPTY_SALE: Omit<SaleEntry, 'id' | 'billNumber' | 'totalAmount' | 'pendingAmount'> = {
  date: todayDDMMYYYY(),
  channel: 'hocker',
  buyerName: '',
  productType: '50ml',
  quantityUnit: 'cartons',
  quantity: 0,
  ratePerUnit: 0,
  amountReceived: 0,
  outboundFreight: 0,
  friendMode: 'zero',
};

const EMPTY_PAYMENT: Omit<PaymentEntry, 'id'> = {
  saleId: '',
  buyerName: '',
  channel: 'hocker',
  date: todayDDMMYYYY(),
  amountPaid: 0,
};

function channelVariant(ch: Channel): 'blue' | 'green' | 'amber' | 'gray' {
  return ch === 'hocker' ? 'blue' : ch === 'wholesaler' ? 'green' : ch === 'retailer' ? 'amber' : 'gray';
}

export default function SalesPage() {
  const { settings, updateSettings } = useApp();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [tab, setTab] = useState('sales');
  const [modal, setModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [billModal, setBillModal] = useState<SaleEntry | null>(null);
  const [form, setForm] = useState(EMPTY_SALE);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSales(getSales());
    setPayments(getPayments());
    setBuyers(getBuyers());
  }, []);

  const prices = getAllProductPrices(settings);
  const totalAmount = form.ratePerUnit * form.quantity;
  const pendingAmount = totalAmount - form.amountReceived;
  const isPlateBorasSale = form.productType === 'plate' && form.quantityUnit === 'boras';
  const totalPlatesInSale = isPlateBorasSale && (form.platesPerBora ?? 0) > 0
    ? form.quantity * (form.platesPerBora ?? 0)
    : null;

  // Returns the saved default rate for a product (or 0 if none saved yet)
  const getDefaultRate = (product: string) =>
    (settings[PRODUCT_RATE_KEYS[product]] as number) || 0;

  // Open the new-sale modal with the current default rate pre-filled
  const openNewSale = () => {
    setForm({ ...EMPTY_SALE, ratePerUnit: getDefaultRate('50ml'), platesPerBora: settings.platesPerBora });
    setEditId(null);
    setModal(true);
  };

  const handleAddSale = () => {
    const entry: SaleEntry = {
      ...form,
      id: editId ?? generateId(),
      billNumber: editId ? sales.find(s => s.id === editId)!.billNumber : generateBillNumber(),
      totalAmount,
      pendingAmount,
    };
    let updated: SaleEntry[];
    if (editId) {
      updated = sales.map(s => s.id === editId ? entry : s);
      setEditId(null);
    } else {
      updated = [entry, ...sales];
    }
    saveSales(updated);
    setSales(updated);
    // Auto-save the rate back to settings so next sale defaults to this price
    if (form.ratePerUnit > 0) {
      updateSettings({ [PRODUCT_RATE_KEYS[form.productType]]: form.ratePerUnit });
    }
    setModal(false);
    setForm(EMPTY_SALE);
  };

  const handleAddPayment = () => {
    const entry: PaymentEntry = { ...payForm, id: generateId() };
    const updatedPay = [entry, ...payments];
    savePayments(updatedPay);
    setPayments(updatedPay);

    // Reduce pending amount on the sale
    const updatedSales = sales.map(s => {
      if (s.id !== payForm.saleId) return s;
      const newPending = Math.max(0, s.pendingAmount - payForm.amountPaid);
      const newReceived = s.amountReceived + payForm.amountPaid;
      return { ...s, pendingAmount: newPending, amountReceived: newReceived };
    });
    saveSales(updatedSales);
    setSales(updatedSales);
    setPaymentModal(false);
    setPayForm(EMPTY_PAYMENT);
  };

  const handleDelete = (id: string) => {
    const updated = sales.filter(s => s.id !== id);
    saveSales(updated);
    setSales(updated);
    setDeleteId(null);
  };

  const openPayment = (sale: SaleEntry) => {
    setPayForm({
      saleId: sale.id,
      buyerName: sale.buyerName,
      channel: sale.channel,
      date: todayDDMMYYYY(),
      amountPaid: sale.pendingAmount,
    });
    setPaymentModal(true);
  };

  // Stats
  const month = currentMonth();
  const monthSales = sales.filter(s => {
    const [dd, mm, yyyy] = s.date.split('/');
    return `${yyyy}-${mm}` === month;
  });
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPending = sales.reduce((sum, s) => sum + s.pendingAmount, 0);
  const todayRevenue = sales.filter(s => s.date === todayDDMMYYYY()).reduce((sum, s) => sum + s.totalAmount, 0);

  // Aging
  const today = new Date();
  const agingBuckets = { '0-7': 0, '8-30': 0, '30+': 0 };
  sales.filter(s => s.pendingAmount > 0).forEach(s => {
    const [dd, mm, yyyy] = s.date.split('/');
    const saleDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    const days = Math.ceil((today.getTime() - saleDate.getTime()) / 86400000);
    if (days <= 7) agingBuckets['0-7'] += s.pendingAmount;
    else if (days <= 30) agingBuckets['8-30'] += s.pendingAmount;
    else agingBuckets['30+'] += s.pendingAmount;
  });

  // Suggest price from pricing engine
  const suggestPrice = () => {
    const prod = form.productType as keyof typeof prices;
    const channelKey = form.channel === 'friend' && form.friendMode === 'zero' ? 'friend_zero' : form.channel === 'friend' ? 'friend_profit' : form.channel as 'hocker' | 'wholesaler' | 'retailer';
    const p = prices[prod]?.[channelKey];
    if (p) setForm(f => ({ ...f, ratePerUnit: parseFloat(p.priceWithoutGST.toFixed(2)) }));
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Revenue" value={formatINR(todayRevenue)} color="green" />
        <StatCard label="This Month Revenue" value={formatINR(monthRevenue)} color="blue" />
        <StatCard label="Total Pending" value={formatINR(totalPending)} color="red" />
        <StatCard label="Total Sales" value={formatNumber(sales.length)} />
      </div>

      {/* Aging */}
      {totalPending > 0 && (
        <Alert variant="amber">
          <div className="flex items-center gap-2 font-semibold mb-2"><AlertCircle size={14} /> Unpaid Bills — Overdue Summary</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {Object.entries(agingBuckets).map(([key, val]) => (
              <div key={key}>
                <div className="text-xs opacity-70">{key} days</div>
                <div className="font-bold">{formatINR(val)}</div>
              </div>
            ))}
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { key: 'sales', label: 'All Sales' },
            { key: 'pending', label: 'Unpaid Bills' },
            { key: 'hocker', label: 'Hocker Account' },
            { key: 'friend', label: 'Friend P&L' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Button onClick={openNewSale}>
          <Plus size={14} /> Add Sale
        </Button>
      </div>

      {tab === 'sales' && (
        <Card>
          <SectionHeader title="All Sales" />
          <Table
            searchable
            exportFilename="sales.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'billNumber', label: 'Bill #' },
              {
                key: 'channel', label: 'Channel',
                render: (r: Record<string, unknown>) => <Badge variant={channelVariant(r.channel as Channel)}>{r.channel as string}</Badge>,
              },
              { key: 'buyerName', label: 'Buyer' },
              { key: 'productType', label: 'Product' },
              {
                key: 'quantity', label: 'Qty',
                render: (r: Record<string, unknown>) => {
                  const base = `${formatNumber(r.quantity as number)} ${r.quantityUnit}`;
                  if (r.productType === 'plate' && r.quantityUnit === 'boras' && (r.platesPerBora as number) > 0) {
                    return `${base} ×${r.platesPerBora}pl = ${formatNumber((r.quantity as number) * (r.platesPerBora as number))}`;
                  }
                  return base;
                },
              },
              { key: 'ratePerUnit', label: 'Rate', render: (r: Record<string, unknown>) => formatINR(r.ratePerUnit as number) },
              { key: 'totalAmount', label: 'Total', render: (r: Record<string, unknown>) => formatINR(r.totalAmount as number) },
              { key: 'amountReceived', label: 'Received', render: (r: Record<string, unknown>) => formatINR(r.amountReceived as number) },
              {
                key: 'pendingAmount', label: 'Pending',
                render: (r: Record<string, unknown>) => (
                  <span style={{ color: (r.pendingAmount as number) > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {formatINR(r.pendingAmount as number)}
                  </span>
                ),
              },
              {
                key: 'actions', label: '', sortable: false,
                render: (r: Record<string, unknown>) => {
                  const sale = sales.find(s => s.id === r.id)!;
                  return (
                    <div className="flex gap-2">
                      <button onClick={() => setBillModal(sale)} className="text-xs text-blue-600 hover:underline">Bill</button>
                      {(r.pendingAmount as number) > 0 && (
                        <button onClick={() => openPayment(sale)} className="text-xs text-green-600 hover:underline">Pay</button>
                      )}
                      <button onClick={() => { setForm({ ...sale, platesPerBora: sale.platesPerBora ?? settings.platesPerBora }); setEditId(sale.id); setModal(true); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => setDeleteId(r.id as string)} className="text-xs text-red-600 hover:underline">Del</button>
                    </div>
                  );
                },
              },
            ]}
            data={sales as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'pending' && (
        <Card>
          <SectionHeader title="Unpaid Bills" subtitle="All unpaid amounts" />
          <Table
            searchable
            exportFilename="pending-payments.csv"
            columns={[
              { key: 'date', label: 'Sale Date' },
              { key: 'billNumber', label: 'Bill #' },
              { key: 'channel', label: 'Channel', render: (r: Record<string, unknown>) => <Badge variant={channelVariant(r.channel as Channel)}>{r.channel as string}</Badge> },
              { key: 'buyerName', label: 'Buyer' },
              { key: 'totalAmount', label: 'Invoice', render: (r: Record<string, unknown>) => formatINR(r.totalAmount as number) },
              { key: 'amountReceived', label: 'Paid', render: (r: Record<string, unknown>) => formatINR(r.amountReceived as number) },
              {
                key: 'pendingAmount', label: 'Outstanding',
                render: (r: Record<string, unknown>) => <span className="font-bold" style={{ color: 'var(--red)' }}>{formatINR(r.pendingAmount as number)}</span>,
              },
              {
                key: 'daysOld', label: 'Days Old',
                render: (r: Record<string, unknown>) => {
                  const [dd, mm, yyyy] = (r.date as string).split('/');
                  const d = Math.ceil((today.getTime() - new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)).getTime()) / 86400000);
                  return <Badge variant={d > 30 ? 'red' : d > 7 ? 'amber' : 'green'}>{d}d</Badge>;
                },
              },
              {
                key: 'actions', label: '', sortable: false,
                render: (r: Record<string, unknown>) => {
                  const sale = sales.find(s => s.id === r.id)!;
                  return <button onClick={() => openPayment(sale)} className="text-xs text-green-600 hover:underline font-medium">Record Payment</button>;
                },
              },
            ]}
            data={sales.filter(s => s.pendingAmount > 0) as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'hocker' && (
        <Card>
          <SectionHeader title="Hocker Account" subtitle="Running balance per hocker buyer" />
          {(() => {
            const hockers = [...new Set(sales.filter(s => s.channel === 'hocker').map(s => s.buyerName))];
            return hockers.map(name => {
              const hSales = sales.filter(s => s.channel === 'hocker' && s.buyerName === name);
              const totalInvoiced = hSales.reduce((sum, s) => sum + s.totalAmount, 0);
              const totalPaid = hSales.reduce((sum, s) => sum + s.amountReceived, 0);
              const balance = hSales.reduce((sum, s) => sum + s.pendingAmount, 0);
              return (
                <div key={name} className="border rounded-lg p-3 mb-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{name}</div>
                    <Badge variant={balance > 0 ? 'red' : 'green'}>
                      Balance: {formatINR(balance)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    <div><div style={{ color: 'var(--text-muted)' }}>Invoiced</div><div className="font-semibold">{formatINR(totalInvoiced)}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Paid</div><div className="font-semibold" style={{ color: 'var(--green)' }}>{formatINR(totalPaid)}</div></div>
                    <div><div style={{ color: 'var(--text-muted)' }}>Purchases</div><div className="font-semibold">{hSales.length}</div></div>
                  </div>
                </div>
              );
            });
          })()}
          {sales.filter(s => s.channel === 'hocker').length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No hocker sales yet</div>
          )}
        </Card>
      )}

      {tab === 'friend' && (
        <Card>
          <SectionHeader title="Friend Channel Sales" subtitle="Zero-profit vs seasonal-profit shipments" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {(() => {
              const fSales = sales.filter(s => s.channel === 'friend');
              const totalRevenue = fSales.reduce((sum, s) => sum + s.totalAmount, 0);
              const totalFreight = fSales.reduce((sum, s) => sum + s.outboundFreight, 0);
              const totalRm = fSales.reduce((sum, s) => sum + (s.rmCostTotal ?? 0), 0);
              const netPL = totalRevenue - totalFreight - totalRm;
              return [
                { label: 'Total Revenue', value: formatINR(totalRevenue), color: 'var(--green)' },
                { label: 'Freight Absorbed', value: formatINR(totalFreight), color: 'var(--red)' },
                { label: 'RM Cost', value: formatINR(totalRm), color: 'var(--red)' },
                { label: 'Net P&L', value: formatINR(netPL), color: netPL >= 0 ? 'var(--green)' : 'var(--red)' },
              ].map(item => (
                <div key={item.label} className="rounded-lg p-3 border text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                  <div className="font-bold" style={{ color: item.color }}>{item.value}</div>
                </div>
              ));
            })()}
          </div>
          <Table
            searchable
            exportFilename="friend-channel.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'productType', label: 'Product' },
              { key: 'quantity', label: 'Qty', render: (r: Record<string, unknown>) => `${r.quantity} ${r.quantityUnit}` },
              {
                key: 'friendMode', label: 'Mode',
                render: (r: Record<string, unknown>) => (
                  <Badge variant={r.friendMode === 'zero' ? 'gray' : 'green'}>
                    {r.friendMode === 'zero' ? 'Zero Profit' : 'Seasonal'}
                  </Badge>
                ),
              },
              { key: 'totalAmount', label: 'Charged', render: (r: Record<string, unknown>) => formatINR(r.totalAmount as number) },
              { key: 'rmCostTotal', label: 'RM Cost', render: (r: Record<string, unknown>) => formatINR((r.rmCostTotal as number) ?? 0) },
              { key: 'outboundFreight', label: 'Freight Paid', render: (r: Record<string, unknown>) => formatINR(r.outboundFreight as number) },
              {
                key: 'pnl', label: 'P&L',
                render: (r: Record<string, unknown>) => {
                  const pl = (r.totalAmount as number) - (r.outboundFreight as number) - ((r.rmCostTotal as number) ?? 0);
                  return <span style={{ color: pl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatINR(pl)}</span>;
                },
              },
            ]}
            data={sales.filter(s => s.channel === 'friend') as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Sale Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); }} title={editId ? 'Edit Sale' : 'New Sale Entry'} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(form.date)} onChange={e => setForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Select label="Sale Type" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as Channel }))}>
            {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
          </Select>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Buyer Name</label>
            <input
              list="buyers-list"
              value={form.buyerName}
              onChange={e => {
                const name = e.target.value;
                const known = buyers.find(b => b.name === name);
                setForm(f => ({
                  ...f,
                  buyerName: name,
                  ...(known ? { channel: known.channel } : {}),
                }));
              }}
              placeholder="Type or select buyer…"
              className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <datalist id="buyers-list">
              {buyers.map(b => <option key={b.id} value={b.name}>{b.channel}</option>)}
            </datalist>
            {form.buyerName && !buyers.find(b => b.name === form.buyerName) && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                New buyer — save them in <a href="/buyers" className="underline" style={{ color: 'var(--blue)' }}>Buyers</a> to persist their channel
              </span>
            )}
          </div>
          <Select label="Product" value={form.productType} onChange={e => {
            const prod = e.target.value as ProductType;
            const savedRate = getDefaultRate(prod);
            setForm(f => ({ ...f, productType: prod, ratePerUnit: savedRate || f.ratePerUnit }));
          }}>
            {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Select label="Quantity Unit" value={form.quantityUnit} onChange={e => setForm(f => ({ ...f, quantityUnit: e.target.value as QuantityUnit }))}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </Select>
          <Input label="Quantity" type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />

          {isPlateBorasSale && (
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Plates per Bora <span className="opacity-60">(for this buyer)</span>
                </label>
                <input
                  type="number" min="1" step="1"
                  value={form.platesPerBora ?? ''}
                  placeholder={String(settings.platesPerBora)}
                  onChange={e => setForm(f => ({ ...f, platesPerBora: parseInt(e.target.value) || undefined }))}
                  className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              {totalPlatesInSale !== null && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Plates</label>
                  <div className="px-3 py-2 rounded-lg border text-sm font-bold" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {totalPlatesInSale.toLocaleString()} plates
                  </div>
                </div>
              )}
            </div>
          )}

          {form.channel === 'friend' && (
            <div className="col-span-2">
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Friend Mode</label>
              <div className="flex gap-4">
                {[
                  { value: 'zero', label: 'Zero Profit (Regular)' },
                  { value: 'profit', label: 'Seasonal Profit' },
                ].map(m => (
                  <label key={m.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={form.friendMode === m.value} onChange={() => setForm(f => ({ ...f, friendMode: m.value as FriendMode }))} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Rate per Unit (₹)</label>
            <div className="flex gap-2">
              <input
                type="number" min="0" step="0.01"
                value={form.ratePerUnit}
                onChange={e => setForm(f => ({ ...f, ratePerUnit: parseFloat(e.target.value) || 0 }))}
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <Button size="sm" variant="ghost" onClick={suggestPrice}>Auto</Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Amount</label>
            <div className="px-3 py-2 rounded-lg border text-sm font-bold" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--green)' }}>
              {formatINR(totalAmount)}
            </div>
          </div>

          <Input label="Amount Received (₹)" type="number" min="0" step="0.01" value={form.amountReceived} onChange={e => setForm(f => ({ ...f, amountReceived: parseFloat(e.target.value) || 0 }))} />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Pending Amount</label>
            <div className="px-3 py-2 rounded-lg border text-sm font-bold" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: pendingAmount > 0 ? 'var(--red)' : 'var(--green)' }}>
              {formatINR(pendingAmount)}
            </div>
          </div>

          <Input
            label={form.channel === 'friend' ? 'Outbound Freight (₹) — You pay this' : 'Outbound Freight (₹)'}
            type="number" min="0" step="0.01"
            value={form.outboundFreight}
            onChange={e => setForm(f => ({ ...f, outboundFreight: parseFloat(e.target.value) || 0 }))}
          />

          {form.channel === 'friend' && (
            <Input label="RM Cost (₹) for this shipment" type="number" min="0" step="0.01" value={form.rmCostTotal ?? 0} onChange={e => setForm(f => ({ ...f, rmCostTotal: parseFloat(e.target.value) || 0 }))} />
          )}

          {form.channel === 'friend' && form.friendMode === 'zero' && (
            <div className="col-span-2">
              <Alert variant="blue">
                Zero-profit mode: You recover RM cost + freight only. No margin earned.
                Breakeven amount = {formatINR((form.rmCostTotal ?? 0) + form.outboundFreight)}
              </Alert>
            </div>
          )}

          <div className="col-span-2">
            <Input label="Notes (optional)" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => { setModal(false); setEditId(null); }}>Cancel</Button>
          <Button onClick={handleAddSale} disabled={!form.buyerName || form.quantity <= 0}>
            {editId ? 'Update' : 'Save Sale'}
          </Button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Add Payment">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(payForm.date)} onChange={e => setPayForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Buyer" value={payForm.buyerName} readOnly />
          <Input label="Amount Paid (₹)" type="number" min="0" step="0.01" value={payForm.amountPaid} onChange={e => setPayForm(f => ({ ...f, amountPaid: parseFloat(e.target.value) || 0 }))} />
          <Input label="Notes (optional)" value={payForm.notes ?? ''} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setPaymentModal(false)}>Cancel</Button>
          <Button onClick={handleAddPayment}>Save Payment</Button>
        </div>
      </Modal>

      {/* Bill Modal */}
      {billModal && (
        <Modal open={!!billModal} onClose={() => setBillModal(null)} title="Sale Bill" width="max-w-lg">
          <div ref={billRef} className="space-y-4 print-bill">
            <div className="text-center border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="font-bold text-lg">KS PAPER MANUFACTURING</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Paper Cups & Buffet Plates</div>
            </div>
            <div className="flex justify-between text-sm">
              <div><span style={{ color: 'var(--text-muted)' }}>Bill No: </span><strong>{billModal.billNumber}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date: </span><strong>{billModal.date}</strong></div>
            </div>
            <div className="text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Buyer: </span><strong>{billModal.buyerName}</strong>
              <span className="ml-3 capitalize"><Badge variant={channelVariant(billModal.channel)}>{billModal.channel}</Badge></span>
            </div>
            <table className="w-full text-sm border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <thead style={{ background: 'var(--surface2)' }}>
                <tr>
                  {['Product', 'Qty', 'Unit', 'Rate', 'Amount'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2">{billModal.productType}</td>
                  <td className="px-3 py-2">{formatNumber(billModal.quantity)}</td>
                  <td className="px-3 py-2 capitalize">{billModal.quantityUnit}</td>
                  <td className="px-3 py-2">{formatINR(billModal.ratePerUnit)}</td>
                  <td className="px-3 py-2 font-semibold">{formatINR(billModal.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>Total (without GST)</span>
                <span style={{ color: 'var(--green)' }}>{formatINR(billModal.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>With GST @18% (internal ref)</span>
                <span>{formatINR(billModal.totalAmount * 1.18)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Received</span>
                <span style={{ color: 'var(--green)' }}>{formatINR(billModal.amountReceived)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Pending</span>
                <span style={{ color: billModal.pendingAmount > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {formatINR(billModal.pendingAmount)}
                </span>
              </div>
            </div>
            <div className="text-xs text-center pt-3 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              This is a handwritten bill. GST not charged on sales.
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t no-print" style={{ borderColor: 'var(--border)' }}>
            <Button variant="secondary" onClick={() => setBillModal(null)}>Close</Button>
            <Button onClick={() => window.print()}><Printer size={14} /> Print</Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        message="Delete this sale entry?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
