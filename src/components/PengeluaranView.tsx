import React, { useState, useMemo } from 'react';
import {
  Receipt,
  PlusCircle,
  Filter,
  Trash2,
  Calendar,
  Building2,
  Wallet,
  Coins,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownRight,
  Lock,
  Tag,
  FileSpreadsheet,
  Pencil,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MetodeBayar, SumberDana, Role, Pengeluaran } from '../types';
import { formatRupiah, formatWIBDate, formatWIBDateTime, todayWIBDate } from '../utils/formatters';
import { SearchableSelect } from './SearchableSelect';

export const PengeluaranView: React.FC = () => {
  const {
    currentUser,
    activeOutlet,
    outlets,
    kategoriPengeluaran,
    pengeluaranList,
    createPengeluaran,
    deletePengeluaran,
    updatePengeluaran,
    activeShift,
    isUserAssigned,
  } = useApp();

  // If Kasir or Manager is unassigned, block access
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
            Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan. Hubungi Owner untuk menetapkan cabang penugasan Anda.
          </p>
        </div>
      </div>
    );
  }

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetOutletId, setTargetOutletId] = useState<string>(activeOutlet.id);
  const [kategoriId, setKategoriId] = useState<string>(kategoriPengeluaran[0]?.id || 'kat-exp-1');
  const [nominal, setNominal] = useState<number | ''>('');
  const [sumberDana, setSumberDana] = useState<SumberDana>(SumberDana.LACI_KASIR);
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>(MetodeBayar.TUNAI);
  const [keterangan, setKeterangan] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(todayWIBDate());
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [filterPeriod, setFilterPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOutlet, setFilterOutlet] = useState<string>(
    currentUser.role === Role.OWNER ? 'all' : activeOutlet.id
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Pengeluaran | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Pengeluaran | null>(null);
  const [editKategoriId, setEditKategoriId] = useState<string>('');
  const [editNominal, setEditNominal] = useState<number | ''>('');
  const [editSumberDana, setEditSumberDana] = useState<SumberDana>(SumberDana.LACI_KASIR);
  const [editMetodeBayar, setEditMetodeBayar] = useState<MetodeBayar>(MetodeBayar.TUNAI);
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [editTanggal, setEditTanggal] = useState<string>(todayWIBDate());
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Quick Nominal Chips
  const QUICK_NOMINALS = [10000, 20000, 50000, 100000, 250000, 500000];

  // Boundaries
  const filterStartDate = useMemo(() => {
    const d = new Date();
    if (filterPeriod === 'today') {
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (filterPeriod === '7d') {
      d.setDate(d.getDate() - 7);
      return d.getTime();
    }
    if (filterPeriod === '30d') {
      d.setDate(d.getDate() - 30);
      return d.getTime();
    }
    return 0;
  }, [filterPeriod]);

  // Filtered Expense Records
  const filteredExpenses = useMemo(() => {
    return pengeluaranList.filter((item) => {
      // Role enforcement
      if (currentUser.role !== Role.OWNER && item.outletId !== activeOutlet.id) return false;
      if (currentUser.role === Role.OWNER && filterOutlet !== 'all' && item.outletId !== filterOutlet)
        return false;

      // Category filter
      if (filterCategory !== 'all' && item.kategoriId !== filterCategory) return false;

      // Period filter
      const itemTime = new Date(item.tanggal || item.createdAt).getTime();
      if (itemTime < filterStartDate) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKet = item.keterangan.toLowerCase().includes(q);
        const matchesKat = item.kategoriNama.toLowerCase().includes(q);
        const matchesUser = item.userNama.toLowerCase().includes(q);
        if (!matchesKet && !matchesKat && !matchesUser) return false;
      }

      return true;
    });
  }, [pengeluaranList, currentUser, activeOutlet, filterOutlet, filterCategory, filterStartDate, searchQuery]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let total = 0;
    let dariLaci = 0;
    let dariKasBesar = 0;
    let dariBank = 0;

    for (const exp of filteredExpenses) {
      total += exp.nominal;
      if (exp.sumberDana === SumberDana.LACI_KASIR) dariLaci += exp.nominal;
      else if (exp.sumberDana === SumberDana.KAS_BESAR) dariKasBesar += exp.nominal;
      else if (exp.sumberDana === SumberDana.BANK) dariBank += exp.nominal;
    }

    return {
      total,
      dariLaci,
      dariKasBesar,
      dariBank,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nom = Number(nominal);
    if (!nom || nom <= 0) {
      setFormError('Nominal pengeluaran harus lebih dari Rp 0!');
      return;
    }
    if (!keterangan.trim()) {
      setFormError('Keterangan / keperluan pengeluaran wajib diisi!');
      return;
    }

    const res = createPengeluaran({
      outletId: currentUser.role === Role.OWNER ? targetOutletId : activeOutlet.id,
      kategoriId,
      nominal: nom,
      metodeBayar,
      sumberDana,
      keterangan: keterangan.trim(),
      tanggal,
    });

    if (res.success) {
      setIsModalOpen(false);
      setNominal('');
      setKeterangan('');
    } else {
      setFormError(res.error || 'Gagal mencatat pengeluaran');
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePengeluaran(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Handle Edit Form Submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editTarget) return;

    const nom = Number(editNominal);
    if (!nom || nom <= 0) {
      setEditFormError('Nominal pengeluaran harus lebih dari Rp 0!');
      return;
    }
    if (!editKeterangan.trim()) {
      setEditFormError('Keterangan / keperluan pengeluaran wajib diisi!');
      return;
    }

    const res = updatePengeluaran(editTarget.id, {
      kategoriId: editKategoriId,
      nominal: nom,
      metodeBayar: editMetodeBayar,
      sumberDana: editSumberDana,
      keterangan: editKeterangan.trim(),
      tanggal: editTanggal,
    });

    if (res.success) {
      setEditTarget(null);
    } else {
      setEditFormError(res.error || 'Gagal mengupdate pengeluaran');
    }
  };

  // Open Edit Modal
  const openEditModal = (item: Pengeluaran) => {
    setEditFormError(null);
    setEditKategoriId(item.kategoriId);
    setEditNominal(item.nominal);
    setEditSumberDana(item.sumberDana);
    setEditMetodeBayar(item.metodeBayar);
    setEditKeterangan(item.keterangan);
    setEditTanggal(item.tanggal);
    setEditTarget(item);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
              Modul Operasional
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {currentUser.role === Role.OWNER ? 'Akses Multi-Cabang' : `Cabang: ${activeOutlet.nama}`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            Catat & Kelola Pengeluaran
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Pencatatan khusus biaya operasional toko terpisah murni dari laporan laba/rugi
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setTargetOutletId(activeOutlet.id);
            setNominal('');
            setKeterangan('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupiah(summaryMetrics.total)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {summaryMetrics.count} transaksi pengeluaran
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Dari Laci Kasir (Shift)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(summaryMetrics.dariLaci)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Memotong saldo kasir aktif
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Dari Kas Besar (Brankas)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(summaryMetrics.dariKasBesar)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Kas operasional kantor
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Dari Rekening Bank</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(summaryMetrics.dariBank)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Transfer rekening usaha
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {(['today', '7d', '30d', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setFilterPeriod(period)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPeriod === period
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {period === 'today' ? 'Hari Ini' : period === '7d' ? '7 Hari' : period === '30d' ? '30 Hari' : 'Semua'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="min-w-[180px]">
            <SearchableSelect
              id="filter-kat-exp"
              options={[
                { value: 'all', label: 'Semua Kategori' },
                ...kategoriPengeluaran.map((k) => ({ value: k.id, label: k.nama })),
              ]}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Kategori"
            />
          </div>

          {currentUser.role === Role.OWNER && (
            <div className="min-w-[200px]">
              <SearchableSelect
                id="filter-outlet-exp"
                options={[
                  { value: 'all', label: 'Semua Outlet Cabang' },
                  ...outlets.map((o) => ({ value: o.id, label: o.nama })),
                ]}
                value={filterOutlet}
                onChange={setFilterOutlet}
                placeholder="Outlet"
              />
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari keterangan / pencatat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* EXPENSE TABLE */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tanggal & Waktu</th>
                <th className="py-3 px-4">Cabang</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Keterangan / Keperluan</th>
                <th className="py-3 px-4">Sumber Kas</th>
                <th className="py-3 px-4">Petugas</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Tidak ada catatan pengeluaran pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item) => {
                  const outletItem = outlets.find((o) => o.id === item.outletId);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-stone-600 dark:text-stone-300">
                        {formatWIBDate(item.tanggal || item.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-stone-800 dark:text-stone-200">
                        {outletItem?.nama.replace('Toko Plastik ', '') || item.outletId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[10px]">
                          {item.kategoriNama}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-900 dark:text-stone-100 font-medium">
                        {item.keterangan}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.sumberDana === SumberDana.LACI_KASIR
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                              : item.sumberDana === SumberDana.KAS_BESAR
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                          }`}
                        >
                          {item.sumberDana === SumberDana.LACI_KASIR
                            ? 'Laci Kasir'
                            : item.sumberDana === SumberDana.KAS_BESAR
                            ? 'Kas Besar'
                            : 'Bank'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-stone-500 dark:text-stone-400">
                        {item.userNama}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-black text-rose-600 dark:text-rose-400">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                          title="Edit Pengeluaran"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INPUT PENGELUARAN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Catat Pengeluaran Baru
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Catat pengeluaran operasional toko
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Outlet Selector (Locked if not owner) */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Cabang Outlet
                </label>
                {currentUser.role === Role.OWNER ? (
                  <SearchableSelect
                    id="form-outlet-exp"
                    options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
                    value={targetOutletId}
                    onChange={setTargetOutletId}
                    placeholder="Pilih outlet"
                  />
                ) : (
                  <div className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/60 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-between">
                    <span>{activeOutlet.nama}</span>
                    <span className="text-[10px] text-stone-500">Terkunci (Penugasan)</span>
                  </div>
                )}
              </div>

              {/* Kategori Pengeluaran */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Kategori Pengeluaran
                </label>
                <SearchableSelect
                  id="form-kat-exp"
                  options={kategoriPengeluaran.map((k) => ({ value: k.id, label: k.nama }))}
                  value={kategoriId}
                  onChange={setKategoriId}
                  placeholder="Pilih kategori"
                />
              </div>

              {/* Nominal & Quick Chips */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  min="0"
                  required
                />
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {QUICK_NOMINALS.map((nomVal) => (
                    <button
                      key={nomVal}
                      type="button"
                      onClick={() => setNominal(nomVal)}
                      className="px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      {formatRupiah(nomVal)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Sumber Dana
                </label>
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <div className="font-bold">Laci Kasir</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">
                    Semua pengeluaran dipotong dari kas laci toko
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Keterangan / Keperluan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli bensin motor kirim barang, bayar listrik token"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-all shadow-xs"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {/* EDIT MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Edit Pengeluaran
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Perbarui data catatan pengeluaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              {/* Kategori Pengeluaran */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Kategori Pengeluaran
                </label>
                <SearchableSelect
                  id="edit-kat-exp"
                  options={kategoriPengeluaran.map((k) => ({ value: k.id, label: k.nama }))}
                  value={editKategoriId}
                  onChange={setEditKategoriId}
                  placeholder="Pilih kategori"
                />
              </div>

              {/* Nominal & Quick Chips */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={editNominal}
                  onChange={(e) => setEditNominal(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  min="0"
                  required
                />
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {QUICK_NOMINALS.map((nomVal) => (
                    <button
                      key={nomVal}
                      type="button"
                      onClick={() => setEditNominal(nomVal)}
                      className="px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      {formatRupiah(nomVal)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sumber Dana */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Sumber Dana
                </label>
                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                  <div className="font-bold">Laci Kasir</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">
                    Semua pengeluaran dipotong dari kas laci toko
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Keterangan / Keperluan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Beli bensin motor kirim barang, bayar listrik token"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-all shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-5 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              Konfirmasi Hapus Pengeluaran?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Yakin ingin menghapus catatan pengeluaran <strong>"{deleteTarget.keterangan}"</strong> senilai{' '}
              <strong>{formatRupiah(deleteTarget.nominal)}</strong>? Saldo kas akan dipulihkan jika sebelumnya diambil dari shift kasir aktif.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
