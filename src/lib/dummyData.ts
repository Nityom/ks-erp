/**
 * Dummy data seeder — populates all localStorage namespaces with
 * realistic 6-month sample data for a paper cup & plate factory.
 */
import {
  saveSettings,
  saveRMPurchases, saveRMStock,
  saveCupProduction, savePlateProduction,
  saveFinishedGoods, savePackagingSessions,
  saveSales, savePayments,
  saveMonthlyWorkers, saveAttendance, saveSalaryAdvances, saveSalaryPayments,
  savePieceRateWorkers, savePieceRateEntries, savePieceRatePayments,
  saveHeaters, saveComponents, savePlateMaintenance,
  saveElectricityBills, saveMiscExpenses,
} from './storage';
import type {
  Settings, RawMaterialPurchase, RawMaterialStock,
  CupProductionSession, PlateProductionSession,
  FinishedGoodsStock, PackagingSession,
  SaleEntry, PaymentEntry,
  MonthlyWorker, AttendanceEntry, SalaryAdvance, SalaryPayment,
  PieceRateWorker, PieceRateEntry, PieceRatePayment,
  HeaterRecord, ComponentRecord, PlateMaintenanceEntry,
  ElectricityBill, MiscExpense,
} from './types';

let _id = 1000;
const uid = () => `D${_id++}`;
const bill = () => `BILL-${_id++}`;

