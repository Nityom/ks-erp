'use client';
import { useState, useEffect } from 'react';
import {
  getMonthlyWorkers, saveMonthlyWorkers,
  getAttendance, saveAttendance,
  getSalaryAdvances, saveSalaryAdvances,
  getSalaryPayments, saveSalaryPayments,
  getPieceRateWorkers, savePieceRateWorkers,
  getPieceRateEntries, savePieceRateEntries,
  getPieceRatePayments, savePieceRatePayments,
} from '@/lib/storage';
import type {
  MonthlyWorker, AttendanceEntry, SalaryAdvance, SalaryPayment,
  PieceRateWorker, PieceRateEntry, PieceRatePayment, ProductType,
} from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Tabs, Badge, ConfirmDialog, StatCard,
} from '@/components/UI';
import {
  formatINR, formatNumber, generateId, todayDDMMYYYY,
  fromInputDate, toInputDate, currentMonth, monthLabel,
} from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Plus, Printer } from 'lucide-react';

const PRODUCTS: { value: ProductType; label: string }[] = [
  { value: '50ml', label: 'Cup 50 ml' },
  { value: '60ml', label: 'Cup 60 ml' },
  { value: '210ml', label: 'Cup 210 ml' },
  { value: '250ml', label: 'Cup 250 ml' },
  { value: 'plate', label: 'Buffet Plate' },
];

