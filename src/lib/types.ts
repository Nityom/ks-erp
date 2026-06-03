// ─── SHARED ───────────────────────────────────────────────────────────────────

export type CupSize = '50ml' | '60ml' | '210ml' | '250ml';
export type Channel = 'hocker' | 'wholesaler' | 'retailer' | 'friend';
export type FriendMode = 'zero' | 'profit';

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export interface Settings {
  schemaVersion: number;
  // RM rates
  paperBlankRatePerKg: number;
  paperBottomRatePerKg: number;
  paraffinOilRatePerLitre: number;
  mobilOilRatePerLitre: number;
  plateSheetRatePerBundle: number;
  // Packaging rates
  ptRollRate: number;
  boraBagRate: number;
  cartonBoxRate: number;
  transparentTapeRate: number;
  plasticRopeRate: number;
  // Margin % per product
  margin50ml: number;
  margin60ml: number;
  margin210ml: number;
  margin250ml: number;
  marginPlate: number;
  // Worker piece rates
  piecerate50ml: number;  // per 1000 cups
  piecerate60ml: number;
  piecerate210ml: number;
  piecerate250ml: number;
  pieceratePlate: number; // per bundle
  // Low-stock thresholds
  thresholdPaperBlank: number;
  thresholdPaperBottom: number;
  thresholdParaffinOil: number;
  thresholdMobilOil: number;
  thresholdPlateSheets: number;
  thresholdPtRoll: number;
  thresholdBoraBag: number;
  thresholdCarton: number;
  // Channel-wise transport defaults (per unit)
  transportHocker: number;
  transportWholesaler: number;
  transportRetailer: number;
  transportFriend: number;
  // Inbound transport default per unit
  inboundTransportDefault: number;
  // Electricity
  electricityRatePerUnit: number;
  // Low-stock finished goods thresholds (in cartons/boras)
  fgThreshold50ml: number;
  fgThreshold60ml: number;
  fgThreshold210ml: number;
  fgThreshold250ml: number;
  fgThresholdPlate: number;
  // Default selling prices (auto-updated from last sale entry per product)
  defaultSaleRate50ml: number;
  defaultSaleRate60ml: number;
  defaultSaleRate210ml: number;
  defaultSaleRate250ml: number;
  defaultSaleRatePlate: number;
}

// ─── RAW MATERIAL ─────────────────────────────────────────────────────────────

export type RawMaterialType =
  | 'paperBlank'
  | 'paperBottom'
  | 'paraffinOil'
  | 'mobilOil'
  | 'plateSheets'
  | 'ptRoll'
  | 'boraBag'
  | 'cartonBox'
  | 'transparentTape'
  | 'plasticRope';

export interface RawMaterialPurchase {
  id: string;
  date: string; // DD/MM/YYYY
  supplierName: string;
  materialType: RawMaterialType;
  quantityReceived: number;
  billedQuantity: number;
  pricePerUnit: number;
  withGst: boolean;
  gstAmount?: number;
  hsnCode?: string;
  inboundFreight: number; // total trip freight
  transportPerUnit: number; // auto-calc
  notes?: string;
}

export interface RawMaterialStock {
  materialType: RawMaterialType;
  actualQty: number;
  declaredQty: number;
  lastUpdated: string;
}

// ─── PRODUCTION ───────────────────────────────────────────────────────────────

export type MachineId = 'A' | 'B' | 'C' | 'plate';

export interface CupProductionSession {
  id: string;
  date: string;
  machineId: 'A' | 'B' | 'C';
  activeMold: CupSize;
  operatorName: string;
  durationMinutes: number;
  actualCupsProduced: number;
  theoreticalOutput: number; // auto-calc
  efficiency: number; // %
  paraffinOilUsed: number; // litres
  mobilOilUsed: number; // litres
}

export interface PlateProductionSession {
  id: string;
  date: string;
  operator1: string;
  operator2?: string;
  hoursWorked: number;
  bundlesProduced: number;
  platesProduced: number; // auto-calc
  sheetsConsumed: number; // auto-calc
}

// ─── FINISHED GOODS ──────────────────────────────────────────────────────────

export interface FinishedGoodsStock {
  size: CupSize | 'plate';
  looseCups: number;
  bundles: number;
  cartons: number; // cups only
  loosePlates?: number;
  boras?: number; // plates only
}

