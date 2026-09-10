import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Scissors,
  CreditCard,
  Boxes,
  TrendingUp,
  FolderKanban,
  Building2,
  Lock,
  Unlock,
  User,
  Sun,
  Moon,
  Store,
  Printer,
  ChevronDown,
  ReceiptText,
  Receipt,
  Wallet,
  MoreHorizontal,
  BookOpen,
  Truck,
  X,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import { formatRupiah } from '../utils/formatters';
import { ShiftModal } from './ShiftModal';
import { UserGuideModal } from './UserGuideModal';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigateToBeliSupplier?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToBeliSupplier,
  children,
}) => {
  const {
    outlets,
    activeOutlet,
    setActiveOutletId,
    activeShift,
    currentUser,
    users,
    switchUser,
    isUserAssigned,
    produk,
    getProdukStokForOutlet,
  } = useApp();

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<'open' | 'close'>('open');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  // Real-time calculation of products at or below minimum stock in active outlet
  const lowStockCount = useMemo(() => {
    return produk.filter((p) => {
      if (!p.aktif) return false;
      const stok = getProdukStokForOutlet(p.id, activeOutlet.id);
      const minLimit = p.stokMin ?? 5;
      return stok <= minLimit;
    }).length;
  }, [produk, activeOutlet.id, getProdukStokForOutlet]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleShiftClick = () => {
    if (activeShift) {
      setShiftModalMode('close');
    } else {
      setShiftModalMode('open');
    }
    setIsShiftModalOpen(true);
  };

  // Desktop Navigation Items
  const desktopNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir', icon: ShoppingCart },
    { id: 'transaksi', label: 'Data Transaksi', icon: ReceiptText, shortLabel: 'Transaksi' },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: Receipt, shortLabel: 'Biaya' },
    { id: 'modal', label: 'Modal & Prive', icon: Wallet, shortLabel: 'Modal' },
    { id: 'pecah', label: 'Pecah Karung', icon: Scissors, badge: '⭐', shortLabel: 'Pecah' },
    { id: 'piutang', label: 'Hutang-Piutang', icon: CreditCard, shortLabel: 'Piutang' },
    {
      id: 'stok',
      label: 'Stok & Cabang',
      icon: Boxes,
      shortLabel: 'Stok',
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      isWarning: lowStockCount > 0,
    },
    { id: 'laporan', label: 'Laporan Keuangan', icon: TrendingUp, shortLabel: 'Laporan' },
    { id: 'master', label: 'Data Master', icon: FolderKanban, shortLabel: 'Master' },
  ];

  // Mobile Bottom Navigation: 5 Quick Action Tabs
  const mobileNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir', icon: ShoppingCart },
    { id: 'transaksi', label: 'Transaksi', icon: ReceiptText },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: Receipt },
  ];

  const isSecondaryActive = ['modal', 'pecah', 'piutang', 'stok', 'laporan', 'master'].includes(activeTab);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-18 sm:pb-0">
      {/* TOP APP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm shrink-0 cursor-pointer hover:bg-amber-600 transition-colors"
            >
              <Store className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs sm:text-sm md:text-base tracking-tight text-stone-900 dark:text-stone-100 truncate">
                  Toko Plastik & Bahan Kue
                </span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  POS
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 truncate">
                <span>Multi-Outlet</span>
                <span>·</span>
                <span>Pecah Karung</span>
                <span>·</span>
                <span>Modal & Prive</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden 2xl:flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black leading-none ${
                        item.isWarning
                          ? 'bg-rose-600 text-white animate-pulse shadow-2xs'
                          : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Outlet Switcher, Shift Status, User Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Guide Button */}
            <button
              type="button"
              onClick={() => setIsUserGuideOpen(true)}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Buka Buku Panduan Penggunaan Aplikasi"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Panduan</span>
            </button>

            {/* Active Outlet Selector / Lock Badge */}
            {currentUser.role === Role.OWNER ? (
              <div className="relative">
                <select
                  aria-label="Pilih Outlet Aktif"
                  value={activeOutlet.id}
                  onChange={(e) => setActiveOutletId(e.target.value)}
                  className="pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] sm:text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer appearance-none max-w-[130px] sm:max-w-[170px] truncate"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      📍 {o.nama.replace('Toko Plastik ', '')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div
                className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-[11px] sm:text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 max-w-[140px] sm:max-w-[170px] truncate shadow-2xs"
                title={`Cabang penugasan ${currentUser.role}: ${isUserAssigned ? activeOutlet.nama : 'Belum Ditugaskan'} (Terkunci)`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  {isUserAssigned ? activeOutlet.nama.replace('Toko Plastik ', '') : 'Belum Diassign'}
                </span>
              </div>
            )}

            {/* Shift Pill Button */}
            <button
              type="button"
              onClick={handleShiftClick}
              className={`min-h-[32px] px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 border transition-all cursor-pointer ${
                activeShift
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300 animate-pulse'
              }`}
              title={activeShift ? 'Klik untuk tutup shift kasir' : 'Klik untuk buka shift baru'}
            >
              {activeShift ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {activeShift ? `Shift: ${formatRupiah(activeShift.tunaiSistem)}` : 'Buka Shift'}
              </span>
              <span className="sm:hidden">{activeShift ? 'Shift ON' : 'Shift OFF'}</span>
            </button>

            {/* User Account / Role Switcher */}
            <div className="relative">
              <select
                aria-label="Pilih Akun Pengguna"
                value={currentUser.id}
                onChange={(e) => switchUser(e.target.value)}
                className="pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer appearance-none max-w-[120px] sm:max-w-[160px] truncate"
                title="Ganti akun pengguna untuk uji coba hak akses (Owner, Manager, Kasir Cabang, atau Kasir Belum Ditugaskan)"
              >
                {users.map((u) => {
                  const assignedOutlet = outlets.find((o) => o.id === u.outletId);
                  const outletLabel = u.role === Role.OWNER ? 'Global' : assignedOutlet ? assignedOutlet.nama.replace('Toko Plastik ', '') : 'Unassigned';
                  return (
                    <option key={u.id} value={u.id}>
                      👤 {u.nama.split(' ')[0]} ({u.role} - {outletLabel})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Secondary Sub-Navbar for Desktop screens under 2XL (Ensures all 10 tabs are directly clickable) */}
        <div className="hidden xl:flex 2xl:hidden border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 px-4 py-1.5 gap-1 overflow-x-auto">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black leading-none ${
                      item.isWarning
                        ? 'bg-rose-600 text-white animate-pulse shadow-2xs'
                        : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN VIEW CONTENT AREA */}
      <main className="flex-1 max-w-full overflow-x-hidden">{children}</main>

      {/* MOBILE-FIRST BOTTOM NAVIGATION BAR (Focused 5-Button Layout: 4 Primary + 1 More) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 shadow-lg px-1 py-1">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMoreMenuOpen(false);
                }}
                className={`min-h-[50px] py-1 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold bg-amber-50/70 dark:bg-amber-950/30'
                    : 'text-stone-500 dark:text-stone-400 font-medium hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] leading-tight text-center truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* MORE / LAINNYA BUTTON */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`min-h-[50px] py-1 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer relative ${
              isSecondaryActive || isMoreMenuOpen
                ? 'text-amber-600 dark:text-amber-400 font-extrabold bg-amber-50/70 dark:bg-amber-950/30'
                : 'text-stone-500 dark:text-stone-400 font-medium hover:text-stone-900'
            }`}
          >
            <div className="relative">
              <MoreHorizontal
                className={`w-4 h-4 ${
                  isSecondaryActive || isMoreMenuOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              {isSecondaryActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="text-[10px] leading-tight text-center truncate max-w-full px-0.5 font-bold">
              {activeTab === 'modal'
                ? 'Modal'
                : activeTab === 'pecah'
                ? 'Pecah'
                : activeTab === 'piutang'
                ? 'Piutang'
                : activeTab === 'stok'
                ? 'Stok'
                : activeTab === 'laporan'
                ? 'Laporan'
                : activeTab === 'master'
                ? 'Master'
                : 'Lainnya'}
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE "MORE" BOTTOM DRAWER SHEET */}
      {isMoreMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full bg-white dark:bg-stone-900 rounded-t-3xl border-t border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                  Semua Modul & Pengaturan
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Akses Modal, Pecah Karung, Hutang, Stok, Laporan & Panduan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Actions in "More" Menu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Modal Usaha & Prive */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('modal');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'modal'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Modal Usaha & Prive
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Saldo Awal, Investor, Utang, & Prive Pemilik
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {/* Pecah Karung */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pecah');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'pecah'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Pecah Karung Plastik ⭐
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Konversi karung 25kg ke pack eceran & kalkulasi susut
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {/* Stok & Cabang */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stok');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'stok'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Stok & Mutasi Antar Cabang
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Katalog stok, opname fisik, & transfer stok antar outlet
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {/* Hutang-Piutang */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('piutang');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'piutang'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Buku Hutang & Piutang
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Piutang pelanggan tempo & faktur hutang ke supplier
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {/* Laporan Keuangan Pure */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('laporan');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'laporan'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Laporan Keuangan (Laba/Rugi)
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Analitik laba kotor/bersih, omzet & ringkasan shift
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>

              {/* Data Master & Import CSV */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('master');
                  setIsMoreMenuOpen(false);
                }}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === 'master'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold shrink-0">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Data Master & Pengguna
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Katalog produk, pelanggan, supplier, & penugasan staf
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            </div>

            {/* Beli Produk ke Supplier */}
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(false);
                if (onNavigateToBeliSupplier) {
                  onNavigateToBeliSupplier();
                } else {
                  setActiveTab('stok');
                }
              }}
              className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100 text-left flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Beli Produk ke Supplier (Restock)
                  </div>
                  <div className="text-[10px] text-stone-500">
                    Form Penerimaan Stok Barang Masuk Tunai / Tempo
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </button>

            {/* Buku Panduan Penggunaan */}
            <button
              type="button"
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsUserGuideOpen(true);
              }}
              className="w-full p-3 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 text-left flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-900 dark:text-amber-200">
                    Buku Panduan Penggunaan
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-300/80">
                    Panduan lengkap bebas distraksi untuk kasir, grosir, & gudang
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL SHIFT OPEN/CLOSE MODAL */}
      <ShiftModal
        mode={shiftModalMode}
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* BUKU PANDUAN PENGGUNAAN MODAL (Distraction-Free) */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />
    </div>
  );
};
