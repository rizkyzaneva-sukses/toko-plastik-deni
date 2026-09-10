import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Receipt,
  Printer,
  Ban,
  ArrowUpDown,
  Download,
  Clock,
  User,
  Store,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  FileSpreadsheet,
  RefreshCw,
  PlusCircle,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Transaksi, MetodeBayar, StatusBayar, Role } from '../types';
import {
  formatRupiah,
  formatWIBDateTime,
  formatWIBDate,
  formatNumber,
  todayWIBDate,
} from '../utils/formatters';
import { SearchableSelect } from './SearchableSelect';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface TransactionsDataViewProps {
  onSwitchToKasir?: () => void;
}

export const TransactionsDataView: React.FC<TransactionsDataViewProps> = ({ onSwitchToKasir }) => {
  const {
    transaksiList,
    outlets,
    activeOutlet,
    currentUser,
    isUserAssigned,
    voidTransaksi,
  } = useApp();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [outletFilter, setOutletFilter] = useState<string>('all'); // 'all' or specific outletId
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [metodeFilter, setMetodeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'LUNAS', 'BELUM_BAYAR', 'VOID'

  // Non-owner is strictly locked to their assigned activeOutlet.id
  const effectiveOutletFilter = currentUser.role === Role.OWNER ? outletFilter : activeOutlet.id;

  // Modals
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaksi | null>(null);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaksi | null>(null);
  const [txToVoid, setTxToVoid] = useState<Transaksi | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = todayWIBDate();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = todayWIBDate(yesterday);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return transaksiList
      .filter((tx) => {
        // Outlet filter
        if (effectiveOutletFilter !== 'all' && tx.outletId !== effectiveOutletFilter) return false;

        // Payment method filter
        if (metodeFilter !== 'all' && tx.metodeBayar !== metodeFilter) return false;

        // Status filter
        if (statusFilter === 'VOID' && !tx.voided) return false;
        if (statusFilter === 'LUNAS' && (tx.voided || tx.statusBayar !== StatusBayar.LUNAS)) return false;
        if (statusFilter === 'BELUM_BAYAR' && (tx.voided || tx.statusBayar === StatusBayar.LUNAS)) return false;

        // Date Filter
        const txDate = tx.createdAt.split('T')[0];
        const txDateTime = new Date(tx.createdAt).getTime();

        if (dateRange === 'today' && txDate !== todayStr) return false;
        if (dateRange === 'yesterday' && txDate !== yesterdayStr) return false;
        if (dateRange === '7days' && txDateTime < sevenDaysAgo.getTime()) return false;
        if (dateRange === '30days' && txDateTime < thirtyDaysAgo.getTime()) return false;
        if (dateRange === 'month' && !txDate.startsWith(currentYearMonth)) return false;
        if (dateRange === 'custom') {
          if (customStartDate && txDate < customStartDate) return false;
          if (customEndDate && txDate > customEndDate) return false;
        }

        // Text Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNomor = tx.nomor.toLowerCase().includes(q);
          const matchPelanggan = (tx.pelangganNama || 'pelanggan umum').toLowerCase().includes(q);
          const matchKasir = tx.kasirNama.toLowerCase().includes(q);
          const matchItem = tx.items.some((it) => it.namaProduk.toLowerCase().includes(q));
          if (!matchNomor && !matchPelanggan && !matchKasir && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [
    transaksiList,
    effectiveOutletFilter,
    metodeFilter,
    statusFilter,
    dateRange,
    customStartDate,
    customEndDate,
    searchTerm,
  ]);

  // Aggregate KPI Statistics
  const stats = useMemo(() => {
    let totalOmset = 0;
    let totalNonVoidCount = 0;
    let totalVoidCount = 0;
    let totalTunai = 0;
    let totalNonTunai = 0;
    let totalPiutang = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.voided) {
        totalVoidCount += 1;
        return;
      }
      totalNonVoidCount += 1;
      totalOmset += tx.total;
      totalPiutang += tx.sisaPiutang;

      if (tx.metodeBayar === MetodeBayar.TUNAI) {
        totalTunai += tx.total;
      } else {
        totalNonTunai += tx.total;
      }
    });

    const rataRataNota = totalNonVoidCount > 0 ? Math.round(totalOmset / totalNonVoidCount) : 0;

    return {
      totalOmset,
      totalNonVoidCount,
      totalVoidCount,
      totalTunai,
      totalNonTunai,
      totalPiutang,
      rataRataNota,
    };
  }, [filteredTransactions]);

  // Handle Void
  const handleExecuteVoid = () => {
    if (!txToVoid) return;
    if (!voidReason.trim()) {
      alert('Mohon isi alasan pembatalan (void) transaksi!');
      return;
    }

    const res = voidTransaksi(txToVoid.id, voidReason);
    if (!res.success) {
      showNotification('error', res.error || 'Gagal membatalkan transaksi');
      return;
    }

    showNotification('success', `Transaksi ${txToVoid.nomor} berhasil dibatalkan. Stok telah dikembalikan!`);
    setTxToVoid(null);
    setVoidReason('');
    if (selectedTxForDetail && selectedTxForDetail.id === txToVoid.id) {
      setSelectedTxForDetail(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diexport!');
      return;
    }

    const headers = [
      'No Nota',
      'Tanggal/Jam',
      'Outlet',
      'Kasir',
      'Pelanggan',
      'Metode Bayar',
      'Status Bayar',
      'Total Belanja',
      'Diskon',
      'Sisa Piutang',
      'Void Status',
      'Alasan Void',
      'Item Terjual',
    ];

    const rows = filteredTransactions.map((tx) => {
      const outlet = outlets.find((o) => o.id === tx.outletId);
      const itemsStr = tx.items.map((it) => `${it.namaProduk} (${it.qty}x)`).join('; ');

      return [
        `"${tx.nomor}"`,
        `"${formatWIBDateTime(tx.createdAt)}"`,
        `"${outlet ? outlet.nama : tx.outletId}"`,
        `"${tx.kasirNama}"`,
        `"${tx.pelangganNama || 'Pelanggan Umum'}"`,
        `"${tx.metodeBayar}"`,
        `"${tx.statusBayar}"`,
        tx.total,
        tx.diskon,
        tx.sisaPiutang,
        tx.voided ? 'BATAL/VOID' : 'AKTIF',
        `"${tx.alasanVoid || ''}"`,
        `"${itemsStr}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data-transaksi-${todayWIBDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Data transaksi berhasil diexport ke CSV!');
  };

  const getMetodeIcon = (m: MetodeBayar) => {
    switch (m) {
      case MetodeBayar.TUNAI:
        return <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case MetodeBayar.QRIS:
        return <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case MetodeBayar.TRANSFER:
        return <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case MetodeBayar.KREDIT:
        return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <ArrowRightLeft className="w-3.5 h-3.5 text-stone-600" />;
    }
  };

  if (!isUserAssigned) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
            Akses Transaksi Dibatasi: Belum Ditugaskan ke Cabang
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
            Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan. Kasir dan Manager hanya dapat melihat riwayat transaksi cabang yang ditugaskan kepada mereka.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
            Silakan hubungi Owner untuk menetapkan cabang outlet Anda.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* NOTIFICATION TOAST */}
      {actionMessage && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white transition-all animate-bounce ${
            actionMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Data & Riwayat Transaksi</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  {filteredTransactions.length} Nota
                </span>
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Arsip lengkap penjualan toko, cetak ulang struk thermal 58mm, dan audit nota kasir.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSwitchToKasir && (
            <button
              type="button"
              onClick={onSwitchToKasir}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buka Kasir Baru</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Omset */}
        <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Total Omset Penjualan
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(stats.totalOmset)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {stats.totalNonVoidCount} nota aktif ({stats.totalVoidCount} void)
          </div>
        </div>

        {/* Penerimaan Tunai */}
        <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" />
            <span>Pembayaran Tunai</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {formatRupiah(stats.totalTunai)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Uang fisik di kasir
          </div>
        </div>

        {/* Penerimaan Non-Tunai */}
        <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5" />
            <span>QRIS & Transfer</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {formatRupiah(stats.totalNonTunai)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Masuk ke rekening digital
          </div>
        </div>

        {/* Piutang Tempo / Bon */}
        <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Piutang Belum Lunas</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {formatRupiah(stats.totalPiutang)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Rata-rata nota: {formatRupiah(stats.rataRataNota)}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No. Nota (TRX-...), nama pelanggan, kasir, atau nama barang..."
              className="w-full pl-10 pr-9 py-2.5 min-h-[42px] rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="min-w-[160px]">
              <SearchableSelect
                id="tx-periode"
                options={[
                  { value: 'all', label: 'Semua Waktu' },
                  { value: 'today', label: 'Hari Ini' },
                  { value: 'yesterday', label: 'Kemarin' },
                  { value: '7days', label: '7 Hari Terakhir' },
                  { value: '30days', label: '30 Hari Terakhir' },
                  { value: 'month', label: 'Bulan Ini' },
                  { value: 'custom', label: 'Rentang Kustom' },
                ]}
                value={dateRange}
                onChange={(v) => setDateRange(v as any)}
                placeholder="Periode"
              />
            </div>

            {currentUser.role === Role.OWNER ? (
              <div className="min-w-[200px]">
                <SearchableSelect
                  id="tx-outlet"
                  options={[
                    { value: 'all', label: 'Semua Cabang Toko' },
                    ...outlets.map((o) => ({ value: o.id, label: o.nama })),
                  ]}
                  value={outletFilter}
                  onChange={setOutletFilter}
                  placeholder="Outlet"
                />
              </div>
            ) : (
              <div className="min-h-[42px] px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>{activeOutlet.nama}</span>
              </div>
            )}

            {/* Metode Bayar Filter */}
            <div className="min-w-[170px]">
              <SearchableSelect
                id="tx-metode"
                options={[
                  { value: 'all', label: 'Semua Metode Bayar' },
                  { value: MetodeBayar.TUNAI, label: 'Tunai' },
                  { value: MetodeBayar.QRIS, label: 'QRIS' },
                  { value: MetodeBayar.TRANSFER, label: 'Transfer Bank' },
                  { value: MetodeBayar.KREDIT, label: 'Tempo / Bon' },
                  { value: MetodeBayar.CAMPURAN, label: 'Campuran' },
                ]}
                value={metodeFilter}
                onChange={setMetodeFilter}
                placeholder="Metode"
              />
            </div>

            <div className="min-w-[160px]">
              <SearchableSelect
                id="tx-status"
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'LUNAS', label: 'Lunas' },
                  { value: 'BELUM_BAYAR', label: 'Belum Lunas' },
                  { value: 'VOID', label: 'Dibatalkan (Void)' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker when selected */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
            <span className="font-bold text-stone-600">Dari:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
            />
            <span className="font-bold text-stone-600">Sampai:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
            />
          </div>
        )}
      </div>

      {/* TRANSACTION LIST / TABLE */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-12 text-center">
          <Receipt className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3 stroke-1" />
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Tidak Ditemukan Transaksi
          </h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Tidak ada transaksi yang cocok dengan kata kunci pencarian atau filter yang dipilih.
          </p>
          {(searchTerm || dateRange !== 'all' || outletFilter !== 'all' || metodeFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDateRange('all');
                setOutletFilter('all');
                setMetodeFilter('all');
                setStatusFilter('all');
              }}
              className="mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 cursor-pointer shadow-xs"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4">No. Nota / Waktu</th>
                  <th className="py-3 px-4">Cabang & Kasir</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Rincian Barang</th>
                  <th className="py-3 px-4 text-center">Metode & Status</th>
                  <th className="py-3 px-4 text-right">Total Belanja</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredTransactions.map((tx) => {
                  const outlet = outlets.find((o) => o.id === tx.outletId);
                  const itemCount = tx.items.reduce((s, it) => s + it.qty, 0);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                        tx.voided ? 'bg-rose-50/40 dark:bg-rose-950/20 opacity-75' : ''
                      }`}
                    >
                      {/* No Nota & Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-xs text-stone-900 dark:text-stone-100">
                          {tx.nomor}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {formatWIBDateTime(tx.createdAt)}
                        </div>
                        {tx.voided && (
                          <span className="inline-block mt-1 text-[9.5px] px-1.5 py-0.2 bg-rose-600 text-white rounded font-bold uppercase">
                            DIBATALKAN (VOID)
                          </span>
                        )}
                      </td>

                      {/* Outlet & Cashier */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {outlet ? outlet.nama.replace('Toko Plastik ', '') : tx.outletId}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-stone-400" />
                          <span>{tx.kasirNama}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {tx.pelangganNama || 'Pelanggan Umum'}
                        </div>
                        <span
                          className={`inline-block text-[9.5px] px-1.5 py-0.2 rounded font-semibold mt-0.5 ${
                            tx.pelangganId
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {tx.pelangganId ? 'B2B Langganan' : 'Eceran'}
                        </span>
                      </td>

                      {/* Items summary */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-stone-800 dark:text-stone-200 line-clamp-2">
                          {tx.items.map((it) => `${it.namaProduk} (${it.qty})`).join(', ')}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Total: {itemCount} pcs
                        </div>
                      </td>

                      {/* Payment Method & Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-bold">
                          {getMetodeIcon(tx.metodeBayar)}
                          <span>{tx.metodeBayar}</span>
                        </div>

                        <div className="mt-1">
                          {tx.voided ? (
                            <span className="text-[10px] text-rose-600 font-bold">Void</span>
                          ) : tx.statusBayar === StatusBayar.LUNAS ? (
                            <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ Lunas
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-amber-600 font-bold">
                              Belum Lunas ({formatRupiah(tx.sisaPiutang)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-stone-900 dark:text-stone-100">
                          {formatRupiah(tx.total)}
                        </div>
                        {tx.diskon > 0 && (
                          <div className="text-[10px] text-amber-600">
                            Diskon: -{formatRupiah(tx.diskon)}
                          </div>
                        )}
                        {tx.sisaPiutang > 0 && (
                          <div className="text-[10px] text-rose-500 font-bold">
                            Sisa: {formatRupiah(tx.sisaPiutang)}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedTxForDetail(tx)}
                            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-600 dark:text-stone-300 hover:text-amber-700 transition-colors cursor-pointer"
                            title="Lihat Detail Nota"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedTxForReceipt(tx)}
                            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-stone-600 dark:text-stone-300 hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Cetak Ulang Struk 58mm"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!tx.voided && (
                            <button
                              type="button"
                              onClick={() => {
                                setTxToVoid(tx);
                                setVoidReason('');
                              }}
                              className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Batalkan / Void Transaksi"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-stone-200 dark:divide-stone-800">
            {filteredTransactions.map((tx) => {
              const outlet = outlets.find((o) => o.id === tx.outletId);
              const itemCount = tx.items.reduce((s, it) => s + it.qty, 0);

              return (
                <div
                  key={tx.id}
                  className={`p-3.5 space-y-2.5 ${
                    tx.voided ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-stone-900 dark:text-stone-100">
                          {tx.nomor}
                        </span>
                        {tx.voided && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white rounded font-bold">
                            VOID
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {formatWIBDateTime(tx.createdAt)} · {outlet ? outlet.nama.replace('Toko Plastik ', '') : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-stone-900 dark:text-stone-100">
                        {formatRupiah(tx.total)}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {tx.pelangganNama || 'Pelanggan Umum'}
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 p-2 rounded-xl">
                    <div className="line-clamp-2">
                      {tx.items.map((it) => `${it.namaProduk} (${it.qty})`).join(', ')}
                    </div>
                    <div className="text-[10.5px] text-stone-400 mt-0.5">
                      {itemCount} total barang · Kasir: {tx.kasirNama}
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[10px] font-bold">
                        {getMetodeIcon(tx.metodeBayar)}
                        <span>{tx.metodeBayar}</span>
                      </span>

                      {tx.statusBayar === StatusBayar.LUNAS ? (
                        <span className="text-[10.5px] text-emerald-600 font-bold">✓ Lunas</span>
                      ) : (
                        <span className="text-[10.5px] text-amber-600 font-bold">
                          Sisa: {formatRupiah(tx.sisaPiutang)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTxForReceipt(tx)}
                        className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Struk</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Rincian Transaksi {selectedTxForDetail.nomor}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {formatWIBDateTime(selectedTxForDetail.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Status banner */}
              {selectedTxForDetail.voided && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  <div className="font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" />
                    <span>TRANSAKSI DIBATALKAN (VOID)</span>
                  </div>
                  {selectedTxForDetail.alasanVoid && (
                    <div className="text-[11px] mt-1">Alasan: {selectedTxForDetail.alasanVoid}</div>
                  )}
                </div>
              )}

              {/* Info Pelanggan & Kasir */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Pelanggan</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-xs mt-0.5">
                    {selectedTxForDetail.pelangganNama || 'Pelanggan Umum'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Kasir</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-xs mt-0.5">
                    {selectedTxForDetail.kasirNama}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Metode Bayar</div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-xs mt-0.5">
                    {selectedTxForDetail.metodeBayar}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400">Status Pembayaran</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                    {selectedTxForDetail.statusBayar}
                  </div>
                </div>
              </div>

              {/* Item list table */}
              <div>
                <div className="font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Daftar Barang Belanja:
                </div>
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2">Produk</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Harga</th>
                        <th className="p-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {selectedTxForDetail.items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2">
                            <div className="font-bold text-stone-900 dark:text-stone-100">
                              {it.namaProduk}
                            </div>
                            {it.pakaiGrosir && (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded">
                                GROSIR
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-bold">{it.qty}</td>
                          <td className="p-2 text-right">{formatRupiah(it.hargaSatuan)}</td>
                          <td className="p-2 text-right font-bold">{formatRupiah(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatRupiah(selectedTxForDetail.subtotal)}</span>
                </div>
                {selectedTxForDetail.diskon > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedTxForDetail.diskon)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-stone-900 dark:text-stone-100 pt-1.5 border-t border-stone-200 dark:border-stone-700">
                  <span>TOTAL BELANJA:</span>
                  <span className="text-amber-600">{formatRupiah(selectedTxForDetail.total)}</span>
                </div>

                {selectedTxForDetail.metodeBayar === MetodeBayar.TUNAI && (
                  <>
                    <div className="flex justify-between text-stone-600 dark:text-stone-400 pt-1 border-t border-dashed border-stone-200 dark:border-stone-700">
                      <span>Uang Diterima:</span>
                      <span>{formatRupiah(selectedTxForDetail.uangDiterima)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(selectedTxForDetail.kembalian)}</span>
                    </div>
                  </>
                )}

                {selectedTxForDetail.sisaPiutang > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-stone-200 dark:border-stone-700">
                    <span>Sisa Piutang (Tempo):</span>
                    <span>{formatRupiah(selectedTxForDetail.sisaPiutang)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="p-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div>
                {!selectedTxForDetail.voided && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxToVoid(selectedTxForDetail);
                      setVoidReason('');
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Void Nota</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForReceipt(selectedTxForDetail)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Struk 58mm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOID CONFIRMATION MODAL */}
      {txToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                Konfirmasi Void / Batalkan Nota
              </h3>
            </div>

            <div className="text-xs text-stone-600 dark:text-stone-400 space-y-2">
              <p>
                Anda akan membatalkan transaksi{' '}
                <strong className="text-stone-900 dark:text-stone-100 font-mono">
                  {txToVoid.nomor}
                </strong>{' '}
                senilai <strong className="text-amber-600">{formatRupiah(txToVoid.total)}</strong>.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                ⚠️ Stok semua barang dalam nota ini akan <strong>secara otomatis dikembalikan ke stok gudang</strong> dan dicatat sebagai pergerakan retur.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Alasan Pembatalan (Wajib):
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Salah input barang / pembeli membatalkan pesanan..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setTxToVoid(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleExecuteVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Ya, Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT MODAL (58mm) */}
      {selectedTxForReceipt && (
        <ThermalReceiptModal
          transaksi={selectedTxForReceipt}
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}
    </div>
  );
};