function d(daysAgo: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function monthAgo(m: number): string {
  const dt = new Date();
  dt.setDate(1);
  dt.setMonth(dt.getMonth() - m);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}`;
}
const MONTHS = [0, 1, 2, 3, 4, 5].map(i => monthAgo(i)).reverse();

export function seedDummyData() {
  // ── Settings ────────────────────────────────────────────────────────────────
  const settings: Settings = {
    schemaVersion: 1,
    paperBlankRatePerKg: 85,
    paperBottomRatePerKg: 90,
    paraffinOilRatePerLitre: 45,
    mobilOilRatePerLitre: 220,
    plateSheetRatePerBundle: 320,
    ptRollRate: 180,
    boraBagRate: 12,
    cartonBoxRate: 28,
    transparentTapeRate: 35,
    plasticRopeRate: 60,
    margin50ml: 18,
    margin60ml: 18,
    margin210ml: 20,
    margin250ml: 20,
    marginPlate: 22,
    piecerate50ml: 25,
    piecerate60ml: 25,
    piecerate210ml: 30,
    piecerate250ml: 30,
    pieceratePlate: 8,
    thresholdPaperBlank: 500,
    thresholdPaperBottom: 300,
    thresholdParaffinOil: 50,
    thresholdMobilOil: 20,
    thresholdPlateSheets: 30,
    thresholdPtRoll: 10,
    thresholdBoraBag: 200,
    thresholdCarton: 50,
    transportHocker: 0.15,
    transportWholesaler: 0.20,
    transportRetailer: 0.25,
    transportFriend: 0.18,
    inboundTransportDefault: 0.10,
    electricityRatePerUnit: 8.5,
    fgThreshold50ml: 10,
    fgThreshold60ml: 10,
    fgThreshold210ml: 8,
    fgThreshold250ml: 8,
    fgThresholdPlate: 20,
    defaultSaleRate50ml: 0,
    defaultSaleRate60ml: 0,
    defaultSaleRate210ml: 0,
    defaultSaleRate250ml: 0,
    defaultSaleRatePlate: 0,
    // Net paper consumption — used until die-cut areas are entered
    blankGrams50ml: 1.50,
    blankGrams60ml: 1.80,
    blankGrams210ml: 2.84,  // measured: 1000g blank → 351 cups
    blankGrams250ml: 3.20,
    bottomGrams50ml: 0.40,
    bottomGrams60ml: 0.45,
    bottomGrams210ml: 0.73, // measured: 257g bottom → 351 cups
    bottomGrams250ml: 0.85,
    wallAreaMm250ml: 0,
    wallAreaMm260ml: 0,
    wallAreaMm2210ml: 0,
    wallAreaMm2250ml: 0,
    bottomAreaMm250ml: 0,
    bottomAreaMm260ml: 0,
    bottomAreaMm2210ml: 0,
    bottomAreaMm2250ml: 0,
    wallBaseGsm: 160,
    wallPeGsm: 0,
    bottomBaseGsm: 160,
    bottomPeGsm: 0,
    blankWastePct: 0,
    bottomWastePct: 44,     // 80g waste per 180g bottom = 44% trim
    printingCost50ml: 0.02,
    printingCost60ml: 0.02,
    printingCost210ml: 0.03,
    printingCost250ml: 0.03,
    electricityCost50ml: 0.01,
    electricityCost60ml: 0.01,
    electricityCost210ml: 0.015,
    electricityCost250ml: 0.015,
    packagingCost50ml: 0.04,
    packagingCost60ml: 0.04,
    packagingCost210ml: 0.05,
    packagingCost250ml: 0.05,
    monthlyOperationalOverhead: 150000,
    monthlyGoodCupVolume: 1000000,
    // Plate extras
    ppCostPerPlate: 0.035,
    platesPerSheetBundle: 100,
    platesPerBora: 400,     // 11rs per bora / 400 plates = ₹0.0275/plate
    defaultPlatesPerBora: 20,
    defaultCupsPerBundle: 25,
    // Business / GST details
    legalName: 'Kautilya Swaroop',
    tradeName: 'KS Manufactory',
    gstin: '10BVZPK9908A1ZG',
    stateCode: '10',
    billingAddress: 'KS Manufactory, Ram Swaroop sadan, damu chak road, Muzaffarpur, Bihar 842001',
  };
  saveSettings(settings);

  // ── Raw Material Purchases ──────────────────────────────────────────────────
  const rmPurchases: RawMaterialPurchase[] = [
    { id: uid(), date: d(165), supplierName: 'Rajesh Paper Depot', materialType: 'paperBlank', quantityReceived: 2000, billedQuantity: 1800, pricePerUnit: 85, withGst: true, gstAmount: 27540, hsnCode: '4811', inboundFreight: 1200, transportPerUnit: 0.6, notes: '' },
    { id: uid(), date: d(160), supplierName: 'Krishna Oil Traders', materialType: 'paraffinOil', quantityReceived: 200, billedQuantity: 200, pricePerUnit: 45, withGst: true, gstAmount: 1620, hsnCode: '2712', inboundFreight: 400, transportPerUnit: 2, notes: '' },
    { id: uid(), date: d(155), supplierName: 'Rajesh Paper Depot', materialType: 'paperBottom', quantityReceived: 800, billedQuantity: 700, pricePerUnit: 90, withGst: false, gstAmount: 0, hsnCode: '', inboundFreight: 600, transportPerUnit: 0.75, notes: '' },
    { id: uid(), date: d(140), supplierName: 'Plate Sheet Suppliers Pvt', materialType: 'plateSheets', quantityReceived: 200, billedQuantity: 180, pricePerUnit: 320, withGst: true, gstAmount: 10368, hsnCode: '4810', inboundFreight: 800, transportPerUnit: 4, notes: '' },
    { id: uid(), date: d(130), supplierName: 'Rajesh Paper Depot', materialType: 'paperBlank', quantityReceived: 1500, billedQuantity: 1400, pricePerUnit: 87, withGst: false, inboundFreight: 900, transportPerUnit: 0.6, notes: '' },
    { id: uid(), date: d(120), supplierName: 'Packaging World', materialType: 'ptRoll', quantityReceived: 100, billedQuantity: 100, pricePerUnit: 180, withGst: true, gstAmount: 3240, hsnCode: '3920', inboundFreight: 300, transportPerUnit: 3, notes: '' },
    { id: uid(), date: d(115), supplierName: 'Packaging World', materialType: 'cartonBox', quantityReceived: 500, billedQuantity: 500, pricePerUnit: 28, withGst: true, gstAmount: 2520, hsnCode: '4819', inboundFreight: 350, transportPerUnit: 0.7, notes: '' },
    { id: uid(), date: d(105), supplierName: 'Krishna Oil Traders', materialType: 'mobilOil', quantityReceived: 50, billedQuantity: 50, pricePerUnit: 220, withGst: true, gstAmount: 1980, hsnCode: '2710', inboundFreight: 200, transportPerUnit: 4, notes: '' },
    { id: uid(), date: d(95), supplierName: 'Rajesh Paper Depot', materialType: 'paperBlank', quantityReceived: 2200, billedQuantity: 2000, pricePerUnit: 86, withGst: true, gstAmount: 30960, hsnCode: '4811', inboundFreight: 1100, transportPerUnit: 0.5, notes: '' },
    { id: uid(), date: d(88), supplierName: 'Packaging World', materialType: 'boraBag', quantityReceived: 1000, billedQuantity: 1000, pricePerUnit: 12, withGst: false, inboundFreight: 200, transportPerUnit: 0.2, notes: '' },
    { id: uid(), date: d(75), supplierName: 'Plate Sheet Suppliers Pvt', materialType: 'plateSheets', quantityReceived: 150, billedQuantity: 130, pricePerUnit: 325, withGst: true, gstAmount: 7605, hsnCode: '4810', inboundFreight: 600, transportPerUnit: 4, notes: '' },
    { id: uid(), date: d(65), supplierName: 'Rajesh Paper Depot', materialType: 'paperBottom', quantityReceived: 600, billedQuantity: 550, pricePerUnit: 92, withGst: false, inboundFreight: 500, transportPerUnit: 0.83, notes: '' },
    { id: uid(), date: d(55), supplierName: 'Krishna Oil Traders', materialType: 'paraffinOil', quantityReceived: 150, billedQuantity: 150, pricePerUnit: 46, withGst: true, gstAmount: 1242, hsnCode: '2712', inboundFreight: 350, transportPerUnit: 2.33, notes: '' },
    { id: uid(), date: d(40), supplierName: 'Rajesh Paper Depot', materialType: 'paperBlank', quantityReceived: 1800, billedQuantity: 1600, pricePerUnit: 88, withGst: true, gstAmount: 25344, hsnCode: '4811', inboundFreight: 950, transportPerUnit: 0.53, notes: '' },
    { id: uid(), date: d(25), supplierName: 'Packaging World', materialType: 'cartonBox', quantityReceived: 400, billedQuantity: 400, pricePerUnit: 29, withGst: true, gstAmount: 2088, hsnCode: '4819', inboundFreight: 280, transportPerUnit: 0.7, notes: '' },
    { id: uid(), date: d(15), supplierName: 'Packaging World', materialType: 'transparentTape', quantityReceived: 60, billedQuantity: 60, pricePerUnit: 35, withGst: false, inboundFreight: 100, transportPerUnit: 1.67, notes: '' },
    { id: uid(), date: d(8), supplierName: 'Plate Sheet Suppliers Pvt', materialType: 'plateSheets', quantityReceived: 120, billedQuantity: 110, pricePerUnit: 330, withGst: true, gstAmount: 5808, hsnCode: '4810', inboundFreight: 500, transportPerUnit: 4.17, notes: '' },
  ];
  saveRMPurchases(rmPurchases);

  // ── Raw Material Stock ──────────────────────────────────────────────────────
  const rmStock: RawMaterialStock[] = [
    { materialType: 'paperBlank',      actualQty: 1240, declaredQty: 1000, lastUpdated: d(8) },
    { materialType: 'paperBottom',     actualQty: 580,  declaredQty: 510,  lastUpdated: d(15) },
    { materialType: 'paraffinOil',     actualQty: 95,   declaredQty: 95,   lastUpdated: d(15) },
    { materialType: 'mobilOil',        actualQty: 28,   declaredQty: 28,   lastUpdated: d(55) },
    { materialType: 'plateSheets',     actualQty: 85,   declaredQty: 75,   lastUpdated: d(8) },
    { materialType: 'ptRoll',          actualQty: 62,   declaredQty: 62,   lastUpdated: d(65) },
    { materialType: 'boraBag',         actualQty: 680,  declaredQty: 680,  lastUpdated: d(88) },
    { materialType: 'cartonBox',       actualQty: 210,  declaredQty: 210,  lastUpdated: d(25) },
    { materialType: 'transparentTape', actualQty: 42,   declaredQty: 42,   lastUpdated: d(15) },
    { materialType: 'plasticRope',     actualQty: 18,   declaredQty: 18,   lastUpdated: d(95) },
  ];
  saveRMStock(rmStock);

  // ── Cup Production ──────────────────────────────────────────────────────────
  const cupProd: CupProductionSession[] = [];
  const ops = ['Ramesh', 'Suresh', 'Mahesh'];
  const machineConfigs: { machine: 'A' | 'B' | 'C'; mold: '50ml' | '60ml' | '210ml' | '250ml'; speed: number }[] = [
    { machine: 'A', mold: '50ml', speed: 50 },
    { machine: 'A', mold: '60ml', speed: 50 },
    { machine: 'B', mold: '210ml', speed: 70 },
    { machine: 'C', mold: '250ml', speed: 70 },
  ];
  for (let i = 170; i >= 2; i -= 3) {
    const cfg = machineConfigs[Math.floor(Math.random() * machineConfigs.length)];
    const dur = 360 + Math.floor(Math.random() * 180);
    const theoretical = cfg.speed * dur;
    const eff = 72 + Math.floor(Math.random() * 22);
    cupProd.push({
      id: uid(), date: d(i),
      machineId: cfg.machine,
      activeMold: cfg.mold,
      operatorName: ops[Math.floor(Math.random() * ops.length)],
      durationMinutes: dur,
      actualCupsProduced: Math.round(theoretical * eff / 100),
      theoreticalOutput: theoretical,
      efficiency: eff,
      paraffinOilUsed: parseFloat((0.5 + Math.random() * 1.5).toFixed(1)),
      mobilOilUsed: parseFloat((0.1 + Math.random() * 0.4).toFixed(1)),
    });
  }
  saveCupProduction(cupProd);

  // ── Plate Production ───────────────────────────────────────────────────────
  const plateProd: PlateProductionSession[] = [];
  for (let i = 168; i >= 3; i -= 5) {
    const bundles = 30 + Math.floor(Math.random() * 20);
    plateProd.push({
      id: uid(), date: d(i),
      operator1: 'Ganesh', operator2: 'Dinesh',
      hoursWorked: 7 + Math.floor(Math.random() * 2),
      bundlesProduced: bundles,
      platesProduced: bundles * 20,
      sheetsConsumed: bundles * 10,
    });
  }
  savePlateProduction(plateProd);

  // ── Finished Goods ─────────────────────────────────────────────────────────
  const fgStock: FinishedGoodsStock[] = [
    { size: '50ml',  looseCups: 850,  bundles: 42,  cartons: 18 },
    { size: '60ml',  looseCups: 0,    bundles: 28,  cartons: 12 },
    { size: '210ml', looseCups: 500,  bundles: 35,  cartons: 8 },
    { size: '250ml', looseCups: 200,  bundles: 20,  cartons: 5 },
    { size: 'plate', looseCups: 0,    bundles: 60,  cartons: 0, loosePlates: 40, boras: 14 },
  ];
  saveFinishedGoods(fgStock);

  // ── Packaging Sessions ──────────────────────────────────────────────────────
  const packSessions: PackagingSession[] = [
    { id: uid(), date: d(10), productType: 'cup', size: '50ml', cupsPackedIntoBundle: 500, bundlesPackedIntoCarton: 20, ptRollUsed: 2, tapeRollsUsed: 1, cartonsUsed: 20 },
    { id: uid(), date: d(20), productType: 'cup', size: '210ml', cupsPackedIntoBundle: 100, bundlesPackedIntoCarton: 15, ptRollUsed: 1, tapeRollsUsed: 1, cartonsUsed: 15 },
    { id: uid(), date: d(30), productType: 'plate', bundlesPackedIntoBora: 50, borasUsed: 5, plasticRopeUsed: 2 },
    { id: uid(), date: d(45), productType: 'cup', size: '60ml', cupsPackedIntoBundle: 400, bundlesPackedIntoCarton: 18, ptRollUsed: 2, tapeRollsUsed: 1, cartonsUsed: 18 },
  ];
  savePackagingSessions(packSessions);

  // ── Sales ──────────────────────────────────────────────────────────────────
  const hockerBuyers = ['Mohan Hocker', 'Vijay Hocker', 'Anil Hocker', 'Sunil Hocker'];
  const sales: SaleEntry[] = [];

  const salesData: Array<{ daysAgo: number; channel: 'hocker' | 'wholesaler' | 'retailer' | 'friend'; buyer: string; product: '50ml' | '60ml' | '210ml' | '250ml' | 'plate'; qty: number; unit: 'bundles' | 'cartons' | 'boras' | 'loose'; rate: number; freight: number; received: number }> = [
    { daysAgo: 160, channel: 'hocker',      buyer: hockerBuyers[0], product: '50ml',  qty: 50,  unit: 'bundles', rate: 28,   freight: 210,  received: 1400 },
    { daysAgo: 155, channel: 'wholesaler',  buyer: 'City Mart',      product: '210ml', qty: 20,  unit: 'cartons', rate: 420,  freight: 350,  received: 8400 },
    { daysAgo: 150, channel: 'hocker',      buyer: hockerBuyers[1], product: '50ml',  qty: 40,  unit: 'bundles', rate: 28,   freight: 168,  received: 0    },
    { daysAgo: 145, channel: 'retailer',    buyer: 'Quick Store',    product: '60ml',  qty: 15,  unit: 'cartons', rate: 385,  freight: 280,  received: 5775 },
    { daysAgo: 140, channel: 'hocker',      buyer: hockerBuyers[2], product: '60ml',  qty: 60,  unit: 'bundles', rate: 30,   freight: 252,  received: 1800 },
    { daysAgo: 135, channel: 'friend',      buyer: 'Aakash (Friend)',product: 'plate', qty: 10,  unit: 'boras',   rate: 480,  freight: 150,  received: 4800 },
    { daysAgo: 130, channel: 'hocker',      buyer: hockerBuyers[0], product: '50ml',  qty: 55,  unit: 'bundles', rate: 28,   freight: 231,  received: 1540 },
    { daysAgo: 125, channel: 'wholesaler',  buyer: 'Metro Supply',   product: '250ml', qty: 12,  unit: 'cartons', rate: 510,  freight: 300,  received: 6120 },
    { daysAgo: 120, channel: 'hocker',      buyer: hockerBuyers[3], product: '210ml', qty: 30,  unit: 'bundles', rate: 42,   freight: 252,  received: 1260 },
    { daysAgo: 115, channel: 'retailer',    buyer: 'Corner Shop',    product: '50ml',  qty: 8,   unit: 'cartons', rate: 365,  freight: 200,  received: 2920 },
    { daysAgo: 110, channel: 'hocker',      buyer: hockerBuyers[1], product: '60ml',  qty: 45,  unit: 'bundles', rate: 30,   freight: 189,  received: 1350 },
    { daysAgo: 105, channel: 'hocker',      buyer: hockerBuyers[2], product: '50ml',  qty: 60,  unit: 'bundles', rate: 28,   freight: 252,  received: 1680 },
    { daysAgo: 100, channel: 'wholesaler',  buyer: 'City Mart',      product: 'plate', qty: 8,   unit: 'boras',   rate: 450,  freight: 400,  received: 3600 },
    { daysAgo: 95,  channel: 'hocker',      buyer: hockerBuyers[0], product: '210ml', qty: 35,  unit: 'bundles', rate: 42,   freight: 294,  received: 0    },
    { daysAgo: 90,  channel: 'friend',      buyer: 'Aakash (Friend)',product: '50ml',  qty: 20,  unit: 'cartons', rate: 340,  freight: 200,  received: 6800 },
    { daysAgo: 85,  channel: 'hocker',      buyer: hockerBuyers[3], product: '50ml',  qty: 50,  unit: 'bundles', rate: 29,   freight: 210,  received: 1450 },
    { daysAgo: 80,  channel: 'wholesaler',  buyer: 'Metro Supply',   product: '210ml', qty: 25,  unit: 'cartons', rate: 430,  freight: 420,  received: 10750 },
    { daysAgo: 75,  channel: 'hocker',      buyer: hockerBuyers[1], product: '250ml', qty: 25,  unit: 'bundles', rate: 52,   freight: 210,  received: 1300 },
    { daysAgo: 70,  channel: 'retailer',    buyer: 'Quick Store',    product: 'plate', qty: 5,   unit: 'boras',   rate: 490,  freight: 250,  received: 2450 },
    { daysAgo: 65,  channel: 'hocker',      buyer: hockerBuyers[2], product: '60ml',  qty: 55,  unit: 'bundles', rate: 30,   freight: 231,  received: 1650 },
    { daysAgo: 60,  channel: 'hocker',      buyer: hockerBuyers[0], product: '50ml',  qty: 65,  unit: 'bundles', rate: 29,   freight: 273,  received: 1885 },
    { daysAgo: 55,  channel: 'wholesaler',  buyer: 'City Mart',      product: '60ml',  qty: 18,  unit: 'cartons', rate: 390,  freight: 310,  received: 7020 },
    { daysAgo: 50,  channel: 'hocker',      buyer: hockerBuyers[3], product: '210ml', qty: 40,  unit: 'bundles', rate: 43,   freight: 336,  received: 1720 },
    { daysAgo: 45,  channel: 'hocker',      buyer: hockerBuyers[1], product: '50ml',  qty: 48,  unit: 'bundles', rate: 29,   freight: 202,  received: 1392 },
    { daysAgo: 40,  channel: 'retailer',    buyer: 'Corner Shop',    product: '210ml', qty: 10,  unit: 'cartons', rate: 445,  freight: 220,  received: 4450 },
    { daysAgo: 35,  channel: 'friend',      buyer: 'Aakash (Friend)',product: 'plate', qty: 12,  unit: 'boras',   rate: 460,  freight: 180,  received: 5520 },
    { daysAgo: 30,  channel: 'hocker',      buyer: hockerBuyers[0], product: '60ml',  qty: 52,  unit: 'bundles', rate: 31,   freight: 218,  received: 1612 },
    { daysAgo: 25,  channel: 'wholesaler',  buyer: 'Metro Supply',   product: '250ml', qty: 15,  unit: 'cartons', rate: 520,  freight: 350,  received: 7800 },
    { daysAgo: 20,  channel: 'hocker',      buyer: hockerBuyers[2], product: '50ml',  qty: 70,  unit: 'bundles', rate: 29,   freight: 294,  received: 0    },
    { daysAgo: 15,  channel: 'hocker',      buyer: hockerBuyers[3], product: '210ml', qty: 38,  unit: 'bundles', rate: 43,   freight: 319,  received: 1634 },
    { daysAgo: 10,  channel: 'retailer',    buyer: 'Quick Store',    product: '50ml',  qty: 12,  unit: 'cartons', rate: 370,  freight: 260,  received: 4440 },
    { daysAgo: 7,   channel: 'hocker',      buyer: hockerBuyers[1], product: '60ml',  qty: 44,  unit: 'bundles', rate: 31,   freight: 185,  received: 1364 },
    { daysAgo: 4,   channel: 'wholesaler',  buyer: 'City Mart',      product: 'plate', qty: 10,  unit: 'boras',   rate: 460,  freight: 420,  received: 4600 },
    { daysAgo: 2,   channel: 'hocker',      buyer: hockerBuyers[0], product: '50ml',  qty: 58,  unit: 'bundles', rate: 30,   freight: 244,  received: 0    },
    { daysAgo: 1,   channel: 'hocker',      buyer: hockerBuyers[2], product: '250ml', qty: 22,  unit: 'bundles', rate: 53,   freight: 185,  received: 1166 },
  ];

  salesData.forEach(s => {
    const total = s.qty * s.rate;
    const pending = total - s.received;
    sales.push({
      id: uid(), billNumber: bill(),
      date: d(s.daysAgo), channel: s.channel,
      buyerName: s.buyer, productType: s.product,
      quantityUnit: s.unit, quantity: s.qty,
      ratePerUnit: s.rate, totalAmount: total,
      amountReceived: s.received, pendingAmount: pending,
      outboundFreight: s.freight,
      friendMode: s.channel === 'friend' ? 'profit' : undefined,
    });
  });
  saveSales(sales);

  // ── Payments ────────────────────────────────────────────────────────────────
  const payments: PaymentEntry[] = [];
  sales.filter(s => s.pendingAmount === 0 && s.amountReceived > 0).slice(0, 8).forEach(s => {
    payments.push({ id: uid(), saleId: s.id, buyerName: s.buyerName, channel: s.channel, date: s.date, amountPaid: s.amountReceived });
  });
  savePayments(payments);

  // ── Monthly Workers ──────────────────────────────────────────────────────────
  const workers: MonthlyWorker[] = [
    { id: 'W1', name: 'Ramesh Kumar',  role: 'Machine Operator',  monthlySalary: 12000, joinDate: d(400), phone: '9876543210', active: true },
    { id: 'W2', name: 'Suresh Patel',  role: 'Machine Operator',  monthlySalary: 12000, joinDate: d(380), phone: '9876543211', active: true },
    { id: 'W3', name: 'Mahesh Singh',  role: 'Machine Operator',  monthlySalary: 11500, joinDate: d(200), phone: '9876543212', active: true },
    { id: 'W4', name: 'Ganesh Yadav',  role: 'Plate Operator',    monthlySalary: 10500, joinDate: d(350), phone: '9876543213', active: true },
    { id: 'W5', name: 'Dinesh Mishra', role: 'Helper',             monthlySalary: 9000,  joinDate: d(180), phone: '9876543214', active: true },
  ];
  saveMonthlyWorkers(workers);

  // ── Attendance ───────────────────────────────────────────────────────────────
  const attendance: AttendanceEntry[] = [];
  MONTHS.forEach((month, mi) => {
    workers.forEach(w => {
      const present = 22 + Math.floor(Math.random() * 4);
      const absent = Math.floor(Math.random() * 3);
      attendance.push({
        id: uid(), workerId: w.id, month,
        presentDays: present, absentDays: absent, halfDays: 0, totalWorkingDays: 26,
      });
    });
  });
  saveAttendance(attendance);

  // ── Salary Advances ──────────────────────────────────────────────────────────
  const advances: SalaryAdvance[] = [
    { id: uid(), workerId: 'W1', date: d(80), amount: 3000, deductOver: 3, amountDeducted: 1000, fullyDeducted: false },
    { id: uid(), workerId: 'W3', date: d(45), amount: 2000, deductOver: 2, amountDeducted: 1000, fullyDeducted: false },
    { id: uid(), workerId: 'W4', date: d(120), amount: 5000, deductOver: 2, amountDeducted: 5000, fullyDeducted: true },
  ];
  saveSalaryAdvances(advances);

  // ── Salary Payments ──────────────────────────────────────────────────────────
  const salaryPays: SalaryPayment[] = [];
  MONTHS.slice(0, 5).forEach(month => {
    workers.forEach(w => {
      const gross = w.monthlySalary;
      const deduction = 0;
      salaryPays.push({
        id: uid(), workerId: w.id, month,
        grossAmount: gross, deductions: deduction, netAmount: gross - deduction,
        amountPaid: gross - deduction, pendingAmount: 0, date: `01/${month.slice(5)}/2026`,
      });
    });
  });
  saveSalaryPayments(salaryPays);

  // ── Piece Rate Workers ───────────────────────────────────────────────────────
  const prWorkers: PieceRateWorker[] = [
    { id: 'PR1', name: 'Santosh',  phone: '9988776655', active: true },
    { id: 'PR2', name: 'Prakash',  phone: '9988776656', active: true },
    { id: 'PR3', name: 'Mukesh',   phone: '9988776657', active: true },
  ];
  savePieceRateWorkers(prWorkers);

  // ── Piece Rate Entries ───────────────────────────────────────────────────────
  const prEntries: PieceRateEntry[] = [];
  for (let i = 170; i >= 1; i -= 2) {
    prWorkers.forEach((w, wi) => {
      const products: Array<'50ml' | '60ml' | '210ml' | '250ml' | 'plate'> = ['50ml', '60ml', 'plate'];
      const product = products[wi % products.length];
      const qty = product === 'plate' ? 30 + Math.floor(Math.random() * 20) : 800 + Math.floor(Math.random() * 400);
      const rates: Record<string, number> = { '50ml': 25, '60ml': 25, '210ml': 30, '250ml': 30, 'plate': 8 };
      const rate = rates[product];
      const earnings = product === 'plate' ? qty * rate : Math.round((qty / 1000) * rate);
      prEntries.push({ id: uid(), workerId: w.id, date: d(i), productType: product, quantityProduced: qty, earningsAmount: earnings });
    });
  }
  savePieceRateEntries(prEntries);

  // ── Piece Rate Payments ──────────────────────────────────────────────────────
  const prPayments: PieceRatePayment[] = [];
  MONTHS.slice(0, 4).forEach((_, mi) => {
    prWorkers.forEach(w => {
      prPayments.push({ id: uid(), workerId: w.id, date: d(mi * 30 + 5), amountPaid: 3500 + Math.floor(Math.random() * 1500) });
    });
  });
  savePieceRatePayments(prPayments);

  // ── Heaters ──────────────────────────────────────────────────────────────────
  const heaters: HeaterRecord[] = [];
  (['A', 'B', 'C'] as const).forEach(machine => {
    for (let h = 1; h <= 7; h++) {
      const daysAgoReplaced = 10 + Math.floor(Math.random() * 50);
      const cost = 180 + Math.floor(Math.random() * 120);
      heaters.push({
        machineId: machine, heaterNumber: h,
        lastReplacedDate: d(daysAgoReplaced), replacementCost: cost,
        expectedCycleUnits: (30 + Math.floor(Math.random() * 30)) * 15000,
        history: [{ date: d(daysAgoReplaced + 35), cost, notes: 'Routine replacement' }],
      });
    }
  });
  saveHeaters(heaters);

  // ── Components ───────────────────────────────────────────────────────────────
  const components: ComponentRecord[] = [];
  (['A', 'B', 'C'] as const).forEach(machine => {
    const tcDays = 15 + Math.floor(Math.random() * 30);
    components.push({
      id: uid(), machineId: machine, componentType: 'thermocouple',
      lastReplacedDate: d(tcDays), replacementCost: 450, expectedCycleUnits: 300000,
      history: [{ date: d(tcDays + 45), cost: 450 }],
    });
    const bcDays = 20 + Math.floor(Math.random() * 40);
    components.push({
      id: uid(), machineId: machine, componentType: 'bottomCutter',
      lastReplacedDate: d(bcDays), replacementCost: 850, expectedCycleUnits: 400000,
      history: [{ date: d(bcDays + 60), cost: 850 }],
    });
  });
  saveComponents(components);

  // ── Plate Maintenance ────────────────────────────────────────────────────────
  const plateMaint: PlateMaintenanceEntry[] = [
    { id: uid(), date: d(55), description: 'Die alignment done', cost: 1200 },
    { id: uid(), date: d(30), description: 'Motor belt replaced', cost: 650 },
    { id: uid(), date: d(10), description: 'Oil change and cleaning', cost: 300 },
  ];
  savePlateMaintenance(plateMaint);

  // ── Electricity Bills ────────────────────────────────────────────────────────
  const elecBills: ElectricityBill[] = MONTHS.slice(0, 5).map((m, i) => ({
    id: uid(), billingPeriod: m, date: d(i * 30 + 5),
    unitsConsumed: 1800 + Math.floor(Math.random() * 600),
    amount: (1800 + Math.floor(Math.random() * 600)) * 8.5,
  }));
  saveElectricityBills(elecBills);

  // ── Misc Expenses ────────────────────────────────────────────────────────────
  const misc: MiscExpense[] = [
    { id: uid(), date: d(155), description: 'Machine A belt replacement',  amount: 800  },
    { id: uid(), date: d(130), description: 'Office supplies',              amount: 350  },
    { id: uid(), date: d(110), description: 'Machine C heater wiring',      amount: 1200 },
    { id: uid(), date: d(90),  description: 'Local goods vehicle hire',     amount: 2500 },
    { id: uid(), date: d(72),  description: 'Factory cleaning supplies',    amount: 600  },
    { id: uid(), date: d(55),  description: 'Electrical panel work',        amount: 3500 },
    { id: uid(), date: d(40),  description: 'Bill books & receipts',        amount: 250  },
    { id: uid(), date: d(22),  description: 'Labour for unloading',         amount: 800  },
    { id: uid(), date: d(12),  description: 'Plate machine die repair',     amount: 1800 },
    { id: uid(), date: d(5),   description: 'Tea & refreshments for workers', amount: 450 },
  ];
  saveMiscExpenses(misc);
}
