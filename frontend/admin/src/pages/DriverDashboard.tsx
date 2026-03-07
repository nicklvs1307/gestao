import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft,
    ShoppingCart, Maximize2, Minimize2, History, Home, User, CreditCard, DollarSign, RefreshCw, Power, Radio
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
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente de Mapa de Apoio (Centralizado na Nossa API)
const DeliveryMap: React.FC<{
    orderId: string; 
    customerCoords: [number, number]; 
    restaurantCoords: [number, number]; 
    currentLocation: [number, number] | null;
    route: [number, number][];
}> = ({ orderId, customerCoords, restaurantCoords, currentLocation, route }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<{ restaurant?: L.Marker; customer?: L.Marker; driver?: L.Marker; }>({});
    const polylineRef = useRef<L.Polyline | null>(null);

    useEffect(() => {
        if (!mapRef.current || leafletInstance.current) return;
        const center = currentLocation || restaurantCoords || [-23.5505, -46.6333];
        const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(center, 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
        leafletInstance.current = map;
        return () => { if (leafletInstance.current) { leafletInstance.current.remove(); leafletInstance.current = null; } };
    }, []);

    useEffect(() => {
        const map = leafletInstance.current;
        if (!map) return;

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

        if (restaurantCoords) {
            if (markersRef.current.restaurant) markersRef.current.restaurant.setLatLng(restaurantCoords);
            else markersRef.current.restaurant = L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(map);
        }

        if (customerCoords) {
            if (markersRef.current.customer) markersRef.current.customer.setLatLng(customerCoords);
            else markersRef.current.customer = L.marker(customerCoords, { icon: customerIcon }).addTo(map);
        }

        if (currentLocation) {
            if (markersRef.current.driver) markersRef.current.driver.setLatLng(currentLocation);
            else markersRef.current.driver = L.marker(currentLocation, { icon: driverIcon }).addTo(map);
        }

        if (polylineRef.current) map.removeLayer(polylineRef.current);
        if (route && route.length > 0) {
            polylineRef.current = L.polyline(route, { color: '#f97316', weight: 6, opacity: 0.8, lineJoin: 'round' }).addTo(map);
            map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        }
        
        map.invalidateSize();
    }, [orderId, customerCoords, restaurantCoords, currentLocation, route]);

    return <div ref={mapRef} className="w-full h-full min-h-[300px]" />;
};

const DriverDashboard: React.FC = () => {
    const { logout, user: authUser } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [orders, setOrders] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    
    // Geolocation & Routing
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const [customerCoords, setCustomerCoords] = useState<[number, number] | null>(null);
    const [restaurantCoords, setRestaurantCoords] = useState<[number, number] | null>(null);
    const [route, setRoute] = useState<[number, number][]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isRouting, setIsRouting] = useState(false);

    // Financeiro Rápido
    const [cashToDeliver, setCashToDeliver] = useState(0);
    const [earnedFees, setEarnedFees] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
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
        if (activeTab === 'profile') return;
        try {
            if (activeTab === 'home') {
                const res = await api.get('/driver/orders');
                setOrders(res.data);
            } else if (activeTab === 'history') {
                const res = await api.get('/driver/history');
                const data = res.data;
                setHistory(data);
                
                // Cálculo Financeiro (Denso para o ERP)
                const cash = data.reduce((acc: number, o: any) => {
                    const method = o.deliveryOrder?.paymentMethod?.toLowerCase() || '';
                    return (method.includes('dinheiro') || method.includes('cash')) ? acc + o.total : acc;
                }, 0);
                const fees = data.length * (authUser?.bonusPerDelivery || 5); // Fallback se não houver taxa fixa
                setCashToDeliver(cash);
                setEarnedFees(fees);
            }

            const settingsRes = await api.get('/settings');
            if (settingsRes.data?.latitude) {
                setRestaurantCoords([settingsRes.data.latitude, settingsRes.data.longitude]);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleInternalGeocode = async (address: string) => {
        setIsGeocoding(true);
        try {
            const res = await api.post('/driver/geocode', { address });
            setIsGeocoding(false);
            return [res.data.lat, res.data.lng] as [number, number];
        } catch (e) {
            setIsGeocoding(false);
            return null;
        }
    };

    const handleInternalRoute = async (endCoords: [number, number]) => {
        setIsRouting(true);
        const start = currentLocation || restaurantCoords || [-23.5505, -46.6333];
        try {
            const res = await api.post('/driver/route', { start, end: endCoords });
            setRoute(res.data.route);
            setIsMapExpanded(true);
        } catch (e) {
            toast.error("Erro ao traçar rota interna.");
        } finally {
            setIsRouting(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/status`, { status });
            toast.success(status === 'SHIPPED' ? "Saiu para entrega!" : "Entregue com sucesso!");
            loadData();
            if (status === 'COMPLETED') setView('list');
        } catch (error) { toast.error("Erro ao atualizar status."); }
    };

    if (view === 'detail' && selectedOrder) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-20 animate-in slide-in-from-right duration-300">
                {/* Header Compacto Detalhe */}
                <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
                    <button onClick={() => { setView('list'); setRoute([]); setIsMapExpanded(false); }} className="p-2 bg-white/5 rounded-xl text-white active:scale-90 transition-transform"><ChevronLeft/></button>
                    <div className="text-center">
                        <h2 className="font-black italic text-sm tracking-tighter uppercase leading-none">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em]">{selectedOrder.status}</span>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center text-orange-500 bg-orange-500/10 rounded-xl"><Package size={20}/></div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Mapa Dinâmico */}
                    <Card className={cn("p-0 overflow-hidden border-none shadow-2xl relative bg-slate-900 transition-all duration-500", isMapExpanded ? "fixed inset-0 z-[150] rounded-none h-full" : "h-[35vh] rounded-[2rem]")}>
                        {isGeocoding ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-orange-500" size={32} /><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Localizando Cliente...</span></div>
                        ) : (customerCoords) ? (
                            <div className="w-full h-full relative">
                                <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords || [-23.5505, -46.6333]} currentLocation={currentLocation} route={route} />
                                <div className="absolute top-4 right-4 z-[1000]">
                                    <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="w-12 h-12 bg-white text-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100">{isMapExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                                </div>
                                {isMapExpanded && (
                                    <div className="absolute bottom-6 left-6 right-6 z-[1000] flex gap-2">
                                        <Button onClick={() => setIsMapExpanded(false)} variant="secondary" className="flex-1 h-14 rounded-2xl bg-white text-slate-900 uppercase font-black text-[10px]">FECHAR</Button>
                                        <Button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.join(',')}&destination=${customerCoords?.join(',')}`, '_blank')} className="flex-[2] h-14 rounded-2xl bg-slate-800 uppercase font-black text-[10px]"><Navigation size={18} className="mr-2"/>GOOGLE MAPS</Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3 opacity-30"><AlertCircle size={32}/><p className="text-[10px] font-black uppercase tracking-widest">Aguardando Coordenadas</p></div>
                        )}
                    </Card>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Cliente & Endereço</p>
                            <h3 className="font-black text-lg text-white uppercase italic leading-tight mb-2 tracking-tighter">{selectedOrder.deliveryOrder?.name}</h3>
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin size={14} className="text-orange-500" />
                                <p className="text-xs font-bold leading-none">{selectedOrder.deliveryOrder?.address}</p>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                <Button onClick={async () => {
                                    let coords = customerCoords;
                                    if (!coords) coords = await handleInternalGeocode(selectedOrder.deliveryOrder?.address);
                                    if (coords) { setCustomerCoords(coords); handleInternalRoute(coords); }
                                    else toast.error("Erro ao localizar cliente.");
                                }} isLoading={isRouting} className="flex-1 h-12 rounded-xl bg-orange-500 text-white font-black text-[10px] uppercase gap-2 italic shadow-lg shadow-orange-500/20"><Radio size={16}/> TRAÇAR ROTA INTERNA</Button>
                                {selectedOrder.deliveryOrder?.phone && (
                                    <a href={`tel:${selectedOrder.deliveryOrder.phone}`} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white"><Phone size={18}/></a>
                                )}
                            </div>
                        </div>

                        <div className="p-5 bg-slate-900 rounded-[1.5rem] flex items-center justify-between border border-white/5">
                            <div>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Pagamento ({selectedOrder.deliveryOrder?.paymentMethod})</p>
                                <h4 className="text-2xl font-black text-white italic tracking-tighter">R$ {selectedOrder.total.toFixed(2)}</h4>
                            </div>
                            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><DollarSign size={20}/></div>
                        </div>

                        <div className="pt-2">
                            {selectedOrder.status === 'READY' ? (
                                <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-2xl bg-white text-slate-900 font-black uppercase text-[10px] tracking-[0.2em] italic shadow-2xl"><Bike size={20} className="mr-3"/> ASSUMIR ENTREGA</Button>
                            ) : (
                                <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} className="h-16 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] italic shadow-2xl"><CheckCircle size={20} className="mr-3"/> CONFIRMAR RECEBIMENTO</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-32">
            {/* TERMINAL HEADER - DENSE */}
            <header className="px-6 py-8 border-b border-white/5 sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg", isOnline ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-800 text-slate-500 shadow-none")}>
                            <Power size={24} onClick={() => setIsOnline(!isOnline)} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter">Cockpit Delivery</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{isOnline ? 'Pronto para entregas' : 'Pausado / Offline'}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={loadData} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 active:rotate-180 transition-transform"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
                </div>
            </header>

            {/* FINANCE DASH - DENSE */}
            <div className="px-4 -mt-6 relative z-[101] max-w-lg mx-auto grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl shadow-2xl">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Dinheiro em Mão</p>
                    <h3 className="text-xl font-black italic text-emerald-400 tracking-tighter">R$ {cashToDeliver.toFixed(2)}</h3>
                </div>
                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl shadow-2xl">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Comissões Hoje</p>
                    <h3 className="text-xl font-black italic text-orange-500 tracking-tighter">R$ {earnedFees.toFixed(2)}</h3>
                </div>
            </div>

            <main className="p-4 pt-8 space-y-6 max-w-lg mx-auto animate-in fade-in duration-500">
                {activeTab === 'home' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Pedidos em Rota / Fila</h3>
                            <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-full">{orders.length}</span>
                        </div>
                        
                        {orders.length === 0 ? (
                            <div className="py-20 text-center opacity-10 flex flex-col items-center">
                                <Radio size={64} className="mb-4"/>
                                <p className="text-[10px] font-black uppercase tracking-widest">Aguardando novos pedidos...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {orders.map(order => (
                                    <div 
                                        key={order.id} 
                                        onClick={() => { 
                                            setSelectedOrder(order); 
                                            setView('detail');
                                            setCustomerCoords(null);
                                            // Busca coordenadas pela nossa API interna
                                            handleInternalGeocode(order.deliveryOrder?.address).then(setCustomerCoords);
                                        }}
                                        className={cn(
                                            "p-4 rounded-[1.5rem] flex items-center gap-4 transition-all active:scale-[0.98] border cursor-pointer",
                                            order.status === 'SHIPPED' ? "bg-white text-slate-900 border-white shadow-xl" : "bg-white/5 text-white border-white/5"
                                        )}
                                    >
                                        <div className={cn("h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0", order.status === 'SHIPPED' ? "bg-slate-900 text-white" : "bg-white/10 text-slate-400")}>
                                            <span className="text-lg font-black italic tracking-tighter">#{order.dailyOrderNumber}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black uppercase italic text-xs truncate leading-none mb-1.5 tracking-tighter">{order.deliveryOrder?.name}</h4>
                                            <p className="text-[9px] font-bold truncate uppercase opacity-50 tracking-tight">{order.deliveryOrder?.address}</p>
                                        </div>
                                        <ChevronRight size={20} className={order.status === 'SHIPPED' ? "text-orange-500" : "text-slate-700"} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">Relatório de Turno</h3>
                        </div>
                        <div className="space-y-2">
                            {history.map(order => (
                                <div key={order.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><CheckCircle size={14}/></div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase italic tracking-tighter">#{order.dailyOrderNumber} • {order.deliveryOrder?.name}</h4>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase">{order.deliveryOrder?.paymentMethod}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black italic tracking-tighter text-emerald-400">R$ {order.total.toFixed(2)}</span>
                                </tr>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6 pt-4">
                        <div className="p-10 bg-white text-slate-900 rounded-[2.5rem] text-center space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500" />
                            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] mx-auto flex items-center justify-center text-slate-400 border-4 border-slate-50"><User size={40}/></div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">{authUser?.name}</h3>
                                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">Terminal ID: {authUser?.id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>
                        <Button fullWidth variant="danger" onClick={logout} className="h-14 rounded-2xl uppercase font-black italic text-[10px] tracking-widest gap-2"><LogOut size={18}/> ENCERRAR EXPEDIENTE</Button>
                    </div>
                )}
            </main>

            {/* DENSE BOTTOM NAV */}
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950 border-t border-white/5 flex items-center justify-around px-8 z-[200]">
                {[
                    { id: 'home', icon: Radio, label: 'Cockpit' },
                    { id: 'history', icon: History, label: 'Acerto' },
                    { id: 'profile', icon: Smartphone, label: 'Conta' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setView('list'); }}
                            className={cn("flex flex-col items-center gap-1.5 transition-all duration-300", isActive ? "text-orange-500 scale-110" : "text-slate-600")}
                        >
                            <tab.icon size={22} strokeWidth={isActive ? 3 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default DriverDashboard;