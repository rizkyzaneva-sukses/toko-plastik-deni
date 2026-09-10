import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRightLeft,
  AlertCircle,
  Clock,
  UserCheck,
  CheckCircle2,
  Lock,
  Tag,
  HelpCircle,
  Printer,
  ChevronRight,
  ChevronLeft,
  X,
  Percent,
  Receipt,
  Check,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Produk,
  MetodeBayar,
  Pelanggan,
  Transaksi,
  Role,
} from '../types';
import {
  formatRupiah,
  formatWIBDate,
  generateSmartCashSuggestions,
  calculateChangeDenominations,
  formatThousands,
  parseThousands,
  terbilangRupiah,
  addDaysWIB,
} from '../utils/formatters';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ShiftModal } from './ShiftModal';
import { UnassignedLock } from './UnassignedLock';

interface CartItem {
  produk: Produk;
  qty: number;
}

interface CashierViewProps {
  onNavigateToTransaksi?: () => void;
}

export const CashierView: React.FC<CashierViewProps> = ({ onNavigateToTransaksi }) => {
  const {
    produk,
    pelanggan,
    kategori,
    getProdukStokForOutlet,
    createTransaksi,
    activeShift,
    activeOutlet,
    currentUser,
    transaksiList,
    isUserAssigned,
  } = useApp();

  // Mobile View Mode: 'katalog' or 'keranjang'
  const [mobileTab, setMobileTab] = useState<'katalog' | 'keranjang'>('katalog');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart & Search State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKat, setSelectedKat] = useState<string>('all');
  const [selectedPelangganId, setSelectedPelangganId] = useState<string>('pel-umum');

  // Quantity Dialog Sheet for adding product with custom qty
  const [qtyModalProduct, setQtyModalProduct] = useState<Produk | null>(null);
  const [modalQty, setModalQty] = useState<number>(1);

  // Payment State (Visible directly in Cart & Checkout view)
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>(MetodeBayar.TUNAI);
  const [uangDiterima, setUangDiterima] = useState<number>(0);
  const [diskonManual, setDiskonManual] = useState<number>(0);
  const [alasanDiskon, setAlasanDiskon] = useState<string>('');
  const [jatuhTempoKredit, setJatuhTempoKredit] = useState<string>('');
  const [metodeDp, setMetodeDp] = useState<MetodeBayar>(MetodeBayar.TUNAI);

  // Result thermal receipt modal state
  const [completedTx, setCompletedTx] = useState<Transaksi | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Switch to catalog view and autofocus search box
  const handleSwitchToSearch = () => {
    setMobileTab('katalog');
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  // Selected customer info
  const selectedPelanggan = useMemo(() => {
    return pelanggan.find((p) => p.id === selectedPelangganId);
  }, [pelanggan, selectedPelangganId]);

  // Outstanding receivables of selected customer
  const customerReceivablesInfo = useMemo(() => {
    if (!selectedPelanggan || selectedPelanggan.id === 'pel-umum') return null;

    const unpaidInvoices = transaksiList.filter(
      (t) => t.pelangganId === selectedPelanggan.id && !t.voided && t.sisaPiutang > 0
    );

    const totalPiutang = unpaidInvoices.reduce((sum, t) => sum + t.sisaPiutang, 0);
    const nowTime = Date.now();
    const overdueInvoices = unpaidInvoices.filter((t) => {
      if (!t.jatuhTempo) return false;
      return new Date(t.jatuhTempo).getTime() < nowTime;
    });

    const oldestOverdue = overdueInvoices.sort(
      (a, b) => new Date(a.jatuhTempo!).getTime() - new Date(b.jatuhTempo!).getTime()
    )[0];

    const isExceedingLimit =
      selectedPelanggan.limitKredit !== null && totalPiutang > selectedPelanggan.limitKredit;

    return {
      totalPiutang,
      invoiceCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      oldestOverdueDate: oldestOverdue ? oldestOverdue.jatuhTempo : null,
      isExceedingLimit,
      limitKredit: selectedPelanggan.limitKredit,
    };
  }, [selectedPelanggan, transaksiList]);

  // Set default due date when customer changes
  const handleSelectCustomer = (pId: string) => {
    setSelectedPelangganId(pId);
    const p = pelanggan.find((x) => x.id === pId);
    if (p && p.defaultTempoHari > 0) {
      setJatuhTempoKredit(addDaysWIB(p.defaultTempoHari));
    } else {
      setJatuhTempoKredit(addDaysWIB(14));
    }
  };

  // Filtered products (only active and with valid retail price, as per PRD)
  const filteredProducts = useMemo(() => {
    return produk
      .filter((p) => p.aktif && p.hargaRetail > 0)
      .filter((p) => {
        if (selectedKat !== 'all' && p.kategoriId !== selectedKat) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          p.nama.toLowerCase().includes(term) ||
          p.kode.toLowerCase().includes(term) ||
          p.satuan.toLowerCase().includes(term)
        );
      });
  }, [produk, selectedKat, searchTerm]);

  // Favorite / quick items
  const favoriteProducts = useMemo(() => {
    return produk.filter((p) => p.favorit && p.aktif && p.hargaRetail > 0).slice(0, 8);
  }, [produk]);

  // Open modal to select Qty before adding to cart
  const handleOpenQtyModal = (p: Produk) => {
    const stock = getProdukStokForOutlet(p.id, activeOutlet.id);
    if (stock <= 0) {
      setErrorBanner(`Stok ${p.nama} kosong di outlet ${activeOutlet.nama}!`);
      setTimeout(() => setErrorBanner(''), 3000);
      return;
    }
    const existing = cart.find((item) => item.produk.id === p.id);
    setQtyModalProduct(p);
    setModalQty(existing ? existing.qty : 1);
  };

  // Confirm addition with explicit quantity from modal
  const handleConfirmAddModal = () => {
    if (!qtyModalProduct) return;
    const p = qtyModalProduct;
    const currentStock = getProdukStokForOutlet(p.id, activeOutlet.id);

    if (modalQty <= 0) {
      removeFromCart(p.id);
      setQtyModalProduct(null);
      return;
    }

    if (modalQty > currentStock) {
      setErrorBanner(`Stok tidak mencukupi! Tersedia: ${currentStock} ${p.satuan}`);
      setTimeout(() => setErrorBanner(''), 3500);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.produk.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: modalQty };
        return next;
      }
      return [{ produk: p, qty: modalQty }, ...prev];
    });

    showToast(`✓ ${modalQty} ${p.satuan} ${p.nama} masuk keranjang`);
    setQtyModalProduct(null);
  };

  // Quick 1-tap add (increments by 1)
  const quickAddToCart = (p: Produk, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentStock = getProdukStokForOutlet(p.id, activeOutlet.id);
    const existing = cart.find((item) => item.produk.id === p.id);
    const currentQtyInCart = existing ? existing.qty : 0;

    if (currentQtyInCart + 1 > currentStock) {
      setErrorBanner(`Stok ${p.nama} tidak mencukupi! (Sisa: ${currentStock})`);
      setTimeout(() => setErrorBanner(''), 3500);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.produk.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [{ produk: p, qty: 1 }, ...prev];
    });
    showToast(`✓ +1 ${p.nama}`);
  };

  const updateQty = (produkId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(produkId);
      return;
    }
    const currentStock = getProdukStokForOutlet(produkId, activeOutlet.id);
    if (newQty > currentStock) {
      setErrorBanner(`Stok maksimal tersedia: ${currentStock}`);
      setTimeout(() => setErrorBanner(''), 3000);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.produk.id === produkId ? { ...item, qty: newQty } : item))
    );
  };

  const removeFromCart = (produkId: string) => {
    setCart((prev) => prev.filter((item) => item.produk.id !== produkId));
  };

  const clearCart = () => {
    setCart([]);
    setDiskonManual(0);
    setAlasanDiskon('');
  };

  // Cart Totals Calculation
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalNormalRetail = 0;
    let totalHematGrosir = 0;
    let itemCount = 0;

    const analyzedItems = cart.map((item) => {
      const p = item.produk;
      const isWholesale = p.minGrosir !== null && p.hargaGrosir !== null && item.qty >= p.minGrosir;
      const activePrice = isWholesale ? (p.hargaGrosir as number) : p.hargaRetail;
      const itemSubtotal = activePrice * item.qty;

      const normalItemSubtotal = p.hargaRetail * item.qty;
      const hemat = isWholesale ? normalItemSubtotal - itemSubtotal : 0;

      subtotal += itemSubtotal;
      totalNormalRetail += normalItemSubtotal;
      totalHematGrosir += hemat;
      itemCount += item.qty;

      // Hint for next wholesale tier
      let wholesaleHint: string | null = null;
      if (!isWholesale && p.minGrosir !== null && p.hargaGrosir !== null) {
        const diff = p.minGrosir - item.qty;
        if (diff > 0 && diff <= 5) {
          const potHemat = (p.hargaRetail - p.hargaGrosir) * p.minGrosir;
          wholesaleHint = `+${diff} lagi → Harga Grosir ${formatRupiah(p.hargaGrosir)} (hemat ${formatRupiah(potHemat)})`;
        }
      }

      return {
        ...item,
        isWholesale,
        activePrice,
        itemSubtotal,
        wholesaleHint,
      };
    });

    const finalTotal = Math.max(0, subtotal - diskonManual);

    return {
      analyzedItems,
      subtotal,
      totalNormalRetail,
      totalHematGrosir,
      diskonManual,
      finalTotal,
      itemCount,
    };
  }, [cart, diskonManual]);

  // Keep default cash received synchronized with final total unless manually modified
  React.useEffect(() => {
    if (metodeBayar === MetodeBayar.TUNAI) {
      setUangDiterima(cartSummary.finalTotal);
    }
  }, [cartSummary.finalTotal, metodeBayar]);

  // Smart suggestions for cash payment
  const smartCashButtons = useMemo(() => {
    return generateSmartCashSuggestions(cartSummary.finalTotal);
  }, [cartSummary.finalTotal]);

  // Live change calculation
  const kembalian = useMemo(() => {
    if (metodeBayar !== MetodeBayar.TUNAI) return 0;
    return Math.max(0, uangDiterima - cartSummary.finalTotal);
  }, [uangDiterima, cartSummary.finalTotal, metodeBayar]);

  const changeDenominations = useMemo(() => {
    if (kembalian <= 0) return [];
    return calculateChangeDenominations(kembalian);
  }, [kembalian]);

  const isUangKurang =
    metodeBayar === MetodeBayar.TUNAI && uangDiterima < cartSummary.finalTotal;

  // Process Checkout & Finalize Transaction
  const handleConfirmCheckout = () => {
    if (!activeShift) {
      setIsShiftModalOpen(true);
      return;
    }

    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong!');
      return;
    }

    if (
      (metodeBayar === MetodeBayar.KREDIT || metodeBayar === MetodeBayar.CAMPURAN) &&
      (!selectedPelangganId || selectedPelangganId === 'pel-umum')
    ) {
      alert('Untuk pembayaran KREDIT/TEMPO, WAJIB memilih data Pelanggan B2B langganan!');
      return;
    }

    if (metodeBayar === MetodeBayar.CAMPURAN && uangDiterima <= 0) {
      alert('Metode CAMPURAN wajib isi DP lebih dari Rp 0.');
      return;
    }

    if (isUangKurang) {
      alert('Uang yang diterima masih kurang dari total tagihan!');
      return;
    }

    const plannedSisa =
      metodeBayar === MetodeBayar.KREDIT || metodeBayar === MetodeBayar.CAMPURAN
        ? Math.max(0, cartSummary.finalTotal - (uangDiterima || 0))
        : 0;
    const nextPiutang = (customerReceivablesInfo?.totalPiutang || 0) + plannedSisa;
    const limit = selectedPelanggan?.limitKredit ?? null;
    if (limit !== null && plannedSisa > 0 && nextPiutang > limit) {
      if (currentUser.role !== Role.OWNER) {
        alert(`Limit kredit (${formatRupiah(limit)}) terlampaui. Transaksi tempo ditolak.`);
        return;
      }
      if (!window.confirm('Limit kredit terlampaui. Lanjutkan sebagai Owner?')) return;
    }

    const payload = {
      pelangganId: selectedPelangganId === 'pel-umum' ? null : selectedPelangganId,
      items: cart.map((c) => ({ produkId: c.produk.id, qty: c.qty })),
      diskon: diskonManual,
      metodeBayar,
      uangDiterima,
      jatuhTempo: metodeBayar === MetodeBayar.KREDIT || metodeBayar === MetodeBayar.CAMPURAN ? jatuhTempoKredit : null,
      alasanDiskon,
      metodeDp,
    };

    const res = createTransaksi(payload);
    if (!res.success || !res.transaksi) {
      alert(res.error || 'Gagal menyimpan transaksi');
      return;
    }

    // Success! Show thermal receipt modal & reset cart
    setCompletedTx(res.transaksi);
    setCart([]);
    setDiskonManual(0);
    setAlasanDiskon('');
    setSelectedPelangganId('pel-umum');
    setMobileTab('katalog');
  };

  // Pelanggan Options for SearchableSelect
  const pelangganOptions: SelectOption[] = useMemo(() => {
    return pelanggan
      .filter((p) => p.aktif)
      .map((p) => {
        const isB2B = p.id !== 'pel-umum';
        return {
          value: p.id,
          label: p.nama,
          subtitle: isB2B ? `${p.telepon} · Tempo ${p.defaultTempoHari} hr` : 'Penjualan Umum / Eceran',
          badge: isB2B ? 'B2B KREDIT' : 'UMUM',
          badgeColor: isB2B
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400',
        };
      });
  }, [pelanggan]);

  if (!isUserAssigned) {
    return <UnassignedLock />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-65px)] bg-stone-100 dark:bg-stone-950 pb-24 xl:pb-0 relative">
      {/* SHIFT WARNING BANNER */}
      {!activeShift && (
        <div className="bg-rose-500 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md z-30">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Shift kasir belum dibuka! Buka shift dengan input modal awal laci kasir untuk mulai berjualan.</span>
          </div>
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className="px-3 py-1 bg-white text-rose-600 rounded-lg font-bold text-xs hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
          >
            Buka Shift
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorBanner && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-bounce">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* QUICK TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold transition-all">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MOBILE SEGMENTED CONTROL TABS (Only visible on small/mobile screens) */}
      <div className="lg:hidden sticky top-14 z-30 bg-white dark:bg-stone-900 p-2 border-b border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab('katalog')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'katalog'
                ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Katalog Produk ({filteredProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('keranjang')}
            className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
              mobileTab === 'keranjang'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-amber-600'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang & Bayar</span>
            {cart.length > 0 && (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  mobileTab === 'keranjang'
                    ? 'bg-white text-amber-600'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {cartSummary.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          LEFT SECTION: PRODUCT CATALOG & QUICK PICKS
          (Hidden on mobile when reviewing cart)
          ======================================================== */}
      <div
        className={`flex-1 flex flex-col p-3 sm:p-4 md:p-5 overflow-y-auto space-y-4 ${
          mobileTab === 'keranjang' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Pinned / Sticky Search & Filter Bar (Never disappears on scroll) */}
        <div className="sticky top-0 z-20 bg-stone-100/95 dark:bg-stone-950/95 backdrop-blur-md pt-1 pb-3 space-y-2 border-b border-stone-200/80 dark:border-stone-800/80 shadow-2xs">
          {/* Outlet Info & Quick Link to Data Transaksi */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 min-w-0">
              <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                {activeOutlet.nama.replace('Toko Plastik ', '')}
              </span>
              <span>·</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {filteredProducts.length} Produk
              </span>
            </div>

            {onNavigateToTransaksi && (
              <button
                type="button"
                onClick={onNavigateToTransaksi}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                title="Buka Data & Riwayat Transaksi"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Data Transaksi</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Ketik nama barang, kode SKU, ukuran plastik (contoh: 15x30)..."
                className="w-full pl-11 pr-10 py-3 min-h-[46px] rounded-xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 focus:border-amber-500 text-stone-900 dark:text-stone-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Pills Slider */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedKat('all')}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedKat === 'all'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 font-semibold'
                }`}
              >
                Semua Produk
              </button>
              {kategori.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setSelectedKat(k.id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    selectedKat === k.id
                      ? 'bg-amber-500 text-white shadow-2xs font-bold'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 font-semibold'
                  }`}
                >
                  {k.nama}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorite / Quick Picks Grid */}
        {selectedKat === 'all' && !searchTerm && favoriteProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PRODUK TERLARIS & CEPAT</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {favoriteProducts.map((p) => {
                const stock = getProdukStokForOutlet(p.id, activeOutlet.id);
                const cartItem = cart.find((c) => c.produk.id === p.id);
                const minLimit = p.stokMin ?? 5;
                const isOutOfStock = stock <= 0;
                const isCriticalStock = stock <= minLimit;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleOpenQtyModal(p)}
                    className={`min-h-[74px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-98 cursor-pointer relative select-none ${
                      isOutOfStock
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 opacity-75'
                        : isCriticalStock
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/70 hover:border-amber-500'
                        : cartItem
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/50 shadow-2xs'
                        : 'bg-white dark:bg-stone-900 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-400 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                          {p.nama}
                        </span>
                        {cartItem && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-black shrink-0">
                            {cartItem.qty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5">
                        <span>{p.satuan}</span>
                        {isOutOfStock ? (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-black animate-pulse">
                            HABIS
                          </span>
                        ) : isCriticalStock ? (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-black">
                            KRITIS: {stock}
                          </span>
                        ) : (
                          <span className="text-stone-500 dark:text-stone-400">
                            Stok: {stock}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {formatRupiah(p.hargaRetail)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-semibold">+ Atur Qty</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Product Catalog Grid */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>Daftar Produk ({filteredProducts.length})</span>
            <span className="text-[11px]">Outlet: {activeOutlet.nama}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredProducts.map((prod) => {
              const stock = getProdukStokForOutlet(prod.id, activeOutlet.id);
              const cartItem = cart.find((item) => item.produk.id === prod.id);
              const minLimit = prod.stokMin ?? 5;
              const isOutOfStock = stock <= 0;
              const isCriticalStock = stock <= minLimit;

              return (
                <div
                  key={prod.id}
                  onClick={() => handleOpenQtyModal(prod)}
                  className={`min-h-[88px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all select-none cursor-pointer ${
                    isOutOfStock
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 opacity-80 cursor-not-allowed'
                      : isCriticalStock
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 hover:border-amber-500 shadow-2xs active:scale-98'
                      : cartItem
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 shadow-2xs ring-1 ring-amber-400/40 active:scale-98'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-amber-300 hover:shadow-2xs active:scale-98'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                          {prod.nama}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-black animate-pulse">
                            HABIS
                          </span>
                        ) : isCriticalStock ? (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-black">
                            KRITIS
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                        <span className="font-mono text-[10px] text-stone-400">{prod.kode}</span>
                        <span>·</span>
                        <span>{prod.satuan}</span>
                        <span>·</span>
                        {isOutOfStock ? (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                            Stok: 0 (Kosong)
                          </span>
                        ) : isCriticalStock ? (
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                            Stok: {stock} (Min {minLimit})
                          </span>
                        ) : (
                          <span>Stok: {stock}</span>
                        )}
                      </div>
                    </div>

                    {/* Qty indicator or Quick Add Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cartItem ? (
                        <span className="min-w-[28px] h-7 px-2 rounded-lg bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                          {cartItem.qty} {prod.satuan}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => quickAddToCart(prod, e)}
                          title={isOutOfStock ? 'Stok habis' : 'Tambah 1 langsung'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isOutOfStock
                              ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                              : 'bg-stone-100 dark:bg-stone-800 hover:bg-amber-500 hover:text-white text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pricing row with wholesale info & tap hint */}
                  <div className="mt-2 pt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                        {formatRupiah(prod.hargaRetail)}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1">/{prod.satuan}</span>
                    </div>

                    {prod.hargaGrosir && prod.minGrosir ? (
                      <div className="text-[10.5px] text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 px-2 py-0.5 rounded font-bold">
                        Grosir: {formatRupiah(prod.hargaGrosir)} (≥{prod.minGrosir})
                      </div>
                    ) : (
                      <span className="text-[10.5px] text-amber-600 font-medium">Sentuh untuk isi qty</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FLOATING STICKY PREVIEW BAR (Mobile Only - When on Katalog Tab) */}
        {cart.length > 0 && mobileTab === 'katalog' && (
          <div className="lg:hidden fixed bottom-18 left-3 right-3 z-40 animate-fade-in">
            <div className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-stone-800 dark:border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-stone-300 dark:text-stone-600">
                    {cartSummary.itemCount} barang dipilih
                  </div>
                  <div className="text-base font-black text-amber-400 dark:text-amber-600">
                    {formatRupiah(cartSummary.finalTotal)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileTab('keranjang')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>Lihat Keranjang & Bayar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          RIGHT SECTION: CART PREVIEW, DISCOUNT, PAYMENT METHOD & CHECKOUT
          (Full width on mobile when tab = 'keranjang', sidebar on desktop)
          ======================================================== */}
      <div
        className={`w-full lg:w-[460px] xl:w-[480px] bg-white dark:bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 flex flex-col shadow-xl z-20 ${
          mobileTab === 'katalog' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Mobile Header with Back Button */}
        <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileTab('katalog')}
              className="lg:hidden p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 mr-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                Keranjang & Pembayaran
              </h2>
              <span className="text-[11px] text-stone-500">Preview pesanan sebelum bayar</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body: Cart Items + Customer + Discount + Payment Details */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 divide-y divide-stone-100 dark:divide-stone-800">
          {/* 1. CUSTOMER SELECTOR */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Pelanggan</span>
              </label>
              <span className="text-[11px] text-stone-400">Pilih Umum atau Langganan B2B</span>
            </div>

            <SearchableSelect
              id="kasir-pelanggan-select"
              label=""
              options={pelangganOptions}
              value={selectedPelangganId}
              onChange={handleSelectCustomer}
              placeholder="Pilih pelanggan..."
              searchPlaceholder="Cari nama warung, katering, no telp..."
            />

            {/* B2B Customer Credit Alert Panel */}
            {customerReceivablesInfo && customerReceivablesInfo.totalPiutang > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  customerReceivablesInfo.isExceedingLimit || customerReceivablesInfo.overdueCount > 0
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>PERINGATAN PIUTANG PELANGGAN</span>
                  </span>
                  <span>{formatRupiah(customerReceivablesInfo.totalPiutang)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-current/20 text-[11px]">
                  <div>
                    Nota Belum Lunas:{' '}
                    <span className="font-bold">{customerReceivablesInfo.invoiceCount} nota</span>
                  </div>
                  {customerReceivablesInfo.overdueCount > 0 ? (
                    <div className="text-rose-600 dark:text-rose-400 font-bold">
                      Lewat Tempo: {customerReceivablesInfo.overdueCount} nota
                    </div>
                  ) : (
                    <div>Status: Lancar</div>
                  )}
                </div>

                {customerReceivablesInfo.oldestOverdueDate && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400">
                    Nota tertua lewat tempo: {formatWIBDate(customerReceivablesInfo.oldestOverdueDate)}
                  </div>
                )}

                {customerReceivablesInfo.isExceedingLimit && (
                  <div className="font-bold text-[11px] bg-rose-200/70 dark:bg-rose-900/60 p-1.5 rounded">
                    ⚠️ Limit kredit ({formatRupiah(customerReceivablesInfo.limitKredit)}) TERLAMPAUI!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CART ITEM LIST PREVIEW */}
          <div className="pt-3 space-y-2.5">
            {/* Quick search shortcut button from inside Cart */}
            <button
              type="button"
              onClick={handleSwitchToSearch}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between hover:bg-amber-100/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cari & Tambah Produk Lain...</span>
              </span>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-stone-900 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 shadow-2xs">
                Ke Pencarian →
              </span>
            </button>

            <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
              <span>Daftar Barang Belanja ({cartSummary.itemCount} pcs)</span>
              <button
                type="button"
                onClick={handleSwitchToSearch}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cari Barang</span>
              </button>
            </div>

            {cartSummary.analyzedItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/50">
                <ShoppingCart className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-2 stroke-1" />
                <p className="text-xs font-bold text-stone-600 dark:text-stone-400">Keranjang Masih Kosong</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Ketik di kolom pencarian atau pilih produk dari katalog untuk memilih jumlah barang yang ingin dijual
                </p>
                <button
                  type="button"
                  onClick={handleSwitchToSearch}
                  className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 cursor-pointer shadow-xs flex items-center gap-1.5 mx-auto"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buka Pencarian Produk</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {cartSummary.analyzedItems.map((item) => (
                  <div
                    key={item.produk.id}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {item.produk.nama}
                          </span>
                          {item.isWholesale && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black tracking-wide uppercase">
                              HARGA GROSIR
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {formatRupiah(item.activePrice)} / {item.produk.satuan}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-stone-900 dark:text-stone-100">
                          {formatRupiah(item.itemSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Wholesale Hint Banner */}
                    {item.wholesaleHint && (
                      <div className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                        <span>{item.wholesaleHint}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.produk.id, (item.produk.minGrosir || 0))}
                          className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded font-bold hover:bg-amber-600"
                        >
                          Genapkan
                        </button>
                      </div>
                    )}

                    {/* Quantity Stepper (touch >= 44px) & Remove Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                      <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQty(item.produk.id, item.qty - 1)}
                          className="w-11 h-11 min-h-[44px] flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateQty(item.produk.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 text-center text-xs font-black bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none min-h-[44px]"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(item.produk.id, item.qty + 1)}
                          className="w-11 h-11 min-h-[44px] flex items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenQtyModal(item.produk)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40"
                        >
                          Ubah Qty
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.produk.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                          title="Hapus barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. RINCIAN TOTAL & KOLOM DISKON (SEBELUM BAYAR) */}
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>Rincian Total & Diskon</span>
              </span>
            </div>

            {/* Subtotal & Grosir */}
            <div className="space-y-1.5 text-xs bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Subtotal Barang ({cartSummary.itemCount} pcs):</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatRupiah(cartSummary.subtotal)}
                </span>
              </div>

              {cartSummary.totalHematGrosir > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Hemat Diskon Grosir:</span>
                  <span>-{formatRupiah(cartSummary.totalHematGrosir)}</span>
                </div>
              )}

              {/* KOLOM DISKON TAMBAHAN / MANUAL (JELAS TERLIHAT) */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Potongan / Diskon Tambahan</span>
                  </label>
                  {diskonManual > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiskonManual(0);
                        setAlasanDiskon('');
                      }}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Reset Diskon
                    </button>
                  )}
                </div>

                {/* Discount Input & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={diskonManual > 0 ? formatThousands(diskonManual) : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setDiskonManual(raw ? parseInt(raw, 10) : 0);
                      }}
                      className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none tracking-wide"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Alasan Diskon (misal: Langganan/Promo)"
                    value={alasanDiskon}
                    onChange={(e) => setAlasanDiskon(e.target.value)}
                    className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {diskonManual > 0 && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                    <span>Terpotong: Rp {formatThousands(diskonManual)}</span>
                    <span className="text-stone-400">·</span>
                    <span className="italic text-stone-500">({terbilangRupiah(diskonManual)})</span>
                  </div>
                )}

                {/* Quick Discount Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Rp 2.000', val: 2000 },
                    { label: 'Rp 5.000', val: 5000 },
                    { label: 'Rp 10.000', val: 10000 },
                    { label: '5%', pct: 0.05 },
                    { label: '10%', pct: 0.1 },
                  ].map((btn, idx) => {
                    const discountValue = btn.val ?? Math.round(cartSummary.subtotal * (btn.pct || 0));
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDiskonManual(discountValue);
                          if (!alasanDiskon) setAlasanDiskon(`Diskon Promo ${btn.label}`);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition-colors cursor-pointer ${
                          diskonManual === discountValue
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOTAL TAGIHAN AKHIR */}
              <div className="pt-2.5 border-t border-stone-200 dark:border-stone-700 flex justify-between items-baseline">
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100">
                    TOTAL TAGIHAN AKHIR:
                  </span>
                  {diskonManual > 0 && (
                    <div className="text-[10.5px] text-amber-600 font-semibold">
                      (Sudah dipotong diskon {formatRupiah(diskonManual)})
                    </div>
                  )}
                </div>
                <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {formatRupiah(cartSummary.finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. PILIHAN METODE PEMBAYARAN (LANGSUNG TERLIHAT SEBELUM BAYAR) */}
          <div className="pt-3 space-y-3">
            <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
              PILIH METODE PEMBAYARAN:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
              {[
                { id: MetodeBayar.TUNAI, label: 'Tunai', sub: 'Uang Pas / Lembaran' },
                { id: MetodeBayar.QRIS, label: 'QRIS', sub: 'Scan QR toko' },
                { id: MetodeBayar.TRANSFER, label: 'Transfer', sub: 'Cek mutasi rekening' },
                { id: MetodeBayar.KREDIT, label: 'Tempo / Bon', sub: 'Hutang B2B' },
                { id: MetodeBayar.CAMPURAN, label: 'Campuran', sub: 'DP + sisa tempo' },
              ].map((m) => {
                const isSelected = metodeBayar === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMetodeBayar(m.id);
                      if (m.id === MetodeBayar.TUNAI) {
                        setUangDiterima(cartSummary.finalTotal);
                      } else {
                        setUangDiterima(0);
                      }
                    }}
                    className={`min-h-[48px] p-2 rounded-xl border text-left flex flex-col justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/40 font-bold'
                        : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-xs font-bold">{m.label}</span>
                    <span
                      className={`text-[9.5px] line-clamp-1 ${
                        isSelected ? 'text-amber-100' : 'text-stone-400'
                      }`}
                    >
                      {m.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DETAIL KALKULATOR TUNAI (Jika memilih Tunai) */}
            {metodeBayar === MetodeBayar.TUNAI && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    UANG TUNAI DITERIMA DARI PEMBELI:
                  </span>
                  <button
                    type="button"
                    onClick={() => setUangDiterima(cartSummary.finalTotal)}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 underline cursor-pointer"
                  >
                    Uang Pas
                  </button>
                </div>

                {/* Large Cash Input with Auto Thousand Separator (.) */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-amber-600 dark:text-amber-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={uangDiterima > 0 ? formatThousands(uangDiterima) : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setUangDiterima(raw ? parseInt(raw, 10) : 0);
                      }}
                      placeholder="0"
                      className={`w-full pl-12 pr-12 py-2.5 min-h-[50px] rounded-xl border-2 text-2xl font-black tracking-wider focus:outline-none focus:ring-2 shadow-xs transition-all ${
                        isUangKurang
                          ? 'border-rose-400 text-rose-600 bg-rose-50/40 dark:bg-rose-950/30 ring-rose-400'
                          : 'border-amber-400 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 ring-amber-400'
                      }`}
                    />
                    {uangDiterima > 0 && (
                      <button
                        type="button"
                        onClick={() => setUangDiterima(0)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                        title="Hapus / Reset"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Terbaca & Terbilang (Memastikan Nol Tidak Tertukar/Keliru) */}
                  {uangDiterima > 0 ? (
                    <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-500 text-[11px]">Terbaca:</span>
                        <span className="font-black text-amber-700 dark:text-amber-400 text-xs">
                          Rp {formatThousands(uangDiterima)}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 dark:text-stone-400 font-medium italic truncate">
                        ({terbilangRupiah(uangDiterima)})
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500 italic pl-1">
                      Ketik nominal uang, titik pemisah ribuan otomatis muncul (misal: ketik 100000 jadi 100.000)
                    </div>
                  )}
                </div>

                {/* Quick Smart Cash Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {smartCashButtons.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setUangDiterima(val)}
                      className={`min-h-[38px] px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        uangDiterima === val
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {val === cartSummary.finalTotal ? 'Uang Pas' : formatRupiah(val)}
                    </button>
                  ))}
                </div>

                {/* Live Kembalian Display Box */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isUangKurang
                      ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 text-rose-700 dark:text-rose-400'
                      : 'bg-emerald-100/80 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide">
                      {isUangKurang ? 'UANG MASIH KURANG:' : 'UANG KEMBALIAN KASIR:'}
                    </div>
                    {changeDenominations.length > 0 && !isUangKurang && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                        Lembaran: {changeDenominations.map((d) => `${d.count}× ${d.label}`).join(' + ')}
                      </div>
                    )}
                  </div>
                  <span className="text-xl font-black">
                    {isUangKurang
                      ? `-${formatRupiah(cartSummary.finalTotal - uangDiterima)}`
                      : formatRupiah(kembalian)}
                  </span>
                </div>
              </div>
            )}

            {/* DETAIL TEMPO / KREDIT */}
            {(metodeBayar === MetodeBayar.KREDIT || metodeBayar === MetodeBayar.CAMPURAN) && (
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                  <span>
                    {metodeBayar === MetodeBayar.CAMPURAN
                      ? 'DP + SISA TEMPO (CAMPURAN)'
                      : 'SETELAN JATUH TEMPO KREDIT B2B'}
                  </span>
                </div>

                {selectedPelangganId === 'pel-umum' && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-semibold">
                    ⚠️ Pelanggan saat ini masih &quot;Penjualan Umum&quot;. Silakan pilih pelanggan B2B terdaftar di atas!
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Tanggal Jatuh Tempo:
                    </label>
                    <input
                      type="date"
                      value={jatuhTempoKredit}
                      onChange={(e) => setJatuhTempoKredit(e.target.value)}
                      className="w-full px-3 py-2 min-h-[40px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-stone-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Uang Muka / DP (Opsional):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={uangDiterima > 0 ? formatThousands(uangDiterima) : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setUangDiterima(raw ? parseInt(raw, 10) : 0);
                        }}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-2 min-h-[40px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 focus:outline-none tracking-wide"
                      />
                    </div>
                    {uangDiterima > 0 && (
                      <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 truncate">
                        DP: Rp {formatThousands(uangDiterima)} ({terbilangRupiah(uangDiterima)})
                      </div>
                    )}
                  </div>
                </div>

                {uangDiterima > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Metode DP
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[MetodeBayar.TUNAI, MetodeBayar.QRIS, MetodeBayar.TRANSFER].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMetodeDp(m)}
                          className={`min-h-[44px] px-2 rounded-lg text-xs font-bold border ${
                            metodeDp === m
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200/50 flex justify-between text-xs font-bold">
                  <span>Sisa Piutang yang Dicatat:</span>
                  <span className="text-amber-600 dark:text-amber-400 text-sm">
                    {formatRupiah(Math.max(0, cartSummary.finalTotal - (uangDiterima || 0)))}
                  </span>
                </div>
              </div>
            )}

            {/* DETAIL QRIS / TRANSFER */}
            {(metodeBayar === MetodeBayar.QRIS || metodeBayar === MetodeBayar.TRANSFER) && (
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
                  {metodeBayar === MetodeBayar.QRIS ? <QrCode className="w-4 h-4 text-amber-600" /> : <ArrowRightLeft className="w-4 h-4 text-amber-600" />}
                  <span>Instruksi {metodeBayar}</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Pastikan pembeli telah mentransfer tepat sejumlah{' '}
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {formatRupiah(cartSummary.finalTotal)}
                  </span>{' '}
                  dan Anda telah melihat bukti transfer atau notifikasi dana masuk di kas toko.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 5. STICKY FOOTER FINAL ACTION BUTTON */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl space-y-2">
          <button
            type="button"
            disabled={cart.length === 0 || isUangKurang}
            onClick={handleConfirmCheckout}
            className={`w-full min-h-[52px] px-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-between shadow-lg transition-all cursor-pointer active:scale-98 ${
              cart.length === 0
                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed shadow-none'
                : isUangKurang
                ? 'bg-rose-500 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              <span>
                {isUangKurang
                  ? 'Uang Pembayaran Masih Kurang'
                  : 'PROSES BAYAR & CETAK STRUK'}
              </span>
            </div>
            <span className="font-black text-base sm:text-lg">
              {formatRupiah(cartSummary.finalTotal)}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MODAL / BOTTOM SHEET: MASUKIN KERANJANG SEKALIAN QTY-NYA
          (Touch-first, big buttons, instant subtotal calculation)
          ======================================================== */}
      {qtyModalProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-slide-up">
            {/* Sheet Header */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  MASUKKAN KE KERANJANG
                </span>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 truncate">
                  {qtyModalProduct.nama}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <span>Satuan: {qtyModalProduct.satuan}</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-bold">
                    Stok Tersedia: {getProdukStokForOutlet(qtyModalProduct.id, activeOutlet.id)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQtyModalProduct(null)}
                className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-900 cursor-pointer shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Pricing Info Box */}
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-500">Harga Retail:</span>
                  <div className="font-black text-sm text-stone-900 dark:text-stone-100">
                    {formatRupiah(qtyModalProduct.hargaRetail)} / {qtyModalProduct.satuan}
                  </div>
                </div>

                {qtyModalProduct.hargaGrosir && qtyModalProduct.minGrosir && (
                  <div className="text-right">
                    <span className="text-amber-600 font-bold">
                      Harga Grosir (≥{qtyModalProduct.minGrosir} {qtyModalProduct.satuan}):
                    </span>
                    <div className="font-black text-sm text-emerald-600">
                      {formatRupiah(qtyModalProduct.hargaGrosir)}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Stepper (Giant, easy touch for thumb) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 text-center">
                  JUMLAH BARANG (QTY):
                </label>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 flex items-center justify-center hover:bg-stone-200 active:scale-90 text-2xl font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Minus className="w-6 h-6" />
                  </button>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={getProdukStokForOutlet(qtyModalProduct.id, activeOutlet.id)}
                      value={modalQty || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setModalQty(isNaN(val) ? 0 : val);
                      }}
                      className="w-32 h-14 rounded-2xl border-2 border-amber-500 bg-white dark:bg-stone-900 text-center text-2xl font-black text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-4 focus:ring-amber-400/20"
                    />
                    <span className="block text-[10px] text-center text-stone-400 font-semibold mt-0.5">
                      {qtyModalProduct.satuan}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const maxStock = getProdukStokForOutlet(qtyModalProduct.id, activeOutlet.id);
                      setModalQty(Math.min(maxStock, modalQty + 1));
                    }}
                    className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 active:scale-90 text-2xl font-bold transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Quick Qty Preset Chips */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-stone-500">Pilihan Cepat Qty:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 5, 10, 20, 50, 100].map((num) => {
                    const maxStock = getProdukStokForOutlet(qtyModalProduct.id, activeOutlet.id);
                    if (num > maxStock && num !== 1) return null;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setModalQty(num)}
                        className={`min-h-[38px] px-3.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          modalQty === num
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {num} {qtyModalProduct.satuan}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Calculated Subtotal & Wholesale Feedback */}
              {(() => {
                const isWholesale =
                  qtyModalProduct.minGrosir !== null &&
                  qtyModalProduct.hargaGrosir !== null &&
                  modalQty >= qtyModalProduct.minGrosir;
                const unitPrice = isWholesale
                  ? (qtyModalProduct.hargaGrosir as number)
                  : qtyModalProduct.hargaRetail;
                const totalCalculated = unitPrice * modalQty;
                const hemat = isWholesale
                  ? (qtyModalProduct.hargaRetail - unitPrice) * modalQty
                  : 0;

                return (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                      <span>Harga Satuan Aktif:</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {formatRupiah(unitPrice)} /{qtyModalProduct.satuan}
                        {isWholesale && (
                          <span className="ml-1 text-[9.5px] px-1 bg-emerald-600 text-white rounded font-bold">
                            GROSIR
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                      <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
                        Subtotal ({modalQty} {qtyModalProduct.satuan}):
                      </span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {formatRupiah(totalCalculated)}
                      </span>
                    </div>

                    {isWholesale && hemat > 0 && (
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>🎉 Hemat {formatRupiah(hemat)} karena beli harga grosir!</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Sheet Actions */}
            <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setQtyModalProduct(null)}
                className="flex-1 min-h-[46px] rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmAddModal}
                className="flex-2 min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Masukkan ke Keranjang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT MODAL */}
      <ShiftModal
        mode="open"
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* THERMAL 58MM RECEIPT MODAL */}
      <ThermalReceiptModal
        transaksi={completedTx}
        onClose={() => setCompletedTx(null)}
      />
    </div>
  );
};
