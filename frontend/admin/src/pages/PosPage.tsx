import React from 'react';
import { useNavigate } from 'react-router-dom';
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

const PosPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        products, categories, tables, tablesSummary, paymentMethods,
        deliveryOrders, isStoreOpen, isCashierOpen, deliveryFee,
        loading, refreshData, refreshTables
    } = usePosData();

    const pos = usePosStore();

    const {
        handleProductClick, handleTableClick, submitOrder,
        handleToggleStore, handleOpenCashier, handleOpenCheckout,
    } = usePosActions(
        refreshTables, refreshData, tablesSummary, paymentMethods, 
        deliveryOrders, deliveryFee, products
    );

    const {
        customerAddresses, handleSelectCustomer, handleSelectCounterCustomer
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

    // Abas 'table', 'counter', 'delivery' mostram catálogo
    // Aba 'tables' mostra grid de mesas (gerenciamento)
    const showCatalog = pos.activeTab !== 'tables';

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

                {showCatalog ? (
                    <ProductGrid 
                        products={products}
                        categories={categories}
                        onProductClick={(p) => handleProductClick(p, isCashierOpen)}
                    />
                ) : (
                    <TableGrid 
                        tablesSummary={tablesSummary}
                        onTableClick={(t) => {
                            if (t.status === 'free') handleTableClick(t);
                            else {
                                // Navega para a página de checkout com o primeiro orderId da mesa
                                const firstOrderId = t.tabs?.[0]?.orderId;
                                if (firstOrderId) navigate(`/pos/checkout/${firstOrderId}`);
                            }
                        }}
                    />
                )}

                <ProductDrawer />

                <PosModals 
                    paymentMethods={paymentMethods}
                    onSubmitOrder={submitOrder}
                    onOpenCashier={handleOpenCashier}
                    customerAddresses={customerAddresses}
                    handleSelectCustomer={handleSelectCustomer}
                    handleSelectCounterCustomer={handleSelectCounterCustomer}
                />
            </main>
        </div>
    );
};

export default PosPage;
