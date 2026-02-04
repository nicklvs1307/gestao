import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    api, 
    getIngredients, 
    getProductionHistory, 
    produceIngredient, 
    getIngredientRecipes, 
    saveIngredientRecipe,
    getStockLosses,
    createStockLoss,
    performAuditStock
} from '../services/api';
import { 
    Package, AlertTriangle, Plus, Disc, ShoppingCart, 
    Trash2, Receipt, Search, ArrowDownCircle, CheckCircle, 
    X, Hammer, History, ClipboardList, Info, ArrowRight, AlertOctagon, Scale, Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const StockManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'inventory' | 'ingredients' | 'purchases' | 'production' | 'shopping-list' | 'losses' | 'audit'>('inventory');

    useEffect(() => {
        if (location.pathname.includes('/ingredients')) {
            setActiveTab('ingredients');
        } else if (location.pathname.includes('/stock/invoices')) {
            setActiveTab('purchases');
        } else if (location.pathname.includes('/stock/shopping-list')) {
            setActiveTab('shopping-list');
        } else if (location.pathname.includes('/stock/production')) {
            setActiveTab('production');
        } else if (location.pathname.includes('/stock/losses')) {
            setActiveTab('losses');
        } else if (location.pathname.includes('/stock/audit')) {
            setActiveTab('audit');
        } else {
            setActiveTab('inventory');
        }
    }, [location.pathname]);

    const handleTabChange = (tab: string) => {
        if (tab === 'ingredients') navigate('/ingredients');
        else if (tab === 'purchases') navigate('/stock/invoices');
        else if (tab === 'production') navigate('/stock/production');
        else if (tab === 'shopping-list') navigate('/stock/shopping-list');
        else if (tab === 'losses') navigate('/stock/losses');
        else if (tab === 'audit') navigate('/stock/audit');
        else navigate('/stock');
    };

    const handlePrintShoppingList = () => {
        window.print(); // Simples para agora, mas focado na tabela de compras
    };

    const [products, setProducts] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [productionHistory, setProductionHistory] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [losses, setLosses] = useState<any[]>([]);
    const [auditItems, setAuditItems] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [stockSearch, setStockSearch] = useState('');

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [purchaseItems, setPurchaseItems] = useState<{ingredientId: string, quantity: number, unitCost: number, batch?: string, expirationDate?: string}[]>([]);
    
    // Production Form States
    const [showProduceModal, setShowProduceModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [recipeItems, setRecipeItems] = useState<{componentIngredientId: string, quantity: number}[]>([]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'inventory') {
                const res = await api.get('/products');
                setProducts(res.data);
            } else if (activeTab === 'ingredients' || activeTab === 'audit') {
                const res = await api.get('/ingredients');
                setIngredients(res.data);
                if (activeTab === 'audit') {
                    const initialAudit: Record<string, number> = {};
                    res.data.forEach((i: any) => initialAudit[i.id] = i.stock);
                    setAuditItems(initialAudit);
                }
            } else if (activeTab === 'purchases') {
                const [entRes, supRes, ingRes] = await Promise.all([
                    api.get('/stock/entries'),
                    api.get('/financial/suppliers'),
                    api.get('/ingredients')
                ]);
                setPurchases(entRes.data);
                setSuppliers(supRes.data);
                setIngredients(ingRes.data);
            } else if (activeTab === 'production') {
                const [histRes, recRes, ingRes] = await Promise.all([
                    getProductionHistory(),
                    getIngredientRecipes(),
                    getIngredients()
                ]);
                setProductionHistory(histRes);
                setRecipes(recRes);
                setIngredients(ingRes);
            } else if (activeTab === 'losses') {
                const [lossRes, ingRes] = await Promise.all([
                    getStockLosses(),
                    getIngredients()
                ]);
                setLosses(lossRes);
                setIngredients(ingRes);
            }
        } catch (error) {
            console.error("Erro ao carregar dados", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeAudit = async () => {
        if (!confirm('Deseja finalizar o balanço? O sistema será ajustado com os novos valores físicos.')) return;
        setLoading(true);
        try {
            const items = Object.entries(auditItems).map(([id, val]) => ({
                ingredientId: id,
                physicalStock: val
            }));
            await performAuditStock(items);
            toast.success('Estoque ajustado com sucesso!');
            loadData();
        } catch (e) {
            toast.error('Erro ao finalizar balanço.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPurchase = async (id: string) => {
        if(!confirm('Deseja confirmar o recebimento? Isso alimentará o estoque e gerará uma despesa.')) return;
        try {
            await api.put(`/stock/entries/${id}/confirm`);
            toast.success('Mercadoria recebida e estoque atualizado!');
            loadData();
        } catch (e) { toast.error('Erro ao confirmar.'); }
    };

    const handleProduce = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await produceIngredient({
                ingredientId: formData.ingredientId,
                quantity: parseFloat(formData.quantity)
            });
            toast.success('Produção registrada com sucesso!');
            setShowProduceModal(false);
            setFormData({});
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao processar produção.');
        }
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveIngredientRecipe(formData.id, recipeItems);
            toast.success('Receita salva com sucesso!');
            setShowRecipeModal(false);
            setRecipeItems([]);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar receita.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'purchases') {
                await api.post('/stock/entries', { ...formData, items: purchaseItems });
                toast.success('Nota lançada com sucesso!');
            } else if (activeTab === 'ingredients') {
                if (formData.id) {
                    await api.put(`/ingredients/${formData.id}`, formData);
                } else {
                    await api.post('/ingredients', formData);
                }
                toast.success('Salvo com sucesso!');
            } else if (activeTab === 'losses') {
                await createStockLoss({
                    ingredientId: formData.ingredientId,
                    quantity: parseFloat(formData.quantity),
                    reason: formData.reason,
                    notes: formData.notes
                });
                toast.success('Perda registrada com sucesso!');
            }
            setShowForm(false);
            setFormData({});
            setPurchaseItems([]);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar.');
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div className="flex justify-between items-center ui-card p-4">
                <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter">Gestão de Estoque</h2>
                <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full border border-border">
                    {[
                        { id: 'inventory', label: 'Venda', icon: Package },
                        { id: 'ingredients', label: 'Insumos', icon: Disc },
                        { id: 'purchases', label: 'Entradas', icon: ShoppingCart },
                        { id: 'production', label: 'Produção', icon: Hammer },
                        { id: 'losses', label: 'Perdas', icon: AlertOctagon },
                        { id: 'audit', label: 'Balanço', icon: Scale },
                        { id: 'shopping-list', label: 'Lista', icon: ClipboardList }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ui-card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="font-black text-foreground uppercase italic tracking-widest text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {activeTab === 'inventory' ? 'Produtos' : 
                         activeTab === 'ingredients' ? 'Insumos' : 
                         activeTab === 'purchases' ? 'Compras' : 
                         activeTab === 'losses' ? 'Perdas' : 
                         activeTab === 'audit' ? 'Inventário' : 'Produção'}
                    </h3>
                    
                    <div className="flex gap-2">
                        {activeTab === 'ingredients' && (
                            <button 
                                onClick={() => { setShowForm(true); setFormData({}); }} 
                                className="ui-button-primary h-9 text-[10px] px-4 uppercase tracking-widest"
                            >
                                <Plus size={14} /> Novo
                            </button>
                        )}
                        {activeTab === 'losses' && (
                            <button 
                                onClick={() => { setShowForm(true); setFormData({ reason: 'EXPIRED' }); }}
                                className="bg-red-600 text-white px-4 h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-md flex items-center gap-2"
                            >
                                <AlertTriangle size={14} /> Perda
                            </button>
                        )}
                        {activeTab === 'purchases' && (
                            <button 
                                onClick={() => { setShowForm(true); setFormData({}); setPurchaseItems([]); }}
                                className="bg-emerald-600 text-white px-4 h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                            >
                                <Receipt size={14} /> Lançar NF
                            </button>
                        )}
                        {activeTab === 'audit' && (
                            <button 
                                onClick={handleFinalizeAudit}
                                className="bg-blue-600 text-white px-4 h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                            >
                                <Save size={14} /> Finalizar
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-0">
                    {/* ABA: LISTA DE COMPRAS */}
                    {activeTab === 'shopping-list' && (
                        <div className="p-4 space-y-4 animate-in fade-in duration-500">
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                                <div>
                                    <h4 className="text-blue-900 dark:text-blue-100 font-black uppercase italic tracking-tight text-lg">Reposição</h4>
                                    <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest">Insumos abaixo do estoque mínimo.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-blue-900 dark:text-blue-100 italic">{ingredients.filter(i => i.stock <= (i.minStock || 0)).length}</span>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Críticos</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                            <th className="px-6 py-3">Insumo</th>
                                            <th className="px-6 py-3 text-center">Atual</th>
                                            <th className="px-6 py-3 text-center">Mínimo</th>
                                            <th className="px-6 py-3 text-right">Falta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-foreground">
                                        {ingredients.filter(i => i.stock <= (i.minStock || 0)).map((i: any) => {
                                            const diff = (i.minStock || 0) - i.stock;
                                            return (
                                                <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold uppercase text-xs">{i.name}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-red-500 text-xs">{i.stock.toFixed(2)} {i.unit}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{i.minStock.toFixed(2)} {i.unit}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-lg font-black text-[10px] uppercase">
                                                            +{diff.toFixed(2)} {i.unit}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {ingredients.filter(i => i.stock <= (i.minStock || 0)).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center">
                                                    <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                                                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Estoque Saudável</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ABA: ESTOQUE DE VENDA */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-0 animate-in fade-in duration-300">
                            <div className="p-4 bg-muted/10 border-b border-border flex justify-between items-center">
                                <div className="relative w-full max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" placeholder="Pesquisar..." className="ui-input w-full pl-10 h-9 text-xs" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase tracking-widest ml-4">
                                    <AlertTriangle size={14} />
                                    {products.filter(p => p.stock <= 5).length} Alertas
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                            <th className="px-6 py-3">Produto</th>
                                            <th className="px-6 py-3 text-center">Saldo</th>
                                            <th className="px-6 py-3 text-right">Ajuste</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-foreground">
                                        {products.filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase())).map((p: any) => (
                                            <tr key={p.id} className={cn("hover:bg-muted/30 transition-colors", p.stock <= 5 && "bg-red-50/10")}>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden border border-border">
                                                            {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold uppercase text-xs">{p.name}</p>
                                                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{p.category?.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={cn("px-2 py-0.5 rounded-full font-black text-[10px] border", p.stock <= 5 ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20" : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20")}>{p.stock} un</span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button onClick={() => {
                                                            const newStock = p.stock + 1;
                                                            api.put(`/products/${p.id}`, { ...p, stock: newStock }).then(() => loadData());
                                                        }} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 dark:bg-emerald-950/20"><Plus size={14}/></button>
                                                        <button onClick={() => {
                                                            const newStock = Math.max(0, p.stock - 1);
                                                            api.put(`/products/${p.id}`, { ...p, stock: newStock }).then(() => loadData());
                                                        }} className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 dark:bg-red-950/20"><ArrowDownCircle size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ABA: INSUMOS */}
                    {activeTab === 'ingredients' && (
                        <div className="overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                        <th className="px-6 py-3">Insumo / Grupo</th>
                                        <th className="px-6 py-3">Origem</th>
                                        <th className="px-6 py-3 text-center">Estoque</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-foreground">
                                    {ingredients.map((i: any) => (
                                        <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <p className="font-bold uppercase text-xs">{i.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{i.group || 'Geral'} • {i.unit}</p>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                                    i.isProduced ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20" : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50"
                                                )}>
                                                    {i.isProduced ? 'Produzido' : 'Comprado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={cn("px-2 py-0.5 rounded-full font-black text-[10px] border", i.stock <= (i.minStock || 0) ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20" : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20")}>{i.stock.toFixed(2)} {i.unit}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => { setShowForm(true); setFormData(i); }} className="text-primary font-black text-[10px] uppercase hover:underline">Editar</button>
                                                    {i.isProduced && (
                                                        <button 
                                                            onClick={() => {
                                                                setFormData(i);
                                                                const recipe = recipes.find(r => r.id === i.id);
                                                                setRecipeItems(recipe?.recipe.map((ri: any) => ({
                                                                    componentIngredientId: ri.componentIngredientId,
                                                                    quantity: ri.quantity
                                                                })) || []);
                                                                setShowRecipeModal(true);
                                                            }}
                                                            className="text-purple-600 font-black text-[10px] uppercase hover:underline"
                                                        >
                                                            Receita
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ABA: BALANÇO / INVENTÁRIO */}
                    {activeTab === 'audit' && (
                        <div className="p-4 space-y-4 animate-in fade-in duration-300">
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                                <Info className="text-blue-600 dark:text-blue-400" size={24} />
                                <div>
                                    <h4 className="text-blue-900 dark:text-blue-100 font-black uppercase italic text-xs">Inventário Físico</h4>
                                    <p className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-1">Insira a quantidade real em prateleira.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                            <th className="px-6 py-3">Insumo</th>
                                            <th className="px-6 py-3 text-center">Sistema</th>
                                            <th className="px-6 py-3 text-center">Físico</th>
                                            <th className="px-6 py-3 text-right">Diferença</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-foreground">
                                        {ingredients.map((i: any) => {
                                            const physical = auditItems[i.id] ?? i.stock;
                                            const diff = physical - i.stock;
                                            return (
                                                <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold uppercase text-xs">{i.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{i.unit}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{i.stock.toFixed(2)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input 
                                                            type="number" step="0.001"
                                                            className="w-24 h-9 bg-background border border-border rounded-lg px-2 text-center font-black text-xs focus:border-blue-500 outline-none"
                                                            value={physical}
                                                            onChange={e => setAuditItems({...auditItems, [i.id]: parseFloat(e.target.value) || 0})}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black italic text-[10px]">
                                                        {diff === 0 ? <span className="text-slate-300">OK</span> : 
                                                         diff > 0 ? <span className="text-emerald-600">+{diff.toFixed(2)}</span> : 
                                                         <span className="text-red-600">{diff.toFixed(2)}</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ABA: PERDAS */}
                    {activeTab === 'losses' && (
                        <div className="overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">Insumo</th>
                                        <th className="px-6 py-3 text-center">Quantidade</th>
                                        <th className="px-6 py-3">Motivo</th>
                                        <th className="px-6 py-3 text-right">Prejuízo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-foreground">
                                    {losses.map((loss: any) => (
                                        <tr key={loss.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{format(new Date(loss.lossDate), 'dd/MM HH:mm')}</td>
                                            <td className="px-6 py-4 font-bold uppercase text-xs">{loss.ingredient?.name}</td>
                                            <td className="px-6 py-4 text-center font-bold text-red-600 text-xs">-{loss.quantity} {loss.ingredient?.unit}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                                    loss.reason === 'EXPIRED' ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20" : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20"
                                                )}>
                                                    {loss.reason === 'EXPIRED' ? 'Vencido' : 'Avaria'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-red-500 italic text-xs">
                                                R$ {(loss.quantity * (loss.unitCostSnapshot || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {losses.length === 0 && (
                                        <tr><td colSpan={5} className="py-12 text-center text-slate-300 italic">Sem perdas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ABA: ENTRADAS / NF */}
                    {activeTab === 'purchases' && (
                        <div className="overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3">NF / Ref</th>
                                        <th className="px-6 py-3">Fornecedor</th>
                                        <th className="px-6 py-3 text-center">Valor</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-foreground">
                                    {purchases.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{new Date(p.receivedAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold uppercase text-xs">{p.invoiceNumber || p.id.slice(-4)}</td>
                                            <td className="px-6 py-4 text-xs font-bold uppercase">{p.supplier?.name || '-'}</td>
                                            <td className="px-6 py-4 text-center font-black text-xs italic">R$ {p.totalAmount.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase border",
                                                    p.status === 'CONFIRMED' ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20" : "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20"
                                                )}>
                                                    {p.status === 'CONFIRMED' ? 'CONFERIDO' : 'PENDENTE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {p.status === 'PENDING' ? (
                                                    <button onClick={() => handleConfirmPurchase(p.id)} className="text-primary text-[10px] font-black uppercase hover:underline">Confirmar</button>
                                                ) : <CheckCircle size={16} className="text-emerald-500 ml-auto" />}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ABA: PRODUÇÃO */}
                    {activeTab === 'production' && (
                        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2">
                                    <ClipboardList size={14} /> Receitas Ativas
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {recipes.map((r: any) => (
                                        <div key={r.id} className="ui-card p-3 hover:bg-muted/20 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-xs uppercase">{r.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rendimento: 1 {r.unit}</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setFormData(r);
                                                        setRecipeItems(r.recipe.map((ri: any) => ({
                                                            componentIngredientId: ri.componentIngredientId,
                                                            quantity: ri.quantity
                                                        })));
                                                        setShowRecipeModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2">
                                    <History size={14} /> Logs Recentes
                                </h4>
                                <div className="ui-card overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/10">
                                            <tr className="text-[8px] font-black uppercase text-slate-400">
                                                <th className="px-4 py-2">Data</th>
                                                <th className="px-4 py-2">Item</th>
                                                <th className="px-4 py-2 text-right">Qtd</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border text-foreground">
                                            {productionHistory.map((log: any) => (
                                                <tr key={log.id} className="text-[10px] hover:bg-muted/10">
                                                    <td className="px-4 py-2 text-slate-400 font-bold">{format(new Date(log.producedAt), 'dd/MM HH:mm')}</td>
                                                    <td className="px-4 py-2 font-bold uppercase truncate max-w-[100px]">{log.ingredient.name}</td>
                                                    <td className="px-4 py-2 text-right font-black text-emerald-600">+{log.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAIS STANDARD */}
            {showForm && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-lg">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                            <h3 className="text-lg font-black text-foreground italic uppercase tracking-tight">
                                {activeTab === 'purchases' ? 'Lançar Nota' : (formData.id ? 'Editar' : 'Novo') + ' Insumo'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full text-slate-400 transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {activeTab === 'ingredients' && (
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Insumo</label><input className="ui-input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unidade</label><select className="ui-input w-full" value={formData.unit || 'un'} onChange={e => setFormData({...formData, unit: e.target.value})}><option value="un">un</option><option value="kg">kg</option><option value="gr">gr</option><option value="lt">lt</option><option value="ml">ml</option></select></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mínimo</label><input type="number" step="0.001" className="ui-input w-full" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: e.target.value})} /></div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl border border-border">
                                        <input type="checkbox" className="w-4 h-4 accent-primary" checked={formData.isProduced} onChange={e => setFormData({...formData, isProduced: e.target.checked})} />
                                        <span className="text-[10px] font-black uppercase text-foreground">Produzido Internamente</span>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'losses' && (
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Insumo</label><select className="ui-input w-full" value={formData.ingredientId || ''} onChange={e => setFormData({...formData, ingredientId: e.target.value})} required><option value="">Selecione...</option>{ingredients.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Qtd</label><input type="number" step="0.001" className="ui-input w-full" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: e.target.value})} required /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Motivo</label><select className="ui-input w-full" value={formData.reason || 'EXPIRED'} onChange={e => setFormData({...formData, reason: e.target.value})}><option value="EXPIRED">Vencido</option><option value="BROKEN">Avaria</option><option value="PRODUCTION_ERROR">Erro Produção</option></select></div>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="ui-button-secondary flex-1">Cancelar</button>
                                <button type="submit" className="ui-button-primary flex-1">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showProduceModal && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-sm">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                            <h3 className="text-lg font-black text-foreground italic uppercase tracking-tight">Registrar Produção</h3>
                            <button onClick={() => setShowProduceModal(false)} className="p-2 hover:bg-muted rounded-full text-slate-400 transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleProduce} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">O que foi produzido?</label>
                                <select className="ui-input w-full" value={formData.ingredientId || ''} onChange={e => setFormData({...formData, ingredientId: e.target.value})} required>
                                    <option value="">Selecione...</option>
                                    {recipes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantidade</label>
                                <input type="number" step="0.001" className="ui-input w-full h-14 text-xl text-center font-black" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: e.target.value})} required placeholder="0.000" />
                            </div>
                            <button type="submit" className="ui-button-primary w-full h-14 text-sm italic">
                                <CheckCircle size={20} /> Confirmar Produção
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showRecipeModal && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-xl">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-foreground italic uppercase tracking-tight">Ficha Técnica</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Componentes para 1 {formData.unit} de {formData.name}</p>
                            </div>
                            <button onClick={() => setShowRecipeModal(false)} className="p-2 hover:bg-muted rounded-full text-slate-400 transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveRecipe} className="p-6 space-y-4">
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {recipeItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-end bg-muted/10 p-3 rounded-xl border border-border">
                                        <div className="flex-[3]">
                                            <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Insumo</label>
                                            <select className="ui-input w-full h-9 text-xs" value={item.componentIngredientId} onChange={e => { const n = [...recipeItems]; n[idx].componentIngredientId = e.target.value; setRecipeItems(n); }}>
                                                <option value="">Selecione...</option>
                                                {ingredients.filter(ing => ing.id !== formData.id).map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Qtd</label>
                                            <input type="number" step="0.001" className="ui-input w-full h-9 text-xs text-right font-bold" value={item.quantity} onChange={e => { const n = [...recipeItems]; n[idx].quantity = parseFloat(e.target.value); setRecipeItems(n); }} />
                                        </div>
                                        <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setRecipeItems([...recipeItems, { componentIngredientId: '', quantity: 0 }])} className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-primary hover:text-primary transition-all">+ Item</button>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowRecipeModal(false)} className="ui-button-secondary flex-1">Cancelar</button>
                                <button type="submit" className="ui-button-primary flex-1">Salvar Receita</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagement;
