import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ChefHat, Clock, CheckCircle, RefreshCw, 
    List, AlertCircle, Timer, Beer, Pizza as PizzaIcon, Plus, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const KdsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Pega a área da URL (ex: /kds?area=Bar). Se não tiver, usa 'Cozinha'
    const area = searchParams.get('area') || 'Cozinha';

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
        <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden -m-8">
            {/* Header KDS - Design de Alto Contraste */}
            <div className="h-20 bg-[#111] border-b border-white/5 flex items-center justify-between px-10 shrink-0 z-20 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-orange-500 rounded-2xl shadow-xl shadow-orange-500/20">
                        <ChefHat size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-white">Monitor de Produção</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sistema Operacional Online</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-[#1a1a1a] p-1.5 rounded-2xl gap-1 shadow-inner border border-white/5">
                        {[
                            { id: 'Cozinha', icon: ChefHat, label: 'Cozinha' },
                            { id: 'Bar', icon: Beer, label: 'Bar / Copa' },
                            { id: 'Pizzaria', icon: PizzaIcon, label: 'Pizzaria' },
                            { id: 'Geral', icon: List, label: 'Todos' }
                        ].map(a => (
                            <button 
                                key={a.id}
                                onClick={() => changeArea(a.id)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    area === a.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.02]" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <a.icon size={14} />
                                {a.id}
                            </button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={loadKds} className="rounded-xl bg-white/5 hover:bg-white/10 text-slate-400">
                        <RefreshCw size={20} />
                    </Button>
                </div>
            </div>

            {/* Conteúdo KDS - Grid de Tickets */}
            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#050505]">
                {loading && items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                        <Loader2 size={48} className="animate-spin text-orange-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Carregando Pedidos...</span>
                    </div>
                ) : items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10 items-start">
                        {items.map((order) => {
                            const waitTime = getWaitTime(order.createdAt);
                            const isUrgent = waitTime > 20;
                            const isWarning = waitTime > 10;
                            
                            return (
                                <div key={order.id} className="animate-in fade-in zoom-in-95 duration-500">
                                    <Card className={cn(
                                        "bg-[#111] border-2 rounded-[2.5rem] overflow-hidden flex flex-col h-fit relative shadow-2xl",
                                        isUrgent ? "border-rose-600 shadow-rose-900/20" : 
                                        isWarning ? "border-orange-500 shadow-orange-900/20" : 
                                        "border-emerald-500/20 shadow-black"
                                    )} noPadding>
                                        
                                        {/* Barra de Progresso de Tempo no Topo */}
                                        <div className="absolute top-0 left-0 h-2 w-full bg-white/5">
                                            <div 
                                                className={cn(
                                                    "h-full transition-all duration-1000",
                                                    isUrgent ? "bg-rose-600" : isWarning ? "bg-orange-500" : "bg-emerald-500"
                                                )} 
                                                style={{ width: `${Math.min((waitTime / 30) * 100, 100)}%` }} 
                                            />
                                        </div>

                                        {/* Header do Ticket */}
                                        <div className={cn(
                                            "p-6 flex justify-between items-start shrink-0 pt-10",
                                            isUrgent ? "bg-rose-600/10" : isWarning ? "bg-orange-500/10" : "bg-emerald-500/5"
                                        )}>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        isUrgent ? "bg-rose-600 animate-pulse shadow-[0_0_10px_red]" : isWarning ? "bg-orange-500" : "bg-emerald-500"
                                                    )} />
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                        {order.orderType === 'DELIVERY' ? 'Entrega Flash' : `Mesa 0${order.tableNumber}`}
                                                    </p>
                                                </div>
                                                <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
                                                    #{order.dailyOrderNumber} <span className="text-slate-700 mx-1">•</span> {order.customerName?.split(' ')[0] || 'CLIENTE'}
                                                </h4>
                                            </div>
                                            <div className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black uppercase shadow-lg",
                                                isUrgent ? "bg-rose-600 text-white" : 
                                                isWarning ? "bg-orange-500 text-white" : 
                                                "bg-slate-800 text-emerald-400 border border-emerald-500/20"
                                            )}>
                                                <Timer size={18} /> {waitTime}m
                                            </div>
                                        </div>

                                        {/* Itens do Ticket */}
                                        <div className="flex-1 divide-y divide-white/5 bg-[#111]">
                                            {order.items.map((item: any) => (
                                                <div key={item.id} className="p-6 group hover:bg-white/[0.03] transition-colors">
                                                    <div className="flex items-start gap-6">
                                                        <div className="h-16 w-16 rounded-3xl bg-[#0a0a0a] border-2 border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-orange-500/30 transition-all">
                                                            <span className="text-2xl font-black text-orange-500 tracking-tighter italic">{item.quantity}</span>
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xl font-black uppercase leading-tight mb-2 tracking-tight text-white group-hover:text-orange-400 transition-colors italic">
                                                                {item.product.name}
                                                            </p>
                                                            
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {item.sizeJson && (
                                                                    <span className="px-2 py-1 bg-slate-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest border border-white/5">
                                                                        {JSON.parse(item.sizeJson).name}
                                                                    </span>
                                                                )}
                                                                {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, idx: number) => (
                                                                    <span key={idx} className="px-2 py-1 bg-emerald-500/10 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                                                                        {f.name}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            {item.addonsJson && (
                                                                <div className="flex flex-wrap gap-1.5 mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    {JSON.parse(item.addonsJson).map((a: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                                                                            <Plus size={10} className="text-orange-500" strokeWidth={4} />
                                                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{a.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {item.observations && (
                                                                <div className="mt-4 p-4 bg-orange-500/10 rounded-3xl border-l-4 border-orange-500 animate-pulse-subtle">
                                                                    <p className="text-xs font-black text-orange-200 italic leading-relaxed flex gap-2">
                                                                        <AlertCircle size={14} className="shrink-0 text-orange-500" />
                                                                        "{item.observations}"
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <Button 
                                                            variant="primary"
                                                            size="icon"
                                                            onClick={() => handleFinishItem(item.id)}
                                                            className="h-16 w-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/20 hover:scale-110 active:scale-90 transition-all border-none"
                                                        >
                                                            <CheckCircle size={32} strokeWidth={3} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-8">
                        <div className="p-16 bg-[#111] rounded-[4rem] border-2 border-dashed border-white/5 flex items-center justify-center">
                            <ChefHat size={120} className="opacity-10" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-700">Praça de {area} Limpa</h3>
                            <p className="text-slate-800 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Aguardando novos pedidos...</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer KDS */}
            <div className="h-16 bg-[#111] border-t border-white/5 flex items-center justify-between px-10 shrink-0 z-20">
                <div className="flex gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Total na Fila: {items.length}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shadow-[0_0_8px_red]" />
                        <span className="text-[11px] font-black text-rose-600 uppercase tracking-widest">Críticos (+20m): {items.filter(order => getWaitTime(order.createdAt) > 20).length}</span>
                    </div>
                </div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic">KDS MASTER • KICARDAPIO SYSTEM</p>
            </div>
        </div>
    );
};

export default KdsPage;