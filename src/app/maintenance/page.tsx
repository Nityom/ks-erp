'use client';
import { useState, useEffect } from 'react';
import {
  getHeaters, saveHeaters,
  getComponents, saveComponents,
  getPlateMaintenance, savePlateMaintenance,
  getCupProduction,
} from '@/lib/storage';
import type { HeaterRecord, ComponentRecord, PlateMaintenanceEntry, MaintenanceMachineId, CupProductionSession } from '@/lib/types';
import {
  Card, Button, Input, Select, Modal, Table, SectionHeader,
  Tabs, Badge, StatCard,
} from '@/components/UI';
import {
  formatINR, formatNumber, generateId, todayDDMMYYYY,
  fromInputDate, toInputDate, cupsUsedSince, currentMonth,
} from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

const MACHINES: MaintenanceMachineId[] = ['A', 'B', 'C'];

// Alert threshold: warn when >= 90% of cycle units consumed
const ALERT_THRESHOLD = 0.9;

function getUsageBadge(used: number, cycleUnits: number) {
  if (!cycleUnits) return <Badge variant="gray">No limit set</Badge>;
  const remaining = cycleUnits - used;
  const pct = used / cycleUnits;
  if (pct >= 1) return <Badge variant="red">Overdue ({formatNumber(Math.abs(remaining))} over)</Badge>;
  if (pct >= ALERT_THRESHOLD) return <Badge variant="amber">Due soon ({formatNumber(remaining)} left)</Badge>;
  return <Badge variant="green">{formatNumber(remaining)} left</Badge>;
}

