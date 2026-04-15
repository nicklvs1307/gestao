import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getPaymentMethods } from '../services/api';
import { getPosTableSummary } from '../services/api/tables';
import { printOrder } from '../services/printer';
import {
    ChevronLeft, Printer, Loader2, X,
    ShoppingCart, Users, Receipt, Wallet, Banknote,
    QrCode, CreditCard, Percent, FileText, CheckCircle2,
    ArrowRightLeft, Split, Layers, Clock
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { formatSP } from '@/lib/timezone';

// ─── TYPES ──────────────────────────────────────────────────────────────
interface OrderItem {
    id: string;
    quantity: number;
    priceAtTime: number;
    isPaid: boolean;
    product: {
        name: string;
    };
    sizeJson?: string;
    addonsJson?: string;
    observations?: string;
}

interface Tab {
    orderId: string;
    customerName: string;
    items: OrderItem[];
    totalAmount: number;
    balanceDue: number;
}

interface Order {
    id: string;
    tableNumber: number;
    customerName: string;
    total: number;
    discount: number;
    extraCharge: number;
    createdAt: string;
    items: OrderItem[];
    payments: any[];
    restaurantId: string;
}

interface PayingItem {
    itemId: string;
    quantity: number;
    price: number;
    name: string;
    tabId: string;
}

interface CurrentPayment {
    methodId: string;
    methodName: string;
    amount: number;
    tabId: string;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────
const TableCheckout: React.FC = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    // ── State ──
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [serviceTaxRate, setServiceTaxRate] = useState(10);
    const [useServiceTax, setUseServiceTax] = useState(true);

    // ── Comandas (tabs) ──
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');

    // ── Pagamento ──
    const [payingItems, setPayingItems] = useState<PayingItem[]>([]);
    const [currentPayments, setCurrentPayments] = useState<CurrentPayment[]>([]);
    const [discount, setDiscount] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

    // ── UI ──
    const [printing, setPrinting] = useState(false);

    // ── Tab ativa ──
    const activeTab = useMemo(() => {
        return tabs.find(t => t.orderId === activeTabId) || tabs[0];
    }, [tabs, activeTabId]);

    // Itens da tab ativa (não pagos)
    const activeUnpaidItems = useMemo(() => {
        return (activeTab?.items || []).filter(i => !i.isPaid);
    }, [activeTab]);

    // Seleciona primeira tab ao carregar
    useEffect(() => {
        if (tabs.length > 0 && !activeTabId) {
            setActiveTabId(tabs[0].orderId);
        }
    }, [tabs, activeTabId]);

    // ── Fetch ──
    const fetchOrder = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders/${orderId}`);
            setOrder(res.data);

            // Busca configurações para taxa de serviço
            try {
                const restRes = await api.get(`/settings`);
                const settings = restRes.data.settings || restRes.data;
                setServiceTaxRate(settings.serviceTaxPercentage || 10);
            } catch {
                setServiceTaxRate(10);
            }

            fetchPaymentMethods(res.data.restaurantId);

            // Busca comandas da mesa
            try {
                const summary = await getPosTableSummary();
                const tableData = summary.find((t: any) => t.number === res.data.tableNumber);
                if (tableData?.tabs && tableData.tabs.length > 0) {
                    setTabs(tableData.tabs);
                } else {
                    // Fallback: uma única comanda
                    setTabs([{
                        orderId: res.data.id,
                        customerName: res.data.customerName || 'Cliente Avulso',
                        items: res.data.items || [],
                        totalAmount: res.data.total || 0,
                        balanceDue: res.data.total || 0,
                    }]);
                }
            } catch {
                // Fallback: uma única comanda
                setTabs([{
                    orderId: res.data.id,
                    customerName: res.data.customerName || 'Cliente Avulso',
                    items: res.data.items || [],
                    totalAmount: res.data.total || 0,
                    balanceDue: res.data.total || 0,
                }]);
            }
        } catch {
            toast.error("Erro ao carregar pedido");
            navigate('/pos?tab=tables');
        } finally {
            setLoading(false);
        }
    }, [orderId, navigate]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const fetchPaymentMethods = async (restaurantId: string) => {
        try {
            const res = await getPaymentMethods(restaurantId);
            const filtered = res.filter((m: any) => m.isActive);
            setPaymentMethods(filtered);
            if (filtered.length > 0) setSelectedMethodId(filtered[0].id);
        } catch (err) { console.error(err); }
    };

    // ── Financeiro ──
    const subtotalItems = payingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const serviceTaxAmount = useServiceTax ? Number((subtotalItems * (serviceTaxRate / 100)).toFixed(2)) : 0;
    const totalToPay = Number((subtotalItems + serviceTaxAmount + surcharge - discount).toFixed(2));
    const amountPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, totalToPay - amountPaid);
    const changeAmount = Math.max(0, amountPaid - totalToPay);

    // Itens não pagos de todas as comandas
    const allUnpaidItems = useMemo(() => {
        return tabs.flatMap(t => (t.items || []).filter(i => !i.isPaid));
    }, [tabs]);

    useEffect(() => {
        if (remainingToPay > 0) setInputValue(remainingToPay.toFixed(2));
        else setInputValue('0.00');
    }, [payingItems, discount, surcharge, useServiceTax, totalToPay, amountPaid]);

    // ── Impressão ──
    const handlePrintPreBill = useCallback(async (tab?: Tab) => {
        const targetTab = tab || activeTab;
        if (!targetTab || !order) return;

        const itemsToPrint = (targetTab.items || []).filter(i => !i.isPaid);
        if (itemsToPrint.length === 0) {
            toast.error('Nenhum item para imprimir');
            return;
        }

        setPrinting(true);
        try {
            const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
            const orderForPrint = {
                id: targetTab.orderId,
                orderType: 'TABLE' as const,
                status: 'PENDING' as const,
                tableNumber: order.tableNumber,
                customerName: targetTab.customerName,
                totalAmount: targetTab.totalAmount,
                total: targetTab.totalAmount,
                createdAt: order.createdAt,
                items: itemsToPrint.map(item => ({
                    ...item,
                    product: item.product || { name: item.product?.name || 'Produto', categories: [] },
                    priceAtTime: item.priceAtTime || 0,
                })),
                payments: order.payments || [],
                restaurantId: order.restaurantId,
                dailyOrderNumber: targetTab.orderId.slice(-4).toUpperCase(),
            };

            await printOrder(orderForPrint as any, config);
            toast.success(`Pré-conta de ${targetTab.customerName} enviada!`);
        } catch (e) {
            console.error('[printPreBill] Erro:', e);
            toast.error('Erro ao imprimir pré-conta');
        } finally {
            setPrinting(false);
        }
    }, [activeTab, order]);

    const handlePrintAllPreBills = useCallback(async () => {
        if (!order) return;
        setPrinting(true);
        try {
            const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
            for (const tab of tabs) {
                const itemsToPrint = (tab.items || []).filter(i => !i.isPaid);
                if (itemsToPrint.length === 0) continue;
                const orderForPrint = {
                    id: tab.orderId,
                    orderType: 'TABLE' as const,
                    status: 'PENDING' as const,
                    tableNumber: order.tableNumber,
                    customerName: tab.customerName,
                    totalAmount: tab.totalAmount,
                    total: tab.totalAmount,
                    createdAt: order.createdAt,
                    items: itemsToPrint.map(item => ({
                        ...item,
                        product: item.product || { name: item.product?.name || 'Produto', categories: [] },
                        priceAtTime: item.priceAtTime || 0,
                    })),
                    payments: order.payments || [],
                    restaurantId: order.restaurantId,
                    dailyOrderNumber: tab.orderId.slice(-4).toUpperCase(),
                };
                await printOrder(orderForPrint as any, config);
            }
            toast.success('Todas as pré-contas enviadas!');
        } catch (e) {
            console.error('[printAllPreBills] Erro:', e);
            toast.error('Erro ao imprimir pré-contas');
        } finally {
            setPrinting(false);
        }
    }, [order, tabs]);

    // ── Ações de itens ──
    const addOneToPayment = useCallback((item: OrderItem) => {
        const existing = payingItems.find(i => i.itemId === item.id);
        const alreadyInPayment = existing?.quantity || 0;
        if (alreadyInPayment < item.quantity) {
            if (existing) {
                setPayingItems(prev => prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
            } else {
                setPayingItems(prev => [...prev, {
                    itemId: item.id, quantity: 1, price: item.priceAtTime,
                    name: item.product.name, tabId: activeTabId,
                }]);
            }
        }
    }, [payingItems, activeTabId]);

    const addAllToPayment = useCallback((item: OrderItem) => {
        setPayingItems(prev => {
            const filtered = prev.filter(i => i.itemId !== item.id);
            return [...filtered, {
                itemId: item.id, quantity: item.quantity, price: item.priceAtTime,
                name: item.product.name, tabId: activeTabId,
            }];
        });
    }, [activeTabId]);

    const payEverything = useCallback(() => {
        if (!order) return;
        setPayingItems(allUnpaidItems.map(i => ({
            itemId: i.id, quantity: i.quantity, price: i.priceAtTime,
            name: i.product.name, tabId: activeTabId,
        })));
    }, [order, allUnpaidItems, activeTabId]);

    const payTabEverything = useCallback(() => {
        if (!activeTab) return;
        setPayingItems(activeUnpaidItems.map(i => ({
            itemId: i.id, quantity: i.quantity, price: i.priceAtTime,
            name: i.product.name, tabId: activeTabId,
        })));
    }, [activeTab, activeUnpaidItems, activeTabId]);

    const divideTab = useCallback(() => {
        const persons = prompt("Dividir a conta de " + (activeTab?.customerName || 'esta comanda') + " em quantas pessoas?");
        if (persons) {
            const n = parseInt(persons);
            if (n > 1 && activeTab) {
                const val = (activeTab.totalAmount / n).toFixed(2);
                setInputValue(val);
                toast.info(`Valor sugerido: R$ ${val} por pessoa`);
            }
        }
    }, [activeTab]);

    // ── Pagamento ──
    const handleAddPayment = useCallback(() => {
        const method = paymentMethods.find(m => m.id === selectedMethodId);
        if (!method) return toast.error("Selecione um método");
        const amount = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return toast.error("Valor inválido");
        setCurrentPayments(prev => [...prev, {
            methodId: method.id, methodName: method.name, amount, tabId: activeTabId,
        }]);
        setInputValue('');
    }, [paymentMethods, selectedMethodId, inputValue, activeTabId]);

    const handleConfirmPayment = useCallback(async () => {
        if (currentPayments.length === 0) return toast.error("Adicione um pagamento");
        if (amountPaid < totalToPay) return toast.error("Valor insuficiente");

        // Agrupa pagamentos por comanda
        const paymentsByTab: Record<string, CurrentPayment[]> = {};
        currentPayments.forEach(p => {
            if (!paymentsByTab[p.tabId]) paymentsByTab[p.tabId] = [];
            paymentsByTab[p.tabId].push(p);
        });

        try {
            // Processa cada comanda que tem pagamento
            for (const [tabId, payments] of Object.entries(paymentsByTab)) {
                const tab = tabs.find(t => t.orderId === tabId);
                if (!tab) continue;

                const tabItemIds = payingItems.filter(i => i.tabId === tabId).map(i => i.itemId);
                if (tabItemIds.length === 0) continue;

                const tabPayments = payments.map(p => ({ amount: p.amount, method: p.methodName }));

                const res = await api.post(`/admin/tables/partial-payment-simple`, {
                    orderId: tabId,
                    itemIds: tabItemIds,
                    payments: tabPayments,
                    discount: 0,
                    surcharge: 0,
                });

                if (res.data.finished) {
                    toast.success(`Comanda de ${tab.customerName} finalizada!`);
                } else {
                    toast.success(`Pagamento parcial de ${tab.customerName}!`);
                }
            }

            setPayingItems([]);
            setCurrentPayments([]);
            setDiscount(0);
            setSurcharge(0);
            await fetchOrder();
        } catch (e) {
            console.error('[confirmPayment] Erro:', e);
            toast.error("Erro ao processar pagamento");
        }
    }, [currentPayments, amountPaid, totalToPay, payingItems, tabs, fetchOrder]);

    const handleCloseTable = useCallback(async () => {
        if (!order) return;
        try {
            // Imprime todas as comandas antes de fechar
            const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
            for (const tab of tabs) {
                const itemsToPrint = (tab.items || []).filter(i => !i.isPaid);
                if (itemsToPrint.length === 0) continue;
                const orderForPrint = {
                    id: tab.orderId,
                    orderType: 'TABLE' as const,
                    status: 'COMPLETED' as const,
                    tableNumber: order.tableNumber,
                    customerName: tab.customerName,
                    totalAmount: tab.totalAmount,
                    total: tab.totalAmount,
                    createdAt: order.createdAt,
                    items: itemsToPrint.map(item => ({
                        ...item,
                        product: item.product || { name: item.product?.name || 'Produto', categories: [] },
                        priceAtTime: item.priceAtTime || 0,
                    })),
                    payments: order.payments || [],
                    restaurantId: order.restaurantId,
                    dailyOrderNumber: tab.orderId.slice(-4).toUpperCase(),
                };
                await printOrder(orderForPrint as any, config);
            }

            // Fecha a mesa
            await api.post(`/admin/tables/${order.id}/close`);
            toast.success("Mesa finalizada com sucesso!");
            navigate('/pos?tab=tables');
        } catch (e) {
            console.error('[closeTable] Erro:', e);
            toast.error("Erro ao fechar mesa");
        }
    }, [order, tabs, navigate]);

    // ── Loading ──
    if (loading || !order) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-slate-400" size={40} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando comandas...</p>
                </div>
            </div>
        );
    }

    // ── Render ──
    return (
        <div className="h-screen flex flex-col bg-slate-100 text-slate-700 overflow-hidden font-sans">

            {/* ═══════ HEADER ═══════ */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-lg z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/pos?tab=tables')} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter">
                            Mesa {order.tableNumber < 10 ? `0${order.tableNumber}` : order.tableNumber}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {tabs.length} {tabs.length === 1 ? 'comanda' : 'comandas'} · {formatSP(order.createdAt, "HH:mm")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right px-4 border-r border-white/10 mr-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Total Mesa</p>
                        <p className="text-xl font-black">R$ {order.total.toFixed(2)}</p>
                    </div>

                    <Button
                        variant="outline"
                        className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/20 font-bold text-[10px] uppercase"
                        onClick={handlePrintAllPreBills}
                        disabled={printing}
                    >
                        <Printer size={14} className="mr-2" />
                        {printing ? 'Imprimindo...' : 'Imprimir Todas'}
                    </Button>

                    <Button
                        className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase shadow-lg"
                        onClick={handleCloseTable}
                    >
                        <CheckCircle2 size={14} className="mr-2" /> Fechar Mesa
                    </Button>

                    <button onClick={() => navigate('/pos?tab=tables')} className="ml-2 w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* ═══════ TABS DE COMANDAS ═══════ */}
            {tabs.length > 1 && (
                <div className="bg-white border-b border-slate-200 px-6 py-2 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Comandas:</span>
                        {tabs.map(tab => {
                            const isActive = tab.orderId === activeTabId;
                            const unpaidCount = (tab.items || []).filter(i => !i.isPaid).length;
                            return (
                                <button
                                    key={tab.orderId}
                                    onClick={() => setActiveTabId(tab.orderId)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shrink-0",
                                        isActive
                                            ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                                    )}
                                >
                                    <Users size={12} />
                                    <span className="text-xs font-bold">{tab.customerName}</span>
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        isActive ? "text-emerald-400" : "text-emerald-600"
                                    )}>
                                        R$ {tab.totalAmount.toFixed(2)}
                                    </span>
                                    {unpaidCount > 0 && (
                                        <span className={cn(
                                            "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                                            isActive ? "bg-white/20 text-white" : "bg-orange-100 text-orange-600"
                                        )}>
                                            {unpaidCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══════ CONTEÚDO 3 COLUNAS ═══════ */}
            <main className="flex-1 flex overflow-hidden p-4 gap-4">

                {/* ── COLUNA 1: ITENS DA COMANDA ── */}
                <section className="w-1/4 flex flex-col gap-3 min-w-[320px]">
                    {/* Ações rápidas */}
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={payEverything} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-[9px] font-black uppercase italic shadow-md">
                            Pagar Tudo
                        </Button>
                        <Button onClick={payTabEverything} className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 text-[9px] font-black uppercase italic shadow-md">
                            Pagar Comanda
                        </Button>
                        <Button variant="outline" className="flex-1 h-10 border-slate-300 text-slate-500 text-[9px] font-black uppercase italic" onClick={divideTab}>
                            <Split size={12} className="mr-1" /> Dividir
                        </Button>
                    </div>

                    <Card className="flex-1 overflow-hidden flex flex-col border-slate-200 shadow-sm" noPadding>
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {activeTab ? `Itens de ${activeTab.customerName}` : 'Itens'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                                {activeUnpaidItems.length} itens
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {activeUnpaidItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
                                    <FileText size={32} />
                                    <p className="text-xs font-bold uppercase">Nenhum item pendente</p>
                                </div>
                            ) : activeUnpaidItems.map(item => {
                                const inPayment = payingItems.find(i => i.itemId === item.id);
                                const isFullySelected = inPayment?.quantity === item.quantity;
                                return (
                                    <div key={item.id} className={cn(
                                        "p-3 rounded-xl border transition-all",
                                        isFullySelected ? "bg-slate-50 border-transparent opacity-50" : "bg-white border-slate-100 shadow-sm"
                                    )}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 pr-2">
                                                <p className="text-[11px] font-bold text-slate-900 uppercase leading-tight truncate">{item.product.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 mt-1">{item.quantity} UN x R$ {item.priceAtTime.toFixed(2)}</p>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => addOneToPayment(item)} className="flex-1 h-7 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] uppercase hover:bg-slate-200">Add 1</button>
                                            <button onClick={() => addAllToPayment(item)} className="flex-1 h-7 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold text-[9px] uppercase hover:bg-blue-600 hover:text-white">Todos</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </section>

                {/* ── COLUNA 2: TERMINAL DE PAGAMENTO ── */}
                <section className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={() => setDiscount(d => d + 5)} className="flex-1 h-12 bg-slate-700 hover:bg-slate-800 text-[10px] font-black uppercase">Aplicar Desconto R$ 5</Button>
                        <Button onClick={() => setSurcharge(s => s + 5)} className="flex-1 h-12 bg-slate-700 hover:bg-slate-800 text-[10px] font-black uppercase">Aplicar Acréscimo R$ 5</Button>
                    </div>

                    <Card className="flex-1 flex flex-col border-slate-200 shadow-xl overflow-hidden" noPadding>
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-end shrink-0">
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                                    {activeTab ? `Total ${activeTab.customerName}` : 'Total a Receber'}
                                </p>
                                <h2 className="text-5xl font-black italic tracking-tighter">R$ {totalToPay.toFixed(2).replace('.', ',')}</h2>
                            </div>
                            <div className="text-right">
                                {amountPaid > 0 && <p className="text-sm font-bold text-emerald-400 uppercase">Pago: R$ {amountPaid.toFixed(2)}</p>}
                                <p className={cn("text-lg font-black italic", remainingToPay > 0 ? "text-orange-400" : "text-emerald-400")}>
                                    {remainingToPay > 0 ? `Falta: R$ ${remainingToPay.toFixed(2)}` : `Troco: R$ ${changeAmount.toFixed(2)}`}
                                </p>
                            </div>
                        </div>

                        {/* CONFIG DE TAXA E AJUSTES */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2">
                                <span>Taxa de Serviço ({serviceTaxRate}%):</span>
                                <button onClick={() => setUseServiceTax(!useServiceTax)} className={cn("w-10 h-5 rounded-full relative transition-colors", useServiceTax ? "bg-emerald-500" : "bg-slate-300")}>
                                    <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", useServiceTax ? "left-6" : "left-1")} />
                                </button>
                            </div>
                            {(discount > 0 || surcharge > 0) && (
                                <button onClick={() => { setDiscount(0); setSurcharge(0); }} className="text-rose-500 underline underline-offset-4">Limpar Ajustes</button>
                            )}
                        </div>

                        {/* ITENS NO CARRINHO DE PAGAMENTO */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {payingItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                    <ShoppingCart size={48} className="mb-4" />
                                    <p className="text-xs font-bold uppercase">Selecione itens para pagar</p>
                                </div>
                            ) : (
                                payingItems.map(item => (
                                    <div key={item.itemId} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-black">{item.quantity}</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 uppercase">{item.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase">Valor: R$ {item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => setPayingItems(prev => prev.filter(i => i.itemId !== item.itemId))} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* PAGAMENTOS JÁ REALIZADOS NESTA TRANSAÇÃO */}
                        {currentPayments.length > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lançamentos:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentPayments.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold text-[10px] uppercase">
                                            {p.methodName}: R$ {p.amount.toFixed(2)}
                                            <button onClick={() => setCurrentPayments(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                {/* ── COLUNA 3: MÉTODOS E CONCLUSÃO ── */}
                <section className="w-1/4 flex flex-col gap-3 min-w-[320px]">
                    <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden" noPadding>
                        <div className="p-4 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">Forma de Recebimento</div>
                        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                            {paymentMethods.map(m => (
                                <button key={m.id} onClick={() => setSelectedMethodId(m.id)} className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                    selectedMethodId === m.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
                                )}>
                                    {m.type === 'CASH' ? <Banknote size={20} /> : m.type === 'PIX' ? <QrCode size={20} /> : <CreditCard size={20} />}
                                    <span className="text-[9px] font-black uppercase text-center">{m.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor do Pagamento</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">R$</span>
                                    <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full h-16 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-2xl font-black text-slate-900 focus:border-blue-500 outline-none transition-all shadow-inner" placeholder="0,00" />
                                </div>
                            </div>
                            <Button onClick={handleAddPayment} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg">Registrar Valor</Button>
                        </div>
                    </Card>

                    <Button onClick={handleConfirmPayment} disabled={remainingToPay > 0 || currentPayments.length === 0} className={cn("h-24 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95", remainingToPay === 0 && currentPayments.length > 0 ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-500 cursor-not-allowed")}>Finalizar e Liberar</Button>
                </section>
            </main>

            {/* BARRA DE RODAPÉ */}
            <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase" onClick={() => navigate('/pos?tab=tables')}>
                    <ChevronLeft size={16} className="mr-2" /> Voltar ao Salão
                </Button>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                        <Layers size={14} /> Comandas: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{tabs.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                        <Clock size={14} /> Pagamentos: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{order.payments?.length || 0}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TableCheckout;
