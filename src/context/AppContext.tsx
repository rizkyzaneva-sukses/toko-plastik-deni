import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Outlet,
  User,
  Role,
  Kategori,
  Produk,
  JenisProduk,
  StokOutlet,
  Pelanggan,
  Supplier,
  Transaksi,
  MetodeBayar,
  StatusBayar,
  ItemTransaksi,
  ItemPembelian,
  PembayaranPiutang,
  Pembelian,
  PembayaranHutang,
  KategoriPengeluaran,
  Pengeluaran,
  SumberDana,
  PecahKarung,
  HasilPecahItem,
  StokMovement,
  JenisMovement,
  Shift,
  AuditLog,
  MutasiStok,
  StatusMutasi,
  StokLedgerItem,
  SumberModal,
  TipeTransaksiModal,
  TransaksiModal,
  ModalUsahaState,
} from '../types';
import {
  initialOutlets,
  initialUsers,
  initialKategori,
  initialProduk,
  initialStokOutlet,
  initialPelanggan,
  initialSuppliers,
  initialTransaksi,
  initialPembayaranPiutang,
  initialPembelian,
  initialKategoriPengeluaran,
  initialPengeluaran,
  initialPecahKarung,
  initialStokMovement,
  initialShift,
  initialModalUsaha,
  initialTransaksiModal,
} from '../data/seedData';
import { todayWIBDate } from '../utils/formatters';

interface AppContextType {
  // Auth & Navigation
  isLoggedIn: boolean;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  users: User[];
  addUser: (u: { nama: string; username: string; password: string; role: Role; outletId: string | null }) => { success: boolean; error?: string };
  updateUser: (id: string, u: Partial<User>) => { success: boolean; error?: string };
  deleteUser: (id: string) => { success: boolean; error?: string };
  isUserAssigned: boolean;
  userAssignedOutlet: Outlet | null;
  activeOutletId: string; // 'all' or specific outlet ID
  setActiveOutletId: (id: string) => void;
  activeOutlet: Outlet;
  outlets: Outlet[];
  isDark: boolean;
  toggleTheme: () => void;
  theme: 'light' | 'dark';

  // Capital & Equity (Modal Usaha & Prive)
  modalUsaha: ModalUsahaState;
  transaksiModalList: TransaksiModal[];
  setSaldoAwalUsaha: (nominal: number, tanggal?: string, keterangan?: string) => void;
  tambahModalUsaha: (data: {
    sumberModal: SumberModal;
    nominal: number;
    sumberKasTujuan: SumberDana;
    keterangan: string;
    penyetor: string;
    outletId?: string | null;
  }) => { success: boolean; error?: string };
  catatPrive: (data: {
    nominal: number;
    sumberKasTujuan: SumberDana;
    keterangan: string;
    penyetor?: string;
    outletId?: string | null;
  }) => { success: boolean; error?: string };
  deleteTransaksiModal: (id: string) => { success: boolean; error?: string };
  totalModalTerkumpul: number;
  totalPriveDitarik: number;
  saldoKasBesar: number;
  saldoBank: number;
  saldoLaciKasir: number;

  // Master Data
  kategori: Kategori[];
  kategoriPengeluaran: KategoriPengeluaran[];
  produk: Produk[]; // filtered according to role (no HPP if cashier)
  stokOutlet: StokOutlet[];
  pelanggan: Pelanggan[];
  suppliers: Supplier[];

  // Cashier & Shift
  activeShift: Shift | null;
  shiftHistory: Shift[];
  openShift: (modalAwal: number) => Shift;
  closeShift: (tunaiFisik: number) => { shift: Shift; selisih: number };

  // Transactions (POS)
  transaksiList: Transaksi[];
  createTransaksi: (data: {
    pelangganId: string | null;
    items: Array<{ produkId: string; qty: number }>;
    diskon: number;
    metodeBayar: MetodeBayar;
    uangDiterima: number;
    jatuhTempo: string | null;
    alasanDiskon?: string;
    metodeDp?: MetodeBayar;
  }) => { success: boolean; transaksi?: Transaksi; error?: string };
  voidTransaksi: (transaksiId: string, alasan: string) => { success: boolean; error?: string };

  // Receivables (Piutang Pelanggan)
  pembayaranPiutang: PembayaranPiutang[];
  paySingleInvoice: (transaksiId: string, nominal: number, metodeBayar: MetodeBayar, catatan?: string) => { success: boolean; error?: string };
  payFIFOInvoices: (pelangganId: string, nominalTotal: number, metodeBayar: MetodeBayar, catatan?: string, outletId?: string) => { success: boolean; allocated: Array<{ transaksiId: string; nominal: number }>; error?: string };

  // Payables (Hutang Vendor)
  pembelianList: Pembelian[];
  pembayaranHutangList: PembayaranHutang[];
  createPembelian: (data: {
    nomorNota: string;
    supplierId: string;
    outletId: string;
    items: Array<{ produkId: string; qty: number; hargaBeli: number }>;
    statusBayar: StatusBayar;
    dpNominal: number;
    jatuhTempo: string | null;
  }) => { success: boolean; pembelian?: Pembelian; error?: string };
  payVendorInvoice: (pembelianId: string, nominal: number, metodeBayar: MetodeBayar) => { success: boolean; error?: string };

  // Pecah Karung
  pecahKarungList: PecahKarung[];
  processPecahKarung: (data: {
    outletId: string;
    produkIndukId: string;
    jumlahKarung: number;
    beratIndukAktualGram: number;
    hasil: Array<{
      produkEcerId: string;
      qtyKemasan: number;
    }>;
    keterangan: string;
  }) => { success: boolean; error?: string; pecahKarung?: PecahKarung };

  // Operational Expenses
  pengeluaranList: Pengeluaran[];
  createPengeluaran: (data: {
    outletId: string;
    kategoriId: string;
    nominal: number;
    metodeBayar: MetodeBayar;
    sumberDana: SumberDana;
    keterangan: string;
    tanggal?: string;
  }) => { success: boolean; error?: string };
  deletePengeluaran: (id: string) => { success: boolean; error?: string };

  // Stock Opname & Movement Ledger
  stokMovementList: StokMovement[];
  submitStockOpname: (outletId: string, produkId: string, fisikCount: number, alasan: string) => { success: boolean; error?: string };

  // Product CRUD
  createOrUpdateProduk: (p: Partial<Produk> & { nama: string; kode: string; kategoriId: string; jenis: JenisProduk; satuan: string; hargaRetail: number }) => { success: boolean; error?: string };
  importCSVProduk: (csvText: string) => { success: boolean; importedCount: number; inactiveCount: number; errors: string[] };
  bulkImportProduk: (
    items: Array<{
      kode?: string;
      nama: string;
      kategoriNama?: string;
      kategoriId?: string;
      jenis?: JenisProduk;
      satuan?: string;
      hargaRetail: number;
      hargaGrosir?: number | null;
      minGrosir?: number | null;
      stokMin?: number;
      stokAwal?: number;
      hppAwal?: number;
      favorit?: boolean;
    }>,
    options?: { updateExisting?: boolean; targetOutletId?: string }
  ) => { success: boolean; importedCount: number; updatedCount: number; errors: string[] };

  // Audit Logs
  auditLogs: AuditLog[];

  // Helper selectors
  getProdukStokForOutlet: (produkId: string, outletId?: string) => number;
  getProdukHPPForOutlet: (produkId: string, outletId?: string) => number;
  hasStokRecordForOutlet: (produkId: string, outletId?: string) => boolean;
  resetAllData: () => void;

