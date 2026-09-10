import React from 'react';
import { Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const UnassignedLock: React.FC<{ title?: string }> = ({ title }) => {
  const { currentUser } = useApp();
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900 dark:text-stone-100 mb-2">
          {title || 'Akses Dibatasi: Belum Ditugaskan ke Cabang'}
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
          Akun Anda ({currentUser.nama} - {currentUser.role}) belum memiliki cabang penugasan.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
          Silakan hubungi Owner untuk menetapkan cabang outlet Anda.
        </div>
      </div>
    </div>
  );
};
