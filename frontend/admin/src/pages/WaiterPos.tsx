import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getProducts, getCategories, createOrder, getPosTableSummary, sendTableRequest,
    transferTable, transferItems, removeOrderItem // Novos imports
} from '../services/api';
import { 
    Search, ShoppingCart, Plus, Minus, X, Trash2, 
    Utensils, ChevronRight, CheckCircle, 
    Send, History, User, Receipt, List, Pizza as PizzaIcon, Check, LogOut, Info,
    ArrowRightLeft, MoveRight // Novos ícones
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner'; // Adicionado para feedbacks
import type { Product, Category, CartItem, TableSummary, SizeOption, AddonOption } from '../types';

const WaiterPos: React.FC = () => {
    const { logout } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tables, setTables] = useState<TableSummary[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const [selectedTable, setSelectedTable] = useState<TableSummary | null>(null);
    const [selectedTabId, setSelectedTabId] = useState<string | null>(null); // Comanda selecionada
    const [customerName, setCustomerName] = useState(''); // Nome para nova comanda
    const [cart, setCart] = useState<CartItem[]>([]);

    // Estados para Gerenciamento de Mesa (Waiter)
    const [isViewingDetails, setIsViewingDetails] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [targetTableNumber, setTargetTableNumber] = useState('');
    const [showTransferModal, setShowTransferModal] = useState<'none' | 'table' | 'items'>('none');

    // Estados para o Modal de Opções do Garçom
    const [productWithOptions, setProductWithOptions] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
    const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
    const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
    const [isLoadingFlavors, setIsLoadingFlavors] = useState(false);
    const [obs, setObs] = useState('');

    useEffect(() => {
        loadData();
        const interval = setInterval(loadTables, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prods, cats, summary] = await Promise.all([
                getProducts(),
                getCategories(true),
                getPosTableSummary()
            ]);
            setProducts(prods);
            setCategories(cats);
            setTables(summary);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadTables = async () => {
        try {
            const summary = await getPosTableSummary();
            setTables(summary);
        } catch (e) { console.error(e); }
    };

    const loadFlavors = async (restaurantId: string, categoryId: string) => {
        setIsLoadingFlavors(true);
        try {
            // Reutiliza a lista de produtos já carregada para filtrar sabores
            const flavors = products.filter(p => p.categoryId === categoryId && p.isAvailable);
            setAvailableFlavors(flavors);
        } catch (error) {
            console.error("Erro ao carregar sabores:", error);
        } finally {
            setIsLoadingFlavors(false);
        }
    };

    const handleProductClick = (product: Product) => {
        const hasOptions = (product.sizes && product.sizes.length > 0) || 
                          (product.addonGroups && product.addonGroups.length > 0) ||
                          (product.pizzaConfig);
        
        if (hasOptions) {
            setProductWithOptions(product);
            setSelectedSize(product.sizes?.[0] || null);
            setSelectedAddons([]);
            setSelectedFlavors([]);
            setObs('');
            
            if (product.pizzaConfig?.flavorCategoryId) {
                loadFlavors(product.restaurantId, product.pizzaConfig.flavorCategoryId);
            }
        } else {
            addToCart(product, null, [], []);
        }
    };

    const getMaxFlavors = () => {
        if (!productWithOptions?.pizzaConfig || !selectedSize) return 1;
        const sizeConfig = productWithOptions.pizzaConfig.sizes ? productWithOptions.pizzaConfig.sizes[selectedSize.name] : null;
        return sizeConfig?.maxFlavors || productWithOptions.pizzaConfig.maxFlavors || 1;
    };

    const handleFlavorToggle = (flavor: Product) => {
        const max = getMaxFlavors();
        const isSelected = selectedFlavors.some(f => f.id === flavor.id);
        if (isSelected) {
            setSelectedFlavors(prev => prev.filter(f => f.id !== flavor.id));
        } else {
            if (selectedFlavors.length < max) {
                setSelectedFlavors(prev => [...prev, flavor]);
            } else if (max === 1) {
                setSelectedFlavors([flavor]);
            }
        }
    };

    const addToCart = (product: Product, size: SizeOption | null, addons: AddonOption[], flavors: Product[], observation: string = '') => {
        const cartItemId = `${product.id}-${size?.id || 'none'}-${addons.map(a => a.id).sort().join(',')}-${flavors.map(f => f.id).sort().join(',')}`;
        const existing = cart.find(item => item.cartItemId === cartItemId);

        if (existing) {
            setCart(cart.map(item => 
                item.cartItemId === cartItemId 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            ));
        } else {
            // Calcular preço da pizza baseado na regra (maior ou média)
            let basePrice = size?.price || product.price;
            if (product.pizzaConfig && flavors.length > 0) {
                const rule = product.pizzaConfig.priceRule || 'higher';
                const flavorPrices = flavors.map(f => {
                    if (size) {
                        const s = (f.sizes || []).find(sz => sz.name === size.name);
                        return s ? s.price : f.price;
                    }
                    return f.price;
                });
                basePrice = rule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavors.length;
            }

            const finalPrice = basePrice + addons.reduce((acc, a) => acc + a.price, 0);
            
            let itemName = product.name;
            if (size) itemName += ` (${size.name})`;
            if (flavors.length > 0) itemName += ` [${flavors.map(f => f.name).join('/')}]`;

            const newItem: CartItem = {
                id: Date.now().toString(),
                cartItemId,
                productDbId: product.id,
                productId: product.id,
                name: itemName,
                price: finalPrice,
                quantity: 1,
                observation,
                selectedSizeDbId: size?.id,
                selectedAddonDbIds: addons.map(a => a.id),
                selectedFlavorIds: flavors.map(f => f.id),
                // Adiciona os JSONs para o backend
                sizeJson: size ? JSON.stringify({ id: size.id, name: size.name, price: size.price }) : null,
                addonsJson: JSON.stringify(addons.map(a => ({ id: a.id, name: a.name, price: a.price }))),
                flavorsJson: JSON.stringify(flavors.map(f => ({ id: f.id, name: f.name, price: f.price })))
            };
            setCart([...cart, newItem]);
        }
        setProductWithOptions(null);
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        ).filter(item => item.quantity > 0));
    };

    const handleSubmitOrder = async () => {
        if (!selectedTable || cart.length === 0) return;
        setIsPlacingOrder(true);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const payload = {
                items: cart.map(i => ({
                    productId: i.productDbId,
                    quantity: i.quantity,
                    observations: i.observation,
                    sizeId: i.selectedSizeDbId,
                    addonsIds: i.selectedAddonDbIds,
                    flavorIds: i.selectedFlavorIds,
                    sizeJson: i.sizeJson,
                    addonsJson: i.addonsJson,
                    flavorsJson: i.flavorsJson
                })),
                orderType: 'TABLE',
                tableNumber: selectedTable.number,
                customerName: customerName || null, // Inclui o nome da comanda
                userId: user?.id
            };
            await createOrder(payload);
            toast.success(`Pedido enviado para a Mesa ${selectedTable.number}!`);
            setCart([]);
            setSelectedTable(null);
            setCustomerName('');
            setSelectedTabId(null);
            setActiveTab('tables');
            loadTables();
        } catch (error) {
            toast.error("Erro ao enviar pedido.");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // --- Funções de Gestão (Garçom) ---

    const handleTransferTable = async () => {
        if (!selectedTable || !targetTableNumber) return;
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            await transferTable(selectedTable.number, parseInt(targetTableNumber), user.restaurantId);
            toast.success("Mesa transferida!");
            setShowTransferModal('none');
            setIsViewingDetails(false);
            setSelectedTable(null);
            setActiveTab('tables');
            loadTables();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao transferir");
        }
    };

    const handleTransferItems = async () => {
        if (!selectedTable || !targetTableNumber || selectedItemIds.length === 0) return;
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const sourceOrderId = selectedTable.items.find(i => selectedItemIds.includes(i.id))?.orderId;
            if (!sourceOrderId) return;

            await transferItems(sourceOrderId, parseInt(targetTableNumber), selectedItemIds, user.restaurantId, user.id);
            toast.success("Itens movidos!");
            setShowTransferModal('none');
            setIsViewingDetails(false);
            setSelectedItemIds([]);
            loadTables();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao mover itens");
        }
    };

    const handleCancelItems = async () => {
        if (selectedItemIds.length === 0) return;
        if (!confirm(`Cancelar ${selectedItemIds.length} item(s)?`)) return;

        try {
            for (const itemId of selectedItemIds) {
                const item = selectedTable?.items.find(i => i.id === itemId);
                if (item?.orderId) await removeOrderItem(item.orderId, item.id);
            }
            toast.success("Itens cancelados!");
            setIsViewingDetails(false);
            setSelectedItemIds([]);
            loadTables();
        } catch (e) {
            toast.error("Erro ao cancelar");
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchCat && matchSearch && p.isAvailable;
        });
    }, [products, selectedCategory, searchTerm]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
            
            {/* Header */}
            <header className="bg-slate-900 text-white p-4 shrink-0 flex justify-between items-center shadow-lg border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl shadow-lg shadow-orange-500/20">
                        <Utensils size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest leading-none">Garçom Digital</h1>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            {selectedTable ? `Mesa ${selectedTable.number}` : 'Selecione uma mesa'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedTable ? (
                        <div className="flex gap-2">
                            {selectedTable.status !== 'free' && (
                                <button 
                                    onClick={() => setIsViewingDetails(true)} 
                                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg flex items-center gap-2 px-3"
                                >
                                    <Info size={18} />
                                    <span className="text-[10px] font-black uppercase">Ver Itens</span>
                                </button>
                            )}
                            <button onClick={() => {setSelectedTable(null); setActiveTab('tables'); setCart([]);}} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={logout} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 px-3">
                            <LogOut size={18} />
                            <span className="text-[10px] font-black uppercase">Sair</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Abas */}
            {selectedTable && (
                <div className="flex bg-white border-b border-slate-200 shrink-0">
                    <button onClick={() => setActiveTab('menu')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all", activeTab === 'menu' ? "border-primary text-primary bg-orange-50/30" : "border-transparent text-slate-400")}>
                        <div className="flex items-center justify-center gap-2"><List size={14} /> Cardápio</div>
                    </button>
                    <button onClick={() => setActiveTab('tables')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition-all", activeTab === 'tables' ? "border-primary text-primary bg-orange-50/30" : "border-transparent text-slate-400")}>
                        <div className="flex items-center justify-center gap-2"><ShoppingCart size={14} /> Sacola ({cart.length})</div>
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative">
                
                {/* TELA 1: MESAS */}
                {(activeTab === 'tables' && !selectedTable) && (
                    <div className="h-full overflow-y-auto p-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-3 gap-3">
                            {tables.map(table => (
                                <button key={table.id} onClick={() => { setSelectedTable(table); setActiveTab('menu'); }} className={cn("aspect-square rounded-3xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 p-2", table.status === 'free' ? "bg-white border-slate-100 text-slate-400" : "bg-orange-50 border-orange-200 text-orange-600 shadow-sm")}>
                                    <span className="text-3xl font-black italic tracking-tighter">{table.number}</span>
                                    {table.status === 'occupied' ? (
                                        <div className="flex flex-wrap justify-center gap-0.5 mt-1 overflow-hidden max-h-8">
                                            {table.tabs?.map((tab: any, i: number) => (
                                                <span key={i} className="bg-orange-200 text-orange-800 text-[6px] font-black px-1 rounded-sm uppercase truncate max-w-[40px]">
                                                    {tab.customerName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Livre</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* TELA 2: CARDÁPIO RÁPIDO */}
                {(activeTab === 'menu' && selectedTable) && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        <div className="p-4 bg-white border-b border-slate-100 space-y-3 shrink-0">
                            <div className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        placeholder="Nome da Comanda (Opcional)" 
                                        className="w-full h-10 px-4 bg-orange-50 border border-orange-100 rounded-xl font-bold text-xs outline-none focus:border-primary" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)} 
                                    />
                                </div>
                                {selectedTable.status !== 'free' && (
                                    <select 
                                        className="h-10 px-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] outline-none"
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        value={customerName}
                                    >
                                        <option value="">Nova Comanda...</option>
                                        {selectedTable.tabs?.map((tab:any) => (
                                            <option key={tab.orderId} value={tab.customerName}>{tab.customerName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <input type="text" placeholder="Buscar produto..." className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-primary transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                <button onClick={() => setSelectedCategory('all')} className={cn("px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all", selectedCategory === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>Tudo</button>
                                {categories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn("px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all", selectedCategory === cat.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>{cat.name}</button>)}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="space-y-1.5">
                                {filteredProducts.map(product => (
                                    <button key={product.id} onClick={() => handleProductClick(product)} className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all shadow-sm">
                                        <div className="text-left flex-1 min-w-0 pr-4">
                                            <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm truncate">{product.name}</h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{product.category?.name}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-slate-900 text-sm italic">R$ {product.price.toFixed(2)}</span>
                                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg"><Plus size={18} strokeWidth={3} /></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TELA 3: SACOLA */}
                {(activeTab === 'tables' && selectedTable) && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4 grayscale"><ShoppingCart size={64}/><p className="font-black uppercase text-xs">Vazio</p></div>
                            ) : cart.map(item => (
                                <div key={item.id} className="p-4 bg-white rounded-3xl border-2 border-slate-100 flex justify-between items-center shadow-sm">
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-black text-slate-900 text-sm italic uppercase leading-tight mb-1">{item.name}</h4>
                                        {item.observation && <p className="text-[9px] text-orange-600 font-bold italic truncate">Obs: {item.observation}</p>}
                                    </div>
                                    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-2 border border-slate-200">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500"><Minus size={16} strokeWidth={3}/></button>
                                        <span className="w-6 text-center font-black text-slate-900">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-900"><Plus size={16} strokeWidth={3}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-end mb-6">
                                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Mesa</span><span className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</span></div>
                                {selectedTable.status !== 'free' && (
                                    <button onClick={async () => { if(confirm("Pedir conta?")) { await sendTableRequest(selectedTable.restaurantId, String(selectedTable.number), 'BILL'); alert("Conta pedida!"); } }} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-2"><Receipt size={14} /> Conta</button>
                                )}
                            </div>
                            <button onClick={handleSubmitOrder} disabled={cart.length === 0 || isPlacingOrder} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50">{isPlacingOrder ? 'Enviando...' : 'Lançar Pedido'} <Send size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE OPÇÕES (RELAÇÃO RÁPIDA) */}
            {productWithOptions && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{productWithOptions.name}</h3>
                            <button onClick={() => setProductWithOptions(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={24} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Tamanhos */}
                            {productWithOptions.sizes && productWithOptions.sizes.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><PizzaIcon size={12}/> Selecione o Tamanho</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {productWithOptions.sizes.map(size => (
                                            <button key={size.id} onClick={() => setSelectedSize(size)} className={cn("p-4 rounded-2xl border-2 flex justify-between items-center transition-all", selectedSize?.id === size.id ? "border-primary bg-orange-50 text-primary" : "border-slate-100 text-slate-600")}>
                                                <span className="font-black text-sm uppercase tracking-tight">{size.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold opacity-60 italic">R$ {size.price.toFixed(2)}</span>
                                                    {selectedSize?.id === size.id && <Check size={16} strokeWidth={4} />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sabores (Exclusivo Pizza) */}
                            {productWithOptions.pizzaConfig && (
                                <div className="space-y-3 bg-orange-50/50 p-4 rounded-3xl border border-orange-100">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest flex items-center gap-2"><PizzaIcon size={12}/> Escolha os Sabores</h4>
                                        <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg italic">ATÉ {getMaxFlavors()} SABORES</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableFlavors.map(flavor => {
                                            const isSelected = selectedFlavors.some(f => f.id === flavor.id);
                                            // Busca o preço deste sabor específico para o tamanho selecionado (GG, G, M...)
                                            const flavorPrice = selectedSize 
                                                ? (flavor.sizes?.find(sz => sz.name === selectedSize.name)?.price || flavor.price)
                                                : flavor.price;

                                            return (
                                                <button key={flavor.id} onClick={() => handleFlavorToggle(flavor)} className={cn("p-4 rounded-2xl border-2 flex justify-between items-center transition-all", isSelected ? "border-primary bg-white shadow-sm text-primary" : "border-transparent bg-white/50 text-slate-600")}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary text-white" : "border-slate-300")}>
                                                            {isSelected && <Check size={12} strokeWidth={4} />}
                                                        </div>
                                                        <span className="font-bold text-xs uppercase">{flavor.name}</span>
                                                    </div>
                                                    <span className="font-black text-xs text-slate-900 italic">R$ {flavorPrice.toFixed(2)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Adicionais */}
                            {productWithOptions.addonGroups?.map(group => (
                                <div key={group.id} className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{group.name}</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {group.addons.map(addon => {
                                            const isSelected = selectedAddons.some(a => a.id === addon.id);
                                            return (
                                                <button key={addon.id} onClick={() => {
                                                    if (isSelected) setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
                                                    else setSelectedAddons([...selectedAddons, addon]);
                                                }} className={cn("p-4 rounded-2xl border-2 flex justify-between items-center transition-all", isSelected ? "border-primary bg-orange-50 text-primary" : "border-slate-100 text-slate-600")}>
                                                    <span className="font-bold text-xs uppercase tracking-tight">{addon.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold opacity-60">+ R$ {addon.price.toFixed(2)}</span>
                                                        <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors", isSelected ? "bg-primary border-primary text-white" : "border-slate-200")}>
                                                            {isSelected && <Check size={12} strokeWidth={4} />}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Obs */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observação</h4>
                                <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-primary" rows={2} placeholder="Ex: Sem cebola, gelo à parte..." value={obs} onChange={e => setObs(e.target.value)} />
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100">
                            <button onClick={() => addToCart(productWithOptions, selectedSize, selectedAddons, selectedFlavors, obs)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                Adicionar à Sacola <CheckCircle size={18} className="text-primary" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES DA MESA (GARÇOM) */}
            {isViewingDetails && selectedTable && (
                <div className="fixed inset-0 z-[250] flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
                    <header className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Receipt size={20} className="text-primary" />
                            <h3 className="font-black uppercase italic tracking-tighter">Consumo Mesa {selectedTable.number}</h3>
                        </div>
                        <button onClick={() => {setIsViewingDetails(false); setSelectedItemIds([]);}} className="p-2 bg-white/10 rounded-full"><X size={24} /></button>
                    </header>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {selectedTable.items.map(item => (
                            <div key={item.id} className={cn("p-4 rounded-2xl border-2 flex justify-between items-center transition-all", selectedItemIds.includes(item.id) ? "border-primary bg-orange-50" : "border-slate-100")}>
                                <div className="flex items-center gap-3 flex-1">
                                    <input 
                                        type="checkbox" 
                                        className="w-6 h-6 rounded-lg border-2 border-slate-200 checked:bg-primary transition-all"
                                        checked={selectedItemIds.includes(item.id)}
                                        onChange={() => setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                    />
                                    <div className="text-left">
                                        <h4 className="font-black text-slate-900 text-xs uppercase leading-tight">{item.product.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400">Qtd: {item.quantity} • R$ {(item.priceAtTime * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-slate-50 border-t space-y-3">
                        {selectedItemIds.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowTransferModal('items')} className="bg-blue-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                                    <MoveRight size={16} /> Mover Itens
                                </button>
                                <button onClick={handleCancelItems} className="bg-red-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-200">
                                    <Trash2 size={16} /> Cancelar
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setShowTransferModal('table')} className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-100">
                                <ArrowRightLeft size={16} /> Trocar Mesa Inteira
                            </button>
                        )}
                        <div className="flex justify-between items-center px-2 pt-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Consumido</span>
                            <span className="text-xl font-black text-slate-900 italic">R$ {selectedTable.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais de Input de Mesa */}
            {showTransferModal !== 'none' && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-xs bg-white rounded-[2rem] p-6 shadow-2xl">
                        <h4 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            {showTransferModal === 'table' ? <ArrowRightLeft size={18} className="text-amber-500"/> : <MoveRight size={18} className="text-blue-500"/>}
                            Mesa Destino
                        </h4>
                        <input 
                            type="number" 
                            className="w-full h-16 text-center text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl mb-6 outline-none focus:border-primary"
                            placeholder="0"
                            autoFocus
                            value={targetTableNumber}
                            onChange={e => setTargetTableNumber(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => {setShowTransferModal('none'); setTargetTableNumber('');}} className="py-3 font-bold text-slate-400 bg-slate-100 rounded-xl uppercase text-[10px]">Voltar</button>
                            <button 
                                onClick={showTransferModal === 'table' ? handleTransferTable : handleTransferItems} 
                                className={cn("py-3 font-black text-white rounded-xl uppercase text-[10px]", showTransferModal === 'table' ? "bg-amber-500" : "bg-blue-600")}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterPos;
