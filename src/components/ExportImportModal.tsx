import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { JenisProduk, Produk } from '../types';
import { formatRupiah } from '../utils/formatters';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (message: string) => void;
}

interface ParsedRow {
  rowNum: number;
  kode: string;
  nama: string;
  kategoriNama: string;
  jenis: JenisProduk;
  satuan: string;
  hargaRetail: number;
  hargaGrosir: number | null;
  minGrosir: number | null;
  stokMin: number;
  stokAwal: number;
  hppAwal: number;
  isExisting: boolean;
  error?: string;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const {
    produk,
    kategori,
    activeOutlet,
    getProdukStokForOutlet,
    getProdukHPPForOutlet,
    bulkImportProduk,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');

  // Import states
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importStockAndHPP, setImportStockAndHPP] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    updatedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper: Export Produk to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'kode',
      'nama',
      'kategori',
      'jenis',
      'satuan',
      'harga_retail',
      'harga_grosir',
      'min_grosir',
      'stok_min',
      'stok_riil',
      'hpp',
      'favorit',
    ];

    const rows = produk.map((p) => {
      const kat = kategori.find((k) => k.id === p.kategoriId)?.nama || 'Plastik';
      const currentStock = getProdukStokForOutlet(p.id, activeOutlet.id);
      const currentHpp = getProdukHPPForOutlet(p.id, activeOutlet.id);

      return [
        `"${p.kode.replace(/"/g, '""')}"`,
        `"${p.nama.replace(/"/g, '""')}"`,
        `"${kat.replace(/"/g, '""')}"`,
        p.jenis,
        `"${p.satuan.replace(/"/g, '""')}"`,
        p.hargaRetail,
        p.hargaGrosir ?? '',
        p.minGrosir ?? '',
        p.stokMin ?? 5,
        currentStock,
        currentHpp,
        p.favorit ? 'YA' : 'TIDAK',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    link.setAttribute('href', url);
    link.setAttribute('download', `data_produk_${activeOutlet.nama.replace(/\s+/g, '_')}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onSuccessToast) {
      onSuccessToast(`Berhasil mengekspor ${produk.length} data produk ke CSV.`);
    }
  };

  // Helper: Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'kode',
      'nama',
      'kategori',
      'jenis',
      'satuan',
      'harga_retail',
      'harga_grosir',
      'min_grosir',
      'stok_min',
      'stok_awal',
      'hpp_awal',
    ];

    const sampleRows = [
      'KRS-HD15,Kresek HD Bintang 15 Putih (1/2 kg),Plastik Kresek,STANDAR,pack,12000,10500,5,10,50,9000',
      'KRS-LOCO-24,Kresek Loco Ekonomis 24 Merah,Plastik Kresek,STANDAR,pack,14000,12500,5,10,40,11000',
      'KRG-PP-BENING,Karung PP Bening 25kg (Bahan Baku),Plastik Karung,KARUNG,karung,350000,330000,2,3,10,310000',
      'MIK-BRW-M,Mika Brownies M Bening (isi 50),Mika & Thinwall,STANDAR,pack,28000,25000,10,15,40,21000',
      'SDT-BBL,Sedotan Bubble Hitam Steril 12mm,Sedotan & Cup,STANDAR,pack,15000,13500,5,8,30,11000',
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_produk_tokoplastik.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parsing CSV / TSV text logic
  const parseCSVContent = (content: string) => {
    setImportResult(null);
    const cleanLines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (cleanLines.length <= 1) {
      setParsedRows([]);
      return;
    }

    // Detect delimiter: comma, semicolon, or tab
    const firstLine = cleanLines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(firstLine).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9_]/g, '')
    );

    const getColIdx = (...names: string[]) => {
      return headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));
    };

    const kodeIdx = getColIdx('kode', 'sku', 'barcode');
    const namaIdx = getColIdx('nama', 'namaproduk', 'name', 'item');
    const katIdx = getColIdx('kategori', 'category');
    const jenisIdx = getColIdx('jenis', 'type');
    const satuanIdx = getColIdx('satuan', 'unit');
    const retailIdx = getColIdx('hargaretail', 'retail', 'jual', 'hargajual');
    const grosirIdx = getColIdx('hargagrosir', 'grosir');
    const minGrosirIdx = getColIdx('mingrosir', 'minimalgrosir', 'min_grosir');
    const stokMinIdx = getColIdx('stokmin', 'minstok', 'titikmin', 'alertstok');
    const stokAwalIdx = getColIdx('stokawal', 'stok', 'qty', 'stock');
    const hppAwalIdx = getColIdx('hppawal', 'hpp', 'modal', 'hargabeli');

    const existingCodeSet = new Set(produk.map((p) => p.kode.toUpperCase()));
    const results: ParsedRow[] = [];

    for (let i = 1; i < cleanLines.length; i++) {
      const cols = parseLine(cleanLines[i]);
      if (cols.length === 0 || cols.every((c) => !c)) continue;

      const rawNama = namaIdx >= 0 ? cols[namaIdx] : '';
      const rawKode = kodeIdx >= 0 && cols[kodeIdx] ? cols[kodeIdx] : `SKU-${Date.now()}-${i}`;
      const rawRetail = retailIdx >= 0 ? cols[retailIdx].replace(/[Rp\s.]/g, '').replace(/,/g, '.') : '';
      const rawGrosir = grosirIdx >= 0 ? cols[grosirIdx].replace(/[Rp\s.]/g, '').replace(/,/g, '.') : '';
      const rawMinGrosir = minGrosirIdx >= 0 ? cols[minGrosirIdx].replace(/\D/g, '') : '';
      const rawStokMin = stokMinIdx >= 0 ? cols[stokMinIdx].replace(/\D/g, '') : '';
      const rawStokAwal = stokAwalIdx >= 0 ? cols[stokAwalIdx].replace(/[^\d.-]/g, '') : '';
      const rawHpp = hppAwalIdx >= 0 ? cols[hppAwalIdx].replace(/[Rp\s.]/g, '').replace(/,/g, '.') : '';

      const retailVal = parseFloat(rawRetail);
      const grosirVal = parseFloat(rawGrosir);
      const minGrosirVal = parseInt(rawMinGrosir, 10);
      const stokMinVal = parseInt(rawStokMin, 10);
      const stokAwalVal = parseFloat(rawStokAwal);
      const hppVal = parseFloat(rawHpp);

      let err: string | undefined;
      if (!rawNama.trim()) {
        err = 'Nama produk wajib ada';
      } else if (isNaN(retailVal) || retailVal <= 0) {
        err = 'Harga retail harus angka > 0';
      }

      let j: JenisProduk = JenisProduk.STANDAR;
      if (jenisIdx >= 0 && cols[jenisIdx]) {
        const jStr = cols[jenisIdx].toUpperCase();
        if (jStr.includes('KARUNG')) j = JenisProduk.KARUNG;
        else if (jStr.includes('ECER')) j = JenisProduk.ECER;
        else if (jStr.includes('SATUAN')) j = JenisProduk.SATUAN;
      }

      results.push({
        rowNum: i + 1,
        kode: rawKode.toUpperCase(),
        nama: rawNama,
        kategoriNama: katIdx >= 0 && cols[katIdx] ? cols[katIdx] : 'Plastik',
        jenis: j,
        satuan: satuanIdx >= 0 && cols[satuanIdx] ? cols[satuanIdx] : 'pack',
        hargaRetail: isNaN(retailVal) ? 0 : retailVal,
        hargaGrosir: !isNaN(grosirVal) && grosirVal > 0 ? grosirVal : null,
        minGrosir: !isNaN(minGrosirVal) && minGrosirVal > 0 ? minGrosirVal : null,
        stokMin: !isNaN(stokMinVal) && stokMinVal >= 0 ? stokMinVal : 5,
        stokAwal: !isNaN(stokAwalVal) ? stokAwalVal : 0,
        hppAwal: !isNaN(hppVal) ? hppVal : 0,
        isExisting: existingCodeSet.has(rawKode.toUpperCase()),
        error: err,
      });
    }

    setParsedRows(results);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        parseCSVContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Execute Import
  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => !r.error);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    try {
      const payload = validRows.map((r) => ({
        kode: r.kode,
        nama: r.nama,
        kategoriNama: r.kategoriNama,
        jenis: r.jenis,
        satuan: r.satuan,
        hargaRetail: r.hargaRetail,
        hargaGrosir: r.hargaGrosir,
        minGrosir: r.minGrosir,
        stokMin: r.stokMin,
        stokAwal: importStockAndHPP ? r.stokAwal : undefined,
        hppAwal: importStockAndHPP ? r.hppAwal : undefined,
      }));

      const res = bulkImportProduk(payload, {
        updateExisting,
        targetOutletId: activeOutlet.id,
      });

      setImportResult(res);

      if (res.success && onSuccessToast) {
        onSuccessToast(
          `Sukses! ${res.importedCount} produk baru ditambahkan, ${res.updatedCount} produk diperbarui.`
        );
      }
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        updatedCount: 0,
        errors: [err?.message || 'Terjadi kesalahan saat memproses data'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => !r.error).length;
  const invalidCount = parsedRows.length - validCount;
  const newCount = parsedRows.filter((r) => !r.error && !r.isExisting).length;
  const updateCount = parsedRows.filter((r) => !r.error && r.isExisting).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                Export & Import Data Produk
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Kelola ratusan katalog produk sekaligus via file Excel / CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs: Import vs Export */}
        <div className="flex items-center px-5 pt-3 border-b border-stone-200 dark:border-stone-800 gap-4 bg-white dark:bg-stone-900">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Massal (Upload CSV)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Produk ({produk.length} Data)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Top Action / Template Download Bar */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Unduh Template Excel / CSV Terlebih Dahulu
                    </h4>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                      Gunakan template resmi agar format kolom (kode, nama, harga retail, grosir, stok min) sesuai.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template CSV</span>
                </button>
              </div>

              {/* Upload Drop Zone (Drag and drop + manual file select) */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                      : 'border-stone-300 dark:border-stone-700 hover:border-amber-400 bg-stone-50/50 dark:bg-stone-800/20'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                    {fileName ? `File terpilih: ${fileName}` : 'Klik untuk Pilih File CSV atau Seret ke Sini (Drag & Drop)'}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    Mendukung file .CSV standar dari Microsoft Excel, Google Sheets, atau format teks koma/titik-koma
                  </p>
                  {fileName && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold">
                      ✓ {parsedRows.length} baris data terdeteksi
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Paste Toggle Area */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                >
                  <span>Atau Tempel (Paste) Teks CSV Langsung</span>
                  {showPasteArea ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPasteArea && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={4}
                      value={rawText}
                      onChange={(e) => {
                        setRawText(e.target.value);
                        parseCSVContent(e.target.value);
                      }}
                      placeholder={`kode,nama,kategori,jenis,satuan,harga_retail,harga_grosir,min_grosir,stok_min,stok_awal,hpp_awal\nKRS-HD15,Kresek HD Bintang 15,Plastik Kresek,STANDAR,pack,12000,10500,5,10,50,9000`}
                      className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Import Options & Summary */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                        <input
                          type="checkbox"
                          checked={updateExisting}
                          onChange={(e) => setUpdateExisting(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>Perbarui jika Kode SKU sudah ada ({updateCount} item)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                        <input
                          type="checkbox"
                          checked={importStockAndHPP}
                          onChange={(e) => setImportStockAndHPP(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>Set Stok Awal & HPP ke Cabang ({activeOutlet.nama})</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-black">
                        {newCount} Baru
                      </span>
                      {updateExisting && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-black">
                          {updateCount} Update
                        </span>
                      )}
                      {invalidCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-black">
                          {invalidCount} Ada Masalah
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW TABLE */}
                  <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs font-bold">
                      <span>Pratinjau Data ({parsedRows.length} Baris Terbaca)</span>
                      <span className="text-[11px] font-normal text-stone-500">
                        Periksa kembali data sebelum menyimpan
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                          <tr>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Kode SKU</th>
                            <th className="py-2 px-3">Nama Produk</th>
                            <th className="py-2 px-3">Kategori</th>
                            <th className="py-2 px-3 text-right">Retail</th>
                            <th className="py-2 px-3 text-right">Grosir (Min)</th>
                            <th className="py-2 px-3 text-right">Min Stok</th>
                            <th className="py-2 px-3 text-right">Stok Awal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                          {parsedRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={
                                row.error
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                  : row.isExisting
                                  ? 'bg-blue-50/30 dark:bg-blue-950/10'
                                  : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                              }
                            >
                              <td className="py-2 px-3">
                                {row.error ? (
                                  <span className="text-rose-600 font-bold text-[10px] flex items-center gap-1" title={row.error}>
                                    <AlertCircle className="w-3 h-3" /> Error
                                  </span>
                                ) : row.isExisting ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                    Update
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                    Baru
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-stone-800 dark:text-stone-200">
                                {row.kode}
                              </td>
                              <td className="py-2 px-3 font-semibold text-stone-900 dark:text-stone-100 max-w-[180px] truncate">
                                {row.nama}
                              </td>
                              <td className="py-2 px-3 text-stone-500">{row.kategoriNama}</td>
                              <td className="py-2 px-3 text-right font-bold text-stone-900 dark:text-stone-100">
                                {formatRupiah(row.hargaRetail)}
                              </td>
                              <td className="py-2 px-3 text-right text-stone-600 dark:text-stone-400">
                                {row.hargaGrosir ? `${formatRupiah(row.hargaGrosir)} (≥${row.minGrosir})` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-rose-600">
                                {row.stokMin}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-stone-700 dark:text-stone-300">
                                {row.stokAwal} {row.satuan}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Result Notification */}
              {importResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    importResult.errors.length === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <h4 className="font-black">
                      Proses Impor Berhasil Selesai!
                    </h4>
                    <p>
                      <strong>{importResult.importedCount}</strong> produk baru berhasil ditambahkan, dan{' '}
                      <strong>{importResult.updatedCount}</strong> produk lama diperbarui.
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 text-rose-600 font-semibold">
                        Catatan: {importResult.errors.join('; ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5 max-w-xl mx-auto py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <Download className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
                  Export Seluruh Data Katalog Produk
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  Unduh seluruh {produk.length} data produk toko Anda ke dalam format file CSV (Excel-compatible) lengkap dengan harga retail, grosir, minimum stok alert, dan posisi stok cabang <strong>{activeOutlet.nama}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-left space-y-2">
                <div className="font-bold text-stone-700 dark:text-stone-300">
                  Kolom yang disertakan dalam file:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                  <span>• kode (SKU Barcode)</span>
                  <span>• nama produk</span>
                  <span>• kategori barang</span>
                  <span>• jenis (STANDAR/KARUNG)</span>
                  <span>• satuan kemasan</span>
                  <span>• harga retail</span>
                  <span>• harga grosir & min</span>
                  <span>• batas stok minimum</span>
                  <span>• stok riil cabang</span>
                  <span>• HPP rata-rata bergerak</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 mx-auto shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File CSV Sekarang ({produk.length} Produk)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {activeTab === 'import' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={validCount === 0 || isProcessing}
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                  validCount === 0 || isProcessing
                    ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white hover:shadow'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sedang Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor Sekarang ({validCount} Produk)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
