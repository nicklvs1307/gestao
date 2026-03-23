import { useState, useEffect } from 'react';
import { 
    getProducts, getCategories, getTables, getAdminOrders,
    getSettings, getCashierStatus, getPaymentMethods, getPosTableSummary 
} from '../../../services/api';
import { useSocket } from '../../../hooks/useSocket';
import { Product, Category, TableSummary, PaymentMethod, Order } from '../../../types';

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
    const [cashierSession, setCashierSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const { on, off } = useSocket();

    const loadTableSummary = async () => {
        try {
            const summary = await getPosTableSummary();
            setTablesSummary(summary);
        } catch (error) {
            console.error("Erro ao carregar mesas:", error);
        }
    };

    const loadInitialData = async () => {
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

            setProducts(productsData || []);
            setCategories(categoriesData || []);
            setTables(tablesData || []);
            setPaymentMethods(paymentMethodsData || []);
            setDeliveryOrders(ordersData.filter((o: any) => o.orderType === 'DELIVERY') || []);
            
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
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
        on('order_update', loadInitialData);
        return () => off('order_update');
    }, [on, off]);

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
