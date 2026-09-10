import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Search,
  ShoppingCart,
  Truck,
  Scissors,
  AlertTriangle,
  FileSpreadsheet,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ListOrdered,
  BookMarked,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface GuideChapter {
  id: string;
  chapterNumber: number;
  title: string;
  shortTitle: string;
  category: string;
  icon: React.ElementType;
  iconColor: string;
  summary: string;
  content: {
    overview: string;
    flowSteps: Array<{
      stepNumber: number;
      title: string;
      description: string;
      highlight?: string;
    }>;
    caseStudy?: {
      title: string;
      details: string[];
    };
    fieldTips: string[];
  };
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'paged' | 'continuous'>('paged');

  if (!isOpen) return null;

  const chapters: GuideChapter[] = [
    {
      id: 'kasir-pos',
      chapterNumber: 1,
      title: 'Kasir POS, Grosir Bertingkat, & Piutang B2B',
      shortTitle: '1. Kasir & Grosir',
      category: 'Operasional Harian',
      icon: ShoppingCart,
      iconColor: 'text-amber-600 bg-amber-500/10',
      summary:
        'Alur melayani transaksi pembeli eceran maupun pedagang langganan. Harga grosir otomatis turun sesuai volume pembelian tanpa perlu dihitung manual.',
      content: {
        overview:
          'Modul Kasir dirancang untuk kecepatan transaksi di toko plastik yang sibuk. Kasir dapat melayani penjualan eceran per pack atau grosir per bal/ikat dengan scanner barcode fisik atau pencarian instan.',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Memilih Produk ke Keranjang Belanja',
            description:
              'Ketik nama atau kode SKU pada kolom pencarian kasir, scan barcode kemasan dengan alat barcode scanner, atau klik langsung pada kartu produk populer.',
            highlight: 'Scanner barcode fisik langsung aktif tanpa perlu klik mouse tambahan.',
          },
          {
            stepNumber: 2,
            title: 'Penurunan Harga Grosir Otomatis (Tier Pricing)',
            description:
              'Ketika kuantitas barang dalam keranjang mencapai jumlah minimum grosir (misal: minimal 5 pack), sistem otomatis mengubah harga per satuan menjadi Harga Grosir.',
            highlight: 'Kasir tidak perlu menghafal harga atau menekan tombol diskon khusus.',
          },
          {
            stepNumber: 3,
            title: 'Menentukan Pelanggan & Metode Pembayaran',
            description:
              'Untuk pembeli biasa yang langsung lunas, biarkan sebagai "Pelanggan Umum (Cash)" dan pilih pembayaran Tunai. Untuk warung/toko langganan yang bayar tempo (Kredit/Piutang), pilih nama pelanggan dari daftar agar tercatat ke buku piutang mereka.',
            highlight: 'Sistem otomatis mengecek sisa limit plafon kredit pelanggan sebelum nota dicetak.',
          },
          {
            stepNumber: 4,
            title: 'Penerimaan Uang & Cetak Struk',
            description:
              'Ketik nominal uang yang diterima dari pembeli atau klik tombol uang pas. Layar akan menampilkan jumlah kembalian secara presisi. Tekan Enter atau klik Cetak Struk 58mm untuk menyelesaikan transaksi.',
            highlight: 'Uang masuk otomatis menambah saldo tunai kasir shift yang sedang berjalan.',
          },
        ],
        caseStudy: {
          title: 'Contoh Nyata: Pembelian Kantong Kresek HD 15',
          details: [
            'Harga Retail normal: Rp 6.500 / pack (Beli 1 - 4 pack).',
            'Batas Grosir: Minimal 5 pack.',
            'Jika pembeli memesan 5 pack, harga otomatis menjadi Rp 5.800 / pack. Total: Rp 29.000 (hemat Rp 3.500).',
            'Struk belanja akan memperlihatkan potongan harga grosir tersebut secara transparan kepada pelanggan.',
          ],
        },
        fieldTips: [
          'Jika stok produk sudah berada di bawah batas minimum, produk akan diberi tanda peringatan di layar kasir agar kasir dapat mengingatkan gudang.',
          'Penjualan dengan metode piutang wajib diverifikasi nama pelanggannya agar kartu tagihan tempo tercatat rapi.',
        ],
      },
    },
    {
      id: 'beli-supplier',
      chapterNumber: 2,
      title: 'Beli Produk ke Supplier & Restock Barang Masuk',
      shortTitle: '2. Beli ke Supplier',
      category: 'Pengadaan & Stok',
      icon: Truck,
      iconColor: 'text-blue-600 bg-blue-500/10',
      summary:
        'Cara mencatat barang masuk kiriman dari pabrik atau distributor distributor, baik pembayaran kontan tunai maupun faktur tempo (hutang supplier).',
      content: {
        overview:
          'Setiap kali kiriman barang dari pabrik plastik (seperti PT Panca Budi, CV Sumber Plastik, dll) tiba di toko, staf harus mencatatnya agar stok bertambah dan HPP modal barang diperbarui dengan rumus rata-rata bergerak (Moving Average Cost).',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Membuka Form Pembelian Barang Masuk',
            description:
              'Di menu navigasi, buka tab "Stok & Cabang" lalu klik sub-tab "Beli ke Supplier (Restock)" atau klik tombol "🛒 Beli ke Supplier" di bagian atas.',
            highlight: 'Bisa juga diakses langsung dari menu mobile "Lainnya" -> Beli Produk ke Supplier.',
          },
          {
            stepNumber: 2,
            title: 'Memilih Supplier & Produk yang Diterima',
            description:
              'Pilih nama supplier pabrik yang mengirim barang. Kemudian cari produk barang yang diterima sesuai surat jalan atau nota faktur pengiriman.',
            highlight: 'Jika ada supplier baru, daftarkan terlebih dahulu di Data Master -> Supplier.',
          },
          {
            stepNumber: 3,
            title: 'Memasukkan Jumlah Barang & Harga Beli Faktur',
            description:
              'Ketik jumlah kuantitas unit barang yang masuk gudang dan harga beli satuan netto dari pabrik. Sistem otomatis menghitung total nilai faktur.',
            highlight: 'Sistem langsung memperbarui HPP modal barang tanpa menghapus riwayat HPP sebelumnya.',
          },
          {
            stepNumber: 4,
            title: 'Memilih Pembayaran: Tunai Lunas atau Tempo',
            description:
              'Pilih "Tunai" jika toko langsung membayar kontan saat barang turun. Pilih "Tempo (Kredit)" jika pabrik memberikan termin bayar (misal 14 atau 30 hari), lalu isi tanggal jatuh tempo nota.',
            highlight: 'Faktur tempo otomatis masuk ke buku Hutang Toko yang dapat dipantau di tab Hutang-Piutang.',
          },
        ],
        caseStudy: {
          title: 'Perhitungan Otomatis HPP Bergerak (Moving Average)',
          details: [
            'Stok lama: 10 pack @ modal Rp 10.000 (Total Rp 100.000).',
            'Barang masuk baru: 20 pack @ modal Rp 11.500 (Total Rp 230.000).',
            'Stok akhir gudang: 30 pack.',
            'HPP Baru Otomatis = (Rp 100.000 + Rp 230.000) / 30 = Rp 11.000 / pack.',
            'Dengan metode ini, laporan laba rugi toko tetap akurat walaupun harga pabrik naik turun.',
          ],
        },
        fieldTips: [
          'Selalu cocokkan fisik barang yang turun dari truk dengan jumlah di surat jalan sebelum menekan Simpan Pembelian.',
          'Catat nomor nota/faktur pabrik di kolom memo/keterangan agar memudahkan pencocokan tagihan bulanan.',
        ],
      },
    },
    {
      id: 'pecah-karung',
      chapterNumber: 3,
      title: 'Pecah Karung Plastik (25 kg ke Kemasan Eceran)',
      shortTitle: '3. Pecah Karung',
      category: 'Fitur Khusus Plastik',
      icon: Scissors,
      iconColor: 'text-amber-600 bg-amber-500/10',
      summary:
        'Fitur unggulan toko plastik untuk mengonversi karung besar menjadi puluhan/ratusan bungkus siap jual dengan kalkulasi susut timbangan dan HPP baru.',
      content: {
        overview:
          'Toko plastik sering membeli barang dalam skala karung besar (misal 1 karung OPP / Mika berat 25 kg) dari pabrik, lalu karyawan toko menimbang dan mengemas ulang menjadi bungkus 250 gram, 500 gram, atau 1 kg.',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Buka Menu Pecah Karung',
            description:
              'Pilih menu "Pecah Karung" (ikon gunting) pada navigasi aplikasi.',
            highlight: 'Pastikan karung induk sudah tercatat memiliki stok di outlet Anda.',
          },
          {
            stepNumber: 2,
            title: 'Pilih Karung Induk yang Akan Dibuka',
            description:
              'Pilih barang karung induk yang akan dipecah (misal: "Karung Plastik PP Bening 25kg"). Masukkan berat aktual hasil timbangan jika berbeda dari berat label.',
            highlight: 'Sistem menampilkan modal awal karung tersebut untuk dasar kalkulasi.',
          },
          {
            stepNumber: 3,
            title: 'Tentukan Target Produk Eceran & Jumlah Kemasan',
            description:
              'Pilih produk eceran tujuan (misal: "Plastik PP Bening 250gr"). Ketik berapa pack bungkus yang berhasil dihasilkan dari penimbangan tersebut.',
            highlight: 'Bisa memecah ke 1 jenis ukuran maupun beberapa ukuran sekaligus.',
          },
          {
            stepNumber: 4,
            title: 'Input Biaya Kemasan Tambahan (Bila Ada)',
            description:
              'Jika ada biaya plastik pembungkus luar, karet gelang, atau lakban, masukkan nominalnya di kolom biaya kemasan.',
            highlight: 'Biaya kemasan akan ditambahkan ke modal HPP eceran secara proporsional.',
          },
          {
            stepNumber: 5,
            title: 'Konfirmasi Proses Pecah Karung',
            description:
              'Setelah dicek, klik "Proses Pecah Karung". Seketika stok karung induk berkurang 1 unit, dan stok produk eceran bertambah sesuai hasil timbangan.',
            highlight: 'HPP satuan eceran otomatis dihitung dan disimpan di master produk.',
          },
        ],
        caseStudy: {
          title: 'Contoh Perhitungan Susut & Margin',
          details: [
            '1 Karung PP 25kg dibeli seharga Rp 500.000.',
            'Ditimbang dan dikemas menjadi 48 pack @ 500 gram (Total 24 kg).',
            'Ada susut timbangan debu/potongan: 1 kg (4%).',
            'Biaya plastik pembungkus eceran: Rp 10.000.',
            'HPP Modal per Pack Eceran = (Rp 500.000 + Rp 10.000) / 48 = Rp 10.625 / pack.',
            'Dijual eceran Rp 14.000 / pack -> Toko menghasilkan margin laba bersih yang optimal.',
          ],
        },
        fieldTips: [
          'Lakukan audit timbangan berkala. Jika susut melebihi 3-5%, cek kalibrasi timbangan digital di bagian packing.',
          'Riwayat pecah karung tersimpan rapi untuk memantau performa dan efisiensi tim packing.',
        ],
      },
    },
    {
      id: 'stok-minimum',
      chapterNumber: 4,
      title: 'Batas Stok Minimum & Peringatan Dini Restock',
      shortTitle: '4. Stok Minimum',
      category: 'Manajemen Inventori',
      icon: AlertTriangle,
      iconColor: 'text-rose-600 bg-rose-500/10',
      summary:
        'Mencegah toko kehabisan barang laris saat jam sibuk. Sistem otomatis memberi peringatan visual saat stok menyentuh batas aman.',
      content: {
        overview:
          'Kehabisan kantong kresek ukuran populer (seperti kresek 15 atau 24) saat pelanggan ramai berbelanja adalah kerugian besar bagi toko plastik. Fitur stok minimum memastikan Anda selalu tahu kapan waktu yang tepat untuk order ke pabrik.',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Menentukan Angka Batas Minimum per Produk',
            description:
              'Di menu "Stok & Cabang" atau "Data Master", klik tombol ikon pensil/target di kolom "Min Alert" pada produk yang diinginkan. Masukkan kuantitas minimum aman (misal: 15 pack).',
            highlight: 'Setiap produk bisa memiliki batas minimum yang berbeda-beda.',
          },
          {
            stepNumber: 2,
            title: 'Pemeriksaan Otomatis Real-time Saat Penjualan',
            description:
              'Setiap kali terjadi transaksi kasir atau mutasi keluar, sistem mengecek sisa stok fisik. Jika sisa stok ≤ batas minimum, produk langsung masuk ke daftar kritis.',
            highlight: 'Badge merah menyala akan muncul di menu navigasi stok.',
          },
          {
            stepNumber: 3,
            title: 'Banner Peringatan & Tombol Filter Sekali Klik',
            description:
              'Di bagian atas layar Stok & Cabang akan muncul banner peringatan bertuliskan berapa produk yang butuh restock segera. Klik tombol "Lihat Barang Kritis" untuk memfilter hanya barang yang menipis.',
            highlight: 'Tersedia tombol "Restock Sekarang" yang langsung membuka form pemesanan.',
          },
        ],
        caseStudy: {
          title: 'Pedoman Penentuan Angka Stok Minimum Toko Plastik',
          details: [
            'Barang Fast-Moving (Kresek 15, Kresek 24, Karet Gelang): Pasang stok minimum 20 - 50 pack (sesuai lama waktu tunggu pengiriman pabrik).',
            'Barang Medium (Mika Bento, Sendok Plastik, Gelas Kopi): Pasang stok minimum 5 - 10 pack.',
            'Barang Khusus / Musiman: Pasang stok minimum 3 - 5 pack.',
          ],
        },
        fieldTips: [
          'Tinjau daftar barang kritis setiap pagi sebelum toko buka untuk menyiapkan daftar belanja ke supplier.',
          'Gunakan fitur transfer antar-cabang jika cabang utama kehabisan barang sementara cabang lain masih surplus.',
        ],
      },
    },
    {
      id: 'import-export',
      chapterNumber: 5,
      title: 'Export & Import CSV (Upload Ratusan Produk Sekaligus)',
      shortTitle: '5. Import CSV',
      category: 'Data & Katalog',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600 bg-emerald-500/10',
      summary:
        'Solusi cepat memasukkan ribuan data barang dari Excel ke dalam aplikasi kasir dalam hitungan detik tanpa repot mengetik satu per satu.',
      content: {
        overview:
          'Saat pertama kali memulai atau saat menambah ratusan varian plastik baru, menginput satu per satu sangat memakan waktu. Fitur ini memungkinkan Anda mengisi data di Microsoft Excel / Google Sheets lalu mengunggahnya secara instan.',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Membuka Modal Import & Export',
            description:
              'Buka menu "Data Master", pastikan berada di tab "Produk", lalu klik tombol hijau "Export & Import CSV" di samping tombol Tambah Produk.',
            highlight: 'Tersedia baik di tampilan desktop maupun menu mobile Lainnya.',
          },
          {
            stepNumber: 2,
            title: 'Mengunduh Template Resmi (Download Template CSV)',
            description:
              'Klik tombol "Download Template CSV". File template berformat .csv ini berisi kolom yang sudah disesuaikan dengan database toko.',
            highlight: 'Buka file tersebut menggunakan Microsoft Excel atau Google Sheets.',
          },
          {
            stepNumber: 3,
            title: 'Mengisi Data Barang di Spreadsheet',
            description:
              'Isi kolom: Kode SKU, Nama Produk, Kategori, Satuan (pack/karung/pcs), Harga Retail, Harga Grosir, Min Grosir, Stok Minimum, Stok Awal, dan HPP Modal.',
            highlight: 'Pastikan kode SKU unik untuk setiap varian barang.',
          },
          {
            stepNumber: 4,
            title: 'Unggah File atau Salin-Tempel (Copy Paste)',
            description:
              'Tarik file CSV ke kotak upload aplikasi, atau cukup copy baris tabel dari Excel lalu paste ke kolom teks yang disediakan.',
            highlight: 'Aplikasi menampilkan pratinjau tabel sebelum data benar-benar disimpan.',
          },
          {
            stepNumber: 5,
            title: 'Verifikasi & Eksekusi Simpan',
            description:
              'Pilih outlet tujuan stok awal. Centang opsi "Perbarui data jika Kode SKU sudah ada" agar harga lama otomatis ter-update. Klik "Mulai Impor Produk".',
            highlight: 'Ratusan produk langsung aktif dan siap dijual di kasir seketika.',
          },
        ],
        caseStudy: {
          title: 'Format Kolom Utama Template CSV',
          details: [
            'kode: Kode unik produk, misal "KRS-15-HITAM"',
            'nama: Nama lengkap, misal "Kresek HD 15 Hitam Cap Bawang"',
            'kategori: Kategori barang, misal "Kantong Plastik Kresek"',
            'harga_retail: Harga eceran satuan, misal 6500',
            'harga_grosir: Harga potongan grosir, misal 5800',
            'min_grosir: Jumlah minimal untuk dapat harga grosir, misal 5',
            'stok_awal: Jumlah fisik yang ada di toko saat ini, misal 50',
            'hpp: Modal per satuan dari pabrik, misal 5000',
          ],
        },
        fieldTips: [
          'Gunakan tombol "Export Data Produk (CSV)" secara berkala sebagai salinan cadangan (backup) katalog dan daftar harga toko Anda.',
          'Jika ada harga barang yang naik serentak dari pabrik, cukup export ke CSV, edit kolom harga di Excel, lalu import kembali dengan mencentang opsi perbarui.',
        ],
      },
    },
    {
      id: 'shift-pengeluaran',
      chapterNumber: 6,
      title: 'Pengeluaran Toko & Rekonsiliasi Tutup Shift Kasir',
      shortTitle: '6. Kas & Shift',
      category: 'Keuangan & Kas',
      icon: Wallet,
      iconColor: 'text-teal-600 bg-teal-500/10',
      summary:
        'Pencatatan uang keluar operasional harian (biaya toko) dan audit fisik laci kasir agar tidak ada selisih uang saat pergantian staf.',
      content: {
        overview:
          'Setiap hari kasir menerima uang penjualan dan terkadang mengeluarkan uang tunai dari laci untuk keperluan toko (seperti beli lakban, bensin kurir, galon air, atau uang makan). Fitur ini menjaga agar kas toko selalu klop dan transparan.',
        flowSteps: [
          {
            stepNumber: 1,
            title: 'Membuka Shift Kasir di Awal Hari',
            description:
              'Sebelum melayani pembeli pertama, kasir mengklik tombol "Buka Shift" di pojok kanan atas. Masukkan jumlah Modal Awal Uang Kembalian di laci (misal Rp 200.000).',
            highlight: 'Status shift akan berubah menjadi hijau "Shift Aktif".',
          },
          {
            stepNumber: 2,
            title: 'Mencatat Pengeluaran Operasional Toko',
            description:
              'Jika ada pengeluaran toko, buka menu "Laporan & Kas" -> sub-tab "Pengeluaran Toko", lalu klik "Catat Pengeluaran". Masukkan kategori, nominal uang, dan keterangannya.',
            highlight: 'Centang "Potong dari Laci Kasir" jika uang diambil langsung dari laci kasir.',
          },
          {
            stepNumber: 3,
            title: 'Menghitung Uang Fisik Saat Tutup Shift',
            description:
              'Saat pergantian giliran kasir atau toko tutup malam hari, klik tombol "Tutup Shift". Kasir menghitung uang tunai fisik yang ada di laci lalu mengetikkan jumlahnya.',
            highlight: 'Kasir tidak perlu menghitung manual, sistem yang akan menghitung saldo sistem.',
          },
          {
            stepNumber: 4,
            title: 'Audit Selisih Kas Otomatis',
            description:
              'Sistem membandingkan: Modal Awal + Penjualan Tunai + Pelunasan Piutang - Pengeluaran Laci. Jika angka fisik sama persis, status "Kas Seimbang". Jika ada perbedaan, selisih tercatat di laporan.',
            highlight: 'Riwayat shift tersimpan rapi dan dapat diaudit oleh Owner kapan saja.',
          },
        ],
        caseStudy: {
          title: 'Contoh Perhitungan Tutup Shift',
          details: [
            'Modal Awal: Rp 200.000',
            'Penjualan Tunai hari ini: Rp 1.500.000',
            'Pembayaran Piutang tunai dari warung: Rp 300.000',
            'Beli lakban & kantong packing (dari laci): Rp 25.000',
            'Uang Kas Sistem Seharusnya: Rp 1.975.000',
            'Uang fisik dihitung kasir: Rp 1.975.000 -> Status: Laci Kasir Seimbang (Klop).',
          ],
        },
        fieldTips: [
          'Jangan pernah mencampur uang pribadi dengan uang di laci kasir kas toko.',
          'Jika ada pengeluaran menggunakan rekening transfer bank toko (bukan kas laci), jangan centang opsi "Potong dari Laci Kasir".',
        ],
      },
    },
  ];

  // Filtering for search
  const filteredChapters = chapters.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.content.overview.toLowerCase().includes(q) ||
      c.content.flowSteps.some(
        (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      ) ||
      c.content.fieldTips.some((t) => t.toLowerCase().includes(q))
    );
  });

  const activeChapter = chapters[currentChapterIndex] || chapters[0];

  const handlePrev = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      const articleEl = document.getElementById('guide-reader-viewport');
      if (articleEl) articleEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      const articleEl = document.getElementById('guide-reader-viewport');
      if (articleEl) articleEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[900px]">
        
        {/* READER TOP BAR */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/90 dark:bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-stone-900 dark:text-stone-100 truncate">
                  Buku Panduan POS Toko Plastik
                </h2>
                <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Pedoman Resmi
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Panduan praktis alur kasir grosir, beli supplier, pecah karung & stok
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Chapter Indicator */}
            {viewMode === 'paged' && (
              <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-xl">
                <span>Bab</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">
                  {currentChapterIndex + 1}
                </span>
                <span>dari</span>
                <span>{chapters.length}</span>
              </div>
            )}

            {/* View Mode Toggle: Bab demi Bab vs Baca Panjang */}
            <div className="hidden md:flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('paged')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'paged'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Per Bab
              </button>
              <button
                type="button"
                onClick={() => setViewMode('continuous')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'continuous'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Baca Lengkap
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* CHAPTER QUICK SELECTOR / PILL NAVIGATION */}
        <nav className="px-4 sm:px-6 py-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
          {chapters.map((ch, idx) => {
            const isCurrent = viewMode === 'paged' && idx === currentChapterIndex;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setViewMode('paged');
                  setCurrentChapterIndex(idx);
                  const articleEl = document.getElementById('guide-reader-viewport');
                  if (articleEl) articleEl.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <ch.icon className="w-3.5 h-3.5" />
                <span>{ch.shortTitle}</span>
              </button>
            );
          })}
        </nav>

        {/* MAIN READING VIEWPORT */}
        <div
          id="guide-reader-viewport"
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 selection:bg-amber-200 dark:selection:bg-amber-900"
        >
          {viewMode === 'paged' ? (
            /* PAGED CHAPTER VIEW (Clean, Calm, Book-like Reading) */
            <article className="max-w-3xl mx-auto space-y-7 animate-in fade-in duration-150">
              {/* Chapter Header */}
              <div className="space-y-3 pb-6 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                    {activeChapter.category}
                  </span>
                  <span className="text-stone-400 text-xs">·</span>
                  <span className="text-xs font-bold text-stone-500">
                    Bab {activeChapter.chapterNumber} dari {chapters.length}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100 leading-snug">
                  {activeChapter.title}
                </h1>

                {/* Chapter Abstract / Summary Card */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                    📌 Ringkasan Pokok:
                  </p>
                  <p>{activeChapter.summary}</p>
                </div>
              </div>

              {/* Chapter Detailed Overview */}
              <div className="space-y-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Gambaran Alur Kerja</span>
                </h3>
                <p className="leading-relaxed">{activeChapter.content.overview}</p>
              </div>

              {/* Step-by-Step Practical Timeline */}
              <div className="space-y-4 pt-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-amber-600" />
                  <span>Langkah demi Langkah (SOP Praktis)</span>
                </h3>

                <div className="space-y-3">
                  {activeChapter.content.flowSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/90 dark:border-stone-800 flex items-start gap-3.5 transition-all hover:border-amber-400/60"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs mt-0.5">
                        {step.stepNumber}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                          {step.description}
                        </p>
                        {step.highlight && (
                          <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg inline-block mt-1">
                            ✨ {step.highlight}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Practical Case Study / Formula Calculation */}
              {activeChapter.content.caseStudy && (
                <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      {activeChapter.content.caseStudy.title}
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 pl-4 list-disc">
                    {activeChapter.content.caseStudy.details.map((detail, dIdx) => (
                      <li key={dIdx} className="leading-relaxed">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Field Tips */}
              {activeChapter.content.fieldTips.length > 0 && (
                <div className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>💡 Tips Penting Lapangan Toko Plastik</span>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-300 pl-4 list-disc">
                    {activeChapter.content.fieldTips.map((tip, tIdx) => (
                      <li key={tIdx} className="leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chapter Bottom Navigation (No distracting external tabs) */}
              <div className="pt-6 pb-8 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentChapterIndex === 0}
                  onClick={handlePrev}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    currentChapterIndex === 0
                      ? 'opacity-40 cursor-not-allowed bg-stone-100 dark:bg-stone-800 text-stone-400'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Bab Sebelumnya</span>
                </button>

                <div className="text-xs font-bold text-stone-400 text-center">
                  Bab {currentChapterIndex + 1} dari {chapters.length}
                </div>

                {currentChapterIndex < chapters.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Bab Selanjutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesai Membaca Panduan</span>
                  </button>
                )}
              </div>
            </article>
          ) : (
            /* CONTINUOUS READING MODE (All Chapters in One Flow) */
            <div className="max-w-3xl mx-auto space-y-14 divide-y divide-stone-200 dark:divide-stone-800">
              {chapters.map((ch, idx) => (
                <article key={ch.id} className={idx > 0 ? 'pt-10 space-y-6' : 'space-y-6'}>
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                      Bab {ch.chapterNumber}: {ch.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                      {ch.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                      {ch.summary}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Langkah Operasional:
                    </h4>
                    <div className="space-y-2.5">
                      {ch.content.flowSteps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm"
                        >
                          <div className="font-bold text-stone-900 dark:text-stone-100 mb-0.5">
                            {step.stepNumber}. {step.title}
                          </div>
                          <div className="text-stone-600 dark:text-stone-300 leading-relaxed">
                            {step.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {ch.content.caseStudy && (
                    <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs sm:text-sm space-y-1.5">
                      <div className="font-bold text-amber-900 dark:text-amber-200">
                        {ch.content.caseStudy.title}
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-stone-700 dark:text-stone-300">
                        {ch.content.caseStudy.details.map((d, dIdx) => (
                          <li key={dIdx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}

              <div className="pt-8 pb-10 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  Tutup Panduan & Kembali ke Aplikasi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* READER FOOTER */}
        <footer className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Mode Fokus Membaca: Bebas distraksi</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'paged' ? 'continuous' : 'paged')}
              className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-bold text-xs underline cursor-pointer"
            >
              {viewMode === 'paged' ? 'Tampilkan Mode Baca Panjang' : 'Tampilkan Mode Per Bab'}
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={onClose}
              className="font-bold text-stone-700 dark:text-stone-300 hover:text-stone-900 cursor-pointer"
            >
              Tutup (Esc)
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
