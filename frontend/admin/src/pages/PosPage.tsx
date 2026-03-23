import React, { useState } from 'react';
import { usePosData } from '../features/pos/hooks/usePosData';
import { usePosStore } from '../features/pos/hooks/usePosStore';
import { usePosActions } from '../features/pos/hooks/usePosActions';
import { useCustomerSearch } from '../features/pos/hooks/useCustomerSearch';
import { CartSidebar } from '../features/pos/components/Cart/CartSidebar';
import { ProductGrid } from '../features/pos/components/ProductGrid/ProductGrid';
import { TableGrid } from '../features/pos/components/TableGrid/TableGrid';
import { PosHeader } from '../features/pos/components/Header/PosHeader';
import { ProductDrawer } from '../features/pos/components/ProductDrawer/ProductDrawer';
import { PosModals } from '../features/pos/components/Modals/PosModals';
import { TableSummary } from '../types';

const PosPage: React.FC = () => {
    const {
        products, categories, tables, tablesSummary, paymentMethods,
        deliveryOrders, isStoreOpen, isCashierOpen, deliveryFee,
        loading, refreshData, refreshTables
    } = usePosData();

    const pos = usePosStore();
    const [viewingTable, setViewingTable] = useState<TableSummary | null>(null);

    const {
        handleProductClick, handleTableClick, submitOrder,
        handleToggleStore, handleOpenCashier, handleOpenCheckout,
        handleTableCheckout, handleTransferTable
    } = usePosActions(
        refreshTables, refreshData, tablesSummary, paymentMethods, 
        deliveryOrders, deliveryFee, setViewingTable
    );

    const {
        customerAddresses, handleSelectCustomer
    } = useCustomerSearch(deliveryOrders);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Sincronizando PDV...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-orange-100 selection:text-orange-900">
            <CartSidebar 
                tables={tables} 
                tablesSummary={tablesSummary} 
                onOpenCheckout={handleOpenCheckout} 
            />

            <main className="flex-1 flex flex-col relative overflow-hidden bg-white shadow-inner">
                <PosHeader 
                    isStoreOpen={isStoreOpen}
                    isCashierOpen={isCashierOpen}
                    onToggleStore={() => handleToggleStore(isStoreOpen)}
                    onRefreshTables={refreshTables}
                />

                {pos.activeTab === 'pos' ? (
                    <ProductGrid 
                        products={products}
                        categories={categories}
                        onProductClick={(p) => handleProductClick(p, isCashierOpen)}
                    />
                ) : (
                    <TableGrid 
                        tablesSummary={tablesSummary}
                        onTableClick={(t) => {
                            setViewingTable(t);
                            if (t.status === 'free') handleTableClick(t);
                            else pos.setActiveModal('table_details');
                        }}
                    />
                )}

                <ProductDrawer />

                <PosModals 
                    viewingTable={viewingTable}
                    setViewingTable={setViewingTable}
                    onRefreshTables={refreshTables}
                    paymentMethods={paymentMethods}
                    onSubmitOrder={submitOrder}
                    onCheckoutTable={(data) => viewingTable && handleTableCheckout(viewingTable, data)}
                    onTransferTable={(newNum) => viewingTable && handleTransferTable(viewingTable, newNum)}
                    onOpenCashier={handleOpenCashier}
                    customerAddresses={customerAddresses}
                    handleSelectCustomer={handleSelectCustomer}
                />
            </main>
        </div>
    );
};

export default PosPage;
