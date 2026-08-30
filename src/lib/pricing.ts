import type { Settings, CupSize } from './types';

export interface PriceResult {
  manufacturingCostPerUnit: number;
  trueRmCostPerUnit: number;
  baseSellPrice: number;
  priceWithoutGST: number;
  priceWithGST: number;
  gstAmount: number;
  marginAmount: number;
  marginPct: number;
  breakdown: ManufacturingCostBreakdown;
}

export interface ManufacturingCostBreakdown {
  wallNetGrams: number;
  bottomNetGrams: number;
  wallInputGrams: number;
  bottomInputGrams: number;
  paperCost: number;
  laborCost: number;
  printingCost: number;
  electricityCost: number;
  packagingCost: number;
  overheadCost: number;
  totalCost: number;
}

export type ProductKey = '50ml' | '60ml' | '210ml' | '250ml' | 'plate';

export interface ChannelPrices {
  hocker: PriceResult;
  wholesaler: PriceResult;
  retailer: PriceResult;
  friend_zero: PriceResult;
  friend_profit: PriceResult;
}

function calcPrice(
  breakdown: ManufacturingCostBreakdown,
  inboundTransport: number,
  outboundTransport: number,
  marginPct: number
): PriceResult {
  const manufacturingCostPerUnit = breakdown.totalCost;
  const trueRmCostPerUnit = manufacturingCostPerUnit + inboundTransport;
  const marginAmount = trueRmCostPerUnit * (marginPct / 100);
  const baseSellPrice = trueRmCostPerUnit + outboundTransport + marginAmount;
  const priceWithoutGST = baseSellPrice;
  const priceWithGST = baseSellPrice * 1.18;
  const gstAmount = priceWithGST - priceWithoutGST;
  return {
    manufacturingCostPerUnit,
    trueRmCostPerUnit,
    baseSellPrice,
    priceWithoutGST,
    priceWithGST,
    gstAmount,
    marginAmount,
    marginPct,
    breakdown,
  };
}

function inputGramsAfterWaste(netGrams: number, wastePct: number): number {
  const yieldRate = 1 - Math.min(Math.max(wastePct, 0), 99.99) / 100;
  return netGrams / yieldRate;
}

export function calcCupManufacturingCost(
  size: CupSize,
  settings: Settings,
  paperCostOverride?: number
): ManufacturingCostBreakdown {
  const blankGrams: Record<CupSize, number> = {
    '50ml': settings.blankGrams50ml,
    '60ml': settings.blankGrams60ml,
    '210ml': settings.blankGrams210ml,
    '250ml': settings.blankGrams250ml,
  };
  const bottomGrams: Record<CupSize, number> = {
    '50ml': settings.bottomGrams50ml,
    '60ml': settings.bottomGrams60ml,
    '210ml': settings.bottomGrams210ml,
    '250ml': settings.bottomGrams250ml,
  };
  const wallAreas: Record<CupSize, number> = {
    '50ml': settings.wallAreaMm250ml,
    '60ml': settings.wallAreaMm260ml,
    '210ml': settings.wallAreaMm2210ml,
    '250ml': settings.wallAreaMm2250ml,
  };
  const bottomAreas: Record<CupSize, number> = {
    '50ml': settings.bottomAreaMm250ml,
    '60ml': settings.bottomAreaMm260ml,
    '210ml': settings.bottomAreaMm2210ml,
    '250ml': settings.bottomAreaMm2250ml,
  };
  const pieceRates: Record<CupSize, number> = {
    '50ml': settings.piecerate50ml,
    '60ml': settings.piecerate60ml,
    '210ml': settings.piecerate210ml,
    '250ml': settings.piecerate250ml,
  };
  const printingCosts: Record<CupSize, number> = {
    '50ml': settings.printingCost50ml,
    '60ml': settings.printingCost60ml,
    '210ml': settings.printingCost210ml,
    '250ml': settings.printingCost250ml,
  };
  const electricityCosts: Record<CupSize, number> = {
    '50ml': settings.electricityCost50ml,
    '60ml': settings.electricityCost60ml,
    '210ml': settings.electricityCost210ml,
    '250ml': settings.electricityCost250ml,
  };
  const packagingCosts: Record<CupSize, number> = {
    '50ml': settings.packagingCost50ml,
    '60ml': settings.packagingCost60ml,
    '210ml': settings.packagingCost210ml,
    '250ml': settings.packagingCost250ml,
  };

  const wallArea = wallAreas[size];
  const bottomArea = bottomAreas[size];
  const wallNetGrams = wallArea > 0
    ? (wallArea * (settings.wallBaseGsm + settings.wallPeGsm)) / 1_000_000
    : blankGrams[size];
  const bottomNetGrams = bottomArea > 0
    ? (bottomArea * (settings.bottomBaseGsm + settings.bottomPeGsm)) / 1_000_000
    : bottomGrams[size];
  const wallInputGrams = inputGramsAfterWaste(wallNetGrams, settings.blankWastePct);
  const bottomInputGrams = inputGramsAfterWaste(bottomNetGrams, settings.bottomWastePct);
  const calculatedPaperCost =
    (wallInputGrams / 1000) * settings.paperBlankRatePerKg +
    (bottomInputGrams / 1000) * settings.paperBottomRatePerKg;
  const paperCost = paperCostOverride ?? calculatedPaperCost;
  const laborCost = pieceRates[size] / 1000;
  const printingCost = printingCosts[size];
  const electricityCost = electricityCosts[size];
  const packagingCost = packagingCosts[size];
  const overheadCost = settings.monthlyGoodCupVolume > 0
    ? settings.monthlyOperationalOverhead / settings.monthlyGoodCupVolume
    : 0;
  const totalCost = paperCost + laborCost + printingCost + electricityCost + packagingCost + overheadCost;

  return {
    wallNetGrams,
    bottomNetGrams,
    wallInputGrams,
    bottomInputGrams,
    paperCost,
    laborCost,
    printingCost,
    electricityCost,
    packagingCost,
    overheadCost,
    totalCost,
  };
}

