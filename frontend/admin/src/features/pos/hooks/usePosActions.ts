import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
    createOrder, addItemsToOrder, updateOrderFinancials, 
    toggleStoreStatus, openCashier, checkoutTable, transferTable, markOrderAsPrinted 
} from '../../../services/api';
import { usePosStore } from './usePosStore';
import { useCartStore, useCartTotal } from './useCartStore';
import { Product, TableSummary, PaymentMethod, Order, CartItem } from '../../../types';
import { printOrder } from '../../../services/printer';

interface OrderPayload {
    items: Array<{
        productId: string;
        quantity: number;
        observations?: string;
        sizeId?: string;
        addonsIds?: string[];
        sizeJson?: string;
        addonsJson?: string;
    }>;
    orderType: string;
    tableNumber: number | null;
    paymentMethod: string;
    customerName: string;
    deliveryInfo: any;
    discount: number;
    extraCharge: number;
    totalAmount: number;
    dailyOrderNumber?: number;
    id?: string;
}

const validateOrder = (activeTab: string, selectedTable: string, deliveryInfo: any, paymentMethodId: string): string | null => {
    if (activeTab === 'table' && !selectedTable) return "Por favor, selecione uma mesa";
    if (activeTab === 'delivery' && !deliveryInfo.name) return "Vincule um cliente para delivery";
    if (!paymentMethodId) return "Selecione uma forma de pagamento";
    return null;
};

const buildOrderPayload = (
    cart: CartItem[],
    activeTab: string,
    selectedTable: string,
    customerName: string,
    deliveryInfo: any,
    deliverySubType: string,
    posObservations: string,
    paymentMethods: PaymentMethod[],
    posPaymentMethodId: string,
    cartTotalValue: number,
    finalDiscount: number,
    finalExtra: number,
    finalDelivery: number
): OrderPayload => {
    const method = paymentMethods.find(m => m.id === posPaymentMethodId);
    const isDelivery = activeTab === 'delivery';
    const isCounter = activeTab === 'counter';

    const orderType = activeTab === 'table' ? 'TABLE' : (activeTab === 'counter' ? 'PICKUP' : 'DELIVERY');

    return {
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
        tableNumber: activeTab === 'table' ? parseInt(selectedTable) : null,
        paymentMethod: posPaymentMethodId || method?.id || 'OUTRO',
        customerName: activeTab === 'table' ? customerName : (isCounter ? (customerName || 'Balcão') : deliveryInfo.name),
        deliveryInfo: isDelivery ? {
            name: deliveryInfo.name,
            phone: deliveryInfo.phone,
            address: deliveryInfo.address, 
            complement: deliveryInfo.complement,
            reference: deliveryInfo.reference,
            deliveryType: deliverySubType === 'delivery' ? 'delivery' : 'retirada',
            deliveryFee: finalDelivery,
            notes: posObservations
        } : (isCounter ? {
            name: customerName || 'Balcão',
            phone: deliveryInfo?.phone || '',
            address: 'Retirada no Balcão',
            deliveryType: 'retirada',
            deliveryFee: 0,
            notes: posObservations
        } : null),
        discount: finalDiscount,
        extraCharge: finalExtra,
        totalAmount: Number((cartTotalValue + finalExtra + finalDelivery - finalDiscount).toFixed(2))
    };
};

const printNewItems = async (orderPayload: OrderPayload, targetOrderId: string, tableNumber: number, cart: CartItem[], products: Product[], customerName: string) => {
    const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
    const itemsWithProducts = cart.map(item => {
        const fullProduct = products.find(p => p.id === item.productId);
        return {
            ...item,
            product: fullProduct || { name: item.name, categories: [] },
            priceAtTime: item.price,
        };
    });
    
    const orderForPrint = {
        ...orderPayload,
        id: targetOrderId,
        orderType: 'TABLE' as const,
        status: 'PENDING' as const,
        tableNumber,
        customerName: customerName || `Mesa ${tableNumber}`,
        items: itemsWithProducts,
    };
    await printOrder(orderForPrint as any, printerConfig);
    await markOrderAsPrinted(targetOrderId);
};

