import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ChefHat, Clock, CheckCircle, RefreshCw, 
    List, AlertCircle, Timer, Beer, Pizza as PizzaIcon, Plus, Loader2, LogOut, ChevronRight, Bike, ShoppingBag, Utensils
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';

const KdsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const area = searchParams.get('area') || 'Cozinha';

    // Agrupa os itens por Pedido para formar os "Tickets"
    const groupedOrders = useMemo(() => {
        if (!Array.isArray(rawItems)) return [];
        
        const groups: Record<string, any> = {};
        
        rawItems.forEach(item => {
            const orderId = item.orderId;
            if (!groups[orderId]) {
                groups[orderId] = {
                    ...item.order,
                    id: orderId,
                    items: []
                };
            }
            groups[orderId].items.push(item);
        });
        
        return Object.values(groups).sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [rawItems]);

    const loadKds = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/kds/items?area=${area === 'Geral' ? '' : area}`);
            setRawItems(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            setRawItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKds();

        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const restaurantId = localStorage.getItem('selectedRestaurantId') || user?.restaurantId;

        const eventSource = new EventSource(`${window.location.origin}/api/admin/orders/events?token=${token}&restaurantId=${restaurantId}`);

        eventSource.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            if (eventData.type === 'CONNECTION_ESTABLISHED') return;
            loadKds();
        };

        return () => {
            eventSource.close();
        };
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
            // O reload via SSE ou manual cuidará da atualização da lista
            loadKds();
        } catch (error) {
            toast.error('Erro ao finalizar item.');
        }
    };

    return (
        <div className="h-screen w-screen bg-[#050505] text-white flex flex-col overflow-hidden font-sans select-none">
            {/* Header Superior */}
            <div className="h-16 bg-[#0a0a0a] border-b border-white/[0.05] flex items-center justify-between px-6 shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                        <ChefHat size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight italic leading-none text-white">Monitor de Produção</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tempo Real</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <nav className="flex bg-white/[0.03] p-1 rounded-xl gap-1 border border-white/[0.05]">
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
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                    area === a.id ? "bg-orange-600 text-white" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <a.icon size={12} />
                                {a.id}
                            </button>
                        ))}
                    </nav>
                    
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Principal de Tickets */}
            <main className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar items-start bg-black">
                {loading && groupedOrders.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center opacity-30 gap-4">
                        <Loader2 size={40} className="animate-spin text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sincronizando...</span>
                    </div>
                ) : groupedOrders.length > 0 ? (
                    groupedOrders.map((order: any) => {
                        const waitTime = getWaitTime(order.createdAt);
                        const isUrgent = waitTime > 15;
                        const isCritical = waitTime > 25;
                        
                        return (
                            <div key={order.id} className="w-[320px] shrink-0 flex flex-col animate-in slide-in-from-right-10">
                                <div className={cn(
                                    "rounded-[2rem] overflow-hidden flex flex-col border-2 transition-all shadow-2xl",
                                    isCritical ? "border-rose-600 bg-rose-950/10" : 
                                    isUrgent ? "border-orange-500 bg-orange-950/10" : 
                                    "border-emerald-500/20 bg-[#0c0c0c]"
                                )}>
                                    
                                    {/* Header do Ticket */}
                                    <div className={cn(
                                        "p-5 border-b flex justify-between items-start",
                                        isCritical ? "border-rose-900/50" : isUrgent ? "border-orange-900/50" : "border-white/5"
                                    )}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={cn("w-2 h-2 rounded-full", isCritical ? "bg-rose-500 animate-pulse" : isUrgent ? "bg-orange-500" : "bg-emerald-500")} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {order.orderType === 'DELIVERY' ? 'DELIVERY' : `MESA ${order.tableNumber || '?'}`}
                                                </span>
                                            </div>
                                            <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                                                #{order.dailyOrderNumber} <span className="text-white/10 mx-0.5">•</span> <span className="text-orange-500">{order.customerName?.split(' ')[0] || (order.deliveryOrder?.name?.split(' ')[0]) || 'BOX'}</span>
                                            </h4>
                                        </div>
                                        <div className={cn("px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2", isUrgent ? "bg-orange-500" : "bg-white/5 text-emerald-400")}>
                                            <Timer size={14} /> {waitTime}M
                                        </div>
                                    </div>

                                    {/* Itens do Pedido */}
                                    <div className="p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.03] group">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0">
                                                        <span className="text-lg font-black text-white">{item.quantity}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black uppercase leading-tight text-white">{item.product.name}</p>
                                                        {item.observations && (
                                                            <p className="mt-2 p-2 bg-orange-500/10 border-l-2 border-orange-500 text-[10px] font-bold text-orange-200 italic">
                                                                {item.observations}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleFinishItem(item.id)} className="mt-3 w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                                                    <CheckCircle size={14} /> Pronto
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full flex flex-col items-center justify-center text-slate-800 h-full opacity-20">
                        <ChefHat size={64} className="mb-4" />
                        <p className="font-black uppercase text-xs tracking-widest">Cozinha Limpa</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default KdsPage;