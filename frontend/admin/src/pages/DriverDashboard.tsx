import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Bike, MapPin, Navigation, CheckCircle2, 
    Clock, Phone, ChevronRight, Package, 
    ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Fix para ícones do Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente de Mapa Nativo (Sem react-leaflet para estabilidade total)
const DeliveryMap: React.FC<{
    orderId: string;
    customerCoords: [number, number];
    restaurantCoords: [number, number];
    customerName: string;
    route: [number, number][];
}> = ({ orderId, customerCoords, restaurantCoords, customerName, route }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);
    const leafletInstance = React.useRef<L.Map | null>(null);

    React.useEffect(() => {
        if (!mapRef.current) return;

        // Inicializa o mapa
        leafletInstance.current = L.map(mapRef.current).setView(customerCoords, 15);

        // Adiciona a camada de tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletInstance.current);

        // Marcador do Restaurante
        L.marker(restaurantCoords)
            .addTo(leafletInstance.current)
            .bindPopup('Restaurante');

        // Marcador do Cliente
        L.marker(customerCoords)
            .addTo(leafletInstance.current)
            .bindPopup(customerName || 'Destino')
            .openPopup();

        // Desenha a rota se existir
        if (route && route.length > 0) {
            L.polyline(route, { color: 'blue', weight: 5 }).addTo(leafletInstance.current);
        }

        // Cleanup ao desmontar ou trocar de pedido
        return () => {
            if (leafletInstance.current) {
                leafletInstance.current.remove();
                leafletInstance.current = null;
            }
        };
    }, [orderId, route]); // Re-executa se o pedido ou a rota mudarem

    return (
        <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />
    );
};

