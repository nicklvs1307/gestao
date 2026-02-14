import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft,
    ShoppingCart,
    Map,
    Maximize2,
    Minimize2,
    History,
    Home,
    User,
    CreditCard,
    DollarSign,
    RefreshCw
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
    orderId: string; 
    customerCoords: [number, number]; 
    restaurantCoords: [number, number]; 
    currentLocation: [number, number] | null;
    route: [number, number][];
}> = ({ orderId, customerCoords, restaurantCoords, currentLocation, route }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletInstance = useRef<L.Map | null>(null);
    const polylineRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!mapRef.current || !customerCoords || !restaurantCoords) return;
        
        // Destruir instância anterior se existir
        if (leafletInstance.current) {
            leafletInstance.current.remove();
            leafletInstance.current = null;
        }

        // Inicializar Novo Mapa
        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView(currentLocation || restaurantCoords, 15);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        leafletInstance.current = map;

        const restaurantIcon = L.divIcon({
            html: `<div class="bg-slate-900 p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        const customerIcon = L.divIcon({
            html: `<div class="bg-orange-500 p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        const driverIcon = L.divIcon({
            html: `<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg text-white animate-pulse flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(map);
        L.marker(customerCoords, { icon: customerIcon }).addTo(map);
        if (currentLocation) {
            L.marker(currentLocation, { icon: driverIcon }).addTo(map);
        }
        
        if (route && route.length > 0) {
            polylineRef.current = L.polyline(route, { color: '#f97316', weight: 6, opacity: 0.8, lineJoin: 'round' }).addTo(map);
            map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        } else {
            const bounds = L.latLngBounds([restaurantCoords, customerCoords]);
            if (currentLocation) bounds.extend(currentLocation);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        setTimeout(() => { map.invalidateSize(); }, 200);

        return () => {
            if (leafletInstance.current) {
                leafletInstance.current.remove();
                leafletInstance.current = null;
            }
        };
    }, [orderId, customerCoords, restaurantCoords, currentLocation, route]);

    return <div ref={mapRef} className="w-full h-full min-h-[300px] z-0" />;
};

const DriverDashboard: React.FC = () => {
    const { logout, user: authUser } = useAuth();
    const navigate = useNavigate();
    
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [orders, setOrders] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    
    // Geolocation & Routing
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [customerCoords, setCustomerCoords] = useState<[number, number] | null>(null);
    const [restaurantCoords, setRestaurantCoords] = useState<[number, number]>([-23.5505, -46.6333]);
    const [route, setRoute] = useState<[number, number][]>([]);
    
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Alarme
    const [lastOrderCount, setLastOrderCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- EFEITOS INICIAIS ---
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
        audioRef.current.loop = true;
        if ("Notification" in window) Notification.requestPermission();
        
        // GPS
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
                (err) => console.warn("GPS desativado:", err), 
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const loadData = async () => {
        if (activeTab === 'profile') return;
        try {
            if (activeTab === 'home') {
                const res = await api.get('/driver/orders');
                const newOrders = res.data;
                const currentPending = newOrders.filter((o: any) => o.status === 'READY' || o.status === 'PENDING').length;
                
                if (lastOrderCount > 0 && currentPending > lastOrderCount) {
                    playAlarm();
                    if (Notification.permission === "granted") {
                        new Notification("🚀 Nova Entrega!", { body: "Um novo pedido foi atribuído a você.", icon: "/logo.png" });
                    }
                }
                setOrders(newOrders);
                setLastOrderCount(currentPending);
            } else if (activeTab === 'history') {
                const res = await api.get('/driver/history');
                setHistory(res.data);
            }

            // Pega endereço da loja
            const settingsRes = await api.get('/settings');
            if (settingsRes.data?.address) {
                const coords = await geocodeAddress(settingsRes.data.address);
                if (coords) setRestaurantCoords(coords);
            }
        } catch (error) { console.error("Erro loadData:", error); }
        finally { setLoading(false); }
    };

    const playAlarm = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {});
            toast.info("NOVA ENTREGA DISPONÍVEL!", {
                action: { label: "PARAR SOM", onClick: () => stopAlarm() },
                duration: Infinity,
            });
        }
    };

    const stopAlarm = () => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };

    const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY;
        if (!apiKey || !address || address === 'Retirada no Balcão') return null;
        try {
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=BR&size=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features?.length > 0) { const [lon, lat] = data.features[0].geometry.coordinates; return [lat, lon]; }
        } catch (e) { console.error("Erro geocode:", e); }
        return null;
    };

    const fetchRoute = async (start: [number, number], end: [number, number]) => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY;
        if (!apiKey) return;
        setIsRouting(true);
        try {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features?.length > 0) {
                const coords = data.features[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                setRoute(coords);
                setIsMapExpanded(true);
            }
        } catch (e) { toast.error("Erro ao calcular rota."); }
        finally { setIsRouting(false); }
    };

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/status`, { status });
            toast.success(status === 'SHIPPED' ? "Entrega iniciada!" : "Entrega finalizada!");
            loadData();
            if (status === 'COMPLETED') setView('list');
        } catch (error) { toast.error("Erro ao atualizar status."); }
    };

    const handleUpdatePayment = async (orderId: string, method: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/payment-method`, { method });
            toast.success("Pagamento atualizado!");
            loadData();
        } catch (e) { toast.error("Erro ao atualizar pagamento."); }
    };

    const optimizeRoute = async () => {
        setIsOptimizing(true);
        const pending = orders.filter(o => o.status === 'READY' || o.status === 'SHIPPED');
        if (pending.length < 2) { setIsOptimizing(false); return toast.info("Poucos pedidos para otimizar."); }
        
        try {
            const validWithCoords = await Promise.all(pending.map(async o => {
                const c = await geocodeAddress(o.deliveryOrder?.address);
                return c ? { ...o, coords: c } : null;
            }));
            const filtered = validWithCoords.filter(o => o !== null) as any[];
            
            let current = currentLocation || restaurantCoords;
            const result: any[] = [];
            const pool = [...filtered];
            while(pool.length > 0) {
                pool.sort((a, b) => {
                    const distA = Math.sqrt(Math.pow(a.coords[0]-current[0], 2) + Math.pow(a.coords[1]-current[1], 2));
                    const distB = Math.sqrt(Math.pow(b.coords[0]-current[0], 2) + Math.pow(b.coords[1]-current[1], 2));
                    return distA - distB;
                });
                const next = pool.shift();
                result.push(next);
                current = next.coords;
            }
            setOrders(result);
            toast.success("Rota otimizada!");
        } catch (e) { toast.error("Erro ao otimizar."); }
        finally { setIsOptimizing(false); }
    };

    // --- RENDERIZAÇÃO DE DETALHES ---
    if (view === 'detail' && selectedOrder) {
        const dOrder = selectedOrder.deliveryOrder || {};
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-32">
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setView('list'); setRoute([]); setIsMapExpanded(false); }} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"><ChevronLeft size={24}/></button>
                        <div>
                            <h2 className="font-black text-slate-900 uppercase italic tracking-tighter leading-none">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">EM DETALHES</p>
                        </div>
                    </div>
                    <Package size={20} className="text-orange-500" />
                </div>

                <div className="p-4 space-y-4">
                    <Card className={cn("p-0 overflow-hidden border-slate-200 shadow-xl relative bg-white transition-all duration-500", isMapExpanded ? "fixed inset-0 z-[150] rounded-none h-full" : "h-[40vh] min-h-[300px]")}>
                        {isGeocoding ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30"><Loader2 className="animate-spin text-orange-500" size={32} /><span className="text-[10px] font-black uppercase tracking-widest">Localizando...</span></div>
                        ) : customerCoords ? (
                            <div className="w-full h-full relative">
                                <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords} currentLocation={currentLocation} route={route} />
                                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                                    <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 text-slate-900">{isMapExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                                </div>
                                {isMapExpanded && (
                                    <div className="absolute bottom-6 left-6 right-6 z-[1000] flex gap-2">
                                        <Button onClick={() => setIsMapExpanded(false)} variant="secondary" className="flex-1 h-14 rounded-2xl bg-white uppercase font-black text-[10px] shadow-2xl">FECHAR</Button>
                                        <Button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.join(',')}&destination=${customerCoords?.join(',')}&travelmode=driving`, '_blank')} className="flex-[2] h-14 rounded-2xl bg-slate-900 uppercase font-black text-[10px] shadow-2xl"><Navigation size={18} className="mr-2"/>GOOGLE MAPS</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3 opacity-30 bg-slate-50"><AlertCircle size={32} className="text-slate-400" /><p className="text-[10px] font-black uppercase tracking-widest">Localização Indisponível</p></div>
                        )}
                    </Card>

                    {!isMapExpanded && (
                        <>
                            <Card className="p-6 border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0"><MapPin size={24} /></div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Endereço de Entrega</h3>
                                        <p className="text-sm font-black text-slate-900 uppercase italic leading-tight">{dOrder.address}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-6 border-t border-slate-100">
                                    <Button onClick={async () => {
                                        const coords = await geocodeAddress(dOrder.address);
                                        if (coords) {
                                            setCustomerCoords(coords);
                                            fetchRoute(currentLocation || restaurantCoords, coords);
                                        } else {
                                            toast.error("Não foi possível traçar rota.");
                                        }
                                    }} isLoading={isRouting} className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-[10px] uppercase italic gap-2 shadow-lg shadow-orange-100"><Map size={18}/> ROTA INTERNA</Button>
                                    {dOrder.phone && <a href={`tel:${dOrder.phone}`} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform"><Phone size={20}/></a>}
                                </div>
                            </Card>

                            <Card className="p-6 border-slate-200 shadow-sm bg-slate-900 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-2xl -mr-12 -mt-12 rounded-full" />
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 italic">Valor a Receber</h3>
                                    <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{dOrder.paymentMethod || 'PENDENTE'}</span>
                                </div>
                                <div className="text-4xl font-black italic tracking-tighter relative z-10">R$ {(selectedOrder.total + (dOrder.deliveryFee || 0)).toFixed(2).replace('.', ',')}</div>
                            </Card>

                            <div className="pt-4">
                                {selectedOrder.status === 'READY' ? (
                                    <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl italic"><Bike size={20} className="mr-3"/> INICIAR ENTREGA</Button>
                                ) : (
                                    <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl italic"><CheckCircle size={20} className="mr-3"/> FINALIZAR ENTREGA</Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-32">
            {/* Header Fixo */}
            <header className="px-6 py-6 bg-white border-b sticky top-0 z-[100] shadow-sm">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100"><Bike size={24}/></div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 italic uppercase leading-none tracking-tighter">
                                {activeTab === 'home' ? 'Minhas Rotas' : activeTab === 'history' ? 'Minhas Entregas' : 'Meu Perfil'}
                            </h1>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Entregador Online
                            </p>
                        </div>
                    </div>
                    <button onClick={loadData} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:rotate-180 transition-transform"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-lg mx-auto animate-in fade-in duration-500">
                {activeTab === 'home' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-6 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 -mr-10 -mt-10 rounded-full" />
                                <p className="text-[8px] font-black uppercase text-slate-400 mb-2 italic">Pedidos Prontos</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-black italic tracking-tighter">{orders.filter(o => o.status === 'READY').length}</h3>
                                    <span className="text-[10px] font-black text-orange-500 uppercase italic">Fila</span>
                                </div>
                            </Card>
                            <Card onClick={optimizeRoute} className={cn("p-6 border-2 transition-all shadow-sm cursor-pointer relative overflow-hidden group", isOptimizing ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100 hover:border-orange-500")}>
                                {isOptimizing ? (
                                    <div className="flex flex-col items-center justify-center h-full"><Loader2 className="animate-spin text-orange-500 mb-1" size={20}/><p className="text-[8px] font-black uppercase text-orange-500">Calculando...</p></div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-2"><p className="text-[8px] font-black uppercase text-slate-400 italic">Roteirização IA</p><Map size={14} className="text-orange-500" /></div>
                                        <h3 className="text-xl font-black italic text-slate-900 tracking-tighter">Otimizar</h3>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ordenar por distância</p>
                                    </>
                                )}
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 italic"><Clock size={12} className="text-orange-500"/> Entregas Pendentes</h3>
                                <span className="text-[10px] font-black text-slate-300 uppercase">{orders.length} pedidos</span>
                            </div>
                            
                            {orders.length === 0 ? (
                                <div className="py-24 text-center opacity-20"><MapIcon size={64} className="mx-auto mb-4 text-slate-300"/><p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Nenhuma entrega atribuída<br/>ao seu usuário no momento</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map(order => (
                                        <Card key={order.id} onClick={() => { 
                                            setSelectedOrder(order); 
                                            setView('detail');
                                            // Prepara coordenadas do cliente ao abrir
                                            geocodeAddress(order.deliveryOrder?.address).then(setCustomerCoords);
                                        }} className={cn("p-0 overflow-hidden border-2 transition-all active:scale-[0.98] cursor-pointer", order.status === 'SHIPPED' ? "border-orange-500 bg-orange-50/20 shadow-orange-100" : "border-white bg-white shadow-sm")}>
                                            <div className="p-4 flex items-center gap-4">
                                                <div className={cn("h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm", order.status === 'SHIPPED' ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>
                                                    <span className="text-[7px] font-black uppercase leading-none mb-1 opacity-60">Pedido</span>
                                                    <span className="text-lg font-black italic tracking-tighter">#{order.dailyOrderNumber}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-slate-900 uppercase italic text-sm truncate leading-none mb-2">{order.deliveryOrder?.name || 'Cliente Geral'}</h4>
                                                    <div className="flex items-center gap-1.5 text-slate-400">
                                                        <MapPin size={12} className="shrink-0 text-orange-500/50"/>
                                                        <p className="text-[10px] font-bold truncate uppercase tracking-tight">{order.deliveryOrder?.address}</p>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 flex items-center justify-center text-slate-200"><ChevronRight size={24}/></div>
                                            </div>
                                            {order.status === 'SHIPPED' && (
                                                <div className="bg-orange-500 px-4 py-1 flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /><span className="text-[8px] font-black text-white uppercase tracking-widest italic">Entrega em Andamento</span></div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 italic"><History size={12} className="text-orange-500"/> Concluídas Hoje</h3>
                            <span className="text-[10px] font-black text-slate-300 uppercase">{history.length} entregas</span>
                        </div>
                        
                        {history.length === 0 ? (
                            <div className="py-24 text-center opacity-20"><CheckCircle size={64} className="mx-auto mb-4 text-slate-300"/><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma entrega finalizada ainda</p></div>
                        ) : (
                            <div className="space-y-4">
                                {history.map(order => (
                                    <Card key={order.id} className="p-5 border-slate-100 shadow-sm space-y-5 bg-white">
                                        <div className="flex justify-between items-start border-b border-slate-50 pb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-black text-slate-900 uppercase italic text-sm leading-none">Pedido #{order.dailyOrderNumber}</h4>
                                                    <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1.5 py-0.5 rounded uppercase border border-emerald-100">Entregue</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(order.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {order.deliveryOrder?.name || 'Cliente'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-emerald-600 italic leading-none tracking-tighter">R$ {order.total.toFixed(2)}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Total Pedido</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><CreditCard size={14}/></div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Confirmar Pagamento:</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Dinheiro', 'Pix', 'Cartão'].map(method => {
                                                    const currentMethod = order.deliveryOrder?.paymentMethod || '';
                                                    const isActive = currentMethod === method || (currentMethod.toLowerCase().includes('cart') && method === 'Cartão');
                                                    return (
                                                        <button 
                                                            key={method}
                                                            onClick={() => handleUpdatePayment(order.id, method)}
                                                            className={cn(
                                                                "h-10 rounded-xl text-[9px] font-black uppercase transition-all border-2", 
                                                                isActive 
                                                                    ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]" 
                                                                    : "bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200"
                                                            )}
                                                        >
                                                            {method}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6 pt-4">
                        <Card className="p-10 text-center space-y-6 bg-white border-slate-100 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
                            <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] mx-auto flex items-center justify-center text-slate-400 shadow-inner border-4 border-white"><User size={48}/></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{authUser?.name}</h3>
                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mt-3 italic bg-orange-50 py-1 px-4 rounded-full inline-block">Entregador Profissional</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Entregas Hoje</p><p className="text-xl font-black text-slate-900 italic">{history.length}</p></div>
                                <div><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Acumulado</p><p className="text-xl font-black text-emerald-600 italic">R$ {history.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p></div>
                            </div>
                        </Card>
                        
                        <div className="space-y-3">
                            <Button variant="outline" fullWidth onClick={loadData} className="h-14 rounded-2xl uppercase font-black italic text-[10px] tracking-widest gap-2 bg-white"><RefreshCw size={18}/> SINCRONIZAR DADOS</Button>
                            <Button fullWidth variant="danger" onClick={logout} className="h-14 rounded-2xl uppercase font-black italic text-[10px] tracking-widest gap-2 shadow-xl shadow-rose-900/10"><LogOut size={18}/> ENCERRAR SESSÃO</Button>
                        </div>
                        
                        <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] pt-10">Kicardapio Smart Delivery v2.0</p>
                    </div>
                )}
            </main>

            {/* Bottom Navigation Fixo */}
            <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white border-t border-slate-100 flex items-center justify-around px-6 z-[200] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
                {[
                    { id: 'home', icon: Home, label: 'Início' },
                    { id: 'history', icon: History, label: 'Histórico' },
                    { id: 'profile', icon: User, label: 'Perfil' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id}
                            onClick={() => { 
                                setActiveTab(tab.id as any); 
                                setView('list'); 
                                setIsMapExpanded(false);
                                setRoute([]);
                            }}
                            className={cn("flex flex-col items-center gap-2 transition-all duration-300 relative group", isActive ? "text-orange-500 scale-110" : "text-slate-300")}
                        >
                            {isActive && <div className="absolute -top-10 w-12 h-1 bg-orange-500 rounded-full animate-in fade-in zoom-in duration-500" />}
                            <div className={cn("p-3 rounded-2xl transition-all duration-300", isActive ? "bg-orange-50 shadow-sm" : "bg-transparent group-hover:bg-slate-50")}>
                                <tab.icon size={24} strokeWidth={isActive ? 3 : 2} />
                            </div>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest leading-none", isActive ? "opacity-100" : "opacity-60")}>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default DriverDashboard;
