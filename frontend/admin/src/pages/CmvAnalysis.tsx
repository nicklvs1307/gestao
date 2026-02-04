import React, { useState, useEffect } from 'react';
import { getProducts, getIngredients } from '../services/api';
import { 
    Calculator, TrendingUp, AlertTriangle, ArrowRight, 
    Search, Filter, Percent, DollarSign, Package, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const CmvAnalysis: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Simulação
    const [simulatedPrices, setSimulatedPrices] = useState<Record<string, number>>({});
    const [simulatedCosts, setSimulatedCosts] = useState<Record<string, number>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodsData, ingData] = await Promise.all([
                getProducts(),
                getIngredients()
            ]);
            setProducts(prodsData);
            setIngredients(ingData);
        } catch (error) {
            toast.error("Erro ao carregar dados para análise");
        } finally {
            setLoading(false);
        }
    };

    const calculateProductCost = (product: any) => {
        if (!product.ingredients || product.ingredients.length === 0) return 0;
        
        return product.ingredients.reduce((acc: number, link: any) => {
            const ingredient = ingredients.find(i => i.id === link.ingredientId);
            if (!ingredient) return acc;
            
            // Usa custo simulado se houver, senão usa o real do banco
            const cost = simulatedCosts[ingredient.id] ?? (ingredient.lastUnitCost || 0);
            return acc + (cost * link.quantity);
        }, 0);
    };

    const getCMVColor = (cmv: number) => {
        if (cmv <= 25) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (cmv <= 35) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Analisando Fichas Técnicas...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                        <Calculator size={32} className="text-primary" /> Análise e Simulação de CMV
                    </h2>
                    <p className="text-slate-500 font-medium">Controle a margem de lucro real dos seus pratos baseada nos insumos.</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meta CMV</p>
                        <p className="text-xl font-black text-emerald-600 italic">25-30%</p>
                    </div>
                </div>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="relative group max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                    type="text" 
                    className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border-2 border-slate-100 focus:border-primary outline-none transition-all font-bold shadow-sm"
                    placeholder="Filtrar por produto ou categoria..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredProducts.map(product => {
                    const realCost = calculateProductCost(product);
                    const salePrice = simulatedPrices[product.id] ?? product.price;
                    const cmv = salePrice > 0 ? (realCost / salePrice) * 100 : 0;
                    const profit = salePrice - realCost;

                    return (
                        <div key={product.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary/20 transition-all group">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Informações Básicas */}
                                <div className="lg:w-1/3 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100">
                                            {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" alt="" /> : <Package size={32} className="m-auto mt-4 text-slate-200" />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase italic leading-none">{product.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{product.category?.name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo de Insumos</span>
                                            <span className="font-black text-slate-900 italic">R$ {realCost.toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Preço de Venda (Simular)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm focus:border-primary outline-none transition-all"
                                                    value={simulatedPrices[product.id] ?? product.price}
                                                    onChange={e => setSimulatedPrices({...simulatedPrices, [product.id]: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Análise de Performance */}
                                <div className="lg:w-1/3 flex flex-col justify-center items-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Margem de Contribuição</p>
                                        <p className={cn("text-4xl font-black italic tracking-tighter", profit > 0 ? "text-emerald-600" : "text-red-600")}>
                                            R$ {profit.toFixed(2)}
                                        </p>
                                    </div>

                                    <div className={cn("px-6 py-2 rounded-full border-2 font-black uppercase text-xs tracking-widest flex items-center gap-2", getCMVColor(cmv))}>
                                        <Percent size={14} /> CMV: {cmv.toFixed(1)}%
                                    </div>

                                    {cmv > 35 && (
                                        <div className="flex items-center gap-2 text-red-500 animate-bounce">
                                            <AlertTriangle size={16} />
                                            <span className="text-[9px] font-black uppercase">Custo Elevado</span>
                                        </div>
                                    )}
                                </div>

                                {/* Composição da Ficha Técnica */}
                                <div className="lg:w-1/3 space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Package size={14} /> Composição do Custo
                                    </h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                        {product.ingredients?.length > 0 ? product.ingredients.map((link: any) => {
                                            const ingredient = ingredients.find(i => i.id === link.ingredientId);
                                            const cost = simulatedCosts[ingredient?.id] ?? (ingredient?.lastUnitCost || 0);
                                            const total = cost * link.quantity;
                                            
                                            return (
                                                <div key={link.id} className="flex justify-between items-center text-[10px] p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-700 uppercase">{ingredient?.name}</span>
                                                        <span className="text-slate-400 font-bold">{link.quantity} {ingredient?.unit}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-900">R$ {total.toFixed(2)}</span>
                                                </div>
                                            );
                                        }) : (
                                            <div className="py-8 text-center text-slate-300">
                                                <Info size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-[10px] font-bold uppercase">Sem Ficha Técnica cadastrada</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CmvAnalysis;