const DriverDashboard: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState<[number, number][]>([]);
    const [view, setView] = useState<'list' | 'detail'>('list');
    
    // Estados para coordenadas dinâmicas
    const [customerCoords, setCustomerCoords] = useState<[number, number] | null>(null);
    const [restaurantCoords, setRestaurantCoords] = useState<[number, number]>([-23.5505, -46.6333]);
    const [restaurantCity, setRestaurantCity] = useState('');
    const [isGeocoding, setIsGeocoding] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Função para transformar endereço em coordenadas (Geocoding) com foco local
    const geocodeAddress = async (address: string, isRestaurant = false): Promise<[number, number] | null> => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY;
        if (!apiKey || !address) return null;

        try {
            // Se não for o restaurante, adicionamos a cidade e o foco
            const searchQuery = isRestaurant ? address : `${address}, ${restaurantCity}`;
            const focusParams = !isRestaurant && restaurantCoords 
                ? `&focus.point.lon=${restaurantCoords[1]}&focus.point.lat=${restaurantCoords[0]}`
                : '';

            const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(searchQuery)}&boundary.country=BR&size=1${focusParams}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lon, lat] = data.features[0].geometry.coordinates;
                return [lat, lon];
            }
        } catch (e) {
            console.error("Erro no Geocoding:", e);
        }
        return null;
    };

    const loadOrders = async () => {
        try {
            const res = await api.get('/driver/orders');
            setOrders(res.data);
            
            // Carrega configurações para ter o endereço base
            const settingsRes = await api.get('/settings');
            const restAddress = settingsRes.data?.address || '';
            
            if (restAddress) {
                // Tenta extrair a cidade (geralmente após a vírgula do número ou bairro)
                const parts = restAddress.split(',');
                if (parts.length > 2) {
                    setRestaurantCity(parts[parts.length - 1].trim());
                }
                
                const coords = await geocodeAddress(restAddress, true);
                if (coords) setRestaurantCoords(coords);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar entregas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    // Sempre que selecionar um pedido, busca as coordenadas do cliente
    useEffect(() => {
        if (selectedOrder && selectedOrder.deliveryOrder?.address) {
            setIsGeocoding(true);
            setCustomerCoords(null);
            setRoute([]);
            
            // Pega apenas a cidade/estado do endereço do restaurante para dar contexto
            // Assume que o endereço do restaurante termina com "Cidade - UF" ou similar
            const restContext = restaurantCoords ? "" : ""; // O foco já ajuda, mas vamos reforçar no texto
            const fullAddressSearch = `${selectedOrder.deliveryOrder.address}`;

            geocodeAddress(fullAddressSearch).then(coords => {
                if (coords) {
                    setCustomerCoords(coords);
                } else {
                    toast.error("Endereço não localizado com precisão.");
                }
                setIsGeocoding(false);
            });
        }
    }, [selectedOrder]);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        try {
            await api.patch(`/driver/orders/${orderId}/status`, { status });
            toast.success(status === 'SHIPPED' ? "Entrega iniciada!" : "Entrega concluída!");
            loadOrders();
            if (status === 'COMPLETED') setView('list');
        } catch (error) {
            toast.error("Erro ao atualizar status.");
        }
    };

    const getWaitTime = (createdAt: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
        return diff;
    };

    // Função para buscar rota no OpenRouteService
    const fetchRoute = async (destCoords: [number, number]) => {
        const apiKey = import.meta.env.VITE_OPENROUTE_KEY; 
        
        if (!apiKey || apiKey === 'SUA_KEY_AQUI') {
            toast.info("Chave da API de Mapas não configurada no arquivo .env");
            return;
        }

        try {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${restaurantCoords[1]},${restaurantCoords[0]}&end=${destCoords[1]},${destCoords[0]}`;
            const res = await fetch(url);
            const data = await res.json();
            const points = data.features[0].geometry.coordinates.map((p: any) => [p[1], p[0]]);
            setRoute(points);
        } catch (e) {
            console.error("Erro ao traçar rota", e);
        }
    };

    if (view === 'detail' && selectedOrder) {
        const dOrder = selectedOrder.deliveryOrder || {};

        return (
            <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
                {/* Header Detalhe */}
                <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setView('list'); setRoute([]); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="font-black text-lg leading-tight uppercase italic text-slate-900">Pedido #{selectedOrder.dailyOrderNumber || '---'}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                {dOrder.name || 'Cliente Geral'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mapa Dinâmico */}
                <div className="h-64 w-full shrink-0 relative border-b bg-slate-200 flex items-center justify-center">
                    {isGeocoding ? (
                        <div className="flex flex-col items-center gap-2">
                            <Timer className="animate-spin text-blue-600" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase">Localizando endereço...</p>
                        </div>
                    ) : customerCoords ? (
                        <>
                            <DeliveryMap 
                                orderId={selectedOrder.id}
                                customerCoords={customerCoords}
                                restaurantCoords={restaurantCoords}
                                customerName={dOrder.name}
                                route={route}
                            />
                            <button 
                                onClick={() => fetchRoute(customerCoords)}
                                className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-2xl shadow-xl z-[1000] flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider"
                            >
                                <Navigation size={14} /> Traçar Rota
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 p-8 text-center">
                            <AlertCircle className="text-red-400" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase">Não foi possível carregar o mapa para este endereço.</p>
                        </div>
                    )}
                </div>

                {/* Info Cliente */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                <MapPin size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço de Entrega</p>
                                <p className="text-sm font-bold text-slate-800 leading-snug mt-1">
                                    {dOrder.address || 'Endereço não informado'}
                                </p>
                                {dOrder.address && (
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dOrder.address)}`}
                                        target="_blank"
                                        className="text-blue-600 text-[10px] font-black uppercase mt-2 flex items-center gap-1"
                                    >
                                        Abrir no Google Maps <ExternalLink size={10} />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <Phone size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone de Contato</p>
                                <p className="text-lg font-black text-slate-800 mt-1">{dOrder.phone || 'N/A'}</p>
                                {dOrder.phone && (
                                    <a href={`tel:${dOrder.phone.replace(/\D/g, '')}`} className="text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1 mt-1">
                                        Ligar para Cliente
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Package size={14} /> Itens do Pedido
                        </h3>
                        <div className="space-y-3">
                            {(selectedOrder.items || []).map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-xs font-bold text-slate-700">
                                    <span className="truncate mr-4">{item.quantity}x {item.product?.name || 'Item'}</span>
                                    <span className="text-slate-400 shrink-0 font-black">R$ {(item.priceAtTime || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Total a Receber</span>
                            <span className="text-2xl font-black text-emerald-600 italic tracking-tighter">R$ {(selectedOrder.total + (dOrder.deliveryFee || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Ações */}
                <div className="p-6 bg-white border-t shrink-0">
                    {selectedOrder.status === 'READY' ? (
                        <button 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                            className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Bike size={20} /> Iniciar Entrega
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                            className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <CheckCircle2 size={20} /> Confirmar Entrega
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-4 pb-24 gap-6 max-w-lg mx-auto">
            {/* Header List */}
            <div className="flex justify-between items-end mt-4">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Entregas</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Monitor do Motoboy</p>
                </div>
                <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                    <Bike size={24} className="text-blue-600" />
                </div>
            </div>

            {/* Stats Rápidas */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-200">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Para Sair</p>
                    <p className="text-3xl font-black italic">{orders.filter(o => o.status === 'READY').length}</p>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg shadow-slate-200">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Em Trânsito</p>
                    <p className="text-3xl font-black italic">{orders.filter(o => o.status === 'SHIPPED').length}</p>
                </div>
            </div>

            {/* Lista de Pedidos */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Filas de Hoje
                </h3>

                {loading ? (
                    <div className="flex flex-col items-center py-12 gap-4">
                        <Timer size={40} className="text-slate-300 animate-spin" />
                        <p className="font-bold text-slate-400 text-sm uppercase">Buscando entregas...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                            <AlertCircle size={48} strokeWidth={1} />
                        </div>
                        <p className="font-black uppercase text-slate-400 text-xs tracking-widest">Nenhuma entrega disponível agora</p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const wait = getWaitTime(order.createdAt);
                        const isMyOrder = order.status === 'SHIPPED';

                        return (
                            <div 
                                key={order.id} 
                                onClick={() => { setSelectedOrder(order); setView('detail'); }}
                                className={cn(
                                    "bg-white rounded-[2rem] border-2 p-5 shadow-sm flex items-center gap-4 transition-all active:scale-95",
                                    isMyOrder ? "border-emerald-500" : "border-slate-100 hover:border-blue-200"
                                )}
                            >
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 font-black",
                                    isMyOrder ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                                )}>
                                    <span className="text-[8px] leading-none">PEDIDO</span>
                                    <span className="text-lg">#{order.dailyOrderNumber}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-slate-900 truncate uppercase text-sm italic">{order.deliveryOrder?.name || 'Cliente'}</h4>
                                        {wait > 30 && <span className="bg-red-100 text-red-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Atrasado</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5 uppercase tracking-tight leading-none">
                                        {order.deliveryOrder?.address}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                        <Timer size={12} /> {wait}m
                                    </div>
                                    <ChevronRight size={20} className="text-slate-300" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DriverDashboard;
