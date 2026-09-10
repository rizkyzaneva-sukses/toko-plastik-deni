import React, { useState, useMemo } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  AlertTriangle,
  History,
  PlusCircle,
  ClipboardList,
  Search,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Sliders,
  X,
  Truck,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JenisProduk, MutasiStok, Role, StatusMutasi, TipeLedger } from '../types';
import { formatRupiah, formatWIBDateTime, formatNumber } from '../utils/formatters';
import { SearchableSelect, SelectOption } from './SearchableSelect';

interface StockInventoryViewProps {
  initialTab?: 'daftar' | 'mutasi' | 'opname' | 'ledger' | 'masuk';
  initialSupplierId?: string;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  initialTab,
  initialSupplierId,
}) => {
  const {
    produk,
    stokOutlet,
    outlets,
    activeOutlet,
    stokLedger,
    mutasiList,
    createMutasiStok,
    processStockOpname,
    recordPembelian,
    getProdukStokForOutlet,
    getProdukHPPForOutlet,
    hasStokRecordForOutlet,
    currentUser,
    isUserAssigned,
    suppliers,
    updateProduk,
  } = useApp();

  // Sub-tab state
  const [activeTab, setActiveTab] = useState<'daftar' | 'mutasi' | 'opname' | 'ledger' | 'masuk'>(
    initialTab || 'daftar'
  );

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>(activeOutlet.id);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Effective outlet: strictly lock non-owner to activeOutlet.id
  const effectiveOutletFilter = currentUser.role === Role.OWNER ? selectedOutletFilter : activeOutlet.id;

  // Quick Min Stock Edit Modal State
  const [editingMinStock, setEditingMinStock] = useState<{
    id: string;
    nama: string;
    kode: string;
    satuan: string;
    minLimit: number;
    stokSaatIni: number;
  } | null>(null);
  const [newMinStockVal, setNewMinStockVal] = useState<number>(5);

  // Transfer / Mutasi Form State
  const [mutasiAsal, setMutasiAsal] = useState<string>(activeOutlet.id);
  const [mutasiTujuan, setMutasiTujuan] = useState<string>('');
  const [mutasiProdukId, setMutasiProdukId] = useState<string>('');
  const [mutasiQty, setMutasiQty] = useState<number>(1);
  const [mutasiBiayaKirim, setMutasiBiayaKirim] = useState<number>(0);
  const [mutasiCatatan, setMutasiCatatan] = useState<string>('');

  // Stock Opname Form State
  const [opnameProdukId, setOpnameProdukId] = useState<string>('');
  const [opnameFisik, setOpnameFisik] = useState<number>(0);
  const [opnameCatatan, setOpnameCatatan] = useState<string>('');

  // Stock In (Pembelian) Form State
  const [pembelianSupplierId, setPembelianSupplierId] = useState<string>(initialSupplierId || '');
  const [pembelianProdukId, setPembelianProdukId] = useState<string>('');
  const [pembelianQty, setPembelianQty] = useState<number>(1);
  const [pembelianHargaSatuan, setPembelianHargaSatuan] = useState<number>(0);
  const [pembelianMetode, setPembelianMetode] = useState<'TUNAI' | 'KREDIT'>('TUNAI');
  const [pembelianJatuhTempo, setPembelianJatuhTempo] = useState<string>('');

  // Banner Feedback
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  // Stock List with Calculations
  const stockList = useMemo(() => {
    return produk
      .filter((p) => p.aktif)
      .map((p) => {
        const hasRecord = hasStokRecordForOutlet(p.id, effectiveOutletFilter);
        const stok = hasRecord ? getProdukStokForOutlet(p.id, effectiveOutletFilter) : 0;
        const hpp = hasRecord ? getProdukHPPForOutlet(p.id, effectiveOutletFilter) : 0;
        const totalNilai = stok * hpp;
        const minLimit = p.stokMin ?? 5;
        const isLow = hasRecord && stok <= minLimit;
        const isOut = hasRecord && stok <= 0;

        return {
          ...p,
          hasRecord,
          stok,
          hpp,
          totalNilai,
          minLimit,
          isLow,
          isOut,
        };
      })
      .filter((item) => {
        if (showLowStockOnly && !item.isLow) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return item.nama.toLowerCase().includes(q) || item.kode.toLowerCase().includes(q);
      });
  }, [produk, effectiveOutletFilter, showLowStockOnly, searchTerm, getProdukStokForOutlet, getProdukHPPForOutlet, hasStokRecordForOutlet]);

  // Products that have reached critical minimum stock or are out of stock
  const criticalStockItems = useMemo(() => {
    return produk
      .filter((p) => p.aktif && hasStokRecordForOutlet(p.id, effectiveOutletFilter))
      .map((p) => {
        const stok = getProdukStokForOutlet(p.id, effectiveOutletFilter);
        const minLimit = p.stokMin ?? 5;
        const isOut = stok <= 0;
        const isCritical = stok <= minLimit;
        return {
          ...p,
          stok,
          minLimit,
          isOut,
          isCritical,
        };
      })
      .filter((item) => item.isCritical)
      .sort((a, b) => {
        if (a.isOut && !b.isOut) return -1;
        if (!a.isOut && b.isOut) return 1;
        return a.stok - b.stok;
      });
  }, [produk, effectiveOutletFilter, getProdukStokForOutlet, hasStokRecordForOutlet]);

  const outOfStockCount = useMemo(() => {
    return criticalStockItems.filter((i) => i.isOut).length;
  }, [criticalStockItems]);

  // Overall Stock Summary
  const stockSummary = useMemo(() => {
    let totalItems = 0;
    let totalNilaiAset = 0;
    let lowStockCount = 0;

    for (const p of produk) {
      if (!p.aktif) continue;
      if (!hasStokRecordForOutlet(p.id, effectiveOutletFilter)) continue;
      const s = getProdukStokForOutlet(p.id, effectiveOutletFilter);
      const h = getProdukHPPForOutlet(p.id, effectiveOutletFilter);
      totalItems += s;
      totalNilaiAset += s * h;
      if (s <= (p.stokMin ?? 5)) lowStockCount += 1;
    }

    return { totalItems, totalNilaiAset, lowStockCount };
  }, [produk, effectiveOutletFilter, getProdukStokForOutlet, getProdukHPPForOutlet, hasStokRecordForOutlet]);

  // Quick Restock Handler: pre-fills the purchase form and jumps straight to it
  const handleQuickRestock = (productId: string) => {
    setPembelianProdukId(productId);
    setPembelianQty(10);
    const prod = produk.find((p) => p.id === productId);
    if (prod) {
      const hpp = getProdukHPPForOutlet(prod.id, selectedOutletFilter);
      setPembelianHargaSatuan(hpp > 0 ? hpp : Math.round(prod.hargaRetail * 0.75));
    }
    setActiveTab('masuk');
  };

  // Quick Min Stock Modal Handlers
  const handleOpenMinStockModal = (item: {
    id: string;
    nama: string;
    kode: string;
    satuan: string;
    minLimit: number;
    stok: number;
  }) => {
    setEditingMinStock({
      id: item.id,
      nama: item.nama,
      kode: item.kode,
      satuan: item.satuan,
      minLimit: item.minLimit,
      stokSaatIni: item.stok,
    });
    setNewMinStockVal(item.minLimit);
  };

  const handleSaveMinStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMinStock) return;
    updateProduk(editingMinStock.id, { stokMin: Math.max(0, newMinStockVal) });
    setEditingMinStock(null);
  };

  // Handle Submit Transfer Mutasi
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiTujuan || mutasiTujuan === mutasiAsal) {
      showBanner('error', 'Pilih outlet tujuan yang berbeda dengan outlet asal!');
      return;
    }
    if (!mutasiProdukId) {
      showBanner('error', 'Pilih produk yang akan dimutasi!');
      return;
    }
    const currentStock = getProdukStokForOutlet(mutasiProdukId, mutasiAsal);
    if (currentStock < mutasiQty) {
      showBanner('error', `Stok outlet asal tidak mencukupi! Tersedia: ${currentStock}`);
      return;
    }

    const res = createMutasiStok({
      outletAsalId: mutasiAsal,
      outletTujuanId: mutasiTujuan,
      items: [{ produkId: mutasiProdukId, qty: mutasiQty }],
      catatan: mutasiCatatan,
      biayaKirim: mutasiBiayaKirim,
    });

    if (res.success) {
      showBanner('success', 'Transfer mutasi stok antar-outlet berhasil dieksekusi!');
      setMutasiQty(1);
      setMutasiCatatan('');
      setMutasiBiayaKirim(0);
      setActiveTab('mutasi');
    } else {
      showBanner('error', res.error || 'Gagal memproses mutasi stok');
    }
  };

  // Handle Submit Stock Opname
  const handleOpnameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameProdukId) {
      showBanner('error', 'Pilih produk untuk opname');
      return;
    }
    const currentSysStock = getProdukStokForOutlet(opnameProdukId, activeOutlet.id);
    const selisih = opnameFisik - currentSysStock;

    const res = processStockOpname({
      outletId: effectiveOutletFilter,
      items: [
        {
          produkId: opnameProdukId,
          stokSistem: currentSysStock,
          stokFisik: opnameFisik,
          selisih,
          catatan: opnameCatatan,
        },
      ],
      catatan: opnameCatatan,
    });

    if (res.success) {
      showBanner(
        'success',
        `Stock opname berhasil dicatat! Selisih: ${selisih > 0 ? '+' : ''}${selisih}. Stok fisik telah disesuaikan.`
      );
      setOpnameCatatan('');
      setActiveTab('daftar');
    } else {
      showBanner('error', res.error || 'Gagal menyimpan opname');
    }
  };

  // Handle Submit Barang Masuk (Pembelian Supplier)
  const handlePembelianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pembelianSupplierId || !pembelianProdukId) {
      showBanner('error', 'Pilih supplier dan produk terlebih dahulu');
      return;
    }
    if (pembelianQty <= 0 || pembelianHargaSatuan <= 0) {
      showBanner('error', 'Jumlah dan harga beli harus lebih dari 0');
      return;
    }

    const subtotal = pembelianQty * pembelianHargaSatuan;
    const isCredit = pembelianMetode === 'KREDIT';

    const res = recordPembelian({
      supplierId: pembelianSupplierId,
      outletId: activeOutlet.id,
      items: [
        {
          produkId: pembelianProdukId,
          qty: pembelianQty,
          hargaBeli: pembelianHargaSatuan,
          subtotal,
        },
      ],
      total: subtotal,
      metodeBayar: isCredit ? 'KREDIT' : 'TUNAI',
      totalDibayar: isCredit ? 0 : subtotal,
      sisaHutang: isCredit ? subtotal : 0,
      jatuhTempo: isCredit ? pembelianJatuhTempo || null : null,
      catatan: 'Penerimaan stok supplier',
    });

    if (res.success) {
      showBanner(
        'success',
        `Stok masuk berhasil dicatat! HPP moving average otomatis diperbarui untuk produk ini.`
      );
      setPembelianQty(1);
      setPembelianHargaSatuan(0);
      setActiveTab('daftar');
    } else {
      showBanner('error', res.error || 'Gagal menyimpan stok masuk');
    }
  };

  // Product Select Options for SearchableSelect
  const productSelectOptions: SelectOption[] = useMemo(() => {
    return produk
      .filter((p) => p.aktif)
      .map((p) => ({
        value: p.id,
        label: p.nama,
        subtitle: `SKU: ${p.kode} · Satuan: ${p.satuan}`,
        badge: p.jenis,
      }));
  }, [produk]);

  if (!isUserAssigned) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
            Akses Stok Dibatasi: Belum Ditugaskan ke Cabang
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
            Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan. Kasir dan Manager hanya dapat melihat dan mengelola stok di outlet yang ditugaskan kepada mereka.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
            Silakan hubungi Owner untuk menetapkan cabang outlet Anda.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Outlet Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-600" />
            <span>Manajemen Stok Multi-Outlet & Mutasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Monitoring stok riil, kartu stok audit, transfer antar cabang, dan penyesuaian opname
          </p>
        </div>

        {/* Outlet Switcher & Supplier Action */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === Role.OWNER ? (
            <div className="flex items-center gap-1.5 min-w-[220px]">
              <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
              <SearchableSelect
                id="stok-outlet"
                options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
                value={selectedOutletFilter}
                onChange={setSelectedOutletFilter}
                placeholder="Pilih outlet"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Outlet: {activeOutlet.nama}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('masuk')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Buka form order pembelian stok ke pabrik / supplier"
          >
            <Truck className="w-4 h-4" />
            <span>Beli ke Supplier</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300'
          }`}
        >
          {banner.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{banner.msg}</span>
        </div>
      )}

      {/* PROMINENT RESTOCK NOTIFICATION BANNER */}
      {criticalStockItems.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500 dark:border-rose-600 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-rose-800 dark:text-rose-300">
                    PERINGATAN RESTOCK SEGERA: STOK MENCAPAI TITIK MINIMUM!
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs">
                    {criticalStockItems.length} Produk Kritis
                  </span>
                  {outOfStockCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-700 text-white animate-bounce shadow-2xs">
                      {outOfStockCount} Stok Habis
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-1">
                  Jumlah barang di bawah ini telah menyentuh batas minimum. Kasir dan staf inventaris disarankan segera melakukan restock (order pembelian atau mutasi antar-cabang) agar transaksi kasir tidak terhenti.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowLowStockOnly(!showLowStockOnly);
                  setActiveTab('daftar');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-stone-800 shadow-2xs transition-colors cursor-pointer"
              >
                {showLowStockOnly ? 'Tampilkan Semua Barang' : `Lihat ${criticalStockItems.length} Barang Kritis`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (criticalStockItems.length > 0) {
                    handleQuickRestock(criticalStockItems[0].id);
                  } else {
                    setActiveTab('masuk');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Restock Sekarang</span>
              </button>
            </div>
          </div>

          {/* Quick Critical Items Pill Carousel / Badges */}
          <div className="mt-3.5 pt-3 border-t border-rose-200/80 dark:border-rose-900/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
              Perlu Restock:
            </span>
            {criticalStockItems.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs border transition-transform hover:scale-102 ${
                  item.isOut
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-900 dark:text-rose-200 font-bold'
                    : 'bg-amber-100/70 dark:bg-amber-950/60 border-amber-300 text-amber-900 dark:text-amber-200 font-medium'
                }`}
              >
                <span className="max-w-[130px] sm:max-w-none truncate">{item.nama}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                    item.isOut
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {item.isOut ? 'HABIS' : `Sisa ${item.stok} / Min ${item.minLimit}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickRestock(item.id)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 hover:bg-amber-500 hover:text-white text-stone-700 dark:text-stone-300 font-bold transition-colors cursor-pointer shrink-0"
                  title={`Restock ${item.nama}`}
                >
                  Restock ⚡
                </button>
              </div>
            ))}
            {criticalStockItems.length > 8 && (
              <button
                type="button"
                onClick={() => {
                  setShowLowStockOnly(true);
                  setActiveTab('daftar');
                }}
                className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
              >
                +{criticalStockItems.length - 8} produk lainnya...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Total Unit Fisik Tersedia
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {formatNumber(stockSummary.totalItems)} unit
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Gabungan semua kategori produk aktif</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Total Nilai Aset Persediaan (HPP)
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(stockSummary.totalNilaiAset)}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">Berdasarkan HPP moving average</div>
        </div>

        {/* Highlighted Warning Card */}
        <div
          onClick={() => {
            setShowLowStockOnly(!showLowStockOnly);
            setActiveTab('daftar');
          }}
          className={`p-4 rounded-2xl shadow-2xs transition-all cursor-pointer ${
            stockSummary.lowStockCount > 0
              ? 'border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-950/60'
              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800'
          }`}
          title="Klik untuk filter hanya produk yang butuh restock"
        >
          <div className="flex items-center justify-between">
            <div
              className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                stockSummary.lowStockCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {stockSummary.lowStockCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              )}
              <span>{stockSummary.lowStockCount > 0 ? 'Peringatan Stok Kritis (Restock)' : 'Status Stok Aman'}</span>
            </div>
            {stockSummary.lowStockCount > 0 && (
              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-black bg-rose-600 text-white uppercase shadow-2xs">
                Perlu Restock
              </span>
            )}
          </div>

          <div
            className={`text-xl sm:text-2xl font-black mt-1 ${
              stockSummary.lowStockCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            {stockSummary.lowStockCount} Produk
          </div>
          <div
            className={`text-[10px] mt-0.5 font-medium ${
              stockSummary.lowStockCount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-stone-400'
            }`}
          >
            {stockSummary.lowStockCount > 0
              ? 'Klik di sini untuk filter daftar produk kritis'
              : 'Semua produk di atas batas stok minimum'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 overflow-x-auto pb-1">
        {[
          { id: 'daftar', label: 'Daftar Stok & HPP', icon: Boxes },
          { id: 'masuk', label: 'Beli ke Supplier (Restock)', icon: Truck },
          { id: 'mutasi', label: 'Transfer Antar-Outlet', icon: ArrowRightLeft },
          { id: 'opname', label: 'Penyesuaian (Opname)', icon: ClipboardList },
          { id: 'ledger', label: 'Kartu Stok Audit (Ledger)', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DAFTAR STOK */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari produk berdasarkan nama atau SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-stone-100"
              />
            </div>

            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                showLowStockOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-400'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Hanya Stok Menipis ({stockSummary.lowStockCount})</span>
            </button>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Kode</th>
                    <th className="py-3 px-3.5 font-bold">Nama Produk</th>
                    <th className="py-3 px-3.5 font-bold">Jenis</th>
                    <th className="py-3 px-3.5 font-bold text-center">Satuan</th>
                    <th className="py-3 px-3.5 font-bold text-right">Stok Riil</th>
                    <th className="py-3 px-3.5 font-bold text-right">Titik Min</th>
                    <th className="py-3 px-3.5 font-bold text-center">Status Stok</th>
                    <th className="py-3 px-3.5 font-bold text-right">HPP Rata-Rata ⭐</th>
                    <th className="py-3 px-3.5 font-bold text-right">Harga Jual</th>
                    <th className="py-3 px-3.5 font-bold text-right">Total Nilai HPP</th>
                    <th className="py-3 px-3.5 font-bold text-center">Aksi Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {stockList.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.isOut
                          ? 'bg-rose-100/70 dark:bg-rose-950/40 border-l-4 border-l-rose-600'
                          : item.isLow
                          ? 'bg-amber-100/50 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono text-stone-400">{item.kode}</td>
                      <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.nama}</span>
                          {item.isOut ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-black animate-pulse shadow-2xs">
                              HABIS
                            </span>
                          ) : item.isLow ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-black shadow-2xs">
                              KRITIS (MIN {item.minLimit})
                            </span>
                          ) : !item.hasRecord ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold">
                              Belum dicatat
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {item.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center text-stone-500">{item.satuan}</td>
                      <td className="py-3 px-3.5 text-right">
                        <span
                          className={`font-black text-sm ${
                            item.isOut
                              ? 'text-rose-600'
                              : item.isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {item.hasRecord ? formatNumber(item.stok) : '—'}
                        </span>
                        {item.isOut && (
                          <div className="text-[9.5px] font-extrabold text-rose-600 uppercase leading-none mt-0.5">
                            Habis!
                          </div>
                        )}
                        {item.isLow && !item.isOut && (
                          <div className="text-[9.5px] font-bold text-amber-600 leading-none mt-0.5">
                            Menipis
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => handleOpenMinStockModal(item)}
                          className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-all cursor-pointer text-stone-700 dark:text-stone-300 font-bold border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-400"
                          title="Klik untuk ubah batas stok minimum produk ini"
                        >
                          <span>{item.minLimit}</span>
                          <Sliders className="w-3 h-3 text-stone-400 group-hover:text-amber-500" />
                        </button>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {item.isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            SEGERA RESTOCK
                          </span>
                        ) : item.isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                            <AlertTriangle className="w-3 h-3" />
                            STOK KRITIS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            AMAN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-stone-700 dark:text-stone-300">
                        {formatRupiah(item.hpp)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {formatRupiah(item.hargaRetail)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-stone-600 dark:text-stone-400">
                        {formatRupiah(item.totalNilai)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(item.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                            item.isOut
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : item.isLow
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                          title={`Restock barang ${item.nama}`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MUTASI ANTAR-OUTLET */}
      {activeTab === 'mutasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-6 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Formulir Transfer Stok Antar-Cabang</span>
            </h2>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mutasi-asal-select" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Outlet Asal (Pengirim)
                  </label>
                  <SearchableSelect
                    id="mutasi-asal-select"
                    options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
                    value={mutasiAsal}
                    onChange={setMutasiAsal}
                    placeholder="Outlet asal"
                  />
                </div>

                <div>
                  <label htmlFor="mutasi-tujuan-select" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Outlet Tujuan (Penerima)
                  </label>
                  <SearchableSelect
                    id="mutasi-tujuan-select"
                    options={outlets
                      .filter((o) => o.id !== mutasiAsal)
                      .map((o) => ({ value: o.id, label: o.nama }))}
                    value={mutasiTujuan}
                    onChange={setMutasiTujuan}
                    placeholder="Pilih tujuan"
                  />
                </div>
              </div>

              <SearchableSelect
                id="mutasi-produk"
                label="Pilih Produk yang Ditransfer"
                options={productSelectOptions}
                value={mutasiProdukId}
                onChange={setMutasiProdukId}
                placeholder="Pilih produk..."
                required
              />

              {mutasiProdukId && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex justify-between">
                  <span>Stok Tersedia di Outlet Asal:</span>
                  <span className="font-bold">{getProdukStokForOutlet(mutasiProdukId, mutasiAsal)} unit</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Jumlah Unit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mutasiQty}
                    onChange={(e) => setMutasiQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Biaya Kirim / Kurir (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={mutasiBiayaKirim || ''}
                    onChange={(e) => setMutasiBiayaKirim(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Catatan Pengiriman / Supir
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dibawa Pak Joko naik motor..."
                  value={mutasiCatatan}
                  onChange={(e) => setMutasiCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs cursor-pointer"
              >
                Kirim & Kurangi Stok Asal
              </button>
            </form>
          </div>

          {/* Transfer History */}
          <div className="lg:col-span-6 bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Riwayat Mutasi Antar-Cabang</span>
            </h2>

            {mutasiList.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">Belum ada riwayat mutasi.</div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {mutasiList.map((m: MutasiStok) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">{m.nomor}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                        {m.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
                      <span>{m.outletAsalNama}</span>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                      <span>{m.outletTujuanNama}</span>
                    </div>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      Barang:{' '}
                      {m.items.map((i: any) => `${i.namaProduk} (${i.qty} unit)`).join(', ')}
                    </div>

                    <div className="text-[10px] text-stone-400 flex justify-between pt-1 border-t border-stone-200 dark:border-stone-700">
                      <span>{formatWIBDateTime(m.createdAt)}</span>
                      <span>Petugas: {m.userNama}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK OPNAME */}
      {activeTab === 'opname' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-600" />
            <span>Penyesuaian Stok Fisik (Stock Opname)</span>
          </h2>
          <p className="text-xs text-stone-500">
            Outlet aktif: <strong>{activeOutlet.nama}</strong>. Jika fisik berbeda dengan sistem, selisih akan otomatis tercatat ke kartu stok dan jurnal nilai persediaan.
          </p>

          <form onSubmit={handleOpnameSubmit} className="space-y-4">
            <SearchableSelect
              id="opname-produk"
              label="Pilih Produk yang Dihitung Fisik"
              options={productSelectOptions}
              value={opnameProdukId}
              onChange={(val) => {
                setOpnameProdukId(val);
                setOpnameFisik(getProdukStokForOutlet(val, activeOutlet.id));
              }}
              placeholder="Pilih produk..."
              required
            />

            {opnameProdukId && (
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Stok Sistem Saat Ini:</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {getProdukStokForOutlet(opnameProdukId, activeOutlet.id)} unit
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">HPP Unit:</span>
                  <span className="font-bold text-amber-600">
                    {formatRupiah(getProdukHPPForOutlet(opnameProdukId, activeOutlet.id))}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Hitungan Fisik Nyata di Toko (Unit)
              </label>
              <input
                type="number"
                min="0"
                value={opnameFisik}
                onChange={(e) => setOpnameFisik(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
                required
              />
            </div>

            {opnameProdukId && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex justify-between ${
                  opnameFisik - getProdukStokForOutlet(opnameProdukId, activeOutlet.id) === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <span>Selisih Stok Fisik vs Sistem:</span>
                <span>
                  {opnameFisik - getProdukStokForOutlet(opnameProdukId, activeOutlet.id) > 0 ? '+' : ''}
                  {opnameFisik - getProdukStokForOutlet(opnameProdukId, activeOutlet.id)} unit
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Alasan / Catatan Penyesuaian
              </label>
              <input
                type="text"
                placeholder="e.g. Rusak terkena air hujan, hilang, bonus supplier..."
                value={opnameCatatan}
                onChange={(e) => setOpnameCatatan(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs cursor-pointer"
            >
              Simpan Penyesuaian Fisik (Opname)
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: TAMBAH STOK BARANG MASUK (PEMBELIAN SUPPLIER) */}
      {activeTab === 'masuk' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            <span>Beli Produk ke Supplier (Penerimaan Stok Masuk)</span>
          </h2>
          <p className="text-xs text-stone-500">
            Catat barang masuk dari supplier pabrik secara tunai atau tempo (hutang). HPP rata-rata bergerak (moving average) akan otomatis dihitung ulang.
          </p>

          <form onSubmit={handlePembelianSubmit} className="space-y-4">
            <SearchableSelect
              id="pembelian-supplier"
              label="Pilih Supplier"
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.nama,
                subtitle: s.telepon,
              }))}
              value={pembelianSupplierId}
              onChange={setPembelianSupplierId}
              placeholder="Pilih supplier..."
              required
            />

            <SearchableSelect
              id="pembelian-produk"
              label="Pilih Produk yang Masuk"
              options={productSelectOptions}
              value={pembelianProdukId}
              onChange={(pId) => {
                setPembelianProdukId(pId);
                const currentHpp = getProdukHPPForOutlet(pId, activeOutlet.id);
                setPembelianHargaSatuan(currentHpp || 0);
              }}
              placeholder="Pilih produk..."
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Jumlah Masuk (Unit)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pembelianQty}
                  onChange={(e) => setPembelianQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Harga Beli per Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  value={pembelianHargaSatuan || ''}
                  onChange={(e) => setPembelianHargaSatuan(parseInt(e.target.value, 10) || 0)}
                  placeholder="Rp..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Metode Pembayaran ke Supplier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['TUNAI', 'KREDIT'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPembelianMetode(m as any)}
                      className={`py-2 rounded-xl border text-xs font-bold ${
                        pembelianMetode === m
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {pembelianMetode === 'KREDIT' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Jatuh Tempo Hutang
                  </label>
                  <input
                    type="date"
                    value={pembelianJatuhTempo}
                    onChange={(e) => setPembelianJatuhTempo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    required
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex justify-between items-center text-xs">
              <span className="text-stone-700 dark:text-stone-300 font-bold">Total Pembelian:</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {formatRupiah(pembelianQty * (pembelianHargaSatuan || 0))}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
            >
              Simpan Stok Masuk & Update HPP
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: KARTU STOK AUDIT (LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Kartu Stok Audit (Stok Ledger)</span>
            </h2>
            <span className="text-xs text-stone-400">Pencatatan mutasi masuk & keluar per waktu</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Aktivitas (Tipe)</th>
                  <th className="py-2.5 px-3 text-right">Masuk / Keluar</th>
                  <th className="py-2.5 px-3 text-right">Stok Akhir</th>
                  <th className="py-2.5 px-3">No. Referensi</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {stokLedger
                  .filter((l: any) => l.outletId === selectedOutletFilter)
                  .map((l: any) => (
                    <tr key={l.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                      <td className="py-2.5 px-3 whitespace-nowrap text-stone-500">
                        {formatWIBDateTime(l.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-900 dark:text-stone-100">
                        {l.namaProduk}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {l.tipe}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          l.perubahan > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {l.perubahan > 0 ? `+${l.perubahan}` : l.perubahan}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-stone-900 dark:text-stone-100">
                        {l.stokAkhir}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-400">{l.referensiId || '-'}</td>
                      <td className="py-2.5 px-3 text-stone-500 max-w-xs truncate">{l.keterangan || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK MODAL: ATUR STOK MINIMUM */}
      {editingMinStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-stone-100">
                    Atur Stok Minimum (Alert)
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    {editingMinStock.kode} · {editingMinStock.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMinStock(null)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMinStock} className="p-4 sm:p-5 space-y-4">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-400">Stok Riil Cabang Saat Ini:</span>
                <span className="font-black text-stone-900 dark:text-stone-100 text-sm">
                  {editingMinStock.stokSaatIni} {editingMinStock.satuan}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  Batas Titik Minimum ({editingMinStock.satuan})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newMinStockVal}
                    onChange={(e) => setNewMinStockVal(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm font-black text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 uppercase">
                    {editingMinStock.satuan}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 leading-relaxed">
                  Jika stok fisik menyentuh atau berada di bawah angka ini, sistem otomatis memicu banner restock darurat, highlight merah/kuning, serta badge peringatan pada kasir & menu navigasi.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingMinStock(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all cursor-pointer"
                >
                  Simpan Batas Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
