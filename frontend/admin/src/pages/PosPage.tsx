import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getProducts, getCategories, createOrder, getTables, 
    toggleStoreStatus, getCashierStatus, openCashier, closeCashier, getSettings,
    getPosTableSummary, checkoutTable, getCashierSummary, searchCustomers,
    transferTable, transferItems, removeOrderItem, partialTablePayment,
    getPaymentMethods, partialValuePayment, markOrderAsPrinted
} from '../services/api';
import { printOrder } from '../services/printing';
import { 
    Search, ShoppingCart, Plus, Minus, X, Trash2, 
    Store, User, Truck, Utensils,
    Wallet, Banknote, CheckCircle, Printer, Loader2, ChevronRight,
    Pizza as PizzaIcon, Bike, Info, ArrowRightLeft, MoveRight, Receipt, Phone, MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import type { Product, Category, CartItem, TableSummary, PaymentMethod } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const PosPage: React.FC = () => {
    const navigate = useNavigate();
    
    // --- ESTADOS DE DADOS ---
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [tablesSummary, setTablesSummary] = useState<TableSummary[]>([]);
    
    // --- ESTADOS DE SISTEMA ---
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isCashierOpen, setIsCashierOpen] = useState(false);
    const [cashierSession, setCashierSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState<'pos' | 'tables'>('pos');
    
    // --- ESTADOS DE VENDA ATUAL ---
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderMode, setOrderMode] = useState<'table' | 'delivery'>('table');
    const [selectedTable, setSelectedTable] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [deliveryInfo, setDeliveryInfo] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryType: 'pickup' as 'delivery' | 'pickup'
    });

    // --- ESTADOS DE MODAIS E INTERAÇÃO ---
    const [activeModal, setActiveModal] = useState<'none' | 'cashier_open' | 'cashier_close' | 'delivery_info' | 'table_details' | 'payment_method' | 'transfer_table' | 'transfer_items'>('none');
    const [showProductDrawer, setShowProductDrawer] = useState(false);
    const [viewingTable, setViewingTable] = useState<TableSummary | null>(null);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
    
    // --- ESTADOS DE PERSONALIZAÇÃO ---
    const [tempQty, setTempQty] = useState(1);
    const [tempObs, setTempObs] = useState('');
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [selectedFlavorIds, setSelectedFlavorIds] = useState<string[]>([]);
    const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
    const [cashierAmount, setCashierAmount] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedProductForAdd?.pizzaConfig?.flavorCategoryId) {
            const categoryId = selectedProductForAdd.pizzaConfig.flavorCategoryId;
            const flavors = products.filter(p => p.categoryId === categoryId && p.isAvailable);
            setAvailableFlavors(flavors);
        } else {
            setAvailableFlavors([]);
        }
    }, [selectedProductForAdd, products]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const restaurantId = user?.restaurantId;

            const [productsData, categoriesData, tablesData, settingsData, cashierData, paymentMethodsData] = await Promise.all([
                getProducts(),
                getCategories(),
                getTables(),
                getSettings(),
                getCashierStatus(),
                restaurantId ? getPaymentMethods(restaurantId) : Promise.resolve([])
            ]);

            setProducts(productsData || []);
            setCategories(categoriesData || []);
            setTables(tablesData || []);
            setPaymentMethods(paymentMethodsData || []);
            
            if (settingsData?.settings) setIsStoreOpen(settingsData.settings.isOpen);
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

    const loadTableSummary = async () => {
        try {
            const summary = await getPosTableSummary();
            setTablesSummary(summary);
        } catch (error) {
            console.error("Erro ao carregar mesas:", error);
        }
    };

    // --- LÓGICA DE PRODUTOS ---
    const handleProductClick = (product: Product) => {
        if (!isCashierOpen) return toast.error("Abra o caixa antes de vender!");
        setSelectedProductForAdd(product);
        setTempQty(1);
        setTempObs('');
        setSelectedSizeId(product.sizes?.[0]?.id || '');
        setSelectedAddonIds([]);
        setSelectedFlavorIds([]);
        setShowProductDrawer(true);
    };

    const handleFlavorToggle = (flavorId: string) => {
        const product = selectedProductForAdd;
        if (!product?.pizzaConfig) return;
        const size = product.sizes.find(s => s.id === selectedSizeId);
        const max = product.pizzaConfig.sizes?.[size?.name || '']?.maxFlavors || product.pizzaConfig.maxFlavors || 1;

        if (selectedFlavorIds.includes(flavorId)) {
            setSelectedFlavorIds(prev => prev.filter(id => id !== flavorId));
        } else {
            if (selectedFlavorIds.length < max) {
                setSelectedFlavorIds(prev => [...prev, flavorId]);
            } else if (max === 1) {
                setSelectedFlavorIds([flavorId]);
            } else {
                toast.warning(`Limite de ${max} sabores atingido.`);
            }
        }
    };

    const calculateCurrentPrice = () => {
        if (!selectedProductForAdd) return 0;
        const product = selectedProductForAdd;
        const size = product.sizes?.find(s => s.id === selectedSizeId);
        let basePrice = size?.price || product.price;

        if (product.pizzaConfig && selectedFlavorIds.length > 0) {
            const rule = product.pizzaConfig.priceRule || 'higher';
            const flavors = availableFlavors.filter(f => selectedFlavorIds.includes(f.id));
            const flavorPrices = flavors.map(f => {
                const s = f.sizes?.find(sz => sz.name === size?.name);
                return s ? s.price : f.price;
            });
            basePrice = rule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
        }

        const addonsPrice = product.addonGroups?.reduce((total, group) => {
            return total + group.addons.reduce((sum, addon) => {
                return selectedAddonIds.includes(addon.id) ? sum + addon.price : sum;
            }, 0);
        }, 0) || 0;

        return (basePrice + addonsPrice) * tempQty;
    };

    const confirmAddToCart = () => {
        if (!selectedProductForAdd) return;
        const product = selectedProductForAdd;
        const size = product.sizes?.find(s => s.id === selectedSizeId);
        const selectedAddons = product.addonGroups?.flatMap(g => g.addons).filter(a => selectedAddonIds.includes(a.id)) || [];
        const flavors = availableFlavors.filter(f => selectedFlavorIds.includes(f.id));

        let itemName = product.name;
        if (size) itemName += ` (${size.name})`;
        if (flavors.length > 0) itemName += ` [${flavors.map(f => f.name).join('/')}]`;

        const newItem: CartItem = {
            id: Date.now().toString(),
            cartItemId: Date.now().toString(),
            productDbId: product.id,
            productId: product.id,
            name: itemName,
            price: calculateCurrentPrice() / tempQty,
            quantity: tempQty,
            observation: tempObs.trim(),
            selectedSizeDbId: selectedSizeId,
            selectedAddonDbIds: selectedAddonIds,
            selectedFlavorIds: selectedFlavorIds,
            sizeJson: size ? JSON.stringify(size) : null,
            addonsJson: JSON.stringify(selectedAddons),
            flavorsJson: JSON.stringify(flavors.map(f => ({ id: f.id, name: f.name, price: f.price })))
        };
        setCart(prev => [...prev, newItem]);
        setShowProductDrawer(false);
        toast.success("Item adicionado!");
    };

    const updateCartItemQty = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    // --- LÓGICA DE PEDIDOS E MESAS ---
    const handleTableClick = (table: TableSummary) => {
        if (table.status === 'free') {
            setSelectedTable(table.number.toString());
            setOrderMode('table');
            setActiveTab('pos');
        } else {
            setViewingTable(table);
            setActiveModal('table_details');
        }
    };

    const submitOrder = async () => {
        try {
            const orderPayload = {
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    observations: item.observation,
                    sizeId: item.selectedSizeDbId,
                    addonsIds: item.selectedAddonDbIds,
                    flavorIds: item.selectedFlavorIds || [],
                    sizeJson: item.sizeJson,
                    addonsJson: item.addonsJson,
                    flavorsJson: item.flavorsJson
                })),
                orderType: orderMode === 'table' ? 'TABLE' : 'DELIVERY',
                tableNumber: orderMode === 'table' ? parseInt(selectedTable) : null,
                paymentMethod: 'PENDING',
                customerName: orderMode === 'table' ? customerName : deliveryInfo.name
            };
            await createOrder(orderPayload);
            toast.success("Pedido enviado!");
            setCart([]);
            setSelectedTable('');
            setCustomerName('');
            loadTableSummary();
        } catch (e) {
            toast.error("Erro ao enviar pedido");
        }
    };

    const handleCheckout = async (paymentData: any) => {
        if (!viewingTable) return;
        try {
            await checkoutTable(viewingTable.id, paymentData);
            toast.success("Mesa encerrada com sucesso!");
            setActiveModal('none');
            loadTableSummary();
        } catch (e) {
            toast.error("Erro ao encerrar mesa.");
        }
    };

    const handleTransferTable = async (targetTable: number) => {
        if (!viewingTable) return;
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            await transferTable(viewingTable.number, targetTable, user.restaurantId);
            toast.success(`Mesa ${viewingTable.number} transferida para ${targetTable}`);
            setActiveModal('none');
            loadTableSummary();
        } catch (e) {
            toast.error("Erro ao transferir mesa.");
        }
    };

    // --- LÓGICA DE SISTEMA ---
    const handleToggleStore = async () => {
        const newState = !isStoreOpen;
        await toggleStoreStatus(newState);
        setIsStoreOpen(newState);
        toast.success(newState ? "Loja Aberta" : "Loja Fechada");
    };

    const handleOpenCashier = async () => {
        if (!cashierAmount) return toast.error("Informe o fundo de caixa");
        await openCashier(parseFloat(cashierAmount));
        setIsCashierOpen(true);
        setActiveModal('none');
        loadInitialData();
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === 'all' || p.categories?.some(c => c.id === selectedCategory);
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [products, selectedCategory, searchTerm]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando PDV...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-[#f8fafc] overflow-hidden -m-8">
            {/* BARRA LATERAL: CARRINHO */}
            <aside className="w-[400px] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                            {orderMode === 'table' ? `Mesa ${selectedTable || '?'}` : 'Venda Balcão'}
                        </h3>
                        <div className="flex bg-slate-200/50 p-1 rounded-xl">
                            <button onClick={() => setOrderMode('table')} className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all", orderMode === 'table' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}><Utensils size={14} className="inline mr-2"/>Mesa</button>
                            <button onClick={() => setOrderMode('delivery')} className={cn("px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all", orderMode === 'delivery' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}><Truck size={14} className="inline mr-2"/>Balcão</button>
                        </div>
                    </div>

                    {orderMode === 'table' ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <select 
                                    value={selectedTable} 
                                    onChange={e => setSelectedTable(e.target.value)} 
                                    className="w-full h-12 px-4 rounded-xl bg-white border-2 border-slate-100 text-slate-700 text-sm font-bold outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecionar Mesa...</option>
                                    {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={18} />
                            </div>
                            <Input 
                                placeholder="Identificação (Ex: Nome do Cliente)" 
                                value={customerName} 
                                onChange={e => setCustomerName(e.target.value)}
                                className="h-12"
                            />
                        </div>
                    ) : (
                        <Card 
                            onClick={() => setActiveModal('delivery_info')} 
                            className="p-4 border-2 border-dashed border-slate-200 flex items-center justify-between cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 transition-all"
                        >
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Cliente / Balcão</p>
                                <p className="text-sm font-bold text-slate-700 truncate">{deliveryInfo.name || 'Consumidor Final'}</p>
                            </div>
                            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl"><User size={20} /></div>
                        </Card>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/20">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                                <ShoppingCart size={40} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center italic">Aguardando Itens</p>
                        </div>
                    ) : cart.map(item => (
                        <Card key={item.cartItemId} className="p-4 border-slate-100 shadow-sm animate-in slide-in-from-left-4 duration-300">
                            <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                    <span className="font-black text-xs text-slate-900 block uppercase italic leading-tight truncate">{item.name}</span>
                                    {item.observation && (
                                        <span className="inline-block mt-1 text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase">Obs: {item.observation}</span>
                                    )}
                                </div>
                                <span className="font-black text-xs text-slate-900 italic shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-[10px] font-black text-slate-400 italic">R$ {item.price.toFixed(2)} un</span>
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                    <button onClick={() => updateCartItemQty(item.cartItemId, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-rose-500 transition-all active:scale-90"><Minus size={14} strokeWidth={3} /></button>
                                    <span className="text-sm font-black w-6 text-center italic">{item.quantity}</span>
                                    <button onClick={() => updateCartItemQty(item.cartItemId, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-emerald-500 transition-all active:scale-90"><Plus size={14} strokeWidth={3} /></button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]">
                    <div className="flex justify-between items-end mb-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1 leading-none">Total da Venda</span>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{cart.length} itens</span>
                        </div>
                        <div className="text-4xl font-black italic text-slate-900 tracking-tighter">R$ {cartTotal.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <Button onClick={() => cart.length > 0 && handlePreparePayment()} disabled={cart.length === 0} fullWidth size="lg" className="h-16 rounded-[2rem] text-sm uppercase tracking-widest italic gap-3 shadow-2xl">
                        Lançar Pedido <ChevronRight size={20} strokeWidth={3} />
                    </Button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL: CATÁLOGO */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-6 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={handleToggleStore} className={cn("px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all", isStoreOpen ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>{isStoreOpen ? "LOJA ON" : "LOJA OFF"}</button>
                        <div className={cn("px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 flex items-center gap-2", isCashierOpen ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100")}><div className={cn("w-1.5 h-1.5 rounded-full", isCashierOpen ? "bg-blue-500 animate-pulse" : "bg-slate-300")} />Caixa {isCashierOpen ? 'Aberto' : 'Fechado'}</div>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5 w-full max-w-sm shadow-inner">
                        <button onClick={() => setActiveTab('pos')} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'pos' ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-400")}>Catálogo</button>
                        <button onClick={() => { setActiveTab('tables'); loadTableSummary(); }} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'tables' ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-400")}>Mesas</button>
                    </div>
                    <div className="flex gap-2">
                        {!isCashierOpen ? <Button size="sm" className="rounded-xl px-6 bg-slate-900" onClick={() => setActiveModal('cashier_open')}>Abrir Caixa</Button> : <Button variant="danger" size="sm" className="rounded-xl px-6" onClick={() => navigate('/cashier')}>Fechar Caixa</Button>}
                    </div>
                </div>

                {activeTab === 'pos' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 bg-white border-b border-slate-100 flex flex-col gap-6">
                            <div className="relative group w-full max-w-3xl mx-auto">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input ref={searchInputRef} type="text" className="w-full h-14 pl-14 pr-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 focus:border-orange-500 focus:bg-white outline-none font-bold text-sm transition-all shadow-inner" placeholder="Pesquisar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                <button className={cn("px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap", selectedCategory === 'all' ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100")} onClick={() => setSelectedCategory('all')}>Todos os Itens</button>
                                {categories.map(cat => <button key={cat.id} className={cn("px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border-2", selectedCategory === cat.id ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-100" : "bg-white border-slate-50 text-slate-400 hover:border-slate-200")} onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>)}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
                                {filteredProducts.map(p => (
                                    <button key={p.id} className="group flex flex-col bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:border-orange-500 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 shadow-sm p-1" onClick={() => handleProductClick(p)}>
                                        <div className="aspect-square bg-slate-50 rounded-[2.2rem] overflow-hidden border border-slate-50 shrink-0">
                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingCart size={32} /></div>}
                                        </div>
                                        <div className="p-4 flex flex-col flex-1 gap-1 text-center items-center justify-center min-h-[90px]">
                                            <h3 className="font-black text-[11px] uppercase leading-tight text-slate-800 italic line-clamp-2">{p.name}</h3>
                                            <div className="mt-2"><span className="font-black text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg shadow-sm">R$ {p.price.toFixed(2)}</span></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                            {tablesSummary.map(t => (
                                <button key={t.id} onClick={() => handleTableClick(t)} className={cn("flex flex-col rounded-[2.5rem] border-4 p-6 transition-all hover:scale-105 active:scale-95 shadow-lg min-h-[180px] relative overflow-hidden group", t.status === 'free' ? "bg-white border-slate-50 hover:border-emerald-400" : "bg-rose-50 border-rose-100 hover:border-rose-400")}>
                                    <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150", t.status === 'free' ? "bg-emerald-500" : "bg-rose-500")} />
                                    <span className={cn("text-4xl font-black italic tracking-tighter", t.status === 'free' ? "text-slate-200" : "text-rose-600")}>0{t.number}</span>
                                    <div className="mt-auto flex flex-col items-start gap-1">
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", t.status === 'free' ? "text-slate-300" : "text-rose-400")}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                                        {t.status !== 'free' && <span className="font-black text-xl text-rose-900 tracking-tighter italic leading-none">R$ {t.totalAmount.toFixed(2)}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* --- MODAIS DE NEGÓCIO --- */}
            <AnimatePresence>
                {/* Detalhes da Mesa (Checkout / Transferência) */}
                {activeModal === 'table_details' && viewingTable && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100"><Utensils size={24} /></div>
                                    <div><h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Mesa 0{viewingTable.number}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Consumo</p></div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setActiveModal('none')} className="bg-white rounded-full"><X size={24} /></Button>
                            </header>
                            
                            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10 custom-scrollbar">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><List size={14} /> Itens Consumidos</h4>
                                    <div className="space-y-2">
                                        {viewingTable.activeOrder?.items.map((item: any) => (
                                            <Card key={item.id} className="p-4 flex justify-between items-center border-slate-50">
                                                <div className="flex flex-col"><span className="text-xs font-black text-slate-800 uppercase italic">0{item.quantity}x {item.product.name}</span><span className="text-[9px] font-bold text-slate-400 uppercase">{item.sizeJson ? JSON.parse(item.sizeJson).name : 'Individual'}</span></div>
                                                <span className="font-black text-xs italic text-slate-900">R$ {(item.quantity * item.priceAtTime).toFixed(2)}</span>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                                        <div className="flex justify-between items-center relative z-10"><span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Acumulado</span><span className="text-3xl font-black italic text-emerald-400 tracking-tighter">R$ {viewingTable.totalAmount.toFixed(2).replace('.', ',')}</span></div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><ArrowRightLeft size={14} /> Ações da Mesa</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={() => setActiveModal('transfer_table')}><div className="flex items-center gap-3"><MoveRight size={18} className="text-orange-500" /><span>Transferir Mesa</span></div><ChevronRight size={16} /></Button>
                                        <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={() => setActiveModal('payment_method')}><div className="flex items-center gap-3"><Receipt size={18} className="text-emerald-500" /><span>Encerrar e Pagar</span></div><ChevronRight size={16} /></Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Modal de Pagamento (Checkout) */}
                {activeModal === 'payment_method' && viewingTable && (
                    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('table_details')} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl">
                            <h3 className="text-xl font-black uppercase italic text-slate-900 mb-8 tracking-tighter">Forma de Pagamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {paymentMethods.map(m => (
                                    <Card key={m.id} onClick={() => handleCheckout({ paymentMethod: m.name })} className="p-6 flex flex-col items-center gap-3 border-slate-100 hover:border-emerald-500 transition-all cursor-pointer group">
                                        <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}</div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 text-center">{m.name}</span>
                                    </Card>
                                ))}
                            </div>
                            <Button variant="ghost" fullWidth onClick={() => setActiveModal('table_details')} className="mt-6 uppercase text-[10px] font-black text-slate-400">Voltar</Button>
                        </motion.div>
                    </div>
                )}

                {/* Modal de Transferência */}
                {activeModal === 'transfer_table' && viewingTable && (
                    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('table_details')} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl">
                            <h3 className="text-xl font-black uppercase italic text-slate-900 mb-8 tracking-tighter">Mover Consumo</h3>
                            <div className="space-y-6">
                                <Input label="Mesa de Destino" type="number" placeholder="Digite o número..." onKeyDown={(e) => { if(e.key === 'Enter') handleTransferTable(parseInt((e.target as any).value)); }} />
                                <p className="text-[9px] font-bold text-slate-400 uppercase italic text-center">Digite o número da nova mesa e pressione Enter para confirmar.</p>
                                <Button variant="ghost" fullWidth onClick={() => setActiveModal('table_details')} className="uppercase text-[10px] font-black text-slate-400">Cancelar</Button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Drawer de Personalização (Produto) */}
                {showProductDrawer && selectedProductForAdd && (
                    <div className="fixed inset-0 z-[150] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProductDrawer(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 35, stiffness: 300 }} className="relative w-[calc(100%-400px)] bg-white shadow-2xl flex flex-col h-full">
                            <header className="h-20 border-b border-slate-100 px-10 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" onClick={() => setShowProductDrawer(false)} className="bg-slate-50"><X size={20} /></Button>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedProductForAdd.name}</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalizar Item</span>
                            </header>
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12 bg-slate-50/30">
                                {selectedProductForAdd.sizes?.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><div className="w-1 h-4 bg-orange-500 rounded-full" /> 1. Escolha o Tamanho</h4>
                                        <div className="flex flex-wrap gap-3">{selectedProductForAdd.sizes.map(size => (
                                            <Card key={size.id} onClick={() => { setSelectedSizeId(size.id); setSelectedFlavorIds([]); }} className={cn("px-8 py-4 border-2 transition-all shadow-sm cursor-pointer min-w-[120px] text-center", selectedSizeId === size.id ? "border-orange-500 bg-orange-50 shadow-orange-100" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200")}>
                                                <span className={cn("font-black text-xs uppercase italic", selectedSizeId === size.id ? "text-orange-600" : "text-slate-500")}>{size.name}</span>
                                            </Card>
                                        ))}</div>
                                    </div>
                                )}
                                {selectedProductForAdd.pizzaConfig && availableFlavors.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><PizzaIcon size={14} className="text-orange-500" /> 2. Selecione os Sabores</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{availableFlavors.map(flavor => {
                                            const isSelected = selectedFlavorIds.includes(flavor.id);
                                            return (
                                                <Card key={flavor.id} onClick={() => handleFlavorToggle(flavor.id)} className={cn("p-4 border-2 transition-all flex flex-col items-center justify-center text-center gap-1 shadow-sm cursor-pointer", isSelected ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100 scale-105" : "border-slate-50 bg-white text-slate-500 hover:border-slate-200")}>
                                                    <span className={cn("font-black text-[10px] uppercase italic leading-tight", isSelected ? "text-orange-700" : "text-slate-600")}>{flavor.name}</span>
                                                </Card>
                                            );
                                        })}</div>
                                    </div>
                                )}
                                {selectedProductForAdd.addonGroups?.map(group => (
                                    <div key={group.id} className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><div className="w-1 h-4 bg-blue-500 rounded-full" /> {group.name} <span className="text-[8px] opacity-50 ml-2">(Max: {group.type === 'single' ? '1' : 'Vários'})</span></h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">{group.addons.map(addon => {
                                            const isSelected = selectedAddonIds.includes(addon.id);
                                            return (
                                                <Card key={addon.id} onClick={() => { if (group.type === 'single') { const othersInGroup = group.addons.map(a => a.id); const newIds = selectedAddonIds.filter(id => !othersInGroup.includes(id)); setSelectedAddonIds([...newIds, addon.id]); } else { if (isSelected) setSelectedAddonIds(prev => prev.filter(id => id !== addon.id)); else setSelectedAddonIds(prev => [...prev, addon.id]); } }} className={cn("p-4 border-2 transition-all flex flex-col items-center justify-center text-center gap-1 shadow-sm cursor-pointer", isSelected ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100" : "border-slate-50 bg-white text-slate-500 hover:border-slate-200")}>
                                                    <span className={cn("font-black text-[10px] uppercase italic leading-none", isSelected ? "text-blue-700" : "text-slate-600")}>{addon.name}</span>
                                                    {addon.price > 0 && <span className="text-[9px] font-black text-emerald-600 mt-1">+ R$ {addon.price.toFixed(2)}</span>}
                                                </Card>
                                            );
                                        })}</div>
                                    </div>
                                ))}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Observações Adicionais</h4>
                                    <textarea className="w-full h-32 rounded-[2rem] bg-white border-2 border-slate-100 p-6 font-bold text-sm outline-none focus:border-orange-500 transition-all shadow-inner resize-none" placeholder="Ex: Tirar cebola, maionese à parte..." value={tempObs} onChange={e => setTempObs(e.target.value)} />
                                </div>
                            </div>
                            <footer className="h-32 bg-white border-t border-slate-100 flex items-center justify-between px-10 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]">
                                <div className="flex items-center bg-slate-100 border-2 border-slate-200 rounded-2xl p-1 shadow-inner"><button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all"><Minus size={20} strokeWidth={3} /></button><span className="w-16 text-center text-2xl font-black italic text-slate-900">{tempQty}</span><button onClick={() => setTempQty(tempQty + 1)} className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-emerald-500 active:scale-90 transition-all"><Plus size={20} strokeWidth={3} /></button></div>
                                <div className="flex items-center gap-8"><div className="text-right flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valor Unitário</span><p className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">R$ {calculateCurrentPrice().toFixed(2).replace('.', ',')}</p></div><Button onClick={confirmAddToCart} className="h-16 px-12 rounded-[2rem] text-sm uppercase tracking-widest italic gap-3 shadow-xl">Adicionar Item <CheckCircle size={20} /></Button></div>
                            </footer>
                        </motion.div>
                    </div>
                )}

                {/* Modal de Abertura de Caixa */}
                {activeModal === 'cashier_open' && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8"><div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Wallet size={24} /></div><h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Abertura de Caixa</h3></div>
                            <div className="space-y-6 relative z-10"><Input label="Fundo de Caixa Inicial (R$)" type="number" placeholder="0,00" value={cashierAmount} onChange={e => setCashierAmount(e.target.value)} className="text-2xl font-black text-emerald-600" /><Button fullWidth size="lg" className="h-14 rounded-2xl gap-3" onClick={handleOpenCashier}><CheckCircle size={20} /> Abrir Turno</Button><Button variant="ghost" fullWidth onClick={() => setActiveModal('none')} className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Cancelar</Button></div>
                        </motion.div>
                    </div>
                )}

                {/* Modal de Dados do Cliente */}
                {activeModal === 'delivery_info' && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
                            <div className="flex items-center gap-4 mb-8"><div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg"><User size={24} /></div><h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Dados do Cliente</h3></div>
                            <div className="space-y-4"><Input label="Nome do Cliente" placeholder="Como devemos chamar?" value={deliveryInfo.name} onChange={e => setDeliveryInfo({...deliveryInfo, name: e.target.value})} /><Input label="Telefone / WhatsApp" placeholder="(00) 00000-0000" value={deliveryInfo.phone} onChange={e => setDeliveryInfo({...deliveryInfo, phone: e.target.value})} /><Button fullWidth size="lg" className="h-14 rounded-2xl mt-4" onClick={() => setActiveModal('none')}>Salvar Identificação</Button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const getCashierStatus = async () => {
    try {
        const response = await fetch('/api/cashier/status', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        return await response.json();
    } catch (e) { return null; }
};

export default PosPage;
