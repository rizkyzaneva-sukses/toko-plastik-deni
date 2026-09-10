export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  KASIR = 'KASIR',
  GUDANG = 'GUDANG',
}

export enum JenisProduk {
  SATUAN = 'SATUAN',
  STANDAR = 'STANDAR',
  KARUNG = 'KARUNG',
  ECER = 'ECER',
}

export enum MetodeBayar {
  TUNAI = 'TUNAI',
  QRIS = 'QRIS',
  TRANSFER = 'TRANSFER',
  KREDIT = 'KREDIT',
  CAMPURAN = 'CAMPURAN',
}

export enum StatusBayar {
  LUNAS = 'LUNAS',
  SEBAGIAN = 'SEBAGIAN',
  BELUM_BAYAR = 'BELUM_BAYAR',
}

export enum SumberDana {
  LACI_KASIR = 'LACI_KASIR',
  KAS_BESAR = 'KAS_BESAR',
  BANK = 'BANK',
}

export enum JenisMovement {
  MASUK_PEMBELIAN = 'MASUK_PEMBELIAN',
  KELUAR_PENJUALAN = 'KELUAR_PENJUALAN',
  PECAH_KELUAR = 'PECAH_KELUAR',
  PECAH_MASUK = 'PECAH_MASUK',
  OPNAME_ADJUST = 'OPNAME_ADJUST',
  RETUR = 'RETUR',
  KOREKSI = 'KOREKSI',
}

export interface Outlet {
  id: string;
  nama: string;
  alamat: string;
  telepon: string;
  aktif: boolean;
}

export interface User {
  id: string;
  nama: string;
  username: string;
  role: Role;
  outletId: string | null; // null for OWNER who can view all outlets
  aktif: boolean;
}

export interface Kategori {
  id: string;
  nama: string;
}

export interface Produk {
  id: string;
  kode: string;
  nama: string;
  kategoriId: string;
  jenis: JenisProduk;
  satuan: string;
  hargaRetail: number;
  hargaGrosir: number | null;
  minGrosir: number | null;
  beratKemasanGram: number | null; // for ECER or KARUNG
  biayaKemasan: number | null;     // packaging bag cost for ECER
  indukId?: string | null;         // if ECER, references the KARUNG product
  stokMin?: number;                // minimum stock threshold for warning
  favorit?: boolean;               // for quick cashier grid
  aktif: boolean;
}

export interface StokOutlet {
  id: string;
  produkId: string;
  outletId: string;
  stok: number;
  stokMinimum: number;
  hpp: number; // moving average per outlet (hidden from KASIR)
}

export interface Pelanggan {
  id: string;
  nama: string;
  telepon: string;
  alamat: string;
  limitKredit: number | null; // null = unlimited
  defaultTempoHari: number;
  catatan: string;
  aktif: boolean;
}

export interface Supplier {
  id: string;
  nama: string;
  telepon: string;
  alamat: string;
  kontakPerson: string;
  rekeningBank?: string;
  aktif: boolean;
}

export interface ItemTransaksi {
  id: string;
  transaksiId: string;
  produkId: string;
  namaProduk: string;
  qty: number;
  hargaSatuan: number;
  pakaiGrosir: boolean;
  subtotal: number;
  hppSaatJual: number; // frozen HPP for historical margin
  hppSnapshot?: number; // alias for hppSaatJual
}

export interface Transaksi {
  id: string;
  nomor: string;
  outletId: string;
  shiftId: string;
  kasirId: string;
  kasirNama: string;
  pelangganId: string | null;
  pelangganNama?: string;
  subtotal: number;
  diskon: number;
  total: number;
  metodeBayar: MetodeBayar;
  statusBayar: StatusBayar;
  totalDibayar: number;
  sisaPiutang: number;
  uangDiterima: number;
  kembalian: number;
  jatuhTempo: string | null; // YYYY-MM-DD
  voided: boolean;
  alasanVoid?: string;
  createdAt: string; // ISO string
  items: ItemTransaksi[];
}

export interface PembayaranPiutang {
  id: string;
  transaksiId: string;
  nomorNota: string;
  pelangganId: string;
  pelangganNama: string;
  nominal: number;
  metodeBayar: MetodeBayar;
  shiftId: string | null; // if cash received during cashier shift
  userId: string;
  userNama: string;
  catatan?: string;
  createdAt: string;
}

export interface ItemPembelian {
  id: string;
  produkId: string;
  namaProduk: string;
  qty: number;
  hargaBeli: number;
  subtotal: number;
}

export interface Pembelian {
  id: string;
  nomor?: string; // alias for nomorNota
  nomorNota: string;
  supplierId: string;
  supplierNama: string;
  outletId: string;
  total: number;
  statusBayar: StatusBayar;
  totalDibayar: number;
  sisaHutang: number;
  jatuhTempo: string | null;
  createdAt: string;
  items: ItemPembelian[];
}

export interface PembayaranHutang {
  id: string;
  pembelianId: string;
  nomorNota: string;
  supplierId: string;
  supplierNama: string;
  nominal: number;
  metodeBayar: MetodeBayar;
  userId: string;
  createdAt: string;
}

