'use client';
import { useState, useEffect } from 'react';
import {
  getRMPurchases, saveRMPurchases, getRMStock, saveRMStock,
} from '@/lib/storage';
import type { RawMaterialPurchase, RawMaterialStock, RawMaterialType, Settings } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Badge, Alert, Tabs, ConfirmDialog,
} from '@/components/UI';
import { formatINR, formatNumber, generateId, todayDDMMYYYY, fromInputDate, toInputDate } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Plus, AlertTriangle } from 'lucide-react';

const RM_TYPES: { value: RawMaterialType; label: string; unit: string }[] = [
  { value: 'paperBlank', label: 'Paper Blank', unit: 'kg' },
  { value: 'paperBottom', label: 'Paper Bottom', unit: 'kg' },
  { value: 'paraffinOil', label: 'Paraffin Oil', unit: 'litres' },
  { value: 'mobilOil', label: 'Mobil Oil', unit: 'litres' },
  { value: 'plateSheets', label: 'Plate Sheets', unit: 'bundles' },
  { value: 'ptRoll', label: 'PP Roll', unit: 'rolls' },
  { value: 'boraBag', label: 'Bora Bags', unit: 'boras' },
  { value: 'cartonBox', label: 'Carton Boxes', unit: 'boxes' },
  { value: 'transparentTape', label: 'Transparent Tape', unit: 'rolls' },
  { value: 'plasticRope', label: 'Plastic Rope', unit: 'units' },
];

const rmLabel = (type: RawMaterialType) => RM_TYPES.find(r => r.value === type)?.label ?? type;
const rmUnit = (type: RawMaterialType) => RM_TYPES.find(r => r.value === type)?.unit ?? '';

const EMPTY_PURCHASE: Omit<RawMaterialPurchase, 'id'> = {
  date: todayDDMMYYYY(),
  supplierName: '',
  materialType: 'paperBlank',
  quantityReceived: 0,
  billedQuantity: 0,
  pricePerUnit: 0,
  withGst: false,
  gstAmount: 0,
  hsnCode: '',
  inboundFreight: 0,
  transportPerUnit: 0,
  notes: '',
};

// Maps each RM type to its corresponding Settings rate key
const RM_RATE_KEYS: Record<RawMaterialType, keyof Settings> = {
  paperBlank: 'paperBlankRatePerKg',
  paperBottom: 'paperBottomRatePerKg',
  paraffinOil: 'paraffinOilRatePerLitre',
  mobilOil: 'mobilOilRatePerLitre',
  plateSheets: 'plateSheetRatePerBundle',
  ptRoll: 'ptRollRate',
  boraBag: 'boraBagRate',
  cartonBox: 'cartonBoxRate',
  transparentTape: 'transparentTapeRate',
  plasticRope: 'plasticRopeRate',
};

