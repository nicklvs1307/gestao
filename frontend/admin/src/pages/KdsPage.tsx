import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ChefHat, Clock, CheckCircle, RefreshCw, 
    List, AlertCircle, Timer, Beer, Pizza as PizzaIcon, Plus, Loader2, LogOut, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';

const KdsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
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
        const interval = setInterval(loadKds, 10000); // Mais rápido para KDS
        return () => clearInterval(interval);
    }, [area]);

    const changeArea = (newArea: string) => {
        setSearchParams({ area: newArea });
    };

    const getWaitTime = (createdAt: string) => {
        return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    };

    const handleFinishItem = async (itemId: string) => {
        try {
            await api.put(`/admin/orders/kds/items/${itemId}/finish`);
            toast.success('Item pronto!');
            
            // Remove localmente para resposta instantânea
            setItems(prev => {
                return prev.map(order => ({
                    ...order,
                    items: order.items.filter((item: any) => item.id !== itemId)
                })).filter(order => order.items.length > 0);
            });
        } catch (error) {
            toast.error('Erro ao finalizar item.');
        }
    };

    return (
        <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
            {/* Header Superior - Ultra Moderno */}
            <div className="h-16 bg-[#0a0a0a] border-b border-white/[0.05] flex items-center justify-between px-6 shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                        <ChefHat size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight italic leading-none text-white">KDS Central</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Live Monitoring</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <nav className="flex bg-white/[0.03] p-1 rounded-xl gap-1 border border-white/[0.05]">
                        {[
                            { id: 'Cozinha', icon: ChefHat, label: 'Cozinha' },
                            { id: 'Bar', icon: Beer, label: 'Copa' },
                            { id: 'Pizzaria', icon: PizzaIcon, label: 'Pizza' },
                            { id: 'Geral', icon: List, label: 'Geral' }
                        ].map(a => (
                            <button 
                                key={a.id}
                                onClick={() => changeArea(a.id)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                    area === a.id ? "bg-orange-600 text-white shadow-md shadow-orange-900/20" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <a.icon size={12} />
                                {a.id}
                            </button>
                        ))}
                    </nav>
                    
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Principal de Pedidos */}
            <main className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar items-start bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black">
                {loading && items.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center opacity-30 gap-4">
                        <Loader2 size={40} className="animate-spin text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Conectando à Cozinha...</span>
                    </div>
                ) : items.length > 0 ? (
                    items.map((order) => {
                        const waitTime = getWaitTime(order.createdAt);
                        const isUrgent = waitTime > 15;
                        const isCritical = waitTime > 25;
                        
                        return (
                            <div key={order.id} className="w-[320px] shrink-0 flex flex-col animate-in slide-in-from-right-10 duration-500">
                                <div className={cn(
                                    "rounded-[2rem] overflow-hidden flex flex-col border-2 transition-all duration-500 shadow-2xl",
                                    isCritical ? "border-rose-600 bg-rose-950/10 shadow-rose-900/20" : 
                                    isUrgent ? "border-orange-500 bg-orange-950/10 shadow-orange-900/10" : 
                                    "border-emerald-500/20 bg-[#0c0c0c]"
                                )}>
                                    
                                    {/* Header do Ticket */}
                                    <div className={cn(
                                        "p-5 border-b flex justify-between items-start relative",
                                        isCritical ? "border-rose-900/50" : isUrgent ? "border-orange-900/50" : "border-white/5"
                                    )}>
                                        <div className="z-10">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    isCritical ? "bg-rose-500 animate-pulse" : isUrgent ? "bg-orange-500" : "bg-emerald-500"
                                                )} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    {order.orderType === 'DELIVERY' ? (
                                                        order.deliveryOrder?.deliveryType === 'pickup' ? (
                                                            <><ShoppingBag size={10} className="text-blue-400" /> RETIRADA</>
                                                        ) : (
                                                            <><Bike size={10} className="text-orange-400" /> ENTREGA</>
                                                        )
                                                    ) : (
                                                        <><Utensils size={10} /> MESA ${order.tableNumber}</>
                                                    )}
                                                </span>
                                            </div>
                                            <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-none text-white">
                                                #{order.dailyOrderNumber} <span className="text-white/10 mx-0.5">•</span> <span className="text-orange-500">{order.customerName?.split(' ')[0] || 'BOX'}</span>
                                            </h4>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-inner",
                                            isCritical ? "bg-rose-600 text-white" : isUrgent ? "bg-orange-500 text-white" : "bg-white/5 text-emerald-400"
                                        )}>
                                            <Timer size={14} /> {waitTime}M
                                        </div>
                                    </div>

                                    {/* Lista de Itens */}
                                    <div className="p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-350px)] custom-scrollbar">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.03] group hover:bg-white/[0.05] transition-all relative overflow-hidden">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0">
                                                        <span className="text-xl font-black text-white">{item.quantity}</span>
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-black uppercase leading-tight tracking-tight text-white group-hover:text-orange-500 transition-colors">
                                                            {item.product.name}
                                                        </p>
                                                        
                                                        {/* Opções e Tamanhos */}
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {item.sizeJson && (
                                                                <span className="text-[8px] font-black bg-white/10 text-slate-400 px-2 py-0.5 rounded-md uppercase tracking-wider">{JSON.parse(item.sizeJson).name}</span>
                                                            )}
                                                            {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, idx: number) => (
                                                                <span key={idx} className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md uppercase">{f.name}</span>
                                                            ))}
                                                        </div>

                                                        {/* Adicionais - Agora mais compactos */}
                                                        {item.addonsJson && (
                                                            <div className="mt-3 flex flex-wrap gap-1">
                                                                {JSON.parse(item.addonsJson).map((a: any, idx: number) => (
                                                                    <div key={idx} className="bg-emerald-500/10 text-emerald-500 text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-500/20">
                                                                        <Plus size={8} /> {a.quantity > 1 ? `${a.quantity}x ` : ''}{a.name}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Observações com destaque */}
                                                        {item.observations && (
                                                            <div className="mt-4 p-3 bg-orange-500/10 border-l-2 border-orange-500 rounded-lg">
                                                                <p className="text-[10px] font-bold text-orange-200 leading-tight flex gap-2 italic">
                                                                    <AlertCircle size={12} className="shrink-0 text-orange-500" />
                                                                    {item.observations}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Botão de Finalizar Item - Estilo Overlay Moderno */}
                                                <button 
                                                    onClick={() => handleFinishItem(item.id)}
                                                    className="mt-3 w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                                                >
                                                    <CheckCircle size={16} /> Marcar como Pronto
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Tempo Total de Pedido (Criado em) */}
                                    <div className="p-4 bg-white/[0.01] border-t border-white/5 flex justify-center">
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Criado às {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full flex flex-col items-center justify-center text-slate-800 gap-8 h-full">
                        <div className="w-24 h-24 bg-white/[0.02] rounded-[2rem] flex items-center justify-center border border-white/5">
                            <ChefHat size={48} className="text-slate-900" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Cozinha Limpa</h3>
                            <p className="text-slate-900 font-bold uppercase text-[9px] tracking-[0.3em] mt-2">Nenhum pedido em produção para {area}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Barra Inferior - Stats */}
            <footer className="h-14 bg-[#0a0a0a] border-t border-white/[0.05] flex items-center justify-between px-6 shrink-0 z-30">
                <div className="flex gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-600" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total: {items.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shadow-[0_0_8px_red]" />
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Atrasados: {items.filter(order => getWaitTime(order.createdAt) > 20).length}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.4em] italic">KDS MASTER • V3.0</span>
                    <div className="w-px h-4 bg-white/5" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default KdsPage;
