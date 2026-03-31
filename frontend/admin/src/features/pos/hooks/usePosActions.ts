import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
    createOrder, addItemsToOrder, updateOrderFinancials, 
    toggleStoreStatus, openCashier, checkoutTable, transferTable 
} from '../../../services/api';
import { usePosStore } from './usePosStore';
import { useCartStore } from './useCartStore';
import { Product, TableSummary, PaymentMethod, Order } from '../../../types';

export const usePosActions = (
    refreshTables: () => void, 
    refreshData: () => void,
    tablesSummary: TableSummary[],
    paymentMethods: PaymentMethod[],
    deliveryOrders: Order[],
    deliveryFee: number,
    setViewingTable: (table: TableSummary | null) => void
) => {
    const pos = usePosStore();
    const { cart, clearCart } = useCartStore();
    const cartTotal = useCartTotal();

    const handleProductClick = useCallback((product: Product, isCashierOpen: boolean) => {
        if (!isCashierOpen) return toast.error("Abra o caixa antes de vender!");
        pos.setSelectedProductForAdd(product);
        pos.setTempQty(1);
        pos.setTempObs('');
        pos.setSelectedSizeId(product.sizes?.[0]?.id || '');
        pos.setSelectedAddonIds([]);
        pos.setShowProductDrawer(true);
    }, [pos]);

    const handleTableClick = useCallback((table: TableSummary) => {
        pos.setSelectedTable(table.number.toString());
        pos.setOrderMode('table');
        pos.setActiveTab('pos');
        
        if (table.status !== 'free') {
            toast.info(`Mesa ${table.number} selecionada. Itens adicionados serão somados à conta atual.`);
        }
    }, [pos]);

    const submitOrder = useCallback(async () => {
        if (pos.orderMode === 'table' && !pos.selectedTable) {
            return toast.error("Por favor, selecione uma mesa");
        }

        if (!pos.posPaymentMethodId) {
            return toast.error("Selecione uma forma de pagamento");
        }

        const method = paymentMethods.find(m => m.id === pos.posPaymentMethodId);
        const cartTotalValue = cartTotal();
        
        try {
            const finalDiscount = parseFloat(pos.posDiscountValue || '0');
            const finalExtra = parseFloat(pos.posExtraCharge || '0');
            const finalDelivery = parseFloat(pos.posDeliveryFee || '0');

            const orderPayload = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    observations: item.observation,
                    sizeId: item.selectedSizeDbId,
                    addonsIds: item.selectedAddonDbIds,
                    sizeJson: item.sizeJson,
                    addonsJson: item.addonsJson,
                })),
                orderType: pos.orderMode === 'table' ? 'TABLE' : 'DELIVERY',
                tableNumber: pos.orderMode === 'table' ? parseInt(pos.selectedTable) : null,
                paymentMethod: method?.name || 'OUTRO',
                customerName: pos.orderMode === 'table' ? pos.customerName : pos.deliveryInfo.name,
                deliveryInfo: pos.orderMode === 'delivery' ? {
                    name: pos.deliveryInfo.name,
                    phone: pos.deliveryInfo.phone,
                    address: pos.deliveryInfo.address, 
                    deliveryType: pos.deliverySubType,
                    deliveryFee: finalDelivery,
                    observations: pos.posObservations
                } : null,
                discount: finalDiscount,
                extraCharge: finalExtra,
                totalAmount: Number((cartTotalValue + finalExtra + finalDelivery - finalDiscount).toFixed(2))
            };

            if (pos.orderMode === 'table') {
                const tableInfo = tablesSummary.find(t => t.number === parseInt(pos.selectedTable));
                const activeOrderId = tableInfo?.tabs?.[0]?.orderId;

                if (activeOrderId && tableInfo.status !== 'free') {
                    await addItemsToOrder(activeOrderId, orderPayload.items);
                    if (finalDiscount > 0 || finalExtra > 0) {
                        const newTotal = tableInfo.totalAmount + orderPayload.totalAmount;
                        await updateOrderFinancials(activeOrderId, { discount: finalDiscount, surcharge: finalExtra, total: newTotal });
                    }
                    toast.success("Itens adicionados ao pedido!");
                } else {
                    await createOrder(orderPayload);
                    toast.success("Pedido enviado!");
                }
            } else if (pos.orderMode === 'delivery' && pos.activeDeliveryOrderId) {
                await addItemsToOrder(pos.activeDeliveryOrderId, orderPayload.items);
                const currentOrder = deliveryOrders.find(o => o.id === pos.activeDeliveryOrderId);
                if (currentOrder && (finalDiscount > 0 || finalExtra > 0)) {
                    const newTotal = currentOrder.total + orderPayload.totalAmount;
                    await updateOrderFinancials(pos.activeDeliveryOrderId, {
                        discount: finalDiscount,
                        surcharge: finalExtra,
                        total: newTotal
                    });
                }
                toast.success("Itens adicionados ao pedido existente!");
            } else {
                await createOrder(orderPayload);
                toast.success("Pedido enviado!");
            }

            clearCart();
            pos.resetPos();
            refreshTables();
            refreshData();
        } catch (e) {
            toast.error("Erro ao enviar pedido");
        }
    }, [pos, cart, paymentMethods, tablesSummary, deliveryOrders, cartTotal, clearCart, refreshTables, refreshData]);

    const handleToggleStore = useCallback(async (isStoreOpen: boolean) => {
        const newState = !isStoreOpen;
        await toggleStoreStatus(newState);
        refreshData();
        toast.success(newState ? "Loja Aberta" : "Loja Fechada");
    }, [refreshData]);

    const handleOpenCashier = useCallback(async (amount: string) => {
        if (!amount) return toast.error("Informe o fundo de caixa");
        await openCashier(parseFloat(amount));
        pos.setActiveModal('none');
        refreshData();
    }, [pos, refreshData]);

    const handleOpenCheckout = useCallback(() => {
        if (cart.length === 0) return toast.error("Carrinho vazio!");
        
        pos.setPosDeliveryFee(pos.orderMode === 'delivery' && pos.deliverySubType === 'delivery' ? deliveryFee.toString() : '0');
        pos.setPosExtraCharge('0');
        pos.setPosDiscountValue('0');
        pos.setPosDiscountPercentage('0');
        pos.setPosPaymentMethodId('');
        pos.setPosObservations('');
        
        pos.setActiveModal('pos_checkout');
    }, [pos, cart, deliveryFee]);

    const handleTableCheckout = useCallback(async (viewingTable: TableSummary, checkoutData: any) => {
        try {
            await checkoutTable(viewingTable.id, checkoutData);
            toast.success("Mesa finalizada com sucesso!");
            pos.setActiveModal('none');
            setViewingTable(null);
            refreshTables();
            refreshData();
        } catch (error) {
            toast.error("Erro ao finalizar mesa.");
        }
    }, [pos, setViewingTable, refreshTables, refreshData]);

    const handleTransferTable = useCallback(async (viewingTable: TableSummary, newTableNumber: number) => {
        try {
            await transferTable(viewingTable.id, newTableNumber);
            toast.success(`Mesa transferida para ${newTableNumber}`);
            pos.setActiveModal('none');
            setViewingTable(null);
            refreshTables();
            refreshData();
        } catch (error) {
            toast.error("Erro ao transferir mesa.");
        }
    }, [pos, setViewingTable, refreshTables, refreshData]);

    return {
        handleProductClick,
        handleTableClick,
        submitOrder,
        handleToggleStore,
        handleOpenCashier,
        handleOpenCheckout,
        handleTableCheckout,
        handleTransferTable
    };
};
