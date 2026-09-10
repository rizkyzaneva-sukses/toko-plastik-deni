import React, { useState } from 'react';
import { Printer, Copy, Check, X, ArrowRight, CheckCircle } from 'lucide-react';
import { Transaksi } from '../types';
import { useApp } from '../context/AppContext';
import { generateThermal58mmReceipt } from '../utils/formatters';

interface ThermalReceiptModalProps {
  transaksi: Transaksi | null;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ transaksi, onClose }) => {
  const { outlets } = useApp();
  const [copied, setCopied] = useState(false);

  if (!transaksi) return null;

  const outlet = outlets.find((o) => o.id === transaksi.outletId) || outlets[0];
  const receiptLines = generateThermal58mmReceipt(transaksi, outlet);
  const rawText = receiptLines.join('\n');

  // Single browser print handler targeting div id "thermal-receipt-print-area"
  const handlePrint = () => {
    try {
      window.print();
    } catch {
      // Fallback for sandboxed iframe environments
      const printArea = document.getElementById('thermal-receipt-print-area');
      if (printArea) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Struk ${transaksi.nomor}</title>
                <style>
                  @page { size: 58mm auto; margin: 0; }
                  body { margin: 0; padding: 6px; font-family: monospace; font-size: 11px; line-height: 1.25; }
                  pre { margin: 0; white-space: pre-wrap; word-break: break-all; }
                </style>
              </head>
              <body>
                <pre>${rawText}</pre>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }
    }
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* 
        PRINTABLE CONTAINER: Targeted by browser print API via id="thermal-receipt-print-area".
        Hidden in normal screen view, displayed exclusively when window.print() is triggered.
      */}
      <div id="thermal-receipt-print-area" className="hidden print:block font-mono-receipt text-[11px] leading-tight text-black bg-white">
        <pre className="whitespace-pre font-mono m-0 p-0 text-black">{rawText}</pre>
      </div>

      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header with Success Indicator */}
        <div className="px-4 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>Transaksi Sukses</span>
                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">({transaksi.nomor})</span>
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Struk Siap Dicetak (58mm Thermal)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Visual Preview Container */}
        <div className="p-4 overflow-y-auto bg-stone-100 dark:bg-stone-950/70 flex justify-center">
          <div className="w-[300px] bg-[#fcfbf9] text-stone-900 shadow-md border border-stone-200/90 rounded-sm p-4 font-mono-receipt text-[11.5px] leading-tight tracking-tight select-all">
            <div className="border-b border-dashed border-stone-300 pb-2 mb-2 text-center text-[10px] text-stone-400">
              PRINTER THERMAL 58MM (32 CHR)
            </div>

            <pre className="whitespace-pre font-mono font-medium text-stone-900 m-0 p-0 text-left overflow-x-auto">
              {rawText}
            </pre>

            <div className="border-t border-dashed border-stone-300 pt-2 mt-2 text-center text-[10px] text-stone-400">
              - AKHIR STRUK -
            </div>
          </div>
        </div>

        {/* Action Buttons Footer: EXACTLY 1 Single Print Button */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col gap-2.5">
          {/* ONLY 1 Single, Prominent Print Button */}
          <button
            type="button"
            id="btn-cetak-struk-thermal"
            onClick={handlePrint}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>CETAK STRUK (PRINT)</span>
          </button>

          {/* Secondary Actions: Transaksi Baru & Subtle Copy Option */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyRaw}
              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 text-xs font-semibold flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Salin isi teks struk ke clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Teks Tersalin!' : 'Salin Teks Struk'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Transaksi Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
