import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  Calendar,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  AlertCircle,
  Clock,
  PlusCircle,
  Receipt,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { MetodeBayar, Role, ShiftKasir, Transaksi } from '../types';
import { formatRupiah, formatWIBDate, formatWIBDateTime, formatNumber } from '../utils/formatters';

interface FinancialReportsViewProps {
  onNavigateToPengeluaran?: () => void;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  onNavigateToPengeluaran,
}) => {
  const {
    transaksiList,
    shifts,
    activeOutlet,
    outlets,
    pengeluaranList,
    voidTransaksi,
    currentUser,
    isUserAssigned,
  } = useApp();

  // Date Range Filter State
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    currentUser.role === Role.OWNER ? 'all' : activeOutlet.id
  );

  // Void Modal State
  const [voidTx, setVoidTx] = useState<Transaksi | null>(null);
  const [voidAlasan, setVoidAlasan] = useState<string>('');

  // Active Tab
  const [reportTab, setReportTab] = useState<'ringkasan' | 'shift' | 'transaksi' | 'pengeluaran'>('ringkasan');

  // Effective selected outlet: Non-owner is strictly locked to activeOutlet.id
  const effectiveSelectedOutlet = currentUser.role === Role.OWNER ? selectedOutlet : activeOutlet.id;

  // Unassigned check
  if (!isUserAssigned) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
            Akses Laporan Dibatasi: Belum Ditugaskan ke Cabang
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
            Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan. Kasir dan Manager hanya dapat melihat laporan keuangan cabang yang ditugaskan kepada mereka.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
            Silakan hubungi Owner untuk menetapkan cabang outlet Anda.
          </div>
        </div>
      </div>
    );
  }

  // Date filter boundaries
  const now = new Date();
  const filterStartDate = useMemo(() => {
    const d = new Date();
    if (dateRange === 'today') {
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (dateRange === '7d') {
      d.setDate(d.getDate() - 7);
      return d.getTime();
    }
    if (dateRange === '30d') {
      d.setDate(d.getDate() - 30);
      return d.getTime();
    }
    return 0; // all
  }, [dateRange]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transaksiList.filter((t) => {
      if (effectiveSelectedOutlet !== 'all' && t.outletId !== effectiveSelectedOutlet) return false;
      const txTime = new Date(t.createdAt).getTime();
      return txTime >= filterStartDate;
    });
  }, [transaksiList, effectiveSelectedOutlet, filterStartDate]);

  // Financial Metrics Calculation
  const financialMetrics = useMemo(() => {
    let totalOmzet = 0;
    let totalHPP = 0;
    let totalDiskon = 0;
    let totalCashSales = 0;
    let totalQrisSales = 0;
    let totalTransferSales = 0;
    let totalCreditSales = 0;
    let totalCompletedTx = 0;

    for (const t of filteredTransactions) {
      if (t.voided) continue;
      totalCompletedTx += 1;
      totalOmzet += t.total;
      totalDiskon += t.diskon;

      // Calculate HPP of transaction items
      for (const item of t.items) {
        totalHPP += (item.hppSaatJual || item.hppSnapshot || 0) * item.qty;
      }

      if (t.metodeBayar === MetodeBayar.TUNAI) totalCashSales += t.total;
      else if (t.metodeBayar === MetodeBayar.QRIS) totalQrisSales += t.total;
      else if (t.metodeBayar === MetodeBayar.TRANSFER) totalTransferSales += t.total;
      else if (t.metodeBayar === MetodeBayar.KREDIT || t.metodeBayar === MetodeBayar.CAMPURAN)
        totalCreditSales += t.total;
    }

    const labaKotor = totalOmzet - totalHPP;
    const marginKotorPersen = totalOmzet > 0 ? (labaKotor / totalOmzet) * 100 : 0;

    // Filtered Expenses
    const periodExpenses = pengeluaranList
      .filter((p) => {
        if (effectiveSelectedOutlet !== 'all' && p.outletId !== effectiveSelectedOutlet) return false;
        return new Date(p.createdAt).getTime() >= filterStartDate;
      })
      .reduce((sum, p) => sum + p.nominal, 0);

    const labaBersih = labaKotor - periodExpenses;

    return {
      totalOmzet,
      totalHPP,
      labaKotor,
      marginKotorPersen,
      periodExpenses,
      labaBersih,
      totalDiskon,
      totalCashSales,
      totalQrisSales,
      totalTransferSales,
      totalCreditSales,
      totalCompletedTx,
    };
  }, [filteredTransactions, pengeluaranList, effectiveSelectedOutlet, filterStartDate]);

  // Daily Trend Data for Area Chart
  const dailyChartData = useMemo(() => {
    const dayMap: Record<string, { tanggal: string; omzet: number; laba: number }> = {};

    // Sort ascending
    const sorted = [...filteredTransactions]
      .filter((t) => !t.voided)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const t of sorted) {
      const dayKey = t.createdAt.split('T')[0];
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = {
          tanggal: formatWIBDate(dayKey).slice(0, 6), // e.g. "09 Sep"
          omzet: 0,
          laba: 0,
        };
      }
      dayMap[dayKey].omzet += t.total;

      let txHpp = 0;
      for (const it of t.items) {
        txHpp += (it.hppSaatJual || it.hppSnapshot || 0) * it.qty;
      }
      dayMap[dayKey].laba += t.total - txHpp;
    }

    return Object.values(dayMap);
  }, [filteredTransactions]);

  // Payment Method Breakdown for Pie Chart
  const paymentMethodData = useMemo(() => {
    return [
      { name: 'Tunai', value: financialMetrics.totalCashSales, color: '#f59e0b' },
      { name: 'QRIS', value: financialMetrics.totalQrisSales, color: '#10b981' },
      { name: 'Transfer', value: financialMetrics.totalTransferSales, color: '#0ea5e9' },
      { name: 'Kredit B2B', value: financialMetrics.totalCreditSales, color: '#8b5cf6' },
    ].filter((item) => item.value > 0);
  }, [financialMetrics]);

  // Handle Void
  const handleConfirmVoid = () => {
    if (!voidTx) return;
    if (!voidAlasan.trim()) {
      alert('Alasan void transaksi wajib diisi!');
      return;
    }

    const res = voidTransaksi(voidTx.id, voidAlasan);
    if (res.success) {
      setVoidTx(null);
      setVoidAlasan('');
    } else {
      alert(res.error || 'Gagal membatalkan transaksi');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Date / Outlet Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-amber-600" />
            <span>Laporan Keuangan & Analitik Usaha</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Rekap omzet, margin laba kotor, beban operasional, dan riwayat shift kasir
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
              { id: 'all', label: 'Semua' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateRange(d.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRange === d.id
                    ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Outlet Selector (Owner can pick all / any outlet; Non-owner is locked) */}
          {currentUser.role === Role.OWNER ? (
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
            >
              <option value="all">Semua Outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>{activeOutlet.nama}</span>
            </div>
          )}

          {/* Go to Dedicated Expense Management */}
          {onNavigateToPengeluaran && (
            <button
              type="button"
              onClick={onNavigateToPengeluaran}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Buka modul khusus pencatatan pengeluaran operasional toko"
            >
              <Receipt className="w-4 h-4" />
              <span>Input Pengeluaran ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP PROFIT & LOSS SUMMARY CARDS (P&L Breakdown) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Total Omzet Penjualan
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {formatRupiah(financialMetrics.totalOmzet)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            {financialMetrics.totalCompletedTx} Transaksi Sukses
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Total Beban Pokok (HPP)
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-700 dark:text-stone-300 mt-1">
            {formatRupiah(financialMetrics.totalHPP)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">HPP moving average produk</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
            Laba Kotor Usaha
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(financialMetrics.labaKotor)}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">
            Margin Kotor: {financialMetrics.marginKotorPersen.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Laba Bersih Riil ⭐
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(financialMetrics.labaBersih)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-500 mt-0.5">
            Setelah dipotong beban toko {formatRupiah(financialMetrics.periodExpenses)}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
        {[
          { id: 'ringkasan', label: 'Grafik & Tren' },
          { id: 'transaksi', label: `Daftar Transaksi (${filteredTransactions.length})` },
          { id: 'shift', label: `Rekap Shift Kasir (${shifts.length})` },
          { id: 'pengeluaran', label: `Beban Operasional (${pengeluaranList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              reportTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GRAFIK & TREN */}
      {reportTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Omzet & Laba Trend Area Chart */}
          <div className="lg:col-span-8 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Tren Penjualan & Laba Harian</span>
            </h2>

            <div className="h-64 sm:h-80 w-full">
              {dailyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  Belum ada data penjualan pada periode ini
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip
                      formatter={(val: any) => formatRupiah(Number(val) || 0)}
                      contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="omzet"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOmzet)"
                      name="Omzet"
                    />
                    <Area
                      type="monotone"
                      dataKey="laba"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLaba)"
                      name="Laba Kotor"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment Method Pie Chart */}
          <div className="lg:col-span-4 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-amber-600" />
              <span>Komposisi Metode Pembayaran</span>
            </h2>

            <div className="h-64 w-full flex items-center justify-center">
              {paymentMethodData.length === 0 ? (
                <div className="text-xs text-stone-400">Tidak ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v) || 0)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Tunai:</span>
                <span className="font-bold">{formatRupiah(financialMetrics.totalCashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">QRIS:</span>
                <span className="font-bold">{formatRupiah(financialMetrics.totalQrisSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Transfer:</span>
                <span className="font-bold">{formatRupiah(financialMetrics.totalTransferSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Kredit (Tempo):</span>
                <span className="font-bold text-violet-600">{formatRupiah(financialMetrics.totalCreditSales)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR TRANSAKSI & VOID */}
      {reportTab === 'transaksi' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-3 px-3.5 font-bold">No. Nota</th>
                  <th className="py-3 px-3.5 font-bold">Waktu</th>
                  <th className="py-3 px-3.5 font-bold">Pelanggan</th>
                  <th className="py-3 px-3.5 font-bold text-center">Metode</th>
                  <th className="py-3 px-3.5 font-bold text-right">Total Belanja</th>
                  <th className="py-3 px-3.5 font-bold">Kasir</th>
                  <th className="py-3 px-3.5 font-bold">Status</th>
                  <th className="py-3 px-3.5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-stone-50 dark:hover:bg-stone-800/40 ${
                      tx.voided ? 'opacity-50 line-through bg-stone-100/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {tx.nomor}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-stone-500">
                      {formatWIBDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 font-medium">{tx.pelangganNama || 'Pelanggan Umum'}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-stone-100 dark:bg-stone-800">
                        {tx.metodeBayar}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-amber-600 dark:text-amber-400">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 px-3.5 text-stone-600">{tx.kasirNama}</td>
                    <td className="py-3 px-3.5">
                      {tx.voided ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">
                          VOID
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                          VALID
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {!tx.voided && currentUser.role === Role.OWNER && (
                        <button
                          onClick={() => setVoidTx(tx)}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Batalkan (Void) transaksi (Khusus Owner)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP RIWAYAT SHIFT KASIR & SELISIH LACI (PRD 4.6 mandate) */}
      {reportTab === 'shift' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Kasir</th>
                  <th className="py-3 px-3.5 font-bold">Outlet</th>
                  <th className="py-3 px-3.5 font-bold">Waktu Buka / Tutup</th>
                  <th className="py-3 px-3.5 font-bold text-right">Modal Awal</th>
                  <th className="py-3 px-3.5 font-bold text-right">Penjualan Tunai</th>
                  <th className="py-3 px-3.5 font-bold text-right">Tunai Sistem</th>
                  <th className="py-3 px-3.5 font-bold text-right">Fisik di Laci</th>
                  <th className="py-3 px-3.5 font-bold text-right">Selisih Kas ⭐</th>
                  <th className="py-3 px-3.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {shifts.map((s: any) => (
                  <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">
                      {s.userNama || s.kasirNama}
                    </td>
                    <td className="py-3 px-3.5 text-stone-600">{s.outletNama || s.outletId}</td>
                    <td className="py-3 px-3.5 whitespace-nowrap text-stone-500">
                      <div>Buka: {formatWIBDateTime(s.waktuBuka || s.dibuka)}</div>
                      {(s.waktuTutup || s.ditutup) && <div>Tutup: {formatWIBDateTime(s.waktuTutup || s.ditutup)}</div>}
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium">{formatRupiah(s.modalAwal)}</td>
                    <td className="py-3 px-3.5 text-right text-emerald-600 font-bold">
                      +{formatRupiah(s.penjualanTunai)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">{formatRupiah(s.tunaiSistem)}</td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {s.tunaiFisik !== null ? formatRupiah(s.tunaiFisik) : '-'}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      {s.selisih === null ? (
                        <span className="text-stone-400">Berjalan...</span>
                      ) : s.selisih === 0 ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                          Pas (Rp 0)
                        </span>
                      ) : s.selisih < 0 ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">
                          Kurang {formatRupiah(Math.abs(s.selisih))}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-700">
                          Lebih {formatRupiah(s.selisih)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          s.status === 'TERBUKA' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BEBAN OPERASIONAL */}
      {reportTab === 'pengeluaran' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Waktu</th>
                  <th className="py-3 px-3.5 font-bold">Kategori</th>
                  <th className="py-3 px-3.5 font-bold">Catatan Pengeluaran</th>
                  <th className="py-3 px-3.5 font-bold text-center">Sumber Dana</th>
                  <th className="py-3 px-3.5 font-bold text-right">Nominal</th>
                  <th className="py-3 px-3.5 font-bold">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {pengeluaranList.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3.5 whitespace-nowrap text-stone-500">
                      {formatWIBDateTime(p.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">{p.kategori || p.kategoriNama}</td>
                    <td className="py-3 px-3.5 text-stone-600">{p.catatan || p.keterangan}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-stone-100">
                        {p.dariLaciKasir || p.sumberDana === 'LACI_KASIR' ? 'Laci Kasir' : 'Kas Kantor'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-rose-600">
                      {formatRupiah(p.nominal)}
                    </td>
                    <td className="py-3 px-3.5 text-stone-500">{p.userNama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VOID MODAL (OWNER ONLY) */}
      {voidTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Batalkan Transaksi #{voidTx.nomor}
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Membatalkan transaksi akan mengembalikan stok produk ke toko dan menghapus pencatatan omzet serta piutang.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Alasan Pembatalan (Wajib Dicatat):
              </label>
              <textarea
                value={voidAlasan}
                onChange={(e) => setVoidAlasan(e.target.value)}
                placeholder="e.g. Salah input item, pelanggan membatalkan pesanan..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs h-20 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidTx(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
