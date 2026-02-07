import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Fix para ícones do Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DeliveryMap: React.FC<{
    orderId: string; customerCoords: [number, number]; restaurantCoords: [number, number]; customerName: string; route: [number, number][];
}> = ({ orderId, customerCoords, restaurantCoords, customerName, route }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletInstance = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        leafletInstance.current = L.map(mapRef.current).setView(customerCoords, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(leafletInstance.current);
        L.marker(restaurantCoords).addTo(leafletInstance.current).bindPopup('Restaurante');
        L.marker(customerCoords).addTo(leafletInstance.current).bindPopup(customerName || 'Destino').openPopup();
        if (route && route.length > 0) L.polyline(route, { color: '#3b82f6', weight: 5 }).addTo(leafletInstance.current);
        return () => { if (leafletInstance.current) { leafletInstance.current.remove(); leafletInstance.current = null; } };
    }, [orderId, route]);
    return <div ref={mapRef} className="w-full h-full z-0" />;
};

const DriverDashboard: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState<[number, number][]>([]);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [customerCoords, setCustomerCoords] = useState<[number, number] | null>(null);
    const [restaurantCoords, setRestaurantCoords] = useState<[number, number]>([-23.5505, -46.6333]);
    const [restaurantCity, setRestaurantCity] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);

    const geocodeAddress = async (address: string, isRestaurant = false): Promise<[number, number] | null> => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY;
        if (!apiKey || !address) return null;
        try {
            const searchQuery = isRestaurant ? address : `${address}, ${restaurantCity}`;
            const focusParams = !isRestaurant && restaurantCoords ? `&focus.point.lon=${restaurantCoords[1]}&focus.point.lat=${restaurantCoords[0]}` : '';
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(searchQuery)}&boundary.country=BR&size=1${focusParams}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) { const [lon, lat] = data.features[0].geometry.coordinates; return [lat, lon]; }
        } catch (e) { console.error(e); }
        return null;
    };

    const loadOrders = async () => {
        try {
            const res = await api.get('/driver/orders');
            setOrders(res.data);
            const settingsRes = await api.get('/settings');
            const restAddress = settingsRes.data?.address || '';
            if (restAddress) {
                const parts = restAddress.split(',');
                if (parts.length > 2) setRestaurantCity(parts[parts.length - 1].trim());
                const coords = await geocodeAddress(restAddress, true);
                if (coords) setRestaurantCoords(coords);
            }
        } catch (error) { toast.error("Erro ao sincronizar entregas."); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadOrders(); const interval = setInterval(loadOrders, 30000); return () => clearInterval(interval); }, []);

    useEffect(() => {
        if (selectedOrder && selectedOrder.deliveryOrder?.address) {
            setIsGeocoding(true); setCustomerCoords(null); setRoute([]);
            geocodeAddress(selectedOrder.deliveryOrder.address).then(coords => {
                if (coords) setCustomerCoords(coords);
                else toast.error("Endereço não localizado no mapa.");
                setIsGeocoding(false);
            });
        }
    }, [selectedOrder]);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/status`, { status });
            toast.success(status === 'SHIPPED' ? "Entrega iniciada!" : "Entrega finalizada com sucesso!");
            loadOrders();
            if (status === 'COMPLETED') setView('list');
        } catch (error) { toast.error("Erro ao atualizar status."); }
    };

    if (view === 'detail' && selectedOrder) {
        const dOrder = selectedOrder.deliveryOrder || {};
        return (
            <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden -m-8">
                {/* Header Detalhe Mobile */}
                <div className="h-20 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-30 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl h-12 w-12" onClick={() => { setView('list'); setRoute([]); }}><ChevronLeft size={24} /></Button>
                        <div>
                            <h2 className="font-black text-lg leading-none uppercase italic tracking-tighter">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1.5">{dOrder.name || 'CLIENTE GERAL'}</p>
                        </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20"><Package size={24}/></div>
                </div>

                {/* Mapa Premium em Card */}
                <div className="h-[45vh] w-full shrink-0 relative bg-slate-900 border-b border-white/5">
                    {isGeocoding ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Calculando Coordenadas...</span>
                        </div>
                    ) : customerCoords ? (
                        <div className="w-full h-full relative">
                            <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords} customerName={dOrder.name} route={route} />
                            <Button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${restaurantCoords[0]},${restaurantCoords[1]}&destination=${customerCoords[0]},${customerCoords[1]}&travelmode=driving`, '_blank')}
                                className="absolute bottom-6 left-6 right-6 h-14 rounded-2xl shadow-2xl bg-blue-600 hover:bg-blue-500 uppercase italic font-black text-[10px] tracking-widest z-[1000]"
                            >
                                <Navigation size={18} className="mr-2" /> ABRIR NO GPS EXTERNO
                            </Button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-4 opacity-30">
                            <AlertCircle size={48} className="text-rose-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Endereço indisponível no mapa físico</p>
                        </div>
                    )}
                </div>

                {/* Painel de Info do Pedido */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6 custom-scrollbar">
                    <Card className="bg-slate-900 border-white/5 p-6 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><MapPin size={24} /></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destino da Entrega</p>
                                <p className="text-sm font-black text-white uppercase italic tracking-tight mt-1 leading-tight">{dOrder.address || 'ENDEREÇO NÃO INFORMADO'}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><Phone size={24} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contato</p>
                                    <p className="text-base font-black text-white italic">{dOrder.phone || 'N/A'}</p>
                                </div>
                            </div>
                            {dOrder.phone && (
                                <a href={`tel:${dOrder.phone.replace(/\D/g, '')}`} className="h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"><Phone size={20} /></a>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-slate-900 border-white/5 p-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 italic">
                            <ShoppingCart size={14} className="text-orange-500" /> Detalhes Financeiros
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</span>
                                <span className="font-black text-lg text-white italic">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Taxa de Entrega</span>
                                <span className="font-black text-lg text-blue-400 italic">+ R$ {(dOrder.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="pt-4 flex justify-between items-center">
                                <span className="text-xs font-black text-slate-200 uppercase tracking-[0.2em] italic">Total a Receber</span>
                                <span className="text-3xl font-black text-emerald-500 italic tracking-tighter">R$ {(selectedOrder.total + (dOrder.deliveryFee || 0)).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Ação Principal Fixa */}
                <div className="p-8 bg-slate-900 border-t border-white/10 shrink-0">
                    {selectedOrder.status === 'READY' ? (
                        <Button fullWidth size="lg" onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 italic"><Bike size={20} className="mr-2" /> INICIAR ENTREGA</Button>
                    ) : (
                        <Button fullWidth size="lg" onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} className="h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-900/20 italic"><CheckCircle size={20} className="mr-2" /> CONFIRMAR RECEBIMENTO</Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col p-6 pb-24 gap-8 max-w-lg mx-auto overflow-hidden -m-8">
            {/* Header Mobile Central */}
            <div className="flex justify-between items-center mt-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20"><Smartphone size={24} className="text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Minhas Rotas</h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5">Entregador Digital</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="bg-white/5 rounded-xl h-12 w-12 text-rose-500" onClick={logout}><LogOut size={20}/></Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-blue-600 border-none shadow-2xl shadow-blue-900/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-2 italic">Prontos p/ Coleta</p>
                    <div className="flex items-baseline gap-2"><h3 className="text-4xl font-black italic text-white tracking-tighter">{orders.filter(o => o.status === 'READY').length}</h3><span className="text-[10px] font-black text-white/40 uppercase">Fila</span></div>
                </Card>
                <Card className="p-6 bg-slate-900 border-white/5 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 italic">Em Trânsito</p>
                    <div className="flex items-baseline gap-2"><h3 className="text-4xl font-black italic text-white tracking-tighter">{orders.filter(o => o.status === 'SHIPPED').length}</h3><span className="text-[10px] font-black text-slate-700 uppercase">Agora</span></div>
                </Card>
            </div>

            {/* Listagem de Filas */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] flex items-center gap-2 italic"><Clock size={12} /> Entregas Pendentes</h3>
                    <button onClick={loadOrders} className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Atualizar {loading && "..."}</button>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-20"><Loader2 className="animate-spin text-white" size={40} /><p className="font-black uppercase tracking-widest text-[10px]">Sincronizando...</p></div>
                ) : orders.length === 0 ? (
                    <Card className="bg-slate-900/50 border-dashed border-2 border-white/5 p-16 flex flex-col items-center justify-center text-center opacity-30">
                        <MapIcon size={64} strokeWidth={1} className="text-slate-500 mb-4" />
                        <p className="font-black uppercase text-[10px] tracking-[0.3em]">Nenhuma rota disponível</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const isMyOrder = order.status === 'SHIPPED';
                            return (
                                <Card 
                                    key={order.id} 
                                    onClick={() => { setSelectedOrder(order); setView('detail'); }}
                                    className={cn(
                                        "p-0 overflow-hidden border-2 transition-all active:scale-95",
                                        isMyOrder ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900 border-white/5"
                                    )}
                                    noPadding
                                >
                                    <div className="p-5 flex items-center gap-5">
                                        <div className={cn(
                                            "h-16 w-16 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg",
                                            isMyOrder ? "bg-emerald-500 text-white" : "bg-slate-950 text-slate-500 border border-white/5"
                                        )}>
                                            <span className="text-[8px] font-black uppercase leading-none mb-1 opacity-60">Pedido</span>
                                            <span className="text-xl font-black italic tracking-tighter">#{order.dailyOrderNumber}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-white uppercase italic tracking-tight text-sm truncate leading-none mb-2">{order.deliveryOrder?.name || 'CLIENTE GERAL'}</h4>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={10} className="text-slate-500 shrink-0" />
                                                <p className="text-[9px] font-bold text-slate-500 truncate uppercase tracking-tighter">{order.deliveryOrder?.address}</p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-slate-700"><ChevronRight size={24} /></div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;