import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle2, DollarSign, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRupiah } from '../utils/formatters';

interface ShiftModalProps {
  mode: 'open' | 'close';
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ mode, isOpen, onClose }) => {
  const { activeShift, openShift, closeShift, currentUser, activeOutlet } = useApp();
  const [modalAwal, setModalAwal] = useState<number>(300000);
  const [tunaiFisik, setTunaiFisik] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalAwal < 0) {
      setErrorMsg('Modal awal tidak boleh negatif');
      return;
    }
    openShift(modalAwal);
    onClose();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      closeShift(tunaiFisik);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    }
  };

  const selisih = activeShift ? tunaiFisik - activeShift.tunaiSistem : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                mode === 'open'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {mode === 'open' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                {mode === 'open' ? 'Buka Shift Kasir' : 'Tutup Shift Kasir'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {currentUser.nama} · {activeOutlet.nama}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {mode === 'open' ? (
          <form onSubmit={handleOpenShift} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Modal Tunai Awal di Laci (Uang Pecahan / Kasir)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={modalAwal || ''}
                  onChange={(e) => {
                    setErrorMsg('');
                    setModalAwal(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2">
              {[100000, 200000, 300000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setModalAwal(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    modalAwal === val
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {formatRupiah(val)}
                </button>
              ))}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
              Modal laci digunakan untuk uang kembalian transaksi awal dan akan dihitung pada saat penutupan shift.
            </p>

            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Buka Shift Sekarang
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCloseShift} className="p-5 space-y-4">
            {activeShift && (
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Modal Awal Laci:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {formatRupiah(activeShift.modalAwal)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Penjualan Tunai:
                  </span>
                  <span className="font-semibold">+{formatRupiah(activeShift.penjualanTunai)}</span>
                </div>
                {activeShift.pembayaranPiutangTunai > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Bayar Piutang Tunai:
                    </span>
                    <span className="font-semibold">+{formatRupiah(activeShift.pembayaranPiutangTunai)}</span>
                  </div>
                )}
                {activeShift.pengeluaranLaci > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Pengeluaran dari Laci:
                    </span>
                    <span className="font-semibold">-{formatRupiah(activeShift.pengeluaranLaci)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center text-sm font-bold">
                  <span className="text-stone-800 dark:text-stone-200">Tunai Seharusnya di Laci:</span>
                  <span className="text-amber-600 dark:text-amber-400 text-base">
                    {formatRupiah(activeShift.tunaiSistem)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Hitungan Fisik Uang di Laci Saat Ini
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={tunaiFisik || ''}
                  onChange={(e) => {
                    setErrorMsg('');
                    setTunaiFisik(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-lg font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Difference Indicator */}
            {activeShift && (
              <div
                className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                  selisih === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : selisih < 0
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {selisih === 0 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>
                    {selisih === 0
                      ? 'Kas Seimbang (Pas)'
                      : selisih < 0
                      ? `Selisih Kurang: ${formatRupiah(Math.abs(selisih))}`
                      : `Selisih Lebih: ${formatRupiah(selisih)}`}
                  </span>
                </div>
                <span>{formatRupiah(selisih)}</span>
              </div>
            )}

            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Tutup Shift & Rekonsiliasi
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