export default function RawMaterialsPage() {
  const { settings, updateSettings } = useApp();
  const [purchases, setPurchases] = useState<RawMaterialPurchase[]>([]);
  const [stock, setStock] = useState<RawMaterialStock[]>([]);
  const [tab, setTab] = useState('stock');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PURCHASE);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setPurchases(getRMPurchases());
    setStock(getRMStock());
  }, []);

  // Auto-calc transport per unit
  const transportPerUnit = form.quantityReceived > 0 ? form.inboundFreight / form.quantityReceived : 0;

  const handleAddPurchase = () => {
    const entry: RawMaterialPurchase = {
      ...form,
      id: editId ?? generateId(),
      transportPerUnit,
    };
    let updated: RawMaterialPurchase[];
    if (editId) {
      updated = purchases.map(p => p.id === editId ? entry : p);
      setEditId(null);
    } else {
      updated = [entry, ...purchases];
      // Update stock
      updateStock(form.materialType, form.quantityReceived, form.billedQuantity, true);
    }
    saveRMPurchases(updated);
    setPurchases(updated);
    // Auto-sync purchase price → Settings rate so pricing stays current
    if (form.pricePerUnit > 0) {
      updateSettings({ [RM_RATE_KEYS[form.materialType]]: form.pricePerUnit });
    }
    setModalOpen(false);
    setForm(EMPTY_PURCHASE);
  };

  const updateStock = (
    type: RawMaterialType,
    actual: number,
    declared: number,
    add: boolean
  ) => {
    const existing = stock.find(s => s.materialType === type);
    let updated: RawMaterialStock[];
    if (existing) {
      updated = stock.map(s =>
        s.materialType === type
          ? {
              ...s,
              actualQty: s.actualQty + (add ? actual : -actual),
              declaredQty: s.declaredQty + (add ? declared : -declared),
              lastUpdated: todayDDMMYYYY(),
            }
          : s
      );
    } else {
      updated = [...stock, {
        materialType: type,
        actualQty: add ? actual : 0,
        declaredQty: add ? declared : 0,
        lastUpdated: todayDDMMYYYY(),
      }];
    }
    saveRMStock(updated);
    setStock(updated);
  };

  const handleDelete = (id: string) => {
    const p = purchases.find(x => x.id === id);
    if (p) updateStock(p.materialType, p.quantityReceived, p.billedQuantity, false);
    const updated = purchases.filter(x => x.id !== id);
    saveRMPurchases(updated);
    setPurchases(updated);
    setDeleteId(null);
  };

  const openEdit = (p: RawMaterialPurchase) => {
    setForm({ ...p });
    setEditId(p.id);
    setModalOpen(true);
  };

  const getThreshold = (type: RawMaterialType): number => {
    const map: Record<RawMaterialType, number> = {
      paperBlank: settings.thresholdPaperBlank,
      paperBottom: settings.thresholdPaperBottom,
      paraffinOil: settings.thresholdParaffinOil,
      mobilOil: settings.thresholdMobilOil,
      plateSheets: settings.thresholdPlateSheets,
      ptRoll: settings.thresholdPtRoll,
      boraBag: settings.thresholdBoraBag,
      cartonBox: settings.thresholdCarton,
      transparentTape: 0,
      plasticRope: 0,
    };
    return map[type] ?? 0;
  };

  const stockMap = Object.fromEntries(stock.map(s => [s.materialType, s]));

  const lowStockItems = RM_TYPES.filter(rm => {
    const s = stockMap[rm.value];
    const threshold = getThreshold(rm.value as RawMaterialType);
    return threshold > 0 && (!s || s.actualQty <= threshold);
  });

  // Total stock value
  const totalStockValue = stock.reduce((sum, s) => {
    const rateMap: Record<RawMaterialType, number> = {
      paperBlank: settings.paperBlankRatePerKg,
      paperBottom: settings.paperBottomRatePerKg,
      paraffinOil: settings.paraffinOilRatePerLitre,
      mobilOil: settings.mobilOilRatePerLitre,
      plateSheets: settings.plateSheetRatePerBundle,
      ptRoll: settings.ptRollRate,
      boraBag: settings.boraBagRate,
      cartonBox: settings.cartonBoxRate,
      transparentTape: settings.transparentTapeRate,
      plasticRope: settings.plasticRopeRate,
    };
    return sum + s.actualQty * (rateMap[s.materialType] ?? 0);
  }, 0);

  return (
    <div className="space-y-4 max-w-6xl">
      {lowStockItems.length > 0 && (
        <Alert variant="amber">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle size={14} /> Low Stock Warning
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(rm => (
              <span key={rm.value} className="bg-amber-200/50 text-amber-900 dark:bg-amber-800/30 dark:text-amber-200 px-2 py-0.5 rounded text-xs">
                {rm.label}: {formatNumber(stockMap[rm.value]?.actualQty ?? 0)} {rm.unit}
              </span>
            ))}
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Tabs
          tabs={[
            { key: 'stock', label: 'Current Stock' },
            { key: 'purchases', label: 'All Purchases' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Button onClick={() => { setForm(EMPTY_PURCHASE); setEditId(null); setModalOpen(true); }}>
          <Plus size={14} /> Add Purchase
        </Button>
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Card className="col-span-full lg:col-span-1">
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total Stock Value</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--green)' }}>{formatINR(totalStockValue)}</div>
            </Card>
          </div>

          <Card>
            <SectionHeader title="Stock in Hand" subtitle="Actual stock vs billed amount" />
            <Table
              columns={[
                { key: 'material', label: 'Material', render: (r: Record<string, unknown>) => rmLabel(r.materialType as RawMaterialType) },
                { key: 'unit', label: 'Unit', render: (r: Record<string, unknown>) => rmUnit(r.materialType as RawMaterialType) },
                {
                  key: 'actualQty', label: 'In Hand',
                  render: (r: Record<string, unknown>) => (
                    <span className="font-semibold">{formatNumber(r.actualQty as number ?? 0)}</span>
                  ),
                },
                {
                  key: 'declaredQty', label: 'Billed Stock',
                  render: (r: Record<string, unknown>) => formatNumber(r.declaredQty as number ?? 0),
                },
                {
                  key: 'diff', label: 'Extra (Internal)',
                  render: (r: Record<string, unknown>) => {
                    const diff = (r.actualQty as number ?? 0) - (r.declaredQty as number ?? 0);
                    return <span style={{ color: diff > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>{formatNumber(diff)}</span>;
                  },
                },
                {
                  key: 'status', label: 'Status',
                  render: (r: Record<string, unknown>) => {
                    const threshold = getThreshold(r.materialType as RawMaterialType);
                    const qty = r.actualQty as number ?? 0;
                    if (threshold > 0 && qty <= threshold) return <Badge variant="red">Low Stock</Badge>;
                    return <Badge variant="green">OK</Badge>;
                  },
                },
                {
                  key: 'lastUpdated', label: 'Updated',
                  render: (r: Record<string, unknown>) => r.lastUpdated as string ?? '—',
                },
              ]}
              data={RM_TYPES.map(rm => ({
                materialType: rm.value,
                actualQty: stockMap[rm.value]?.actualQty ?? 0,
                declaredQty: stockMap[rm.value]?.declaredQty ?? 0,
                lastUpdated: stockMap[rm.value]?.lastUpdated ?? '—',
              })) as Record<string, unknown>[]}
              exportFilename="rm-stock.csv"
            />
          </Card>
        </div>
      )}

      {tab === 'purchases' && (
        <Card>
          <SectionHeader title="Purchase History" />
          <Table
            searchable
            exportFilename="rm-purchases.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'supplierName', label: 'Supplier' },
              {
                key: 'materialType', label: 'Material',
                render: (r: Record<string, unknown>) => rmLabel(r.materialType as RawMaterialType),
              },
              {
                key: 'quantityReceived', label: 'Qty Received',
                render: (r: Record<string, unknown>) => `${formatNumber(r.quantityReceived as number)} ${rmUnit(r.materialType as RawMaterialType)}`,
              },
              {
                key: 'billedQuantity', label: 'Billed Qty',
                render: (r: Record<string, unknown>) => formatNumber(r.billedQuantity as number),
              },
              {
                key: 'pricePerUnit', label: 'Rate/Unit',
                render: (r: Record<string, unknown>) => formatINR(r.pricePerUnit as number),
              },
              {
                key: 'withGst', label: 'GST',
                render: (r: Record<string, unknown>) => r.withGst ? <Badge variant="blue">With GST</Badge> : <Badge variant="gray">No Bill</Badge>,
              },
              {
                key: 'gstAmount', label: 'GST Amt',
                render: (r: Record<string, unknown>) => r.withGst ? formatINR(r.gstAmount as number ?? 0) : '—',
              },
              {
                key: 'inboundFreight', label: 'Freight',
                render: (r: Record<string, unknown>) => formatINR(r.inboundFreight as number ?? 0),
              },
              {
                key: 'transportPerUnit', label: 'Transport/Unit',
                render: (r: Record<string, unknown>) => formatINR(r.transportPerUnit as number ?? 0),
              },
              {
                key: 'actions', label: 'Actions', sortable: false,
                render: (r: Record<string, unknown>) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(purchases.find(p => p.id === r.id)!)}
                      className="text-xs text-blue-600 hover:underline"
                    >Edit</button>
                    <button
                      onClick={() => setDeleteId(r.id as string)}
                      className="text-xs text-red-600 hover:underline"
                    >Delete</button>
                  </div>
                ),
              },
            ]}
            data={purchases as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Purchase Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditId(null); }}
        title={editId ? 'Edit Purchase' : 'Add Raw Material Purchase'}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={toInputDate(form.date)}
            onChange={e => setForm(f => ({ ...f, date: fromInputDate(e.target.value) }))}
          />
          <Input
            label="Supplier Name"
            value={form.supplierName}
            onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
          />
          <Select
            label="Material"
            value={form.materialType}
            onChange={e => setForm(f => ({ ...f, materialType: e.target.value as RawMaterialType }))}
          >
            {RM_TYPES.map(rm => (
              <option key={rm.value} value={rm.value}>{rm.label}</option>
            ))}
          </Select>
          <Input
            label={`Qty Received (${rmUnit(form.materialType)})`}
            type="number"
            min="0"
            value={form.quantityReceived}
            onChange={e => setForm(f => ({ ...f, quantityReceived: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label={`Billed Quantity (${rmUnit(form.materialType)})`}
            type="number"
            min="0"
            value={form.billedQuantity}
            onChange={e => setForm(f => ({ ...f, billedQuantity: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Price per Unit (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.pricePerUnit}
            onChange={e => setForm(f => ({ ...f, pricePerUnit: parseFloat(e.target.value) || 0 }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>With GST?</label>
            <div className="flex gap-3 mt-1">
              {[true, false].map(v => (
                <label key={String(v)} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={form.withGst === v}
                    onChange={() => setForm(f => ({ ...f, withGst: v }))}
                  />
                  {v ? 'Yes — With GST' : 'No — Informal'}
                </label>
              ))}
            </div>
          </div>
          {form.withGst && (
            <>
              <Input
                label="GST Amount (₹)"
                type="number"
                min="0"
                step="0.01"
                value={form.gstAmount ?? 0}
                onChange={e => setForm(f => ({ ...f, gstAmount: parseFloat(e.target.value) || 0 }))}
              />
              <Input
                label="HSN Code"
                value={form.hsnCode ?? ''}
                onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
              />
            </>
          )}
          <Input
            label="Transport Cost (₹ total for this trip)"
            type="number"
            min="0"
            step="0.01"
            value={form.inboundFreight}
            onChange={e => setForm(f => ({ ...f, inboundFreight: parseFloat(e.target.value) || 0 }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Auto Transport/Unit</label>
            <div className="px-3 py-2 rounded-lg border text-sm font-semibold" style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--green)' }}>
              {formatINR(transportPerUnit)}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Notes (optional)"
              value={form.notes ?? ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => { setModalOpen(false); setEditId(null); }}>Cancel</Button>
          <Button onClick={handleAddPurchase} disabled={!form.supplierName || form.quantityReceived <= 0}>
            {editId ? 'Update' : 'Add Purchase'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Delete this purchase? Stock will be adjusted."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
