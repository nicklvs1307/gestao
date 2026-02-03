import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ChefHat, Clock, CheckCircle2, RefreshCw, 
    Filter, LayoutGrid, List, Utensils, 
    AlertCircle, Timer, User, MapPin, Beer, Pizza as PizzaIcon, Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const KdsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pega a área da URL (ex: /kds?area=Bar). Se não tiver, usa 'Cozinha'
    const area = searchParams.get('area') || 'Cozinha';
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const loadKds = async () => {
        try {
            const res = await api.get(`/kds/items?area=${area === 'Geral' ? '' : area}`);
            setItems(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKds();
        const interval = setInterval(loadKds, 15000);
        return () => clearInterval(interval);
    }, [area]);

    const changeArea = (newArea: string) => {
        setSearchParams({ area: newArea });
    };

    const getWaitTime = (createdAt: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
        return diff;
    };

    const handleFinishItem = async (itemId: string) => {
        try {
            await api.put(`/admin/orders/kds/items/${itemId}/finish`);
            toast.success('Item finalizado!');
            
            setItems(prev => {
                const newOrders = prev.map(order => ({
                    ...order,
                    items: order.items.filter((item: any) => item.id !== itemId)
                })).filter(order => order.items.length > 0);
                return newOrders;
            });
        } catch (error) {
            toast.error('Erro ao finalizar item.');
        }
    };

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Header KDS */}
            <div className="h-20 bg-slate-900 border-b border-white/5 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                        <ChefHat size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic leading-none">Monitor de Produção</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema Online</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-800 p-1 rounded-xl">
                        {[
                            { id: 'Cozinha', icon: ChefHat },
                            { id: 'Bar', icon: Beer },
                            { id: 'Pizzaria', icon: PizzaIcon },
                            { id: 'Geral', icon: List }
                        ].map(a => (
                            <button 
                                key={a.id}
                                onClick={() => changeArea(a.id)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    area === a.id ? "bg-orange-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <a.icon size={14} />
                                {a.id}
                            </button>
                        ))}
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <button onClick={loadKds} className="p-3 hover:bg-white/5 rounded-xl transition-all text-slate-400">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading && items.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <RefreshCw size={48} className="animate-spin text-slate-700" />
                    </div>
                ) : items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {items.map((order) => {
                            const waitTime = getWaitTime(order.createdAt);
                            const isUrgent = waitTime > 20;
                            const isWarning = waitTime > 10;
                            
                            return (
                                <div key={order.id} className={cn(
                                    "bg-slate-900 border-2 rounded-[2.5rem] overflow-hidden flex flex-col transition-all active:scale-[0.98] h-fit relative",
                                    isUrgent ? "border-red-500 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)] animate-pulse-subtle" : 
                                    isWarning ? "border-orange-500 shadow-[0_0_30px_-5px_rgba(249,115,22,0.2)]" : 
                                    "border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]"
                                )}>
                                    {/* Barra de Progresso de Tempo */}
                                    <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-800">
                                        <div 
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                isUrgent ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-emerald-500"
                                            )} 
                                            style={{ width: `${Math.min((waitTime / 30) * 100, 100)}%` }} 
                                        />
                                    </div>

                                    {/* Card Header */}
                                    <div className={cn(
                                        "p-6 flex justify-between items-start shrink-0 pt-8",
                                        isUrgent ? "bg-red-500/10" : isWarning ? "bg-orange-500/10" : "bg-emerald-500/5"
                                    )}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    isUrgent ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-emerald-500"
                                                )} />
                                                <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                                                    {order.orderType === 'DELIVERY' ? 'ENTREGA FLASH' : `MESA ${order.tableNumber}`}
                                                </p>
                                            </div>
                                            <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-none text-white">
                                                #{order.dailyOrderNumber} <span className="text-slate-500 mx-1">•</span> {order.customerName?.split(' ')[0] || 'CLIENTE'}
                                            </h4>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black uppercase",
                                            isUrgent ? "bg-red-500 text-white shadow-lg shadow-red-500/40" : 
                                            isWarning ? "bg-orange-500 text-white" : 
                                            "bg-slate-800 text-emerald-400 border border-emerald-500/20"
                                        )}>
                                            <Timer size={16} /> {waitTime}m
                                        </div>
                                    </div>

                                    {/* Card Content - Itens */}
                                    <div className="flex-1 divide-y divide-white/5 bg-slate-900/50">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="p-6 group hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-start gap-5">
                                                    <div className="h-16 w-16 rounded-[1.25rem] bg-slate-950 border-2 border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-orange-500/50 transition-colors">
                                                        <span className="text-2xl font-black text-orange-500 tracking-tighter">{item.quantity}x</span>
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xl font-black uppercase leading-none mb-2 tracking-tight text-slate-100 group-hover:text-orange-400 transition-colors">
                                                            {item.product.name}
                                                        </p>
                                                        
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {item.sizeJson && (
                                                                <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5">
                                                                    {JSON.parse(item.sizeJson).name}
                                                                </span>
                                                            )}
                                                            {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, idx: number) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 rounded-md text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                                                                    {f.name}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {item.addonsJson && (
                                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                                {JSON.parse(item.addonsJson).map((a: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5">
                                                                        <Plus size={10} className="text-orange-500" />
                                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">{a.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {item.observations && (
                                                            <div className="mt-3 p-3 bg-blue-500/10 rounded-2xl border-l-4 border-blue-500">
                                                                <p className="text-xs font-bold text-blue-200 italic leading-relaxed">
                                                                    <AlertCircle size={12} className="inline mr-2 text-blue-400" />
                                                                    "{item.observations}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button 
                                                        onClick={() => handleFinishItem(item.id)}
                                                        className="h-14 w-14 rounded-[1.25rem] bg-slate-800 hover:bg-emerald-500 text-slate-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-white/5 hover:scale-110 hover:rotate-3 shadow-lg active:scale-90"
                                                    >
                                                        <CheckCircle2 size={28} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-6">
                        <div className="p-10 bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-800 flex items-center justify-center">
                            <ChefHat size={80} className="opacity-20" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-500">Tudo em ordem na praça: {area}</h3>
                            <p className="text-slate-600 font-medium">Novos itens aparecerão aqui automaticamente.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer / Stats */}
            <div className="h-14 bg-slate-900 border-t border-white/5 flex items-center justify-between px-8 shrink-0">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                        <span className="text-[10px] font-black text-slate-500 uppercase">Pedidos: {items.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] font-black text-red-500 uppercase">Atrasados: {items.filter(order => getWaitTime(order.createdAt) > 20).length}</span>
                    </div>
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">KDS v2.0 • Kicardapio</p>
            </div>
        </div>
    );
};

export default KdsPage;
