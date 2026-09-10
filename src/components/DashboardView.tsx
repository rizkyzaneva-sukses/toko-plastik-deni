import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Scissors,
  CreditCard,
  Building2,
  Wallet,
  PiggyBank,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  Lock,
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
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Role, MetodeBayar, SumberDana, TipeTransaksiModal } from '../types';
import { formatRupiah, formatNumber, formatWIBDate, formatWIBDateTime } from '../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    activeOutlet,
    outlets,
    transaksiList,
    pengeluaranList,
    produk,
    stokOutlet,
    getProdukStokForOutlet,
    pelanggan,
    suppliers,
    pembelianList,
    modalUsaha,
    transaksiModalList,
    totalModalTerkumpul,
    totalPriveDitarik,
    saldoKasBesar,
    saldoBank,
    saldoLaciKasir,
    activeShift,
    isUserAssigned,
  } = useApp();

  // If user is Kasir/Manager and NOT assigned to any outlet, block view
  if (!isUserAssigned) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
            Akses Dibatasi: Belum Ditugaskan ke Cabang
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
            Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan. Sesuai kebijakan keamanan toko, Kasir dan Manager hanya dapat mengakses data cabang yang ditugaskan.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
            Silakan hubungi Owner untuk menetapkan cabang outlet Anda.
          </div>
        </div>
      </div>
    );
  }

  // Filter transactions for effective outlet
  const outletTransactions = useMemo(() => {
    return transaksiList.filter((t) => {
      if (currentUser.role !== Role.OWNER && t.outletId !== activeOutlet.id) return false;
      if (currentUser.role === Role.OWNER && activeOutlet.id !== 'all' && t.outletId !== activeOutlet.id) return false;
      return true;
    });
  }, [transaksiList, currentUser, activeOutlet]);

  // Today filter
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = useMemo(() => {
    return outletTransactions.filter((t) => !t.voided && t.createdAt.startsWith(todayStr));
  }, [outletTransactions, todayStr]);

  // Today metrics
  const todayMetrics = useMemo(() => {
    let omzet = 0;
    let hpp = 0;
    let tunai = 0;
    let qris = 0;
    let transfer = 0;
    let kredit = 0;

    for (const t of todayTransactions) {
      omzet += t.total;
      for (const item of t.items) {
        hpp += (item.hppSaatJual || item.hppSnapshot || 0) * item.qty;
      }
      if (t.metodeBayar === MetodeBayar.TUNAI) tunai += t.total;
      else if (t.metodeBayar === MetodeBayar.QRIS) qris += t.total;
      else if (t.metodeBayar === MetodeBayar.TRANSFER) transfer += t.total;
      else if (t.metodeBayar === MetodeBayar.KREDIT) kredit += t.total;
    }

    const labaKotor = omzet - hpp;
    return {
      omzet,
      hpp,
      labaKotor,
      count: todayTransactions.length,
      tunai,
      qris,
      transfer,
      kredit,
    };
  }, [todayTransactions]);

  // Today expenses
  const todayExpenses = useMemo(() => {
    const list = pengeluaranList.filter((p) => {
      if (currentUser.role !== Role.OWNER && p.outletId !== activeOutlet.id) return false;
      if (currentUser.role === Role.OWNER && activeOutlet.id !== 'all' && p.outletId !== activeOutlet.id) return false;
      return p.tanggal === todayStr;
    });
    return list.reduce((acc, curr) => acc + curr.nominal, 0);
  }, [pengeluaranList, currentUser, activeOutlet, todayStr]);

  // Net Profit Today
  const estimasiLabaBersihHariIni = todayMetrics.labaKotor - todayExpenses;

  // Total Modal Bersih (Equity)
  const ekuitasModalBersih = totalModalTerkumpul - totalPriveDitarik;

  // Critical Stock Items (Stok <= Stok Min)
  const criticalStockList = useMemo(() => {
    return produk
      .filter((p) => {
        if (!p.aktif) return false;
        const currentStock = getProdukStokForOutlet(p.id, activeOutlet.id);
        const minStock = p.stokMin ?? 5;
        return currentStock <= minStock;
      })
      .map((p) => ({
        ...p,
        currentStock: getProdukStokForOutlet(p.id, activeOutlet.id),
      }))
      .slice(0, 5);
  }, [produk, activeOutlet, getProdukStokForOutlet]);

  // Outstanding Piutang Pelanggan
  const overduePiutang = useMemo(() => {
    const unpaidTx = outletTransactions.filter((t) => !t.voided && t.sisaPiutang && t.sisaPiutang > 0);
    const todayTimestamp = new Date().setHours(0, 0, 0, 0);
    return unpaidTx.map((t) => {
      const pel = pelanggan.find((p) => p.id === t.pelangganId);
      const isOverdue = t.jatuhTempo ? new Date(t.jatuhTempo).getTime() < todayTimestamp : false;
      return {
        ...t,
        namaPelanggan: pel?.nama || 'Pelanggan Umum',
        teleponPelanggan: pel?.telepon || '-',
        isOverdue,
      };
    });
  }, [outletTransactions, pelanggan]);

  const totalPiutangOutstanding = useMemo(() => {
    return overduePiutang.reduce((sum, t) => sum + (t.sisaPiutang || 0), 0);
  }, [overduePiutang]);

  // Outstanding Hutang ke Supplier
  const outstandingHutang = useMemo(() => {
    const list = pembelianList.filter((p) => {
      if (currentUser.role !== Role.OWNER && p.outletId !== activeOutlet.id) return false;
      return p.sisaHutang && p.sisaHutang > 0;
    });
    return list.reduce((sum, p) => sum + (p.sisaHutang || 0), 0);
  }, [pembelianList, currentUser, activeOutlet]);

  // Last 7 Days Sales Trend Data for Chart
  const salesTrend7Days = useMemo(() => {
    const days: { date: string; label: string; omzet: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

      let dayOmzet = 0;
      let dayHPP = 0;
      for (const t of outletTransactions) {
        if (!t.voided && t.createdAt.startsWith(dateKey)) {
          dayOmzet += t.total;
          for (const item of t.items) {
            dayHPP += (item.hppSaatJual || item.hppSnapshot || 0) * item.qty;
          }
        }
      }
      days.push({
        date: dateKey,
        label: dayName,
        omzet: dayOmzet,
        profit: dayOmzet - dayHPP,
      });
    }
    return days;
  }, [outletTransactions]);

  // Payment Methods Breakdown for Pie Chart
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {
      Tunai: 0,
      QRIS: 0,
      Transfer: 0,
      'Kredit (Tempo)': 0,
    };
    for (const t of outletTransactions) {
      if (t.voided) continue;
      if (t.metodeBayar === MetodeBayar.TUNAI) map['Tunai'] += t.total;
      else if (t.metodeBayar === MetodeBayar.QRIS) map['QRIS'] += t.total;
      else if (t.metodeBayar === MetodeBayar.TRANSFER) map['Transfer'] += t.total;
      else map['Kredit (Tempo)'] += t.total;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [outletTransactions]);

  const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  // Top Selling Items (by quantity sold)
  const topSellingProducts = useMemo(() => {
    const salesMap: Record<string, { nama: string; satuan: string; qty: number; omzet: number }> = {};
    for (const t of outletTransactions) {
      if (t.voided) continue;
      for (const item of t.items) {
        if (!salesMap[item.produkId]) {
          salesMap[item.produkId] = {
            nama: item.namaProduk,
            satuan: item.satuan,
            qty: 0,
            omzet: 0,
          };
        }
        salesMap[item.produkId].qty += item.qty;
        salesMap[item.produkId].omzet += item.subtotal;
      }
    }
    return Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [outletTransactions]);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* HEADER BANNER: Welcome & Outlet Context */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Dashboard Operasional & Ekuitas
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {formatWIBDate(new Date().toISOString())}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            Selamat Datang, {currentUser.nama}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Outlet Aktif: <strong className="text-stone-800 dark:text-stone-200">{activeOutlet.nama}</strong>
            {currentUser.role !== Role.OWNER && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                Akses Khusus {currentUser.role}
              </span>
            )}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('kasir')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir POS</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pengeluaran')}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-rose-500" />
            <span>Catat Pengeluaran</span>
          </button>
          {currentUser.role === Role.OWNER && (
            <button
              type="button"
              onClick={() => onNavigate('modal')}
              className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-blue-500" />
              <span>Modal & Prive</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP METRIC CARDS: Financial & Operations Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Penjualan Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(todayMetrics.omzet)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>{todayMetrics.count} Transaksi Selesai</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {todayMetrics.tunai > 0 ? `Tunai: ${formatRupiah(todayMetrics.tunai)}` : 'Hari Ini'}
            </span>
          </div>
        </div>

        {/* Card 2: Laba Kotor Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
              {currentUser.role === Role.KASIR ? 'Transaksi Kasir' : 'Laba Kotor Hari Ini'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {currentUser.role === Role.KASIR ? `${todayMetrics.count} Nota` : formatRupiah(todayMetrics.labaKotor)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {currentUser.role === Role.KASIR ? (
              <span>Kasir Aktif: {currentUser.nama}</span>
            ) : (
              <>
                <span>Est. Margin Kotor</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {todayMetrics.omzet > 0
                    ? `${((todayMetrics.labaKotor / todayMetrics.omzet) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Pengeluaran Operasional Hari Ini */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Pengeluaran Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupiah(todayExpenses)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>Operasional & Toko</span>
            <button
              onClick={() => onNavigate('pengeluaran')}
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Lihat Detail <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Saldo Kas & Bank */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Total Likuiditas Kas & Bank</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(saldoKasBesar + saldoBank + saldoLaciKasir)}
          </div>
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>Bank: {formatRupiah(saldoBank)}</span>
            <span className="font-semibold text-stone-600 dark:text-stone-300">
              Laci: {formatRupiah(saldoLaciKasir)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: MODAL USAHA & EKUITAS SUMMARY (FOR OWNER & MANAGERS) */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-700/80">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-black tracking-tight">Status Modal Usaha & Prive Pemilik</h2>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Transparansi modal awal, suntikan dana investor / utang / uang sendiri, dan pengambilan prive
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('modal')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all shadow-xs"
          >
            <span>Buka Modul Modal Usaha</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div>
            <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">Saldo Awal Usaha</span>
            <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
              {formatRupiah(modalUsaha.saldoAwal)}
            </div>
            <span className="text-[10px] text-stone-400">Dimulai {formatWIBDate(modalUsaha.tanggalMulai)}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">Total Modal Disetor</span>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
              {formatRupiah(totalModalTerkumpul)}
            </div>
            <span className="text-[10px] text-stone-400">Investor, Utang, Sendiri</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">Pengeluaran Prive</span>
            <div className="text-base sm:text-lg font-black text-rose-400 mt-0.5">
              {formatRupiah(totalPriveDitarik)}
            </div>
            <span className="text-[10px] text-stone-400">Mengurangi modal & kas</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">Modal Bersih Saat Ini</span>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {formatRupiah(ekuitasModalBersih)}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">Ekuitas Aktif</span>
          </div>
        </div>
      </div>

      {/* SECTION: ACTIONABLE ALERTS & WATCHLIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Alert 1: Low Stock Alert */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                  Stok Menipis ({criticalStockList.length})
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                Prioritas Restok
              </span>
            </div>

            {criticalStockList.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                Semua stok produk berada di batas aman.
              </div>
            ) : (
              <div className="space-y-2">
                {criticalStockList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-stone-800 dark:text-stone-200 truncate">{item.nama}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        Sisa: <strong className="text-rose-600 dark:text-rose-400">{item.currentStock} {item.satuan}</strong> (Min: {item.stokMin || 5})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('stok')}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                    >
                      Restok
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('stok')}
            className="w-full mt-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <span>Lihat Semua Manajemen Stok</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert 2: Piutang Pelanggan Overdue */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                  Tagihan Piutang
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {formatRupiah(totalPiutangOutstanding)}
              </span>
            </div>

            {overduePiutang.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                Tidak ada piutang tempo yang menggantung.
              </div>
            ) : (
              <div className="space-y-2">
                {overduePiutang.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-stone-800 dark:text-stone-200 truncate">{item.namaPelanggan}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                        <span>Nota: {item.nomorNota}</span>
                        {item.isOverdue && (
                          <span className="text-[9.5px] px-1 py-0.2 rounded font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                            Jatuh Tempo!
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-rose-600 dark:text-rose-400">{formatRupiah(item.sisaPiutang || 0)}</div>
                      <div className="text-[10px] text-stone-400">{item.jatuhTempo || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('piutang')}
            className="w-full mt-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <span>Buka Catatan Piutang & Penagihan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert 3: Pecah Karung & Produksi Cepat */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                  Pecah Karung & Repack
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Fitur Unggulan
              </span>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
              Konversi bahan baku bulk (Gula Pasir 50kg, Terigu Karung, Plastik Rol) menjadi kemasan retail eceran (1kg, 500gr) secara otomatis menghitung HPP pecahan dan penyusutan.
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Akuntabilitas Otomatis
              </div>
              Perubahan stok karung dan hasil pecah eceran langsung tercatat di stok outlet aktif.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('pecah')}
            className="w-full mt-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <span>Buka Menu Pecah Karung</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CHARTS ROW: Tren Penjualan 7 Hari & Komposisi Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                Tren Penjualan & Margin 7 Hari Terakhir
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Performa omzet harian outlet {activeOutlet.nama}
              </p>
            </div>
            <button
              onClick={() => onNavigate('laporan')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Laporan Detail <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend7Days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#omzetGradient)"
                  name="Omzet"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGradient)"
                  name="Margin Kotor"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie Chart (1 Col) */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 mb-1">
              Metode Pembayaran
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
              Distribusi transaksi tunai, non-tunai, dan kredit
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatRupiah(Number(val)), 'Total']}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100 dark:border-stone-800">
            {paymentMethodData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="text-stone-600 dark:text-stone-400 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: TOP SELLING PRODUCTS & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Best Sellers */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              Produk Terlaris (Volume Terjual)
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400">Paling Diminati</span>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">Belum ada transaksi penjualan</div>
          ) : (
            <div className="space-y-3">
              {topSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-black text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-stone-800 dark:text-stone-200 truncate">{p.nama}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {p.qty} {p.satuan} terjual
                      </div>
                    </div>
                  </div>
                  <span className="font-black text-stone-900 dark:text-stone-100 shrink-0">
                    {formatRupiah(p.omzet)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Recent Transactions */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              Transaksi Terkini Hari Ini
            </h3>
            <button
              onClick={() => onNavigate('transaksi')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Semua Nota <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {todayTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              Belum ada transaksi hari ini di {activeOutlet.nama}
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-800 dark:text-stone-200">{tx.nomorNota}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {tx.metodeBayar}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {tx.items.length} item · {formatWIBDateTime(tx.createdAt).split(' ')[1]} WIB · Kasir: {tx.kasirNama}
                    </div>
                  </div>
                  <div className="font-black text-stone-900 dark:text-stone-100 text-right shrink-0">
                    {formatRupiah(tx.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