function UsageBar({ used, total }: { used: number; total: number }) {
  if (!total) return null;
  const pct = Math.min(used / total, 1) * 100;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 90 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function initHeaters(): HeaterRecord[] {
  const heaters: HeaterRecord[] = [];
  for (const machine of MACHINES) {
    for (let i = 1; i <= 7; i++) {
      heaters.push({
        machineId: machine,
        heaterNumber: i,
        lastReplacedDate: '',
        replacementCost: 0,
        expectedCycleUnits: 500000,
        history: [],
      });
    }
  }
  return heaters;
}

function initComponents(): ComponentRecord[] {
  const items: ComponentRecord[] = [];
  for (const machine of MACHINES) {
    for (const type of ['thermocouple', 'bottomCutter'] as const) {
      items.push({
        id: `${machine}-${type}`,
        machineId: machine,
        componentType: type,
        lastReplacedDate: '',
        replacementCost: 0,
        expectedCycleUnits: type === 'thermocouple' ? 300000 : 400000,
        history: [],
      });
    }
  }
  return items;
}

export default function MaintenancePage() {
  const [heaters, setHeaters] = useState<HeaterRecord[]>(initHeaters());
  const [components, setComponents] = useState<ComponentRecord[]>(initComponents());
  const [plateLogs, setPlateLogs] = useState<PlateMaintenanceEntry[]>([]);
  const [prodSessions, setProdSessions] = useState<CupProductionSession[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [heaterModal, setHeaterModal] = useState<HeaterRecord | null>(null);
  const [compModal, setCompModal] = useState<ComponentRecord | null>(null);
  const [plateModal, setPlateModal] = useState(false);
  const [otherModal, setOtherModal] = useState(false);

  const [heaterForm, setHeaterForm] = useState({ date: todayDDMMYYYY(), cost: 0, cycleUnits: 500000 });
  const [compForm, setCompForm] = useState({ date: todayDDMMYYYY(), cost: 0, cycleUnits: 300000 });
  const [plateForm, setPlateForm] = useState<Omit<PlateMaintenanceEntry, 'id'>>({ date: todayDDMMYYYY(), description: '', cost: 0 });
  const [otherForm, setOtherForm] = useState<Omit<ComponentRecord, 'id' | 'history'>>({
    machineId: 'A', componentType: 'other', componentName: '', lastReplacedDate: todayDDMMYYYY(), replacementCost: 0, expectedCycleUnits: 100000,
  });

  useEffect(() => {
    const stored = getHeaters();
    // Migrate old records that have expectedCycleDays but not expectedCycleUnits
    const migrated = (stored.length > 0 ? stored : initHeaters()).map(h => ({
      ...h,
      expectedCycleUnits: (h as HeaterRecord & { expectedCycleUnits?: number }).expectedCycleUnits ?? 500000,
    }));
    setHeaters(migrated);
    const storedComp = getComponents();
    const migratedComp = (storedComp.length > 0 ? storedComp : initComponents()).map(c => ({
      ...c,
      expectedCycleUnits: (c as ComponentRecord & { expectedCycleUnits?: number }).expectedCycleUnits ?? (c.componentType === 'thermocouple' ? 300000 : 400000),
    }));
    setComponents(migratedComp);
    setPlateLogs(getPlateMaintenance());
    setProdSessions(getCupProduction());
  }, []);

  const updateHeater = (h: HeaterRecord, date: string, cost: number, cycleUnits: number) => {
    const entry = { date, cost };
    const updated = heaters.map(x =>
      x.machineId === h.machineId && x.heaterNumber === h.heaterNumber
        ? { ...x, lastReplacedDate: date, replacementCost: cost, expectedCycleUnits: cycleUnits, history: [...x.history, entry] }
        : x
    );
    saveHeaters(updated); setHeaters(updated);
    setHeaterModal(null);
  };

  const updateComponent = (c: ComponentRecord, date: string, cost: number, cycleUnits: number) => {
    const entry = { date, cost };
    const updated = components.map(x =>
      x.id === c.id
        ? { ...x, lastReplacedDate: date, replacementCost: cost, expectedCycleUnits: cycleUnits, history: [...x.history, entry] }
        : x
    );
    saveComponents(updated); setComponents(updated);
    setCompModal(null);
  };

  const addOtherComponent = () => {
    const entry: ComponentRecord = { ...otherForm, id: generateId(), history: [{ date: otherForm.lastReplacedDate, cost: otherForm.replacementCost }] };
    const updated = [...components, entry];
    saveComponents(updated); setComponents(updated);
    setOtherModal(false);
    setOtherForm({ machineId: 'A', componentType: 'other', componentName: '', lastReplacedDate: todayDDMMYYYY(), replacementCost: 0, expectedCycleUnits: 100000 });
  };

  const addPlateLog = () => {
    const updated = [{ ...plateForm, id: generateId() }, ...plateLogs];
    savePlateMaintenance(updated); setPlateLogs(updated);
    setPlateModal(false);
    setPlateForm({ date: todayDDMMYYYY(), description: '', cost: 0 });
  };

  // Alerts — triggered when >= 90% of cycle cups consumed
  const heaterAlerts = heaters.filter(h => {
    if (!h.lastReplacedDate) return false;
    const used = cupsUsedSince(h.machineId, h.lastReplacedDate, prodSessions);
    return used >= (h.expectedCycleUnits || 1) * ALERT_THRESHOLD;
  });
  const compAlerts = components.filter(c => {
    if (!c.lastReplacedDate) return false;
    const used = cupsUsedSince(c.machineId, c.lastReplacedDate, prodSessions);
    return used >= (c.expectedCycleUnits || 1) * ALERT_THRESHOLD;
  });

  // Monthly cost
  const month = currentMonth();
  const heaterCostMonth = heaters.reduce((sum, h) => {
    const monthCosts = h.history.filter(e => {
      const [dd, mm, yyyy] = e.date.split('/');
      return `${yyyy}-${mm}` === month;
    });
    return sum + monthCosts.reduce((s, e) => s + e.cost, 0);
  }, 0);
  const compCostMonth = components.reduce((sum, c) => {
    const monthCosts = c.history.filter(e => {
      const [dd, mm, yyyy] = e.date.split('/');
      return `${yyyy}-${mm}` === month;
    });
    return sum + monthCosts.reduce((s, e) => s + e.cost, 0);
  }, 0);
  const plateCostMonth = plateLogs.filter(p => {
    const [dd, mm, yyyy] = p.date.split('/');
    return `${yyyy}-${mm}` === month;
  }).reduce((s, p) => s + p.cost, 0);
  const totalCostMonth = heaterCostMonth + compCostMonth + plateCostMonth;

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Alerts */}
      {(heaterAlerts.length > 0 || compAlerts.length > 0) && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <div className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300 mb-2">
            <AlertTriangle size={14} /> Maintenance Alerts
          </div>
          <div className="flex flex-wrap gap-2">
            {heaterAlerts.map(h => (
              <span key={`${h.machineId}-H${h.heaterNumber}`} className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-0.5 rounded text-xs">
                Machine {h.machineId} — Heater {h.heaterNumber}
              </span>
            ))}
            {compAlerts.map(c => (
              <span key={c.id} className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-xs">
                Machine {c.machineId} — {c.componentType === 'thermocouple' ? 'Thermocouple' : c.componentName ?? c.componentType}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Heater Cost (Month)" value={formatINR(heaterCostMonth)} color="red" />
        <StatCard label="Component Cost (Month)" value={formatINR(compCostMonth)} color="red" />
        <StatCard label="Plate Machine (Month)" value={formatINR(plateCostMonth)} color="red" />
        <StatCard label="Total Maintenance" value={formatINR(totalCostMonth)} color="red" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs
          tabs={[
            { key: 'dashboard', label: 'Status Overview' },
            { key: 'heaters', label: 'Heaters' },
            { key: 'plate', label: 'Plate Machine' },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOtherModal(true)}>+ Other Part</Button>
          <Button variant="secondary" size="sm" onClick={() => setPlateModal(true)}>+ Plate Log</Button>
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-4">
          {MACHINES.map(machine => (
            <Card key={machine}>
              <SectionHeader title={`Machine ${machine}`} subtitle="Heaters (7) + Thermocouple + Bottom Cutter" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Heaters */}
                {heaters.filter(h => h.machineId === machine).map(h => {
                  const used = h.lastReplacedDate ? cupsUsedSince(h.machineId, h.lastReplacedDate, prodSessions) : 0;
                  return (
                    <div
                      key={h.heaterNumber}
                      className="flex flex-col p-3 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                      onClick={() => { setHeaterModal(h); setHeaterForm({ date: todayDDMMYYYY(), cost: 0, cycleUnits: h.expectedCycleUnits }); }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Heater {h.heaterNumber}</div>
                          {h.lastReplacedDate && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Since: {h.lastReplacedDate}</div>}
                        </div>
                        {h.lastReplacedDate ? getUsageBadge(used, h.expectedCycleUnits) : <Badge variant="gray">Never</Badge>}
                      </div>
                      {h.lastReplacedDate && (
                        <div className="mt-1.5">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(used)} / {formatNumber(h.expectedCycleUnits)} cups</div>
                          <UsageBar used={used} total={h.expectedCycleUnits} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Components */}
                {components.filter(c => c.machineId === machine && c.componentType !== 'other').map(c => {
                  const used = c.lastReplacedDate ? cupsUsedSince(c.machineId, c.lastReplacedDate, prodSessions) : 0;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col p-3 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                      onClick={() => { setCompModal(c); setCompForm({ date: todayDDMMYYYY(), cost: 0, cycleUnits: c.expectedCycleUnits }); }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium capitalize">{c.componentType === 'thermocouple' ? 'Thermocouple Wire' : 'Bottom Cutter'}</div>
                          {c.lastReplacedDate && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Since: {c.lastReplacedDate}</div>}
                        </div>
                        {c.lastReplacedDate ? getUsageBadge(used, c.expectedCycleUnits) : <Badge variant="gray">Never</Badge>}
                      </div>
                      {c.lastReplacedDate && (
                        <div className="mt-1.5">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(used)} / {formatNumber(c.expectedCycleUnits)} cups</div>
                          <UsageBar used={used} total={c.expectedCycleUnits} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Other components */}
                {components.filter(c => c.machineId === machine && c.componentType === 'other').map(c => {
                  const used = c.lastReplacedDate ? cupsUsedSince(c.machineId, c.lastReplacedDate, prodSessions) : 0;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col p-3 rounded-lg border"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{c.componentName}</div>
                          {c.lastReplacedDate && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Since: {c.lastReplacedDate}</div>}
                        </div>
                        {c.lastReplacedDate ? getUsageBadge(used, c.expectedCycleUnits) : <Badge variant="gray">Never</Badge>}
                      </div>
                      {c.lastReplacedDate && (
                        <div className="mt-1.5">
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNumber(used)} / {formatNumber(c.expectedCycleUnits)} cups</div>
                          <UsageBar used={used} total={c.expectedCycleUnits} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'heaters' && (
        <Card>
          <SectionHeader title="Heater Replacement History" />
          <Table
            searchable
            exportFilename="heater-history.csv"
            columns={[
              { key: 'machineId', label: 'Machine', render: (r: Record<string, unknown>) => `Machine ${r.machineId}` },
              { key: 'heaterNumber', label: 'Heater #' },
              { key: 'lastReplacedDate', label: 'Last Replaced', render: (r: Record<string, unknown>) => r.lastReplacedDate as string || '—' },
              { key: 'replacementCost', label: 'Last Cost', render: (r: Record<string, unknown>) => formatINR(r.replacementCost as number ?? 0) },
              { key: 'expectedCycleUnits', label: 'Cycle (cups)', render: (r: Record<string, unknown>) => formatNumber(r.expectedCycleUnits as number ?? 0) },
              {
                key: 'status', label: 'Status',
                render: (r: Record<string, unknown>) => {
                  if (!r.lastReplacedDate) return <Badge variant="gray">Never replaced</Badge>;
                  const used = cupsUsedSince(r.machineId as string, r.lastReplacedDate as string, prodSessions);
                  return getUsageBadge(used, r.expectedCycleUnits as number ?? 0);
                },
              },
              {
                key: 'totalSpent', label: 'Total Spent',
                render: (r: Record<string, unknown>) => {
                  const h = heaters.find(x => x.machineId === r.machineId && x.heaterNumber === r.heaterNumber);
                  return formatINR(h?.history.reduce((s, e) => s + e.cost, 0) ?? 0);
                },
              },
            ]}
            data={heaters as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {tab === 'plate' && (
        <Card>
          <SectionHeader title="Plate Machine Maintenance Log" />
          <Table
            searchable
            exportFilename="plate-maintenance.csv"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'description', label: 'Description' },
              { key: 'cost', label: 'Cost', render: (r: Record<string, unknown>) => formatINR(r.cost as number) },
            ]}
            data={plateLogs as unknown as Record<string, unknown>[]}
          />
        </Card>
      )}

      {/* Heater Log Modal */}
      {heaterModal && (
        <Modal open={!!heaterModal} onClose={() => setHeaterModal(null)} title={`Machine ${heaterModal.machineId} — Heater ${heaterModal.heaterNumber}`}>
          <div className="space-y-4">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {heaterModal.lastReplacedDate ? `Last replaced: ${heaterModal.lastReplacedDate} — Cost: ${formatINR(heaterModal.replacementCost)}` : 'No replacement recorded yet'}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Replacement Date" type="date" value={toInputDate(heaterForm.date)} onChange={e => setHeaterForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
              <Input label="Cost (₹)" type="number" min="0" value={heaterForm.cost} onChange={e => setHeaterForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} />
              <Input label="Cycle (cups before next service)" type="number" min="1" value={heaterForm.cycleUnits} onChange={e => setHeaterForm(f => ({ ...f, cycleUnits: parseInt(e.target.value) || 500000 }))} />
            </div>
            {heaterModal.history.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>History</div>
                {heaterModal.history.slice(-5).reverse().map((h, i) => (
                  <div key={i} className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span>{h.date}</span><span>{formatINR(h.cost)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button variant="secondary" onClick={() => setHeaterModal(null)}>Cancel</Button>
              <Button onClick={() => updateHeater(heaterModal, heaterForm.date, heaterForm.cost, heaterForm.cycleUnits)}>
                Log Replacement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Component Modal */}
      {compModal && (
        <Modal open={!!compModal} onClose={() => setCompModal(null)} title={`Machine ${compModal.machineId} — ${compModal.componentType === 'thermocouple' ? 'Thermocouple Wire' : 'Bottom Cutter'}`}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Replacement Date" type="date" value={toInputDate(compForm.date)} onChange={e => setCompForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
            <Input label="Cost (₹)" type="number" min="0" value={compForm.cost} onChange={e => setCompForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} />
            <Input label="Cycle (cups before next service)" type="number" min="1" value={compForm.cycleUnits} onChange={e => setCompForm(f => ({ ...f, cycleUnits: parseInt(e.target.value) || 300000 }))} />
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button variant="secondary" onClick={() => setCompModal(null)}>Cancel</Button>
            <Button onClick={() => updateComponent(compModal, compForm.date, compForm.cost, compForm.cycleUnits)}>Log Replacement</Button>
          </div>
        </Modal>
      )}

      {/* Other Component */}
      <Modal open={otherModal} onClose={() => setOtherModal(false)} title="Log Other Electrical Part">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Machine" value={otherForm.machineId} onChange={e => setOtherForm(f => ({ ...f, machineId: e.target.value as MaintenanceMachineId }))}>
            {MACHINES.map(m => <option key={m} value={m}>Machine {m}</option>)}
          </Select>
          <Input label="Part Name" value={otherForm.componentName ?? ''} onChange={e => setOtherForm(f => ({ ...f, componentName: e.target.value }))} />
          <Input label="Replacement Date" type="date" value={toInputDate(otherForm.lastReplacedDate)} onChange={e => setOtherForm(f => ({ ...f, lastReplacedDate: fromInputDate(e.target.value) }))} />
          <Input label="Cost (₹)" type="number" min="0" value={otherForm.replacementCost} onChange={e => setOtherForm(f => ({ ...f, replacementCost: parseFloat(e.target.value) || 0 }))} />
          <Input label="Cycle (cups before next service)" type="number" min="1" value={otherForm.expectedCycleUnits} onChange={e => setOtherForm(f => ({ ...f, expectedCycleUnits: parseInt(e.target.value) || 100000 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setOtherModal(false)}>Cancel</Button>
          <Button onClick={addOtherComponent} disabled={!otherForm.componentName}>Add Part</Button>
        </div>
      </Modal>

      {/* Plate Log Modal */}
      <Modal open={plateModal} onClose={() => setPlateModal(false)} title="Plate Machine Maintenance Entry">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" value={toInputDate(plateForm.date)} onChange={e => setPlateForm(f => ({ ...f, date: fromInputDate(e.target.value) }))} />
          <Input label="Cost (₹)" type="number" min="0" value={plateForm.cost} onChange={e => setPlateForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} />
          <div className="col-span-2">
            <Input label="Description" value={plateForm.description} onChange={e => setPlateForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="secondary" onClick={() => setPlateModal(false)}>Cancel</Button>
          <Button onClick={addPlateLog} disabled={!plateForm.description}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
