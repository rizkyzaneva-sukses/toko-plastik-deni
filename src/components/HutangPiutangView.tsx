import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Download,
  Search,
  Eye,
  ArrowRight,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  StatusBayar,
  MetodeBayar,
  Transaksi,
  Pembelian,
  Role,
} from '../types';
import {
  formatRupiah,
  formatWIBDate,
  formatWIBDateTime,
} from '../utils/formatters';
import { SearchableSelect, SelectOption } from './SearchableSelect';

export const HutangPiutangView: React.FC = () => {
  const {
    transaksiList,
    pembayaranPiutang,
    pembelianList,
    pembayaranHutangList,
    pelanggan,
    suppliers,
    paySingleInvoice,
    payFIFOInvoices,
    payVendorInvoice,
    currentUser,
    activeOutlet,
  } = useApp();

  // Active Tab: 'piutang' (Pelanggan) vs 'hutang' (Vendor)
  const [activeTab, setActiveTab] = useState<'piutang' | 'hutang'>('piutang');

  // Filters State
  const [filterEntityId, setFilterEntityId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('BELUM_LUNAS'); // 'ALL', 'BELUM_LUNAS', 'LEWAT_TEMPO', 'LUNAS'
  const [filterAging, setFilterAging] = useState<string>('ALL'); // 'ALL', '0_30', '31_60', '61_90', '90_PLUS'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'tanggal' | 'jatuhTempo' | 'sisa'>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Transaksi | Pembelian | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<MetodeBayar>(MetodeBayar.TUNAI);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Bulk FIFO Payment Modal State
  const [isBulkFIFOModalOpen, setIsBulkFIFOModalOpen] = useState(false);
  const [fifoEntityId, setFifoEntityId] = useState<string>('');
  const [fifoTotalAmount, setFifoTotalAmount] = useState<number>(0);

  // Detail / History Modal State
  const [detailInvoice, setDetailInvoice] = useState<Transaksi | Pembelian | null>(null);

  // Success / Error Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Current Date Helper
  const now = new Date();
  const nowDateStr = now.toISOString().split('T')[0];

  // Helper function to calculate age in days
  const calculateAgeDays = (createdDateStr: string) => {
    const created = new Date(createdDateStr);
    const diffTime = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Helper function to check if overdue
  const isOverdue = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    return new Date(dueDateStr).getTime() < now.getTime();
  };

  // Helper function to check if due within 7 days
  const isDueSoon = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr).getTime();
    const diffDays = (due - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  // --- PIUTANG DATASET ---
  const piutangItems = useMemo(() => {
    return transaksiList
      .filter((t) => !t.voided && (t.sisaPiutang > 0 || t.metodeBayar === MetodeBayar.KREDIT || t.metodeBayar === MetodeBayar.CAMPURAN))
      .map((t) => {
        const ageDays = calculateAgeDays(t.createdAt);
        const overdue = isOverdue(t.jatuhTempo) && t.sisaPiutang > 0;
        const dueSoon = isDueSoon(t.jatuhTempo) && t.sisaPiutang > 0;

        let agingBucket = '0_30';
        if (ageDays > 90) agingBucket = '90_PLUS';
        else if (ageDays > 60) agingBucket = '61_90';
        else if (ageDays > 30) agingBucket = '31_60';

        return {
          ...t,
          entityName: t.pelangganNama || 'Pelanggan Umum',
          ageDays,
          overdue,
          dueSoon,
          agingBucket,
        };
      });
  }, [transaksiList]);

  // --- HUTANG DATASET ---
  const hutangItems = useMemo(() => {
    return pembelianList.map((p) => {
      const ageDays = calculateAgeDays(p.createdAt);
      const overdue = isOverdue(p.jatuhTempo) && p.sisaHutang > 0;
      const dueSoon = isDueSoon(p.jatuhTempo) && p.sisaHutang > 0;

      let agingBucket = '0_30';
      if (ageDays > 90) agingBucket = '90_PLUS';
      else if (ageDays > 60) agingBucket = '61_90';
      else if (ageDays > 30) agingBucket = '31_60';

      return {
        ...p,
        entityName: p.supplierNama,
        sisaPiutang: p.sisaHutang, // normalized key for table
        ageDays,
        overdue,
        dueSoon,
        agingBucket,
      };
    });
  }, [pembelianList]);

  const activeRawItems = activeTab === 'piutang' ? piutangItems : hutangItems;

  // Summary Metrics (Top Cards)
  const summaryMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let notDueAmount = 0;
    let dueSoonAmount = 0;
    let overdueAmount = 0;

    for (const item of activeRawItems) {
      const sisa = item.sisaPiutang;
      if (sisa <= 0) continue;

      totalOutstanding += sisa;
      if (item.overdue) {
        overdueAmount += sisa;
      } else if (item.dueSoon) {
        dueSoonAmount += sisa;
      } else {
        notDueAmount += sisa;
      }
    }

    return {
      totalOutstanding,
      notDueAmount,
      dueSoonAmount,
      overdueAmount,
    };
  }, [activeRawItems]);

  // Aging Buckets Summary Table
  const agingBuckets = useMemo(() => {
    const buckets = {
      '0_30': { label: '0 – 30 Hari', count: 0, nominal: 0 },
      '31_60': { label: '31 – 60 Hari', count: 0, nominal: 0 },
      '61_90': { label: '61 – 90 Hari', count: 0, nominal: 0 },
      '90_PLUS': { label: '> 90 Hari', count: 0, nominal: 0 },
    };

    for (const item of activeRawItems) {
      if (item.sisaPiutang <= 0) continue;
      const bKey = item.agingBucket as keyof typeof buckets;
      if (buckets[bKey]) {
        buckets[bKey].count += 1;
        buckets[bKey].nominal += item.sisaPiutang;
      }
    }

    return Object.entries(buckets).map(([key, data]) => ({
      key,
      ...data,
    }));
  }, [activeRawItems]);

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    return activeRawItems.filter((item) => {
      // Entity Filter
      if (filterEntityId !== 'all') {
        const idToCheck = activeTab === 'piutang' ? (item as any).pelangganId : (item as any).supplierId;
        if (idToCheck !== filterEntityId) return false;
      }

      // Status Filter
      if (filterStatus === 'BELUM_LUNAS' && item.sisaPiutang <= 0) return false;
      if (filterStatus === 'LUNAS' && item.sisaPiutang > 0) return false;
      if (filterStatus === 'LEWAT_TEMPO' && !item.overdue) return false;

      // Aging Bucket Filter
      if (filterAging !== 'ALL' && item.agingBucket !== filterAging) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noNota = item.nomor || (item as any).nomorNota || '';
        const name = item.entityName.toLowerCase();
        if (!noNota.toLowerCase().includes(q) && !name.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'tanggal') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === 'jatuhTempo') {
        valA = a.jatuhTempo ? new Date(a.jatuhTempo).getTime() : 0;
        valB = b.jatuhTempo ? new Date(b.jatuhTempo).getTime() : 0;
      } else if (sortBy === 'sisa') {
        valA = a.sisaPiutang;
        valB = b.sisaPiutang;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [activeRawItems, filterEntityId, filterStatus, filterAging, searchQuery, sortBy, sortOrder, activeTab]);

  // Footer Totals of Filtered View
  const filteredTotals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        dibayar: acc.dibayar + item.totalDibayar,
        sisa: acc.sisa + item.sisaPiutang,
      }),
      { total: 0, dibayar: 0, sisa: 0 }
    );
  }, [filteredItems]);

  // Entity Select Options (Customers or Suppliers)
  const entitySelectOptions: SelectOption[] = useMemo(() => {
    const defaultOpt: SelectOption = {
      value: 'all',
      label: activeTab === 'piutang' ? 'Semua Pelanggan' : 'Semua Supplier',
    };

    if (activeTab === 'piutang') {
      return [
        defaultOpt,
        ...pelanggan.map((p) => ({
          value: p.id,
          label: p.nama,
          subtitle: p.telepon,
        })),
      ];
    } else {
      return [
        defaultOpt,
        ...suppliers.map((s) => ({
          value: s.id,
          label: s.nama,
          subtitle: s.telepon,
        })),
      ];
    }
  }, [activeTab, pelanggan, suppliers]);

  // Handle Pay Single Invoice
  const handleOpenPayment = (item: Transaksi | Pembelian) => {
    setSelectedInvoice(item);
    const sisa = activeTab === 'piutang' ? (item as Transaksi).sisaPiutang : (item as Pembelian).sisaHutang;
    setPaymentAmount(sisa);
    setPaymentMethod(MetodeBayar.TUNAI);
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;
    if (paymentAmount <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    if (activeTab === 'piutang') {
      const res = paySingleInvoice(selectedInvoice.id, paymentAmount, paymentMethod, paymentNotes);
      if (res.success) {
        showFeedback('success', `Berhasil mencatat pembayaran piutang ${formatRupiah(paymentAmount)}`);
        setIsPaymentModalOpen(false);
      } else {
        alert(res.error || 'Gagal');
      }
    } else {
      const res = payVendorInvoice(selectedInvoice.id, paymentAmount, paymentMethod);
      if (res.success) {
        showFeedback('success', `Berhasil mencatat pembayaran hutang vendor ${formatRupiah(paymentAmount)}`);
        setIsPaymentModalOpen(false);
      } else {
        alert(res.error || 'Gagal');
      }
    }
  };

  // Handle Bulk FIFO Payment
  const handleOpenBulkFIFO = () => {
    setFifoEntityId(pelanggan[0]?.id || '');
    setFifoTotalAmount(1000000);
    setIsBulkFIFOModalOpen(true);
  };

  const handleConfirmBulkFIFO = () => {
    if (!fifoEntityId) {
      alert('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (fifoTotalAmount <= 0) {
      alert('Nominal harus lebih dari 0');
      return;
    }

    const res = payFIFOInvoices(fifoEntityId, fifoTotalAmount, MetodeBayar.TUNAI, 'Pembayaran Borongan Multi-Nota');
    if (res.success) {
      const allocatedSummary = res.allocated.map((a) => `${formatRupiah(a.nominal)}`).join(', ');
      showFeedback('success', `Berhasil alokasi FIFO ke ${res.allocated.length} nota tertua (${allocatedSummary})`);
      setIsBulkFIFOModalOpen(false);
    } else {
      alert(res.error || 'Gagal');
    }
  };

  // Export CSV based on current active filtered data
  const handleExportCSV = () => {
    const headers = ['Nomor Nota', 'Tanggal', 'Nama', 'Total', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Umur (Hari)', 'Status'];
    const rows = filteredItems.map((item) => {
      const no = item.nomor || (item as any).nomorNota || '';
      return [
        no,
        formatWIBDate(item.createdAt),
        `"${item.entityName}"`,
        item.total,
        item.totalDibayar,
        item.sisaPiutang,
        item.jatuhTempo ? formatWIBDate(item.jatuhTempo) : '-',
        item.ageDays,
        item.overdue ? 'LEWAT_TEMPO' : item.sisaPiutang === 0 ? 'LUNAS' : 'BELUM_LUNAS',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_${activeTab}_${nowDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-amber-600" />
            <span>Rekap Hutang & Piutang Operasional</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Pencatatan tagihan tempo pelanggan B2B dan hutang barang vendor per outlet
          </p>
        </div>

        {/* Tab Switcher: Piutang Pelanggan vs Hutang Vendor */}
        <div className="flex items-center bg-stone-200 dark:bg-stone-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => {
              setActiveTab('piutang');
              setFilterEntityId('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'piutang'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Piutang Pelanggan ({piutangItems.filter((t) => t.sisaPiutang > 0).length})
          </button>
          <button
            onClick={() => {
              setActiveTab('hutang');
              setFilterEntityId('all');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hutang'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Hutang Vendor ({hutangItems.filter((h) => h.sisaHutang > 0).length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TOP SUMMARY METRIC CARDS (PRD 4.15 mandate) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Total Outstanding
          </div>
          <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {formatRupiah(summaryMetrics.totalOutstanding)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Semua tagihan belum lunas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Belum Jatuh Tempo
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {formatRupiah(summaryMetrics.notDueAmount)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Tagihan masih dalam periode aman</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Jatuh Tempo ≤ 7 Hari
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(summaryMetrics.dueSoonAmount)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Perlu segera ditagih / disiapkan</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Sudah Lewat Tempo ⭐
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatRupiah(summaryMetrics.overdueAmount)}
          </div>
          <div className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5">Menunggak lewat tanggal jatuh tempo</div>
        </div>
      </div>

      {/* AGING BUCKETS CARD (0-30, 31-60, 61-90, >90) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Aging Bucket (Umur Piutang / Hutang)</span>
          </h2>
          <span className="text-[11px] text-stone-400">Klasifikasi berdasarkan tanggal transaksi</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {agingBuckets.map((bucket) => {
            const isSelected = filterAging === bucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                onClick={() => setFilterAging(isSelected ? 'ALL' : bucket.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  {bucket.label}
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {formatRupiah(bucket.nominal)}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">{bucket.count} nota tagihan</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* COMPREHENSIVE FILTER & ACTION TOOLBAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Entity Filter (SearchableSelect) */}
          <SearchableSelect
            id="filter-entity"
            label={activeTab === 'piutang' ? 'Filter Pelanggan' : 'Filter Supplier'}
            options={entitySelectOptions}
            value={filterEntityId}
            onChange={setFilterEntityId}
            placeholder="Semua..."
          />

          {/* Status Filter */}
          <div>
            <label htmlFor="filter-status-select" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
              Status Tagihan
            </label>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-stone-100"
            >
              <option value="ALL">Semua Status</option>
              <option value="BELUM_LUNAS">Belum Lunas Saja</option>
              <option value="LEWAT_TEMPO">Sudah Lewat Tempo Saja</option>
              <option value="LUNAS">Sudah Lunas Saja</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label htmlFor="filter-search-input" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
              Cari No. Nota / Keterangan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="filter-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TRX-..., nama..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Action Buttons: Export & Bulk FIFO */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV sesuai filter yang aktif saat ini"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            {activeTab === 'piutang' && (
              <button
                onClick={handleOpenBulkFIFO}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Catat satu pembayaran pelanggan yang dialokasikan ke nota tertua terlebih dahulu"
              >
                <DollarSign className="w-4 h-4" />
                <span>Bayar FIFO ⭐</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
              <tr>
                <th className="py-3 px-3.5 font-bold">No. Nota</th>
                <th className="py-3 px-3.5 font-bold">Tanggal</th>
                <th className="py-3 px-3.5 font-bold">{activeTab === 'piutang' ? 'Pelanggan' : 'Supplier'}</th>
                <th className="py-3 px-3.5 font-bold text-right">Total Tagihan</th>
                <th className="py-3 px-3.5 font-bold text-right">Total Dibayar</th>
                <th className="py-3 px-3.5 font-bold text-right">Sisa Tagihan ⭐</th>
                <th className="py-3 px-3.5 font-bold">Jatuh Tempo</th>
                <th className="py-3 px-3.5 font-bold">Umur</th>
                <th className="py-3 px-3.5 font-bold">Status</th>
                <th className="py-3 px-3.5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-stone-400">
                    Tidak ada data tagihan sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const noNota = item.nomor || (item as any).nomorNota || '';
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.overdue
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/50'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-stone-100">
                        {noNota}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-stone-600 dark:text-stone-400">
                        {formatWIBDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-stone-800 dark:text-stone-200">
                        {item.entityName}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium">
                        {formatRupiah(item.total)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatRupiah(item.totalDibayar)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-amber-600 dark:text-amber-400">
                        {formatRupiah(item.sisaPiutang)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={item.overdue ? 'text-rose-600 font-bold' : 'text-stone-600 dark:text-stone-400'}>
                          {item.jatuhTempo ? formatWIBDate(item.jatuhTempo) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-stone-500 font-medium whitespace-nowrap">
                        {item.ageDays} hari
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            item.overdue
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                              : item.sisaPiutang === 0
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {item.overdue
                            ? 'LEWAT TEMPO'
                            : item.sisaPiutang === 0
                            ? 'LUNAS'
                            : 'BELUM LUNAS'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.sisaPiutang > 0 && (
                            <button
                              onClick={() => handleOpenPayment(item)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                            >
                              Bayar
                            </button>
                          )}
                          <button
                            onClick={() => setDetailInvoice(item)}
                            className="p-1 rounded-lg text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
                            title="Lihat rincian item & riwayat cicilan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Column Totals following Active Filter */}
            <tfoot className="border-t-2 border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 font-bold text-stone-900 dark:text-stone-100">
              <tr>
                <td colSpan={3} className="py-3 px-3.5 uppercase text-[11px]">
                  Total ({filteredItems.length} Nota Sesuai Filter):
                </td>
                <td className="py-3 px-3.5 text-right">{formatRupiah(filteredTotals.total)}</td>
                <td className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(filteredTotals.dibayar)}
                </td>
                <td className="py-3 px-3.5 text-right text-amber-600 dark:text-amber-400">
                  {formatRupiah(filteredTotals.sisa)}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SINGLE PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Catat Pembayaran {activeTab === 'piutang' ? 'Piutang' : 'Hutang'}
                </h3>
                <p className="text-xs text-stone-500">
                  Nota: {selectedInvoice.nomor || (selectedInvoice as any).nomorNota}
                </p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex justify-between items-center text-xs">
                <span>Sisa Tagihan Saat Ini:</span>
                <span className="font-bold text-amber-600 text-sm">
                  {formatRupiah(
                    activeTab === 'piutang'
                      ? (selectedInvoice as Transaksi).sisaPiutang
                      : (selectedInvoice as Pembelian).sisaHutang
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Pembayaran (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[MetodeBayar.TUNAI, MetodeBayar.TRANSFER, MetodeBayar.QRIS].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cicilan ke-2, transfer BCA..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK FIFO PAYMENT MODAL (PRD 4.15 mandate) */}
      {isBulkFIFOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Pembayaran Borongan Multi-Nota (Alokasi FIFO) ⭐
                </h3>
                <p className="text-xs text-stone-500">
                  Uang dialokasikan otomatis ke nota tertua lebih dulu
                </p>
              </div>
              <button onClick={() => setIsBulkFIFOModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <SearchableSelect
                id="fifo-pelanggan"
                label="Pilih Pelanggan"
                options={pelanggan.filter((p) => p.id !== 'pel-umum').map((p) => ({
                  value: p.id,
                  label: p.nama,
                  subtitle: p.telepon,
                }))}
                value={fifoEntityId}
                onChange={setFifoEntityId}
                placeholder="Pilih pelanggan..."
              />

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Dana yang Dibayarkan (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  value={fifoTotalAmount || ''}
                  onChange={(e) => setFifoTotalAmount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-lg font-bold text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* FIFO Distribution Live Simulation */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                <div className="font-bold text-stone-800 dark:text-stone-200">
                  Pratinjau Alokasi Pembayaran FIFO:
                </div>
                {(() => {
                  const custInvoices = transaksiList
                    .filter((t) => t.pelangganId === fifoEntityId && !t.voided && t.sisaPiutang > 0)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                  if (custInvoices.length === 0) {
                    return <div className="text-stone-400">Tidak ada nota belum lunas untuk pelanggan ini.</div>;
                  }

                  let remaining = fifoTotalAmount;
                  return (
                    <div className="space-y-1 pt-1">
                      {custInvoices.map((inv) => {
                        const pay = Math.min(remaining, inv.sisaPiutang);
                        remaining = Math.max(0, remaining - pay);
                        return (
                          <div key={inv.id} className="flex justify-between items-center text-[11px]">
                            <span>
                              {inv.nomor} ({formatWIBDate(inv.createdAt)}):
                            </span>
                            <span className="font-semibold">
                              Sisa {formatRupiah(inv.sisaPiutang)} → Dibayar{' '}
                              <strong className="text-emerald-600">{formatRupiah(pay)}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkFIFOModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkFIFO}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                >
                  Eksekusi Pembayaran FIFO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL INVOICE & INSTALLMENTS HISTORY MODAL */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Rincian Nota #{detailInvoice.nomor || (detailInvoice as any).nomorNota}
                </h3>
                <p className="text-xs text-stone-500">
                  Dibuat: {formatWIBDateTime(detailInvoice.createdAt)}
                </p>
              </div>
              <button onClick={() => setDetailInvoice(null)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Items in Invoice */}
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200 mb-2">Daftar Barang:</div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border rounded-xl overflow-hidden">
                  {(detailInvoice.items || []).map((item: any) => (
                    <div key={item.id} className="p-2.5 flex justify-between items-center bg-stone-50/50 dark:bg-stone-800/40">
                      <div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{item.namaProduk}</div>
                        <div className="text-[11px] text-stone-400">
                          {item.qty} × {formatRupiah(item.hargaSatuan || item.hargaBeli)}
                        </div>
                      </div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installment Payment History */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="font-bold text-stone-800 dark:text-stone-200 mb-2">
                  Riwayat Cicilan & Pembayaran:
                </div>
                {(() => {
                  const history =
                    activeTab === 'piutang'
                      ? pembayaranPiutang.filter((p) => p.transaksiId === detailInvoice.id)
                      : pembayaranHutangList.filter((h) => h.pembelianId === detailInvoice.id);

                  if (history.length === 0) {
                    return <div className="text-stone-400 text-[11px]">Belum ada catatan cicilan untuk nota ini.</div>;
                  }

                  return (
                    <div className="space-y-1.5">
                      {history.map((h: any) => (
                        <div key={h.id} className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 flex justify-between items-center text-[11px]">
                          <div>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {formatRupiah(h.nominal)} ({h.metodeBayar})
                            </span>
                            <div className="text-[10px] text-stone-400">
                              {formatWIBDateTime(h.createdAt)} · {h.userNama || 'Admin'} {h.catatan ? `(${h.catatan})` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            DITERIMA
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 flex justify-end">
              <button
                onClick={() => setDetailInvoice(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
