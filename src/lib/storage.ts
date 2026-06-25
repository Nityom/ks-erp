import type {
  Settings,
  RawMaterialPurchase,
  RawMaterialStock,
  CupProductionSession,
  PlateProductionSession,
  FinishedGoodsStock,
  PackagingSession,
  SaleEntry,
  PaymentEntry,
  MonthlyWorker,
  AttendanceEntry,
  SalaryAdvance,
  SalaryPayment,
  PieceRateWorker,
  PieceRateEntry,
  PieceRatePayment,
  HeaterRecord,
  ComponentRecord,
  PlateMaintenanceEntry,
  ElectricityBill,
  MiscExpense,
  CashFlowEntry,
} from './types';

const NS = {
  settings: 'pcp_settings',
  rawMaterialPurchases: 'pcp_rm_purchases',
  rawMaterialStock: 'pcp_rm_stock',
  cupProduction: 'pcp_cup_production',
  plateProduction: 'pcp_plate_production',
  finishedGoods: 'pcp_finished_goods',
  packagingSessions: 'pcp_packaging_sessions',
  sales: 'pcp_sales',
  payments: 'pcp_payments',
  monthlyWorkers: 'pcp_monthly_workers',
  attendance: 'pcp_attendance',
  salaryAdvances: 'pcp_salary_advances',
  salaryPayments: 'pcp_salary_payments',
  pieceRateWorkers: 'pcp_piecerate_workers',
  pieceRateEntries: 'pcp_piecerate_entries',
  pieceRatePayments: 'pcp_piecerate_payments',
  heaters: 'pcp_heaters',
  components: 'pcp_components',
  plateMaintenance: 'pcp_plate_maintenance',
  electricityBills: 'pcp_electricity',
  miscExpenses: 'pcp_misc_expenses',
  cashFlow: 'pcp_cashflow',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  paperBlankRatePerKg: 0,
  paperBottomRatePerKg: 0,
  paraffinOilRatePerLitre: 0,
  mobilOilRatePerLitre: 0,
  plateSheetRatePerBundle: 0,
  ptRollRate: 0,
  boraBagRate: 0,
  cartonBoxRate: 0,
  transparentTapeRate: 0,
  plasticRopeRate: 0,
  margin50ml: 10,
  margin60ml: 10,
  margin210ml: 10,
  margin250ml: 10,
  marginPlate: 10,
  piecerate50ml: 50,
  piecerate60ml: 50,
  piecerate210ml: 80,
  piecerate250ml: 80,
  pieceratePlate: 10,
  thresholdPaperBlank: 50,
  thresholdPaperBottom: 50,
  thresholdParaffinOil: 5,
  thresholdMobilOil: 2,
  thresholdPlateSheets: 10,
  thresholdPtRoll: 5,
  thresholdBoraBag: 20,
  thresholdCarton: 20,
  transportHocker: 0,
  transportWholesaler: 0,
  transportRetailer: 0,
  transportFriend: 0,
  inboundTransportDefault: 0,
  electricityRatePerUnit: 8,
  fgThreshold50ml: 10,
  fgThreshold60ml: 10,
  fgThreshold210ml: 10,
  fgThreshold250ml: 10,
  fgThresholdPlate: 10,
  defaultSaleRate50ml: 0,
  defaultSaleRate60ml: 0,
  defaultSaleRate210ml: 0,
  defaultSaleRate250ml: 0,
  defaultSaleRatePlate: 0,
  // Paper grams per cup — based on 160 GSM measurement (update for different GSM/quality)
  blankGrams50ml: 1.50,
  blankGrams60ml: 1.80,
  blankGrams210ml: 2.84,  // from: 1000g blank → 351 cups
  blankGrams250ml: 3.20,
  bottomGrams50ml: 0.40,
  bottomGrams60ml: 0.45,
  bottomGrams210ml: 0.73, // from: 257g bottom → 351 cups
  bottomGrams250ml: 0.85,
  bottomWastePct: 44,     // 80g waste per 180g bottom = 44.4% trim waste
  // Plate extras
  ppCostPerPlate: 0.035,  // PP film: ₹150/kg, ~0.23g per plate ≈ ₹0.035
  platesPerSheetBundle: 100,
  platesPerBora: 400,     // 11rs per bora / 400 plates = ₹0.0275/plate
  // Business / GST details
  legalName: '',
  tradeName: '',
  gstin: '',
  stateCode: '',
  billingAddress: '',
};

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...get<Partial<Settings>>(NS.settings, {}) };
}
export function saveSettings(s: Settings): void {
  set(NS.settings, s);
}

// ─── RAW MATERIAL ─────────────────────────────────────────────────────────────

export function getRMPurchases(): RawMaterialPurchase[] {
  return get<RawMaterialPurchase[]>(NS.rawMaterialPurchases, []);
}
export function saveRMPurchases(data: RawMaterialPurchase[]): void {
  set(NS.rawMaterialPurchases, data);
}
export function getRMStock(): RawMaterialStock[] {
  return get<RawMaterialStock[]>(NS.rawMaterialStock, []);
}
export function saveRMStock(data: RawMaterialStock[]): void {
  set(NS.rawMaterialStock, data);
}

// ─── PRODUCTION ───────────────────────────────────────────────────────────────

