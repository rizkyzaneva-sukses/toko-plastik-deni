import { Transaksi, Outlet } from '../types';

/**
 * Format currency to Indonesian Rupiah integer format (e.g. Rp 1.250.000)
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  const cleanAmount = Math.round(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(cleanAmount);
  return `Rp ${formatted}`;
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
}

/**
 * Format raw string or number to thousand-separated dots (e.g. "100000" -> "100.000")
 */
export function formatThousands(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const cleanDigits = String(val).replace(/\D/g, '');
  if (!cleanDigits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(cleanDigits));
}

/**
 * Parse string with dots or commas into pure integer (e.g. "100.000" -> 100000)
 */
export function parseThousands(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  const cleanDigits = String(val).replace(/\D/g, '');
  return cleanDigits ? parseInt(cleanDigits, 10) : 0;
}

/**
 * Indonesian number to text generator (Terbilang)
 */
function toTerbilang(n: number): string {
  if (n <= 0) return '';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return satuan[n];
  if (n < 20) return toTerbilang(n - 10) + ' Belas';
  if (n < 100) return toTerbilang(Math.floor(n / 10)) + ' Puluh ' + (n % 10 > 0 ? toTerbilang(n % 10) : '');
  if (n < 200) return 'Seratus ' + (n % 100 > 0 ? toTerbilang(n % 100) : '');
  if (n < 1000) return toTerbilang(Math.floor(n / 100)) + ' Ratus ' + (n % 100 > 0 ? toTerbilang(n % 100) : '');
  if (n < 2000) return 'Seribu ' + (n % 1000 > 0 ? toTerbilang(n % 1000) : '');
  if (n < 1000000) return toTerbilang(Math.floor(n / 1000)) + ' Ribu ' + (n % 1000 > 0 ? toTerbilang(n % 1000) : '');
  if (n < 1000000000) return toTerbilang(Math.floor(n / 1000000)) + ' Juta ' + (n % 1000000 > 0 ? toTerbilang(n % 1000000) : '');
  if (n < 1000000000000) return toTerbilang(Math.floor(n / 1000000000)) + ' Miliar ' + (n % 1000000000 > 0 ? toTerbilang(n % 1000000000) : '');
  return toTerbilang(Math.floor(n / 1000000000000)) + ' Triliun ' + (n % 1000000000000 > 0 ? toTerbilang(n % 1000000000000) : '');
}

/**
 * Format number into clear Indonesian words (e.g. 500000 -> "Lima Ratus Ribu Rupiah")
 */
export function terbilangRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount) || amount <= 0) {
    return '';
  }
  const clean = Math.round(amount);
  const text = toTerbilang(clean).trim().replace(/\s+/g, ' ');
  return `${text} Rupiah`;
}

/**
 * Today's date as YYYY-MM-DD in Asia/Jakarta (not UTC).
 */
export function todayWIBDate(from?: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(from || new Date());
}

/**
 * Add calendar days then return YYYY-MM-DD in Asia/Jakarta.
 */
export function addDaysWIB(days: number, from?: Date): string {
  const d = from ? new Date(from.getTime()) : new Date();
  d.setDate(d.getDate() + days);
  return todayWIBDate(d);
}

/**
 * Format date in WIB (Asia/Jakarta)
 * e.g. 20 Agu 2026
 */
export function formatWIBDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format date and time in WIB (Asia/Jakarta)
 * e.g. 20 Agu 2026, 14:35 WIB
 */
export function formatWIBDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return `${dateFormatted} WIB`;
  } catch {
    return dateStr;
  }
}

/**
 * Format time only in WIB (Asia/Jakarta)
 */
export function formatWIBTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d) + ' WIB';
  } catch {
    return dateStr;
  }
}

/**
 * Calculate bill & coin denominations for change
 */
export function calculateChangeDenominations(change: number): Array<{ denomination: number; count: number; label: string }> {
  if (change <= 0) return [];

  const denominations = [
    { value: 100000, label: 'Rp 100.000' },
    { value: 50000, label: 'Rp 50.000' },
    { value: 20000, label: 'Rp 20.000' },
    { value: 10000, label: 'Rp 10.000' },
    { value: 5000, label: 'Rp 5.000' },
    { value: 2000, label: 'Rp 2.000' },
    { value: 1000, label: 'Rp 1.000' },
    { value: 500, label: 'Rp 500' },
  ];

  let remaining = change;
  const result: Array<{ denomination: number; count: number; label: string }> = [];

  for (const item of denominations) {
    if (remaining >= item.value) {
      const count = Math.floor(remaining / item.value);
      remaining = remaining % item.value;
      result.push({
        denomination: item.value,
        count,
        label: item.label,
      });
    }
  }

  return result;
}

/**
 * Generate smart cash suggestion buttons based on total
 */