export interface KategoriPengeluaran {
  id: string;
  nama: string;
}

export interface Pengeluaran {
  id: string;
  outletId: string;
  kategoriId: string;
  kategoriNama: string;
  kategori?: string; // alias for kategoriNama
  tanggal: string; // YYYY-MM-DD
  nominal: number;
  metodeBayar: MetodeBayar;
  sumberDana: SumberDana;
  keterangan: string;
  catatan?: string; // alias for keterangan
  shiftId: string | null; // if deducted from LACI_KASIR
  dariLaciKasir?: boolean; // alias for shiftId !== null
  userId: string;
  userNama: string;
  createdAt: string;
}

export interface HasilPecahItem {
  produkEcerId: string;
  namaProdukEcer: string;
  beratKemasanGram: number;
  qtyKemasan: number; // e.g. 40 bungkus 1/4kg
  totalGram: number;   // 40 * 250 = 10,000 gram
  hppEcerSatuan: number;
}

export interface PecahKarung {
  id: string;
  outletId: string;
  produkIndukId: string;
  namaProdukInduk: string;
  jumlahKarung: number;
  beratIndukAktualGram: number; // e.g. 25000g
  totalGramHasil: number;
  susutGram: number;
  susutPersen: number;
  keterangan: string;
  petugasId: string;
  petugasNama: string;
  createdAt: string;
  hasil: HasilPecahItem[];
}

export interface StokMovement {
  id: string;
  produkId: string;
  namaProduk: string;
  outletId: string;
  jenis: JenisMovement;
  qty: number; // positive = in, negative = out
  stokSebelum: number;
  stokSesudah: number;
  refId: string; // invoice no, split id, or memo
  userId: string;
  userNama: string;
  keterangan?: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  outletId: string;
  outletNama?: string;
  kasirId: string;
  kasirNama: string;
  userNama?: string;
  modalAwal: number;
  tunaiSistem: number; // modalAwal + penjualan tunai + bayar piutang tunai - pengeluaran laci
  tunaiFisik: number | null;
  selisih: number | null; // tunaiFisik - tunaiSistem
  penjualanTunai: number;
  penjualanNonTunai: number;
  pembayaranPiutangTunai: number;
  pengeluaranLaci: number;
  totalTransaksi: number;
  dibuka: string;
  ditutup: string | null;
  waktuBuka?: string;
  waktuTutup?: string | null;
  status: 'BUKA' | 'TUTUP';
}

export interface AuditLog {
  id: string;
  action: 'UBAH_HARGA' | 'VOID' | 'DISKON_MANUAL' | 'WRITE_OFF' | 'OVERRIDE_STOK' | 'APPROVE_OPNAME';
  userId: string;
  userNama: string;
  outletId: string;
  refId: string;
  detail: string;
  createdAt: string;
}

export type ShiftKasir = Shift;

export enum StatusMutasi {
  SELESAI = 'SELESAI',
  TRANSIT = 'TRANSIT',
  BATAL = 'BATAL',
}

export enum TipeLedger {
  MASUK = 'MASUK',
  KELUAR = 'KELUAR',
  PECAH_KARUNG = 'PECAH_KARUNG',
  MUTASI_KIRIM = 'MUTASI_KIRIM',
  MUTASI_TERIMA = 'MUTASI_TERIMA',
  OPNAME = 'OPNAME',
}

export interface MutasiItem {
  produkId: string;
  namaProduk: string;
  qty: number;
}

export interface MutasiStok {
  id: string;
  nomor: string;
  outletAsalId: string;
  outletAsalNama: string;
  outletTujuanId: string;
  outletTujuanNama: string;
  items: MutasiItem[];
  biayaKirim: number;
  catatan?: string;
  status: StatusMutasi;
  userId: string;
  userNama: string;
  createdAt: string;
}

export interface StokLedgerItem {
  id: string;
  outletId: string;
  produkId: string;
  namaProduk: string;
  tipe: TipeLedger | string;
  perubahan: number;
  stokSebelum: number;
  stokAkhir: number;
  referensi: string;
  keterangan: string;
  createdAt: string;
  userNama: string;
}

export enum SumberModal {
  INVESTOR = 'INVESTOR',
  UTANG = 'UTANG',
  UANG_SENDIRI = 'UANG_SENDIRI',
}

export enum TipeTransaksiModal {
  SALDO_AWAL = 'SALDO_AWAL',
  TAMBAH_MODAL = 'TAMBAH_MODAL',
  PRIVE = 'PRIVE',
}

export interface TransaksiModal {
  id: string;
  outletId: string | null;
  tanggal: string; // YYYY-MM-DD
  tipe: TipeTransaksiModal;
  sumberModal?: SumberModal; // INVESTOR, UTANG, UANG_SENDIRI
  nominal: number;
  keterangan: string;
  penyetor: string; // nama investor, kreditur, atau pemilik
  sumberKasTujuan: SumberDana; // KAS_BESAR, BANK, LACI_KASIR
  userId: string;
  userNama: string;
  createdAt: string;
}

export interface ModalUsahaState {
  saldoAwal: number;
  tanggalMulai: string;
  keterangan: string;
}



