import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getProducts, getCategories, createOrder, getTables, 
    toggleStoreStatus, getCashierStatus, openCashier, closeCashier, getSettings,
    getPosTableSummary, checkoutTable, getCashierSummary, searchCustomers,
    transferTable, transferItems, removeOrderItem, partialTablePayment,
    getPaymentMethods, partialValuePayment
} from '../services/api';
import { 
    Search, ShoppingCart, Plus, Minus, X, Trash2, ChefHat, 
    Store, Lock, Unlock, LogOut, Receipt, User, Phone, MapPin, Truck, Utensils,
    LayoutDashboard, Wallet, Banknote, CreditCard as CreditCardIcon, QrCode, CheckCircle2, Printer, Loader2, ChevronRight,
    Pizza as PizzaIcon, ArrowRightLeft, MoveRight, ArrowRight, List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { IMaskInput } from 'react-imask';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import type { Product, Category, CartItem, TableSummary, PaymentMethod } from '../types';

const PosPage: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [tablesSummary, setTablesSummary] = useState<TableSummary[]>([]);
    
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isCashierOpen, setIsCashierOpen] = useState(false);
    const [cashierSession, setCashierSession] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState<'pos' | 'tables'>('pos');
    
    const [activeModal, setActiveModal] = useState<'none' | 'cashier_open' | 'cashier_close' | 'delivery_info' | 'table_details' | 'payment_method' | 'transfer_table' | 'transfer_items'>('none');
    const [showProductDrawer, setShowProductDrawer] = useState(false);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderMode, setOrderMode] = useState<'table' | 'delivery'>('table');
    const [selectedTable, setSelectedTable] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [directPaymentMethod, setDirectPaymentMethod] = useState('cash');

    const [deliveryInfo, setDeliveryInfo] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryType: 'pickup' as 'delivery' | 'pickup'
    });

    // Seleção de Produto e Personalização
    const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
    const [tempQty, setTempQty] = useState(1);
    const [tempObs, setTempObs] = useState('');
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    
    // Estados específicos para Pizza
    const [selectedFlavorIds, setSelectedFlavorIds] = useState<string[]>([]);
    const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
    const [isLoadingFlavors, setIsLoadingFlavors] = useState(false);
    
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    // Carregar sabores quando uma pizza for selecionada
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

    const handleProductClick = (product: Product) => {
        if (!isCashierOpen) return toast.error("Caixa fechado!");
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

        // Regra de Preço de Pizza (Maior valor ou Média)
        if (product.pizzaConfig && selectedFlavorIds.length > 0) {
            const rule = product.pizzaConfig.priceRule || 'higher';
            const flavors = availableFlavors.filter(f => selectedFlavorIds.includes(f.id));
            
            const flavorPrices = flavors.map(f => {
                const s = f.sizes?.find(sz => sz.name === size?.name);
                return s ? s.price : f.price;
            });

            if (rule === 'higher') {
                basePrice = Math.max(...flavorPrices);
            } else {
                basePrice = flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
            }
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

    const handlePreparePayment = () => {
        if (cart.length === 0) return;
        if (orderMode === 'table' && !selectedTable) return toast.error("Selecione uma mesa");
        submitOrder();
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
                paymentMethod: directPaymentMethod,
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

    const handleToggleStore = async () => {
        const newState = !isStoreOpen;
        await toggleStoreStatus(newState);
        setIsStoreOpen(newState);
        toast.success(newState ? "Loja Aberta" : "Loja Fechada");
    };

    const handleOpenCloseModal = () => navigate('/cashier');

    const handleOpenCashier = async () => {
        await openCashier(parseFloat(cashierAmount));
        setIsCashierOpen(true);
        setActiveModal('none');
        loadInitialData();
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [products, selectedCategory, searchTerm]);

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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

    const [cashierAmount, setCashierAmount] = useState('');

    if (loading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f0f2f5]">
            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR ESQUERDA: CARRINHO */}
                <aside className="w-[380px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-700 uppercase italic tracking-tighter leading-none">
                                {orderMode === 'table' ? `Mesa ${selectedTable || '?'}` : 'Venda de Balcão'}
                            </h3>
                            <div className="flex bg-slate-200 p-1 rounded-lg">
                                <button onClick={() => setOrderMode('table')} className={cn("px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all", orderMode === 'table' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}><Utensils size={12} className="inline mr-1"/>Mesa</button>
                                <button onClick={() => setOrderMode('delivery')} className={cn("px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all", orderMode === 'delivery' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}><Truck size={12} className="inline mr-1"/>Delivery</button>
                            </div>
                        </div>

                        {orderMode === 'table' ? (
                            <div className="space-y-2">
                                <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border-2 border-slate-100 text-slate-700 text-xs font-bold outline-none focus:border-blue-500 transition-all">
                                    <option value="">Selecione a mesa...</option>
                                    {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
                                </select>
                                <input type="text" placeholder="Nome na Comanda" className="w-full h-10 px-3 rounded-xl bg-white border-2 border-slate-100 text-xs font-bold outline-none focus:border-blue-500" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                        ) : (
                            <div onClick={() => setActiveModal('delivery_info')} className="flex items-center justify-between p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                                <div><p className="text-[10px] font-black text-blue-600 uppercase leading-none mb-1">Cliente</p><p className="text-xs font-bold text-slate-700">{deliveryInfo.name || 'Consumidor não identificado'}</p></div>
                                <User size={18} className="text-slate-300" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-2">
                                <ShoppingCart size={48} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-center">Nenhum item adicionado</p>
                            </div>
                        ) : cart.map(item => (
                            <div key={item.cartItemId} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm group animate-in slide-in-from-left-2">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <span className="font-bold text-xs text-slate-800 block leading-tight">{item.name}</span>
                                        {item.observation && <span className="text-[9px] text-slate-400 italic">Obs: {item.observation}</span>}
                                    </div>
                                    <span className="font-black text-xs text-slate-900 ml-2">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-[10px] font-bold text-slate-400 italic">R$ {item.price.toFixed(2)} un</span>
                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => updateCartItemQty(item.cartItemId, -1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500 transition-colors"><Minus size={12} /></button>
                                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateCartItemQty(item.cartItemId, 1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-blue-500 transition-colors"><Plus size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Total</span>
                            <div className="text-3xl font-black italic text-slate-900 tracking-tighter">R$ {cartTotal.toFixed(2)}</div>
                        </div>
                        <button onClick={handlePreparePayment} disabled={cart.length === 0} className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-all">FINALIZAR PEDIDO</button>
                    </div>
                </aside>

                {/* CENTRO: CATÁLOGO */}
                <main className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden">
                    <div className="flex items-center justify-between p-2 bg-white border-b border-slate-200 shadow-sm gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={handleToggleStore} className={cn("px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all", isStoreOpen ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100")}>{isStoreOpen ? "LOJA ON" : "LOJA OFF"}</button>
                            <div className={cn("px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2", isCashierOpen ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100")}>{isCashierOpen ? "CAIXA ON" : "CAIXA OFF"}</div>
                        </div>

                        <div className="flex flex-1 max-w-md bg-slate-100 p-1 rounded-2xl gap-1">
                            <button onClick={() => setActiveTab('pos')} className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all", activeTab === 'pos' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Catálogo</button>
                            <button onClick={() => { setActiveTab('tables'); loadTableSummary(); }} className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all", activeTab === 'tables' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Mesas</button>
                        </div>

                        <div className="flex gap-2">
                            {!isCashierOpen ? (
                                <button onClick={() => setActiveModal('cashier_open')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-md">Abrir</button>
                            ) : (
                                <button onClick={handleOpenCloseModal} className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md">Fechar</button>
                            )}
                        </div>
                    </div>

                    {activeTab === 'pos' ? (
                        <>
                            <header className="p-4 bg-white border-b border-slate-200 flex flex-col gap-4">
                                <div className="relative group w-full max-w-2xl mx-auto">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input ref={searchInputRef} type="text" className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-xs" placeholder="Pesquise produtos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                    <button className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", selectedCategory === 'all' ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-400 border border-slate-200")} onClick={() => setSelectedCategory('all')}>Tudo</button>
                                    {categories.map(cat => (
                                        <button key={cat.id} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap", selectedCategory === cat.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200")} onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>
                                    ))}
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                    {filteredProducts.map(product => (
                                        <button key={product.id} className="group flex flex-col bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:border-blue-500 hover:shadow-xl transition-all active:scale-95 shadow-sm" onClick={() => handleProductClick(product)}>
                                            <div className="p-4 flex flex-col flex-1 gap-1 text-center justify-center min-h-[120px]">
                                                <h3 className="font-black text-[11px] uppercase leading-tight text-slate-800">{product.name}</h3>
                                                <div className="mt-3"><span className="font-black text-xs text-blue-600 italic">R$ {product.price.toFixed(2)}</span></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {tablesSummary.map(table => (
                                    <button key={table.id} onClick={() => handleTableClick(table)} className={cn("flex flex-col rounded-xl border-2 p-4 transition-all hover:scale-105 shadow-sm min-h-[160px] relative overflow-hidden", table.status === 'free' ? "bg-white border-slate-200 hover:border-emerald-400" : "bg-red-50 border-red-200 hover:border-red-400")}>
                                        <span className={cn("text-2xl font-black", table.status === 'free' ? "text-slate-300" : "text-red-600")}>{table.number}</span>
                                        <div className="mt-auto">
                                            {table.status === 'free' ? <span className="text-[10px] font-black uppercase text-slate-300">Livre</span> : <span className="font-black text-red-700">R$ {table.totalAmount.toFixed(2)}</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* --- DRAWER DE PERSONALIZAÇÃO AMPLO --- */}
            <AnimatePresence>
                {showProductDrawer && selectedProductForAdd && (
                    <div className="fixed inset-0 z-[150] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProductDrawer(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 35, stiffness: 300 }} className="relative w-[calc(100%-380px)] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
                            
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12 bg-slate-50/20">
                                {/* Seção de Tamanhos */}
                                {selectedProductForAdd.sizes?.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Escolha o Tamanho:</h4>
                                        <div className="flex flex-wrap gap-4">
                                            {selectedProductForAdd.sizes.map(size => (
                                                <button key={size.id} onClick={() => { setSelectedSizeId(size.id); setSelectedFlavorIds([]); }} className={cn("px-10 py-4 rounded-xl border-2 text-xs font-black uppercase transition-all shadow-sm", selectedSizeId === size.id ? "bg-orange-500 border-orange-500 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200")}>{size.name}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Seção de Sabores (EXCLUSIVO PIZZA) */}
                                {selectedProductForAdd.pizzaConfig && availableFlavors.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Selecione os Sabores:</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {availableFlavors.map(flavor => {
                                                const isSelected = selectedFlavorIds.includes(flavor.id);
                                                return (
                                                    <button key={flavor.id} onClick={() => handleFlavorToggle(flavor.id)} className={cn("p-4 rounded-xl border-2 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center text-center gap-1 shadow-sm", isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")}>
                                                        <span>{flavor.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Grupos de Complementos Dinâmicos */}
                                {selectedProductForAdd.addonGroups?.map(group => (
                                    <div key={group.id} className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{group.name}: <span className="text-[10px] text-slate-400 ml-3 font-bold">(máx de {group.type === 'single' ? '1' : 'várias'} opções)</span></h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {group.addons.map(addon => {
                                                const isSelected = selectedAddonIds.includes(addon.id);
                                                return (
                                                    <button key={addon.id} onClick={() => {
                                                        if (group.type === 'single') {
                                                            const othersInGroup = group.addons.map(a => a.id);
                                                            const newIds = selectedAddonIds.filter(id => !othersInGroup.includes(id));
                                                            setSelectedAddonIds([...newIds, addon.id]);
                                                        } else {
                                                            if (isSelected) setSelectedAddonIds(prev => prev.filter(id => id !== addon.id));
                                                            else setSelectedAddonIds(prev => [...prev, addon.id]);
                                                        }
                                                    }} className={cn("p-4 rounded-xl border-2 text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center text-center gap-1 shadow-sm", isSelected ? "bg-blue-500 border-blue-500 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200")}>
                                                        <span>{addon.name}</span>
                                                        {addon.price > 0 && <span className="text-[9px] opacity-70 italic">R$ {addon.price.toFixed(2)}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Observações:</h4>
                                    <textarea className="w-full h-32 rounded-3xl bg-white border-2 border-slate-100 p-6 font-bold text-sm outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="Ex: Tirar picles, molho à parte..." value={tempObs} onChange={e => setTempObs(e.target.value)} />
                                </div>
                            </div>

                            <div className="h-28 bg-[#f8f9fa] border-t-4 border-slate-100 flex items-center justify-between px-10 shrink-0">
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-3xl font-black text-slate-700 italic tracking-tighter leading-none">{selectedProductForAdd.name}</h3>
                                    <button onClick={() => setShowProductDrawer(false)} className="bg-red-500 hover:bg-red-600 text-white px-8 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all w-fit shadow-lg shadow-red-100">Voltar</button>
                                </div>
                                <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl p-1 shadow-inner">
                                    <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500"><Minus size={20} /></button>
                                    <span className="w-16 text-center text-2xl font-black italic">{tempQty}</span>
                                    <button onClick={() => setTempQty(tempQty + 1)} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500"><Plus size={20} /></button>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right"><p className="text-4xl font-black text-slate-900 italic tracking-tighter">R$ {calculateCurrentPrice().toFixed(2)}</p></div>
                                    <button onClick={confirmAddToCart} className="bg-blue-500 hover:bg-blue-600 text-white px-14 h-16 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-3">Salvar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {activeModal === 'cashier_open' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-black uppercase italic mb-6 text-slate-900">Abertura de Caixa</h3>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fundo de Caixa (R$)</label>
                            <input type="number" className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 font-bold text-lg outline-none focus:border-blue-500 transition-all" value={cashierAmount} onChange={e => setCashierAmount(e.target.value)} />
                            <button className="w-full h-14 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-black transition-all" onClick={handleOpenCashier}>Confirmar Abertura</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosPage;