export interface PackagingSession {
  id: string;
  date: string;
  productType: 'cup' | 'plate';
  size?: CupSize;
  cupsPackedIntoBundle?: number;
  bundlesPackedIntoCarton?: number;
  bundlesPackedIntoBora?: number;
  ptRollUsed?: number;
  tapeRollsUsed?: number;
  plasticRopeUsed?: number;
  cartonsUsed?: number;
  borasUsed?: number;
}

// ─── TRANSPORT ────────────────────────────────────────────────────────────────

export interface OutboundTransport {
  id: string;
  date: string;
  saleId: string;
  channel: Channel;
  freightPaid: number;
  quantityDispatched: number;
  freightPerUnit: number; // auto-calc
}

// ─── SALES ────────────────────────────────────────────────────────────────────

export type ProductType = CupSize | 'plate';
export type QuantityUnit = 'bundles' | 'boras' | 'cartons' | 'loose';

export interface SaleEntry {
  id: string;
  billNumber: string;
  date: string;
  channel: Channel;
  buyerName: string;
  productType: ProductType;
  quantityUnit: QuantityUnit;
  quantity: number;
  ratePerUnit: number;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
  outboundFreight: number;
  friendMode?: FriendMode;
  rmCostTotal?: number; // for friend channel
  profitLoss?: number; // for friend channel
  notes?: string;
}

export interface PaymentEntry {
  id: string;
  saleId: string;
  buyerName: string;
  channel: Channel;
  date: string;
  amountPaid: number;
  notes?: string;
}

// ─── GST ──────────────────────────────────────────────────────────────────────

export interface GSTRecord {
  month: string; // YYYY-MM
  gstPaidOnPurchases: number;
  theoreticalGSTOnSales: number;
  netGSTBenefit: number;
}

// ─── WORKERS ──────────────────────────────────────────────────────────────────

export interface MonthlyWorker {
  id: string;
  name: string;
  role: string;
  monthlySalary: number;
  joinDate: string;
  phone?: string;
  active: boolean;
}

export interface AttendanceEntry {
  id: string;
  workerId: string;
  month: string; // YYYY-MM
  presentDays: number;
  absentDays: number;
  halfDays: number;
  totalWorkingDays: number;
}

export interface SalaryAdvance {
  id: string;
  workerId: string;
  date: string;
  amount: number;
  deductOver: number; // N months
  amountDeducted: number;
  fullyDeducted: boolean;
}

export interface SalaryPayment {
  id: string;
  workerId: string;
  month: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  amountPaid: number;
  pendingAmount: number;
  date: string;
}

export interface PieceRateWorker {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
}

export interface PieceRateEntry {
  id: string;
  workerId: string;
  date: string;
  productType: ProductType;
  quantityProduced: number;
  earningsAmount: number; // auto-calc
}

export interface PieceRatePayment {
  id: string;
  workerId: string;
  date: string;
  amountPaid: number;
  notes?: string;
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────

export type MaintenanceMachineId = 'A' | 'B' | 'C' | 'plate';

export interface HeaterRecord {
  machineId: MaintenanceMachineId;
  heaterNumber: number; // 1–7
  lastReplacedDate: string;
  replacementCost: number;
  expectedCycleUnits: number; // cups produced before next maintenance
  history: { date: string; cost: number; notes?: string }[];
}

export interface ComponentRecord {
  id: string;
  machineId: MaintenanceMachineId;
  componentType: 'thermocouple' | 'bottomCutter' | 'other';
  componentName?: string;
  lastReplacedDate: string;
  replacementCost: number;
  expectedCycleUnits: number; // cups produced before next maintenance
  history: { date: string; cost: number; notes?: string }[];
}

export interface PlateMaintenanceEntry {
  id: string;
  date: string;
  description: string;
  cost: number;
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'rawMaterials'
  | 'inboundTransport'
  | 'outboundTransport'
  | 'monthlySalaries'
  | 'pieceRateWages'
  | 'maintenance'
  | 'packagingMaterials'
  | 'paraffinOil'
  | 'mobilOil'
  | 'electricity'
  | 'miscellaneous';

export interface ElectricityBill {
  id: string;
  billingPeriod: string; // YYYY-MM
  unitsConsumed: number;
  amount: number;
  date: string;
}

export interface MiscExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

// ─── CASH FLOW ────────────────────────────────────────────────────────────────

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  reference?: string;
  notes?: string;
}
