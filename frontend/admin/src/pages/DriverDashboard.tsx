import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft,
    ShoppingCart, Maximize2, Minimize2, History, Home, User, CreditCard, DollarSign, RefreshCw, Power, Radio,
    Truck, ListFilter, PlayCircle
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

// Componente de Mapa de Apoio
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
            html: `<div class="bg-primary p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
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
    const [homeSubTab, setHomeSubTab] = useState<'my' | 'queue'>('my');
    
    const [myOrders, setMyOrders] = useState<any[]>([]);
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
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

    // Financeiro
    const [cashToDeliver, setCashToDeliver] = useState(0);
    const [earnedFees, setEarnedFees] = useState(0);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
                null, { enableHighAccuracy: true }
            );
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 20000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const loadData = async () => {
        if (activeTab === 'profile') return;
        try {
            if (activeTab === 'home') {
                const res = await api.get('/driver/orders');
                setMyOrders(res.data.myOrders);
                setAvailableOrders(res.data.availableOrders);
            } else if (activeTab === 'history') {
                const res = await api.get('/driver/history');
                const data = res.data;
                setHistory(data);
                
                const cash = data.reduce((acc: number, o: any) => {
                    const method = o.deliveryOrder?.paymentMethod?.toLowerCase() || '';
                    return (method.includes('dinheiro') || method.includes('cash')) ? acc + o.total : acc;
                }, 0);
                const fees = data.length * (authUser?.bonusPerDelivery || 5);
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

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/status`, { status });
            toast.success(status === 'SHIPPED' ? "Saiu para entrega!" : status === 'COMPLETED' ? "Entregue!" : "Pedido vinculado!");
            loadData();
            if (status === 'COMPLETED') setView('list');
        } catch (error) { toast.error("Erro ao atualizar status."); }
    };

    const handleInternalGeocode = async (address: string) => {
        setIsGeocoding(true);
        try {
            const res = await api.post('/driver/geocode', { address });
            setIsGeocoding(false);
            return [res.data.lat, res.data.lng] as [number, number];
        } catch (e) { setIsGeocoding(false); return null; }
    };

    const handleInternalRoute = async (endCoords: [number, number]) => {
        setIsRouting(true);
        const start = currentLocation || restaurantCoords || [-23.5505, -46.6333];
        try {
            const res = await api.post('/driver/route', { start, end: endCoords });
            setRoute(res.data.route);
            setIsMapExpanded(true);
        } catch (e) { toast.error("Erro ao traçar rota."); } finally { setIsRouting(false); }
    };

    const handleUpdatePayment = async (orderId: string, method: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/payment-method`, { method });
            toast.success("Pagamento atualizado!");
            loadData();
        } catch (e) { toast.error("Erro ao atualizar."); }
    };

    if (view === 'detail' && selectedOrder) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-20">
                <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
                    <button onClick={() => { setView('list'); setRoute([]); setIsMapExpanded(false); }} className="p-2 bg-white/5 rounded-xl"><ChevronLeft/></button>
                    <div className="text-center">
                        <h2 className="font-black italic text-sm tracking-tighter uppercase leading-none">Pedido #{selectedOrder.dailyOrderNumber}</h2>
                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{selectedOrder.status}</span>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center text-primary bg-primary/10 rounded-xl"><Package size={20}/></div>
                </div>

                <div className="p-4 space-y-4">
                    <Card className={cn("p-0 overflow-hidden border-none shadow-2xl relative bg-slate-900 transition-all duration-500", isMapExpanded ? "fixed inset-0 z-[150] rounded-none h-full" : "h-[35vh] rounded-[2rem]")}>
                        {isGeocoding ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                        ) : customerCoords ? (
                            <div className="w-full h-full relative">
                                <DeliveryMap orderId={selectedOrder.id} customerCoords={customerCoords} restaurantCoords={restaurantCoords || [-23.5505, -46.6333]} currentLocation={currentLocation} route={route} />
                                <div className="absolute top-4 right-4 z-[1000]"><button onClick={() => setIsMapExpanded(!isMapExpanded)} className="w-10 h-10 bg-white text-slate-900 rounded-xl shadow-xl flex items-center justify-center">{isMapExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button></div>
                            </div>
                        ) : <div className="h-full flex items-center justify-center opacity-30"><AlertCircle size={32}/></div>}
                    </Card>

                    <div className="space-y-3">
                        <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">Endereço</p>
                            <h3 className="font-black text-lg text-white uppercase italic tracking-tighter">{selectedOrder.deliveryOrder?.name}</h3>
                            <p className="text-xs font-bold text-muted-foreground mt-2">{selectedOrder.deliveryOrder?.address}</p>
                            
                            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                <Button onClick={async () => {
                                    let coords = customerCoords;
                                    if (!coords) coords = await handleInternalGeocode(selectedOrder.deliveryOrder?.address);
                                    if (coords) { setCustomerCoords(coords); handleInternalRoute(coords); }
                                }} isLoading={isRouting} className="flex-1 h-12 rounded-xl bg-primary text-[10px] uppercase font-black italic"><Radio size={16} className="mr-2"/> ROTA</Button>
                                {selectedOrder.deliveryOrder?.phone && <a href={`tel:${selectedOrder.deliveryOrder.phone}`} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Phone size={18}/></a>}
                            </div>
                        </div>

                        <div className="p-5 bg-slate-900 rounded-[1.5rem] flex items-center justify-between border border-white/5">
                            <div><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic">A Receber</p><h4 className="text-2xl font-black text-white italic tracking-tighter">R$ {selectedOrder.total.toFixed(2)}</h4></div>
                            <span className="text-[10px] font-black text-primary uppercase px-3 py-1 bg-primary/10 rounded-full">{selectedOrder.deliveryOrder?.paymentMethod}</span>
                        </div>

                        <div className="pt-2">
                            {selectedOrder.status === 'READY' && !selectedOrder.deliveryOrder?.driverId ? (
                                <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-2xl bg-white text-slate-900 font-black uppercase text-[10px] italic"><PlayCircle size={20} className="mr-3"/> VINCULAR E INICIAR</Button>
                            ) : selectedOrder.status === 'READY' ? (
                                <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')} className="h-16 rounded-2xl bg-white text-slate-900 font-black uppercase text-[10px] italic"><Bike size={20} className="mr-3"/> SAIR PARA ENTREGA</Button>
                            ) : (
                                <Button fullWidth onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} className="h-16 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[10px] italic"><CheckCircle size={20} className="mr-3"/> FINALIZAR ENTREGA</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-32">
            <header className="px-6 py-8 border-b border-white/5 sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isOnline ? "bg-emerald-500" : "bg-slate-800")}>
                            <Power size={24} onClick={() => setIsOnline(!isOnline)} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter">Cockpit Delivery</h1>
                            <p className="text-[8px] font-black text-muted-foreground uppercase mt-1.5">{isOnline ? 'Online para Entregas' : 'Pausado'}</p>
                        </div>
                    </div>
                    <button onClick={loadData} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/></button>
                </div>
            </header>

            <div className="px-4 -mt-6 relative z-[101] max-w-lg mx-auto grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl"><p className="text-[7px] font-black text-muted-foreground uppercase mb-1">Caixa (Mão)</p><h3 className="text-xl font-black italic text-emerald-400 tracking-tighter">R$ {cashToDeliver.toFixed(2)}</h3></div>
                <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl"><p className="text-[7px] font-black text-muted-foreground uppercase mb-1">Taxas</p><h3 className="text-xl font-black italic text-primary tracking-tighter">R$ {earnedFees.toFixed(2)}</h3></div>
            </div>

            <main className="p-4 pt-8 space-y-6 max-w-lg mx-auto">
                {activeTab === 'home' && (
                    <div className="space-y-4">
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                            <button onClick={() => setHomeSubTab('my')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all", homeSubTab === 'my' ? "bg-white text-slate-950 shadow-xl" : "text-muted-foreground")}>Minha Rota ({myOrders.length})</button>
                            <button onClick={() => setHomeSubTab('queue')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all", homeSubTab === 'queue' ? "bg-white text-slate-950 shadow-xl" : "text-muted-foreground")}>Fila (Disponíveis) ({availableOrders.length})</button>
                        </div>

                        <div className="space-y-2">
                            {(homeSubTab === 'my' ? myOrders : availableOrders).length === 0 ? (
                                <div className="py-20 text-center opacity-10 flex flex-col items-center"><Truck size={48} className="mb-2"/><p className="text-[10px] font-black uppercase tracking-widest">Nenhum pedido aqui</p></div>
                            ) : (
                                (homeSubTab === 'my' ? myOrders : availableOrders).map(order => (
                                    <div key={order.id} onClick={() => { setSelectedOrder(order); setView('detail'); handleInternalGeocode(order.deliveryOrder?.address).then(setCustomerCoords); }} className={cn("p-4 rounded-[1.5rem] flex items-center gap-4 border transition-all active:scale-[0.98] cursor-pointer", homeSubTab === 'my' ? "bg-white text-slate-900 border-white shadow-xl" : "bg-white/5 text-white border-white/5")}>
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", homeSubTab === 'my' ? "bg-slate-900 text-white" : "bg-white/10 text-muted-foreground")}><span className="text-lg font-black italic tracking-tighter">#{order.dailyOrderNumber}</span></div>
                                        <div className="flex-1 min-w-0"><h4 className="font-black uppercase italic text-xs truncate leading-none mb-1.5">{order.deliveryOrder?.name}</h4><p className="text-[9px] font-bold truncate opacity-50">{order.deliveryOrder?.address}</p></div>
                                        <ChevronRight size={20} className="opacity-20" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2"><h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] italic">Relatório de Turno</h3></div>
                        {history.map(order => (
                            <div key={order.id} className="p-5 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><CheckCircle size={18}/></div>
                                        <div><h4 className="text-xs font-black uppercase text-white italic">#{order.dailyOrderNumber} • {order.deliveryOrder?.name}</h4><p className="text-[8px] font-bold text-muted-foreground uppercase">{new Date(order.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                    </div>
                                    <span className="text-base font-black italic text-emerald-400">R$ {order.total.toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                                    {['Dinheiro', 'Pix', 'Cartão'].map(method => {
                                        const isActive = (order.deliveryOrder?.paymentMethod || '').toLowerCase().includes(method.toLowerCase()) || (order.deliveryOrder?.paymentMethod === 'Cartão' && method === 'Cartão');
                                        return <button key={method} onClick={() => handleUpdatePayment(order.id, method)} className={cn("h-9 rounded-xl text-[8px] font-black uppercase transition-all border", isActive ? "bg-white border-white text-slate-950" : "bg-white/5 border-white/5 text-muted-foreground")}>{method}</button>
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6 pt-4">
                        <div className="p-10 bg-white text-slate-900 rounded-[2.5rem] text-center space-y-4 shadow-2xl relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-2 bg-primary" /><div className="w-20 h-20 bg-slate-100 rounded-[2rem] mx-auto flex items-center justify-center text-muted-foreground border-4 border-slate-50"><User size={40}/></div><h3 className="text-xl font-black uppercase italic tracking-tighter">{authUser?.name}</h3><p className="text-[9px] font-black text-primary uppercase mt-1">ID: {authUser?.id.slice(-6).toUpperCase()}</p></div>
                        <Button fullWidth variant="danger" onClick={logout} className="h-14 rounded-2xl uppercase font-black italic text-[10px]"><LogOut size={18} className="mr-2"/> ENCERRAR EXPEDIENTE</Button>
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950 border-t border-white/5 flex items-center justify-around px-8 z-[200]">
                {[{ id: 'home', icon: Radio, label: 'Cockpit' }, { id: 'history', icon: History, label: 'Acerto' }, { id: 'profile', icon: Smartphone, label: 'Conta' }].map(tab => {
                    const isActive = activeTab === tab.id;
                    return <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setView('list'); }} className={cn("flex flex-col items-center gap-1.5 transition-all", isActive ? "text-primary scale-110" : "text-foreground/60")}><tab.icon size={22} strokeWidth={isActive ? 3 : 2} /><span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span></button>
                })}
            </nav>
        </div>
    );
};

export default DriverDashboard;