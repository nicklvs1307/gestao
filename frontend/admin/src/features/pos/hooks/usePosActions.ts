import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
    createOrder, addItemsToOrder, updateOrderFinancials, 
    toggleStoreStatus, openCashier, checkoutTable, transferTable 
} from '../../../services/api';
import { usePosStore } from './usePosStore';
import { useCartStore, useCartTotal } from './useCartStore';
import { Product, TableSummary, PaymentMethod, Order } from '../../../types';
import { printOrder } from '../../../services/printing';

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
        pos.setActiveTab('table');
        
        if (table.status !== 'free') {
            toast.info(`Mesa ${table.number} selecionada. Itens adicionados serão somados à conta atual.`);
        }
    }, [pos]);

    const submitOrder = useCallback(async () => {
        // Validações por modo
        if (pos.activeTab === 'table' && !pos.selectedTable) {
            return toast.error("Por favor, selecione uma mesa");
        }
        if (pos.activeTab === 'delivery' && !pos.deliveryInfo.name) {
            return toast.error("Vincule um cliente para delivery");
        }
        if (!pos.posPaymentMethodId) {
            return toast.error("Selecione uma forma de pagamento");
        }

        const method = paymentMethods.find(m => m.id === pos.posPaymentMethodId);
        const cartTotalValue = cartTotal;
        
        try {
            const finalDiscount = parseFloat(pos.posDiscountValue || '0');
            const finalExtra = parseFloat(pos.posExtraCharge || '0');
            const finalDelivery = parseFloat(pos.posDeliveryFee || '0');

            // Determinar orderType baseado na aba ativa
            const orderType = pos.activeTab === 'table' ? 'TABLE' : 'DELIVERY';
            const isDelivery = pos.activeTab === 'delivery';
            const isCounter = pos.activeTab === 'counter';

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
                orderType,
                tableNumber: pos.activeTab === 'table' ? parseInt(pos.selectedTable) : null,
                paymentMethod: method?.name || 'OUTRO',
                customerName: pos.activeTab === 'table' ? pos.customerName : (isCounter ? (pos.customerName || 'Balcão') : pos.deliveryInfo.name),
                deliveryInfo: isDelivery ? {
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

            // ─── LÓGICA DE ENVIO POR MODO ───

            // MESA: Adiciona itens à comanda existente + imprime os itens novos (cozinha)
            if (pos.activeTab === 'table') {
                const tableInfo = tablesSummary.find(t => t.number === parseInt(pos.selectedTable));
                const activeOrderId = tableInfo?.tabs?.[0]?.orderId;

                if (activeOrderId && tableInfo.status !== 'free') {
                    // Adiciona itens ao pedido existente
                    await addItemsToOrder(activeOrderId, orderPayload.items);
                    if (finalDiscount > 0 || finalExtra > 0) {
                        const newTotal = tableInfo.totalAmount + orderPayload.totalAmount;
                        await updateOrderFinancials(activeOrderId, { discount: finalDiscount, surcharge: finalExtra, total: newTotal });
                    }
                    
                    // Imprime os itens novos na cozinha/bar
                    try {
                        const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
                        const orderForPrint = {
                            ...orderPayload,
                            id: activeOrderId,
                            orderType: 'TABLE' as const,
                            status: 'PENDING' as const,
                            tableNumber: parseInt(pos.selectedTable),
                            items: cart.map(item => ({
                                ...item,
                                product: { name: item.name, categories: [] },
                                priceAtTime: item.price,
                            })),
                        };
                        await printOrder(orderForPrint as any, printerConfig);
                        toast.success("Itens adicionados e impressos na cozinha!");
                    } catch {
                        toast.success("Itens adicionados ao pedido!");
                    }
                } else {
                    // Novo pedido de mesa
                    await createOrder(orderPayload);
                    toast.success("Pedido enviado!");
                }
            } 
            // DELIVERY / BALCÃO: SEMPRE cria pedido NOVO (nunca junta com existente)
            else {
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
        
        // Taxa de entrega só para delivery com entrega
        const isDeliveryWithFee = pos.activeTab === 'delivery' && pos.deliverySubType === 'delivery';
        pos.setPosDeliveryFee(isDeliveryWithFee ? deliveryFee.toString() : '0');
        pos.setPosExtraCharge('0');
        pos.setPosDiscountValue('0');
        pos.setPosDiscountPercentage('0');
        pos.setPosPaymentMethodId('');
        pos.setPosObservations('');
        
        pos.setActiveModal('pos_checkout');
    }, [pos, cart, deliveryFee]);

    const handleTableCheckout = useCallback(async (viewingTable: TableSummary, checkoutData: any) => {
        try {
            // Imprime o fechamento detalhado da mesa ANTES de finalizar
            try {
                const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
                const orderForPrint = {
                    ...viewingTable,
                    orderType: 'TABLE' as const,
                    status: 'COMPLETED' as const,
                    items: viewingTable.items || [],
                    totalAmount: viewingTable.totalAmount,
                    tableNumber: viewingTable.number,
                };
                await printOrder(orderForPrint as any, printerConfig);
            } catch (err) {
                console.error('[handleTableCheckout] Erro ao imprimir fechamento:', err);
            }

            // Finaliza a mesa no backend
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
