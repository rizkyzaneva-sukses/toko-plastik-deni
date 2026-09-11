import React, { useState, useMemo } from 'react';
import {
  Wallet,
  PiggyBank,
  PlusCircle,
  MinusCircle,
  Settings,
  TrendingUp,
  Landmark,
  Coins,
  Building2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SumberModal, TipeTransaksiModal, SumberDana, Role, TransaksiModal } from '../types';
import { formatRupiah, formatWIBDate, formatWIBDateTime } from '../utils/formatters';

export const ModalUsahaView: React.FC = () => {
  const {
    currentUser,
    modalUsaha,
    transaksiModalList,
    setSaldoAwalUsaha,
    tambahModalUsaha,
    catatPrive,
    deleteTransaksiModal,
    totalModalTerkumpul,
    totalPriveDitarik,
    saldoLaciKasir,
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

  // Modals state
  const [modalType, setModalType] = useState<'initial' | 'add_modal' | 'prive' | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<TransaksiModal | null>(null);

  // Initial Capital Form State
  const [initNominal, setInitNominal] = useState<number>(modalUsaha.saldoAwal);
  const [initTanggal, setInitTanggal] = useState<string>(modalUsaha.tanggalMulai);
  const [initKeterangan, setInitKeterangan] = useState<string>(modalUsaha.keterangan);

  // Add Capital Form State
  const [sumberModal, setSumberModal] = useState<SumberModal>(SumberModal.UANG_SENDIRI);
  const [nominalModal, setNominalModal] = useState<number | ''>('');
  const [kasTujuan, setKasTujuan] = useState<SumberDana>(SumberDana.LACI_KASIR);
  const [penyetorModal, setPenyetorModal] = useState<string>('');
  const [keteranganModal, setKeteranganModal] = useState<string>('');

  // Prive Form State
  const [nominalPrive, setNominalPrive] = useState<number | ''>('');
  const [kasAsalPrive, setKasAsalPrive] = useState<SumberDana>(SumberDana.LACI_KASIR);
  const [penarikPrive, setPenarikPrive] = useState<string>(currentUser.nama || 'Owner');
  const [keteranganPrive, setKeteranganPrive] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  // Quick Chips
  const QUICK_MODAL_CHIPS = [5000000, 10000000, 25000000, 50000000, 100000000];
  const QUICK_PRIVE_CHIPS = [500000, 1000000, 2000000, 5000000, 10000000];

  // Ekuitas Modal Bersih
  const ekuitasModalBersih = totalModalTerkumpul - totalPriveDitarik;

  // Breakdown Modal Tambahan per Sumber
  const modalBySource = useMemo(() => {
    let sendiri = 0;
    let investor = 0;
    let utang = 0;

    for (const tx of transaksiModalList) {
      if (tx.tipe === TipeTransaksiModal.TAMBAH_MODAL) {
        if (tx.sumberModal === SumberModal.UANG_SENDIRI) sendiri += tx.nominal;
        else if (tx.sumberModal === SumberModal.INVESTOR) investor += tx.nominal;
        else if (tx.sumberModal === SumberModal.UTANG) utang += tx.nominal;
      }
    }
    return { sendiri, investor, utang };
  }, [transaksiModalList]);

  // Filtered Transactions
  const filteredList = useMemo(() => {
    if (filterType === 'all') return transaksiModalList;
    return transaksiModalList.filter((tx) => tx.tipe === filterType);
  }, [transaksiModalList, filterType]);

  // Submit Initial Capital
  const handleSaveInitial = (e: React.FormEvent) => {
    e.preventDefault();
    if (initNominal <= 0) {
      setFormError('Saldo awal usaha harus lebih dari Rp 0');
      return;
    }
    setSaldoAwalUsaha(initNominal, initTanggal, initKeterangan);
    setModalType(null);
  };

  // Submit Add Capital
  const handleSaveAddModal = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = Number(nominalModal);
    if (!nom || nom <= 0) {
      setFormError('Nominal tambahan modal harus lebih dari Rp 0');
      return;
    }
    if (!penyetorModal.trim()) {
      setFormError('Nama penyetor / investor / pemberi utang wajib diisi');
      return;
    }

    const res = tambahModalUsaha({
      sumberModal,
      nominal: nom,
      sumberKasTujuan: kasTujuan,
      keterangan: keteranganModal.trim(),
      penyetor: penyetorModal.trim(),
    });

    if (res.success) {
      setModalType(null);
      setNominalModal('');
      setPenyetorModal('');
      setKeteranganModal('');
    } else {
      setFormError(res.error || 'Gagal menambahkan modal usaha');
    }
  };

  // Submit Prive
  const handleSavePrive = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = Number(nominalPrive);
    if (!nom || nom <= 0) {
      setFormError('Nominal prive harus lebih dari Rp 0');
      return;
    }

    const res = catatPrive({
      nominal: nom,
      sumberKasTujuan: kasAsalPrive,
      keterangan: keteranganPrive.trim() || 'Pengambilan Prive Pemilik',
      penyetor: penarikPrive.trim(),
    });

    if (res.success) {
      setModalType(null);
      setNominalPrive('');
      setKeteranganPrive('');
    } else {
      setFormError(res.error || 'Gagal mencatat prive');
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTransaksiModal(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              Struktur Permodalan & Ekuitas
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Hak Akses Owner & Manajemen
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            Modal Usaha & Prive Pemilik
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Kelola Saldo Awal, Injeksi Modal [Investor / Utang / Uang Sendiri], dan Pengeluaran Prive
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setInitNominal(modalUsaha.saldoAwal);
              setInitTanggal(modalUsaha.tanggalMulai);
              setInitKeterangan(modalUsaha.keterangan);
              setModalType('initial');
            }}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-stone-500" />
            <span>Atur Saldo Awal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setNominalModal('');
              setPenyetorModal(currentUser.nama || 'Owner');
              setKeteranganModal('');
              setModalType('add_modal');
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tambah Modal Usaha</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setNominalPrive('');
              setPenarikPrive(currentUser.nama || 'Owner');
              setKeteranganPrive('');
              setModalType('prive');
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" />
            <span>- Catat Prive Pemilik</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Awal Usaha */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Saldo Awal Usaha</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatRupiah(modalUsaha.saldoAwal)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Mulai: {formatWIBDate(modalUsaha.tanggalMulai)}
          </div>
        </div>

        {/* Total Modal Disetor */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Total Modal Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalModalTerkumpul)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Saldo awal + Injeksi modal
          </div>
        </div>

        {/* Pengeluaran Prive */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Pengambilan Prive</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupiah(totalPriveDitarik)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Mengurangi modal & kas
          </div>
        </div>

        {/* Ekuitas Bersih */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Ekuitas Modal Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {formatRupiah(ekuitasModalBersih)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            Net Capital Value
          </div>
        </div>
      </div>

      {/* MODAL BREAKDOWN BY SOURCE & CASH LIQUIDITY ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Sumber Tambahan Modal */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 mb-1">
            Komposisi Tambahan Modal Usaha
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
            Rincian sumber suntikan dana yang telah diterima toko
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Uang Sendiri (Pemilik)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Dana pribadi pemilik toko</div>
              </div>
              <div className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {formatRupiah(modalBySource.sendiri)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Dana Investor
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Penyertaan modal dari mitra</div>
              </div>
              <div className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {formatRupiah(modalBySource.investor)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Utang Modal Usaha (Pinjaman)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">Kredit usaha / pinjaman modal</div>
              </div>
              <div className="font-black text-stone-900 dark:text-stone-100 text-sm">
                {formatRupiah(modalBySource.utang)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Kas Laci */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 mb-1">
              Kas Laci Toko
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Satu-satunya kas operasional. Uang tetap tersimpan setelah shift ditutup.
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-bold text-stone-800 dark:text-stone-200">Saldo Laci</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">Tunai di laci kasir</div>
                </div>
              </div>
              <div className="font-black text-stone-900 dark:text-stone-100 text-lg">
                {formatRupiah(saldoLaciKasir)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACTION LEDGER TABLE */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              Riwayat Transaksi Modal & Prive
            </h3>
            <span className="text-xs text-stone-400">({filteredList.length} rekaman)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
              {[
                { id: 'all', label: 'Semua' },
                { id: TipeTransaksiModal.SALDO_AWAL, label: 'Saldo Awal' },
                { id: TipeTransaksiModal.TAMBAH_MODAL, label: 'Tambah Modal' },
                { id: TipeTransaksiModal.PRIVE, label: 'Prive' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === tab.id
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Tipe Transaksi</th>
                <th className="py-3 px-4">Sumber / Klasifikasi</th>
                <th className="py-3 px-4">Penyetor / Penarik</th>
                <th className="py-3 px-4">Pos Kas</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Belum ada riwayat permodalan pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-stone-600 dark:text-stone-300">
                      {formatWIBDate(tx.tanggal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.tipe === TipeTransaksiModal.SALDO_AWAL
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                            : tx.tipe === TipeTransaksiModal.TAMBAH_MODAL
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                        }`}
                      >
                        {tx.tipe === TipeTransaksiModal.SALDO_AWAL
                          ? 'Saldo Awal'
                          : tx.tipe === TipeTransaksiModal.TAMBAH_MODAL
                          ? 'Tambah Modal'
                          : 'Prive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-stone-700 dark:text-stone-300">
                      {tx.sumberModal === SumberModal.INVESTOR
                        ? 'Investor'
                        : tx.sumberModal === SumberModal.UTANG
                        ? 'Utang Usaha'
                        : tx.sumberModal === SumberModal.UANG_SENDIRI
                        ? 'Uang Sendiri'
                        : 'Prive Pemilik'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-stone-800 dark:text-stone-200">
                      {tx.penyetor}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {tx.sumberKasTujuan === SumberDana.LACI_KASIR
                          ? 'Laci Kasir'
                          : tx.sumberKasTujuan === SumberDana.KAS_BESAR
                          ? 'Kas Besar'
                          : 'Rek. Bank'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-400">
                      {tx.keterangan}
                    </td>
                    <td
                      className={`py-3 px-4 whitespace-nowrap text-right font-black ${
                        tx.tipe === TipeTransaksiModal.PRIVE
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {tx.tipe === TipeTransaksiModal.PRIVE ? '-' : '+'}
                      {formatRupiah(tx.nominal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {tx.tipe !== TipeTransaksiModal.SALDO_AWAL ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tx)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Hapus / Batalkan Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-stone-300 dark:text-stone-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ATUR SALDO AWAL USAHA */}
      {modalType === 'initial' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Atur Saldo Awal Usaha
                  </h3>
                  <p className="text-xs text-stone-500">Penetapan modal pendirian awal toko</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveInitial} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Saldo Awal (Rp)
                </label>
                <input
                  type="number"
                  value={initNominal}
                  onChange={(e) => setInitNominal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Tanggal Mulai Usaha
                </label>
                <input
                  type="date"
                  value={initTanggal}
                  onChange={(e) => setInitTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Keterangan / Catatan Pendirian
                </label>
                <input
                  type="text"
                  value={initKeterangan}
                  onChange={(e) => setInitKeterangan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer transition-all"
                >
                  Simpan Saldo Awal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH MODAL USAHA */}
      {modalType === 'add_modal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Tambah Modal Usaha
                  </h3>
                  <p className="text-xs text-stone-500">Injeksi dana investor, utang, atau pemilik</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAddModal} className="space-y-3.5 text-xs">
              {/* Sumber Modal Option */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Sumber Tambahan Modal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSumberModal(SumberModal.UANG_SENDIRI)}
                    className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      sumberModal === SumberModal.UANG_SENDIRI
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div>Uang Sendiri</div>
                    <div className="text-[10px] font-normal opacity-80">Dana Pemilik</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSumberModal(SumberModal.INVESTOR)}
                    className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      sumberModal === SumberModal.INVESTOR
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div>Investor</div>
                    <div className="text-[10px] font-normal opacity-80">Mitra Usaha</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSumberModal(SumberModal.UTANG)}
                    className={`p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      sumberModal === SumberModal.UTANG
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <div>Utang Modal</div>
                    <div className="text-[10px] font-normal opacity-80">Pinjaman Usaha</div>
                  </button>
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Modal Masuk (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 10000000"
                  value={nominalModal}
                  onChange={(e) => setNominalModal(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-sm"
                  min="0"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {QUICK_MODAL_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNominalModal(chip)}
                      className="px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      {formatRupiah(chip)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Disetorkan Ke
                </label>
                <div className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-stone-900 dark:text-stone-100 font-semibold">
                  Laci Kasir Toko
                </div>
              </div>

              {/* Nama Penyetor */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Penyetor / Investor / Kreditur
                </label>
                <input
                  type="text"
                  placeholder="Contoh: H. Suryanto / PT Mitra Sejahtera / Bank Mandiri"
                  value={penyetorModal}
                  onChange={(e) => setPenyetorModal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Keterangan / Tujuan Modal
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tambahan modal belanja stok jelang Ramadhan"
                  value={keteranganModal}
                  onChange={(e) => setKeteranganModal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-all"
                >
                  Simpan Tambahan Modal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PENGELUARAN PRIVE */}
      {modalType === 'prive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <MinusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                    Catat Pengeluaran Prive
                  </h3>
                  <p className="text-xs text-stone-500">Penarikan dana untuk keperluan pribadi pemilik</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
              <strong>Catatan Penting:</strong> Pengeluaran Prive secara otomatis akan memotong <strong>Modal Usaha / Ekuitas</strong> dan mengurangi <strong>Saldo Kas</strong> yang dipilih.
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSavePrive} className="space-y-3.5 text-xs">
              {/* Nominal Prive */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Prive (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 2000000"
                  value={nominalPrive}
                  onChange={(e) => setNominalPrive(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-black text-sm"
                  min="0"
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {QUICK_PRIVE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNominalPrive(chip)}
                      className="px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      {formatRupiah(chip)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Diambil Dari
                </label>
                <div className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-stone-900 dark:text-stone-100 font-semibold">
                  Laci Kasir Toko
                </div>
              </div>

              {/* Nama Pemilik */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Pemilik / Penarik
                </label>
                <input
                  type="text"
                  value={penarikPrive}
                  onChange={(e) => setPenarikPrive(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Keterangan Penarikan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengambilan Prive bulanan Pak Suryanto"
                  value={keteranganPrive}
                  onChange={(e) => setKeteranganPrive(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-all"
                >
                  Simpan Prive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-5 border border-stone-200 dark:border-stone-800 shadow-xl space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              Batalkan Transaksi Modal?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Yakin ingin menghapus transaksi {deleteTarget.tipe} senilai{' '}
              <strong>{formatRupiah(deleteTarget.nominal)}</strong>? Posisi ekuitas akan dihitung ulang.
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
                onClick={confirmDelete}
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