export default function WorkersPage() {
  const { settings } = useApp();
  const [tab, setTab] = useState('monthly');
  const [workers, setWorkers] = useState<MonthlyWorker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [prWorkers, setPrWorkers] = useState<PieceRateWorker[]>([]);
  const [prEntries, setPrEntries] = useState<PieceRateEntry[]>([]);
  const [prPayments, setPrPayments] = useState<PieceRatePayment[]>([]);

  const [workerModal, setWorkerModal] = useState(false);
  const [attModal, setAttModal] = useState(false);
  const [advModal, setAdvModal] = useState(false);
  const [salPayModal, setSalPayModal] = useState<MonthlyWorker | null>(null);
  const [payAmt, setPayAmt] = useState(0);
  const [prWorkerModal, setPrWorkerModal] = useState(false);
  const [prEntryModal, setPrEntryModal] = useState(false);
  const [prPayModal, setPrPayModal] = useState<PieceRateWorker | null>(null);
  const [slipWorker, setSlipWorker] = useState<{ worker: MonthlyWorker; month: string } | null>(null);

  const [workerForm, setWorkerForm] = useState<Omit<MonthlyWorker, 'id'>>({ name: '', role: '', monthlySalary: 0, joinDate: todayDDMMYYYY(), phone: '', active: true });
  const [attForm, setAttForm] = useState<Omit<AttendanceEntry, 'id'>>({ workerId: '', month: currentMonth(), presentDays: 0, absentDays: 0, halfDays: 0, totalWorkingDays: 26 });
  const [advForm, setAdvForm] = useState<Omit<SalaryAdvance, 'id' | 'amountDeducted' | 'fullyDeducted'>>({ workerId: '', date: todayDDMMYYYY(), amount: 0, deductOver: 1 });
  const [prWorkerForm, setPrWorkerForm] = useState<Omit<PieceRateWorker, 'id'>>({ name: '', phone: '', active: true });
  const [prEntryForm, setPrEntryForm] = useState<Omit<PieceRateEntry, 'id' | 'earningsAmount'>>({ workerId: '', date: todayDDMMYYYY(), productType: '50ml', packCount: 0, unitsPerPack: 0, quantityProduced: 0 });
  const [prPayForm, setPrPayForm] = useState<Omit<PieceRatePayment, 'id'>>({ workerId: '', date: todayDDMMYYYY(), amountPaid: 0 });

  useEffect(() => {
    setWorkers(getMonthlyWorkers());
    setAttendance(getAttendance());
    setAdvances(getSalaryAdvances());
    setSalaryPayments(getSalaryPayments());
    setPrWorkers(getPieceRateWorkers());
    setPrEntries(getPieceRateEntries());
    setPrPayments(getPieceRatePayments());
  }, []);

  // ─── MONTHLY WORKER ──────────────────────────────────────────────────────────

  const saveWorker = () => {
    const updated = [...workers, { ...workerForm, id: generateId() }];
    saveMonthlyWorkers(updated); setWorkers(updated);
    setWorkerModal(false);
    setWorkerForm({ name: '', role: '', monthlySalary: 0, joinDate: todayDDMMYYYY(), phone: '', active: true });
  };

  const saveAttendanceEntry = () => {
    const updated = [...attendance, { ...attForm, id: generateId() }];
    saveAttendance(updated); setAttendance(updated);
    setAttModal(false);
  };

  const saveAdvance = () => {
    const updated = [...advances, { ...advForm, id: generateId(), amountDeducted: 0, fullyDeducted: false }];
    saveSalaryAdvances(updated); setAdvances(updated);
    setAdvModal(false);
  };

  const calcNetSalary = (worker: MonthlyWorker, month: string): { gross: number; deductions: number; net: number } => {
    const att = attendance.find(a => a.workerId === worker.id && a.month === month);
    if (!att) return { gross: 0, deductions: 0, net: 0 };
    const dailyRate = worker.monthlySalary / att.totalWorkingDays;
    const daysWorked = att.presentDays + att.halfDays * 0.5;
    const gross = dailyRate * daysWorked;
    // Advances pending deduction for this month
    const pendingAdvances = advances.filter(a => a.workerId === worker.id && !a.fullyDeducted);
    const deductions = pendingAdvances.reduce((sum, a) => {
      const monthlyDeduction = a.amount / a.deductOver;
      const remaining = a.amount - a.amountDeducted;
      return sum + Math.min(monthlyDeduction, remaining);
    }, 0);
    return { gross: Math.round(gross), deductions: Math.round(deductions), net: Math.round(gross - deductions) };
  };

  const saveSalaryPay = (worker: MonthlyWorker, month: string, amountPaid: number) => {
    const { gross, deductions, net } = calcNetSalary(worker, month);
    const existing = salaryPayments.find(p => p.workerId === worker.id && p.month === month);
    const totalPaid = (existing?.amountPaid ?? 0) + amountPaid;
    const entry: SalaryPayment = {
      id: generateId(),
      workerId: worker.id,
      month,
      grossAmount: gross,
      deductions,
      netAmount: net,
      amountPaid: totalPaid,
      pendingAmount: Math.max(0, net - totalPaid),
      date: todayDDMMYYYY(),
    };
    const updated = existing
      ? salaryPayments.map(p => p.id === existing.id ? entry : p)
      : [...salaryPayments, entry];
    saveSalaryPayments(updated); setSalaryPayments(updated);
    setSalPayModal(null);
  };

  // ─── PIECE RATE ───────────────────────────────────────────────────────────────

  const getPieceRate = (product: ProductType): number => {
    const map: Record<ProductType, number> = {
      '50ml': settings.piecerate50ml / 1000,
      '60ml': settings.piecerate60ml / 1000,
      '210ml': settings.piecerate210ml / 1000,
      '250ml': settings.piecerate250ml / 1000,
      'plate': settings.pieceratePlate,
    };
    return map[product] ?? 0;
  };

  const savePrWorker = () => {
    const updated = [...prWorkers, { ...prWorkerForm, id: generateId() }];
    savePieceRateWorkers(updated); setPrWorkers(updated);
    setPrWorkerModal(false);
    setPrWorkerForm({ name: '', phone: '', active: true });
  };

  const savePrEntry = () => {
    const isPlate = prEntryForm.productType === 'plate';
    const packCount = prEntryForm.packCount ?? 0;
    const unitsPerPack = prEntryForm.unitsPerPack ?? 1;
    const totalUnits = prEntryForm.quantityProduced > 0 ? prEntryForm.quantityProduced : packCount * unitsPerPack;
    // Plates: paid per bora (packCount); Cups: paid per total cups produced
    const earnings = isPlate
      ? packCount * settings.pieceratePlate
      : totalUnits * getPieceRate(prEntryForm.productType);
    const entry: PieceRateEntry = {
      ...prEntryForm,
      id: generateId(),
      packCount,
      unitsPerPack,
      quantityProduced: totalUnits,
      earningsAmount: earnings,
    };
    const updated = [...prEntries, entry];
    savePieceRateEntries(updated); setPrEntries(updated);
    setPrEntryModal(false);
    setPrEntryForm({ workerId: '', date: todayDDMMYYYY(), productType: '50ml', packCount: 0, unitsPerPack: settings.defaultCupsPerBundle, quantityProduced: 0 });
  };

  const savePrPayment = (workerId: string, amount: number) => {
    const entry: PieceRatePayment = { id: generateId(), workerId, date: todayDDMMYYYY(), amountPaid: amount };
    const updated = [...prPayments, entry];
    savePieceRatePayments(updated); setPrPayments(updated);
    setPrPayModal(null);
  };

  const getPrBalance = (workerId: string): number => {
    const earned = prEntries.filter(e => e.workerId === workerId).reduce((s, e) => s + e.earningsAmount, 0);
    const paid = prPayments.filter(p => p.workerId === workerId).reduce((s, p) => s + p.amountPaid, 0);
    return earned - paid;
  };

  const month = currentMonth();
  const totalSalaryCost = workers.reduce((sum, w) => {
    const sp = salaryPayments.find(p => p.workerId === w.id && p.month === month);
    return sum + (sp?.netAmount ?? 0);
  }, 0);
  const totalPieceRateCost = prEntries.filter(e => {
    const [dd, mm, yyyy] = e.date.split('/');
    return `${yyyy}-${mm}` === month;
  }).reduce((s, e) => s + e.earningsAmount, 0);

  const prEarnings = (id: string) => prEntryForm.quantityProduced * getPieceRate(prEntryForm.productType);

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Monthly Staff" value={workers.filter(w => w.active).length} />
        <StatCard label="Daily Workers" value={prWorkers.filter(w => w.active).length} />
        <StatCard label="Salary Cost (This Month)" value={formatINR(totalSalaryCost)} color="red" />
        <StatCard label="Daily Worker Cost (This Month)" value={formatINR(totalPieceRateCost)} color="red" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { key: 'monthly', label: 'Monthly Staff' },
            { key: 'piecerate', label: 'Daily Workers' },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'monthly' ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAttModal(true)}>+ Mark Attendance</Button>
            <Button variant="secondary" size="sm" onClick={() => setAdvModal(true)}>+ Add Advance</Button>
            <Button onClick={() => setWorkerModal(true)}><Plus size={14} /> Add Worker</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => {
              setPrEntryForm({ workerId: '', date: todayDDMMYYYY(), productType: '50ml', packCount: 0, unitsPerPack: settings.defaultCupsPerBundle, quantityProduced: 0 });
              setPrEntryModal(true);
            }}>+ Add Work Entry</Button>
            <Button onClick={() => setPrWorkerModal(true)}><Plus size={14} /> Add Worker</Button>
          </div>
        )}
      </div>

      {/* Monthly Workers */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          <Card>
            <SectionHeader title="Monthly Staff" subtitle={`${monthLabel(month)} summary`} />
            <Table
              searchable
              exportFilename="monthly-workers.csv"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'role', label: 'Role' },
                { key: 'monthlySalary', label: 'Salary', render: (r: Record<string, unknown>) => formatINR(r.monthlySalary as number) },
                {
                  key: 'attendance', label: 'Attendance',
                  render: (r: Record<string, unknown>) => {
                    const att = attendance.find(a => a.workerId === r.id && a.month === month);
                    return att ? `${att.presentDays}P / ${att.absentDays}A / ${att.halfDays}H` : <Badge variant="amber">Not Entered</Badge>;
                  },
                },
                {
                  key: 'netSalary', label: 'Net Payable',
                  render: (r: Record<string, unknown>) => {
                    const w = workers.find(w => w.id === r.id);
                    if (!w) return '—';
                    const { net } = calcNetSalary(w, month);
                    return <span className="font-bold" style={{ color: 'var(--green)' }}>{formatINR(net)}</span>;
                  },
                },
                {
                  key: 'paid', label: 'Paid',
                  render: (r: Record<string, unknown>) => {
                    const sp = salaryPayments.find(p => p.workerId === r.id && p.month === month);
                    return sp ? formatINR(sp.amountPaid) : '₹0';
                  },
                },
                {
                  key: 'actions', label: '', sortable: false,
                  render: (r: Record<string, unknown>) => {
                    const w = workers.find(w => w.id === r.id)!;
                    return (
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const { net } = calcNetSalary(w, month);
                          const sp = salaryPayments.find(p => p.workerId === w.id && p.month === month);
                          setPayAmt(Math.max(0, net - (sp?.amountPaid ?? 0)));
                          setSalPayModal(w);
                        }} className="text-xs text-green-600 hover:underline">Pay</button>
                        <button onClick={() => setSlipWorker({ worker: w, month })} className="text-xs text-blue-600 hover:underline">Slip</button>
                      </div>
                    );
                  },
                },
              ]}
              data={workers as unknown as Record<string, unknown>[]}
            />
          </Card>

          {/* Advances */}
          <Card>
            <SectionHeader title="Advance Payments" />
            <Table
              exportFilename="advances.csv"
              columns={[
                { key: 'date', label: 'Date' },
                {
                  key: 'workerId', label: 'Worker',
                  render: (r: Record<string, unknown>) => workers.find(w => w.id === r.workerId)?.name ?? '—',
                },
                { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatINR(r.amount as number) },
                { key: 'deductOver', label: 'Deduct Over', render: (r: Record<string, unknown>) => `${r.deductOver} months` },
                { key: 'amountDeducted', label: 'Deducted', render: (r: Record<string, unknown>) => formatINR(r.amountDeducted as number ?? 0) },
                {
                  key: 'remaining', label: 'Remaining',
                  render: (r: Record<string, unknown>) => formatINR((r.amount as number) - (r.amountDeducted as number ?? 0)),
                },
                {
                  key: 'status', label: 'Status',
                  render: (r: Record<string, unknown>) => r.fullyDeducted ? <Badge variant="green">Done</Badge> : <Badge variant="amber">Pending</Badge>,
                },
              ]}
              data={advances as unknown as Record<string, unknown>[]}
            />
          </Card>
        </div>
      )}

      {/* Piece Rate Workers */}
      {tab === 'piecerate' && (
        <div className="space-y-4">
          <Card>
            <SectionHeader title="Daily Workers — Balance" />
            <Table
              searchable
              exportFilename="piecerate-workers.csv"
              columns={[
                { key: 'name', label: 'Name' },
                {
                  key: 'earned', label: 'Total Earned',
                  render: (r: Record<string, unknown>) => {
                    const earned = prEntries.filter(e => e.workerId === r.id).reduce((s, e) => s + e.earningsAmount, 0);
                    return formatINR(earned);
                  },
                },
                {
                  key: 'paid', label: 'Total Paid',
                  render: (r: Record<string, unknown>) => {
                    const paid = prPayments.filter(p => p.workerId === r.id).reduce((s, p) => s + p.amountPaid, 0);
                    return formatINR(paid);
                  },
                },
                {
                  key: 'balance', label: 'Balance Due',
                  render: (r: Record<string, unknown>) => {
                    const bal = getPrBalance(r.id as string);
                    return <span className="font-bold" style={{ color: bal > 0 ? 'var(--red)' : 'var(--green)' }}>{formatINR(bal)}</span>;
                  },
                },
                {
                  key: 'actions', label: '', sortable: false,
                  render: (r: Record<string, unknown>) => {
                    const w = prWorkers.find(w => w.id === r.id)!;
                    return (
                      <button onClick={() => { setPrPayModal(w); setPrPayForm({ workerId: w.id, date: todayDDMMYYYY(), amountPaid: getPrBalance(w.id) }); }} className="text-xs text-green-600 hover:underline">Pay</button>
                    );
                  },
                },
              ]}
              data={prWorkers as unknown as Record<string, unknown>[]}
            />
          </Card>

          <Card>
            <SectionHeader title="Daily Work Entries" />
            <Table
              searchable
              exportFilename="piecerate-entries.csv"
              columns={[
                { key: 'date', label: 'Date' },
                {
                  key: 'workerId', label: 'Worker',
                  render: (r: Record<string, unknown>) => prWorkers.find(w => w.id === r.workerId)?.name ?? '—',
                },
                { key: 'productType', label: 'Product' },
                { key: 'quantityProduced', label: 'Qty',
                  render: (r: Record<string, unknown>) => {
                    const pc = r.packCount as number;
                    const up = r.unitsPerPack as number;
                    if (pc > 0 && up > 0) {
                      const unit = r.productType === 'plate' ? 'boras' : 'bundles';
                      const itemUnit = r.productType === 'plate' ? 'plates' : 'cups';
                      return `${pc} ${unit} ×${up} = ${formatNumber(r.quantityProduced as number)} ${itemUnit}`;
                    }
                    return formatNumber(r.quantityProduced as number);
                  },
                },
                { key: 'earningsAmount', label: 'Earnings', render: (r: Record<string, unknown>) => formatINR(r.earningsAmount as number) },
              ]}
              data={prEntries as unknown as Record<string, unknown>[]}
            />
          </Card>
        </div>
      )}

      {/* Modals */}

      {/* Add Monthly Worker */}
      <Modal open={workerModal} onClose={() => setWorkerModal(false)} title="Add Staff Member">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={workerForm.name} onChange={e => setWorkerForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Role / Job" value={workerForm.role} onChange={e => setWorkerForm(f => ({ ...f, role: e.target.value }))} />
          <Input label="Monthly Salary (₹)" type="number" min="0" value={workerForm.monthlySalary} onChange={e => setWorkerForm(f => ({ ...f, monthlySalary: parseFloat(e.target.value) || 0 }))} />
          <Input label="Join Date" type="date" value={toInputDate(workerForm.joinDate)} onChange={e => setWorkerForm(f => ({ ...f, joinDate: fromInputDate(e.target.value) }))} />
          <Input label="Phone (optional)" value={workerForm.phone ?? ''} onChange={e => setWorkerForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setWorkerModal(false)}>Cancel</Button>
          <Button onClick={saveWorker} disabled={!workerForm.name}>Save</Button>
        </div>
      </Modal>

      {/* Attendance */}
      <Modal open={attModal} onClose={() => setAttModal(false)} title="Mark Attendance">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Worker" value={attForm.workerId} onChange={e => setAttForm(f => ({ ...f, workerId: e.target.value }))}>
            <option value="">Select worker</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Input label="Month (YYYY-MM)" type="month" value={attForm.month} onChange={e => setAttForm(f => ({ ...f, month: e.target.value }))} />
          <Input label="Present Days" type="number" min="0" max="31" value={attForm.presentDays} onChange={e => setAttForm(f => ({ ...f, presentDays: parseInt(e.target.value) || 0 }))} />
          <Input label="Absent Days" type="number" min="0" max="31" value={attForm.absentDays} onChange={e => setAttForm(f => ({ ...f, absentDays: parseInt(e.target.value) || 0 }))} />
          <Input label="Half Days" type="number" min="0" max="31" value={attForm.halfDays} onChange={e => setAttForm(f => ({ ...f, halfDays: parseInt(e.target.value) || 0 }))} />
          <Input label="Total Working Days This Month" type="number" min="1" max="31" value={attForm.totalWorkingDays} onChange={e => setAttForm(f => ({ ...f, totalWorkingDays: parseInt(e.target.value) || 26 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setAttModal(false)}>Cancel</Button>
          <Button onClick={saveAttendanceEntry} disabled={!attForm.workerId}>Save</Button>
        </div>
      </Modal>

      {/* Advance */}
      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Add Advance Payment">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Worker" value={advForm.workerId} onChange={e => setAdvForm(f => ({ ...f, workerId: e.target.value }))}>
            <option value="">Select worker</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Input label="Date" type="date" value={toInputDate(advForm.date)} onChange={e => setAdvForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Advance Amount (₹)" type="number" min="0" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
          <Input label="Spread over (months)" type="number" min="1" value={advForm.deductOver} onChange={e => setAdvForm(f => ({ ...f, deductOver: parseInt(e.target.value) || 1 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setAdvModal(false)}>Cancel</Button>
          <Button onClick={saveAdvance} disabled={!advForm.workerId}>Save</Button>
        </div>
      </Modal>

      {/* Salary Pay */}
      {salPayModal && (
        <Modal open={!!salPayModal} onClose={() => setSalPayModal(null)} title={`Pay Salary — ${salPayModal.name}`}>
          {(() => {
            const { gross, deductions, net } = calcNetSalary(salPayModal, month);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                  <div className="text-center"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Gross</div><div className="font-bold">{formatINR(gross)}</div></div>
                  <div className="text-center"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Deductions</div><div className="font-bold" style={{ color: 'var(--red)' }}>{formatINR(deductions)}</div></div>
                  <div className="text-center"><div className="text-xs" style={{ color: 'var(--text-muted)' }}>Net Payable</div><div className="font-bold" style={{ color: 'var(--green)' }}>{formatINR(net)}</div></div>
                </div>
                <Input label="Amount to Pay (₹)" type="number" min="0" value={payAmt} onChange={e => setPayAmt(parseFloat(e.target.value) || 0)} />
                <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <Button variant="secondary" onClick={() => setSalPayModal(null)}>Cancel</Button>
                  <Button onClick={() => saveSalaryPay(salPayModal, month, payAmt)}>Record Payment</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Piece Rate Worker */}
      <Modal open={prWorkerModal} onClose={() => setPrWorkerModal(false)} title="Add Daily Worker">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Name" value={prWorkerForm.name} onChange={e => setPrWorkerForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Phone (optional)" value={prWorkerForm.phone ?? ''} onChange={e => setPrWorkerForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setPrWorkerModal(false)}>Cancel</Button>
          <Button onClick={savePrWorker} disabled={!prWorkerForm.name}>Save</Button>
        </div>
      </Modal>

      {/* PR Entry */}
      <Modal open={prEntryModal} onClose={() => setPrEntryModal(false)} title="Add Daily Work Entry">
        {(() => {
          const isPlate = prEntryForm.productType === 'plate';
          const packLabel = isPlate ? 'Number of Boras' : 'Number of Bundles';
          const unitLabel = isPlate ? 'Plates per Bora' : 'Cups per Bundle';
          const totalLabel = isPlate ? 'Total Plates' : 'Total Cups';
          const packCount = prEntryForm.packCount ?? 0;
          const unitsPerPack = prEntryForm.unitsPerPack ?? 0;
          const autoTotal = packCount * unitsPerPack;
          const totalUnits = prEntryForm.quantityProduced > 0 ? prEntryForm.quantityProduced : autoTotal;
          const previewEarnings = isPlate
            ? packCount * settings.pieceratePlate
            : totalUnits * getPieceRate(prEntryForm.productType);
          return (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" type="date" value={toInputDate(prEntryForm.date)} onChange={e => setPrEntryForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
              <Select label="Worker" value={prEntryForm.workerId} onChange={e => setPrEntryForm(f => ({ ...f, workerId: e.target.value }))}>
                <option value="">Select worker</option>
                {prWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
              <Select label="Product" value={prEntryForm.productType} onChange={e => {
                const pt = e.target.value as ProductType;
                const isP = pt === 'plate';
                setPrEntryForm(f => ({
                  ...f,
                  productType: pt,
                  unitsPerPack: isP ? (settings.defaultPlatesPerBora || 20) : (settings.defaultCupsPerBundle || 25),
                  quantityProduced: 0,
                }));
              }}>
                {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>

              {/* Pack count — same row as product */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{packLabel}</label>
                <input
                  type="number" min="0" step="1"
                  value={packCount || ''}
                  placeholder="0"
                  onChange={e => {
                    const pc = parseInt(e.target.value) || 0;
                    setPrEntryForm(f => ({ ...f, packCount: pc, quantityProduced: pc * (f.unitsPerPack ?? 0) }));
                  }}
                  className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Units per pack — fills the right slot */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {unitLabel} <span className="opacity-60">(flexible)</span>
                </label>
                <input
                  type="number" min="1" step="1"
                  value={unitsPerPack || ''}
                  placeholder={isPlate ? String(settings.defaultPlatesPerBora || 20) : String(settings.defaultCupsPerBundle || 25)}
                  onChange={e => {
                    const up = parseInt(e.target.value) || 0;
                    setPrEntryForm(f => ({ ...f, unitsPerPack: up, quantityProduced: (f.packCount ?? 0) * up }));
                  }}
                  className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Direct total override — right slot */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {totalLabel} <span className="opacity-60">(auto-filled — edit to override)</span>
                </label>
                <input
                  type="number" min="0" step="1"
                  value={prEntryForm.quantityProduced || ''}
                  placeholder={autoTotal > 0 ? String(autoTotal) : '0'}
                  onChange={e => setPrEntryForm(f => ({ ...f, quantityProduced: parseInt(e.target.value) || 0 }))}
                  className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Earnings preview */}
              <div className="col-span-2 p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Calculated Earnings</div>
                <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>
                  {formatINR(previewEarnings)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {isPlate
                    ? `₹${settings.pieceratePlate}/bora × ${packCount} boras`
                    : `₹${(getPieceRate(prEntryForm.productType) * 1000).toFixed(0)}/1000 cups × ${formatNumber(totalUnits)} cups`
                  }
                </div>
              </div>
            </div>
          );
        })()}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setPrEntryModal(false)}>Cancel</Button>
          <Button onClick={savePrEntry} disabled={!prEntryForm.workerId || ((prEntryForm.packCount ?? 0) <= 0 && prEntryForm.quantityProduced <= 0)}>Save</Button>
        </div>
      </Modal>

      {/* PR Payment */}
      {prPayModal && (
        <Modal open={!!prPayModal} onClose={() => setPrPayModal(null)} title={`Pay — ${prPayModal.name}`}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Balance Due</div>
              <div className="text-xl font-bold" style={{ color: 'var(--red)' }}>{formatINR(getPrBalance(prPayModal.id))}</div>
            </div>
            <Input label="Amount to Pay (₹)" type="number" min="0" value={prPayForm.amountPaid} onChange={e => setPrPayForm(f => ({ ...f, amountPaid: parseFloat(e.target.value) || 0 }))} />
            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button variant="secondary" onClick={() => setPrPayModal(null)}>Cancel</Button>
              <Button onClick={() => savePrPayment(prPayModal.id, prPayForm.amountPaid)}>Record Payment</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Salary Slip */}
      {slipWorker && (
        <Modal open={!!slipWorker} onClose={() => setSlipWorker(null)} title="Salary Slip">
          {(() => {
            const { worker, month: m } = slipWorker;
            const { gross, deductions, net } = calcNetSalary(worker, m);
            const att = attendance.find(a => a.workerId === worker.id && a.month === m);
            const sp = salaryPayments.find(p => p.workerId === worker.id && p.month === m);
            return (
              <div className="space-y-3 text-sm">
                <div className="text-center font-bold text-base">SALARY SLIP — {monthLabel(m)}</div>
                <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-semibold">{worker.name}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{worker.role}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Present Days: {att?.presentDays ?? 0}</div>
                  <div>Absent: {att?.absentDays ?? 0}</div>
                  <div>Half Days: {att?.halfDays ?? 0}</div>
                  <div>Working Days: {att?.totalWorkingDays ?? 0}</div>
                </div>
                <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between"><span>Gross Salary</span><span>{formatINR(gross)}</span></div>
                  <div className="flex justify-between" style={{ color: 'var(--red)' }}><span>Deductions (Advance)</span><span>−{formatINR(deductions)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                    <span>Net Payable</span><span style={{ color: 'var(--green)' }}>{formatINR(net)}</span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Paid: {formatINR(sp?.amountPaid ?? 0)} | Pending: {formatINR(Math.max(0, net - (sp?.amountPaid ?? 0)))}</div>
                <div className="flex justify-end gap-2 pt-4 border-t no-print" style={{ borderColor: 'var(--border)' }}>
                  <Button variant="secondary" onClick={() => setSlipWorker(null)}>Close</Button>
                  <Button onClick={() => window.print()}><Printer size={14} /> Print</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
