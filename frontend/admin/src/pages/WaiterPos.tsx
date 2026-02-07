import React, { useState, useEffect, useMemo } from 'react';
import { 
    getProducts, getCategories, createOrder, getPosTableSummary, sendTableRequest,
    transferTable, transferItems, removeOrderItem 
} from '../services/api';
import { 
    Search, ShoppingCart, Plus, Minus, X, Trash2, 
    Utensils, CheckCircle, Send, History, User, Receipt, List, Pizza as PizzaIcon, Check, LogOut, Info,
    ArrowRightLeft, MoveRight, Loader2, RefreshCw, Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import type { Product, Category, CartItem, TableSummary, SizeOption, AddonOption } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AnimatePresence, motion } from 'framer-motion';

const WaiterPos: React.FC = () => {
    const { logout } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tables, setTables] = useState<TableSummary[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'cart'>('tables');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const [selectedTable, setSelectedTable] = useState<TableSummary | null>(null);
    const [customerName, setCustomerName] = useState(''); 
    const [cart, setCart] = useState<CartItem[]>([]);

    const [isViewingDetails, setIsViewingDetails] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [targetTableNumber, setTargetTableNumber] = useState('');
    const [showTransferModal, setShowTransferModal] = useState<'none' | 'table' | 'items'>('none');

    const [productWithOptions, setProductWithOptions] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
    const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
    const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
    const [obs, setObs] = useState('');

    useEffect(() => {
        loadData();
        const interval = setInterval(loadTables, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prods, cats, summary] = await Promise.all([ getProducts(), getCategories(true), getPosTableSummary() ]);
            setProducts(prods);
            setCategories(cats);
            setTables(summary);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const loadTables = async () => {
        try {
            const summary = await getPosTableSummary();
            setTables(summary);
        } catch (e) { console.error(e); }
    };

    const handleProductClick = (product: Product) => {
        const hasOptions = (product.sizes && product.sizes.length > 0) || (product.addonGroups && product.addonGroups.length > 0) || (product.pizzaConfig);
        if (hasOptions) {
            setProductWithOptions(product);
            setSelectedSize(product.sizes?.[0] || null);
            setSelectedAddons([]);
            setSelectedFlavors([]);
            setObs('');
            if (product.pizzaConfig?.flavorCategoryId) {
                const flavors = products.filter(p => p.categoryId === product.pizzaConfig?.flavorCategoryId && p.isAvailable);
                setAvailableFlavors(flavors);
            }
        } else { addToCart(product, null, [], []); }
    };

    const addToCart = (product: Product, size: SizeOption | null, addons: AddonOption[], flavors: Product[], observation: string = '') => {
        const cartItemId = `${product.id}-${size?.id || 'none'}-${addons.map(a => a.id).sort().join(',')}-${flavors.map(f => f.id).sort().join(',')}`;
        const existing = cart.find(item => item.cartItemId === cartItemId);

        if (existing) {
            setCart(cart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item ));
        } else {
            let basePrice = size?.price || product.price;
            if (product.pizzaConfig && flavors.length > 0) {
                const flavorPrices = flavors.map(f => {
                    if (size) { return (f.sizes || []).find(sz => sz.name === size.name)?.price || f.price; }
                    return f.price;
                });
                basePrice = product.pizzaConfig.priceRule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavors.length;
            }
            const finalPrice = basePrice + addons.reduce((acc, a) => acc + a.price, 0);
            let itemName = product.name;
            if (size) itemName += ` (${size.name})`;
            if (flavors.length > 0) itemName += ` [${flavors.map(f => f.name).join('/')}]`;

            const newItem: CartItem = {
                id: Date.now().toString(), cartItemId, productDbId: product.id, productId: product.id, name: itemName, price: finalPrice, quantity: 1, observation,
                selectedSizeDbId: size?.id, selectedAddonDbIds: addons.map(a => a.id), selectedFlavorIds: flavors.map(f => f.id),
                sizeJson: size ? JSON.stringify({ id: size.id, name: size.name, price: size.price }) : null,
                addonsJson: JSON.stringify(addons.map(a => ({ id: a.id, name: a.name, price: a.price }))),
                flavorsJson: JSON.stringify(flavors.map(f => ({ id: f.id, name: f.name, price: f.price })))
            };
            setCart([...cart, newItem]);
        }
        setProductWithOptions(null);
        toast.success("Item na sacola!");
    };

    const handleSubmitOrder = async () => {
        if (!selectedTable || cart.length === 0) return;
        setIsPlacingOrder(true);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            await createOrder({
                items: cart.map(i => ({ productId: i.productDbId, quantity: i.quantity, observations: i.observation, sizeId: i.selectedSizeDbId, addonsIds: i.selectedAddonDbIds, flavorIds: i.selectedFlavorIds, sizeJson: i.sizeJson, addonsJson: i.addonsJson, flavorsJson: i.flavorsJson })),
                orderType: 'TABLE', tableNumber: selectedTable.number, customerName: customerName || null, userId: user?.id
            });
            toast.success(`Mesa ${selectedTable.number}: Pedido enviado!`);
            setCart([]); setSelectedTable(null); setCustomerName(''); setActiveTab('tables'); loadTables();
        } catch (error) { toast.error("Erro no envio."); }
        finally { setIsPlacingOrder(false); }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => (selectedCategory === 'all' || p.categoryId === selectedCategory) && p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.isAvailable);
    }, [products, selectedCategory, searchTerm]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-orange-500" size={48} /></div>;

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden -m-8">
            {/* Header Mobile Otimizado */}
            <header className="h-20 bg-slate-900 border-b border-white/5 px-6 flex items-center justify-between shrink-0 z-30 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-2xl shadow-xl shadow-orange-500/20"><Utensils size={24} /></div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-[0.2em] leading-none">Garçom Pro</h1>
                        <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase italic">{selectedTable ? `MESA ${selectedTable.number}` : 'Selecione Ambiente'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {selectedTable ? (
                        <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl h-12 w-12" onClick={() => {setSelectedTable(null); setActiveTab('tables'); setCart([]);}}><X size={20} /></Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="bg-rose-500/10 text-rose-500 rounded-xl h-12 w-12" onClick={logout}><LogOut size={20} /></Button>
                    )}
                </div>
            </header>

            {/* Menu de Navegação Touch */}
            {selectedTable && (
                <div className="flex bg-slate-900 border-b border-white/5 shrink-0 z-20">
                    {[
                        { id: 'menu', label: 'Lançar Itens', icon: List },
                        { id: 'cart', label: `Sacola (${cart.length})`, icon: ShoppingCart },
                        { id: 'tables', label: 'Consumo Mesa', icon: Receipt }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 py-5 flex flex-col items-center gap-1.5 transition-all relative", activeTab === tab.id ? "text-orange-500" : "text-slate-500")}>
                            <tab.icon size={18} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && <div className="absolute bottom-0 w-8 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_orange]" />}
                        </button>
                    ))}
                </div>
            )}

            <main className="flex-1 overflow-hidden relative bg-slate-950">
                
                {/* TELA 1: GRID DE MESAS */}
                {(activeTab === 'tables' && !selectedTable) && (
                    <div className="h-full overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Mapa do Salão</h2>
                            <Button variant="ghost" size="icon" className="text-slate-500" onClick={loadTables}><RefreshCw size={16}/></Button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {tables.map(table => (
                                <button key={table.id} onClick={() => { setSelectedTable(table); setActiveTab('menu'); }} className={cn("aspect-square rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all active:scale-90 shadow-lg", table.status === 'free' ? "bg-slate-900 border-white/5 text-slate-600" : "bg-orange-500 border-orange-400 text-white shadow-orange-500/20")}>
                                    <span className="text-3xl font-black italic tracking-tighter">{table.number}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-60">{table.status === 'free' ? 'Livre' : 'Ocupada'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* TELA 2: CARDÁPIO LANÇAMENTO */}
                {(activeTab === 'menu' && selectedTable) && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        <div className="p-6 bg-slate-900 border-b border-white/5 space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                                <input type="text" placeholder="Buscar no cardápio..." className="w-full h-14 pl-12 bg-slate-950 border-2 border-white/5 rounded-2xl font-black text-sm outline-none focus:border-orange-500 transition-all uppercase italic tracking-tight" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                <button onClick={() => setSelectedCategory('all')} className={cn("px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all", selectedCategory === 'all' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-slate-800 text-slate-500")}>Todos</button>
                                {categories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn("px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all", selectedCategory === cat.id ? "bg-orange-500 text-white shadow-lg" : "bg-slate-800 text-slate-500")}>{cat.name}</button>)}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                            {filteredProducts.map(product => (
                                <button key={product.id} onClick={() => handleProductClick(product)} className="w-full p-5 bg-slate-900 border-2 border-white/5 rounded-[2rem] flex justify-between items-center active:scale-95 transition-all hover:border-orange-500/30">
                                    <div className="text-left flex-1 min-w-0 pr-4">
                                        <h4 className="font-black text-white uppercase italic tracking-tight text-sm truncate">{product.name}</h4>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{product.category?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-orange-500 text-sm italic tracking-tighter">R$ {product.price.toFixed(2)}</span>
                                        <div className="w-10 h-10 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-lg"><Plus size={20} strokeWidth={4} /></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* TELA 3: SACOLA ATUAL */}
                {(activeTab === 'cart' && selectedTable) && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6 grayscale"><ShoppingCart size={80} strokeWidth={1} /><p className="font-black uppercase tracking-[0.3em] text-sm">Sacola Vazia</p></div>
                            ) : cart.map(item => (
                                <Card key={item.id} className="p-5 bg-slate-900 border-white/5 rounded-[2rem] flex justify-between items-center shadow-xl">
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-black text-white text-sm italic uppercase leading-none mb-2">{item.name}</h4>
                                        {item.observation && <div className="flex items-center gap-2 text-orange-500"><Info size={10}/><p className="text-[9px] font-bold italic truncate uppercase">{item.observation}</p></div>}
                                    </div>
                                    <div className="flex items-center bg-slate-950 rounded-2xl p-1.5 gap-3 border border-white/5 shadow-inner">
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))} className="w-8 h-8 flex items-center justify-center text-slate-500"><Minus size={16} strokeWidth={4}/></button>
                                        <span className="w-6 text-center font-black text-white text-sm">{item.quantity}</span>
                                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="w-8 h-8 flex items-center justify-center text-orange-500"><Plus size={16} strokeWidth={4}/></button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <div className="p-8 bg-slate-900 border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-end mb-8">
                                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-2">Total do Lançamento</span><span className="text-4xl font-black text-white italic tracking-tighter leading-none">R$ {cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2).replace('.', ',')}</span></div>
                            </div>
                            <Button fullWidth onClick={handleSubmitOrder} disabled={cart.length === 0 || isPlacingOrder} isLoading={isPlacingOrder} className="h-16 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/20 italic">
                                ENVIAR PARA COZINHA <Send size={16} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* TELA 4: CONSUMO MESA (STATUS) */}
                {(activeTab === 'tables' && selectedTable) && (
                    <div className="flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
                        <div className="p-6 border-b border-white/5 bg-slate-900/50">
                            <div className="flex justify-between items-center">
                                <div><h3 className="text-xl font-black italic uppercase tracking-tighter">Consumo Mesa 0{selectedTable.number}</h3><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Itens já lançados e em produção</p></div>
                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><Receipt size={24}/></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {selectedTable.items?.map(item => (
                                <div key={item.id} className="p-4 bg-slate-900 border-2 border-white/5 rounded-2xl flex justify-between items-center opacity-80">
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-300 text-xs uppercase italic leading-tight mb-1">{item.product.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Qtd: {item.quantity} • R$ {(item.priceAtTime * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <CheckCircle size={16} className="text-emerald-500 opacity-40" />
                                </div>
                            ))}
                            {(!selectedTable.items || selectedTable.items.length === 0) && (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4 grayscale"><Smartphone size={64}/><p className="font-black uppercase tracking-widest text-[10px]">Sem consumo registrado</p></div>
                            )}
                        </div>
                        <div className="p-8 bg-slate-900 border-t border-white/5 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subtotal Acumulado</span>
                                <span className="text-2xl font-black text-white italic tracking-tighter">R$ {selectedTable.totalAmount.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <Button variant="outline" fullWidth className="h-14 rounded-2xl border-blue-500/30 text-blue-400 bg-blue-500/5 uppercase tracking-widest text-[10px] font-black italic" onClick={async () => { if(confirm("Solicitar fechamento?")) { await sendTableRequest(selectedTable.restaurantId, String(selectedTable.number), 'BILL'); toast.success("Conta solicitada!"); } }}>PEDIR CONTA (CHECKOUT)</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE OPÇÕES (TOUCH FRIENDLY) */}
            <AnimatePresence>
                {productWithOptions && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/90 backdrop-blur-md">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-xl bg-slate-900 rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-t border-white/10">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                                <div><h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{productWithOptions.name}</h3><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2">Personalize o pedido</p></div>
                                <Button variant="ghost" size="icon" onClick={() => setProductWithOptions(null)} className="rounded-full bg-white/5 h-12 w-12"><X size={24} /></Button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                                {/* Tamanhos */}
                                {productWithOptions.sizes && productWithOptions.sizes.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3 italic"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Escolha o Tamanho</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {productWithOptions.sizes.map(size => (
                                                <button key={size.id} onClick={() => setSelectedSize(size)} className={cn("p-5 rounded-3xl border-2 flex justify-between items-center transition-all", selectedSize?.id === size.id ? "border-orange-500 bg-orange-500/10 text-white" : "border-white/5 bg-slate-950 text-slate-500")}>
                                                    <span className="font-black text-sm uppercase italic tracking-tight">{size.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-xs italic tracking-tighter">R$ {size.price.toFixed(2)}</span>
                                                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", selectedSize?.id === size.id ? "bg-orange-500 border-orange-500" : "border-white/10")}>{selectedSize?.id === size.id && <Check size={14} strokeWidth={4} />}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Adicionais */}
                                {productWithOptions.addonGroups?.map(group => (
                                    <div key={group.id} className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3 italic"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {group.name}</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {group.addons.map(addon => {
                                                const isSelected = selectedAddons.some(a => a.id === addon.id);
                                                return (
                                                    <button key={addon.id} onClick={() => isSelected ? setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id)) : setSelectedAddons([...selectedAddons, addon])} className={cn("p-5 rounded-3xl border-2 flex justify-between items-center transition-all", isSelected ? "border-purple-500 bg-purple-500/10 text-white" : "border-white/5 bg-slate-950 text-slate-500")}>
                                                        <span className="font-black text-sm uppercase italic tracking-tight">{addon.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-xs italic text-emerald-500">+ R$ {addon.price.toFixed(2)}</span>
                                                            <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center", isSelected ? "bg-purple-500 border-purple-500" : "border-white/10")}>{isSelected && <Check size={14} strokeWidth={4} />}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Observação do Garçom */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3 italic"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Observação do Item</h4>
                                    <textarea className="w-full bg-slate-950 border-2 border-white/5 rounded-[2rem] p-6 text-sm font-black text-white uppercase italic tracking-tight outline-none focus:border-orange-500 transition-all shadow-inner" rows={3} placeholder="EX: SEM CEBOLA, GELO À PARTE..." value={obs} onChange={e => setObs(e.target.value)} />
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 border-t border-white/5">
                                <Button fullWidth size="lg" onClick={() => addToCart(productWithOptions, selectedSize, selectedAddons, selectedFlavors, obs)} className="h-16 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-500/20 italic">CONFIRMAR ITEM</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WaiterPos;