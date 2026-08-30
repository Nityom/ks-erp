'use client';
import { useState, useEffect } from 'react';
import {
  getFinishedGoods, saveFinishedGoods,
  getPackagingSessions, savePackagingSessions,
} from '@/lib/storage';
import type { FinishedGoodsStock, PackagingSession, CupSize } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Tabs, Badge, ConfirmDialog, StatCard,
} from '@/components/UI';
import { formatINR, formatNumber, generateId, todayDDMMYYYY, fromInputDate, toInputDate } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { getAllProductPrices } from '@/lib/pricing';
import { Plus, Package } from 'lucide-react';

const CUP_SIZES: CupSize[] = ['50ml', '60ml', '210ml', '250ml'];

const INITIAL_FG: FinishedGoodsStock[] = [
  { size: '50ml', looseCups: 0, bundles: 0, cartons: 0 },
  { size: '60ml', looseCups: 0, bundles: 0, cartons: 0 },
  { size: '210ml', looseCups: 0, bundles: 0, cartons: 0 },
  { size: '250ml', looseCups: 0, bundles: 0, cartons: 0 },
  { size: 'plate', looseCups: 0, bundles: 0, cartons: 0, loosePlates: 0, boras: 0 },
];

const EMPTY_PKG: Omit<PackagingSession, 'id'> = {
  date: todayDDMMYYYY(),
  productType: 'cup',
  size: '50ml',
  cupsPackedIntoBundle: 0,
  bundlesPackedIntoCarton: 0,
  bundlesPackedIntoBora: 0,
  ptRollUsed: 0,
  tapeRollsUsed: 0,
  plasticRopeUsed: 0,
  cartonsUsed: 0,
  borasUsed: 0,
};

