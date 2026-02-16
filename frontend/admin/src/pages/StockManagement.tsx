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
    X, Hammer, History, ClipboardList, Info, ArrowRight, AlertOctagon, Scale, Save, Loader2, TrendingDown, ChevronRight,
    Layers, MoveHorizontal, ListOrdered, FileText, Printer, GripVertical, Folder
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const StockManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'inventory' | 'ingredients' | 'groups' | 'purchases' | 'production' | 'shopping-list' | 'losses' | 'audit' | 'history' | 'moves' | 'purchase-orders' | 'recipes'>('inventory');

    useEffect(() => {
        if (location.pathname.includes('/ingredients/groups')) setActiveTab('groups');
        else if (location.pathname.includes('/ingredients')) setActiveTab('ingredients');
        else if (location.pathname.includes('/stock/invoices')) setActiveTab('purchases');
        else if (location.pathname.includes('/stock/shopping-list')) setActiveTab('shopping-list');
        else if (location.pathname.includes('/stock/production')) setActiveTab('production');
        else if (location.pathname.includes('/stock/losses')) setActiveTab('losses');
        else if (location.pathname.includes('/stock/audit')) setActiveTab('audit');
        else if (location.pathname.includes('/stock/history')) setActiveTab('history');
        else if (location.pathname.includes('/stock/moves')) setActiveTab('moves');
        else if (location.pathname.includes('/stock/purchase-orders')) setActiveTab('purchase-orders');
        else if (location.pathname.includes('/stock/recipes')) setActiveTab('recipes');
        else setActiveTab('inventory');
    }, [location.pathname]);

    const handleTabChange = (tab: string) => {
        const routes: Record<string, string> = {
            'ingredients': '/ingredients',
            'groups': '/ingredients/groups',
            'purchases': '/stock/invoices',
            'production': '/stock/production',
            'shopping-list': '/stock/shopping-list',
            'losses': '/stock/losses',
            'audit': '/stock/audit',
            'history': '/stock/history',
            'moves': '/stock/moves',
            'purchase-orders': '/stock/purchase-orders',
            'recipes': '/stock/recipes'
        };
        navigate(routes[tab] || '/stock');
    };

    const [products, setProducts] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [ingredientGroups, setIngredientGroups] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [productionHistory, setProductionHistory] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [losses, setLosses] = useState<any[]>([]);
    const [auditItems, setAuditItems] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [stockSearch, setStockSearch] = useState('');
    const [filterGroup, setFilterGroup] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const [showForm, setShowForm] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showLossModal, setShowLossModal] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [showProduceModal, setShowProduceModal] = useState(false);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [recipeItems, setRecipeItems] = useState<{componentIngredientId: string, quantity: number, unitCost?: number, name?: string}[]>([]);
    const [yieldAmount, setYieldAmount] = useState(1);

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'inventory' || activeTab === 'recipes') {
                const [prodRes, ingRes] = await Promise.all([
                    api.get('/products'),
                    api.get('/ingredients')
                ]);
                setProducts(prodRes.data);
                setIngredients(ingRes.data);
            } else if (activeTab === 'ingredients' || activeTab === 'audit' || activeTab === 'groups' || activeTab === 'shopping-list') {
                const [ingRes, groupRes, suppRes] = await Promise.all([
                    api.get('/ingredients'),
                    api.get('/ingredients/groups'),
                    api.get('/financial/suppliers')
                ]);
                setIngredients(ingRes.data);
                setIngredientGroups(groupRes.data);
                setSuppliers(suppRes.data);
                if (activeTab === 'audit') {
                    const initialAudit: Record<string, number> = {};
                    ingRes.data.forEach((i: any) => initialAudit[i.id] = i.stock);
                    setAuditItems(initialAudit);
                }
            } else if (activeTab === 'purchases') {
                const [ingRes, groupRes, suppRes, stockRes] = await Promise.all([
                    api.get('/ingredients'),
                    api.get('/ingredients/groups'),
                    api.get('/financial/suppliers'),
                    api.get('/stock/entries')
                ]);
                setIngredients(ingRes.data);
                setIngredientGroups(groupRes.data);
                setSuppliers(suppRes.data);
                setPurchases(stockRes.data);
            } else if (activeTab === 'production') {
                const [histRes, recRes, ingRes] = await Promise.all([
                    getProductionHistory(), 
                    getIngredientRecipes(),
                    api.get('/ingredients')
                ]);
                setProductionHistory(histRes);
                setRecipes(recRes);
                setIngredients(ingRes.data);
            } else if (activeTab === 'losses') {
                const [lossRes, ingRes] = await Promise.all([
                    getStockLosses(),
                    api.get('/ingredients')
                ]);
                setLosses(lossRes);
                setIngredients(ingRes.data);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleOpenRecipe = (item: any) => {
        setFormData(item);
        setYieldAmount(1);
        
        // Carrega itens existentes da receita
        if (item.ingredients) {
            setRecipeItems(item.ingredients.map((ri: any) => ({
                componentIngredientId: ri.ingredientId,
                quantity: ri.quantity,
                name: ri.ingredient?.name,
                unitCost: ri.ingredient?.lastUnitCost || 0
            })));
        } else if (item.recipe) {
            setRecipeItems(item.recipe.map((ri: any) => ({
                componentIngredientId: ri.componentIngredientId,
                quantity: ri.quantity,
                name: ri.componentIngredient?.name,
                unitCost: ri.componentIngredient?.lastUnitCost || 0
            })));
        } else {
            setRecipeItems([]);
        }
        setShowRecipeModal(true);
    };

    const addRecipeItem = () => {
        setRecipeItems([...recipeItems, { componentIngredientId: '', quantity: 0, unitCost: 0 }]);
    };

    const updateRecipeItem = (index: number, field: string, value: any) => {
        const newItems = [...recipeItems];
        if (field === 'componentIngredientId') {
            const ing = ingredients.find(i => i.id === value);
            newItems[index] = { 
                ...newItems[index], 
                componentIngredientId: value, 
                name: ing?.name, 
                unitCost: ing?.lastUnitCost || 0 
            };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setRecipeItems(newItems);
    };

    const removeRecipeItem = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };

    const handleSaveRecipe = async () => {
        try {
            setLoading(true);
            const payload = {
                items: recipeItems.map(i => ({
                    componentIngredientId: i.componentIngredientId,
                    quantity: Number(i.quantity)
                })),
                yieldAmount: Number(yieldAmount)
            };

            if (formData.isProduced !== undefined) {
                // É um ingrediente beneficiado
                await api.post(`/production/${formData.id}/recipe`, payload);
            } else {
                // É um produto final
                await api.put(`/products/${formData.id}`, {
                    ...formData,
                    ingredients: payload.items.map(i => ({
                        ingredientId: i.componentIngredientId,
                        quantity: i.quantity
                    }))
                });
            }
            
            toast.success('Ficha Técnica salva com sucesso!');
            setShowRecipeModal(false);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar ficha técnica.');
        } finally {
            setLoading(false);
        }
    };

    const totalRecipeCost = recipeItems.reduce((acc, item) => acc + (Number(item.quantity) * (item.unitCost || 0)), 0);

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
            if (showForm) {
                const payload = {
                    ...formData,
                    stock: Number(formData.stock || 0),
                    minStock: Number(formData.minStock || 0),
                    averageCost: Number(formData.averageCost || 0)
                };
                if (formData.id) await api.put(`/ingredients/${formData.id}`, payload);
                else await api.post('/ingredients', payload);
                toast.success('Insumo salvo!');
                setShowForm(false);
            } else if (showGroupModal) {
                if (formData.id) await api.put(`/ingredients/groups/${formData.id}`, formData);
                else await api.post('/ingredients/groups', formData);
                toast.success('Grupo salvo!');
                setShowGroupModal(false);
            } else if (showLossModal) {
                await createStockLoss(formData);
                toast.success('Perda registrada!');
                setShowLossModal(false);
            } else if (showPurchaseModal) {
                await api.post('/stock/entries', formData);
                toast.success('Entrada registrada!');
                setShowPurchaseModal(false);
            } else if (showProduceModal) {
                await produceIngredient(formData);
                toast.success('Produção registrada!');
                setShowProduceModal(false);
            }
            setFormData({});
            loadData();
        } catch (error) { toast.error('Erro ao salvar registro.'); }
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
                        { id: 'recipes', label: 'Ficha Técnica', icon: FileText },
                        { id: 'ingredients', label: 'Insumos', icon: Disc },
                        { id: 'groups', label: 'Grupos', icon: Layers },
                        { id: 'purchases', label: 'Entradas', icon: ShoppingCart },
                        { id: 'production', label: 'Produção', icon: Hammer },
                        { id: 'losses', label: 'Perdas', icon: AlertOctagon },
                        { id: 'history', label: 'Histórico', icon: History },
                        { id: 'moves', label: 'Movimentos', icon: MoveHorizontal },
                        { id: 'audit', label: 'Balanço', icon: Scale },
                        { id: 'shopping-list', label: 'Compras', icon: ClipboardList },
                        { id: 'purchase-orders', label: 'O.C', icon: ListOrdered }
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
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                                                    <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-base">
                                                        {activeTab === 'inventory' ? 'Produtos p/ Venda' : 
                                                         activeTab === 'recipes' ? 'Fichas Técnicas' :
                                                         activeTab === 'ingredients' ? 'Banco de Insumos' : 
                                                         activeTab === 'groups' ? 'Hierarquia de Grupos' :
                                                         activeTab === 'purchases' ? 'Histórico de Entradas' : 
                                                         activeTab === 'production' ? 'Registro de Produção' :
                                                         activeTab === 'losses' ? 'Registro de Perdas' : 
                                                         activeTab === 'history' ? 'Posição Histórica' :
                                                         activeTab === 'moves' ? 'Movimentações de Estoque' :
                                                         activeTab === 'purchase-orders' ? 'Ordens de Compra' :
                                                         'Lista de Reposição'}
                                                    </h3>                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão avançada de insumos e custos</p>
                        </div>
                        <Button size="sm" className="px-6 rounded-xl italic shadow-lg shadow-orange-100" onClick={() => { 
                            setFormData({});
                            if (activeTab === 'groups') {
                                setShowGroupModal(true);
                            } else if (activeTab === 'recipes') {
                                toast.info("Selecione um produto na lista abaixo para editar sua Ficha Técnica.");
                            } else if (activeTab === 'purchases') {
                                setShowPurchaseModal(true);
                            } else if (activeTab === 'production') {
                                setShowProduceModal(true);
                            } else if (activeTab === 'losses') {
                                setShowLossModal(true);
                            } else {
                                setFormData({ controlStock: true, controlCmv: true });
                                setShowForm(true);
                            }
                        }}>
                            <Plus size={16} /> NOVO REGISTRO
                        </Button>
                    </div>

                    {activeTab === 'ingredients' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input type="text" placeholder="Buscar descrição..." className="ui-input pl-9 h-10 text-[10px] font-black uppercase w-full" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                            </div>
                            <select className="ui-input h-10 text-[10px] font-black uppercase" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                                <option value="all">Todos os Grupos</option>
                                {/* Mapear grupos reais aqui */}
                            </select>
                            <select className="ui-input h-10 text-[10px] font-black uppercase" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
                                <option value="all">Todos os Fornecedores</option>
                            </select>
                            <select className="ui-input h-10 text-[10px] font-black uppercase" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="all">Todos os Status</option>
                                <option value="low">Estoque Baixo</option>
                                <option value="critical">Crítico</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-orange-500" size={32} /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Banco de Dados...</span></div>
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
                                    ) : activeTab === 'recipes' ? (
                                        <>
                                            <th className="px-8 py-4">Ficha Técnica</th>
                                            <th className="px-8 py-4">Grupo</th>
                                            <th className="px-8 py-4 text-center">Estoque Atual</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'ingredients' ? (
                                        <>
                                            <th className="px-6 py-4">Ingrediente</th>
                                            <th className="px-6 py-4">Und. Consumo</th>
                                            <th className="px-6 py-4">Grupo</th>
                                            <th className="px-6 py-4 text-center">Mínimo</th>
                                            <th className="px-6 py-4 text-center">Estoque</th>
                                            <th className="px-6 py-4 text-center">Custo Médio</th>
                                            <th className="px-6 py-4 text-center">Estoque?</th>
                                            <th className="px-6 py-4 text-center">CMV?</th>
                                            <th className="px-6 py-4 text-center">Benef.</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'groups' ? (
                                        <>
                                            <th className="px-8 py-4">Estrutura de Grupos</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'production' ? (
                                        <>
                                            <th className="px-8 py-4">Insumo Produzido</th>
                                            <th className="px-8 py-4 text-center">Data/Hora</th>
                                            <th className="px-8 py-4 text-center">Quantidade</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'history' || activeTab === 'moves' ? (
                                        <>
                                            <th className="px-8 py-4">Data/Hora</th>
                                            <th className="px-8 py-4">Tipo / Operação</th>
                                            <th className="px-8 py-4">Item</th>
                                            <th className="px-8 py-4 text-center">Qtd</th>
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

                                {activeTab === 'recipes' && (
                                    <>
                                        {/* Título de Seção: Produtos Finais */}
                                        <tr className="bg-slate-100/50">
                                            <td colSpan={4} className="px-8 py-2 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Produtos p/ Venda (Cardápio)</td>
                                        </tr>
                                        {products.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-3">
                                                    <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{p.name}</p>
                                                </td>
                                                <td className="px-8 py-3 font-bold text-[10px] text-slate-400 uppercase">
                                                    {p.category?.name || '---'}
                                                </td>
                                                <td className="px-8 py-3 text-center font-black text-sm italic tracking-tighter text-slate-600">
                                                    {p.stock || '---'}
                                                </td>
                                                <td className="px-8 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-600" onClick={() => handleOpenRecipe(p)}><Hammer size={14}/></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {/* Título de Seção: Insumos Beneficiados */}
                                        <tr className="bg-slate-100/50">
                                            <td colSpan={4} className="px-8 py-2 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mt-4">Insumos Beneficiados (Produção Interna)</td>
                                        </tr>
                                        {ingredients.filter(i => i.isProduced).map((i: any) => (
                                            <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-3">
                                                    <p className="font-black text-xs text-purple-900 uppercase italic tracking-tight">{i.name}</p>
                                                </td>
                                                <td className="px-8 py-3 font-bold text-[10px] text-slate-400 uppercase">
                                                    {i.group?.name || '---'}
                                                </td>
                                                <td className="px-8 py-3 text-center font-black text-sm italic tracking-tighter text-slate-600">
                                                    {i.stock.toFixed(2)} {i.unit}
                                                </td>
                                                <td className="px-8 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-purple-600" onClick={() => handleOpenRecipe(i)}><Hammer size={14}/></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {activeTab === 'ingredients' && ingredients.filter(i => i.name.toLowerCase().includes(stockSearch.toLowerCase())).map((i: any) => (
                                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{i.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {i.unit === 'kg' ? 'Quilograma (KG)' : i.unit === 'gr' ? 'Grama (GR)' : i.unit === 'lt' ? 'Litro (LT)' : i.unit === 'ml' ? 'Mililitro (ML)' : 'Unidade (UN)'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{i.group?.name || '---'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-xs text-slate-400">
                                            {i.minStock?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("font-black text-sm italic tracking-tighter", i.stock <= (i.minStock || 0) ? "text-rose-600" : "text-slate-900")}>{i.stock.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-xs text-slate-900 italic">
                                            R$ {i.averageCost?.toFixed(2) || '0,00'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={cn("w-4 h-4 mx-auto rounded border-2 flex items-center justify-center transition-all", i.controlStock ? "bg-orange-500 border-orange-500" : "border-slate-200")}>
                                                {i.controlStock && <CheckCircle size={10} className="text-white" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={cn("w-4 h-4 mx-auto rounded border-2 flex items-center justify-center transition-all", i.controlCmv ? "bg-orange-500 border-orange-500" : "border-slate-200")}>
                                                {i.controlCmv && <CheckCircle size={10} className="text-white" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={cn("w-4 h-4 mx-auto rounded border-2 flex items-center justify-center transition-all", i.isProduced ? "bg-purple-500 border-purple-500" : "border-slate-200")}>
                                                {i.isProduced && <CheckCircle size={10} className="text-white" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-orange-50 hover:text-orange-600" onClick={() => { setShowForm(true); setFormData(i); }}><Hammer size={14}/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14}/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'groups' && ingredientGroups.filter(g => !g.parentId).map((group: any) => (
                                    <React.Fragment key={group.id}>
                                        <tr className="hover:bg-slate-50/80 transition-colors group bg-slate-50/30">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Folder className="text-orange-500" size={18} />
                                                    <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{group.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm hover:text-orange-600" onClick={() => { setFormData({ parentId: group.id }); setShowGroupModal(true); }}><Plus size={14}/></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm hover:text-slate-600" onClick={() => { setFormData(group); setShowGroupModal(true); }}><Hammer size={14}/></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white shadow-sm hover:text-rose-600"><Trash2 size={14}/></Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {ingredientGroups.filter(sub => sub.parentId === group.id).map((sub: any) => (
                                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group border-l-4 border-orange-100">
                                                <td className="px-16 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <ChevronRight size={14} className="text-slate-300" />
                                                        <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{sub.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-3 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-slate-50 hover:text-slate-600" onClick={() => { setFormData(sub); setShowGroupModal(true); }}><Hammer size={12}/></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-slate-50 hover:text-rose-600"><Trash2 size={12}/></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}

                                {activeTab === 'production' && productionHistory.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{log.ingredient?.name}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-[10px] text-slate-400 uppercase">
                                            {format(new Date(log.producedAt), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-8 py-5 text-center font-black text-sm text-slate-900 italic tracking-tighter">
                                            {log.quantity} {log.ingredient?.unit}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-rose-600">Estornar</Button>
                                        </td>
                                    </tr>
                                ))}

                                {(activeTab === 'history' || activeTab === 'moves') && [
                                    ...purchases.flatMap(p => p.items.map((item: any) => ({ date: p.receivedAt, type: 'ENTRADA', item: item.ingredient?.name, qty: item.quantity, color: 'text-emerald-600' }))),
                                    ...productionHistory.map((log: any) => ({ date: log.producedAt, type: 'PRODUÇÃO', item: log.ingredient?.name, qty: log.quantity, color: 'text-purple-600' })),
                                    ...losses.map((loss: any) => ({ date: loss.lossDate, type: 'PERDA', item: loss.ingredient?.name, qty: -loss.quantity, color: 'text-rose-600' }))
                                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((move: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">
                                            {format(new Date(move.date), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", move.color.replace('text', 'bg').replace('600', '50'), move.color.replace('text', 'border').replace('600', '100'), move.color)}>
                                                {move.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-xs text-slate-900 uppercase italic tracking-tight">
                                            {move.item}
                                        </td>
                                        <td className="px-8 py-5 text-center font-black text-sm italic tracking-tighter">
                                            {move.qty > 0 ? `+${move.qty}` : move.qty}
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'purchases' && purchases.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-[10px] text-slate-400 uppercase">{format(new Date(p.receivedAt), 'dd/MM/yyyy HH:mm')}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">NF: {p.invoiceNumber || 'S/N'}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.supplier?.name || 'Fornecedor Avulso'}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="font-black text-sm text-slate-900 italic tracking-tighter">R$ {p.totalAmount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {p.status === 'PENDING' ? (
                                                <Button onClick={() => handleConfirmPurchase(p.id)} className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">Confirmar</Button>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center justify-end gap-1"><CheckCircle size={12}/> Recebido</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'losses' && losses.map((l: any) => (
                                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-[10px] text-slate-400 uppercase">{format(new Date(l.lossDate), 'dd/MM/yyyy HH:mm')}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{l.ingredient?.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l.reason}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center font-black text-sm text-rose-600 italic tracking-tighter">
                                            -{l.quantity} {l.ingredient?.unit}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ver Detalhes</Button>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'audit' && ingredients.map((i: any) => (
                                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{i.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo Atual: {i.stock} {i.unit}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center" colSpan={2}>
                                            <div className="flex items-center justify-center gap-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Físico:</span>
                                                <input 
                                                    type="number" 
                                                    className="w-24 h-10 ui-input text-center font-black"
                                                    value={auditItems[i.id] ?? i.stock}
                                                    onChange={e => setAuditItems({...auditItems, [i.id]: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {auditItems[i.id] !== i.stock && (
                                                <span className={cn("text-[10px] font-black uppercase italic", (auditItems[i.id] - i.stock) > 0 ? "text-emerald-600" : "text-rose-600")}>
                                                    Dif: {(auditItems[i.id] - i.stock).toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'shopping-list' && ingredients.filter(i => i.stock <= (i.minStock || 0)).map((i: any) => (
                                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{i.name}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <p className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg inline-block border border-rose-100 uppercase tracking-widest">Abaixo do Mínimo</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo: {i.stock} / Mín: {i.minStock}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Button className="text-[10px] font-black uppercase tracking-widest h-10 px-6">Comprar</Button>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'purchase-orders' && (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <ListOrdered size={48} />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Módulo de Ordens de Compra em breve</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase max-w-xs mx-auto">Esta funcionalidade está sendo integrada ao módulo financeiro para automação de pedidos aos fornecedores.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* MODAIS INDUSTRIAIS (SIDE PANELS) */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[200] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col h-screen border-l border-slate-100">
                            <header className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">
                                        {formData.id ? 'Editar' : 'Novo'} Insumo / Matéria-Prima
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cadastro técnico de inventário</p>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white border border-slate-100" onClick={() => setShowForm(false)}><X size={20}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <div className="space-y-4">
                                    <Input label="Nome Técnico do Insumo" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: FILÉ DE FRANGO LIMPO" />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Unidade de Consumo</label>
                                            <select className="ui-input w-full h-11 text-[11px] font-bold uppercase" required value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                <option value="un">Unidade (UN)</option>
                                                <option value="kg">Quilograma (KG)</option>
                                                <option value="gr">Grama (GR)</option>
                                                <option value="lt">Litro (LT)</option>
                                                <option value="ml">Mililitro (ML)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Grupo / Família</label>
                                            <select className="ui-input w-full h-11 text-[11px] font-bold uppercase" value={formData.groupId || ''} onChange={e => setFormData({...formData, groupId: e.target.value})}>
                                                <option value="">Sem Grupo</option>
                                                {ingredientGroups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Estoque de Segurança (Mín)" type="number" step="0.001" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                                        <Input label="Saldo Inicial" type="number" step="0.001" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: e.target.value})} disabled={!!formData.id} />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">Controle e Flags</p>
                                    
                                    <div className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group" onClick={() => setFormData({...formData, controlStock: !formData.controlStock})}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Habilitar Controle de Estoque</span>
                                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", formData.controlStock ? "bg-orange-500 border-orange-500" : "border-slate-300")}>
                                            {formData.controlStock && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group" onClick={() => setFormData({...formData, controlCmv: !formData.controlCmv})}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Compor Cálculo de CMV Real</span>
                                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", formData.controlCmv ? "bg-orange-500 border-orange-500" : "border-slate-300")}>
                                            {formData.controlCmv && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group" onClick={() => setFormData({...formData, isProduced: !formData.isProduced})}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Insumo Beneficiado / Produção</span>
                                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">Item produzido internamente via Ficha Técnica</p>
                                        </div>
                                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", formData.isProduced ? "bg-purple-500 border-purple-500" : "border-slate-300")}>
                                            {formData.isProduced && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </form>
                            <footer className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                                <Button type="button" variant="ghost" className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button onClick={handleSubmit} fullWidth className="flex-[2] h-12 rounded-xl shadow-lg italic font-black bg-slate-900 text-white hover:bg-orange-600 transition-all uppercase tracking-widest text-[11px]">
                                    {formData.id ? 'Salvar Alterações Técnicas' : 'Finalizar Cadastro de Insumo'}
                                </Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showRecipeModal && (
                    <div className="fixed inset-0 z-[200] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRecipeModal(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-4xl bg-white shadow-2xl overflow-hidden flex flex-col h-screen">
                            <header className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                        Ficha Técnica Operacional
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuração de composição e custos</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="rounded-full bg-white border border-slate-100" onClick={() => setShowRecipeModal(false)}><X size={20}/></Button>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Informações Básicas do Item */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-900 rounded-3xl text-white">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Principal</p>
                                        <h4 className="text-xl font-black italic uppercase tracking-tighter">{formData.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{formData.isProduced ? 'Insumo Beneficiado' : 'Produto de Venda'}</p>
                                    </div>
                                    <div className="flex flex-col justify-center border-l border-slate-800 pl-6">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Total (Estimado)</p>
                                        <p className="text-2xl font-black text-orange-500 italic tracking-tighter">R$ {totalRecipeCost.toFixed(2)}</p>
                                    </div>
                                    <div className="flex flex-col justify-center border-l border-slate-800 pl-6">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rendimento</p>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="w-20 h-8 bg-slate-800 border-none text-white font-black text-sm rounded-lg px-2" 
                                                value={yieldAmount}
                                                onChange={e => setYieldAmount(Number(e.target.value))}
                                            />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{formData.unit || 'UN'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Editor de Composição */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
                                            <Layers size={16} className="text-orange-500" /> Insumos da Receita
                                        </h4>
                                        <Button size="sm" onClick={addRecipeItem} className="h-8 text-[9px] font-black uppercase tracking-widest bg-orange-600">
                                            <Plus size={14} /> ADICIONAR INSUMO
                                        </Button>
                                    </div>

                                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-white">
                                                    <th className="px-6 py-3 w-[45%]">Insumo</th>
                                                    <th className="px-6 py-3 text-center">Und.</th>
                                                    <th className="px-6 py-3 text-center">Quantidade</th>
                                                    <th className="px-6 py-3 text-center">Custo Unit.</th>
                                                    <th className="px-6 py-3 text-right">Subtotal</th>
                                                    <th className="px-6 py-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {recipeItems.map((item, idx) => (
                                                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <select 
                                                                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-[10px] font-bold uppercase outline-none focus:border-orange-500"
                                                                value={item.componentIngredientId}
                                                                onChange={e => updateRecipeItem(idx, 'componentIngredientId', e.target.value)}
                                                            >
                                                                <option value="">Selecionar Insumo...</option>
                                                                {ingredients.map(ing => (
                                                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">
                                                            {ingredients.find(i => i.id === item.componentIngredientId)?.unit || '---'}
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input 
                                                                type="number" step="0.001"
                                                                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2 text-center text-[11px] font-black outline-none focus:border-orange-500"
                                                                value={item.quantity}
                                                                onChange={e => updateRecipeItem(idx, 'quantity', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3 text-center font-black text-[10px] text-slate-500 italic">
                                                            R$ {item.unitCost?.toFixed(2)}
                                                        </td>
                                                        <td className="px-2 py-3 text-right font-black text-[11px] text-slate-900 italic">
                                                            R$ {(Number(item.quantity) * (item.unitCost || 0)).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => removeRecipeItem(idx)}><Trash2 size={14}/></Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {recipeItems.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum ingrediente adicionado à receita.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <footer className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <div className="flex flex-col">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Custo Final da Unidade</p>
                                    <p className="text-sm font-black text-slate-900 italic tracking-tighter">R$ {(totalRecipeCost / (yieldAmount || 1)).toFixed(2)}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" className="rounded-xl h-11 px-6 font-black uppercase text-[10px] tracking-widest italic" onClick={() => setShowRecipeModal(false)}>Descartar</Button>
                                    <Button onClick={handleSaveRecipe} disabled={loading} className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest italic bg-slate-900 text-white shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SALVAR FICHA TÉCNICA
                                    </Button>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGroupModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGroupModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                            <header className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                                    {formData.id ? 'Editar' : 'Novo'} Grupo
                                </h3>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white" onClick={() => setShowGroupModal(false)}><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                <Input label="Nome do Grupo" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: Proteínas" />
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Grupo Pai (Opcional)</label>
                                    <select className="ui-input w-full h-12" value={formData.parentId || ''} onChange={e => setFormData({...formData, parentId: e.target.value})}>
                                        <option value="">Nenhum (Grupo Raiz)</option>
                                        {ingredientGroups.filter(g => !g.parentId).map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-slate-400 italic">Deixe vazio para criar um grupo principal (HORTIFRUTI).</p>
                                </div>
                                <div className="pt-6 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowGroupModal(false)}>Cancelar</Button>
                                    <Button type="submit" fullWidth className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black bg-slate-900 text-white">SALVAR GRUPO</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showProduceModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProduceModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                            <header className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Registrar Produção</h3>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white" onClick={() => setShowProduceModal(false)}><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Item Produzido</label>
                                    <select className="ui-input w-full h-12" required value={formData.ingredientId || ''} onChange={e => setFormData({...formData, ingredientId: e.target.value})}>
                                        <option value="">Selecione um insumo beneficiado</option>
                                        {ingredients.filter(i => i.isProduced).map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input label="Quantidade Produzida" type="number" step="0.001" required value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
                                <div className="pt-6 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowProduceModal(false)}>Cancelar</Button>
                                    <Button type="submit" fullWidth className="flex-[2] h-14 rounded-2xl shadow-xl italic font-black bg-purple-600 text-white hover:bg-purple-700">CONFIRMAR PRODUÇÃO</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLossModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLossModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                            <header className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Registrar Perda</h3>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white" onClick={() => setShowLossModal(false)}><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Insumo</label>
                                    <select className="ui-input w-full h-12" required value={formData.ingredientId || ''} onChange={e => setFormData({...formData, ingredientId: e.target.value})}>
                                        <option value="">Selecione o insumo</option>
                                        {ingredients.map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <Input label="Qtd. Perdida" type="number" step="0.001" required value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Motivo</label>
                                        <select className="ui-input w-full h-12" required value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            <option value="EXPIRED">Vencimento</option>
                                            <option value="BROKEN">Avaria / Quebra</option>
                                            <option value="PRODUCTION_ERROR">Erro de Produção</option>
                                            <option value="THEFT">Furto / Roubo</option>
                                            <option value="OTHER">Outros</option>
                                        </select>
                                    </div>
                                </div>
                                <Input label="Observações" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                                <div className="pt-6 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowLossModal(false)}>Cancelar</Button>
                                    <Button type="submit" fullWidth className="flex-[2] h-14 rounded-2xl shadow-xl italic font-black bg-rose-600 text-white hover:bg-rose-700">REGISTRAR PERDA</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPurchaseModal && (
                    <div className="fixed inset-0 z-[200] flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPurchaseModal(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-5xl bg-white shadow-2xl overflow-hidden flex flex-col h-screen border-l border-slate-100">
                            <header className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                        Entrada de Mercadoria / NF
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lançamento de compras e atualização de custos</p>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white border border-slate-100" onClick={() => setShowPurchaseModal(false)}><X size={20}/></Button>
                            </header>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <Input label="Número da Nota" value={formData.invoiceNumber || ''} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} placeholder="000.000.000" />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fornecedor</label>
                                        <select className="ui-input w-full h-11 text-[11px] font-bold uppercase" value={formData.supplierId || ''} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                                            <option value="">Selecione o fornecedor</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input label="Data Recebimento" type="datetime-local" value={formData.receivedAt || ''} onChange={e => setFormData({...formData, receivedAt: e.target.value})} />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Grade de Itens da Nota</h4>
                                        <Button type="button" variant="ghost" onClick={() => {
                                            const items = formData.items || [];
                                            setFormData({...formData, items: [...items, { ingredientId: '', quantity: 0, unitCost: 0 }]});
                                        }} className="h-8 text-orange-600 font-black uppercase text-[9px] tracking-widest gap-2 bg-orange-50 hover:bg-orange-100 rounded-lg">
                                            <Plus size={14} /> Adicionar Item
                                        </Button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {(formData.items || [{ ingredientId: '', quantity: 0, unitCost: 0, conversionFactor: 1 }]).map((item: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 bg-white p-3 rounded-xl border border-slate-100 items-end hover:border-orange-200 transition-all shadow-sm">
                                                <div className="col-span-4 space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Insumo</label>
                                                    <select className="ui-input w-full h-9 text-[10px] font-bold uppercase" required value={item.ingredientId} onChange={e => {
                                                        const newItems = [...(formData.items || [{ ingredientId: '', quantity: 0, unitCost: 0, conversionFactor: 1 }])];
                                                        newItems[idx].ingredientId = e.target.value;
                                                        setFormData({...formData, items: newItems});
                                                    }}>
                                                        <option value="">Buscar insumo...</option>
                                                        {ingredients.map(ing => (
                                                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Qtd Comprada</label>
                                                    <input type="number" step="0.001" className="ui-input w-full h-9 text-[11px] font-black text-center" required value={item.quantity} onChange={e => {
                                                        const newItems = [...(formData.items || [])];
                                                        newItems[idx].quantity = parseFloat(e.target.value);
                                                        setFormData({...formData, items: newItems});
                                                    }} />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-orange-400 ml-1">Fator Conv.</label>
                                                    <input type="number" step="0.001" className="ui-input w-full h-9 text-[11px] font-black text-center border-orange-100" required value={item.conversionFactor || 1} onChange={e => {
                                                        const newItems = [...(formData.items || [])];
                                                        newItems[idx].conversionFactor = parseFloat(e.target.value);
                                                        setFormData({...formData, items: newItems});
                                                    }} />
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Custo Unitário R$</label>
                                                    <input type="number" step="0.01" className="ui-input w-full h-9 text-[11px] font-black text-center text-emerald-600" required value={item.unitCost} onChange={e => {
                                                        const newItems = [...(formData.items || [])];
                                                        newItems[idx].unitCost = parseFloat(e.target.value);
                                                        setFormData({...formData, items: newItems});
                                                    }} />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg" onClick={() => {
                                                        const newItems = formData.items.filter((_: any, i: number) => i !== idx);
                                                        setFormData({...formData, items: newItems});
                                                    }}><Trash2 size={16}/></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                            <footer className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <div className="flex flex-col">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor Total da Nota</p>
                                    <p className="text-xl font-black text-slate-900 italic tracking-tighter">R$ {(formData.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.unitCost), 0).toFixed(2)}</p>
                                </div>
                                <div className="flex gap-4">
                                    <Button type="button" variant="ghost" className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest italic" onClick={() => setShowPurchaseModal(false)}>Cancelar</Button>
                                    <Button onClick={handleSubmit} fullWidth className="h-12 px-10 rounded-xl shadow-xl italic font-black bg-emerald-600 text-white hover:bg-emerald-700 uppercase tracking-widest text-[11px]">
                                        CONFIRMAR RECEBIMENTO TÉCNICO
                                    </Button>
                                </div>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StockManagement;