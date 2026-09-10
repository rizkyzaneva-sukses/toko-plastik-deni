import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Package,
  History,
  TrendingDown,
  Info,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JenisProduk } from '../types';
import { formatRupiah, formatWIBDateTime, formatNumber } from '../utils/formatters';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { UnassignedLock } from './UnassignedLock';

export const PecahKarungView: React.FC = () => {
  const {
    produk,
    stokOutlet,
    activeOutlet,
    processPecahKarung,
    pecahKarungList,
    getProdukStokForOutlet,
    getProdukHPPForOutlet,
    currentUser,
    isUserAssigned,
  } = useApp();

  // Selected Sack Product
  const [selectedIndukId, setSelectedIndukId] = useState<string>('prod-karung-1');
  const [jumlahKarung, setJumlahKarung] = useState<number>(1);
  const [beratIndukAktualGram, setBeratIndukAktualGram] = useState<number>(25000);
  const [keterangan, setKeterangan] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');

  // Sacks catalog (only KARUNG products)
  const sackProducts = useMemo(() => {
    return produk.filter((p) => p.jenis === JenisProduk.KARUNG && p.aktif);
  }, [produk]);

  // Selected sack product object
  const currentSack = useMemo(() => {
    return sackProducts.find((p) => p.id === selectedIndukId) || sackProducts[0];
  }, [sackProducts, selectedIndukId]);

  // Available sack stock in current outlet
  const sackStock = useMemo(() => {
    if (!currentSack) return 0;
    return getProdukStokForOutlet(currentSack.id, activeOutlet.id);
  }, [currentSack, getProdukStokForOutlet, activeOutlet.id]);

  // Child retail products linked to this sack
  const childRetailProducts = useMemo(() => {
    if (!currentSack) return [];
    return produk.filter(
      (p) => p.jenis === JenisProduk.ECER && (p.indukId === currentSack.id || p.nama.toLowerCase().includes(currentSack.nama.split('—')[0].trim().toLowerCase()))
    );
  }, [produk, currentSack]);

  // State for bag counts of each child product
  // PRD Requirement: "resep panduan ada, tapi field hasil dikosongkan setiap kali, wajib diisi aktual"
  const [bagCounts, setBagCounts] = useState<Record<string, number>>({});

  const handleSackChange = (newIndukId: string) => {
    setSelectedIndukId(newIndukId);
    const prod = sackProducts.find((p) => p.id === newIndukId);
    if (prod && prod.beratKemasanGram) {
      setBeratIndukAktualGram(prod.beratKemasanGram);
    } else {
      setBeratIndukAktualGram(25000);
    }
    setBagCounts({});
  };

  const handleQtyChange = (childId: string, val: number) => {
    setBagCounts((prev) => ({
      ...prev,
      [childId]: Math.max(0, val),
    }));
  };

  // Calculation Engine:
  // totalGramInduk = beratIndukAktualGram * jumlahKarung
  // totalGramHasil = sum(qty * beratKemasanGram)
  // susut = totalGramInduk - totalGramHasil
  const calculation = useMemo(() => {
    const totalGramInduk = beratIndukAktualGram * jumlahKarung;
    let totalGramHasil = 0;

    const itemsDetail = childRetailProducts.map((p) => {
      const qty = bagCounts[p.id] || 0;
      const gramPerPouch = p.beratKemasanGram || 0;
      const totalItemGram = qty * gramPerPouch;
      totalGramHasil += totalItemGram;

      return {
        produk: p,
        qty,
        gramPerPouch,
        totalItemGram,
      };
    });

    const susutGram = totalGramInduk - totalGramHasil;
    const susutPersen = totalGramInduk > 0 ? (susutGram / totalGramInduk) * 100 : 0;
    const isNegativeShrinkage = susutGram < 0;
    const isOverTolerance = susutPersen > 2.0;

    // HPP Simulation
    const hppKarung = getProdukHPPForOutlet(currentSack?.id || '', activeOutlet.id) || 300000;
    const hppPerGram = totalGramHasil > 0 ? (hppKarung * jumlahKarung) / totalGramHasil : 0;

    const projectedHpp = itemsDetail.map((item) => {
      const packagingCost = item.produk.biayaKemasan || 0;
      const hppEcer = Math.round(hppPerGram * item.gramPerPouch + packagingCost);
      return {
        ...item,
        projectedHppEcer: hppEcer,
      };
    });

    return {
      totalGramInduk,
      totalGramHasil,
      susutGram,
      susutPersen,
      isNegativeShrinkage,
      isOverTolerance,
      projectedHpp,
      hppKarung,
    };
  }, [
    beratIndukAktualGram,
    jumlahKarung,
    childRetailProducts,
    bagCounts,
    currentSack,
    getProdukHPPForOutlet,
    activeOutlet.id,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner('');
    setSuccessBanner('');

    if (sackStock < jumlahKarung) {
      setErrorBanner(`Stok karung ${currentSack?.nama} tidak cukup! (Tersedia: ${sackStock})`);
      return;
    }

    if (calculation.totalGramHasil <= 0) {
      setErrorBanner('Wajib mengisi jumlah hasil kemasan eceran!');
      return;
    }

    if (calculation.isNegativeShrinkage) {
      setErrorBanner('Berat hasil melebihi berat karung! Susut tidak boleh negatif.');
      return;
    }

    if (calculation.isOverTolerance && !keterangan.trim()) {
      setErrorBanner(`Susut ${calculation.susutPersen.toFixed(2)}% melebihi batas 2.0%! Keterangan alasan wajib diisi.`);
      return;
    }

    const payload = {
      outletId: activeOutlet.id,
      produkIndukId: currentSack.id,
      jumlahKarung,
      beratIndukAktualGram,
      hasil: childRetailProducts
        .filter((p) => (bagCounts[p.id] || 0) > 0)
        .map((p) => ({
          produkEcerId: p.id,
          qtyKemasan: bagCounts[p.id] || 0,
        })),
      keterangan,
    };

    const res = processPecahKarung(payload);
    if (!res.success) {
      setErrorBanner(res.error || 'Gagal memproses pecah karung');
      return;
    }

    setSuccessBanner(
      `Berhasil memecah ${jumlahKarung} karung ${currentSack.nama}. Susut tercatat: ${calculation.susutGram}g (${calculation.susutPersen.toFixed(1)}%).`
    );
    setBagCounts({});
    setKeterangan('');
  };

  const sackSelectOptions: SelectOption[] = sackProducts.map((p) => ({
    value: p.id,
    label: p.nama,
    subtitle: `Stok: ${getProdukStokForOutlet(p.id, activeOutlet.id)} ${p.satuan} · HPP: ${formatRupiah(getProdukHPPForOutlet(p.id, activeOutlet.id))}`,
    badge: 'KARUNG',
  }));

  if (!isUserAssigned) {
    return <UnassignedLock />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Scissors className="w-6 h-6 text-amber-600" />
            <span>Pecah Karung & Deteksi Susut</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Manajemen produksi eceran di {activeOutlet.nama} dengan kalkulasi susut dan penyerapan HPP otomatis
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 w-fit">
          Outlet Aktif: {activeOutlet.nama}
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORM SECTION */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Form Input Pekerjaan Pecah Karung</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Pilih Produk Induk */}
            <SearchableSelect
              id="select-karung-induk"
              label="Pilih Produk Karung Induk"
              options={sackSelectOptions}
              value={selectedIndukId}
              onChange={handleSackChange}
              placeholder="Pilih karung yang akan dipecah..."
              required
            />

            {/* 2. Jumlah Karung & Berat Aktual Karung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Jumlah Karung Dibuka
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={sackStock || 1}
                    value={jumlahKarung}
                    onChange={(e) => setJumlahKarung(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold text-stone-900 dark:text-stone-100"
                    required
                  />
                  <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                    (Sisa: {sackStock} karung)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Berat Aktual per Karung (Gram) ⭐
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="50"
                    value={beratIndukAktualGram}
                    onChange={(e) => setBeratIndukAktualGram(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold text-stone-900 dark:text-stone-100"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    gram ({(beratIndukAktualGram / 1000).toFixed(1)} kg)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              💡 <strong>Aturan PRD:</strong> Timbang karung sebelum dibuka. Jangan asumsikan selalu 25kg karena berat asli dari supplier bervariasi.
            </p>

            {/* 3. Hasil Aktual Kemasan Eceran */}
            <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  INPUT HASIL KEMASAN AKTUAL
                </label>
                <span className="text-[11px] text-stone-500">Wajib diisi sesuai timbangan fisik</span>
              </div>

              {childRetailProducts.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-stone-500 text-xs text-center">
                  Belum ada produk eceran yang terhubung dengan karung ini di master produk.
                </div>
              ) : (
                <div className="space-y-2">
                  {childRetailProducts.map((child) => {
                    const weight = child.beratKemasanGram || 0;
                    const qty = bagCounts[child.id] || 0;
                    const subGram = qty * weight;

                    return (
                      <div
                        key={child.id}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                            {child.nama}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            Kemasan: {weight} gram · Biaya kemasan: {formatRupiah(child.biayaKemasan || 0)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={bagCounts[child.id] || ''}
                              onChange={(e) => handleQtyChange(child.id, parseInt(e.target.value, 10) || 0)}
                              placeholder="0"
                              className="w-20 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold text-center text-stone-900 dark:text-stone-100"
                            />
                            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                              bungkus
                            </span>
                          </div>

                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 min-w-[70px] text-right">
                            = {formatNumber(subGram)}g
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Keterangan (Wajib jika susut > 2%) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Keterangan / Catatan Pekerjaan {calculation.isOverTolerance && <span className="text-rose-500">(Wajib karena susut &gt; 2%)</span>}
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catat kondisi karung, timbangan, atau sisa tepung yang menempel..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 h-16 resize-none"
              />
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={calculation.isNegativeShrinkage || sackStock < jumlahKarung}
              className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                calculation.isNegativeShrinkage || sackStock < jumlahKarung
                  ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-98'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Simpan & Eksekusi Pecah Karung</span>
            </button>
          </form>
        </div>

        {/* LIVE CALCULATION & SHRINKAGE AUDIT CARD */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <span>Hasil Analisis Susut Real-Time</span>
            </h3>

            {/* Metrics Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <span className="text-stone-600 dark:text-stone-400 font-medium">Total Berat Induk:</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {formatNumber(calculation.totalGramInduk)} gram ({(calculation.totalGramInduk / 1000).toFixed(1)} kg)
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700">
                <span className="text-stone-600 dark:text-stone-400 font-medium">Total Berat Hasil Ecer:</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {formatNumber(calculation.totalGramHasil)} gram ({(calculation.totalGramHasil / 1000).toFixed(2)} kg)
                </span>
              </div>

              {/* Susut Badge Card */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  calculation.isNegativeShrinkage
                    ? 'bg-rose-100 dark:bg-rose-950/50 border-rose-400 text-rose-800 dark:text-rose-300'
                    : calculation.isOverTolerance
                    ? 'bg-amber-100 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-100/70 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide">
                    {calculation.isNegativeShrinkage
                      ? 'Error: Berat Hasil Lebih Besar'
                      : calculation.isOverTolerance
                      ? 'Peringatan: Susut > 2.0%'
                      : 'Susut Normal / Aman'}
                  </div>
                  <div className="text-xs mt-0.5">
                    Selisih: {formatNumber(calculation.susutGram)} gram
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black">
                    {calculation.susutPersen.toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-semibold uppercase">Persentase Susut</div>
                </div>
              </div>
            </div>

            {/* Projected HPP Allocation (PRD requirement: HPP absorbs shrinkage cost!) */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulasi Penyerapan HPP Eceran:</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Biaya susut otomatis diserap ke HPP produk eceran agar tidak menjadi kerugian tersembunyi.
              </p>

              <div className="space-y-1.5 pt-1">
                {calculation.projectedHpp.map((item) => (
                  <div
                    key={item.produk.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40"
                  >
                    <span className="font-medium text-stone-700 dark:text-stone-300 truncate">
                      {item.produk.nama}:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      HPP {formatRupiah(item.projectedHppEcer)} / bks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PECAR KARUNG AUDIT LOG */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-600" />
          <span>Riwayat Kejadian Pecah Karung & Catatan Susut</span>
        </h3>

        {pecahKarungList.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400">Belum ada riwayat pecah karung</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Produk Karung</th>
                  <th className="py-2.5 px-3">Karung</th>
                  <th className="py-2.5 px-3">Berat Induk</th>
                  <th className="py-2.5 px-3">Hasil Ecer</th>
                  <th className="py-2.5 px-3">Susut</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {pecahKarungList.map((pch) => (
                  <tr key={pch.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                    <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 dark:text-stone-400">
                      {formatWIBDateTime(pch.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">
                      {pch.namaProdukInduk}
                    </td>
                    <td className="py-2.5 px-3 font-bold">{pch.jumlahKarung} krg</td>
                    <td className="py-2.5 px-3">{formatNumber(pch.beratIndukAktualGram * pch.jumlahKarung)}g</td>
                    <td className="py-2.5 px-3">
                      {pch.hasil.map((h) => `${h.qtyKemasan}× ${h.namaProdukEcer.split('(')[0].trim()}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          pch.susutPersen > 2
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {formatNumber(pch.susutGram)}g ({pch.susutPersen.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">{pch.petugasNama}</td>
                    <td className="py-2.5 px-3 text-stone-500 max-w-xs truncate">{pch.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
