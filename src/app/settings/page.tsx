'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, Button, Input, SectionHeader, Alert } from '@/components/UI';
import { formatINR } from '@/lib/utils';
import { getAllProductPrices, PRODUCT_LABELS } from '@/lib/pricing';
import type { Settings } from '@/lib/types';

interface FieldDef {
  key: keyof Settings;
  label: string;
  unit?: string;
  group: string;
}

const FIELDS: FieldDef[] = [
  // RM Rates
  { key: 'paperBlankRatePerKg', label: 'Paper Blank Rate', unit: '₹/kg', group: 'Raw Material Rates' },
  { key: 'paperBottomRatePerKg', label: 'Paper Bottom Rate', unit: '₹/kg', group: 'Raw Material Rates' },
  { key: 'paraffinOilRatePerLitre', label: 'Paraffin Oil Rate', unit: '₹/litre', group: 'Raw Material Rates' },
  { key: 'mobilOilRatePerLitre', label: 'Mobil Oil Rate', unit: '₹/litre', group: 'Raw Material Rates' },
  { key: 'plateSheetRatePerBundle', label: 'Plate Sheet Rate', unit: '₹/bundle(100 sheets)', group: 'Raw Material Rates' },
  // Packaging
  { key: 'ptRollRate', label: 'PT Roll Rate', unit: '₹/roll', group: 'Packaging Rates' },
  { key: 'boraBagRate', label: 'Bora Bag Rate', unit: '₹/bora', group: 'Packaging Rates' },
  { key: 'cartonBoxRate', label: 'Carton Box Rate', unit: '₹/carton', group: 'Packaging Rates' },
  { key: 'transparentTapeRate', label: 'Transparent Tape Rate', unit: '₹/roll', group: 'Packaging Rates' },
  { key: 'plasticRopeRate', label: 'Plastic Rope Rate', unit: '₹/unit', group: 'Packaging Rates' },
  // Margins
  { key: 'margin50ml', label: 'Cup 50 ml Margin', unit: '%', group: 'Margin %' },
  { key: 'margin60ml', label: 'Cup 60 ml Margin', unit: '%', group: 'Margin %' },
  { key: 'margin210ml', label: 'Cup 210 ml Margin', unit: '%', group: 'Margin %' },
  { key: 'margin250ml', label: 'Cup 250 ml Margin', unit: '%', group: 'Margin %' },
  { key: 'marginPlate', label: 'Plate 13" Margin', unit: '%', group: 'Margin %' },
  // Transport
  { key: 'inboundTransportDefault', label: 'Default Inbound Transport', unit: '₹/unit', group: 'Transport Defaults' },
  { key: 'transportHocker', label: 'Outbound — Hocker', unit: '₹/unit', group: 'Transport Defaults' },
  { key: 'transportWholesaler', label: 'Outbound — Wholesaler', unit: '₹/unit', group: 'Transport Defaults' },
  { key: 'transportRetailer', label: 'Outbound — Retailer', unit: '₹/unit', group: 'Transport Defaults' },
  { key: 'transportFriend', label: 'Outbound — Friend', unit: '₹/unit', group: 'Transport Defaults' },
  // Piece rates
  { key: 'piecerate50ml', label: 'Piece Rate — Cup 50 ml', unit: '₹/1000 cups', group: 'Worker Piece Rates' },
  { key: 'piecerate60ml', label: 'Piece Rate — Cup 60 ml', unit: '₹/1000 cups', group: 'Worker Piece Rates' },
  { key: 'piecerate210ml', label: 'Piece Rate — Cup 210 ml', unit: '₹/1000 cups', group: 'Worker Piece Rates' },
  { key: 'piecerate250ml', label: 'Piece Rate — Cup 250 ml', unit: '₹/1000 cups', group: 'Worker Piece Rates' },
  { key: 'pieceratePlate', label: 'Piece Rate — Plate', unit: '₹/bundle', group: 'Worker Piece Rates' },
  // Thresholds RM
  { key: 'thresholdPaperBlank', label: 'Low Stock — Paper Blank', unit: 'kg', group: 'Low Stock Alerts' },
  { key: 'thresholdPaperBottom', label: 'Low Stock — Paper Bottom', unit: 'kg', group: 'Low Stock Alerts' },
  { key: 'thresholdParaffinOil', label: 'Low Stock — Paraffin Oil', unit: 'litres', group: 'Low Stock Alerts' },
  { key: 'thresholdMobilOil', label: 'Low Stock — Mobil Oil', unit: 'litres', group: 'Low Stock Alerts' },
  { key: 'thresholdPlateSheets', label: 'Low Stock — Plate Sheets', unit: 'bundles', group: 'Low Stock Alerts' },
  { key: 'thresholdPtRoll', label: 'Low Stock — PT Rolls', unit: 'rolls', group: 'Low Stock Alerts' },
  { key: 'thresholdBoraBag', label: 'Low Stock — Bora Bags', unit: 'boras', group: 'Low Stock Alerts' },
  { key: 'thresholdCarton', label: 'Low Stock — Cartons', unit: 'boxes', group: 'Low Stock Alerts' },
  // FG thresholds
  { key: 'fgThreshold50ml', label: 'FG Low — Cup 50 ml', unit: 'cartons', group: 'Finished Goods Alerts' },
  { key: 'fgThreshold60ml', label: 'FG Low — Cup 60 ml', unit: 'cartons', group: 'Finished Goods Alerts' },
  { key: 'fgThreshold210ml', label: 'FG Low — Cup 210 ml', unit: 'cartons', group: 'Finished Goods Alerts' },
  { key: 'fgThreshold250ml', label: 'FG Low — Cup 250 ml', unit: 'cartons', group: 'Finished Goods Alerts' },
  { key: 'fgThresholdPlate', label: 'FG Low — Plates', unit: 'boras', group: 'Finished Goods Alerts' },
  { key: 'electricityRatePerUnit', label: 'Electricity Rate', unit: '₹/unit', group: 'Utilities' },
  // Default selling prices (auto-updated from last sale for each product)
  { key: 'defaultSaleRate50ml', label: 'Cup 50 ml — Default Sale Rate', unit: '₹/unit', group: 'Default Selling Prices' },
  { key: 'defaultSaleRate60ml', label: 'Cup 60 ml — Default Sale Rate', unit: '₹/unit', group: 'Default Selling Prices' },
  { key: 'defaultSaleRate210ml', label: 'Cup 210 ml — Default Sale Rate', unit: '₹/unit', group: 'Default Selling Prices' },
  { key: 'defaultSaleRate250ml', label: 'Cup 250 ml — Default Sale Rate', unit: '₹/unit', group: 'Default Selling Prices' },
  { key: 'defaultSaleRatePlate', label: 'Plate 13" — Default Sale Rate', unit: '₹/unit', group: 'Default Selling Prices' },
];

