import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getProducts, getCategories, createOrder, getTables, 
    toggleStoreStatus, getCashierStatus, openCashier, closeCashier, getSettings,
    getPosTableSummary, checkoutTable, getCashierSummary, searchCustomers,
    transferTable, transferItems, removeOrderItem, partialTablePayment,
    getPaymentMethods, partialValuePayment, markOrderAsPrinted
} from '../services/api';
import { CustomerSelectionModal } from '../components/CustomerSelectionModal';
import { printOrder } from '../services/printing';
import { 
    Search, ShoppingCart, Plus, Minus, X, Trash2, 
    Store, User, Truck, Utensils, List,
    Wallet, Banknote, CheckCircle, Printer, Loader2, ChevronRight,
    Pizza as PizzaIcon, Bike, Info, ArrowRightLeft, MoveRight, Receipt, Phone, MapPin, ShoppingBag, Percent, Calculator
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

import type { Product, Category, CartItem, TableSummary, PaymentMethod } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const PosPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- ESTADOS DE DADOS ---
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [tablesSummary, setTablesSummary] = useState<TableSummary[]>([]);
    
    // --- ESTADOS DE SISTEMA ---
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [isCashierOpen, setIsCashierOpen] = useState(false);
    const [cashierSession, setCashierSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeTab, setActiveTab] = useState<'pos' | 'tables'>('pos');

    // Verifica se deve abrir diretamente nas mesas
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'tables') {
            setActiveTab('tables');
        }
    }, [location.search]);
    
    // --- ESTADOS DE VENDA ATUAL ---
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderMode, setOrderMode] = useState<'table' | 'delivery'>('table');
    const [deliverySubType, setDeliverySubType] = useState<'delivery' | 'pickup'>('delivery');
    const [selectedTable, setSelectedTable] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [deliveryInfo, setDeliveryInfo] = useState({
        name: '',
        phone: '',
        address: '',
        deliveryType: 'pickup' as 'delivery' | 'pickup'
    });

    // --- ESTADOS DE BUSCA DE CLIENTE ---
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [customerAddresses, setCustomerAddresses] = useState<string[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [structuredAddress, setStructuredAddress] = useState<any>(null); // Novo estado

    // --- ESTADOS DE MODAIS E INTERAÇÃO ---
    const [activeModal, setActiveModal] = useState<'none' | 'cashier_open' | 'cashier_close' | 'delivery_info' | 'table_details' | 'payment_method' | 'transfer_table' | 'transfer_items' | 'pos_checkout'>('none');
    const [showProductDrawer, setShowProductDrawer] = useState(false);
    const [viewingTable, setViewingTable] = useState<TableSummary | null>(null);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
    
    // --- ESTADOS DE PAGAMENTO E DESCONTO ---
    const [paymentAmount, setPaymentAmount] = useState('');
    const [discount, setDiscount] = useState('0');
    const [useServiceTax, setUseServiceTax] = useState(true);
    const [isPartialPayment, setIsPartialPayment] = useState(false);

    // --- NOVOS ESTADOS PARA CHECKOUT PDV (BALCÃO/ENTREGA) ---
    const [posDeliveryFee, setPosDeliveryFee] = useState('0');
    const [posExtraCharge, setPosExtraCharge] = useState('0');
    const [posDiscountValue, setPosDiscountValue] = useState('0');
    const [posDiscountPercentage, setPosDiscountPercentage] = useState('0');
    const [posPaymentMethodId, setPosPaymentMethodId] = useState<string>('');
    const [posObservations, setPosObservations] = useState('');
    
    // --- ESTADOS DE PERSONALIZAÇÃO ---
    const [tempQty, setTempQty] = useState(1);
    const [tempObs, setTempObs] = useState('');
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [cashierAmount, setCashierAmount] = useState('');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        loadInitialData();
    }, []);

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

    const loadTableSummary = async () => {
        try {
            const summary = await getPosTableSummary();
            setTablesSummary(summary);
        } catch (error) {
            console.error("Erro ao carregar mesas:", error);
        }
    };

    const handleSearchCustomer = async (term: string) => {
        setCustomerSearchTerm(term);
        if (term.length < 3) {
            setCustomerResults([]);
            return;
        }
        setIsSearchingCustomer(true);
        try {
            const results = await searchCustomers(term);
            setCustomerResults(results.customers || []);
        } catch (error) {
            console.error("Erro na busca:", error);
        } finally {
            setIsSearchingCustomer(false);
        }
    };

    const handleSelectCustomer = (customer: any) => {
        setDeliveryInfo({
            ...deliveryInfo,
            name: customer.name,
            phone: customer.phone,
            address: customer.address || ''
        });
        // Extrair endereços únicos dos pedidos anteriores
        const historyAddresses = customer.deliveryOrders
            ?.map((o: any) => o.address)
            .filter((addr: string, i: number, self: string[]) => addr && self.indexOf(addr) === i) || [];
        
        if (customer.address && !historyAddresses.includes(customer.address)) {
            historyAddresses.unshift(customer.address);
        }
        setCustomerAddresses(historyAddresses);
        setCustomerResults([]);
        setCustomerSearchTerm('');
    };

    // --- LÓGICA DE PRODUTOS ---
    const handleProductClick = (product: Product) => {
        if (!isCashierOpen) return toast.error("Abra o caixa antes de vender!");
        setSelectedProductForAdd(product);
        setTempQty(1);
        setTempObs('');
        setSelectedSizeId(product.sizes?.[0]?.id || '');
        setSelectedAddonIds([]);
        setShowProductDrawer(true);
    };

    const calculateCurrentPrice = () => {
        if (!selectedProductForAdd) return 0;
        const product = selectedProductForAdd;
        const size = product.sizes?.find(s => s.id === selectedSizeId);
        let basePrice = size?.price || product.price;

        const addonsPrice = product.addonGroups?.reduce((total, group) => {
            const selectedInGroup = group.addons.filter(a => selectedAddonIds.includes(a.id));
            
            if (selectedInGroup.length === 0) return total;

            if (group.isFlavorGroup) {
                const prices = selectedInGroup.map(a => a.price);
                const rule = group.priceRule || 'higher';
                if (rule === 'average') {
                    return total + (prices.reduce((a, b) => a + b, 0) / prices.length);
                } else {
                    return total + Math.max(...prices);
                }
            }

            return total + selectedInGroup.reduce((sum, addon) => sum + addon.price, 0);
        }, 0) || 0;

        return (basePrice + addonsPrice) * tempQty;
    };

    const confirmAddToCart = () => {
        if (!selectedProductForAdd) return;
        const product = selectedProductForAdd;
        const size = product.sizes?.find(s => s.id === selectedSizeId);
        const selectedAddons = product.addonGroups?.flatMap(g => g.addons).filter(a => selectedAddonIds.includes(a.id)) || [];

        let itemName = product.name;
        if (size) itemName += ` (${size.name})`;

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
            selectedFlavorIds: [],
            sizeJson: size ? JSON.stringify(size) : null,
            addonsJson: JSON.stringify(selectedAddons),
            flavorsJson: JSON.stringify([])
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
        setSelectedTable(table.number.toString());
        setOrderMode('table');
        setActiveTab('pos');
        
        if (table.status !== 'free') {
            toast.info(`Mesa ${table.number} selecionada. Itens adicionados serão somados à conta atual.`);
        }
    };

    const submitOrder = async () => {
        if (orderMode === 'table' && !selectedTable) {
            return toast.error("Por favor, selecione uma mesa");
        }

        if (!posPaymentMethodId) {
            return toast.error("Selecione uma forma de pagamento");
        }

        const method = paymentMethods.find(m => m.id === posPaymentMethodId);
        
        try {
            const finalDiscount = parseFloat(posDiscountValue || '0');
            const finalExtra = parseFloat(posExtraCharge || '0');
            const finalDelivery = parseFloat(posDeliveryFee || '0');

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
                orderType: orderMode === 'table' ? 'TABLE' : 'DELIVERY',
                tableNumber: orderMode === 'table' ? parseInt(selectedTable) : null,
                paymentMethod: method?.name || 'OUTRO',
                customerName: orderMode === 'table' ? customerName : deliveryInfo.name,
                deliveryInfo: orderMode === 'delivery' ? {
                    name: deliveryInfo.name,
                    phone: deliveryInfo.phone,
                    address: deliveryInfo.address, 
                    deliveryType: deliverySubType,
                    deliveryFee: finalDelivery,
                    observations: posObservations,
                    ...(structuredAddress || parseAddress(deliveryInfo.address))
                } : null,
                discount: finalDiscount,
                extraCharge: finalExtra,
                totalAmount: Number((cartTotal + finalExtra + finalDelivery - finalDiscount).toFixed(2))
            };
            await createOrder(orderPayload);
            toast.success("Pedido enviado!");
            setCart([]);
            setSelectedTable('');
            setCustomerName('');
            setDeliveryInfo({ name: '', phone: '', address: '', deliveryType: 'pickup' });
            setActiveModal('none');
            loadTableSummary();
        } catch (e) {
            toast.error("Erro ao enviar pedido");
        }
    };

    // Função auxiliar para decompor endereço caso seja uma string única
    const parseAddress = (addressStr: string) => {
        if (!addressStr) return {};
        // Tenta separar por vírgula e traço (padrão: Rua, Número - Bairro)
        const parts = addressStr.split(',');
        const street = parts[0]?.trim();
        const rest = parts[1]?.split('-') || [];
        const number = rest[0]?.trim();
        const neighborhood = rest[1]?.trim();
        
        return { street, number, neighborhood };
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

    const handleOpenCheckout = () => {
        if (cart.length === 0) return toast.error("Carrinho vazio!");
        
        // Resetar valores do checkout
        setPosDeliveryFee(orderMode === 'delivery' && deliverySubType === 'delivery' ? deliveryFee.toString() : '0');
        setPosExtraCharge('0');
        setPosDiscountValue('0');
        setPosDiscountPercentage('0');
        setPosPaymentMethodId('');
        setPosObservations('');
        
        setActiveModal('pos_checkout');
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
            <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <h3 className={cn(
                                "text-sm font-black uppercase italic tracking-tighter leading-none",
                                orderMode === 'table' ? "text-emerald-600" : "text-blue-600"
                            )}>
                                {orderMode === 'table' ? `Mesa ${selectedTable || '?'}` : 'Venda Direta'}
                            </h3>
                        </div>
                        <div className="flex bg-slate-200/50 p-0.5 rounded-md border border-slate-200">
                            <button onClick={() => { setOrderMode('table'); setSelectedTable(''); }} className={cn("px-2 py-1 text-[8px] font-black uppercase rounded-sm transition-all", orderMode === 'table' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}>Mesa</button>
                            <button onClick={() => { setOrderMode('delivery'); setSelectedTable(''); }} className={cn("px-2 py-1 text-[8px] font-black uppercase rounded-sm transition-all", orderMode === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>Direta</button>
                        </div>
                    </div>

                    {orderMode === 'table' && selectedTable && (
                        (() => {
                            const tableInfo = tablesSummary.find(t => t.number === parseInt(selectedTable));
                            if (tableInfo && tableInfo.status !== 'free') {
                                return (
                                    <div className="mb-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between animate-in zoom-in-95">
                                        <div>
                                            <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Conta Aberta</p>
                                            <p className="text-xs font-black text-emerald-900 italic">R$ {tableInfo.totalAmount.toFixed(2)}</p>
                                        </div>
                                        <button 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase italic h-7 px-3 rounded-md shadow-md"
                                            onClick={() => {
                                                const orderId = tableInfo.tabs?.[0]?.orderId;
                                                if (orderId) navigate(`/pos/checkout/${orderId}`);
                                                else toast.error("Pedido não localizado.");
                                            }}
                                        >
                                            FECHAR MESA
                                        </button>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )}

                    {orderMode === 'table' ? (
                        <div className="grid grid-cols-1 gap-1.5">
                            <div className="relative">
                                <select 
                                    value={selectedTable} 
                                    onChange={e => setSelectedTable(e.target.value)} 
                                    className="w-full h-8 px-2 rounded border border-slate-200 bg-white text-slate-700 text-[10px] font-bold outline-none focus:border-orange-500 appearance-none cursor-pointer"
                                >
                                    <option value="">Mesa...</option>
                                    {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
                                </select>
                                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={10} />
                            </div>
                            <input 
                                placeholder="Identificação / Comanda" 
                                value={customerName} 
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-[10px] font-bold outline-none focus:border-orange-500"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                                <button onClick={() => setDeliverySubType('delivery')} className={cn("flex items-center justify-center h-8 rounded border transition-all gap-1.5", deliverySubType === 'delivery' ? "bg-orange-50 border-orange-400 text-orange-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}>
                                    <Bike size={14} />
                                    <span className="text-[8px] font-black uppercase">Entrega</span>
                                </button>
                                <button onClick={() => { setDeliverySubType('pickup'); setDeliveryInfo(prev => ({ ...prev, address: '' })); }} className={cn("flex items-center justify-center h-8 rounded border transition-all gap-1.5", deliverySubType === 'pickup' ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}>
                                    <ShoppingBag size={14} />
                                    <span className="text-[8px] font-black uppercase">Balcão</span>
                                </button>
                            </div>

                            <div className="flex gap-1">
                                <button onClick={() => setActiveModal('delivery_info')} className="flex-1 h-9 border border-slate-200 rounded px-3 flex items-center justify-between hover:border-orange-500 hover:bg-orange-50/30 transition-all bg-white overflow-hidden">
                                    <div className="min-w-0 flex flex-col items-start">
                                        <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest leading-none mb-0.5">{deliverySubType === 'delivery' ? 'Endereço' : 'Cliente'}</span>
                                        <span className="text-[10px] font-bold text-slate-700 truncate w-full text-left">{deliveryInfo.name || 'Vincular Cliente...'}</span>
                                    </div>
                                    <User size={14} className="text-orange-400 shrink-0" />
                                </button>
                                {deliveryInfo.name && (
                                    <button onClick={() => { setDeliveryInfo({ name: '', phone: '', address: '', deliveryType: 'delivery' }); setCustomerAddresses([]); }} className="w-9 h-9 rounded border border-rose-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center bg-white transition-all">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-slate-50/30">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 space-y-1">
                            <ShoppingCart size={24} />
                            <p className="text-[7px] font-black uppercase tracking-widest italic">Vazio</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.cartItemId} className="p-2 bg-white border border-slate-200 rounded shadow-sm animate-in slide-in-from-left-1">
                            <div className="flex justify-between items-start gap-1">
                                <div className="min-w-0">
                                    <span className="font-black text-[9px] text-slate-900 block uppercase italic leading-none truncate">{item.name}</span>
                                    {item.observation && (
                                        <span className="inline-block mt-0.5 text-[7px] text-amber-600 font-bold uppercase truncate max-w-full">[{item.observation}]</span>
                                    )}
                                </div>
                                <span className="font-black text-[9px] text-slate-900 italic shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[8px] font-bold text-slate-400 italic">R$ {item.price.toFixed(2)}/un</span>
                                <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded border border-slate-100">
                                    <button onClick={() => updateCartItemQty(item.cartItemId, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-rose-500 transition-all"><Minus size={10} strokeWidth={3} /></button>
                                    <span className="text-[10px] font-black w-4 text-center italic">{item.quantity}</span>
                                    <button onClick={() => updateCartItemQty(item.cartItemId, 1)} className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-emerald-500 transition-all"><Plus size={10} strokeWidth={3} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 bg-white border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none mb-0.5">Total Carrinho</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{cart.length} registro(s)</span>
                        </div>
                        <div className="text-xl font-black italic text-slate-900 tracking-tighter leading-none">R$ {cartTotal.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <Button onClick={handleOpenCheckout} disabled={cart.length === 0} fullWidth size="lg" className="h-10 rounded-lg text-[9px] uppercase tracking-widest font-black italic gap-2 shadow-md">
                        PAGAMENTO <CheckCircle size={14} strokeWidth={3} />
                    </Button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL: CATÁLOGO */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100/50">
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-4 z-10 shrink-0">
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleToggleStore} className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all", isStoreOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>{isStoreOpen ? "LOJA ONLINE" : "LOJA FECHADA"}</button>
                        <div className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase border flex items-center gap-1.5", isCashierOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-400 border-slate-200")}><div className={cn("w-1 h-1 rounded-full", isCashierOpen ? "bg-blue-500 animate-pulse" : "bg-slate-300")} />{isCashierOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}</div>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 w-full max-w-[220px] border border-slate-200">
                        <button onClick={() => setActiveTab('pos')} className={cn("flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all", activeTab === 'pos' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Catálogo</button>
                        <button onClick={() => { setActiveTab('tables'); loadTableSummary(); }} className={cn("flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all", activeTab === 'tables' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Mesas</button>
                    </div>
                    <div className="flex gap-1.5">
                        {!isCashierOpen ? <Button size="sm" className="rounded-md px-3 h-7 text-[8px] font-black uppercase bg-slate-900" onClick={() => setActiveModal('cashier_open')}>Abrir Caixa</Button> : <Button variant="danger" size="sm" className="rounded-md px-3 h-7 text-[8px] font-black uppercase" onClick={() => navigate('/cashier')}>Encerrar Turno</Button>}
                    </div>
                </div>

                {activeTab === 'pos' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0">
                            <div className="relative group w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={14} />
                                <input ref={searchInputRef} type="text" className="w-full h-9 pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-bold text-[11px] transition-all" placeholder="Buscar produto pelo nome ou código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                                <button className={cn("px-3 h-7 rounded-md text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap", selectedCategory === 'all' ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-500 border border-slate-200")} onClick={() => setSelectedCategory('all')}>Todos</button>
                                {categories.map(cat => <button key={cat.id} className={cn("px-3 h-7 rounded-md text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap border", selectedCategory === cat.id ? "bg-orange-500 border-orange-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")} onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>)}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10 gap-2">
                                {filteredProducts.map(p => (
                                    <button key={p.id} className="group flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-orange-500 hover:shadow-md transition-all active:scale-[0.98] shadow-sm relative" onClick={() => handleProductClick(p)}>
                                        <div className="aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden relative">
                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity scale-105 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingCart size={16} /></div>}
                                            <div className="absolute bottom-0 right-0 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-tl-md border-t border-l border-slate-100">
                                                <span className="font-black text-[9px] text-orange-600">R$ {p.price.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="p-1.5 flex flex-col flex-1 justify-center min-h-[40px] bg-white">
                                            <h3 className="font-bold text-[8px] uppercase leading-[1.2] text-slate-700 group-hover:text-slate-900 line-clamp-2 text-center">{p.name}</h3>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-12 gap-3">
                            {tablesSummary.map(t => (
                                <button key={t.id} onClick={() => handleTableClick(t)} className={cn("flex flex-col rounded-xl border p-3 transition-all hover:scale-105 active:scale-95 shadow-sm min-h-[90px] relative overflow-hidden group", t.status === 'free' ? "bg-white border-slate-200 hover:border-emerald-400" : "bg-rose-50 border-rose-200 hover:border-rose-400")}>
                                    <div className={cn("absolute -top-2 -right-2 w-10 h-10 rounded-full opacity-5 transition-transform group-hover:scale-150", t.status === 'free' ? "bg-emerald-500" : "bg-rose-500")} />
                                    <span className={cn("text-xl font-black italic tracking-tighter", t.status === 'free' ? "text-slate-200" : "text-rose-600")}>{t.number < 10 ? `0${t.number}` : t.number}</span>
                                    <div className="mt-auto flex flex-col items-start">
                                        <span className={cn("text-[7px] font-black uppercase tracking-widest", t.status === 'free' ? "text-slate-300" : "text-rose-400")}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                                        {t.status !== 'free' && <span className="font-black text-[11px] text-rose-900 tracking-tighter italic leading-none">R$ {(t.totalAmount || 0).toFixed(2)}</span>}
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
                                                                            {viewingTable.items?.map((item: any) => (
                                                                                <Card key={item.id} className="p-4 border-slate-50 group hover:border-orange-200 transition-all">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-xs font-black text-slate-800 uppercase italic">0{item.quantity}x {item.product.name}</span>
                                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                                {item.sizeJson && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{JSON.parse(item.sizeJson).name}</span>}
                                                                                                {item.addonsJson && JSON.parse(item.addonsJson).map((a:any) => <span key={a.id} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">+{a.name}</span>)}
                                                                                            </div>
                                                                                            {item.observations && <p className="text-[8px] text-amber-600 font-bold mt-1 uppercase italic">Obs: {item.observations}</p>}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-4">
                                                                                            <span className="font-black text-xs italic text-slate-900">R$ {(item.quantity * (item.priceAtTime || 0)).toFixed(2)}</span>
                                                                                            <button 
                                                                                                onClick={async () => {
                                                                                                    if(confirm('Remover este item do pedido?')) {
                                                                                                        await removeOrderItem(viewingTable.id, item.id);
                                                                                                        toast.success('Item removido');
                                                                                                        loadTableSummary();
                                                                                                        // Atualiza o estado viewingTable
                                                                                                        const updated = await getPosTableSummary();
                                                                                                        const table = updated.find((t:any) => t.id === viewingTable.id);
                                                                                                        if(table) setViewingTable(table);
                                                                                                    }
                                                                                                }}
                                                                                                className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                                            >
                                                                                                <Trash2 size={14} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </Card>
                                                                            ))}
                                                                            {(!viewingTable.items || viewingTable.items.length === 0) && (
                                                                                <p className="text-center py-10 text-slate-300 font-black uppercase text-[10px] italic">Nenhum item pendente</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                                                                            <div className="flex justify-between items-center relative z-10"><span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Acumulado</span><span className="text-3xl font-black italic text-emerald-400 tracking-tighter">R$ {(viewingTable.totalAmount || 0).toFixed(2).replace('.', ',')}</span></div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-6">
                                                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><ArrowRightLeft size={14} /> Ações da Mesa</h4>
                                                                        <div className="grid grid-cols-1 gap-3">
                                                                            <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={async () => {
                                                                                try {
                                                                                    const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
                                                                                    await printOrder(viewingTable as any, config);
                                                                                    toast.success('Pré-conta enviada!');
                                                                                } catch (e) { toast.error('Erro ao imprimir'); }
                                                                            }}><div className="flex items-center gap-3"><Printer size={18} className="text-blue-500" /><span>Imprimir Pré-Conta</span></div><ChevronRight size={16} /></Button>
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
                                    
                                                                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
                                    
                                                                                <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    
                                                                                    <div className="flex items-center gap-3">
                                    
                                                                                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg"><Receipt size={20} /></div>
                                    
                                                                                        <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Finalizar Mesa 0{viewingTable.number}</h3>
                                    
                                                                                    </div>
                                    
                                                                                    <Button variant="ghost" size="icon" onClick={() => setActiveModal('table_details')} className="bg-white rounded-full"><X size={20}/></Button>
                                    
                                                                                </header>
                                    
                                                    
                                    
                                                                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    
                                                                                    <div className="space-y-6">
                                    
                                                                                        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                    
                                                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl -mr-12 -mt-12 rounded-full" />
                                    
                                                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 relative z-10">Total Consumido</p>
                                    
                                                                                            <h4 className="text-3xl font-black italic text-white tracking-tighter relative z-10">R$ {(viewingTable.totalAmount || 0).toFixed(2).replace('.', ',')}</h4>
                                    
                                                                                            
                                    
                                                                                            <div className="mt-6 pt-4 border-t border-white/10 space-y-2 relative z-10">
                                    
                                                                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    
                                                                                                    <span>Subtotal</span>
                                    
                                                                                                    <span>R$ {(viewingTable.totalAmount || 0).toFixed(2)}</span>
                                    
                                                                                                </div>
                                    
                                                                                                <div className="flex justify-between items-center text-[10px] font-bold text-orange-400 uppercase">
                                    
                                                                                                    <span>Desconto</span>
                                    
                                                                                                    <span>- R$ {parseFloat(discount || '0').toFixed(2)}</span>
                                    
                                                                                                </div>
                                    
                                                                                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400 uppercase border-t border-white/5 pt-2">
                                    
                                                                                                    <span className="font-black">Total à Pagar</span>
                                    
                                                                                                    <span className="text-sm font-black">R$ {(viewingTable.totalAmount - parseFloat(discount || '0')).toFixed(2)}</span>
                                    
                                                                                                </div>
                                    
                                                                                            </div>
                                    
                                                                                        </div>
                                    
                                                    
                                    
                                                                                        <div className="space-y-4">
                                    
                                                                                            <Input 
                                    
                                                                                                label="Aplicar Desconto (R$)" 
                                    
                                                                                                type="number" 
                                    
                                                                                                placeholder="0,00" 
                                    
                                                                                                value={discount} 
                                    
                                                                                                onChange={e => setDiscount(e.target.value)} 
                                    
                                                                                                className="font-black text-rose-500"
                                    
                                                                                            />
                                    
                                                                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    
                                                                                                <div className="flex items-center gap-3">
                                    
                                                                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-400">
                                    
                                                                                                        <Percent size={14} />
                                    
                                                                                                    </div>
                                    
                                                                                                    <div>
                                    
                                                                                                        <p className="text-[10px] font-black text-slate-900 uppercase italic">Taxa de Serviço (10%)</p>
                                    
                                                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Incluir no fechamento?</p>
                                    
                                                                                                    </div>
                                    
                                                                                                </div>
                                    
                                                                                                <button 
                                    
                                                                                                    onClick={() => setUseServiceTax(!useServiceTax)}
                                    
                                                                                                    className={cn(
                                    
                                                                                                        "w-12 h-6 rounded-full transition-all relative",
                                    
                                                                                                        useServiceTax ? "bg-emerald-500" : "bg-slate-200"
                                    
                                                                                                    )}
                                    
                                                                                                >
                                    
                                                                                                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", useServiceTax ? "right-1" : "left-1")} />
                                    
                                                                                                </button>
                                    
                                                                                            </div>
                                    
                                                                                        </div>
                                    
                                                                                    </div>
                                    
                                                    
                                    
                                                                                                                    <div className="space-y-6">
                                    
                                                    
                                    
                                                                                                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic">Selecione o Método</h4>
                                    
                                                    
                                    
                                                                                                                        
                                    
                                                    
                                    
                                                                                                                        <div className="space-y-4">
                                    
                                                    
                                    
                                                                                                                            <div className="flex items-center justify-between px-2">
                                    
                                                    
                                    
                                                                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor a Receber</p>
                                    
                                                    
                                    
                                                                                                                                <button 
                                    
                                                    
                                    
                                                                                                                                    onClick={() => {
                                    
                                                    
                                    
                                                                                                                                        setIsPartialPayment(!isPartialPayment);
                                    
                                                    
                                    
                                                                                                                                        setPaymentAmount(isPartialPayment ? '' : (viewingTable.totalAmount - parseFloat(discount || '0')).toFixed(2));
                                    
                                                    
                                    
                                                                                                                                    }}
                                    
                                                    
                                    
                                                                                                                                    className={cn(
                                    
                                                    
                                    
                                                                                                                                        "text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all",
                                    
                                                    
                                    
                                                                                                                                        isPartialPayment ? "bg-orange-500 text-white shadow-md" : "bg-slate-100 text-slate-400"
                                    
                                                    
                                    
                                                                                                                                    )}
                                    
                                                    
                                    
                                                                                                                                >
                                    
                                                    
                                    
                                                                                                                                    {isPartialPayment ? 'Pagamento Parcial ATIVO' : 'Dividir Conta?'}
                                    
                                                    
                                    
                                                                                                                                </button>
                                    
                                                    
                                    
                                                                                                                            </div>
                                    
                                                    
                                    
                                                                                                                            
                                    
                                                    
                                    
                                                                                                                            <AnimatePresence>
                                    
                                                    
                                    
                                                                                                                                {isPartialPayment && (
                                    
                                                    
                                    
                                                                                                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                                    
                                                    
                                    
                                                                                                                                        <div className="relative">
                                    
                                                    
                                    
                                                                                                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg italic">R$</span>
                                    
                                                    
                                    
                                                                                                                                            <input 
                                    
                                                    
                                    
                                                                                                                                                type="number" 
                                    
                                                    
                                    
                                                                                                                                                step="0.01" 
                                    
                                                    
                                    
                                                                                                                                                autoFocus
                                    
                                                    
                                    
                                                                                                                                                className="w-full h-14 bg-orange-50 border-2 border-orange-200 rounded-2xl pl-12 pr-4 text-xl font-black italic focus:border-orange-500 outline-none transition-all text-orange-900" 
                                    
                                                    
                                    
                                                                                                                                                value={paymentAmount}
                                    
                                                    
                                    
                                                                                                                                                onChange={e => setPaymentAmount(e.target.value)}
                                    
                                                    
                                    
                                                                                                                                                placeholder="0,00"
                                    
                                                    
                                    
                                                                                                                                            />
                                    
                                                    
                                    
                                                                                                                                        </div>
                                    
                                                    
                                    
                                                                                                                                    </motion.div>
                                    
                                                    
                                    
                                                                                                                                )}
                                    
                                                    
                                    
                                                                                                                            </AnimatePresence>
                                    
                                                    
                                    
                                                                                                                        </div>
                                    
                                                    
                                    
                                                                                    
                                    
                                                    
                                    
                                                                                                                        <div className="grid grid-cols-2 gap-3">
                                    
                                                    
                                    
                                                                                                                            {paymentMethods.map(m => (
                                    
                                                    
                                    
                                                                                                                                <button 
                                    
                                                    
                                    
                                                                                                                                    key={m.id} 
                                    
                                                    
                                    
                                                                                                                                    onClick={() => handleCheckout({ 
                                    
                                                    
                                    
                                                                                                                                        paymentMethod: m.id,
                                    
                                                    
                                    
                                                                                                                                        discount: parseFloat(discount || '0'),
                                    
                                                    
                                    
                                                                                                                                        useServiceTax,
                                    
                                                    
                                    
                                                                                                                                        amount: isPartialPayment ? parseFloat(paymentAmount) : (viewingTable.totalAmount - parseFloat(discount || '0'))
                                    
                                                    
                                    
                                                                                                                                    })} 
                                    
                                                    
                                    
                                                                                                                                    className="p-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                                    
                                                    
                                    
                                                                                                                                >
                                    
                                                                                                    <div className="text-2xl grayscale group-hover:grayscale-0 transition-all">
                                    
                                                                                                        {m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}
                                    
                                                                                                    </div>
                                    
                                                                                                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-emerald-700 text-center">{m.name}</span>
                                    
                                                                                                </button>
                                    
                                                                                            ))}
                                    
                                                                                        </div>
                                    
                                                                                        
                                    
                                                                                        <Card className="p-4 bg-orange-50 border-orange-100 border-2 border-dashed">
                                    
                                                                                            <div className="flex items-center gap-3">
                                    
                                                                                                <div className="p-2 bg-white rounded-xl text-orange-500 shadow-sm"><Info size={16}/></div>
                                    
                                                                                                <p className="text-[9px] font-bold text-orange-700 leading-tight uppercase">
                                    
                                                                                                    Para <span className="font-black">Pagamento Parcial</span> ou <span className="font-black">Divisão de Conta</span>, utilize a ferramenta de correção na aba de comandas.
                                    
                                                                                                </p>
                                    
                                                                                            </div>
                                    
                                                                                        </Card>
                                    
                                                                                    </div>
                                    
                                                                                </div>
                                    
                                                    
                                    
                                                                                <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    
                                                                                    <Button variant="ghost" onClick={() => setActiveModal('table_details')} className="uppercase text-[10px] font-black text-slate-400 italic">Voltar para Detalhes</Button>
                                    
                                                                                </footer>
                                    
                                                                            </motion.div>
                                    
                                                                        </div>
                                    
                                                                    )}
                                    
                    {/* Modal de Checkout PDV (Balcão / Entrega) - REFORMULADO INDUSTRIAL */}
                    {activeModal === 'pos_checkout' && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
                            <motion.div 
                                initial={{ scale: 0.98, opacity: 0, y: 10 }} 
                                animate={{ scale: 1, opacity: 1, y: 0 }} 
                                exit={{ scale: 0.98, opacity: 0, y: 10 }} 
                                className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200"
                            >
                                <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-orange-500 rounded-lg"><ShoppingBag size={18} /></div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest italic">Finalização de Venda</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{orderMode === 'table' ? `Mesa ${selectedTable}` : 'Venda Direta / Delivery'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"><X size={20} /></button>
                                </header>
                                    
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Coluna Esquerda: Ajustes Financeiros */}
                                    <div className="w-[380px] bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                <Calculator size={14} className="text-orange-500" /> Resumo Financeiro
                                            </h4>
                                            
                                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                                    <span>Subtotal</span>
                                                    <span className="text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 uppercase">
                                                    <span>Taxa Entrega</span>
                                                    <span>+ R$ {parseFloat(posDeliveryFee || '0').toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase">
                                                    <span>Acréscimo</span>
                                                    <span>+ R$ {parseFloat(posExtraCharge || '0').toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase border-b border-slate-100 pb-3">
                                                    <span>Desconto</span>
                                                    <span>- R$ {parseFloat(posDiscountValue || '0').toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-end pt-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                                                    <span className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">
                                                        R$ {(cartTotal + parseFloat(posExtraCharge || '0') + parseFloat(posDeliveryFee || '0') - parseFloat(posDiscountValue || '0')).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Entrega (R$)</label>
                                                <input type="number" step="0.01" value={posDeliveryFee} onChange={e => setPosDeliveryFee(e.target.value)} className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-blue-600 outline-none focus:border-blue-500 shadow-sm" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Acréscimo (R$)</label>
                                                <input type="number" step="0.01" value={posExtraCharge} onChange={e => setPosExtraCharge(e.target.value)} className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-rose-500 outline-none focus:border-rose-500 shadow-sm" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Desconto Aplicado</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[10px]">R$</span>
                                                    <input 
                                                        type="number" step="0.01" value={posDiscountValue} 
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setPosDiscountValue(val);
                                                            const numVal = parseFloat(val) || 0;
                                                            const perc = cartTotal > 0 ? ((numVal / cartTotal) * 100).toFixed(2) : '0';
                                                            setPosDiscountPercentage(perc === 'Infinity' || perc === 'NaN' ? '0' : perc);
                                                        }}
                                                        className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-7 pr-3 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                                <div className="relative w-20">
                                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[10px]">%</span>
                                                    <input 
                                                        type="number" step="0.01" value={posDiscountPercentage}
                                                        onChange={e => {
                                                            const perc = e.target.value;
                                                            setPosDiscountPercentage(perc);
                                                            const numPerc = parseFloat(perc) || 0;
                                                            const val = ((numPerc / 100) * cartTotal).toFixed(2);
                                                            setPosDiscountValue(val);
                                                        }}
                                                        className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 mt-auto">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações do Pedido</label>
                                            <textarea 
                                                value={posObservations} onChange={e => setPosObservations(e.target.value)}
                                                className="w-full h-20 bg-white border border-slate-200 rounded-lg p-3 font-medium text-[11px] outline-none focus:border-orange-500 shadow-sm resize-none"
                                                placeholder="Instruções de entrega ou preparo..."
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Coluna Direita: Métodos de Pagamento */}
                                    <div className="flex-1 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar">
                                        <div className="flex-1 space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Wallet size={14} className="text-orange-500" /> Métodos de Recebimento
                                                </h4>
                                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                                    <Info size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-tight">Escolha 01 forma de pagamento</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {paymentMethods.map(m => (
                                                    <button 
                                                        key={m.id} 
                                                        onClick={() => setPosPaymentMethodId(m.id)}
                                                        className={cn(
                                                            "h-14 flex items-center px-4 gap-3 rounded-xl border-2 transition-all group relative overflow-hidden",
                                                            posPaymentMethodId === m.id 
                                                                ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02]" 
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                                                            posPaymentMethodId === m.id ? "bg-white/10" : "bg-slate-50 group-hover:bg-slate-100"
                                                        )}>
                                                            {m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{m.name}</span>
                                                        {posPaymentMethodId === m.id && (
                                                            <div className="absolute top-1 right-1">
                                                                <CheckCircle size={10} className="text-emerald-400" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-8 -mb-8 p-8">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status do Pagamento</span>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", posPaymentMethodId ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                                                    <span className={cn("text-xs font-black uppercase italic", posPaymentMethodId ? "text-emerald-600" : "text-rose-500")}>
                                                        {posPaymentMethodId ? 'Aguardando Confirmação' : 'Selecione o Meio de Pagamento'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button variant="outline" onClick={() => setActiveModal('none')} className="h-12 px-6 rounded-xl border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                    Cancelar
                                                </Button>
                                                <Button 
                                                    onClick={submitOrder} 
                                                    disabled={!posPaymentMethodId}
                                                    className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-30 disabled:grayscale transition-all"
                                                >
                                                    Confirmar e Enviar <MoveRight size={16} className="ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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

                {/* Modal de Dados do Cliente Avançado */}
                <CustomerSelectionModal 
                    isOpen={activeModal === 'delivery_info'} 
                    onClose={() => setActiveModal('none')}
                    onSelectCustomer={(data) => {
                        setDeliveryInfo({
                            name: data.name,
                            phone: data.phone,
                            address: data.addressStr,
                            deliveryType: data.deliveryType
                        });
                        setStructuredAddress(data.addressStructured);
                        setActiveModal('none');
                    }}
                />
            </AnimatePresence>
        </div>
    );
};

export default PosPage;
