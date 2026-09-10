import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Users,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Star,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JenisProduk, Produk, Pelanggan, Supplier, Role } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';
import { ExportImportModal } from './ExportImportModal';
import { UnassignedLock } from './UnassignedLock';
import { SearchableSelect } from './SearchableSelect';

interface MasterDataViewProps {
  onOrderFromSupplier?: (supplierId: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  onOrderFromSupplier,
}) => {
  const {
    produk,
    pelanggan,
    suppliers,
    kategori,
    addProduk,
    updateProduk,
    addPelanggan,
    updatePelanggan,
    addSupplier,
    activeOutlet,
    isUserAssigned,
    users,
    addUser,
    updateUser,
    deleteUser,
    outlets,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'produk' | 'pelanggan' | 'supplier' | 'pengguna'>('produk');
  const [search, setSearch] = useState('');
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Product Modal State
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodForm, setProdForm] = useState<Partial<Produk>>({
    kode: '',
    nama: '',
    kategoriId: 'kat-kresek',
    jenis: JenisProduk.STANDAR,
    satuan: 'pack',
    hargaRetail: 10000,
    hargaGrosir: 9000,
    minGrosir: 5,
    stokMin: 10,
    favorit: false,
    beratKemasanGram: null,
    biayaKemasan: null,
    indukId: null,
    aktif: true,
  });

  // Pelanggan Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [custForm, setCustForm] = useState<Partial<Pelanggan>>({
    nama: '',
    telepon: '',
    alamat: '',
    limitKredit: 5000000,
    defaultTempoHari: 14,
    aktif: true,
  });

  // Supplier Modal State
  const [isSuppModalOpen, setIsSuppModalOpen] = useState(false);
  const [suppForm, setSuppForm] = useState<Partial<Supplier>>({
    nama: '',
    telepon: '',
    alamat: '',
    kontakPerson: '',
    rekeningBank: '',
    aktif: true,
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    nama: '',
    username: '',
    role: Role.KASIR as Role,
    outletId: 'outlet-1' as string | null,
  });
  const [userError, setUserError] = useState<string>('');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return produk.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q);
    });
  }, [produk, search]);

  // Filtered Pelanggan
  const filteredPelanggan = useMemo(() => {
    return pelanggan.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.nama.toLowerCase().includes(q) || p.telepon.includes(q);
    });
  }, [pelanggan, search]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.nama.toLowerCase().includes(q) || s.telepon.includes(q);
    });
  }, [suppliers, search]);

  // Open Product Modal for Create / Edit
  const handleOpenProdModal = (item?: Produk) => {
    if (item) {
      setEditingProdId(item.id);
      setProdForm({ ...item });
    } else {
      setEditingProdId(null);
      const nextSku = `SKU-${String(produk.length + 1).padStart(3, '0')}`;
      setProdForm({
        kode: nextSku,
        nama: '',
        kategoriId: 'kat-kresek',
        jenis: JenisProduk.STANDAR,
        satuan: 'pack',
        hargaRetail: 10000,
        hargaGrosir: 9000,
        minGrosir: 5,
        stokMin: 10,
        favorit: false,
        beratKemasanGram: null,
        biayaKemasan: null,
        indukId: null,
        aktif: true,
      });
    }
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.nama || !prodForm.kode) return;

    if (editingProdId) {
      updateProduk(editingProdId, prodForm);
    } else {
      addProduk(prodForm as any);
    }
    setIsProdModalOpen(false);
  };

  // Handle Save Pelanggan
  const handleSavePelanggan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.nama) return;
    addPelanggan(custForm as any);
    setIsCustModalOpen(false);
  };

  // Handle Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppForm.nama) return;
    addSupplier(suppForm as any);
    setIsSuppModalOpen(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addUser({
      nama: userForm.nama,
      username: userForm.username,
      role: userForm.role,
      outletId: userForm.role === Role.OWNER ? null : userForm.outletId,
    });
    if (!res.success) {
      setUserError(res.error || 'Gagal menambah pengguna');
      return;
    }
    setIsUserModalOpen(false);
    setUserError('');
    setUserForm({ nama: '', username: '', role: Role.KASIR, outletId: 'outlet-1' });
  };

  if (!isUserAssigned) {
    return <UnassignedLock />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-amber-600" />
            <span>Master Data Toko Plastik & Bahan Kue</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Katalog barang, pelanggan B2B & umum, serta data supplier pabrik
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'produk' && (
            <>
              <button
                onClick={() => setIsExportImportOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 border border-stone-200 dark:border-stone-700 shadow-2xs transition-all cursor-pointer"
                title="Upload & Download data produk massal via file Excel / CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export & Import CSV</span>
              </button>
              <button
                onClick={() => handleOpenProdModal()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk</span>
              </button>
            </>
          )}

          {activeTab === 'pelanggan' && (
            <button
              onClick={() => setIsCustModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pelanggan</span>
            </button>
          )}

          {activeTab === 'supplier' && (
            <button
              onClick={() => setIsSuppModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Supplier</span>
            </button>
          )}

          {activeTab === 'pengguna' && currentUser.role === Role.OWNER && (
            <button
              onClick={() => {
                setUserError('');
                setIsUserModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
        {[
          { id: 'produk', label: `Katalog Produk (${produk.length})`, icon: Package },
          { id: 'pelanggan', label: `Pelanggan & Limit Kredit (${pelanggan.length})`, icon: Users },
          { id: 'supplier', label: `Supplier Vendor (${suppliers.length})`, icon: Truck },
          { id: 'pengguna', label: `Pengguna (${users.length})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearch('');
              }}
              className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari data..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100"
        />
      </div>

      {/* TAB 1: PRODUK TABLE */}
      {activeTab === 'produk' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Kode SKU</th>
                  <th className="py-3 px-3.5 font-bold">Nama Produk</th>
                  <th className="py-3 px-3.5 font-bold">Jenis</th>
                  <th className="py-3 px-3.5 font-bold">Kategori</th>
                  <th className="py-3 px-3.5 font-bold text-center">Satuan</th>
                  <th className="py-3 px-3.5 font-bold text-right">Harga Retail</th>
                  <th className="py-3 px-3.5 font-bold text-right">Harga Grosir</th>
                  <th className="py-3 px-3.5 font-bold text-right">Min. Grosir</th>
                  <th className="py-3 px-3.5 font-bold text-right">Min. Stok (Alert)</th>
                  <th className="py-3 px-3.5 font-bold text-center">Favorit</th>
                  <th className="py-3 px-3.5 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3.5 font-mono text-stone-400">{p.kode}</td>
                    <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">
                      {p.nama}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          p.jenis === JenisProduk.KARUNG
                            ? 'bg-amber-100 text-amber-800'
                            : p.jenis === JenisProduk.ECER
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {p.jenis}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-stone-500">{p.kategoriId.replace('kat-', '')}</td>
                    <td className="py-3 px-3.5 text-center text-stone-600">{p.satuan}</td>
                    <td className="py-3 px-3.5 text-right font-black text-stone-900 dark:text-stone-100">
                      {formatRupiah(p.hargaRetail)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-amber-600">
                      {p.hargaGrosir ? formatRupiah(p.hargaGrosir) : '-'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-medium text-stone-500">
                      {p.minGrosir ? `≥ ${p.minGrosir}` : '-'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {p.stokMin ?? 5} <span className="text-[10px] font-normal text-stone-400">{p.satuan}</span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {p.favorit && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 mx-auto" />}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => handleOpenProdModal(p)}
                        className="p-1 rounded text-stone-400 hover:text-amber-600 hover:bg-stone-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PELANGGAN TABLE */}
      {activeTab === 'pelanggan' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Nama Pelanggan / Usaha</th>
                  <th className="py-3 px-3.5 font-bold">Nomor Telepon / WA</th>
                  <th className="py-3 px-3.5 font-bold">Alamat</th>
                  <th className="py-3 px-3.5 font-bold text-right">Limit Kredit</th>
                  <th className="py-3 px-3.5 font-bold text-center">Tempo Bayar</th>
                  <th className="py-3 px-3.5 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredPelanggan.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">{c.nama}</td>
                    <td className="py-3 px-3.5 text-stone-600">{c.telepon}</td>
                    <td className="py-3 px-3.5 text-stone-500">{c.alamat}</td>
                    <td className="py-3 px-3.5 text-right font-black text-amber-600">
                      {c.limitKredit !== null ? formatRupiah(c.limitKredit) : 'Tidak Terbatas'}
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold">{c.defaultTempoHari} Hari</td>
                    <td className="py-3 px-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIER TABLE */}
      {activeTab === 'supplier' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Nama Supplier / Pabrik</th>
                  <th className="py-3 px-3.5 font-bold">Kontak Person</th>
                  <th className="py-3 px-3.5 font-bold">Telepon</th>
                  <th className="py-3 px-3.5 font-bold">Alamat</th>
                  <th className="py-3 px-3.5 font-bold">Info Rekening</th>
                  <th className="py-3 px-3.5 font-bold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">{s.nama}</td>
                    <td className="py-3 px-3.5 text-stone-600">{s.kontakPerson || '-'}</td>
                    <td className="py-3 px-3.5 text-stone-600">{s.telepon}</td>
                    <td className="py-3 px-3.5 text-stone-500">{s.alamat}</td>
                    <td className="py-3 px-3.5 font-mono text-stone-600">{s.rekeningBank || '-'}</td>
                    <td className="py-3 px-3.5 text-right">
                      {onOrderFromSupplier ? (
                        <button
                          type="button"
                          onClick={() => onOrderFromSupplier(s.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          title={`Beli produk dari ${s.nama}`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Beli ke Supplier</span>
                        </button>
                      ) : (
                        <span className="text-stone-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pengguna' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Nama</th>
                  <th className="py-3 px-3.5 font-bold">Username</th>
                  <th className="py-3 px-3.5 font-bold">Role</th>
                  <th className="py-3 px-3.5 font-bold">Outlet</th>
                  <th className="py-3 px-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {users.map((u) => {
                  const assigned = outlets.find((o) => o.id === u.outletId);
                  return (
                    <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">{u.nama}</td>
                      <td className="py-3 px-3.5 font-mono">{u.username}</td>
                      <td className="py-3 px-3.5">{u.role}</td>
                      <td className="py-3 px-3.5">
                        {u.role === Role.OWNER ? 'Global' : assigned?.nama || 'Belum ditugaskan'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {currentUser.role === Role.OWNER && u.id !== currentUser.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteUser(u.id);
                              if (!res.success) alert(res.error);
                            }}
                            className="px-3 py-1.5 rounded-xl text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            Hapus
                          </button>
                        ) : (
                          <span className="text-stone-400">Aktif</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pengguna' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="py-3 px-3.5 font-bold">Nama</th>
                  <th className="py-3 px-3.5 font-bold">Username</th>
                  <th className="py-3 px-3.5 font-bold">Role</th>
                  <th className="py-3 px-3.5 font-bold">Outlet</th>
                  <th className="py-3 px-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {users.map((u) => {
                  const assigned = outlets.find((o) => o.id === u.outletId);
                  return (
                    <tr key={u.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-3.5 font-bold text-stone-900 dark:text-stone-100">{u.nama}</td>
                      <td className="py-3 px-3.5 font-mono">{u.username}</td>
                      <td className="py-3 px-3.5">{u.role}</td>
                      <td className="py-3 px-3.5">{u.role === Role.OWNER ? 'Global' : assigned?.nama || 'Belum ditugaskan'}</td>
                      <td className="py-3 px-3.5 text-right">
                        {currentUser.role === Role.OWNER && u.id !== currentUser.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteUser(u.id);
                              if (!res.success) alert(res.error);
                            }}
                            className="px-3 py-1.5 rounded-xl text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            Hapus
                          </button>
                        ) : (
                          <span className="text-stone-400">Aktif</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isProdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/60">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                {editingProdId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setIsProdModalOpen(false)} className="text-stone-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    value={prodForm.kode || ''}
                    onChange={(e) => setProdForm({ ...prodForm, kode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Kategori
                  </label>
                  <SearchableSelect
                    id="prod-kategori"
                    options={kategori.map((k) => ({ value: k.id, label: k.nama }))}
                    value={prodForm.kategoriId || ''}
                    onChange={(v) => setProdForm({ ...prodForm, kategoriId: v })}
                    placeholder="Pilih kategori"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plastik Klip 10x15 Transparan"
                  value={prodForm.nama || ''}
                  onChange={(e) => setProdForm({ ...prodForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Jenis Produk
                  </label>
                  <SearchableSelect
                    id="prod-jenis"
                    options={[
                      { value: JenisProduk.STANDAR, label: 'STANDAR' },
                      { value: JenisProduk.KARUNG, label: 'KARUNG' },
                      { value: JenisProduk.ECER, label: 'ECER' },
                      { value: JenisProduk.SATUAN, label: 'SATUAN' },
                    ]}
                    value={prodForm.jenis || JenisProduk.STANDAR}
                    onChange={(v) => setProdForm({ ...prodForm, jenis: v as JenisProduk })}
                    placeholder="Jenis"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    placeholder="pack, kg, rol"
                    value={prodForm.satuan || ''}
                    onChange={(e) => setProdForm({ ...prodForm, satuan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center justify-between">
                    <span>Min. Stok Alert</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Pemicu Restock</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.stokMin ?? 5}
                    onChange={(e) => setProdForm({ ...prodForm, stokMin: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-black text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 10"
                  />
                  <div className="text-[10px] text-stone-400 mt-0.5">Batas peringatan restock</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Harga Jual Retail (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={prodForm.hargaRetail || 0}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, hargaRetail: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-black text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Harga Jual Grosir (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={prodForm.hargaGrosir || 0}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, hargaGrosir: parseInt(e.target.value, 10) || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-black text-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Min. Qty Ambil Grosir
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={prodForm.minGrosir || 5}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, minGrosir: parseInt(e.target.value, 10) || null })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center pt-5 gap-2">
                  <input
                    type="checkbox"
                    id="favoritCheck"
                    checked={prodForm.favorit}
                    onChange={(e) => setProdForm({ ...prodForm, favorit: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded"
                  />
                  <label htmlFor="favoritCheck" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Produk Cepat Kasir (Favorit)
                  </label>
                </div>
              </div>

              {/* Special Fields for KARUNG or ECER */}
              {(prodForm.jenis === JenisProduk.KARUNG || prodForm.jenis === JenisProduk.ECER) && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    SETELAN KHUSUS KARUNG / ECERAN:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Berat Satuan (Gram)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prodForm.beratKemasanGram || ''}
                        onChange={(e) =>
                          setProdForm({
                            ...prodForm,
                            beratKemasanGram: parseInt(e.target.value, 10) || null,
                          })
                        }
                        placeholder="e.g. 250, 500, 25000"
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                      />
                    </div>
                    {prodForm.jenis === JenisProduk.ECER && (
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Biaya Kemasan (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={prodForm.biayaKemasan || ''}
                          onChange={(e) =>
                            setProdForm({
                              ...prodForm,
                              biayaKemasan: parseInt(e.target.value, 10) || null,
                            })
                          }
                          placeholder="e.g. 250"
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProdModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PELANGGAN MODAL */}
      {isCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
              Tambah Pelanggan Baru (B2B / Grosir)
            </h3>

            <form onSubmit={handleSavePelanggan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Toko / Usaha / Pelanggan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warung Bu Sri / Bakery Mantap"
                  value={custForm.nama || ''}
                  onChange={(e) => setCustForm({ ...custForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="0812..."
                    value={custForm.telepon || ''}
                    onChange={(e) => setCustForm({ ...custForm, telepon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Default Tempo (Hari)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={custForm.defaultTempoHari || 14}
                    onChange={(e) =>
                      setCustForm({ ...custForm, defaultTempoHari: parseInt(e.target.value, 10) || 14 })
                    }
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Limit Kredit Maksimal (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  value={custForm.limitKredit || 0}
                  onChange={(e) =>
                    setCustForm({ ...custForm, limitKredit: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border text-xs font-black text-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Jl. Pasar Baru No. 12"
                  value={custForm.alamat || ''}
                  onChange={(e) => setCustForm({ ...custForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-2xs"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {isSuppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Tambah Data Supplier</h3>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Pabrik / Supplier
                </label>
                <input
                  type="text"
                  placeholder="e.g. PT Sinar Plastindo Sejahtera"
                  value={suppForm.nama || ''}
                  onChange={(e) => setSuppForm({ ...suppForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Kontak Sales / PIC
                  </label>
                  <input
                    type="text"
                    placeholder="Bpk. Hendra"
                    value={suppForm.kontakPerson || ''}
                    onChange={(e) => setSuppForm({ ...suppForm, kontakPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="021-..."
                    value={suppForm.telepon || ''}
                    onChange={(e) => setSuppForm({ ...suppForm, telepon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nomor Rekening Bank
                </label>
                <input
                  type="text"
                  placeholder="BCA 12345678 a/n PT Sinar..."
                  value={suppForm.rekeningBank || ''}
                  onChange={(e) => setSuppForm({ ...suppForm, rekeningBank: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Alamat Pabrik / Gudang
                </label>
                <input
                  type="text"
                  placeholder="Kawasan Industri..."
                  value={suppForm.alamat || ''}
                  onChange={(e) => setSuppForm({ ...suppForm, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuppModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-2xs"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT & IMPORT MODAL */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onSuccessToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <form
            onSubmit={handleSaveUser}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl p-5 space-y-3 border border-stone-200 dark:border-stone-800"
          >
            <h3 className="font-black text-sm">Tambah Pengguna</h3>
            {userError && <p className="text-xs text-rose-600 font-semibold">{userError}</p>}
            <input
              required
              placeholder="Nama lengkap"
              value={userForm.nama}
              onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
              className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-sm"
            />
            <input
              required
              placeholder="Username"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-sm"
            />
            <SearchableSelect
              id="user-role"
              label="Role"
              options={[
                { value: Role.OWNER, label: 'OWNER' },
                { value: Role.MANAGER, label: 'MANAGER' },
                { value: Role.KASIR, label: 'KASIR' },
                { value: Role.GUDANG, label: 'GUDANG' },
              ]}
              value={userForm.role}
              onChange={(v) => setUserForm({ ...userForm, role: v as Role })}
            />
            {userForm.role !== Role.OWNER && (
              <SearchableSelect
                id="user-outlet"
                label="Outlet"
                options={outlets.map((o) => ({ value: o.id, label: o.nama }))}
                value={userForm.outletId || ''}
                onChange={(v) => setUserForm({ ...userForm, outletId: v })}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold">
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 p-4 rounded-2xl bg-stone-900 text-white shadow-xl flex items-center gap-3 border border-stone-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