export const usePosActions = (
    refreshTables: () => void, 
    refreshData: () => void,
    tablesSummary: TableSummary[],
    paymentMethods: PaymentMethod[],
    deliveryOrders: Order[],
    deliveryFee: number,
    products: Product[]
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
        const validationError = validateOrder(pos.activeTab, pos.selectedTable, pos.deliveryInfo, pos.posPaymentMethodId);
        if (validationError) return toast.error(validationError);

        const finalDiscount = parseFloat(pos.posDiscountValue || '0');
        const finalExtra = parseFloat(pos.posExtraCharge || '0');
        const finalDelivery = parseFloat(pos.posDeliveryFee || '0');

        const orderPayload = buildOrderPayload(
            cart, pos.activeTab, pos.selectedTable, pos.customerName,
            pos.deliveryInfo, pos.deliverySubType, pos.posObservations,
            paymentMethods, pos.posPaymentMethodId, cartTotal,
            finalDiscount, finalExtra, finalDelivery
        );

        try {
            if (pos.activeTab === 'table') {
                const tableInfo = tablesSummary.find(t => t.number === parseInt(pos.selectedTable));
                const activeOrderId = tableInfo?.tabs?.[0]?.orderId;
                const customerName = pos.customerName?.trim() || '';

                let targetOrderId = activeOrderId;
                if (customerName && tableInfo?.tabs) {
                    const existingTab = tableInfo.tabs.find(tab => 
                        tab.customerName === customerName && tab.items.length > 0
                    );
                    if (existingTab) targetOrderId = existingTab.orderId;
                }

                if (targetOrderId && tableInfo?.status !== 'free') {
                    const updatedOrder = await addItemsToOrder(targetOrderId, orderPayload.items);
                    
                    if (finalDiscount > 0 || finalExtra > 0) {
                        const tabInfo = tableInfo.tabs.find(t => t.orderId === targetOrderId);
                        const newTotal = (tabInfo?.totalAmount || 0) + orderPayload.totalAmount;
                        await updateOrderFinancials(targetOrderId, { discount: finalDiscount, surcharge: finalExtra, total: newTotal });
                    }
                    
                    // Se o status mudou para PREPARING, o GlobalOrderMonitor já vai imprimir
                    // Só imprimimos manualmente se stayed PENDING (autoAcceptOrders desativado)
                    if (updatedOrder?.status === 'PENDING') {
                        try {
                            await printNewItems(orderPayload, targetOrderId, parseInt(pos.selectedTable), cart, products, customerName);
                            toast.success(`Itens de ${customerName || 'Mesa'} impressos na cozinha!`);
                        } catch (err) {
                            console.error('[submitOrder] Erro ao imprimir itens:', err);
                            toast.success("Itens adicionados ao pedido!");
                        }
                    } else {
                        toast.success("Itens adicionados ao pedido!");
                    }
                } else {
                    await createOrder(orderPayload);
                    toast.success("Pedido enviado!");
                }
            } else {
                // Para balcão (PICKUP) ou delivery, cria o pedido
                await createOrder(orderPayload);
                toast.success("Pedido enviado!");
                // A impressão será tratada pelo GlobalOrderMonitor automaticamente
            }

            clearCart();
            pos.resetPos();
            refreshTables();
            refreshData();
        } catch (e) {
            toast.error("Erro ao enviar pedido");
        }
    }, [pos, cart, paymentMethods, tablesSummary, deliveryOrders, cartTotal, clearCart, refreshTables, refreshData, products]);

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
            // Imprime o fechamento detalhado de cada comanda ANTES de finalizar
            try {
                const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
                const tabs = viewingTable.tabs || [];
                
                if (tabs.length > 0) {
                    // Imprime cada comanda separadamente
                    for (const tab of tabs) {
                        const orderForPrint = {
                            id: tab.orderId,
                            orderType: 'TABLE' as const,
                            status: 'COMPLETED' as const,
                            tableNumber: viewingTable.number,
                            customerName: tab.customerName,
                            totalAmount: tab.totalAmount,
                            items: (tab.items || []).map((item: any) => ({
                                ...item,
                                product: item.product || { name: item.name, categories: [] },
                                priceAtTime: item.priceAtTime || 0,
                            })),
                        };
                        await printOrder(orderForPrint as any, printerConfig);
                        await markOrderAsPrinted(tab.orderId);
                    }
                } else {
                    // Fallback: imprime todos os itens juntos
                    const orderForPrint = {
                        ...viewingTable,
                        orderType: 'TABLE' as const,
                        status: 'COMPLETED' as const,
                        items: viewingTable.items || [],
                        totalAmount: viewingTable.totalAmount,
                        tableNumber: viewingTable.number,
                    };
                    await printOrder(orderForPrint as any, printerConfig);
                    await markOrderAsPrinted(viewingTable.id);
                }
            } catch (err) {
                console.error('[handleTableCheckout] Erro ao imprimir fechamento:', err);
            }

            // Finaliza a mesa no backend
            await checkoutTable(viewingTable.id, checkoutData);
            toast.success("Mesa finalizada com sucesso!");
            pos.setActiveModal('none');
            refreshTables();
            refreshData();
        } catch (error) {
            toast.error("Erro ao finalizar mesa.");
        }
    }, [pos, refreshTables, refreshData]);

    const handleTransferTable = useCallback(async (viewingTable: TableSummary, newTableNumber: number) => {
        try {
            await transferTable(viewingTable.id, newTableNumber);
            toast.success(`Mesa transferida para ${newTableNumber}`);
            pos.setActiveModal('none');
            refreshTables();
            refreshData();
        } catch (error) {
            toast.error("Erro ao transferir mesa.");
        }
    }, [pos, refreshTables, refreshData]);

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
