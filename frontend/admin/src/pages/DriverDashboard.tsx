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
        
        if (!leafletInstance.current) {
            leafletInstance.current = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView(currentLocation || restaurantCoords, 15);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(leafletInstance.current);
        }

        const restaurantIcon = L.divIcon({
            html: `<div class="bg-slate-900 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        const customerIcon = L.divIcon({
            html: `<div class="bg-orange-500 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        const driverIcon = L.divIcon({
            html: `<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg text-white animate-pulse"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });

        leafletInstance.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) leafletInstance.current?.removeLayer(layer);
        });

        L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(leafletInstance.current);
        L.marker(customerCoords, { icon: customerIcon }).addTo(leafletInstance.current);
        if (currentLocation) {
            L.marker(currentLocation, { icon: driverIcon }).addTo(leafletInstance.current);
        }
        
        if (polylineRef.current) leafletInstance.current.removeLayer(polylineRef.current);
        
        if (route && route.length > 0) {
            polylineRef.current = L.polyline(route, { color: '#f97316', weight: 6, opacity: 0.8, lineJoin: 'round' }).addTo(leafletInstance.current);
            leafletInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        } else {
            const bounds = L.latLngBounds([restaurantCoords, customerCoords]);
            if (currentLocation) bounds.extend(currentLocation);
            leafletInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
        
        setTimeout(() => { leafletInstance.current?.invalidateSize(); }, 100);

        return () => {};
    }, [orderId, route, customerCoords, restaurantCoords, currentLocation]);

    return <div ref={mapRef} className="w-full h-full z-0" />;
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
    const [restaurantCity, setRestaurantCity] = useState('');
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
            navigator.geolocation.watchPosition(
                (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
                null, { enableHighAccuracy: true }
            );
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
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

            // Pega endereço da loja para o mapa
            const settingsRes = await api.get('/settings');
            if (settingsRes.data?.address) {
                const restAddress = settingsRes.data.address;
                const coords = await geocodeAddress(restAddress, true);
                if (coords) setRestaurantCoords(coords);
            }
        } catch (error) { console.error(error); }
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

    const geocodeAddress = async (address: string, isRestaurant = false): Promise<[number, number] | null> => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY;
        if (!apiKey || !address) return null;
        try {
            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}&boundary.country=BR&size=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features?.length > 0) { const [lon, lat] = data.features[0].geometry.coordinates; return [lat, lon]; }
        } catch (e) { console.error(e); }
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
            toast.success(status === 'SHIPPED' ? "Entrega iniciada!" : "Entrega finalizada com sucesso!");
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
        // ... (lógica de otimização mantida do passo anterior)
        setIsOptimizing(true);
        toast.info("Otimizando rota...");
        // Re-implementação rápida para manter a funcionalidade
        const pending = orders.filter(o => o.status === 'READY' || o.status === 'SHIPPED');
        if (pending.length < 2) { setIsOptimizing(false); return toast.info("Poucos pedidos para otimizar."); }
        
        const validWithCoords = await Promise.all(pending.map(async o => {
            const c = await geocodeAddress(o.deliveryOrder?.address);
            return c ? { ...o, coords: c } : null;
        }));
        const filtered = validWithCoords.filter(o => o !== null);
        
        // Simples ordenação por distância (Greedy)
        let current = currentLocation || restaurantCoords;
        const result: any[] = [];
        const pool = [...filtered];
        while(pool.length > 0) {
            pool.sort((a:any, b:any) => {
                const distA = Math.sqrt(Math.pow(a.coords[0]-current[0], 2) + Math.pow(a.coords[1]-current[1], 2));
                const distB = Math.sqrt(Math.pow(b.coords[0]-current[0], 2) + Math.pow(b.coords[1]-current[1], 2));
                return distA - distB;
            });
            const next = pool.shift();
            result.push(next);
            current = next.coords;
        }
        setOrders(result);
        setIsOptimizing(false);
        toast.success("Rota ordenada!");
    };

    // --- RENDERIZAÇÃO DE DETALHES ---
    if (view === 'detail' && selectedOrder) {
        const dOrder = selectedOrder.deliveryOrder || {};
        return (
            <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-20">
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-[60]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setView('list'); setRoute([]); setIsMapExpanded(false); }} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center"><ChevronLeft size={24}/></button>
                        <h2 className="font-black text-slate-900 uppercase italic">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                    </div>
                    <Package size={20} className="text-orange-500" />
                </div>

                <div className="p-4 space-y-4">
                    <Card className={cn("p-0 overflow-hidden border-none shadow-lg relative bg-white transition-all", isMapExpanded ? "fixed inset-0 z-50 rounded-none h-full" : "h-[35vh]")}>
                        {customerCoords && (
                            <div className="w-full h-full relative">
                                <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords} currentLocation={currentLocation} route={route} />
                                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                                    <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border">{isMapExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                                </div>
                                {isMapExpanded && (
                                    <div className="absolute bottom-6 left-6 right-6 z-[1000] flex gap-2">
                                        <Button onClick={() => setIsMapExpanded(false)} variant="secondary" className="flex-1 h-14 rounded-2xl bg-white uppercase font-black text-[10px]">FECHAR</Button>
                                        <Button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.join(',')}&destination=${customerCoords?.join(',')}&travelmode=driving`, '_blank')} className="flex-[2] h-14 rounded-2xl bg-slate-900 uppercase font-black text-[10px]"><Navigation size={18} className="mr-2"/>GOOGLE MAPS</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {!isMapExpanded && (
                        <>
                            <Card className="p-6 space-y-4">
                                <div className="flex items-start gap-4">
                                    <MapPin size={24} className="text-slate-400" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Endereço de Entrega</h3>
                                        <p className="text-sm font-black text-slate-900 uppercase italic leading-tight">{dOrder.address}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button onClick={() => customerCoords && fetchRoute(currentLocation || restaurantCoords, customerCoords)} isLoading={isRouting} className="flex-1 h-12 rounded-xl bg-orange-500 font-black text-[10px] uppercase italic gap-2"><Map size={18}/> ROTA INTERNA</Button>
                                    {dOrder.phone && <a href={`tel:${dOrder.phone}`} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Phone size={20}/></a>}
                                </div>
                            </Card>

                            <Card className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase italic">Valor a Receber</h3>
                                    <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded">{dOrder.paymentMethod}</span>
                                </div>
                                <div className="text-3xl font-black italic text-slate-900 tracking-tighter">R$ {(selectedOrder.total + (dOrder.deliveryFee || 0)).toFixed(2).replace('.', ',')}</div>
                            </Card>

                            <div className="fixed bottom-20 left-4 right-4 z-40">
                                {selectedOrder.status === 'READY' ? (
                                    <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-2xl bg-slate-900 font-black uppercase text-[10px] tracking-widest shadow-2xl italic"><Bike size={20} className="mr-3"/> INICIAR ENTREGA</Button>
                                ) : (
                                    <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} className="h-16 rounded-2xl bg-orange-500 font-black uppercase text-[10px] tracking-widest shadow-2xl italic"><CheckCircle size={20} className="mr-3"/> FINALIZAR ENTREGA</Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-24">
            {/* Header Global */}
            <div className="px-6 py-8 flex justify-between items-center bg-white border-b">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><Bike size={24}/></div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 italic uppercase leading-none">
                            {activeTab === 'home' ? 'Minhas Rotas' : activeTab === 'history' ? 'Minhas Entregas' : 'Meu Perfil'}
                        </h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Painel do Entregador</p>
                    </div>
                </div>
                <button onClick={loadData} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">
                {activeTab === 'home' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
                                <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Prontos</p>
                                <h3 className="text-4xl font-black italic">{orders.filter(o => o.status === 'READY').length}</h3>
                            </Card>
                            <Card onClick={optimizeRoute} className="p-6 bg-white border-2 border-slate-100 shadow-sm cursor-pointer hover:border-orange-500 transition-all">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[8px] font-black uppercase text-slate-400">Rota IA</p>
                                    <Map size={12} className="text-orange-500" />
                                </div>
                                <h3 className="text-lg font-black italic text-slate-900">Otimizar</h3>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2 italic"><Clock size={12}/> Entregas Pendentes</h3>
                            {orders.length === 0 ? (
                                <div className="py-20 text-center opacity-20"><MapIcon size={48} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase">Nenhuma entrega no momento</p></div>
                            ) : orders.map(order => (
                                <Card key={order.id} onClick={() => { setSelectedOrder(order); setView('detail'); }} className={cn("p-4 flex items-center gap-4 transition-all active:scale-95 border-2", order.status === 'SHIPPED' ? "border-orange-500 bg-orange-50/20" : "border-white shadow-sm")}>
                                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center font-black text-sm italic shrink-0", order.status === 'SHIPPED' ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>#{order.dailyOrderNumber}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-900 uppercase italic text-xs truncate mb-1">{order.deliveryOrder?.name || 'Cliente'}</h4>
                                        <div className="flex items-center gap-1 text-slate-400"><MapPin size={10}/><p className="text-[9px] font-bold truncate uppercase">{order.deliveryOrder?.address}</p></div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-300"/>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2 italic"><History size={12}/> Concluídas Hoje</h3>
                        {history.length === 0 ? (
                            <div className="py-20 text-center opacity-20"><CheckCircle size={48} className="mx-auto mb-4"/><p className="text-[10px] font-black uppercase">Nenhuma entrega finalizada ainda</p></div>
                        ) : history.map(order => (
                            <Card key={order.id} className="p-5 border-slate-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-start border-b pb-3">
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase italic text-xs leading-none">Pedido #{order.dailyOrderNumber}</h4>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{new Date(order.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-emerald-600 italic leading-none">R$ {order.total.toFixed(2)}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase mt-1">RECEBIDO</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Forma de Pagamento:</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Dinheiro', 'Pix', 'Cartão'].map(method => {
                                            const isActive = order.deliveryOrder?.paymentMethod === method || (order.deliveryOrder?.paymentMethod?.toLowerCase().includes('cart') && method === 'Cartão');
                                            return (
                                                <button 
                                                    key={method}
                                                    onClick={() => handleUpdatePayment(order.id, method)}
                                                    className={cn("py-2 rounded-lg text-[8px] font-black uppercase transition-all border-2", isActive ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200")}
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

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <Card className="p-8 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl mx-auto flex items-center justify-center text-slate-400"><User size={40}/></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{authUser?.name}</h3>
                                <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-2 italic">Entregador Profissional</p>
                            </div>
                        </Card>
                        <Button fullWidth variant="danger" onClick={logout} className="h-14 rounded-2xl uppercase font-black italic text-[10px] tracking-widest gap-2 shadow-xl shadow-rose-900/10"><LogOut size={18}/> ENCERRAR SESSÃO</Button>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-100 flex items-center justify-around px-6 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                {[
                    { id: 'home', icon: Home, label: 'Início' },
                    { id: 'history', icon: History, label: 'Histórico' },
                    { id: 'profile', icon: User, label: 'Perfil' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setView('list'); }}
                        className={cn("flex flex-col items-center gap-1.5 transition-all", activeTab === tab.id ? "text-orange-500" : "text-slate-300")}
                    >
                        <div className={cn("p-2 rounded-xl transition-all", activeTab === tab.id ? "bg-orange-50" : "bg-transparent")}>
                            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 3 : 2} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DriverDashboard;
