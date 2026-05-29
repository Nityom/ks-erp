'use client';
import { useState, useEffect } from 'react';
import {
  getCupProduction, saveCupProduction,
  getPlateProduction, savePlateProduction,
  getRMStock, saveRMStock,
} from '@/lib/storage';
import type { CupProductionSession, PlateProductionSession, CupSize, RawMaterialType } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Tabs, Badge, ConfirmDialog, StatCard,
} from '@/components/UI';
import {
  formatINR, formatNumber, generateId, todayDDMMYYYY,
  fromInputDate, toInputDate, getCupSpeed, currentMonth,
} from '@/lib/utils';
import { Plus, Factory } from 'lucide-react';

const MACHINES = [
  { id: 'A', label: 'Machine A (50/60 ml, swappable mold)' },
  { id: 'B', label: 'Machine B (210 ml)' },
  { id: 'C', label: 'Machine C (250 ml)' },
];

const CUP_SIZES: { value: CupSize; label: string; machine: string }[] = [
  { value: '50ml', label: '50 ml', machine: 'A' },
  { value: '60ml', label: '60 ml', machine: 'A' },
  { value: '210ml', label: '210 ml', machine: 'B' },
  { value: '250ml', label: '250 ml', machine: 'C' },
];

const EMPTY_CUP: Omit<CupProductionSession, 'id' | 'theoreticalOutput' | 'efficiency'> = {
  date: todayDDMMYYYY(),
  machineId: 'A',
  activeMold: '50ml',
  operatorName: '',
  durationMinutes: 0,
  actualCupsProduced: 0,
  paraffinOilUsed: 0,
  mobilOilUsed: 0,
};

const EMPTY_PLATE: Omit<PlateProductionSession, 'id' | 'platesProduced' | 'sheetsConsumed'> = {
  date: todayDDMMYYYY(),
  operator1: '',
  operator2: '',
  hoursWorked: 0,
  bundlesProduced: 0,
};

