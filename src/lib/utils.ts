// Indian number formatting
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

// Date helpers — DD/MM/YYYY
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // If already DD/MM/YYYY return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // If YYYY-MM-DD convert
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toInputDate(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return ddmmyyyy;
}

export function fromInputDate(yyyymmdd: string): string {
  if (!yyyymmdd) return '';
  const parts = yyyymmdd.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return yyyymmdd;
}

export function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateBillNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `BILL-${yy}${mm}-${seq}`;
}

export function daysUntil(ddmmyyyy: string, cycleDays: number): number {
  if (!ddmmyyyy) return 0;
  const parts = ddmmyyyy.split('/');
  const replaced = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const nextDue = new Date(replaced.getTime() + cycleDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((nextDue.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row =>
    keys.map(k => {
      const v = String(row[k] ?? '').replace(/"/g, '""');
      return `"${v}"`;
    }).join(',')
  )];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// Cup speed lookup
export function getCupSpeed(size: string): number {
  if (size === '50ml' || size === '60ml') return 50;
  return 70; // 210ml, 250ml
}

// Cups per bundle by size
export function cupsPerBundle(size: string): number {
  if (size === '50ml' || size === '60ml') return 100;
  if (size === '210ml') return 50;
  return 25; // 250ml — adjust per factory practice
}
