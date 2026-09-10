import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { canAccessTab } from './utils/access';
import { DashboardView } from './components/DashboardView';
import { CashierView } from './components/CashierView';
import { TransactionsDataView } from './components/TransactionsDataView';
import { PengeluaranView } from './components/PengeluaranView';
import { ModalUsahaView } from './components/ModalUsahaView';
import { PecahKarungView } from './components/PecahKarungView';
import { HutangPiutangView } from './components/HutangPiutangView';
import { StockInventoryView } from './components/StockInventoryView';
import { FinancialReportsView } from './components/FinancialReportsView';
import { MasterDataView } from './components/MasterDataView';

export function AppContent() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stockInitialTab, setStockInitialTab] = useState<'daftar' | 'mutasi' | 'opname' | 'ledger' | 'masuk'>('daftar');
  const [stockInitialSupplierId, setStockInitialSupplierId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!canAccessTab(currentUser.role, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  const handleNavigateToBeliSupplier = (supplierId?: string) => {
    if (!canAccessTab(currentUser.role, 'stok')) return;
    setStockInitialTab('masuk');
    setStockInitialSupplierId(supplierId);
    setActiveTab('stok');
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => {
        if (!canAccessTab(currentUser.role, tab)) return;
        if (tab === 'stok' && activeTab !== 'stok') {
          setStockInitialTab('daftar');
          setStockInitialSupplierId(undefined);
        }
        setActiveTab(tab);
      }}
      onNavigateToBeliSupplier={() => handleNavigateToBeliSupplier()}
    >
      {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
      {activeTab === 'kasir' && <CashierView onNavigateToTransaksi={() => setActiveTab('transaksi')} />}
      {activeTab === 'transaksi' && <TransactionsDataView onSwitchToKasir={() => setActiveTab('kasir')} />}
      {activeTab === 'pengeluaran' && <PengeluaranView />}
      {activeTab === 'modal' && <ModalUsahaView />}
      {activeTab === 'pecah' && <PecahKarungView />}
      {activeTab === 'piutang' && <HutangPiutangView />}
      {activeTab === 'stok' && (
        <StockInventoryView
          key={`${stockInitialTab}-${stockInitialSupplierId || 'all'}`}
          initialTab={stockInitialTab}
          initialSupplierId={stockInitialSupplierId}
        />
      )}
      {activeTab === 'laporan' && (
        <FinancialReportsView onNavigateToPengeluaran={() => setActiveTab('pengeluaran')} />
      )}
      {activeTab === 'master' && (
        <MasterDataView onOrderFromSupplier={(supplierId) => handleNavigateToBeliSupplier(supplierId)} />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