export function calcProductPrices(
  product: ProductKey,
  settings: Settings,
  overrides?: {
    rmCost?: number;
    inbound?: number;
    outboundHocker?: number;
    outboundWholesaler?: number;
    outboundRetailer?: number;
    outboundFriend?: number;
  }
): ChannelPrices {
  let breakdown: ManufacturingCostBreakdown;
  if (product === 'plate') {
    // RM cost per plate = sheet cost + PP film + bora packaging spread per plate
    const platesPerBundle = settings.platesPerSheetBundle > 0 ? settings.platesPerSheetBundle : 100;
    const sheetCostPerPlate = settings.plateSheetRatePerBundle / platesPerBundle;
    const boraCostPerPlate = settings.platesPerBora > 0 ? settings.boraBagRate / settings.platesPerBora : 0;
    const paperCost = sheetCostPerPlate + settings.ppCostPerPlate + boraCostPerPlate;
    breakdown = {
      wallNetGrams: 0,
      bottomNetGrams: 0,
      wallInputGrams: 0,
      bottomInputGrams: 0,
      paperCost,
      laborCost: 0,
      printingCost: 0,
      electricityCost: 0,
      packagingCost: 0,
      overheadCost: 0,
      totalCost: paperCost,
    };
  } else {
    breakdown = calcCupManufacturingCost(product, settings, overrides?.rmCost);
  }
  if (product === 'plate' && overrides?.rmCost !== undefined) {
    breakdown = { ...breakdown, paperCost: overrides.rmCost, totalCost: overrides.rmCost };
  }

  const inbound = overrides?.inbound ?? settings.inboundTransportDefault;

  const marginPctMap: Record<ProductKey, number> = {
    '50ml': settings.margin50ml,
    '60ml': settings.margin60ml,
    '210ml': settings.margin210ml,
    '250ml': settings.margin250ml,
    plate: settings.marginPlate,
  };
  const marginPct = marginPctMap[product];

  const oH = overrides?.outboundHocker ?? settings.transportHocker;
  const oW = overrides?.outboundWholesaler ?? settings.transportWholesaler;
  const oR = overrides?.outboundRetailer ?? settings.transportRetailer;
  const oF = overrides?.outboundFriend ?? settings.transportFriend;

  return {
    hocker: calcPrice(breakdown, inbound, oH, marginPct),
    wholesaler: calcPrice(breakdown, inbound, oW, marginPct),
    retailer: calcPrice(breakdown, inbound, oR, marginPct),
    friend_zero: calcPrice(breakdown, inbound, oF, 0), // zero margin
    friend_profit: calcPrice(breakdown, inbound, oF, marginPct),
  };
}

export function getAllProductPrices(settings: Settings): Record<ProductKey, ChannelPrices> {
  const products: ProductKey[] = ['50ml', '60ml', '210ml', '250ml', 'plate'];
  const result = {} as Record<ProductKey, ChannelPrices>;
  for (const p of products) {
    result[p] = calcProductPrices(p, settings);
  }
  return result;
}

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  '50ml': 'Cup 50 ml',
  '60ml': 'Cup 60 ml',
  '210ml': 'Cup 210 ml',
  '250ml': 'Cup 250 ml',
  plate: 'Buffet Plate 13"',
};

export const CHANNEL_LABELS: Record<string, string> = {
  hocker: 'Hocker',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  friend_zero: 'Friend (Zero Profit)',
  friend_profit: 'Friend (Seasonal)',
};