export default function FinishedGoodsPage() {
  const { settings } = useApp();
  const [fgStock, setFgStock] = useState<FinishedGoodsStock[]>(INITIAL_FG);
  const [sessions, setSessions] = useState<PackagingSession[]>([]);
  const [tab, setTab] = useState('stock');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_PKG);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const stored = getFinishedGoods();
    setFgStock(stored.length > 0 ? stored : INITIAL_FG);
    setSessions(getPackagingSessions());
  }, []);

  const prices = getAllProductPrices(settings);

  const handleAddSession = () => {
    const entry: PackagingSession = { ...form, id: generateId() };
    const updated = [entry, ...sessions];
    savePackagingSessions(updated);
    setSessions(updated);

    // Update FG stock
    const updatedFg = fgStock.map(fg => {
      if (form.productType === 'cup' && fg.size === form.size) {
        return {
          ...fg,
          looseCups: Math.max(0, fg.looseCups - (form.cupsPackedIntoBundle ?? 0)),
          bundles: fg.bundles + Math.floor((form.cupsPackedIntoBundle ?? 0) / 100)
            - (form.bundlesPackedIntoCarton ?? 0),
          cartons: fg.cartons + Math.floor((form.bundlesPackedIntoCarton ?? 0) / 10),
        };
      }
      if (form.productType === 'plate' && fg.size === 'plate') {
        return {
          ...fg,
          loosePlates: Math.max(0, (fg.loosePlates ?? 0) - (form.bundlesPackedIntoBora ?? 0) * 20),
          bundles: Math.max(0, fg.bundles - (form.bundlesPackedIntoBora ?? 0)),
          boras: (fg.boras ?? 0) + Math.floor((form.bundlesPackedIntoBora ?? 0) / 20),
        };
      }
      return fg;
    });
    saveFinishedGoods(updatedFg);
    setFgStock(updatedFg);
    setModal(false);
    setForm(EMPTY_PKG);
  };

  // Manual stock adjustment
  const handleAdjust = (size: string, field: keyof FinishedGoodsStock, delta: number) => {
    const updated = fgStock.map(fg => {
      if (fg.size !== size) return fg;
      const current = (fg[field] as number) ?? 0;
      return { ...fg, [field]: Math.max(0, current + delta) };
    });
    saveFinishedGoods(updated);
    setFgStock(updated);
  };

  const stockValue = (fg: FinishedGoodsStock): number => {
    const key = fg.size === 'plate' ? 'plate' : fg.size as keyof typeof prices;
    const p = prices[key];
    if (!p) return 0;
    const rate = p.hocker.priceWithoutGST;
    if (fg.size === 'plate') {
      const totalPlates = (fg.loosePlates ?? 0) + fg.bundles * 20 + (fg.boras ?? 0) * 400;
      return totalPlates * rate;
    }
    const totalCups = fg.looseCups + fg.bundles * 100 + fg.cartons * 1000;
    return totalCups * rate;
  };

  const totalValue = fgStock.reduce((sum, fg) => sum + stockValue(fg), 0);

  const getThreshold = (size: string): number => {
    const map: Record<string, number> = {
      '50ml': settings.fgThreshold50ml,
      '60ml': settings.fgThreshold60ml,
      '210ml': settings.fgThreshold210ml,
      '250ml': settings.fgThreshold250ml,
      'plate': settings.fgThresholdPlate,
    };
    return map[size] ?? 0;
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Stock Value (Sell)" value={formatINR(totalValue)} color="green" />
        <StatCard label="Cup Cartons in Stock" value={formatNumber(fgStock.filter(f => f.size !== 'plate').reduce((s, f) => s + f.cartons, 0))} />
        <StatCard label="Plate Boras in Stock" value={formatNumber(fgStock.find(f => f.size === 'plate')?.boras ?? 0)} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { key: 'stock', label: 'Stock Overview' },
            { key: 'sessions', label: 'Packaging Sessions' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Button onClick={() => { setForm(EMPTY_PKG); setModal(true); }}>
          <Plus size={14} /> Log Packaging Session
        </Button>
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          {/* Cup Stock */}
          <Card>
            <SectionHeader title="Cup Stock" subtitle="By size — loose cups, bundles, cartons" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--surface2)' }}>
                  <tr>
                    {['Size', 'Loose Cups', 'Bundles', 'Cartons', 'Stock Value', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fgStock.filter(f => f.size !== 'plate').map(fg => {
                    const threshold = getThreshold(fg.size);
                    const low = fg.cartons <= threshold;
                    return (
                      <tr key={fg.size} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2 font-semibold">{fg.size}</td>
                        <td className="px-3 py-2">{formatNumber(fg.looseCups)}</td>
                        <td className="px-3 py-2">{formatNumber(fg.bundles)}</td>
                        <td className="px-3 py-2 font-semibold">{formatNumber(fg.cartons)}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--green)' }}>{formatINR(stockValue(fg))}</td>
                        <td className="px-3 py-2">
                          {low ? <Badge variant="red">Low</Badge> : <Badge variant="green">OK</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Plate Stock */}
          <Card>
            <SectionHeader title="Plate Stock" subtitle="Loose plates, bundles (20 plates), boras (400 plates)" />
            {fgStock.filter(f => f.size === 'plate').map(fg => {
              const threshold = getThreshold('plate');
              const low = (fg.boras ?? 0) <= threshold;
              return (
                <div key={fg.size} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Loose Plates', value: fg.loosePlates ?? 0 },
                    { label: 'Bundles (20 plates)', value: fg.bundles },
                    { label: 'Boras (400 plates)', value: fg.boras ?? 0 },
                    { label: 'Stock Value', value: formatINR(stockValue(fg)), isStr: true },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg p-3 text-center border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                      <div className="font-bold text-lg" style={{ color: item.isStr ? 'var(--green)' : 'var(--text)' }}>
                        {item.isStr ? item.value : formatNumber(item.value as number)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tab === 'sessions' && (
        <Card>
          <SectionHeader title="Packaging Sessions" />
          <Table
            searchable
            exportFilename="packaging-sessions.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'productType', label: 'Type', render: (r: Record<string, unknown>) => <Badge variant={r.productType === 'cup' ? 'blue' : 'green'}>{r.productType as string}</Badge> },
              { key: 'size', label: 'Size', render: (r: Record<string, unknown>) => r.size as string || '—' },
              { key: 'ptRollUsed', label: 'PP Rolls', render: (r: Record<string, unknown>) => r.ptRollUsed as number || 0 },
              { key: 'tapeRollsUsed', label: 'Tape Rolls', render: (r: Record<string, unknown>) => r.tapeRollsUsed as number || 0 },
              { key: 'cartonsUsed', label: 'Cartons', render: (r: Record<string, unknown>) => r.cartonsUsed as number || 0 },
              { key: 'borasUsed', label: 'Boras', render: (r: Record<string, unknown>) => r.borasUsed as number || 0 },
              {
                key: 'actions', label: '', sortable: false,
                render: (r: Record<string, unknown>) => (
                  <button onClick={() => setDeleteId(r.id as string)} className="text-xs text-red-600 hover:underline">Del</button>
                ),
              },
            ]}
            data={sessions as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Packaging Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Log Packaging Session" width="max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(form.date)} onChange={e => setForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Select label="Product Type" value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value as 'cup' | 'plate' }))}>
            <option value="cup">Cup</option>
            <option value="plate">Plate</option>
          </Select>
          {form.productType === 'cup' && (
            <Select label="Cup Size" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value as CupSize }))}>
              {CUP_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          )}
          {form.productType === 'cup' && (
            <>
              <Input label="Cups Packed into Bundles" type="number" min="0" value={form.cupsPackedIntoBundle ?? 0} onChange={e => setForm(f => ({ ...f, cupsPackedIntoBundle: parseInt(e.target.value) || 0 }))} />
              <Input label="Bundles Packed into Cartons" type="number" min="0" value={form.bundlesPackedIntoCarton ?? 0} onChange={e => setForm(f => ({ ...f, bundlesPackedIntoCarton: parseInt(e.target.value) || 0 }))} />
              <Input label="Cartons Used" type="number" min="0" value={form.cartonsUsed ?? 0} onChange={e => setForm(f => ({ ...f, cartonsUsed: parseInt(e.target.value) || 0 }))} />
            </>
          )}
          {form.productType === 'plate' && (
            <>
              <Input label="Bundles Packed into Boras (20 bundles = 1 bora)" type="number" min="0" value={form.bundlesPackedIntoBora ?? 0} onChange={e => setForm(f => ({ ...f, bundlesPackedIntoBora: parseInt(e.target.value) || 0 }))} />
              <Input label="Boras Used" type="number" min="0" value={form.borasUsed ?? 0} onChange={e => setForm(f => ({ ...f, borasUsed: parseInt(e.target.value) || 0 }))} />
              <Input label="Plastic Rope Used" type="number" min="0" step="0.1" value={form.plasticRopeUsed ?? 0} onChange={e => setForm(f => ({ ...f, plasticRopeUsed: parseFloat(e.target.value) || 0 }))} />
            </>
          )}
          <Input label="PP Rolls Used" type="number" min="0" step="0.1" value={form.ptRollUsed ?? 0} onChange={e => setForm(f => ({ ...f, ptRollUsed: parseFloat(e.target.value) || 0 }))} />
          <Input label="Tape Rolls Used" type="number" min="0" step="0.1" value={form.tapeRollsUsed ?? 0} onChange={e => setForm(f => ({ ...f, tapeRollsUsed: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleAddSession}>Log Session</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Delete this packaging session?"
        onConfirm={() => {
          if (deleteId) {
            const updated = sessions.filter(s => s.id !== deleteId);
            savePackagingSessions(updated);
            setSessions(updated);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
