'use client';
import { useState, useEffect } from 'react';
import {
  getRMPurchases, getSales, getSalaryPayments, getPieceRateEntries,
  getHeaters, getComponents, getPlateMaintenance,
  getPackagingSessions, getCupProduction, getPlateProduction,
  getElectricityBills, saveElectricityBills,
  getMiscExpenses, saveMiscExpenses,
} from '@/lib/storage';
import type { ElectricityBill, MiscExpense } from '@/lib/types';
import {
  Card, Button, Input, Modal, Table, SectionHeader, StatCard, Tabs,
} from '@/components/UI';
import {
  formatINR, formatNumber, generateId, todayDDMMYYYY,
  fromInputDate, toInputDate, currentMonth, monthLabel,
} from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Plus } from 'lucide-react';

interface ExpenseRow {
  category: string;
  amount: number;
  source: string;
}

export default function ExpensesPage() {
  const { settings } = useApp();
  const [elecBills, setElecBills] = useState<ElectricityBill[]>([]);
  const [miscExpenses, setMiscExpenses] = useState<MiscExpense[]>([]);
  const [tab, setTab] = useState('overview');
  const [elecModal, setElecModal] = useState(false);
  const [miscModal, setMiscModal] = useState(false);
  const [elecForm, setElecForm] = useState<Omit<ElectricityBill, 'id'>>({ billingPeriod: currentMonth(), unitsConsumed: 0, amount: 0, date: todayDDMMYYYY() });
  const [miscForm, setMiscForm] = useState<Omit<MiscExpense, 'id'>>({ date: todayDDMMYYYY(), description: '', amount: 0 });

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  useEffect(() => {
    setElecBills(getElectricityBills());
    setMiscExpenses(getMiscExpenses());
  }, []);

  const isInMonth = (date: string) => {
    const [dd, mm, yyyy] = date.split('/');
    return `${yyyy}-${mm}` === selectedMonth;
  };

  // Auto-calculated expenses from modules
  const calcExpenses = (): ExpenseRow[] => {
    const rows: ExpenseRow[] = [];

    // Raw materials
    const rmCost = getRMPurchases().filter(p => isInMonth(p.date)).reduce((sum, p) => {
      return sum + p.quantityReceived * p.pricePerUnit;
    }, 0);
    if (rmCost > 0) rows.push({ category: 'Raw Materials', amount: rmCost, source: 'Auto - Purchases' });

    // Inbound transport
    const inboundFreight = getRMPurchases().filter(p => isInMonth(p.date)).reduce((sum, p) => sum + (p.inboundFreight ?? 0), 0);
    if (inboundFreight > 0) rows.push({ category: 'Inbound Transport', amount: inboundFreight, source: 'Auto - Purchases' });

    // Outbound transport
    const outboundFreight = getSales().filter(s => isInMonth(s.date)).reduce((sum, s) => sum + (s.outboundFreight ?? 0), 0);
    if (outboundFreight > 0) rows.push({ category: 'Outbound Transport', amount: outboundFreight, source: 'Auto - Sales' });

    // Monthly salaries
    const salaryCost = getSalaryPayments().filter(p => p.month === selectedMonth).reduce((sum, p) => sum + p.netAmount, 0);
    if (salaryCost > 0) rows.push({ category: 'Monthly Salaries', amount: salaryCost, source: 'Auto - Payroll' });

    // Piece rate wages
    const pieceWages = getPieceRateEntries().filter(e => isInMonth(e.date)).reduce((sum, e) => sum + e.earningsAmount, 0);
    if (pieceWages > 0) rows.push({ category: 'Piece Rate Wages', amount: pieceWages, source: 'Auto - Piece Rate' });

    // Maintenance — heaters
    const heaterCost = getHeaters().reduce((sum, h) => {
      return sum + h.history.filter(e => isInMonth(e.date)).reduce((s, e) => s + e.cost, 0);
    }, 0);
    // components
    const compCost = getComponents().reduce((sum, c) => {
      return sum + c.history.filter(e => isInMonth(e.date)).reduce((s, e) => s + e.cost, 0);
    }, 0);
    // plate machine
    const plateCost = getPlateMaintenance().filter(p => isInMonth(p.date)).reduce((s, p) => s + p.cost, 0);
    const totalMaintenance = heaterCost + compCost + plateCost;
    if (totalMaintenance > 0) rows.push({ category: 'Machine Maintenance', amount: totalMaintenance, source: 'Auto - Maintenance' });

    // Packaging materials (PP roll, bora, carton, tape, rope from packaging sessions)
    const pkgSessions = getPackagingSessions().filter(p => isInMonth(p.date));
    const pkgCost = pkgSessions.reduce((sum, p) => {
      const pt = (p.ptRollUsed ?? 0) * settings.ptRollRate;
      const tape = (p.tapeRollsUsed ?? 0) * settings.transparentTapeRate;
      const rope = (p.plasticRopeUsed ?? 0) * settings.plasticRopeRate;
      const carton = (p.cartonsUsed ?? 0) * settings.cartonBoxRate;
      const bora = (p.borasUsed ?? 0) * settings.boraBagRate;
      return sum + pt + tape + rope + carton + bora;
    }, 0);
    if (pkgCost > 0) rows.push({ category: 'Packaging Materials', amount: pkgCost, source: 'Auto - Packaging' });

    // Paraffin & Mobil oil
    const cupSessions = getCupProduction().filter(s => isInMonth(s.date));
    const paraffinCost = cupSessions.reduce((s, c) => s + c.paraffinOilUsed * settings.paraffinOilRatePerLitre, 0);
    const mobilCost = cupSessions.reduce((s, c) => s + c.mobilOilUsed * settings.mobilOilRatePerLitre, 0);
    if (paraffinCost > 0) rows.push({ category: 'Paraffin Oil', amount: paraffinCost, source: 'Auto - Production' });
    if (mobilCost > 0) rows.push({ category: 'Mobil Oil', amount: mobilCost, source: 'Auto - Production' });

    // Electricity
    const elec = elecBills.filter(b => b.billingPeriod === selectedMonth);
    const elecCost = elec.reduce((s, b) => s + b.amount, 0);
    if (elecCost > 0) rows.push({ category: 'Electricity', amount: elecCost, source: 'Manual' });

    // Misc
    const miscCost = miscExpenses.filter(m => isInMonth(m.date)).reduce((s, m) => s + m.amount, 0);
    if (miscCost > 0) rows.push({ category: 'Miscellaneous', amount: miscCost, source: 'Manual' });

    return rows;
  };

  const expenses = calcExpenses();
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // Monthly production for cost/unit
  const cupSessions = getCupProduction().filter(s => isInMonth(s.date));
  const plateSessions = getPlateProduction().filter(s => isInMonth(s.date));
  const totalUnits = cupSessions.reduce((s, c) => s + c.actualCupsProduced, 0)
    + plateSessions.reduce((s, p) => s + p.platesProduced, 0);
  const costPerUnit = totalUnits > 0 ? totalExpense / totalUnits : 0;

  // All months for history
  const allMonths = (() => {
    const set = new Set<string>();
    getRMPurchases().forEach(p => { const [dd, mm, yyyy] = p.date.split('/'); set.add(`${yyyy}-${mm}`); });
    getSales().forEach(s => { const [dd, mm, yyyy] = s.date.split('/'); set.add(`${yyyy}-${mm}`); });
    return [...set].sort().reverse().slice(0, 12);
  })();

  const addElec = () => {
    const updated = [{ ...elecForm, id: generateId() }, ...elecBills];
    saveElectricityBills(updated); setElecBills(updated);
    setElecModal(false);
    setElecForm({ billingPeriod: currentMonth(), unitsConsumed: 0, amount: 0, date: todayDDMMYYYY() });
  };

  const addMisc = () => {
    const updated = [{ ...miscForm, id: generateId() }, ...miscExpenses];
    saveMiscExpenses(updated); setMiscExpenses(updated);
    setMiscModal(false);
    setMiscForm({ date: todayDDMMYYYY(), description: '', amount: 0 });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Expenses" value={formatINR(totalExpense)} color="red" />
        <StatCard label="Cost per Unit Produced" value={formatINR(costPerUnit)} subtext={`${formatNumber(totalUnits)} total units`} />
        <StatCard label="Expense Categories" value={expenses.length} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Tabs
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'electricity', label: 'Electricity' },
              { key: 'misc', label: 'Other Expenses' },
            ]}
            active={tab}
            onChange={setTab}
          />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {allMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            <option value={currentMonth()}>{monthLabel(currentMonth())}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setElecModal(true)}>+ Electricity Bill</Button>
          <Button onClick={() => setMiscModal(true)}><Plus size={14} /> Other Expense</Button>
        </div>
      </div>

      {tab === 'overview' && (
        <Card>
          <SectionHeader title={`Expense Breakdown — ${monthLabel(selectedMonth)}`} subtitle="Auto-total from all sections" />
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              No expenses recorded for {monthLabel(selectedMonth)}
            </div>
          ) : (
            <div className="space-y-2">
              {expenses
                .sort((a, b) => b.amount - a.amount)
                .map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{e.category}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.source}</div>
                    </div>
                    <div className="font-bold" style={{ color: 'var(--red)' }}>{formatINR(e.amount)}</div>
                    <div className="text-xs w-12 text-right" style={{ color: 'var(--text-muted)' }}>
                      {totalExpense > 0 ? `${((e.amount / totalExpense) * 100).toFixed(1)}%` : '0%'}
                    </div>
                    {/* Bar */}
                    <div className="w-24 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${totalExpense > 0 ? (e.amount / totalExpense) * 100 : 0}%`, background: 'var(--red)' }}
                      />
                    </div>
                  </div>
                ))}
              <div className="flex items-center justify-between p-3 rounded-lg font-bold" style={{ background: 'var(--surface2)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--red)' }}>{formatINR(totalExpense)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'electricity' && (
        <Card>
          <SectionHeader title="Electricity Bills" />
          <Table
            searchable
            exportFilename="electricity-bills.csv"
            columns={[
              { key: 'billingPeriod', label: 'Period', render: (r: Record<string, unknown>) => monthLabel(r.billingPeriod as string) },
              { key: 'date', label: 'Bill Date' },
              { key: 'unitsConsumed', label: 'Units', render: (r: Record<string, unknown>) => formatNumber(r.unitsConsumed as number) },
              {
                key: 'ratePerUnit', label: 'Rate/Unit',
                render: () => formatINR(settings.electricityRatePerUnit),
              },
              { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatINR(r.amount as number) },
            ]}
            data={elecBills as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'misc' && (
        <Card>
          <SectionHeader title="Other Expenses" />
          <Table
            searchable
            exportFilename="misc-expenses.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'description', label: 'Description' },
              { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatINR(r.amount as number) },
            ]}
            data={miscExpenses as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Electricity Modal */}
      <Modal open={elecModal} onClose={() => setElecModal(false)} title="Add Electricity Bill">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Billing Period (YYYY-MM)" type="month" value={elecForm.billingPeriod} onChange={e => setElecForm(f => ({ ...f, billingPeriod: e.target.value }))} />
          <Input label="Bill Date" type="date" value={toInputDate(elecForm.date)} onChange={e => setElecForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Units Consumed" type="number" min="0" value={elecForm.unitsConsumed} onChange={e => setElecForm(f => ({ ...f, unitsConsumed: parseInt(e.target.value) || 0 }))} />
          <Input label="Total Amount (₹)" type="number" min="0" value={elecForm.amount} onChange={e => setElecForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setElecModal(false)}>Cancel</Button>
          <Button onClick={addElec}>Save Bill</Button>
        </div>
      </Modal>

      {/* Misc Modal */}
      <Modal open={miscModal} onClose={() => setMiscModal(false)} title="Add Miscellaneous Expense">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(miscForm.date)} onChange={e => setMiscForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Amount (₹)" type="number" min="0" step="0.01" value={miscForm.amount} onChange={e => setMiscForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
          <div className="col-span-2">
            <Input label="Description" value={miscForm.description} onChange={e => setMiscForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setMiscModal(false)}>Cancel</Button>
          <Button onClick={addMisc} disabled={!miscForm.description}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