export default function ProductionPage() {
  const [tab, setTab] = useState('cups');
  const [cupSessions, setCupSessions] = useState<CupProductionSession[]>([]);
  const [plateSessions, setPlateSessions] = useState<PlateProductionSession[]>([]);
  const [cupModal, setCupModal] = useState(false);
  const [plateModal, setPlateModal] = useState(false);
  const [cupForm, setCupForm] = useState(EMPTY_CUP);
  const [plateForm, setPlateForm] = useState(EMPTY_PLATE);
  const [deleteCupId, setDeleteCupId] = useState<string | null>(null);
  const [deletePlateId, setDeletePlateId] = useState<string | null>(null);
  const [editCupId, setEditCupId] = useState<string | null>(null);
  const [editPlateId, setEditPlateId] = useState<string | null>(null);

  useEffect(() => {
    setCupSessions(getCupProduction());
    setPlateSessions(getPlateProduction());
  }, []);

  // Cup calc
  const speed = getCupSpeed(cupForm.activeMold);
  const theoreticalOutput = Math.round(speed * cupForm.durationMinutes);
  const efficiency = theoreticalOutput > 0
    ? Math.round((cupForm.actualCupsProduced / theoreticalOutput) * 100)
    : 0;

  // Plate calc
  const platesProduced = plateForm.bundlesProduced * 20;
  const sheetsConsumed = plateForm.bundlesProduced * 10;

  const handleAddCup = () => {
    const entry: CupProductionSession = {
      ...cupForm,
      id: editCupId ?? generateId(),
      theoreticalOutput,
      efficiency,
    };
    let updated: CupProductionSession[];
    if (editCupId) {
      updated = cupSessions.map(s => s.id === editCupId ? entry : s);
      setEditCupId(null);
    } else {
      updated = [entry, ...cupSessions];
      // Deduct paraffin and mobil oil from stock
      deductRM('paraffinOil', cupForm.paraffinOilUsed);
      deductRM('mobilOil', cupForm.mobilOilUsed);
    }
    saveCupProduction(updated);
    setCupSessions(updated);
    setCupModal(false);
    setCupForm(EMPTY_CUP);
  };

  const handleAddPlate = () => {
    const entry: PlateProductionSession = {
      ...plateForm,
      id: editPlateId ?? generateId(),
      platesProduced,
      sheetsConsumed,
    };
    let updated: PlateProductionSession[];
    if (editPlateId) {
      updated = plateSessions.map(s => s.id === editPlateId ? entry : s);
      setEditPlateId(null);
    } else {
      updated = [entry, ...plateSessions];
      // Deduct plate sheets (convert sheets consumed to bundles: 1 bundle = 100 sheets)
      deductRM('plateSheets', sheetsConsumed / 100);
    }
    savePlateProduction(updated);
    setPlateSessions(updated);
    setPlateModal(false);
    setPlateForm(EMPTY_PLATE);
  };

  const deductRM = (type: RawMaterialType, qty: number) => {
    if (qty <= 0) return;
    const stock = getRMStock();
    const updated = stock.map(s =>
      s.materialType === type
        ? { ...s, actualQty: Math.max(0, s.actualQty - qty), declaredQty: Math.max(0, s.declaredQty - qty) }
        : s
    );
    saveRMStock(updated);
  };

  const handleDeleteCup = (id: string) => {
    const updated = cupSessions.filter(s => s.id !== id);
    saveCupProduction(updated);
    setCupSessions(updated);
    setDeleteCupId(null);
  };

  const handleDeletePlate = (id: string) => {
    const updated = plateSessions.filter(s => s.id !== id);
    savePlateProduction(updated);
    setPlateSessions(updated);
    setDeletePlateId(null);
  };

  // Today's stats
  const today = todayDDMMYYYY();
  const todayCups = cupSessions.filter(s => s.date === today);
  const todayPlates = plateSessions.filter(s => s.date === today);
  const todayCupsTotal = todayCups.reduce((sum, s) => sum + s.actualCupsProduced, 0);
  const todayPlatesTotal = todayPlates.reduce((sum, s) => sum + s.platesProduced, 0);

  // Monthly stats
  const month = currentMonth();
  const monthlyCups = cupSessions.filter(s => {
    const [dd, mm, yyyy] = s.date.split('/');
    return `${yyyy}-${mm}` === month;
  });
  const monthlyPlates = plateSessions.filter(s => {
    const [dd, mm, yyyy] = s.date.split('/');
    return `${yyyy}-${mm}` === month;
  });
  const monthlyCupsTotal = monthlyCups.reduce((sum, s) => sum + s.actualCupsProduced, 0);
  const monthlyPlatesTotal = monthlyPlates.reduce((sum, s) => sum + s.platesProduced, 0);
  const avgEfficiency = monthlyCups.length > 0
    ? Math.round(monthlyCups.reduce((sum, s) => sum + s.efficiency, 0) / monthlyCups.length)
    : 0;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Cups Today" value={formatNumber(todayCupsTotal)} color="blue" icon={<Factory size={16} />} />
        <StatCard label="Plates Today" value={formatNumber(todayPlatesTotal)} color="blue" icon={<Factory size={16} />} />
        <StatCard label="Cups This Month" value={formatNumber(monthlyCupsTotal)} subtext="All sizes" />
        <StatCard label="Avg Efficiency" value={`${avgEfficiency}%`} color={avgEfficiency > 80 ? 'green' : avgEfficiency > 60 ? 'amber' : 'red'} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { key: 'cups', label: 'Cup Machines' },
            { key: 'plates', label: 'Plate Machine' },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'cups' ? (
          <Button onClick={() => { setCupForm(EMPTY_CUP); setEditCupId(null); setCupModal(true); }}>
            <Plus size={14} /> Add Cup Entry
          </Button>
        ) : (
          <Button onClick={() => { setPlateForm(EMPTY_PLATE); setEditPlateId(null); setPlateModal(true); }}>
            <Plus size={14} /> Add Plate Entry
          </Button>
        )}
      </div>

      {tab === 'cups' && (
        <Card>
          <SectionHeader title="Cup Production Records" subtitle="Machine A: 50/60ml  |  Machine B: 210ml  |  Machine C: 250ml" />
          <Table
            searchable
            exportFilename="cup-production.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'machineId', label: 'Machine', render: (r: Record<string, unknown>) => `Machine ${r.machineId}` },
              {
                key: 'activeMold', label: 'Mold/Size',
                render: (r: Record<string, unknown>) => <Badge variant="blue">{r.activeMold as string}</Badge>,
              },
              { key: 'operatorName', label: 'Operator' },
              { key: 'durationMinutes', label: 'Duration (min)' },
              {
                key: 'theoreticalOutput', label: 'Theoretical',
                render: (r: Record<string, unknown>) => formatNumber(r.theoreticalOutput as number),
              },
              {
                key: 'actualCupsProduced', label: 'Actual',
                render: (r: Record<string, unknown>) => (
                  <span className="font-semibold">{formatNumber(r.actualCupsProduced as number)}</span>
                ),
              },
              {
                key: 'efficiency', label: 'Efficiency',
                render: (r: Record<string, unknown>) => {
                  const e = r.efficiency as number;
                  return <Badge variant={e >= 80 ? 'green' : e >= 60 ? 'amber' : 'red'}>{e}%</Badge>;
                },
              },
              {
                key: 'paraffinOilUsed', label: 'Paraffin (L)',
                render: (r: Record<string, unknown>) => r.paraffinOilUsed as number,
              },
              {
                key: 'mobilOilUsed', label: 'Mobil (L)',
                render: (r: Record<string, unknown>) => r.mobilOilUsed as number,
              },
              {
                key: 'actions', label: '', sortable: false,
                render: (r: Record<string, unknown>) => (
                  <div className="flex gap-2">
                    <button onClick={() => { const s = cupSessions.find(x => x.id === r.id)!; setCupForm({ ...s }); setEditCupId(s.id); setCupModal(true); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setDeleteCupId(r.id as string)} className="text-xs text-red-600 hover:underline">Del</button>
                  </div>
                ),
              },
            ]}
            data={cupSessions as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'plates' && (
        <Card>
          <SectionHeader title="Plate Production Records" subtitle="13 inch plates — 1 bundle = 20 plates, 1 sheet = 2 plates" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-3 border text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Plates This Month</div>
              <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>{formatNumber(monthlyPlatesTotal)}</div>
            </div>
          </div>
          <Table
            searchable
            exportFilename="plate-production.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'operator1', label: 'Operator 1' },
              { key: 'operator2', label: 'Operator 2', render: (r: Record<string, unknown>) => r.operator2 as string || '—' },
              { key: 'hoursWorked', label: 'Hours' },
              {
                key: 'bundlesProduced', label: 'Bundles',
                render: (r: Record<string, unknown>) => formatNumber(r.bundlesProduced as number),
              },
              {
                key: 'platesProduced', label: 'Plates',
                render: (r: Record<string, unknown>) => (
                  <span className="font-semibold">{formatNumber(r.platesProduced as number)}</span>
                ),
              },
              {
                key: 'sheetsConsumed', label: 'Sheets Used',
                render: (r: Record<string, unknown>) => formatNumber(r.sheetsConsumed as number),
              },
              {
                key: 'actions', label: '', sortable: false,
                render: (r: Record<string, unknown>) => (
                  <div className="flex gap-2">
                    <button onClick={() => { const s = plateSessions.find(x => x.id === r.id)!; setPlateForm({ ...s }); setEditPlateId(s.id); setPlateModal(true); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setDeletePlateId(r.id as string)} className="text-xs text-red-600 hover:underline">Del</button>
                  </div>
                ),
              },
            ]}
            data={plateSessions as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Cup Session Modal */}
      <Modal open={cupModal} onClose={() => setCupModal(false)} title={editCupId ? 'Edit Cup Entry' : 'Add Cup Production Entry'} width="max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(cupForm.date)} onChange={e => setCupForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Select label="Machine" value={cupForm.machineId} onChange={e => {
            const id = e.target.value as 'A' | 'B' | 'C';
            const defaultMold = id === 'A' ? '50ml' : id === 'B' ? '210ml' : '250ml';
            setCupForm(f => ({ ...f, machineId: id, activeMold: defaultMold as CupSize }));
          }}>
            {MACHINES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
          <Select label="Cup Size" value={cupForm.activeMold} onChange={e => setCupForm(f => ({ ...f, activeMold: e.target.value as CupSize }))}>
            {CUP_SIZES.filter(s => s.machine === cupForm.machineId).map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
          <Input label="Operator Name" value={cupForm.operatorName} onChange={e => setCupForm(f => ({ ...f, operatorName: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" min="0" value={cupForm.durationMinutes} onChange={e => setCupForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))} />
          <Input label="Cups Made" type="number" min="0" value={cupForm.actualCupsProduced} onChange={e => setCupForm(f => ({ ...f, actualCupsProduced: parseInt(e.target.value) || 0 }))} />
          <div className="col-span-2 grid grid-cols-3 gap-3 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Speed</div>
              <div className="font-semibold">{speed} cups/min</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Theoretical</div>
              <div className="font-semibold">{formatNumber(theoreticalOutput)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Efficiency</div>
              <div className="font-semibold" style={{ color: efficiency >= 80 ? 'var(--green)' : efficiency >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {efficiency}%
              </div>
            </div>
          </div>
          <Input label="Paraffin Oil Used (litres)" type="number" min="0" step="0.1" value={cupForm.paraffinOilUsed} onChange={e => setCupForm(f => ({ ...f, paraffinOilUsed: parseFloat(e.target.value) || 0 }))} />
          <Input label="Mobil Oil Used (litres)" type="number" min="0" step="0.1" value={cupForm.mobilOilUsed} onChange={e => setCupForm(f => ({ ...f, mobilOilUsed: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setCupModal(false)}>Cancel</Button>
          <Button onClick={handleAddCup} disabled={!cupForm.operatorName}>
            {editCupId ? 'Update' : 'Save Entry'}
          </Button>
        </div>
      </Modal>

      {/* Plate Session Modal */}
      <Modal open={plateModal} onClose={() => setPlateModal(false)} title={editPlateId ? 'Edit Plate Entry' : 'Add Plate Production Entry'} width="max-w-xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(plateForm.date)} onChange={e => setPlateForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Operator 1" value={plateForm.operator1} onChange={e => setPlateForm(f => ({ ...f, operator1: e.target.value }))} />
          <Input label="Operator 2 (optional)" value={plateForm.operator2 ?? ''} onChange={e => setPlateForm(f => ({ ...f, operator2: e.target.value }))} />
          <Input label="Hours Worked" type="number" min="0" step="0.5" value={plateForm.hoursWorked} onChange={e => setPlateForm(f => ({ ...f, hoursWorked: parseFloat(e.target.value) || 0 }))} />
          <Input label="Bundles Made (1 bundle = 20 plates)" type="number" min="0" value={plateForm.bundlesProduced} onChange={e => setPlateForm(f => ({ ...f, bundlesProduced: parseInt(e.target.value) || 0 }))} />
          <div className="col-span-2 grid grid-cols-3 gap-3 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Plates Produced</div>
              <div className="font-semibold text-lg" style={{ color: 'var(--green)' }}>{formatNumber(platesProduced)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Sheets Consumed</div>
              <div className="font-semibold">{formatNumber(sheetsConsumed)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Expected (1 op)</div>
              <div className="font-semibold">{formatNumber(plateForm.hoursWorked * 400)}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setPlateModal(false)}>Cancel</Button>
          <Button onClick={handleAddPlate} disabled={!plateForm.operator1}>
            {editPlateId ? 'Update' : 'Save Entry'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteCupId} message="Delete this entry?" onConfirm={() => deleteCupId && handleDeleteCup(deleteCupId)} onCancel={() => setDeleteCupId(null)} />
      <ConfirmDialog open={!!deletePlateId} message="Delete this entry?" onConfirm={() => deletePlateId && handleDeletePlate(deletePlateId)} onCancel={() => setDeletePlateId(null)} />
    </div>
  );
}
