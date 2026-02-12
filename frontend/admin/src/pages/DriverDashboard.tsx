import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft,
    ShoppingCart,
    Map
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
        leafletInstance.current = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView(customerCoords, 15);
        
        L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(leafletInstance.current);

        const restaurantIcon = L.divIcon({
            html: `<div class="bg-slate-900 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const customerIcon = L.divIcon({
            html: `<div class="bg-orange-500 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(leafletInstance.current);
        L.marker(customerCoords, { icon: customerIcon }).addTo(leafletInstance.current);
        
        if (route && route.length > 0) L.polyline(route, { color: '#f97316', weight: 4, opacity: 0.8 }).addTo(leafletInstance.current);
        
        return () => { if (leafletInstance.current) { leafletInstance.current.remove(); leafletInstance.current = null; } };
    }, [orderId, route]);

    return <div ref={mapRef} className="w-full h-full z-0 rounded-2xl overflow-hidden" />;
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
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(searchQuery)}&boundary.country=BR&size=1`;
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
            <div className="flex flex-col min-h-screen bg-[#f8fafc] overflow-hidden">
                {/* Custom Navigation Bar */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-50">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setView('list'); setRoute([]); }}
                            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 className="font-black text-slate-900 uppercase italic tracking-tighter leading-none">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">EM DETALHES</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                        <Package size={20} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Mapa Section */}
                    <Card className="p-0 h-[35vh] overflow-hidden border-slate-200 shadow-lg relative bg-white">
                        {isGeocoding ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30">
                                <Loader2 className="animate-spin text-orange-500" size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Localizando Destino...</span>
                            </div>
                        ) : customerCoords ? (
                            <div className="w-full h-full relative">
                                <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords} customerName={dOrder.name} route={route} />
                                <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                                    <Button 
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${restaurantCoords[0]},${restaurantCoords[1]}&destination=${customerCoords[0]},${customerCoords[1]}&travelmode=driving`, '_blank')}
                                        className="w-full h-12 rounded-xl shadow-2xl bg-slate-900 hover:bg-slate-800 uppercase italic font-black text-[10px] tracking-widest"
                                    >
                                        <Navigation size={16} className="mr-2" /> ABRIR GPS GOOGLE
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3 opacity-30 bg-slate-50">
                                <AlertCircle size={32} className="text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Localização não disponível no mapa</p>
                            </div>
                        )}
                    </Card>

                    {/* Cliente Info */}
                    <Card className="p-6 border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Endereço de Entrega</h3>
                                <p className="text-sm font-black text-slate-900 uppercase italic leading-tight">{dOrder.address || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{dOrder.name || 'Cliente'}</h3>
                                    <p className="text-base font-black text-slate-900 italic">{dOrder.phone || 'N/A'}</p>
                                </div>
                            </div>
                            {dOrder.phone && (
                                <a 
                                    href={`tel:${dOrder.phone.replace(/\D/g, '')}`} 
                                    className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-90 transition-transform"
                                >
                                    <Phone size={20} />
                                </a>
                            )}
                        </div>
                    </Card>

                    {/* Financeiro */}
                    <Card className="p-6 border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <ShoppingCart size={16} className="text-orange-500" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Valores do Pedido</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Produtos</span>
                                <span className="text-slate-900">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-orange-500">Taxa de Entrega</span>
                                <span className="text-orange-500">+ R$ {(dOrder.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-black text-slate-900 uppercase italic tracking-widest">Receber</span>
                                <span className="text-3xl font-black text-orange-500 italic tracking-tighter">R$ {(selectedOrder.total + (dOrder.deliveryFee || 0)).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Ação Principal */}
                <div className="p-4 bg-white border-t border-slate-200">
                    {selectedOrder.status === 'READY' ? (
                        <Button 
                            fullWidth 
                            size="lg" 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} 
                            className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl italic"
                        >
                            <Bike size={20} className="mr-3" /> INICIAR ENTREGA
                        </Button>
                    ) : (
                        <Button 
                            fullWidth 
                            size="lg" 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} 
                            className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl italic"
                        >
                            <CheckCircle size={20} className="mr-3" /> FINALIZAR ENTREGA
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col p-4 pb-20 max-w-lg mx-auto overflow-x-hidden">
            {/* Header */}
            <div className="flex justify-between items-center py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <Bike size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Minhas Rotas</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Painel de Entregas
                        </p>
                    </div>
                </div>
                <button 
                    onClick={logout}
                    className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all shadow-sm"
                >
                    <LogOut size={20}/>
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="p-6 bg-slate-900 border-none shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 -mr-10 -mt-10 rounded-full" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 italic">Prontos p/ Coleta</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black italic text-white tracking-tighter">{orders.filter(o => o.status === 'READY').length}</h3>
                        <span className="text-[10px] font-black text-orange-500 uppercase italic">Fila</span>
                    </div>
                </Card>
                <Card className="p-6 bg-white border-slate-200 shadow-sm relative overflow-hidden">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 italic">Em Trânsito</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black italic text-slate-900 tracking-tighter">{orders.filter(o => o.status === 'SHIPPED').length}</h3>
                        <span className="text-[10px] font-black text-slate-300 uppercase italic">Agora</span>
                    </div>
                </Card>
            </div>

            {/* Listagem */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 italic">
                        <Clock size={12} className="text-orange-500" /> Entregas Pendentes
                    </h3>
                    <button 
                        onClick={loadOrders} 
                        className={cn("text-[9px] font-black text-orange-500 uppercase tracking-widest", loading && "animate-pulse")}
                    >
                        Sincronizar
                    </button>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <p className="font-black uppercase tracking-widest text-[10px]">Carregando Rotas...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-10 gap-4 opacity-20">
                        <MapIcon size={48} className="text-slate-300" />
                        <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed">Nenhuma entrega atribuída<br/>ao seu usuário no momento</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const isShipped = order.status === 'SHIPPED';
                            return (
                                <Card 
                                    key={order.id} 
                                    onClick={() => { setSelectedOrder(order); setView('detail'); }}
                                    className={cn(
                                        "p-0 overflow-hidden border transition-all active:scale-[0.98] cursor-pointer",
                                        isShipped ? "border-orange-500 bg-orange-50/20 shadow-orange-100" : "bg-white border-slate-200 shadow-sm"
                                    )}
                                >
                                    <div className="p-4 flex items-center gap-4">
                                        <div className={cn(
                                            "h-14 w-14 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm",
                                            isShipped ? "bg-orange-500 text-white shadow-orange-500/20" : "bg-slate-100 text-slate-400"
                                        )}>
                                            <span className="text-[7px] font-black uppercase leading-none mb-1 opacity-60">Pedido</span>
                                            <span className="text-lg font-black italic tracking-tighter">#{order.dailyOrderNumber}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 uppercase italic tracking-tight text-sm truncate leading-none mb-2">
                                                {order.deliveryOrder?.name || 'Cliente Geral'}
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-slate-300 shrink-0" />
                                                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tight">
                                                    {order.deliveryOrder?.address || 'Endereço não informado'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="w-8 h-8 flex items-center justify-center text-slate-300">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                    
                                    {isShipped && (
                                        <div className="bg-orange-500 px-4 py-1 flex items-center justify-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                                            <span className="text-[8px] font-black text-white uppercase tracking-widest italic">Rota em Andamento</span>
                                        </div>
                                    )}
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