import type { Settings, Channel, CupSize } from './types';

export interface PriceResult {
  trueRmCostPerUnit: number;
  baseSellPrice: number;
  priceWithoutGST: number;
  priceWithGST: number;
  gstAmount: number;
  marginAmount: number;
  marginPct: number;
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
  rmCost: number,
  inboundTransport: number,
  outboundTransport: number,
  marginPct: number
): PriceResult {
  const trueRmCostPerUnit = rmCost + inboundTransport;
  const marginAmount = trueRmCostPerUnit * (marginPct / 100);
  const baseSellPrice = trueRmCostPerUnit + outboundTransport + marginAmount;
  const priceWithoutGST = baseSellPrice;
  const priceWithGST = baseSellPrice * 1.18;
  const gstAmount = priceWithGST - priceWithoutGST;
  return {
    trueRmCostPerUnit,
    baseSellPrice,
    priceWithoutGST,
    priceWithGST,
    gstAmount,
    marginAmount,
    marginPct,
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
  // RM cost per unit — simplified: use base rate from settings
  let rmCost = 0;
  if (product === 'plate') {
    // 1 bundle = 20 plates, cost = sheet bundle rate / 20
    rmCost = settings.plateSheetRatePerBundle / 20;
  } else {
    // For cups: use paperBlank + paperBottom as combined RM cost per cup
    // Apportionment by size (larger cups use more paper)
    const multipliers: Record<CupSize, number> = {
      '50ml': 0.003,
      '60ml': 0.0035,
      '210ml': 0.008,
      '250ml': 0.01,
    };
    const m = multipliers[product as CupSize] ?? 0.005;
    rmCost = (settings.paperBlankRatePerKg + settings.paperBottomRatePerKg) * m;
  }
  if (overrides?.rmCost !== undefined) rmCost = overrides.rmCost;

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
    hocker: calcPrice(rmCost, inbound, oH, marginPct),
    wholesaler: calcPrice(rmCost, inbound, oW, marginPct),
    retailer: calcPrice(rmCost, inbound, oR, marginPct),
    friend_zero: calcPrice(rmCost, inbound, oF, 0), // zero margin
    friend_profit: calcPrice(rmCost, inbound, oF, marginPct),
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
