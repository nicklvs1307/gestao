import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getProducts, getCategories, getTables, getAdminOrders,
    getSettings, getCashierStatus, getPaymentMethods, getPosTableSummary
} from '../../../services/api';
import { useSocket } from '../../../hooks/useSocket';
import type { Product, Category, TableSummary, PaymentMethod, Order } from '../../../types';

export const usePosData = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [tablesSummary, setTablesSummary] = useState<TableSummary[]>([]);
    const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [isCashierOpen, setIsCashierOpen] = useState(false);
    const [cashierSession, setCashierSession] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);

    const { on, off } = useSocket();
    const isMountedRef = useRef(true);

    const loadTableSummary = useCallback(async () => {
        if (!isMountedRef.current) return;
        try {
            const summary = await getPosTableSummary();
            if (isMountedRef.current) {
                setTablesSummary(summary);
            }
        } catch (error) {
            console.error("Erro ao carregar mesas:", error);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        if (!isMountedRef.current) return;
        try {
            const ordersData = await getAdminOrders();
            if (isMountedRef.current) {
                setDeliveryOrders((ordersData || []).filter((o: { orderType: string }) => o.orderType === 'DELIVERY' || o.orderType === 'PICKUP'));
            }
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
        }
    }, []);

    const loadCashierStatus = useCallback(async () => {
        if (!isMountedRef.current) return;
        try {
            const cashierData = await getCashierStatus();
            if (isMountedRef.current && cashierData) {
                setIsCashierOpen(cashierData.isOpen);
                setCashierSession(cashierData.session);
            }
        } catch (error) {
            console.error("Erro ao carregar caixa:", error);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const restaurantId = user?.restaurantId;

            const [productsData, categoriesData, tablesData, settingsData, cashierData, paymentMethodsData, ordersData] = await Promise.all([
                getProducts(),
                getCategories(),
                getTables(),
                getSettings(),
                getCashierStatus(),
                restaurantId ? getPaymentMethods(restaurantId) : Promise.resolve([]),
                getAdminOrders()
            ]);

            if (!isMountedRef.current) return;

            setProducts(productsData || []);
            setCategories(categoriesData || []);
            setTables(tablesData || []);
            setPaymentMethods(paymentMethodsData || []);
            setDeliveryOrders((ordersData || []).filter((o: { orderType: string }) => o.orderType === 'DELIVERY' || o.orderType === 'PICKUP'));

            if (settingsData?.settings) {
                setIsStoreOpen(settingsData.settings.isOpen);
                setDeliveryFee(settingsData.settings.deliveryFee || 0);
            }
            if (cashierData) {
                setIsCashierOpen(cashierData.isOpen);
                setCashierSession(cashierData.session);
            }
            await loadTableSummary();
        } catch (error) {
            console.error("Erro ao carregar dados do PDV:", error);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [loadTableSummary]);

    useEffect(() => {
        isMountedRef.current = true;
        
        loadInitialData();

        const handleOrderUpdate = () => {
            loadTableSummary();
            loadOrders();
        };

        const handleNewOrder = () => {
            loadTableSummary();
            loadOrders();
        };

        const handleCashierUpdate = () => {
            loadCashierStatus();
        };

        const cleanupOrderUpdate = on('order_update', handleOrderUpdate);
        const cleanupNewOrder = on('new_order', handleNewOrder);
        const cleanupCashierUpdate = on('cashier_update', handleCashierUpdate);

        return () => {
            isMountedRef.current = false;
            cleanupOrderUpdate?.();
            cleanupNewOrder?.();
            cleanupCashierUpdate?.();
            off('order_update');
            off('new_order');
            off('cashier_update');
        };
    }, [loadInitialData, loadTableSummary, loadOrders, loadCashierStatus, on, off]);

    return {
        products,
        categories,
        paymentMethods,
        tables,
        tablesSummary,
        deliveryOrders,
        isStoreOpen,
        setIsStoreOpen,
        deliveryFee,
        isCashierOpen,
        setIsCashierOpen,
        cashierSession,
        loading,
        refreshData: loadInitialData,
        refreshTables: loadTableSummary
    };
};