  // Compatibility helpers & extended modules
  setCurrentUserRole: (role: Role) => void;
  shifts: Shift[];
  addPengeluaran: (data: {
    outletId: string;
    kategori?: string;
    nominal: number;
    catatan?: string;
    keterangan?: string;
    dariLaciKasir?: boolean;
  }) => void;
  addProduk: (p: any) => { success: boolean; error?: string };
  updateProduk: (id: string, p: any) => { success: boolean; error?: string };
  addPelanggan: (p: Partial<Pelanggan>) => void;
  updatePelanggan: (id: string, p: Partial<Pelanggan>) => void;
  addSupplier: (s: Partial<Supplier>) => void;
  mutasiList: MutasiStok[];
  createMutasiStok: (data: {
    outletAsalId: string;
    outletTujuanId: string;
    items: Array<{ produkId: string; qty: number }>;
    catatan?: string;
    biayaKirim?: number;
  }) => { success: boolean; error?: string };
  processStockOpname: (data: {
    outletId: string;
    items: Array<{ produkId: string; stokSistem: number; stokFisik: number; selisih: number; catatan: string }>;
    catatan?: string;
  }) => { success: boolean; error?: string };
  recordPembelian: (data: {
    supplierId: string;
    outletId: string;
    items: Array<{ produkId: string; qty: number; hargaBeli: number; subtotal: number }>;
    total: number;
    metodeBayar: string;
    totalDibayar: number;
    sisaHutang: number;
    jatuhTempo: string | null;
    catatan?: string;
  }) => { success: boolean; error?: string };
  stokLedger: StokLedgerItem[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_PREFIX = 'tokoplastik_v2_';

function getStoredItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Error reading localStorage for key', key, e);
    return fallback;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing localStorage for key', key, e);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tokoplastik_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('tokoplastik_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Outlets & Users
  const [outlets] = useState<Outlet[]>(() => getStoredItem('outlets', initialOutlets));
  const [users, setUsers] = useState<User[]>(() => getStoredItem('users', initialUsers));
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = getStoredItem<User>('current_user', initialUsers[0]);
    // Validate that user exists
    return initialUsers.find((u) => u.id === stored.id) || initialUsers[0];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return getStoredItem<boolean>('isLoggedIn', false);
  });

  const logout = () => {
    setIsLoggedIn(false);
    setStoredItem('isLoggedIn', false);
    setCurrentUser(initialUsers[0]);
  };

  // Whether current user is assigned to an outlet
  const isUserAssigned = useMemo(() => {
    if (currentUser.role === Role.OWNER) return true;
    return !!currentUser.outletId;
  }, [currentUser]);

  const userAssignedOutlet = useMemo(() => {
    if (currentUser.role === Role.OWNER) return null;
    return outlets.find((o) => o.id === currentUser.outletId) || null;
  }, [currentUser, outlets]);

  // Active Outlet (For Kasir/Manager, forced to their assigned outletId)
  const [activeOutletId, setActiveOutletIdState] = useState<string>(() => {
    const stored = getStoredItem('active_outlet_id', 'outlet-1');
    return stored;
  });

  // Keep activeOutletId synced when user changes
  useEffect(() => {
    if ((currentUser.role === Role.KASIR || currentUser.role === Role.MANAGER || currentUser.role === Role.GUDANG) && currentUser.outletId) {
      setActiveOutletIdState(currentUser.outletId);
      setStoredItem('active_outlet_id', currentUser.outletId);
    }
  }, [currentUser]);

  const setActiveOutletId = (id: string) => {
    // If Kasir or Manager, prevent changing outlet away from assigned outlet!
    if (currentUser.role === Role.KASIR || currentUser.role === Role.MANAGER || currentUser.role === Role.GUDANG) {
      if (currentUser.outletId) {
        setActiveOutletIdState(currentUser.outletId);
        setStoredItem('active_outlet_id', currentUser.outletId);
      }
      return;
    }
    setActiveOutletIdState(id);
    setStoredItem('active_outlet_id', id);
  };

  const effectiveOutletId = useMemo(() => {
    if (currentUser.role === Role.OWNER) {
      return activeOutletId === 'all' ? 'outlet-1' : activeOutletId;
    }
    return currentUser.outletId || 'unassigned';
  }, [currentUser, activeOutletId]);

  const activeOutlet = useMemo(() => {
    const found = outlets.find((o) => o.id === effectiveOutletId);
    if (found) return found;
    if (!isUserAssigned) {
      return {
        id: 'unassigned',
        nama: 'Belum Ditugaskan ke Cabang',
        alamat: 'Silakan hubungi Owner untuk menentukan cabang penugasan Anda.',
        telepon: '-',
        aktif: false,
      };
    }
    return outlets[0];
  }, [outlets, effectiveOutletId, isUserAssigned]);

  // Capital & Equity States
  const [modalUsaha, setModalUsaha] = useState<ModalUsahaState>(() => getStoredItem('modal_usaha', initialModalUsaha));
  const [transaksiModalList, setTransaksiModalList] = useState<TransaksiModal[]>(() => getStoredItem('transaksi_modal', initialTransaksiModal));

  // Database states
  const [kategori, setKategori] = useState<Kategori[]>(() => getStoredItem('kategori', initialKategori));
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<KategoriPengeluaran[]>(() => getStoredItem('kategori_pengeluaran', initialKategoriPengeluaran));
  const [produk, setProduk] = useState<Produk[]>(() => getStoredItem('produk', initialProduk));
  const [stokOutlet, setStokOutlet] = useState<StokOutlet[]>(() => getStoredItem('stok_outlet', initialStokOutlet));
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>(() => getStoredItem('pelanggan', initialPelanggan));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getStoredItem('suppliers', initialSuppliers));

  const [activeShift, setActiveShift] = useState<Shift | null>(() => getStoredItem('active_shift', initialShift));
  const [shiftHistory, setShiftHistory] = useState<Shift[]>(() => getStoredItem('shift_history', []));
  const [saldoKasByOutlet, setSaldoKasByOutlet] = useState<Record<string, number>>(() =>
    getStoredItem('saldo_kas', {
      'outlet-1': initialShift?.tunaiSistem ?? 0,
      'outlet-2': 0,
    })
  );

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(() => getStoredItem('transaksi', initialTransaksi));
  const [pembayaranPiutang, setPembayaranPiutang] = useState<PembayaranPiutang[]>(() => getStoredItem('pembayaran_piutang', initialPembayaranPiutang));

  const [pembelianList, setPembelianList] = useState<Pembelian[]>(() => getStoredItem('pembelian', initialPembelian));
  const [pembayaranHutangList, setPembayaranHutangList] = useState<PembayaranHutang[]>(() => getStoredItem('pembayaran_hutang', []));

  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>(() => getStoredItem('pengeluaran', initialPengeluaran));
  const [pecahKarungList, setPecahKarungList] = useState<PecahKarung[]>(() => getStoredItem('pecah_karung', initialPecahKarung));
  const [stokMovementList, setStokMovementList] = useState<StokMovement[]>(() => getStoredItem('stok_movement', initialStokMovement));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredItem('audit_logs', []));

  // Sync back to local storage
  useEffect(() => setStoredItem('produk', produk), [produk]);
  useEffect(() => setStoredItem('stok_outlet', stokOutlet), [stokOutlet]);
  useEffect(() => setStoredItem('pelanggan', pelanggan), [pelanggan]);
  useEffect(() => setStoredItem('transaksi', transaksiList), [transaksiList]);
  useEffect(() => setStoredItem('pembayaran_piutang', pembayaranPiutang), [pembayaranPiutang]);
  useEffect(() => setStoredItem('pembelian', pembelianList), [pembelianList]);
  useEffect(() => setStoredItem('pembayaran_hutang', pembayaranHutangList), [pembayaranHutangList]);
  useEffect(() => setStoredItem('pengeluaran', pengeluaranList), [pengeluaranList]);
  useEffect(() => setStoredItem('pecah_karung', pecahKarungList), [pecahKarungList]);
  useEffect(() => setStoredItem('stok_movement', stokMovementList), [stokMovementList]);
  useEffect(() => setStoredItem('active_shift', activeShift), [activeShift]);
  useEffect(() => setStoredItem('shift_history', shiftHistory), [shiftHistory]);
  useEffect(() => setStoredItem('saldo_kas', saldoKasByOutlet), [saldoKasByOutlet]);
  useEffect(() => setStoredItem('audit_logs', auditLogs), [auditLogs]);
  useEffect(() => setStoredItem('current_user', currentUser), [currentUser]);
  useEffect(() => setStoredItem('users', users), [users]);
  useEffect(() => setStoredItem('modal_usaha', modalUsaha), [modalUsaha]);
  useEffect(() => setStoredItem('transaksi_modal', transaksiModalList), [transaksiModalList]);

  // Helper to read stock for an outlet
  const getProdukStokForOutlet = (produkId: string, outletId = effectiveOutletId): number => {
    const item = stokOutlet.find((s) => s.produkId === produkId && s.outletId === outletId);
    return item ? item.stok : 0;
  };

  // Helper to read HPP for an outlet (guarded)
  const getProdukHPPForOutlet = (produkId: string, outletId = effectiveOutletId): number => {
    const item = stokOutlet.find((s) => s.produkId === produkId && s.outletId === outletId);
    return item ? item.hpp : 0;
  };

  const hasStokRecordForOutlet = (produkId: string, outletId = effectiveOutletId): boolean => {
    return stokOutlet.some((s) => s.produkId === produkId && s.outletId === outletId);
  };

  // Satu sumber kas: Laci. Kalau shift outlet itu sedang buka, mutasi ke tunaiSistem.
  // Kalau tidak, mutasi ke saldo kas tersimpan supaya uang tidak hilang saat shift tutup.
  const applyKasDelta = (outletId: string, delta: number) => {
    if (activeShift && activeShift.outletId === outletId) {
      setActiveShift((prev) =>
        prev && prev.outletId === outletId
          ? { ...prev, tunaiSistem: prev.tunaiSistem + delta }
          : prev
      );
    } else {
      setSaldoKasByOutlet((prev) => ({
        ...prev,
        [outletId]: Math.max(0, (prev[outletId] || 0) + delta),
      }));
    }
  };

  // Shift: Open shift
  const openShift = (modalAwal: number): Shift => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      outletId: effectiveOutletId,
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      modalAwal,
      tunaiSistem: modalAwal,
      tunaiFisik: null,
      selisih: null,
      penjualanTunai: 0,
      penjualanNonTunai: 0,
      pembayaranPiutangTunai: 0,
      pengeluaranLaci: 0,
      totalTransaksi: 0,
      dibuka: new Date().toISOString(),
      ditutup: null,
      status: 'BUKA',
    };
    setActiveShift(newShift);
    return newShift;
  };

  // Shift: Close shift with physical cash count — uang laci tetap tersimpan
  const closeShift = (tunaiFisik: number) => {
    if (!activeShift) {
      throw new Error('Tidak ada shift yang sedang aktif');
    }
    const selisih = tunaiFisik - activeShift.tunaiSistem;
    const closedShift: Shift = {
      ...activeShift,
      tunaiFisik,
      selisih,
      ditutup: new Date().toISOString(),
      status: 'TUTUP',
    };
    setShiftHistory((prev) => [closedShift, ...prev]);
    setSaldoKasByOutlet((prev) => ({
      ...prev,
      [closedShift.outletId]: Math.max(0, tunaiFisik),
    }));
    setActiveShift(null);
    return { shift: closedShift, selisih };
  };

  // Cashier POS Transaction Creation
  const createTransaksi = (data: {
    pelangganId: string | null;
    items: Array<{ produkId: string; qty: number }>;
    diskon: number;
    metodeBayar: MetodeBayar;
    uangDiterima: number;
    jatuhTempo: string | null;
    alasanDiskon?: string;
    metodeDp?: MetodeBayar;
  }) => {
    if (!activeShift) {
      return { success: false, error: 'Shift kasir belum dibuka! Silakan buka shift dengan modal laci terlebih dahulu.' };
    }
    if (data.items.length === 0) {
      return { success: false, error: 'Keranjang belanja masih kosong!' };
    }
    if (data.metodeBayar === MetodeBayar.KREDIT && !data.pelangganId) {
      return { success: false, error: 'Transaksi kredit WAJIB memilih pelanggan B2B!' };
    }

    // Check stock for all items
    for (const item of data.items) {
      const p = produk.find((x) => x.id === item.produkId);
      const stockAvailable = getProdukStokForOutlet(item.produkId, effectiveOutletId);
      if (stockAvailable < item.qty) {
        return {
          success: false,
          error: `Stok "${p?.nama || 'Produk'}" tidak mencukupi! Tersedia: ${stockAvailable}, Diminta: ${item.qty}`,
        };
      }
    }

    // Build Transaction Items with wholesale logic & frozen HPP
    let calculatedSubtotal = 0;
    const txItems: ItemTransaksi[] = [];
    const txId = `trx-${Date.now()}`;
    const dateNow = new Date();
    const invoiceNumber = `TRX-${dateNow.getFullYear().toString().slice(-2)}${(dateNow.getMonth() + 1).toString().padStart(2, '0')}${dateNow.getDate().toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const newMovements: StokMovement[] = [];
    const updatedStok = [...stokOutlet];

    for (const orderItem of data.items) {
      const prod = produk.find((x) => x.id === orderItem.produkId);
      if (!prod) continue;

      // PRD rule 1 & 2: qty >= minGrosir && hargaGrosir != null -> grosir. Selain itu retail.
      // minGrosir kosong -> selalu retail.
      const isWholesale = prod.minGrosir !== null && prod.hargaGrosir !== null && orderItem.qty >= prod.minGrosir;
      const unitPrice = isWholesale ? (prod.hargaGrosir as number) : prod.hargaRetail;
      const sub = unitPrice * orderItem.qty;
      calculatedSubtotal += sub;

      // Frozen HPP at sale time (from outlet's moving average)
      const currentHpp = stokOutlet.find((s) => s.produkId === prod.id && s.outletId === effectiveOutletId)?.hpp || 0;

      txItems.push({
        id: `itrx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        transaksiId: txId,
        produkId: prod.id,
        namaProduk: prod.nama,
        qty: orderItem.qty,
        hargaSatuan: unitPrice,
        pakaiGrosir: isWholesale,
        subtotal: sub,
        hppSaatJual: currentHpp,
      });

      // Deduct stock in StokOutlet
      const stockIdx = updatedStok.findIndex((s) => s.produkId === prod.id && s.outletId === effectiveOutletId);
      const prevStock = stockIdx >= 0 ? updatedStok[stockIdx].stok : 0;
      const nextStock = prevStock - orderItem.qty;

      if (stockIdx >= 0) {
        updatedStok[stockIdx] = { ...updatedStok[stockIdx], stok: nextStock };
      } else {
        updatedStok.push({
          id: `stk-${Date.now()}`,
          produkId: prod.id,
          outletId: effectiveOutletId,
          stok: nextStock,
          stokMinimum: 5,
          hpp: currentHpp,
        });
      }

      // Ledger movement
      newMovements.push({
        id: `smov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        produkId: prod.id,
        namaProduk: prod.nama,
        outletId: effectiveOutletId,
        jenis: JenisMovement.KELUAR_PENJUALAN,
        qty: -orderItem.qty,
        stokSebelum: prevStock,
        stokSesudah: nextStock,
        refId: invoiceNumber,
        userId: currentUser.id,
        userNama: currentUser.nama,
        keterangan: `Penjualan kasir #${invoiceNumber}`,
        createdAt: dateNow.toISOString(),
      });
    }

    const finalTotal = Math.max(0, calculatedSubtotal - (data.diskon || 0));

    // Determine statusBayar, totalDibayar, sisaPiutang, and kembalian
    let statusBayar: StatusBayar = StatusBayar.LUNAS;
    let totalDibayar = finalTotal;
    let sisaPiutang = 0;
    let kembalian = 0;
    let uangDiterima = data.uangDiterima;

    if (data.metodeBayar === MetodeBayar.TUNAI) {
      if (uangDiterima < finalTotal) {
        return { success: false, error: 'Nominal tunai yang diterima kurang dari total belanja!' };
      }
      kembalian = uangDiterima - finalTotal;
      totalDibayar = finalTotal;
      statusBayar = StatusBayar.LUNAS;
    } else if (data.metodeBayar === MetodeBayar.KREDIT) {
      // Full credit or with DP
      const dp = Math.min(finalTotal, Math.max(0, uangDiterima || 0));
      totalDibayar = dp;
      sisaPiutang = finalTotal - dp;
      kembalian = 0;
      statusBayar = sisaPiutang === 0 ? StatusBayar.LUNAS : dp > 0 ? StatusBayar.SEBAGIAN : StatusBayar.BELUM_BAYAR;
    } else if (data.metodeBayar === MetodeBayar.CAMPURAN) {
      // DP paid, remaining is receivable
      const dp = Math.min(finalTotal, Math.max(0, uangDiterima || 0));
      totalDibayar = dp;
      sisaPiutang = finalTotal - dp;
      statusBayar = sisaPiutang === 0 ? StatusBayar.LUNAS : StatusBayar.SEBAGIAN;
    } else {
      // QRIS or TRANSFER
      totalDibayar = finalTotal;
      sisaPiutang = 0;
      kembalian = 0;
      uangDiterima = finalTotal;
    }

    const selectedCust = pelanggan.find((p) => p.id === data.pelangganId);

    const newTx: Transaksi = {
      id: txId,
      nomor: invoiceNumber,
      outletId: effectiveOutletId,
      shiftId: activeShift.id,
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      pelangganId: data.pelangganId,
      pelangganNama: selectedCust ? selectedCust.nama : undefined,
      subtotal: calculatedSubtotal,
      diskon: data.diskon || 0,
      total: finalTotal,
      metodeBayar: data.metodeBayar,
      statusBayar,
      totalDibayar,
      sisaPiutang,
      uangDiterima,
      kembalian,
      jatuhTempo: data.jatuhTempo,
      voided: false,
      createdAt: dateNow.toISOString(),
      items: txItems,
    };

    const dpMetode = data.metodeDp || MetodeBayar.TUNAI;
    const cashAmountReceived =
      data.metodeBayar === MetodeBayar.TUNAI
        ? finalTotal
        : data.metodeBayar === MetodeBayar.CAMPURAN || data.metodeBayar === MetodeBayar.KREDIT
        ? dpMetode === MetodeBayar.TUNAI
          ? totalDibayar
          : 0
        : 0;

    const nonCashAmount =
      data.metodeBayar === MetodeBayar.QRIS || data.metodeBayar === MetodeBayar.TRANSFER
        ? finalTotal
        : (data.metodeBayar === MetodeBayar.CAMPURAN || data.metodeBayar === MetodeBayar.KREDIT) &&
          (dpMetode === MetodeBayar.QRIS || dpMetode === MetodeBayar.TRANSFER)
        ? totalDibayar
        : 0;

    setActiveShift((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tunaiSistem: prev.tunaiSistem + cashAmountReceived,
        penjualanTunai: prev.penjualanTunai + cashAmountReceived,
        penjualanNonTunai: prev.penjualanNonTunai + nonCashAmount,
        totalTransaksi: prev.totalTransaksi + 1,
      };
    });

    // If DP was paid on credit transaction, record PembayaranPiutang
    if ((data.metodeBayar === MetodeBayar.KREDIT || data.metodeBayar === MetodeBayar.CAMPURAN) && totalDibayar > 0) {
      const dpPayment: PembayaranPiutang = {
        id: `pby-${Date.now()}`,
        transaksiId: txId,
        nomorNota: invoiceNumber,
        pelangganId: data.pelangganId as string,
        pelangganNama: selectedCust?.nama || 'Pelanggan',
        nominal: totalDibayar,
        metodeBayar: dpMetode,
        shiftId: activeShift.id,
        userId: currentUser.id,
        userNama: currentUser.nama,
        catatan: 'Uang Muka (DP) Transaksi',
        createdAt: dateNow.toISOString(),
      };
      setPembayaranPiutang((prev) => [dpPayment, ...prev]);
    }

    // Apply state changes
    setStokOutlet(updatedStok);
    setStokMovementList((prev) => [...newMovements, ...prev]);
    setTransaksiList((prev) => [newTx, ...prev]);

    // Audit log if manual discount was applied
    if (data.diskon > 0) {
      const audit: AuditLog = {
        id: `aud-${Date.now()}`,
        action: 'DISKON_MANUAL',
        userId: currentUser.id,
        userNama: currentUser.nama,
        outletId: effectiveOutletId,
        refId: invoiceNumber,
        detail: `Diskon manual Rp ${data.diskon}. Alasan: ${data.alasanDiskon || 'Tanpa alasan'}`,
        createdAt: dateNow.toISOString(),
      };
      setAuditLogs((prev) => [audit, ...prev]);
    }

    return { success: true, transaksi: newTx };
  };

  // Void Transaction (OWNER only)
  const voidTransaksi = (transaksiId: string, alasan: string) => {
    if (currentUser.role !== Role.OWNER) {
      return { success: false, error: 'Hanya OWNER yang berwenang membatalkan (void) transaksi!' };
    }

    const tx = transaksiList.find((t) => t.id === transaksiId);
    if (!tx) return { success: false, error: 'Transaksi tidak ditemukan' };
    if (tx.voided) return { success: false, error: 'Transaksi ini sudah pernah dibatalkan' };

    // Restore stock
    const updatedStok = [...stokOutlet];
    const newMovements: StokMovement[] = [];

    for (const item of tx.items) {
      const idx = updatedStok.findIndex((s) => s.produkId === item.produkId && s.outletId === tx.outletId);
      const prevStock = idx >= 0 ? updatedStok[idx].stok : 0;
      const nextStock = prevStock + item.qty;

      if (idx >= 0) {
        updatedStok[idx] = { ...updatedStok[idx], stok: nextStock };
      }

      newMovements.push({
        id: `smov-void-${Date.now()}-${item.id}`,
        produkId: item.produkId,
        namaProduk: item.namaProduk,
        outletId: tx.outletId,
        jenis: JenisMovement.RETUR,
        qty: item.qty,
        stokSebelum: prevStock,
        stokSesudah: nextStock,
        refId: tx.nomor,
        userId: currentUser.id,
        userNama: currentUser.nama,
        keterangan: `Pembatalan Void Transaksi: ${alasan}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Uang yang sempat masuk laci dari nota ini
    const tunaiPayments = pembayaranPiutang.filter(
      (p) => p.transaksiId === tx.id && p.metodeBayar === MetodeBayar.TUNAI
    );
    const cashInLaci =
      tx.metodeBayar === MetodeBayar.TUNAI
        ? tx.total
        : tx.metodeBayar === MetodeBayar.QRIS || tx.metodeBayar === MetodeBayar.TRANSFER
        ? 0
        : tunaiPayments.reduce((sum, p) => sum + p.nominal, 0);
    const nonCashAmount =
      tx.metodeBayar === MetodeBayar.QRIS || tx.metodeBayar === MetodeBayar.TRANSFER ? tx.total : 0;
    const piutangTunaiLater = tunaiPayments
      .filter((p) => p.catatan !== 'Uang Muka (DP) Transaksi')
      .reduce((sum, p) => sum + p.nominal, 0);

    if (activeShift && activeShift.outletId === tx.outletId) {
      setActiveShift((prev) => {
        if (!prev || prev.outletId !== tx.outletId) return prev;
        const sameShift = prev.id === tx.shiftId;
        return {
          ...prev,
          tunaiSistem: prev.tunaiSistem - cashInLaci,
          penjualanTunai: Math.max(
            0,
            prev.penjualanTunai -
              (tx.metodeBayar === MetodeBayar.TUNAI ? tx.total : 0) -
              (tx.metodeBayar === MetodeBayar.KREDIT || tx.metodeBayar === MetodeBayar.CAMPURAN
                ? cashInLaci - piutangTunaiLater
                : 0)
          ),
          penjualanNonTunai: Math.max(0, prev.penjualanNonTunai - nonCashAmount),
          pembayaranPiutangTunai: Math.max(0, prev.pembayaranPiutangTunai - piutangTunaiLater),
          totalTransaksi: sameShift ? Math.max(0, prev.totalTransaksi - 1) : prev.totalTransaksi,
        };
      });
    } else {
      setSaldoKasByOutlet((prev) => ({
        ...prev,
        [tx.outletId]: Math.max(0, (prev[tx.outletId] || 0) - cashInLaci),
      }));
    }

    // Mark as voided
    setTransaksiList((prev) =>
      prev.map((t) => (t.id === transaksiId ? { ...t, voided: true, alasanVoid: alasan } : t))
    );
    setStokOutlet(updatedStok);
    setStokMovementList((prev) => [...newMovements, ...prev]);

    // Audit Log
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        action: 'VOID',
        userId: currentUser.id,
        userNama: currentUser.nama,
        outletId: tx.outletId,
        refId: tx.nomor,
        detail: `Void transaksi #${tx.nomor} senilai Rp ${tx.total}. Alasan: ${alasan}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Receivables: Pay single invoice
  const paySingleInvoice = (transaksiId: string, nominal: number, metodeBayar: MetodeBayar, catatan?: string) => {
    const tx = transaksiList.find((t) => t.id === transaksiId);
    if (!tx) return { success: false, error: 'Nota transaksi tidak ditemukan' };
    if (tx.sisaPiutang <= 0) return { success: false, error: 'Nota ini sudah lunas' };
    if (nominal <= 0) return { success: false, error: 'Nominal pembayaran harus lebih dari 0' };

    const paymentAmount = Math.min(nominal, tx.sisaPiutang);
    const newTotalDibayar = tx.totalDibayar + paymentAmount;
    const newSisa = tx.sisaPiutang - paymentAmount;
    const newStatus: StatusBayar = newSisa === 0 ? StatusBayar.LUNAS : StatusBayar.SEBAGIAN;

    const dateNow = new Date().toISOString();

    const paymentRecord: PembayaranPiutang = {
      id: `pby-${Date.now()}`,
      transaksiId: tx.id,
      nomorNota: tx.nomor,
      pelangganId: tx.pelangganId || 'unknown',
      pelangganNama: tx.pelangganNama || 'Pelanggan',
      nominal: paymentAmount,
      metodeBayar,
      shiftId: metodeBayar === MetodeBayar.TUNAI && activeShift ? activeShift.id : null,
      userId: currentUser.id,
      userNama: currentUser.nama,
      catatan,
      createdAt: dateNow,
    };

    setTransaksiList((prev) =>
      prev.map((t) => (t.id === transaksiId ? { ...t, totalDibayar: newTotalDibayar, sisaPiutang: newSisa, statusBayar: newStatus } : t))
    );
    setPembayaranPiutang((prev) => [paymentRecord, ...prev]);

    if (metodeBayar === MetodeBayar.TUNAI) {
      if (activeShift && activeShift.outletId === tx.outletId) {
        setActiveShift((prev) =>
          prev && prev.outletId === tx.outletId
            ? {
                ...prev,
                tunaiSistem: prev.tunaiSistem + paymentAmount,
                pembayaranPiutangTunai: prev.pembayaranPiutangTunai + paymentAmount,
              }
            : prev
        );
      } else {
        applyKasDelta(tx.outletId, paymentAmount);
      }
    }

    return { success: true };
  };

  // Receivables: FIFO payment allocation across multiple invoices of a customer
  const payFIFOInvoices = (pelangganId: string, nominalTotal: number, metodeBayar: MetodeBayar, catatan?: string, outletId?: string) => {
    if (nominalTotal <= 0) return { success: false, allocated: [], error: 'Nominal harus lebih dari 0' };

    // Get all outstanding invoices for this customer sorted by oldest createdAt (FIFO)
    const unpaidInvoices = transaksiList
      .filter((t) => t.pelangganId === pelangganId && !t.voided && t.sisaPiutang > 0)
      .filter((t) => !outletId || outletId === 'all' || t.outletId === outletId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (unpaidInvoices.length === 0) {
      return { success: false, allocated: [], error: 'Pelanggan ini tidak memiliki nota piutang yang belum lunas' };
    }

    let remainingFunds = nominalTotal;
    const allocatedList: Array<{ transaksiId: string; nominal: number }> = [];
    const updatedTransactions = [...transaksiList];
    const newPayments: PembayaranPiutang[] = [];
    const dateNow = new Date().toISOString();

    for (const inv of unpaidInvoices) {
      if (remainingFunds <= 0) break;

      const payThis = Math.min(remainingFunds, inv.sisaPiutang);
      remainingFunds -= payThis;

      const targetIdx = updatedTransactions.findIndex((t) => t.id === inv.id);
      if (targetIdx >= 0) {
        const cur = updatedTransactions[targetIdx];
        const newPaid = cur.totalDibayar + payThis;
        const newSisa = cur.sisaPiutang - payThis;
        updatedTransactions[targetIdx] = {
          ...cur,
          totalDibayar: newPaid,
          sisaPiutang: newSisa,
          statusBayar: newSisa === 0 ? StatusBayar.LUNAS : StatusBayar.SEBAGIAN,
        };
      }

      newPayments.push({
        id: `pby-${Date.now()}-${inv.id}`,
        transaksiId: inv.id,
        nomorNota: inv.nomor,
        pelangganId,
        pelangganNama: inv.pelangganNama || 'Pelanggan',
        nominal: payThis,
        metodeBayar,
        shiftId: metodeBayar === MetodeBayar.TUNAI && activeShift ? activeShift.id : null,
        userId: currentUser.id,
        userNama: currentUser.nama,
        catatan: catatan ? `${catatan} (Alokasi FIFO)` : 'Pembayaran Alokasi FIFO',
        createdAt: dateNow,
      });

      allocatedList.push({ transaksiId: inv.id, nominal: payThis });
    }

    setTransaksiList(updatedTransactions);
    setPembayaranPiutang((prev) => [...newPayments, ...prev]);

    const totalUsed = nominalTotal - remainingFunds;
    if (metodeBayar === MetodeBayar.TUNAI && totalUsed > 0) {
      const firstInv = unpaidInvoices[0];
      const kasOutletId = firstInv?.outletId || effectiveOutletId;
      if (activeShift && activeShift.outletId === kasOutletId) {
        setActiveShift((prev) =>
          prev && prev.outletId === kasOutletId
            ? {
                ...prev,
                tunaiSistem: prev.tunaiSistem + totalUsed,
                pembayaranPiutangTunai: prev.pembayaranPiutangTunai + totalUsed,
              }
            : prev
        );
      } else {
        applyKasDelta(kasOutletId, totalUsed);
      }
    }

    return { success: true, allocated: allocatedList };
  };

  // Payables: Create Pembelian (Stok Masuk from Supplier)
  const createPembelian = (data: {
    nomorNota: string;
    supplierId: string;
    outletId: string;
    items: Array<{ produkId: string; qty: number; hargaBeli: number }>;
    statusBayar: StatusBayar;
    dpNominal: number;
    jatuhTempo: string | null;
  }) => {
    if (data.items.length === 0) {
      return { success: false, error: 'Daftar barang pembelian masih kosong' };
    }

    const sup = suppliers.find((s) => s.id === data.supplierId);
    let total = 0;
    const itemPembelianList: ItemPembelian[] = [];
    const updatedStok = [...stokOutlet];
    const newMovements: StokMovement[] = [];
    const dateNow = new Date().toISOString();

    for (const item of data.items) {
      const prod = produk.find((p) => p.id === item.produkId);
      const sub = item.qty * item.hargaBeli;
      total += sub;

      itemPembelianList.push({
        id: `ipbl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        produkId: item.produkId,
        namaProduk: prod?.nama || 'Barang',
        qty: item.qty,
        hargaBeli: item.hargaBeli,
        subtotal: sub,
      });

      // Update Moving Average HPP:
      // HPP_baru = (stok_lama * HPP_lama + qty_masuk * harga_beli) / (stok_lama + qty_masuk)
      const stockIdx = updatedStok.findIndex((s) => s.produkId === item.produkId && s.outletId === data.outletId);
      const prevStock = stockIdx >= 0 ? updatedStok[stockIdx].stok : 0;
      const prevHpp = stockIdx >= 0 ? updatedStok[stockIdx].hpp : item.hargaBeli;
      const nextStock = prevStock + item.qty;

      const newHpp =
        nextStock > 0 ? Math.round((prevStock * prevHpp + item.qty * item.hargaBeli) / nextStock) : item.hargaBeli;

      if (stockIdx >= 0) {
        updatedStok[stockIdx] = {
          ...updatedStok[stockIdx],
          stok: nextStock,
          hpp: newHpp,
        };
      } else {
        updatedStok.push({
          id: `stk-${Date.now()}-${item.produkId}`,
          produkId: item.produkId,
          outletId: data.outletId,
          stok: nextStock,
          stokMinimum: 5,
          hpp: newHpp,
        });
      }

      newMovements.push({
        id: `smov-pbl-${Date.now()}-${item.produkId}`,
        produkId: item.produkId,
        namaProduk: prod?.nama || 'Barang',
        outletId: data.outletId,
        jenis: JenisMovement.MASUK_PEMBELIAN,
        qty: item.qty,
        stokSebelum: prevStock,
        stokSesudah: nextStock,
        refId: data.nomorNota,
        userId: currentUser.id,
        userNama: currentUser.nama,
        keterangan: `Pembelian supplier ${sup?.nama || ''} #${data.nomorNota}`,
        createdAt: dateNow,
      });
    }

    const totalDibayar = data.statusBayar === StatusBayar.LUNAS ? total : Math.min(total, data.dpNominal || 0);
    const sisaHutang = total - totalDibayar;
    const finalStatus: StatusBayar =
      sisaHutang === 0 ? StatusBayar.LUNAS : totalDibayar > 0 ? StatusBayar.SEBAGIAN : StatusBayar.BELUM_BAYAR;

    const newPembelian: Pembelian = {
      id: `pbl-${Date.now()}`,
      nomorNota: data.nomorNota,
      supplierId: data.supplierId,
      supplierNama: sup?.nama || 'Supplier',
      outletId: data.outletId,
      total,
      statusBayar: finalStatus,
      totalDibayar,
      sisaHutang,
      jatuhTempo: data.jatuhTempo,
      createdAt: dateNow,
      items: itemPembelianList,
    };

    setStokOutlet(updatedStok);
    setStokMovementList((prev) => [...newMovements, ...prev]);
    setPembelianList((prev) => [newPembelian, ...prev]);

    return { success: true, pembelian: newPembelian };
  };

  // Payables: Pay Vendor Invoice
  const payVendorInvoice = (pembelianId: string, nominal: number, metodeBayar: MetodeBayar) => {
    const p = pembelianList.find((x) => x.id === pembelianId);
    if (!p) return { success: false, error: 'Nota pembelian tidak ditemukan' };
    if (p.sisaHutang <= 0) return { success: false, error: 'Hutang ini sudah lunas' };
    if (nominal <= 0) return { success: false, error: 'Nominal pembayaran harus lebih dari 0' };

    const payAmount = Math.min(nominal, p.sisaHutang);
    const newPaid = p.totalDibayar + payAmount;
    const newSisa = p.sisaHutang - payAmount;
    const newStatus: StatusBayar = newSisa === 0 ? StatusBayar.LUNAS : StatusBayar.SEBAGIAN;

    const paymentRec: PembayaranHutang = {
      id: `pbyh-${Date.now()}`,
      pembelianId: p.id,
      nomorNota: p.nomorNota,
      supplierId: p.supplierId,
      supplierNama: p.supplierNama,
      nominal: payAmount,
      metodeBayar,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    setPembelianList((prev) =>
      prev.map((item) => (item.id === pembelianId ? { ...item, totalDibayar: newPaid, sisaHutang: newSisa, statusBayar: newStatus } : item))
    );
    setPembayaranHutangList((prev) => [paymentRec, ...prev]);

    if (metodeBayar === MetodeBayar.TUNAI) {
      applyKasDelta(p.outletId, -payAmount);
    }

    return { success: true };
  };

  // Pecah Karung Engine (with strict shrinkage calculation & HPP derivation)
  const processPecahKarung = (data: {
    outletId: string;
    produkIndukId: string;
    jumlahKarung: number;
    beratIndukAktualGram: number;
    hasil: Array<{
      produkEcerId: string;
      qtyKemasan: number;
    }>;
    keterangan: string;
  }) => {
    const prodInduk = produk.find((p) => p.id === data.produkIndukId);
    if (!prodInduk) return { success: false, error: 'Produk karung induk tidak ditemukan' };
    if (prodInduk.jenis !== JenisProduk.KARUNG) {
      return { success: false, error: 'Produk yang dipilih bukan jenis KARUNG!' };
    }

    const availableSack = getProdukStokForOutlet(prodInduk.id, data.outletId);
    if (availableSack < data.jumlahKarung) {
      return { success: false, error: `Stok karung tidak cukup! Tersedia: ${availableSack}, Dibutuhkan: ${data.jumlahKarung}` };
    }

    // Calculate total grams of resulting bags
    let totalGramHasil = 0;
    const calculatedHasilItems: HasilPecahItem[] = [];

    for (const h of data.hasil) {
      if (h.qtyKemasan <= 0) continue;
      const ecerProd = produk.find((p) => p.id === h.produkEcerId);
      if (!ecerProd || !ecerProd.beratKemasanGram) continue;

      const totalGramThis = h.qtyKemasan * ecerProd.beratKemasanGram;
      totalGramHasil += totalGramThis;

      calculatedHasilItems.push({
        produkEcerId: ecerProd.id,
        namaProdukEcer: ecerProd.nama,
        beratKemasanGram: ecerProd.beratKemasanGram,
        qtyKemasan: h.qtyKemasan,
        totalGram: totalGramThis,
        hppEcerSatuan: 0, // will compute below
      });
    }

    if (calculatedHasilItems.length === 0 || totalGramHasil === 0) {
      return { success: false, error: 'Harap isi jumlah hasil kemasan eceran!' };
    }

    const totalBeratInduk = data.beratIndukAktualGram * data.jumlahKarung;
    const susutGram = totalBeratInduk - totalGramHasil;

    // Reject negative shrinkage (susut < 0 means output weight > input weight, impossible)
    if (susutGram < 0) {
      return {
        success: false,
        error: `Berat hasil (${totalGramHasil.toLocaleString('id-ID')}g) melebihi berat induk karung (${totalBeratInduk.toLocaleString('id-ID')}g)! Susut tidak boleh negatif.`,
      };
    }

    const susutPersen = (susutGram / totalBeratInduk) * 100;
    if (susutPersen > 2 && !data.keterangan.trim()) {
      return {
        success: false,
        error: `Susut ${susutPersen.toFixed(2)}% melebihi batas toleransi 2.0%! Harap isi keterangan alasan susut.`,
      };
    }

    // Get current HPP of sack from StokOutlet
    const currentHppKarung = getProdukHPPForOutlet(prodInduk.id, data.outletId);
    if (currentHppKarung <= 0) {
      return {
        success: false,
        error: 'HPP karung belum tercatat di stok outlet ini. Catat pembelian/HPP dulu sebelum pecah karung.',
      };
    }
    // PRD formula: hpp_per_gram = hpp_karung / total_gram_hasil_aktual
    const hppPerGram = (currentHppKarung * data.jumlahKarung) / totalGramHasil;

    const updatedStok = [...stokOutlet];
    const newMovements: StokMovement[] = [];
    const dateNow = new Date().toISOString();
    const pecahId = `pch-${Date.now()}`;

    // 1. Deduct sack stock
    const sackIdx = updatedStok.findIndex((s) => s.produkId === prodInduk.id && s.outletId === data.outletId);
    const prevSackStock = sackIdx >= 0 ? updatedStok[sackIdx].stok : 0;
    const nextSackStock = prevSackStock - data.jumlahKarung;

    if (sackIdx >= 0) {
      updatedStok[sackIdx] = { ...updatedStok[sackIdx], stok: nextSackStock };
    }

    newMovements.push({
      id: `smov-pch-out-${Date.now()}`,
      produkId: prodInduk.id,
      namaProduk: prodInduk.nama,
      outletId: data.outletId,
      jenis: JenisMovement.PECAH_KELUAR,
      qty: -data.jumlahKarung,
      stokSebelum: prevSackStock,
      stokSesudah: nextSackStock,
      refId: pecahId,
      userId: currentUser.id,
      userNama: currentUser.nama,
      keterangan: `Pecah karung #${pecahId} (${data.jumlahKarung} karung)`,
      createdAt: dateNow,
    });

    // 2. Increase retail stock & compute HPP ecer
    for (const item of calculatedHasilItems) {
      const ecerProd = produk.find((p) => p.id === item.produkEcerId);
      const packagingCost = ecerProd?.biayaKemasan || 0;
      // hpp_ecer = hpp_per_gram * berat_kemasan + biaya_kemasan_per_bungkus
      const calculatedHppEcer = Math.round(hppPerGram * item.beratKemasanGram + packagingCost);
      item.hppEcerSatuan = calculatedHppEcer;

      const ecerIdx = updatedStok.findIndex((s) => s.produkId === item.produkEcerId && s.outletId === data.outletId);
      const prevEcerStock = ecerIdx >= 0 ? updatedStok[ecerIdx].stok : 0;
      const prevEcerHpp = ecerIdx >= 0 ? updatedStok[ecerIdx].hpp : calculatedHppEcer;
      const nextEcerStock = prevEcerStock + item.qtyKemasan;

      // Update Moving Average HPP for retail
      const newEcerHpp =
        nextEcerStock > 0
          ? Math.round((prevEcerStock * prevEcerHpp + item.qtyKemasan * calculatedHppEcer) / nextEcerStock)
          : calculatedHppEcer;

      if (ecerIdx >= 0) {
        updatedStok[ecerIdx] = {
          ...updatedStok[ecerIdx],
          stok: nextEcerStock,
          hpp: newEcerHpp,
        };
      } else {
        updatedStok.push({
          id: `stk-${Date.now()}-${item.produkEcerId}`,
          produkId: item.produkEcerId,
          outletId: data.outletId,
          stok: nextEcerStock,
          stokMinimum: 10,
          hpp: newEcerHpp,
        });
      }

      newMovements.push({
        id: `smov-pch-in-${Date.now()}-${item.produkEcerId}`,
        produkId: item.produkEcerId,
        namaProduk: item.namaProdukEcer,
        outletId: data.outletId,
        jenis: JenisMovement.PECAH_MASUK,
        qty: item.qtyKemasan,
        stokSebelum: prevEcerStock,
        stokSesudah: nextEcerStock,
        refId: pecahId,
        userId: currentUser.id,
        userNama: currentUser.nama,
        keterangan: `Hasil pecah karung #${pecahId}`,
        createdAt: dateNow,
      });
    }

    const pecahRecord: PecahKarung = {
      id: pecahId,
      outletId: data.outletId,
      produkIndukId: prodInduk.id,
      namaProdukInduk: prodInduk.nama,
      jumlahKarung: data.jumlahKarung,
      beratIndukAktualGram: data.beratIndukAktualGram,
      totalGramHasil,
      susutGram,
      susutPersen: Number(susutPersen.toFixed(2)),
      keterangan: data.keterangan || (susutPersen === 0 ? 'Pecah karung presisi 100%' : `Susut ${susutGram}g (${susutPersen.toFixed(1)}%)`),
      petugasId: currentUser.id,
      petugasNama: currentUser.nama,
      createdAt: dateNow,
      hasil: calculatedHasilItems,
    };

    setStokOutlet(updatedStok);
    setStokMovementList((prev) => [...newMovements, ...prev]);
    setPecahKarungList((prev) => [pecahRecord, ...prev]);

    return { success: true, pecahKarung: pecahRecord };
  };

  // Operational Expenses
  const createPengeluaran = (data: {
    outletId: string;
    kategoriId: string;
    nominal: number;
    metodeBayar: MetodeBayar;
    sumberDana: SumberDana;
    keterangan: string;
    tanggal?: string;
  }) => {
    if (data.nominal <= 0) return { success: false, error: 'Nominal pengeluaran harus lebih dari 0' };

    const kat = kategoriPengeluaran.find((k) => k.id === data.kategoriId);
    const dateNow = new Date().toISOString();
    const tgl = data.tanggal || dateNow.split('T')[0];

    const newExpense: Pengeluaran = {
      id: `exp-${Date.now()}`,
      outletId: data.outletId,
      kategoriId: data.kategoriId,
      kategoriNama: kat?.nama || 'Pengeluaran',
      tanggal: tgl,
      nominal: data.nominal,
      metodeBayar: MetodeBayar.TUNAI,
      sumberDana: SumberDana.LACI_KASIR,
      keterangan: data.keterangan,
      shiftId: activeShift && activeShift.outletId === data.outletId ? activeShift.id : null,
      userId: currentUser.id,
      userNama: currentUser.nama,
      createdAt: dateNow,
    };

    if (activeShift && activeShift.outletId === data.outletId) {
      setActiveShift((prev) =>
        prev && prev.outletId === data.outletId
          ? {
              ...prev,
              tunaiSistem: prev.tunaiSistem - data.nominal,
              pengeluaranLaci: prev.pengeluaranLaci + data.nominal,
            }
          : prev
      );
    } else {
      applyKasDelta(data.outletId, -data.nominal);
    }

    setPengeluaranList((prev) => [newExpense, ...prev]);
    return { success: true };
  };

  const deletePengeluaran = (id: string) => {
    const target = pengeluaranList.find((p) => p.id === id);
    if (!target) return { success: false, error: 'Pengeluaran tidak ditemukan' };

    if (activeShift && activeShift.outletId === target.outletId) {
      setActiveShift((prev) =>
        prev && prev.outletId === target.outletId
          ? {
              ...prev,
              tunaiSistem: prev.tunaiSistem + target.nominal,
              pengeluaranLaci: Math.max(0, prev.pengeluaranLaci - target.nominal),
            }
          : prev
      );
    } else {
      applyKasDelta(target.outletId, target.nominal);
    }
    setPengeluaranList((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  };

  // Stock Opname
  const submitStockOpname = (outletId: string, produkId: string, fisikCount: number, alasan: string) => {
    const prod = produk.find((p) => p.id === produkId);
    if (!prod) return { success: false, error: 'Produk tidak ditemukan' };

    const stockIdx = stokOutlet.findIndex((s) => s.produkId === produkId && s.outletId === outletId);
    const prevStock = stockIdx >= 0 ? stokOutlet[stockIdx].stok : 0;
    const selisih = fisikCount - prevStock;

    if (selisih === 0) {
      return { success: false, error: 'Hitungan fisik sama dengan stok sistem, tidak ada penyesuaian' };
    }

    const updated = [...stokOutlet];
    if (stockIdx >= 0) {
      updated[stockIdx] = { ...updated[stockIdx], stok: fisikCount };
    } else {
      updated.push({
        id: `stk-${Date.now()}`,
        produkId,
        outletId,
        stok: fisikCount,
        stokMinimum: 5,
        hpp: prod.hargaRetail * 0.8,
      });
    }

    const dateNow = new Date().toISOString();
    const movement: StokMovement = {
      id: `smov-opname-${Date.now()}`,
      produkId,
      namaProduk: prod.nama,
      outletId,
      jenis: JenisMovement.OPNAME_ADJUST,
      qty: selisih,
      stokSebelum: prevStock,
      stokSesudah: fisikCount,
      refId: `OPN-${dateNow.split('T')[0]}`,
      userId: currentUser.id,
      userNama: currentUser.nama,
      keterangan: `Stock Opname Penyesuaian (${selisih > 0 ? '+' : ''}${selisih}). Alasan: ${alasan}`,
      createdAt: dateNow,
    };

    setStokOutlet(updated);
    setStokMovementList((prev) => [movement, ...prev]);

    // Audit log
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        action: 'APPROVE_OPNAME',
        userId: currentUser.id,
        userNama: currentUser.nama,
        outletId,
        refId: prod.kode,
        detail: `Stock opname "${prod.nama}": dari ${prevStock} menjadi ${fisikCount} (${selisih}). ${alasan}`,
        createdAt: dateNow,
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Product CRUD
  const createOrUpdateProduk = (p: Partial<Produk> & { nama: string; kode: string; kategoriId: string; jenis: JenisProduk; satuan: string; hargaRetail: number }) => {
    if (!p.nama.trim() || !p.kode.trim()) {
      return { success: false, error: 'Nama dan kode produk wajib diisi!' };
    }

    if (p.id) {
      // Update
      setProduk((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? {
                ...item,
                ...p,
              }
            : item
        )
      );
      return { success: true };
    } else {
      // New
      const exists = produk.some((item) => item.kode.toLowerCase() === p.kode.toLowerCase());
      if (exists) {
        return { success: false, error: `Kode produk "${p.kode}" sudah terdaftar!` };
      }
      const newProd: Produk = {
        id: `prod-${Date.now()}`,
        kode: p.kode.toUpperCase(),
        nama: p.nama,
        kategoriId: p.kategoriId,
        jenis: p.jenis,
        satuan: p.satuan,
        hargaRetail: p.hargaRetail,
        hargaGrosir: p.hargaGrosir ?? null,
        minGrosir: p.minGrosir ?? null,
        beratKemasanGram: p.beratKemasanGram ?? null,
        biayaKemasan: p.biayaKemasan ?? null,
        indukId: p.indukId ?? null,
        favorit: p.favorit ?? false,
        stokMin: p.stokMin ?? 5,
        aktif: p.aktif ?? true,
      };
      setProduk((prev) => [newProd, ...prev]);
      setStokOutlet((prev) => {
        const next = [...prev];
        for (const out of outlets) {
          const exists = next.some((s) => s.produkId === newProd.id && s.outletId === out.id);
          if (!exists) {
            next.push({
              id: `stk-${Date.now()}-${newProd.id}-${out.id}`,
              produkId: newProd.id,
              outletId: out.id,
              stok: 0,
              stokMinimum: newProd.stokMin ?? 5,
              hpp: 0,
            });
          }
        }
        return next;
      });
      return { success: true };
    }
  };

  // Import CSV (Phase 0 spec)
  const importCSVProduk = (csvText: string) => {
    const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length <= 1) {
      return { success: false, importedCount: 0, inactiveCount: 0, errors: ['File CSV kosong atau tidak valid'] };
    }

    let importedCount = 0;
    let inactiveCount = 0;
    const errors: string[] = [];
    const newProducts: Produk[] = [];

    // Header index mapping
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const kodeIdx = headers.indexOf('kode');
    const namaIdx = headers.indexOf('nama');
    const katIdx = headers.indexOf('kategori');
    const jenisIdx = headers.indexOf('jenis');
    const satuanIdx = headers.indexOf('satuan');
    const retailIdx = headers.findIndex((h) => h.includes('retail') || h.includes('jual'));
    const grosirIdx = headers.indexOf('harga_grosir');
    const minGrosirIdx = headers.indexOf('min_grosir');

    if (namaIdx === -1) {
      return { success: false, importedCount: 0, inactiveCount: 0, errors: ['Kolom "nama" tidak ditemukan di header CSV'] };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const kode = kodeIdx >= 0 && cols[kodeIdx] ? cols[kodeIdx] : `SKU-${Date.now()}-${i}`;
      const nama = cols[namaIdx];
      if (!nama) continue;

      const retailVal = retailIdx >= 0 ? parseInt(cols[retailIdx], 10) : NaN;
      // PRD rule: Produk tanpa harga retail otomatis NONAKTIF
      const hasValidRetail = !isNaN(retailVal) && retailVal > 0;
      const aktif = hasValidRetail;

      if (!hasValidRetail) {
        inactiveCount++;
      }

      const grosirVal = grosirIdx >= 0 ? parseInt(cols[grosirIdx], 10) : NaN;
      const minGrosirVal = minGrosirIdx >= 0 ? parseInt(cols[minGrosirIdx], 10) : NaN;

      let j: JenisProduk = JenisProduk.SATUAN;
      if (jenisIdx >= 0 && cols[jenisIdx]) {
        const jStr = cols[jenisIdx].toUpperCase();
        if (jStr.includes('KARUNG')) j = JenisProduk.KARUNG;
        else if (jStr.includes('ECER')) j = JenisProduk.ECER;
      }

      newProducts.push({
        id: `prod-csv-${Date.now()}-${i}`,
        kode,
        nama,
        kategoriId: (() => {
          if (katIdx >= 0 && cols[katIdx]) {
            const katName = cols[katIdx].toLowerCase();
            const matched = kategori.find((k) => k.nama.toLowerCase() === katName);
            if (matched) return matched.id;
          }
          return kategori[0]?.id || 'kat-kresek';
        })(),
        jenis: j,
        satuan: satuanIdx >= 0 && cols[satuanIdx] ? cols[satuanIdx] : 'pcs',
        hargaRetail: hasValidRetail ? retailVal : 0,
        hargaGrosir: !isNaN(grosirVal) && grosirVal > 0 ? grosirVal : null,
        minGrosir: !isNaN(minGrosirVal) && minGrosirVal > 0 ? minGrosirVal : null,
        beratKemasanGram: null,
        biayaKemasan: null,
        aktif,
      });
      importedCount++;
    }

    setProduk((prev) => [...newProducts, ...prev]);
    return { success: true, importedCount, inactiveCount, errors };
  };

  // Robust Bulk Import for Products (with optional initial stock and HPP)
  const bulkImportProduk = (
    items: Array<{
      kode?: string;
      nama: string;
      kategoriNama?: string;
      kategoriId?: string;
      jenis?: JenisProduk;
      satuan?: string;
      hargaRetail: number;
      hargaGrosir?: number | null;
      minGrosir?: number | null;
      stokMin?: number;
      stokAwal?: number;
      hppAwal?: number;
      favorit?: boolean;
    }>,
    options?: { updateExisting?: boolean; targetOutletId?: string }
  ) => {
    const updateExisting = options?.updateExisting ?? true;
    const targetOutlet = options?.targetOutletId || activeOutlet.id;
    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    const existingMap = new Map<string, Produk>();
    produk.forEach((p) => existingMap.set(p.kode.toUpperCase(), p));

    let currentProdukList = [...produk];
    let currentStokOutlet = [...stokOutlet];
    const newMovements: StokMovement[] = [];

    // Categories lookup
    const catMap = new Map<string, string>();
    kategori.forEach((c) => catMap.set(c.nama.toLowerCase(), c.id));

    items.forEach((item, idx) => {
      const rowNum = idx + 1;
      const codeClean = (item.kode || `SKU-${Date.now()}-${idx}`).trim().toUpperCase();
      const namaClean = item.nama?.trim();

      if (!namaClean) {
        errors.push(`Baris ${rowNum}: Nama produk tidak boleh kosong`);
        return;
      }

      const retailPrice = Number(item.hargaRetail);
      if (isNaN(retailPrice) || retailPrice < 0) {
        errors.push(`Baris ${rowNum} (${namaClean}): Harga retail tidak valid`);
        return;
      }

      // Category matching
      let catId = item.kategoriId || kategori[0]?.id || 'kat-kresek';
      if (item.kategoriNama) {
        const cLower = item.kategoriNama.toLowerCase();
        if (catMap.has(cLower)) {
          catId = catMap.get(cLower)!;
        } else {
          const newCat: Kategori = {
            id: `kat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            nama: item.kategoriNama,
          };
          setKategori((prev) => [...prev, newCat]);
          catMap.set(cLower, newCat.id);
          catId = newCat.id;
        }
      }

      const existingProd = existingMap.get(codeClean);

      if (existingProd) {
        if (updateExisting) {
          const pIndex = currentProdukList.findIndex((p) => p.id === existingProd.id);
          if (pIndex >= 0) {
            currentProdukList[pIndex] = {
              ...currentProdukList[pIndex],
              nama: namaClean,
              kategoriId: catId,
              jenis: item.jenis || currentProdukList[pIndex].jenis,
              satuan: item.satuan || currentProdukList[pIndex].satuan,
              hargaRetail: retailPrice,
              hargaGrosir: item.hargaGrosir !== undefined ? item.hargaGrosir : currentProdukList[pIndex].hargaGrosir,
              minGrosir: item.minGrosir !== undefined ? item.minGrosir : currentProdukList[pIndex].minGrosir,
              stokMin: item.stokMin !== undefined ? item.stokMin : currentProdukList[pIndex].stokMin,
              favorit: item.favorit !== undefined ? item.favorit : currentProdukList[pIndex].favorit,
              aktif: true,
            };

            // Update stock and HPP if provided
            if (item.stokAwal !== undefined || item.hppAwal !== undefined) {
              const sIdx = currentStokOutlet.findIndex(
                (s) => s.produkId === existingProd.id && s.outletId === targetOutlet
              );
              if (sIdx >= 0) {
                currentStokOutlet[sIdx] = {
                  ...currentStokOutlet[sIdx],
                  stok: item.stokAwal !== undefined ? Number(item.stokAwal) : currentStokOutlet[sIdx].stok,
                  hpp: item.hppAwal !== undefined ? Number(item.hppAwal) : currentStokOutlet[sIdx].hpp,
                  stokMinimum: item.stokMin !== undefined ? Number(item.stokMin) : currentStokOutlet[sIdx].stokMinimum,
                };
              } else {
                currentStokOutlet.push({
                  id: `stk-${Date.now()}-${existingProd.id}`,
                  produkId: existingProd.id,
                  outletId: targetOutlet,
                  stok: Number(item.stokAwal || 0),
                  stokMinimum: Number(item.stokMin || 5),
                  hpp: Number(item.hppAwal || 0),
                });
              }
            }

            updatedCount++;
          }
        }
      } else {
        // Create brand new product
        const newId = `prod-imp-${Date.now()}-${idx}`;
        const newProduct: Produk = {
          id: newId,
          kode: codeClean,
          nama: namaClean,
          kategoriId: catId,
          jenis: item.jenis || JenisProduk.STANDAR,
          satuan: item.satuan || 'pack',
          hargaRetail: retailPrice,
          hargaGrosir: item.hargaGrosir ?? null,
          minGrosir: item.minGrosir ?? null,
          beratKemasanGram: null,
          biayaKemasan: null,
          indukId: null,
          stokMin: item.stokMin ?? 5,
          favorit: item.favorit ?? false,
          aktif: true,
        };
        currentProdukList = [newProduct, ...currentProdukList];
        existingMap.set(codeClean, newProduct);

        // Add StokOutlet for each outlet
        outlets.forEach((out) => {
          const isTarget = out.id === targetOutlet;
          const initialQty = isTarget ? Number(item.stokAwal || 0) : 0;
          const initialHpp = isTarget ? Number(item.hppAwal || 0) : 0;

          currentStokOutlet.push({
            id: `stk-${Date.now()}-${newId}-${out.id}`,
            produkId: newId,
            outletId: out.id,
            stok: initialQty,
            stokMinimum: item.stokMin ?? 5,
            hpp: initialHpp,
          });

          if (isTarget && initialQty > 0) {
            newMovements.push({
              id: `mov-imp-${Date.now()}-${newId}`,
              produkId: newId,
              namaProduk: item.nama,
              outletId: out.id,
              jenis: JenisMovement.OPNAME_ADJUST,
              qty: initialQty,
              stokSebelum: 0,
              stokSesudah: initialQty,
              refId: 'IMPORT_CSV',
              userId: currentUser.id,
              userNama: currentUser.nama,
              keterangan: 'Saldo Awal dari Impor CSV Massal',
              createdAt: new Date().toISOString(),
            });
          }
        });

        importedCount++;
      }
    });

    if (importedCount > 0 || updatedCount > 0) {
      setProduk(currentProdukList);
      setStokOutlet(currentStokOutlet);
      if (newMovements.length > 0) {
        setStokMovementList((prev) => [...newMovements, ...prev]);
      }
    }

    return {
      success: importedCount > 0 || updatedCount > 0,
      importedCount,
      updatedCount,
      errors,
    };
  };

  // Reset to initial seed
  const resetAllData = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_PREFIX) || key === 'tokoplastik_theme')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  };

  // Role switcher helper
  const setCurrentUserRole = (role: Role) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
    }));
  };

  // Shifts alias
  const shifts = shiftHistory;

  // Operational Expenses helper
  const addPengeluaran = (data: {
    outletId: string;
    kategori?: string;
    nominal: number;
    catatan?: string;
    keterangan?: string;
    dariLaciKasir?: boolean;
  }) => {
    createPengeluaran({
      outletId: data.outletId,
      kategoriId: kategoriPengeluaran[0]?.id || 'kexp-1',
      nominal: data.nominal,
      metodeBayar: MetodeBayar.TUNAI,
      sumberDana: SumberDana.LACI_KASIR,
      keterangan: data.catatan || data.keterangan || data.kategori || 'Pengeluaran Toko',
    });
  };

  // Master Data CRUD helpers
  const addProduk = (p: any) => {
    return createOrUpdateProduk(p);
  };
  const updateProduk = (id: string, p: any) => {
    return createOrUpdateProduk({ ...p, id });
  };
  const addPelanggan = (p: Partial<Pelanggan>) => {
    const newP: Pelanggan = {
      id: `cust-${Date.now()}`,
      nama: p.nama || 'Pelanggan Baru',
      telepon: p.telepon || '-',
      alamat: p.alamat || '-',
      limitKredit: p.limitKredit ?? null,
      defaultTempoHari: p.defaultTempoHari ?? 7,
      catatan: p.catatan || '',
      aktif: p.aktif ?? true,
    };
    setPelanggan((prev) => [newP, ...prev]);
  };
  const updatePelanggan = (id: string, p: Partial<Pelanggan>) => {
    setPelanggan((prev) => prev.map((item) => (item.id === id ? { ...item, ...p } : item)));
  };
  const addSupplier = (s: Partial<Supplier>) => {
    const newS: Supplier = {
      id: `supp-${Date.now()}`,
      nama: s.nama || 'Supplier Baru',
      telepon: s.telepon || '-',
      alamat: s.alamat || '-',
      kontakPerson: s.kontakPerson || '-',
      rekeningBank: s.rekeningBank || '',
      aktif: s.aktif ?? true,
    };
    setSuppliers((prev) => [newS, ...prev]);
  };

  // User Management & Switcher
  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setIsLoggedIn(true);
      setStoredItem('isLoggedIn', true);
      if ((target.role === Role.KASIR || target.role === Role.MANAGER || target.role === Role.GUDANG) && target.outletId) {
        setActiveOutletIdState(target.outletId);
        setStoredItem('active_outlet_id', target.outletId);
      }
    }
  };

  const addUser = (u: { nama: string; username: string; password: string; role: Role; outletId: string | null }) => {
    if (!u.nama.trim() || !u.username.trim()) {
      return { success: false, error: 'Nama lengkap dan username wajib diisi!' };
    }
    const existing = users.find((x) => x.username.toLowerCase() === u.username.trim().toLowerCase());
    if (existing) {
      return { success: false, error: 'Username sudah digunakan!' };
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      nama: u.nama.trim(),
      username: u.username.trim().toLowerCase(),
      password: u.password || 'password123',
      role: u.role,
      outletId: u.role === Role.OWNER ? null : u.outletId,
      aktif: true,
    };
    setUsers((prev) => [...prev, newUser]);
    return { success: true };
  };

  const updateUser = (id: string, u: Partial<User>) => {
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...u };
          if (currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return item;
      })
    );
    return { success: true };
  };

  const deleteUser = (id: string) => {
    if (currentUser.id === id) {
      return { success: false, error: 'Tidak dapat menghapus pengguna yang sedang aktif digunakan!' };
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { success: true };
  };

  // Capital & Prive (Modal Usaha) Handlers
  const setSaldoAwalUsaha = (nominal: number, tanggal?: string, keterangan?: string) => {
    const tgl = tanggal || todayWIBDate();
    const ket = keterangan || 'Penetapan Saldo Modal Awal Usaha';
    setModalUsaha({
      saldoAwal: nominal,
      tanggalMulai: tgl,
      keterangan: ket,
    });
    // Record or update initial capital transaction
    setTransaksiModalList((prev) => {
      const filtered = prev.filter((t) => t.tipe !== TipeTransaksiModal.SALDO_AWAL);
      const newTx: TransaksiModal = {
        id: `tmod-initial-${Date.now()}`,
        outletId: null,
        tanggal: tgl,
        tipe: TipeTransaksiModal.SALDO_AWAL,
        sumberModal: SumberModal.UANG_SENDIRI,
        nominal,
        keterangan: ket,
        penyetor: currentUser.nama || 'Owner Toko',
        sumberKasTujuan: SumberDana.LACI_KASIR,
        userId: currentUser.id,
        userNama: currentUser.nama,
        createdAt: new Date().toISOString(),
      };
      return [newTx, ...filtered];
    });
  };

  const tambahModalUsaha = (data: {
    sumberModal: SumberModal;
    nominal: number;
    sumberKasTujuan: SumberDana;
    keterangan: string;
    penyetor: string;
    outletId?: string | null;
  }) => {
    if (data.nominal <= 0) {
      return { success: false, error: 'Nominal penambahan modal harus lebih dari Rp 0' };
    }
    const dateNow = new Date().toISOString();
    const newTx: TransaksiModal = {
      id: `tmod-${Date.now()}`,
      outletId: data.outletId || null,
      tanggal: dateNow.split('T')[0],
      tipe: TipeTransaksiModal.TAMBAH_MODAL,
      sumberModal: data.sumberModal,
      nominal: data.nominal,
      keterangan: data.keterangan || `Injeksi modal dari ${data.penyetor}`,
      penyetor: data.penyetor || 'Investor / Pemilik',
      sumberKasTujuan: data.sumberKasTujuan,
      userId: currentUser.id,
      userNama: currentUser.nama,
      createdAt: dateNow,
    };
    setTransaksiModalList((prev) => [newTx, ...prev]);

    const targetOutlet = data.outletId || effectiveOutletId;
    applyKasDelta(targetOutlet, data.nominal);
    return { success: true };
  };

  const catatPrive = (data: {
    nominal: number;
    sumberKasTujuan: SumberDana;
    keterangan: string;
    penyetor?: string;
    outletId?: string | null;
  }) => {
    if (data.nominal <= 0) {
      return { success: false, error: 'Nominal prive harus lebih dari Rp 0' };
    }
    const dateNow = new Date().toISOString();
    const newTx: TransaksiModal = {
      id: `tmod-${Date.now()}`,
      outletId: data.outletId || null,
      tanggal: dateNow.split('T')[0],
      tipe: TipeTransaksiModal.PRIVE,
      nominal: data.nominal,
      keterangan: data.keterangan || 'Penarikan Prive Pemilik Toko',
      penyetor: data.penyetor || currentUser.nama || 'Owner Toko',
      sumberKasTujuan: data.sumberKasTujuan,
      userId: currentUser.id,
      userNama: currentUser.nama,
      createdAt: dateNow,
    };
    setTransaksiModalList((prev) => [newTx, ...prev]);

    const targetOutlet = data.outletId || effectiveOutletId;
    if (activeShift && activeShift.outletId === targetOutlet) {
      setActiveShift((prev) =>
        prev && prev.outletId === targetOutlet
          ? {
              ...prev,
              tunaiSistem: Math.max(0, prev.tunaiSistem - data.nominal),
              pengeluaranLaci: prev.pengeluaranLaci + data.nominal,
            }
          : prev
      );
    } else {
      applyKasDelta(targetOutlet, -data.nominal);
    }
    return { success: true };
  };

  const deleteTransaksiModal = (id: string) => {
    const target = transaksiModalList.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Transaksi modal tidak ditemukan' };
    const kasOutlet = target.outletId || effectiveOutletId;
    if (target.tipe === TipeTransaksiModal.TAMBAH_MODAL) {
      applyKasDelta(kasOutlet, -target.nominal);
    } else if (target.tipe === TipeTransaksiModal.PRIVE) {
      applyKasDelta(kasOutlet, target.nominal);
    }
    setTransaksiModalList((prev) => prev.filter((t) => t.id !== id));
    return { success: true };
  };

  // Capital & Cash Metrics Calculations
  const totalModalTerkumpul = useMemo(() => {
    let total = modalUsaha.saldoAwal;
    for (const tm of transaksiModalList) {
      if (tm.tipe === TipeTransaksiModal.TAMBAH_MODAL) {
        total += tm.nominal;
      }
    }
    return total;
  }, [modalUsaha, transaksiModalList]);

  const totalPriveDitarik = useMemo(() => {
    return transaksiModalList
      .filter((tm) => tm.tipe === TipeTransaksiModal.PRIVE)
      .reduce((acc, curr) => acc + curr.nominal, 0);
  }, [transaksiModalList]);

  const saldoLaciKasir = useMemo(() => {
    if (activeShift && activeShift.outletId === effectiveOutletId) {
      return activeShift.tunaiSistem;
    }
    return saldoKasByOutlet[effectiveOutletId] || 0;
  }, [activeShift, effectiveOutletId, saldoKasByOutlet]);

  // Kas toko hanya Laci. Kas Besar & Bank tidak dipakai.
  const saldoKasBesar = 0;
  const saldoBank = 0;

  // Multi-outlet Stock Mutasi State & Handlers
  const [mutasiList, setMutasiList] = useState<MutasiStok[]>(() => {
    const stored = getStoredItem<MutasiStok[]>('mutasi_list', []);
    if (stored && stored.length > 0) return stored;
    return [
      {
        id: 'mut-1',
        nomor: 'MUT-001',
        outletAsalId: 'outlet-1',
        outletAsalNama: 'Toko Plastik Berkah Utama',
        outletTujuanId: 'outlet-2',
        outletTujuanNama: 'Toko Plastik Berkah Cabang 2',
        items: [
          {
            produkId: 'prod-kres-hd15',
            namaProduk: 'Kantong Kresek HD Bening 15x30',
            qty: 20,
          },
        ],
        biayaKirim: 15000,
        catatan: 'Restok rutin cabang 2',
        status: StatusMutasi.SELESAI,
        userId: 'user-owner',
        userNama: 'Budi Santoso',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];
  });

  useEffect(() => {
    setStoredItem('mutasi_list', mutasiList);
  }, [mutasiList]);

  const createMutasiStok = (data: {
    outletAsalId: string;
    outletTujuanId: string;
    items: Array<{ produkId: string; qty: number }>;
    catatan?: string;
    biayaKirim?: number;
  }) => {
    for (const it of data.items) {
      const curStock = getProdukStokForOutlet(it.produkId, data.outletAsalId);
      if (curStock < it.qty) {
        return { success: false, error: `Stok tidak mencukupi di cabang asal!` };
      }
    }
    const asal = outlets.find((o) => o.id === data.outletAsalId);
    const tujuan = outlets.find((o) => o.id === data.outletTujuanId);
    const dateNow = new Date().toISOString();

    const newMutasi: MutasiStok = {
      id: `mut-${Date.now()}`,
      nomor: `MUT-${Date.now().toString().slice(-6)}`,
      outletAsalId: data.outletAsalId,
      outletAsalNama: asal?.nama || 'Outlet Asal',
      outletTujuanId: data.outletTujuanId,
      outletTujuanNama: tujuan?.nama || 'Outlet Tujuan',
      items: data.items.map((i) => {
        const prodItem = produk.find((x) => x.id === i.produkId);
        return {
          produkId: i.produkId,
          namaProduk: prodItem?.nama || 'Produk',
          qty: i.qty,
        };
      }),
      biayaKirim: data.biayaKirim || 0,
      catatan: data.catatan,
      status: StatusMutasi.SELESAI,
      userId: currentUser.id,
      userNama: currentUser.nama,
      createdAt: dateNow,
    };

    const newMovements: StokMovement[] = [];
    setStokOutlet((prev) => {
      const updated = [...prev];
      for (const it of data.items) {
        const prodItem = produk.find((x) => x.id === it.produkId);
        const idxAsal = updated.findIndex((s) => s.produkId === it.produkId && s.outletId === data.outletAsalId);
        const prevAsal = idxAsal >= 0 ? updated[idxAsal].stok : 0;
        const hppPindah = idxAsal >= 0 ? updated[idxAsal].hpp : 0;
        const nextAsal = Math.max(0, prevAsal - it.qty);
        if (idxAsal >= 0) {
          updated[idxAsal] = { ...updated[idxAsal], stok: nextAsal };
        }

        const idxTujuan = updated.findIndex((s) => s.produkId === it.produkId && s.outletId === data.outletTujuanId);
        const prevTujuan = idxTujuan >= 0 ? updated[idxTujuan].stok : 0;
        const prevTujuanHpp = idxTujuan >= 0 ? updated[idxTujuan].hpp : hppPindah;
        const nextTujuan = prevTujuan + it.qty;
        const newHpp =
          nextTujuan > 0 ? Math.round((prevTujuan * prevTujuanHpp + it.qty * hppPindah) / nextTujuan) : hppPindah;
        if (idxTujuan >= 0) {
          updated[idxTujuan] = { ...updated[idxTujuan], stok: nextTujuan, hpp: newHpp };
        } else {
          updated.push({
            id: `stk-${Date.now()}-${it.produkId}`,
            produkId: it.produkId,
            outletId: data.outletTujuanId,
            stok: nextTujuan,
            stokMinimum: 5,
            hpp: newHpp,
          });
        }

        newMovements.push({
          id: `smov-mut-out-${Date.now()}-${it.produkId}`,
          produkId: it.produkId,
          namaProduk: prodItem?.nama || 'Produk',
          outletId: data.outletAsalId,
          jenis: JenisMovement.MUTASI_KELUAR,
          qty: -it.qty,
          stokSebelum: prevAsal,
          stokSesudah: nextAsal,
          refId: newMutasi.nomor,
          userId: currentUser.id,
          userNama: currentUser.nama,
          keterangan: `Mutasi ke ${tujuan?.nama || data.outletTujuanId}`,
          createdAt: dateNow,
        });
        newMovements.push({
          id: `smov-mut-in-${Date.now()}-${it.produkId}`,
          produkId: it.produkId,
          namaProduk: prodItem?.nama || 'Produk',
          outletId: data.outletTujuanId,
          jenis: JenisMovement.MUTASI_MASUK,
          qty: it.qty,
          stokSebelum: prevTujuan,
          stokSesudah: nextTujuan,
          refId: newMutasi.nomor,
          userId: currentUser.id,
          userNama: currentUser.nama,
          keterangan: `Mutasi dari ${asal?.nama || data.outletAsalId}`,
          createdAt: dateNow,
        });
      }
      return updated;
    });

    setStokMovementList((prev) => [...newMovements, ...prev]);
    setMutasiList((prev) => [newMutasi, ...prev]);
    return { success: true };
  };

  const processStockOpname = (data: {
    outletId: string;
    items: Array<{ produkId: string; stokSistem: number; stokFisik: number; selisih: number; catatan: string }>;
    catatan?: string;
  }) => {
    const withDiff = data.items.filter((it) => it.stokFisik !== it.stokSistem);
    if (withDiff.length === 0) {
      return { success: false, error: 'Hitungan fisik sama dengan stok sistem, tidak ada penyesuaian' };
    }

    const dateNow = new Date().toISOString();
    const newMovements: StokMovement[] = [];
    const newAudits: AuditLog[] = [];

    setStokOutlet((prev) => {
      const updated = [...prev];
      for (const it of withDiff) {
        const prod = produk.find((p) => p.id === it.produkId);
        if (!prod) continue;
        const stockIdx = updated.findIndex((s) => s.produkId === it.produkId && s.outletId === data.outletId);
        const prevStock = stockIdx >= 0 ? updated[stockIdx].stok : 0;
        const selisih = it.stokFisik - prevStock;
        if (stockIdx >= 0) {
          updated[stockIdx] = { ...updated[stockIdx], stok: it.stokFisik };
        } else {
          updated.push({
            id: `stk-${Date.now()}-${it.produkId}`,
            produkId: it.produkId,
            outletId: data.outletId,
            stok: it.stokFisik,
            stokMinimum: prod.stokMin ?? 5,
            hpp: prod.hargaRetail * 0.8,
          });
        }
        newMovements.push({
          id: `smov-opname-${Date.now()}-${it.produkId}`,
          produkId: it.produkId,
          namaProduk: prod.nama,
          outletId: data.outletId,
          jenis: JenisMovement.OPNAME_ADJUST,
          qty: selisih,
          stokSebelum: prevStock,
          stokSesudah: it.stokFisik,
          refId: `OPN-${dateNow.split('T')[0]}`,
          userId: currentUser.id,
          userNama: currentUser.nama,
          keterangan: `Stock Opname (${selisih > 0 ? '+' : ''}${selisih}). ${it.catatan || data.catatan || 'Opname'}`,
          createdAt: dateNow,
        });
        newAudits.push({
          id: `aud-${Date.now()}-${it.produkId}`,
          action: 'APPROVE_OPNAME',
          userId: currentUser.id,
          userNama: currentUser.nama,
          outletId: data.outletId,
          refId: prod.kode,
          detail: `Stock opname "${prod.nama}": dari ${prevStock} menjadi ${it.stokFisik} (${selisih}). ${it.catatan || data.catatan || ''}`,
          createdAt: dateNow,
        });
      }
      return updated;
    });

    setStokMovementList((prev) => [...newMovements, ...prev]);
    setAuditLogs((prev) => [...newAudits, ...prev]);
    return { success: true };
  };

  const recordPembelian = (data: {
    supplierId: string;
    outletId: string;
    items: Array<{ produkId: string; qty: number; hargaBeli: number; subtotal: number }>;
    total: number;
    metodeBayar: string;
    totalDibayar: number;
    sisaHutang: number;
    jatuhTempo: string | null;
    catatan?: string;
  }) => {
    return createPembelian({
      nomorNota: `INV-${Date.now().toString().slice(-6)}`,
      supplierId: data.supplierId,
      outletId: data.outletId,
      items: data.items.map((i) => ({ produkId: i.produkId, qty: i.qty, hargaBeli: i.hargaBeli })),
      statusBayar: data.sisaHutang > 0 ? StatusBayar.BELUM_BAYAR : StatusBayar.LUNAS,
      dpNominal: data.totalDibayar,
      jatuhTempo: data.jatuhTempo,
    });
  };

  const stokLedger: StokLedgerItem[] = useMemo(() => {
    return stokMovementList.map((sm) => ({
      id: sm.id,
      outletId: sm.outletId,
      produkId: sm.produkId,
      namaProduk: sm.namaProduk,
      tipe: sm.jenis,
      perubahan: sm.qty,
      stokSebelum: sm.stokSebelum,
      stokAkhir: sm.stokSesudah,
      referensi: sm.refId,
      keterangan: sm.keterangan || '-',
      createdAt: sm.createdAt,
      userNama: sm.userNama,
    }));
  }, [stokMovementList]);

  // Value
  const value: AppContextType = {
    isLoggedIn,
    currentUser,
    setCurrentUser,
    switchUser,
    logout,
    users,
    addUser,
    updateUser,
    deleteUser,
    isUserAssigned,
    userAssignedOutlet,
    activeOutletId,
    setActiveOutletId,
    activeOutlet,
    outlets,
    isDark,
    toggleTheme,
    theme: isDark ? 'dark' : 'light',
    modalUsaha,
    transaksiModalList,
    setSaldoAwalUsaha,
    tambahModalUsaha,
    catatPrive,
    deleteTransaksiModal,
    totalModalTerkumpul,
    totalPriveDitarik,
    saldoKasBesar,
    saldoBank,
    saldoLaciKasir,
    kategori,
    kategoriPengeluaran,
    produk,
    stokOutlet,
    pelanggan,
    suppliers,
    activeShift,
    shiftHistory,
    openShift,
    closeShift,
    transaksiList,
    createTransaksi,
    voidTransaksi,
    pembayaranPiutang,
    paySingleInvoice,
    payFIFOInvoices,
    pembelianList,
    pembayaranHutangList,
    createPembelian,
    payVendorInvoice,
    pecahKarungList,
    processPecahKarung,
    pengeluaranList,
    createPengeluaran,
    deletePengeluaran,
    stokMovementList,
    submitStockOpname,
    createOrUpdateProduk,
    importCSVProduk,
    bulkImportProduk,
    auditLogs,
    getProdukStokForOutlet,
    getProdukHPPForOutlet,
    hasStokRecordForOutlet,
    resetAllData,
    setCurrentUserRole,
    shifts,
    addPengeluaran,
    addProduk,
    updateProduk,
    addPelanggan,
    updatePelanggan,
    addSupplier,
    mutasiList,
    createMutasiStok,
    processStockOpname,
    recordPembelian,
    stokLedger,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
