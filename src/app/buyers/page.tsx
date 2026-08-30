'use client';
import { useState, useEffect } from 'react';
import { getBuyers, saveBuyers, getSales } from '@/lib/storage';
import type { Buyer, Channel, SaleEntry } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Badge, ConfirmDialog, StatCard,
} from '@/components/UI';
import { formatINR, formatNumber, generateId, todayDDMMYYYY } from '@/lib/utils';
import { Plus, Phone, MapPin } from 'lucide-react';

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'hocker',     label: 'Hocker' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'retailer',   label: 'Retailer' },
  { value: 'friend',     label: 'Friend (Out-of-State)' },
];

function channelVariant(ch: Channel): 'blue' | 'green' | 'amber' | 'gray' {
  return ch === 'hocker' ? 'blue' : ch === 'wholesaler' ? 'green' : ch === 'retailer' ? 'amber' : 'gray';
}

const EMPTY_BUYER: Omit<Buyer, 'id' | 'createdAt'> = {
  name: '',
  channel: 'hocker',
  phone: '',
  address: '',
  notes: '',
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_BUYER);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  useEffect(() => {
    setBuyers(getBuyers());
    setSales(getSales());
  }, []);

  // Per-buyer stats from sales
  const buyerStats = (name: string) => {
    const bs = sales.filter(s => s.buyerName === name);
    const totalBilled   = bs.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPending  = bs.reduce((sum, s) => sum + s.pendingAmount, 0);
    const totalReceived = bs.reduce((sum, s) => sum + s.amountReceived, 0);
    return { totalBilled, totalPending, totalReceived, count: bs.length };
  };

  const openAdd = () => {
    setForm(EMPTY_BUYER);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (b: Buyer) => {
    setForm({ name: b.name, channel: b.channel, phone: b.phone ?? '', address: b.address ?? '', notes: b.notes ?? '' });
    setEditId(b.id);
    setModal(true);
  };

  const handleSave = () => {
    const entry: Buyer = {
      ...form,
      id: editId ?? generateId(),
      createdAt: editId ? buyers.find(b => b.id === editId)!.createdAt : todayDDMMYYYY(),
    };
    const updated = editId
      ? buyers.map(b => b.id === editId ? entry : b)
      : [entry, ...buyers];
    saveBuyers(updated);
    setBuyers(updated);
    setModal(false);
    setEditId(null);
    setForm(EMPTY_BUYER);
  };

  const handleDelete = (id: string) => {
    const updated = buyers.filter(b => b.id !== id);
    saveBuyers(updated);
    setBuyers(updated);
    setDeleteId(null);
    if (selectedBuyer?.id === id) setSelectedBuyer(null);
  };

  // Group by channel for the summary cards
  const byChannel = CHANNELS.map(ch => ({
    ...ch,
    count: buyers.filter(b => b.channel === ch.value).length,
  }));

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {byChannel.map(ch => (
          <StatCard key={ch.value} label={ch.label} value={String(ch.count)} subtext="registered buyers" />
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Buyers Directory</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            All buyers — saved here auto-fill channel in the Sales form
          </p>
        </div>
        <Button onClick={openAdd}><Plus size={14} /> Add Buyer</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Buyer list */}
        <Card>
          <SectionHeader title="All Buyers" />
          {buyers.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
              No buyers yet — click "Add Buyer" to register one
            </div>
          )}
          <div className="space-y-2">
            {buyers.map(b => {
              const stats = buyerStats(b.name);
              const isSelected = selectedBuyer?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBuyer(isSelected ? null : b)}
                  className="flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: isSelected ? 'var(--blue)' : 'var(--border)',
                    background: isSelected ? 'var(--surface2)' : 'transparent',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{b.name}</span>
                      <Badge variant={channelVariant(b.channel)}>{b.channel}</Badge>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Phone size={10} /> {b.phone}
                      </div>
                    )}
                    {b.address && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={10} /> {b.address}
                      </div>
                    )}
                    {stats.count > 0 && (
                      <div className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {stats.count} sales · Billed {formatINR(stats.totalBilled)}
                        {stats.totalPending > 0 && <span style={{ color: 'var(--red)' }}> · Due {formatINR(stats.totalPending)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(b); }}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--blue)' }}
                    >Edit</button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(b.id); }}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--red)' }}
                    >Del</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Buyer detail / sales history */}
        <Card>
          {selectedBuyer ? (() => {
            const stats = buyerStats(selectedBuyer.name);
            const buyerSales = sales
              .filter(s => s.buyerName === selectedBuyer.name)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15);
            return (
              <>
                <SectionHeader title={selectedBuyer.name} subtitle={CHANNELS.find(c => c.value === selectedBuyer.channel)?.label} />
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Total Billed',  value: formatINR(stats.totalBilled),   color: 'var(--text)' },
                    { label: 'Received',      value: formatINR(stats.totalReceived), color: 'var(--green)' },
                    { label: 'Pending',       value: formatINR(stats.totalPending),  color: stats.totalPending > 0 ? 'var(--red)' : 'var(--green)' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg p-2 border text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                      <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                      <div className="font-bold text-sm" style={{ color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {selectedBuyer.phone && <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}><Phone size={10} className="inline mr-1" />{selectedBuyer.phone}</div>}
                {selectedBuyer.address && <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}><MapPin size={10} className="inline mr-1" />{selectedBuyer.address}</div>}
                {selectedBuyer.notes && <div className="text-xs mb-3 italic" style={{ color: 'var(--text-muted)' }}>{selectedBuyer.notes}</div>}

                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Recent Sales</div>
                {buyerSales.length === 0
                  ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No sales recorded yet</div>
                  : <div className="space-y-1.5">
                    {buyerSales.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-xs rounded px-2 py-1.5 border" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>{s.date}</span>
                          <span className="ml-2 font-medium" style={{ color: 'var(--text)' }}>{s.productType} · {formatNumber(s.quantity)} {s.quantityUnit}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold" style={{ color: 'var(--text)' }}>{formatINR(s.totalAmount)}</div>
                          {s.pendingAmount > 0 && <div style={{ color: 'var(--red)' }}>Due {formatINR(s.pendingAmount)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Click a buyer to see their sales history</div>
            </div>
          )}
        </Card>
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); }} title={editId ? 'Edit Buyer' : 'Add Buyer'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Buyer Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <Select label="Channel *" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value as Channel }))}>
            {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.label}</option>)}
          </Select>
          <Input label="Phone" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Optional" />
          <div className="col-span-2">
            <Input label="Address" value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="col-span-2">
            <Input label="Notes" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => { setModal(false); setEditId(null); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>{editId ? 'Update' : 'Save Buyer'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Delete this buyer? Their past sales will not be affected."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