export function generateSmartCashSuggestions(total: number): number[] {
  if (total <= 0) return [10000, 20000, 50000, 100000];

  const suggestions = new Set<number>();
  suggestions.add(total); // Uang Pas

  // Smart round up to next 10,000
  const next10k = Math.ceil(total / 10000) * 10000;
  if (next10k > total) suggestions.add(next10k);

  // Smart round up to next 20,000
  const next20k = Math.ceil(total / 20000) * 20000;
  if (next20k > total) suggestions.add(next20k);

  // Standard major denominations if greater than total
  const standardPecahan = [50000, 100000, 150000, 200000, 300000, 500000];
  for (const p of standardPecahan) {
    if (p > total && suggestions.size < 6) {
      suggestions.add(p);
    }
  }

  return Array.from(suggestions).sort((a, b) => a - b);
}

/**
 * Helper to center text in a 32-character line
 */
function centerText(text: string, width = 32): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  const rightPadding = width - text.length - leftPadding;
  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}

/**
 * Helper to format a two-column line (left aligned text, right aligned text)
 */
function twoColumns(left: string, right: string, width = 32): string {
  const maxLeft = width - right.length - 1;
  if (left.length > maxLeft) {
    left = left.substring(0, maxLeft);
  }
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * Generate 58mm thermal receipt layout strictly constrained to 32 characters per line
 */
export function generateThermal58mmReceipt(transaksi: Transaksi, outlet: Outlet): string[] {
  const WIDTH = 32;
  const lines: string[] = [];
  const divider = '='.repeat(WIDTH);
  const dashLine = '-'.repeat(WIDTH);

  // Header
  lines.push(centerText(outlet.nama.toUpperCase()));
  if (outlet.alamat) lines.push(centerText(outlet.alamat));
  if (outlet.telepon) lines.push(centerText(`Telp: ${outlet.telepon}`));
  lines.push(divider);

  // Metadata
  lines.push(twoColumns('No:', transaksi.nomor));
  lines.push(twoColumns('Tgl:', formatWIBDateTime(transaksi.createdAt)));
  lines.push(twoColumns('Kasir:', transaksi.kasirNama));
  if (transaksi.pelangganNama) {
    lines.push(twoColumns('Plg:', transaksi.pelangganNama));
  }
  lines.push(dashLine);

  // Items
  for (const item of transaksi.items) {
    // Line 1: Item name (fold if longer than 32)
    const name = item.namaProduk + (item.pakaiGrosir ? ' [GROSIR]' : '');
    if (name.length <= WIDTH) {
      lines.push(name);
    } else {
      lines.push(name.substring(0, WIDTH));
      lines.push('  ' + name.substring(WIDTH, WIDTH * 2 - 2));
    }

    // Line 2: Qty x Price = Subtotal
    const qtyPrice = `  ${item.qty} x ${formatRupiah(item.hargaSatuan)}`;
    const subtotal = formatRupiah(item.subtotal);
    lines.push(twoColumns(qtyPrice, subtotal));
  }

  lines.push(dashLine);

  // Totals
  lines.push(twoColumns('Subtotal:', formatRupiah(transaksi.subtotal)));
  if (transaksi.diskon > 0) {
    lines.push(twoColumns('Diskon:', `-${formatRupiah(transaksi.diskon)}`));
  }
  lines.push(twoColumns('TOTAL:', formatRupiah(transaksi.total)));
  lines.push(twoColumns('Metode:', transaksi.metodeBayar));

  if (transaksi.metodeBayar === 'TUNAI' || transaksi.metodeBayar === 'CAMPURAN') {
    lines.push(twoColumns('Bayar:', formatRupiah(transaksi.uangDiterima || transaksi.totalDibayar)));
    if (transaksi.kembalian > 0) {
      lines.push(twoColumns('Kembalian:', formatRupiah(transaksi.kembalian)));
    }
  }

  // Credit / Receivables Info
  if (transaksi.statusBayar === 'BELUM_BAYAR' || transaksi.statusBayar === 'SEBAGIAN') {
    lines.push(dashLine);
    lines.push(twoColumns('Total Dibayar:', formatRupiah(transaksi.totalDibayar)));
    lines.push(twoColumns('SISA TAGIHAN:', formatRupiah(transaksi.sisaPiutang)));
    if (transaksi.jatuhTempo) {
      lines.push(twoColumns('Jatuh Tempo:', formatWIBDate(transaksi.jatuhTempo)));
    }
  }

  // Footer
  lines.push(divider);
  lines.push(centerText('Terima Kasih Atas'));
  lines.push(centerText('Kunjungan Anda'));
  lines.push(centerText('Barang yg dibeli tdk dpt ditukar'));
  lines.push('');
  lines.push('');

  return lines;
}