export function getCupProduction(): CupProductionSession[] {
  return get<CupProductionSession[]>(NS.cupProduction, []);
}
export function saveCupProduction(data: CupProductionSession[]): void {
  set(NS.cupProduction, data);
}
export function getPlateProduction(): PlateProductionSession[] {
  return get<PlateProductionSession[]>(NS.plateProduction, []);
}
export function savePlateProduction(data: PlateProductionSession[]): void {
  set(NS.plateProduction, data);
}

// ─── FINISHED GOODS ──────────────────────────────────────────────────────────

export function getFinishedGoods(): FinishedGoodsStock[] {
  return get<FinishedGoodsStock[]>(NS.finishedGoods, []);
}
export function saveFinishedGoods(data: FinishedGoodsStock[]): void {
  set(NS.finishedGoods, data);
}
export function getPackagingSessions(): PackagingSession[] {
  return get<PackagingSession[]>(NS.packagingSessions, []);
}
export function savePackagingSessions(data: PackagingSession[]): void {
  set(NS.packagingSessions, data);
}

// ─── SALES ────────────────────────────────────────────────────────────────────

export function getSales(): SaleEntry[] {
  return get<SaleEntry[]>(NS.sales, []);
}
export function saveSales(data: SaleEntry[]): void {
  set(NS.sales, data);
}
export function getPayments(): PaymentEntry[] {
  return get<PaymentEntry[]>(NS.payments, []);
}
export function savePayments(data: PaymentEntry[]): void {
  set(NS.payments, data);
}

// ─── WORKERS ──────────────────────────────────────────────────────────────────

export function getMonthlyWorkers(): MonthlyWorker[] {
  return get<MonthlyWorker[]>(NS.monthlyWorkers, []);
}
export function saveMonthlyWorkers(data: MonthlyWorker[]): void {
  set(NS.monthlyWorkers, data);
}
export function getAttendance(): AttendanceEntry[] {
  return get<AttendanceEntry[]>(NS.attendance, []);
}
export function saveAttendance(data: AttendanceEntry[]): void {
  set(NS.attendance, data);
}
export function getSalaryAdvances(): SalaryAdvance[] {
  return get<SalaryAdvance[]>(NS.salaryAdvances, []);
}
export function saveSalaryAdvances(data: SalaryAdvance[]): void {
  set(NS.salaryAdvances, data);
}
export function getSalaryPayments(): SalaryPayment[] {
  return get<SalaryPayment[]>(NS.salaryPayments, []);
}
export function saveSalaryPayments(data: SalaryPayment[]): void {
  set(NS.salaryPayments, data);
}
export function getPieceRateWorkers(): PieceRateWorker[] {
  return get<PieceRateWorker[]>(NS.pieceRateWorkers, []);
}
export function savePieceRateWorkers(data: PieceRateWorker[]): void {
  set(NS.pieceRateWorkers, data);
}
export function getPieceRateEntries(): PieceRateEntry[] {
  return get<PieceRateEntry[]>(NS.pieceRateEntries, []);
}
export function savePieceRateEntries(data: PieceRateEntry[]): void {
  set(NS.pieceRateEntries, data);
}
export function getPieceRatePayments(): PieceRatePayment[] {
  return get<PieceRatePayment[]>(NS.pieceRatePayments, []);
}
export function savePieceRatePayments(data: PieceRatePayment[]): void {
  set(NS.pieceRatePayments, data);
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────

export function getHeaters(): HeaterRecord[] {
  return get<HeaterRecord[]>(NS.heaters, []);
}
export function saveHeaters(data: HeaterRecord[]): void {
  set(NS.heaters, data);
}
export function getComponents(): ComponentRecord[] {
  return get<ComponentRecord[]>(NS.components, []);
}
export function saveComponents(data: ComponentRecord[]): void {
  set(NS.components, data);
}
export function getPlateMaintenance(): PlateMaintenanceEntry[] {
  return get<PlateMaintenanceEntry[]>(NS.plateMaintenance, []);
}
export function savePlateMaintenance(data: PlateMaintenanceEntry[]): void {
  set(NS.plateMaintenance, data);
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export function getElectricityBills(): ElectricityBill[] {
  return get<ElectricityBill[]>(NS.electricityBills, []);
}
export function saveElectricityBills(data: ElectricityBill[]): void {
  set(NS.electricityBills, data);
}
export function getMiscExpenses(): MiscExpense[] {
  return get<MiscExpense[]>(NS.miscExpenses, []);
}
export function saveMiscExpenses(data: MiscExpense[]): void {
  set(NS.miscExpenses, data);
}

// ─── CASH FLOW ────────────────────────────────────────────────────────────────

export function getCashFlow(): CashFlowEntry[] {
  return get<CashFlowEntry[]>(NS.cashFlow, []);
}
export function saveCashFlow(data: CashFlowEntry[]): void {
  set(NS.cashFlow, data);
}

// ─── BACKUP / RESTORE ─────────────────────────────────────────────────────────

export function exportAllData(): Record<string, unknown> {
  const all: Record<string, unknown> = {};
  Object.entries(NS).forEach(([key, storageKey]) => {
    const raw = localStorage.getItem(storageKey);
    all[key] = raw ? JSON.parse(raw) : null;
  });
  return all;
}

export function importAllData(data: Record<string, unknown>): void {
  Object.entries(NS).forEach(([key, storageKey]) => {
    if (data[key] !== undefined && data[key] !== null) {
      localStorage.setItem(storageKey, JSON.stringify(data[key]));
    }
  });
}

export function clearAllData(): void {
  Object.values(NS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('pcp_demo_active');
}

export function isDemoDataActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pcp_demo_active') === '1';
}
