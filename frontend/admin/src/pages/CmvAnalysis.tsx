import React, { useState, useEffect } from 'react';
import { getProducts, getIngredients } from '../services/api';
import { 
    Calculator, AlertTriangle, Search, 
    Percent, DollarSign, Package, Info, RefreshCw, Loader2, TrendingUp, TrendingDown, Target, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const CmvAnalysis: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Simulação
    const [simulatedPrices, setSimulatedPrices] = useState<Record<string, number>>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [simulatedCosts, setSimulatedCosts] = useState<Record<string, number>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodsData, ingData] = await Promise.all([ getProducts(), getIngredients() ]);
            setProducts(prodsData);
            setIngredients(ingData);
        } catch (error) { toast.error("Erro ao carregar dados."); }
        finally { setLoading(false); }
    };

    const calculateProductCost = (product: any) => {
        if (!product.ingredients || product.ingredients.length === 0) return 0;
        return product.ingredients.reduce((acc: number, link: any) => {
            const ingredient = ingredients.find(i => i.id === link.ingredientId);
            if (!ingredient) return acc;
            const cost = simulatedCosts[ingredient.id] ?? (ingredient.lastUnitCost || 0);
            return acc + (cost * link.quantity);
        }, 0);
    };

    const getCMVStatus = (cmv: number) => {
        if (cmv <= 25) return { label: 'Ótimo', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle };
        if (cmv <= 35) return { label: 'Alerta', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: AlertTriangle };
        return { label: 'Crítico', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertTriangle };
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Auditando Fichas Técnicas...</span>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Inteligência de Custos</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Calculator size={14} className="text-orange-500" /> Análise de CMV e Lucratividade Real
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Card className="p-3 bg-white border-slate-100 flex items-center gap-4 shadow-sm">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-100"><Target size={18}/></div>
                        <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Target CMV</p><p className="text-sm font-black text-emerald-600 italic leading-none">25% - 30%</p></div>
                    </Card>
                    <Button variant="outline" size="icon" className="bg-white rounded-xl h-12 w-12" onClick={loadData}>
                        <RefreshCw size={18} />
                    </Button>
                </div>
            </div>

            {/* Busca e Filtro */}
            <div className="relative group max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                <input 
                    type="text" 
                    className="w-full h-16 pl-14 pr-6 rounded-[2rem] bg-white border-2 border-slate-100 focus:border-orange-500 outline-none transition-all font-black text-slate-900 uppercase italic tracking-tight shadow-xl shadow-slate-200/50"
                    placeholder="Filtrar cardápio para análise..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-8">
                {filteredProducts.map(product => {
                    const realCost = calculateProductCost(product);
                    const salePrice = simulatedPrices[product.id] ?? product.price;
                    const cmv = salePrice > 0 ? (realCost / salePrice) * 100 : 0;
                    const profit = salePrice - realCost;
                    const status = getCMVStatus(cmv);

                    return (
                        <Card key={product.id} className="p-0 overflow-hidden border-2 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl bg-white" noPadding>
                            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-50">
                                
                                {/* Info Produto */}
                                <div className="lg:w-1/3 p-8 space-y-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 overflow-hidden border-2 border-slate-100 shadow-inner group">
                                            {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" /> : <Package size={32} className="m-auto mt-6 text-slate-200" />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter leading-tight">{product.name}</h3>
                                            <span className="text-[9px] font-black text-white bg-slate-900 px-2 py-0.5 rounded uppercase tracking-widest mt-2 inline-block">{product.category?.name || 'Geral'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Insumos</span>
                                            <span className="font-black text-lg text-slate-900 italic tracking-tighter">R$ {realCost.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Preço de Venda (Simular)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-full h-14 pl-10 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg italic tracking-tighter focus:border-orange-500 outline-none transition-all text-slate-900"
                                                    value={simulatedPrices[product.id] ?? product.price}
                                                    onChange={e => setSimulatedPrices({...simulatedPrices, [product.id]: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Performance e Status */}
                                <div className="lg:w-1/3 p-8 flex flex-col justify-center items-center bg-slate-50/30 space-y-8">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Margem de Lucro</p>
                                        <h4 className={cn("text-5xl font-black italic tracking-tighter", profit > 0 ? "text-emerald-600" : "text-rose-600")}>
                                            R$ {profit.toFixed(2).replace('.', ',')}
                                        </h4>
                                    </div>

                                    <div className={cn("px-8 py-3 rounded-[1.5rem] border-2 font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-lg transition-all", status.color, "shadow-current/5")}>
                                        <Percent size={18} /> CMV: {cmv.toFixed(1)}% • {status.label}
                                    </div>

                                    {cmv > 35 && (
                                        <div className="flex items-center gap-2 text-rose-500 animate-pulse bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                                            <AlertTriangle size={16} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Atenção: Margem Baixa</span>
                                        </div>
                                    )}
                                </div>

                                {/* Ficha Técnica Detalhada */}
                                <div className="lg:w-1/3 p-8 space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-slate-100 pb-4 flex items-center gap-3 italic">
                                        <TrendingDown size={16} className="text-orange-500" /> Detalhamento do Custo
                                    </h4>
                                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                        {product.ingredients?.length > 0 ? product.ingredients.map((link: any) => {
                                            const ingredient = ingredients.find(i => i.id === link.ingredientId);
                                            const cost = simulatedCosts[ingredient?.id] ?? (ingredient?.lastUnitCost || 0);
                                            const total = cost * link.quantity;
                                            
                                            return (
                                                <div key={link.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 hover:border-orange-200 transition-all group/item shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-[10px] text-slate-700 uppercase italic leading-none group-hover/item:text-orange-600 transition-colors">{ingredient?.name}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">{link.quantity} {ingredient?.unit}</span>
                                                    </div>
                                                    <span className="font-black text-xs text-slate-900 italic tracking-tighter">R$ {total.toFixed(2)}</span>
                                                </div>
                                            );
                                        }) : (
                                            <div className="py-12 text-center opacity-20">
                                                <Info size={32} className="mx-auto mb-3" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Sem Ficha Técnica</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default CmvAnalysis;