const GROUPS = Array.from(new Set(FIELDS.map(f => f.group)));

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [local, setLocal] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLocal(settings); }, [settings]);

  const handleChange = (key: keyof Settings, val: string) => {
    setLocal(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleSave = () => {
    updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const prices = getAllProductPrices(local);

  return (
    <div className="space-y-6 max-w-5xl">
      {saved && <Alert variant="green">✓ Settings saved — prices auto-recalculated across all channels</Alert>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            All rates, margins and thresholds. Changing any rate instantly recalculates prices.
          </p>
        </div>
        <Button onClick={handleSave}>Save All Settings</Button>
      </div>

      {/* Rate Groups */}
      {GROUPS.map(group => (
        <Card key={group}>
          <SectionHeader title={group} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.filter(f => f.group === group).map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {f.label} {f.unit && <span className="opacity-60">({f.unit})</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={local[f.key] as number}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Live Price Table */}
      <Card>
        <SectionHeader title="Live Pricing Preview" subtitle="Auto-calculated from current rates — updates as you edit" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-muted)' }}>Product</th>
                {['Hocker', 'Wholesaler', 'Retailer', 'Friend (Zero)', 'Friend (Profit)'].map(ch => (
                  <th key={ch} className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>{ch}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(prices) as (keyof typeof prices)[]).map(prod => {
                const p = prices[prod];
                return (
                  <tr key={prod} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)' }}>{PRODUCT_LABELS[prod]}</td>
                    {[p.hocker, p.wholesaler, p.retailer, p.friend_zero, p.friend_profit].map((ch, i) => (
                      <td key={i} className="px-3 py-2 text-right">
                        <div className="font-semibold" style={{ color: 'var(--green)' }}>{formatINR(ch.priceWithoutGST)}</div>
                        <div style={{ color: 'var(--text-muted)' }}>+GST: {formatINR(ch.priceWithGST)}</div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
