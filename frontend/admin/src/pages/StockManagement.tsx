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
    X, Hammer, History, ClipboardList, Info, ArrowRight, AlertOctagon, Scale, Save, Loader2, TrendingDown, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const StockManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'inventory' | 'ingredients' | 'purchases' | 'production' | 'shopping-list' | 'losses' | 'audit'>('inventory');

    useEffect(() => {
        if (location.pathname.includes('/ingredients')) setActiveTab('ingredients');
        else if (location.pathname.includes('/stock/invoices')) setActiveTab('purchases');
        else if (location.pathname.includes('/stock/shopping-list')) setActiveTab('shopping-list');
        else if (location.pathname.includes('/stock/production')) setActiveTab('production');
        else if (location.pathname.includes('/stock/losses')) setActiveTab('losses');
        else if (location.pathname.includes('/stock/audit')) setActiveTab('audit');
        else setActiveTab('inventory');
    }, [location.pathname]);

    const handleTabChange = (tab: string) => {
        const routes: Record<string, string> = {
            'ingredients': '/ingredients',
            'purchases': '/stock/invoices',
            'production': '/stock/production',
            'shopping-list': '/stock/shopping-list',
            'losses': '/stock/losses',
            'audit': '/stock/audit'
        };
        navigate(routes[tab] || '/stock');
    };

    const [products, setProducts] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [productionHistory, setProductionHistory] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [losses, setLosses] = useState<any[]>([]);
    const [auditItems, setAuditItems] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [stockSearch, setStockSearch] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [showProduceModal, setShowProduceModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [recipeItems, setRecipeItems] = useState<{componentIngredientId: string, quantity: number}[]>([]);

    useEffect(() => { loadData(); }, [activeTab]);

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
                const res = await api.get('/stock/entries');
                setPurchases(res.data);
            } else if (activeTab === 'production') {
                const [histRes, recRes] = await Promise.all([getProductionHistory(), getIngredientRecipes()]);
                setProductionHistory(histRes);
                setRecipes(recRes);
            } else if (activeTab === 'losses') {
                const res = await getStockLosses();
                setLosses(res);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleConfirmPurchase = async (id: string) => {
        if(!confirm('Confirmar recebimento?')) return;
        try {
            await api.put(`/stock/entries/${id}/confirm`);
            toast.success('Estoque atualizado!');
            loadData();
        } catch (e) { toast.error('Erro ao confirmar.'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'ingredients') {
                if (formData.id) await api.put(`/ingredients/${formData.id}`, formData);
                else await api.post('/ingredients', formData);
                toast.success('Salvo!');
            } else if (activeTab === 'losses') {
                await createStockLoss(formData);
                toast.success('Perda registrada!');
            }
            setShowForm(false);
            setFormData({});
            loadData();
        } catch (error) { toast.error('Erro ao salvar.'); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header e Tabs Master */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Estoque</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Package size={14} className="text-orange-500" /> Controle de Insumos e Produtos
                    </p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {[
                        { id: 'inventory', label: 'Venda', icon: Package },
                        { id: 'ingredients', label: 'Insumos', icon: Disc },
                        { id: 'purchases', label: 'Entradas', icon: ShoppingCart },
                        { id: 'losses', label: 'Perdas', icon: AlertOctagon },
                        { id: 'audit', label: 'Balanço', icon: Scale },
                        { id: 'shopping-list', label: 'Faltas', icon: ClipboardList }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={cn("px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap", activeTab === tab.id ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboards Rápidos de Estoque */}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-rose-100 bg-rose-50/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><AlertTriangle size={24} /></div>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-100 px-2 py-1 rounded-md">Crítico</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Itens Sem Estoque</p>
                        <h3 className="text-3xl font-black text-rose-900 tracking-tighter italic">{products.filter(p => p.stock <= 0).length} Itens</h3>
                    </Card>
                    <Card className="p-6 border-orange-100 bg-orange-50/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><TrendingDown size={24} /></div>
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-100 px-2 py-1 rounded-md">Aviso</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Estoque Baixo</p>
                        <h3 className="text-3xl font-black text-orange-900 tracking-tighter italic">{products.filter(p => p.stock > 0 && p.stock <= 5).length} Itens</h3>
                    </Card>
                    <Card className="p-6 border-slate-200 bg-slate-900 text-white">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><Package size={24} /></div>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest border border-orange-500/30 px-2 py-1 rounded-md">Total</span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Produtos em Catálogo</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter italic">{products.length} Ativos</h3>
                    </Card>
                </div>
            )}

            {/* Listagem Principal */}
            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-base">
                            {activeTab === 'inventory' ? 'Produtos p/ Venda' : activeTab === 'ingredients' ? 'Banco de Insumos' : activeTab === 'purchases' ? 'Histórico de Entradas' : activeTab === 'losses' ? 'Registro de Perdas' : 'Lista de Reposição'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Conferência e ajustes de quantidades</p>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'inventory' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input type="text" placeholder="Filtrar..." className="ui-input pl-9 h-10 text-xs w-48" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                            </div>
                        )}
                        <Button size="sm" className="px-6 rounded-xl italic" onClick={() => { setShowForm(true); setFormData({}); }}>
                            <Plus size={16} /> NOVO REGISTRO
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-orange-500" size={32} /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Estoque...</span></div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    {activeTab === 'inventory' ? (
                                        <>
                                            <th className="px-8 py-4">Produto / Categoria</th>
                                            <th className="px-8 py-4 text-center">Status</th>
                                            <th className="px-8 py-4 text-center">Saldo Atual</th>
                                            <th className="px-8 py-4 text-right">Ajuste Rápido</th>
                                        </>
                                    ) : activeTab === 'ingredients' ? (
                                        <>
                                            <th className="px-8 py-4">Insumo / Grupo</th>
                                            <th className="px-8 py-4 text-center">Origem</th>
                                            <th className="px-8 py-4 text-center">Saldo</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-8 py-4">Data</th>
                                            <th className="px-8 py-4">Referência</th>
                                            <th className="px-8 py-4 text-center">Quantidade</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeTab === 'inventory' && products.filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase())).map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                                    {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{p.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.category?.name || 'Geral'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest", p.stock <= 5 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100")}>
                                                {p.stock <= 0 ? 'Esgotado' : p.stock <= 5 ? 'Baixo' : 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="font-black text-sm text-slate-900 italic tracking-tighter">{p.stock} un</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 hover:bg-emerald-50" onClick={() => { api.put(`/products/${p.id}`, { ...p, stock: p.stock + 1 }).then(() => loadData()); }}><Plus size={16} className="text-emerald-600"/></Button>
                                                <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 hover:bg-rose-50" onClick={() => { api.put(`/products/${p.id}`, { ...p, stock: Math.max(0, p.stock - 1) }).then(() => loadData()); }}><TrendingDown size={16} className="text-rose-600"/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'ingredients' && ingredients.map((i: any) => (
                                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{i.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{i.group || 'Geral'} • {i.unit}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest", i.isProduced ? "bg-purple-50 text-purple-600 border border-purple-100" : "bg-slate-100 text-slate-500")}>
                                                {i.isProduced ? 'Produção' : 'Compra'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn("font-black text-sm italic tracking-tighter", i.stock <= (i.minStock || 0) ? "text-rose-600" : "text-slate-900")}>{i.stock.toFixed(2)} {i.unit}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-orange-600" onClick={() => { setShowForm(true); setFormData(i); }}>Editar</Button>
                                                {i.isProduced && <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-purple-600" onClick={() => { setFormData(i); setShowRecipeModal(true); }}>Ficha Técnica</Button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* MODAIS PREMIUM */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                            <header className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                    {formData.id ? 'Editar' : 'Novo'} Insumo
                                </h3>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white" onClick={() => setShowForm(false)}><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                <Input label="Nome do Insumo" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Queijo Mussarela" />
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unidade de Medida</label>
                                        <select className="ui-input w-full h-12" value={formData.unit || 'un'} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                            <option value="un">un (Unidade)</option><option value="kg">kg (Quilo)</option><option value="gr">gr (Grama)</option><option value="lt">lt (Litro)</option><option value="ml">ml (Mililitro)</option>
                                        </select>
                                    </div>
                                    <Input label="Estoque Mínimo" type="number" step="0.001" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                                </div>
                                <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center gap-3", formData.isProduced ? "border-purple-500 bg-purple-50" : "border-slate-100 bg-slate-50")} onClick={() => setFormData({...formData, isProduced: !formData.isProduced})}>
                                    <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", formData.isProduced ? "bg-purple-500 border-purple-500" : "border-slate-300")}>{formData.isProduced && <CheckCircle size={14} className="text-white" />}</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Produzido Internamente (Receita)</span>
                                </Card>
                                <div className="pt-6 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowForm(false)}>Cancelar</Button>
                                    <Button type="submit" fullWidth className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">SALVAR ALTERAÇÕES</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StockManagement;