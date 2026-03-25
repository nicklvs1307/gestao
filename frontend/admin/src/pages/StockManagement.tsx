import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    api, 
    getIngredients, 
    getProductionHistory, 
    getStockLosses
} from '../services/api';
import { 
    Package, AlertTriangle, Plus, Disc, ShoppingCart, 
    Search, ArrowDownCircle, CheckCircle, 
    X, Hammer, History, ClipboardList, Info, ArrowRight, Scale, Save, Loader2, TrendingDown,
    Layers, ListOrdered, FileText, Settings, Archive
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Sub-componentes
import IngredientsView from '../components/stock/IngredientsView';
import ProductionView from '../components/stock/ProductionView';
import PurchasesView from '../components/stock/PurchasesView';
import AuditView from '../components/stock/AuditView';

const StockManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'inventory' | 'ingredients' | 'purchases' | 'production' | 'losses' | 'audit' | 'recipes'>('inventory');

    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/ingredients')) setActiveTab('ingredients');
        else if (path.includes('/stock/invoices')) setActiveTab('purchases');
        else if (path.includes('/stock/production')) setActiveTab('production');
        else if (path.includes('/stock/losses')) setActiveTab('losses');
        else if (path.includes('/stock/audit')) setActiveTab('audit');
        else if (path.includes('/stock/recipes')) setActiveTab('recipes');
        else setActiveTab('inventory');
    }, [location.pathname]);

    const [ingredients, setIngredients] = useState<any[]>([]);
    const [ingredientGroups, setIngredientGroups] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ingRes, groupRes, suppRes, recipeRes, stockRes] = await Promise.all([
                api.get('/ingredients'),
                api.get('/ingredients/groups'),
                api.get('/financial/suppliers'),
                api.get('/production/technical-sheets').catch(() => ({ data: [] })),
                api.get('/stock/entries').catch(() => ({ data: [] }))
            ]);
            setIngredients(ingRes.data);
            setIngredientGroups(groupRes.data);
            setSuppliers(suppRes.data);
            setRecipes(recipeRes.data || []);
            setPurchases(stockRes.data || []);
        } catch (error) { 
            console.error(error); 
            toast.error("Falha ao sincronizar estoque.");
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-30">
            <Loader2 className="animate-spin text-primary mb-4" size={32}/>
            <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Almoxarifado...</span>
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10 max-w-[1400px] mx-auto">
            {/* ENTERPRISE STICKY HEADER */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-40 py-4 border-b border-border px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Archive size={18}/></div>
                    <div>
                        <h1 className="text-lg font-black text-foreground tracking-tighter uppercase italic leading-none">Estoque & Insumos</h1>
                        <p className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest mt-1">Gestão de Almoxarifado e Produção</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="hidden lg:flex bg-muted p-0.5 rounded-lg gap-0.5">
                        {[
                            { id: 'inventory', label: 'Dashboard', icon: Layers },
                            { id: 'ingredients', label: 'Insumos', icon: Package },
                            { id: 'purchases', label: 'Compras', icon: ShoppingCart },
                            { id: 'production', label: 'Produção', icon: Hammer },
                            { id: 'audit', label: 'Balanço', icon: ClipboardList }
                        ].map((tab) => (
                            <button 
                                key={tab.id} 
                                onClick={() => navigate(tab.id === 'inventory' ? '/stock' : `/stock/${tab.id}`)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", 
                                    activeTab === tab.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50"
                                )}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <Button className="flex-1 md:flex-none px-6 h-10 rounded-xl shadow-lg italic font-black text-[10px] uppercase tracking-widest bg-primary text-white hover:brightness-90 transition-all">
                        <Plus size={14} className="mr-2" /> NOVA ENTRADA
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {activeTab === 'inventory' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-slate-900 text-white lg:col-span-2 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all" />
                            <div className="relative z-10">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Valor Total em Estoque</p>
                                <h2 className="text-3xl font-black italic tracking-tighter">
                                    R$ {(Array.isArray(ingredients) ? ingredients : []).reduce((acc, i) => acc + (i.stock * (i.averageCost || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h2>
                                <div className="mt-4 flex gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Insumos Ativos</span>
                                        <span className="text-sm font-black italic">{ingredients.length}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Fichas Técnicas</span>
                                        <span className="text-sm font-black italic">{ingredients.filter(i => i.isProduced).length}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 border-border flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase italic text-foreground">Itens em Falta</h3>
                                <AlertTriangle size={16} className="text-rose-500" />
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-black italic text-rose-600 leading-none">
                                    {ingredients.filter(i => i.stock <= (i.minStock || 0)).length}
                                </p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Abaixo do estoque mínimo</p>
                            </div>
                        </Card>

                        <Card className="p-4 border-border flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase italic text-foreground">Giro de Estoque</h3>
                                <TrendingDown size={16} className="text-blue-500" />
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-black italic text-blue-600 leading-none">Alta</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Consumo 12% maior que o mês ant.</p>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'ingredients' && (
                    <IngredientsView 
                        ingredients={ingredients} 
                        groups={ingredientGroups} 
                        onRefresh={loadData} 
                    />
                )}

                {activeTab === 'production' && (
                    <ProductionView 
                        ingredients={ingredients} 
                        recipes={recipes} 
                        onRefresh={loadData} 
                    />
                )}

                {activeTab === 'purchases' && (
                    <PurchasesView 
                        purchases={purchases} 
                        onRefresh={loadData} 
                    />
                )}

                {activeTab === 'audit' && (
                    <AuditView 
                        ingredients={ingredients} 
                        onRefresh={loadData} 
                    />
                )}


                {/* Outras abas seguirão o mesmo padrão... */}
            </div>
        </div>
    );
};

export default StockManagement;
