import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bike, MapPin, Navigation, CheckCircle,
  Clock, Phone, ChevronRight, Package,
  ArrowLeft, ExternalLink, Timer, AlertCircle, LogOut, Loader2, Smartphone, Map as MapIcon, ChevronLeft,
  ShoppingCart, Maximize2, Minimize2, History, Home, User, CreditCard, DollarSign, RefreshCw, Power, Radio,
  Truck, ListFilter, PlayCircle, WifiOff, Wifi,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DeliveryMap } from '../components/DeliveryMap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { DriverOrder, DriverView, DriverTab, DriverHomeSubTab, Coords, DriverUser } from '../types';

// Default coords (São Paulo)
const DEFAULT_COORDS: Coords = [-23.5505, -46.6333];

// Skeleton component para loading states
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-white/10 rounded-xl', className)} />
);

const DriverDashboard: React.FC = () => {
  const { logout, user: authUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DriverTab>('home');
  const [view, setView] = useState<DriverView>('list');
  const [homeSubTab, setHomeSubTab] = useState<DriverHomeSubTab>('my');

  const [myOrders, setMyOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [history, setHistory] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isOnlineSyncing, setIsOnlineSyncing] = useState(false);
  const [isGeolocationDenied, setIsGeolocationDenied] = useState(false);

  // Geolocation & Routing
  const [currentLocation, setCurrentLocation] = useState<Coords | null>(null);
  const [customerCoords, setCustomerCoords] = useState<Coords | null>(null);
  const [restaurantCoords, setRestaurantCoords] = useState<Coords | null>(null);
  const [route, setRoute] = useState<Coords[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  // Financeiro
  const [cashToDeliver, setCashToDeliver] = useState(0);
  const [earnedFees, setEarnedFees] = useState(0);

  // Refs para cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const geolocationWatchIdRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancela requests pendentes
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Geolocation com cleanup correto
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsGeolocationDenied(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
        setIsGeolocationDenied(false);
      },
      (err) => {
        console.warn('Geolocalização indisponível:', err.message);
        setIsGeolocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    geolocationWatchIdRef.current = watchId;

    return () => {
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
    };
  }, []);

  // Sincroniza status online/offline com backend
  const syncOnlineStatus = useCallback(async (online: boolean) => {
    setIsOnlineSyncing(true);
    try {
      await api.patch('/driver/status', { isOnline: online });
      toast.success(online ? 'Você está online para entregas' : 'Status pausado');
    } catch {
      toast.error('Erro ao sincronizar status com servidor');
      // Reverte estado local em caso de erro
      setIsOnline(!online);
    } finally {
      setIsOnlineSyncing(false);
    }
  }, []);

  const handleToggleOnline = useCallback(() => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    syncOnlineStatus(newStatus);
  }, [isOnline, syncOnlineStatus]);

  // Carrega dados com AbortController
  const loadData = useCallback(async () => {
    if (activeTab === 'profile') return;

    cancelPendingRequests();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (activeTab === 'home') {
        const res = await api.get('/driver/orders', { signal: controller.signal });
        setMyOrders(res.data.myOrders || []);
        setAvailableOrders(res.data.availableOrders || []);
      } else if (activeTab === 'history') {
        const res = await api.get('/driver/history', { signal: controller.signal });
        const data = res.data || [];
        setHistory(data);

        const cash = data.reduce((acc: number, o: DriverOrder) => {
          const method = o.deliveryOrder?.paymentMethod?.toLowerCase() || '';
          return (method.includes('dinheiro') || method.includes('cash')) ? acc + o.total : acc;
        }, 0);
        const fees = data.length * ((authUser as DriverUser)?.bonusPerDelivery || 5);
        setCashToDeliver(cash);
        setEarnedFees(fees);
      }

      const settingsRes = await api.get('/settings', { signal: controller.signal });
      if (settingsRes.data?.latitude) {
        setRestaurantCoords([settingsRes.data.latitude, settingsRes.data.longitude]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, authUser, cancelPendingRequests]);

  useEffect(() => {
    setLoading(true);
    loadData();

    pollingIntervalRef.current = setInterval(loadData, 20000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      cancelPendingRequests();
    };
  }, [loadData, cancelPendingRequests]);

  const handleUpdateStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await api.patch(`/driver/orders/${orderId}/status`, { status });
      toast.success(
        status === 'SHIPPED' ? 'Saiu para entrega!' :
        status === 'COMPLETED' ? 'Entregue com sucesso!' : 'Pedido vinculado!'
      );
      loadData();
      if (status === 'COMPLETED') {
        setView('list');
        setRoute([]);
        setIsMapExpanded(false);
      }
    } catch {
      toast.error('Erro ao atualizar status. Tente novamente.');
    }
  }, [loadData]);

  const handleGeocode = useCallback(async (address: string): Promise<Coords | null> => {
    if (!address) return null;
    setIsGeocoding(true);
    try {
      const res = await api.post('/driver/geocode', { address });
      return [res.data.lat, res.data.lng] as Coords;
    } catch {
      toast.error('Endereço não localizado no mapa.');
      return null;
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleGetRoute = useCallback(async (endCoords: Coords) => {
    setIsRouting(true);
    const start = currentLocation || restaurantCoords || DEFAULT_COORDS;
    try {
      const res = await api.post('/driver/route', { start, end: endCoords });
      setRoute(res.data.route || []);
      setIsMapExpanded(true);
    } catch {
      toast.error('Erro ao traçar rota. Verifique sua conexão.');
    } finally {
      setIsRouting(false);
    }
  }, [currentLocation, restaurantCoords]);

  const handleUpdatePayment = useCallback(async (orderId: string, method: string) => {
    try {
      await api.patch(`/driver/orders/${orderId}/payment-method`, { method });
      toast.success('Forma de pagamento atualizada!');
      loadData();
    } catch {
      toast.error('Erro ao atualizar pagamento.');
    }
  }, [loadData]);

  const handleSelectOrder = useCallback(async (order: DriverOrder) => {
    setSelectedOrder(order);
    setView('detail');
    // Geocoding em background sem bloquear UI
    const address = order.deliveryOrder?.address;
    if (address) {
      const coords = await handleGeocode(address);
      if (coords) setCustomerCoords(coords);
    }
  }, [handleGeocode]);

  const handleBackToList = useCallback(() => {
    setView('list');
    setRoute([]);
    setIsMapExpanded(false);
    setCustomerCoords(null);
  }, []);

  const handleNavigateToRoute = useCallback(async () => {
    if (!selectedOrder) return;
    let coords = customerCoords;
    if (!coords) {
      coords = await handleGeocode(selectedOrder.deliveryOrder?.address || '');
      if (coords) setCustomerCoords(coords);
    }
    if (coords) handleGetRoute(coords);
  }, [selectedOrder, customerCoords, handleGeocode, handleGetRoute]);

  // Memo: orders da sub-tab ativa
  const activeOrders = useMemo(
    () => homeSubTab === 'my' ? myOrders : availableOrders,
    [homeSubTab, myOrders, availableOrders]
  );

  // Memo: stats do financeiro
  const financialStats = useMemo(() => ({
    cash: cashToDeliver,
    fees: earnedFees,
  }), [cashToDeliver, earnedFees]);

  // ============================================================
  // VIEW: DETALHE DO PEDIDO
  // ============================================================
  if (view === 'detail' && selectedOrder) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-20">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
          <button
            onClick={handleBackToList}
            className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Voltar para lista"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="font-black italic text-sm tracking-tighter uppercase leading-none">
              Pedido #{selectedOrder.dailyOrderNumber}
            </h2>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
              {selectedOrder.status}
            </span>
          </div>
          <div className="w-10 h-10 flex items-center justify-center text-primary bg-primary/10 rounded-xl">
            <Package size={20} />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Mapa */}
          <Card className={cn(
            "p-0 overflow-hidden border-none shadow-2xl relative bg-slate-900 transition-all duration-500",
            isMapExpanded ? "fixed inset-0 z-[150] rounded-none h-full" : "h-[40vh] rounded-[2rem]"
          )}>
            {isGeocoding ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Localizando endereço...</p>
              </div>
            ) : isGeolocationDenied ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <WifiOff size={32} className="text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground">Geolocalização indisponível</p>
                <p className="text-[10px] text-muted-foreground/60">Ative o GPS para ver a rota</p>
              </div>
            ) : customerCoords ? (
              <div className="w-full h-full relative">
                <DeliveryMap
                  orderId={selectedOrder.id}
                  customerCoords={customerCoords}
                  restaurantCoords={restaurantCoords || DEFAULT_COORDS}
                  currentLocation={currentLocation}
                  route={route}
                />
                <div className="absolute top-4 right-4 z-[1000]">
                  <button
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="w-10 h-10 bg-white text-slate-900 rounded-xl shadow-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                    aria-label={isMapExpanded ? 'Minimizar mapa' : 'Expandir mapa'}
                  >
                    {isMapExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-30">
                <MapIcon size={32} />
                <p className="text-[10px] font-bold uppercase tracking-widest">Toque em ROTA para ver o mapa</p>
              </div>
            )}
          </Card>

          {/* Info do Pedido */}
          <div className="space-y-3">
            {/* Endereço */}
            <div className="p-5 bg-white/5 rounded-[1.5rem] border border-white/5">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">Endereço</p>
              <h3 className="font-black text-lg text-white uppercase italic tracking-tighter">
                {selectedOrder.deliveryOrder?.name || 'Cliente'}
              </h3>
              <p className="text-xs font-bold text-muted-foreground mt-2">
                {selectedOrder.deliveryOrder?.address || 'Endereço não informado'}
              </p>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                <Button
                  onClick={handleNavigateToRoute}
                  isLoading={isRouting}
                  className="flex-1 h-12 rounded-xl bg-primary text-[10px] uppercase font-black italic"
                >
                  <Radio size={16} className="mr-2" /> ROTA
                </Button>
                {selectedOrder.deliveryOrder?.phone && (
                  <a
                    href={`tel:${selectedOrder.deliveryOrder.phone}`}
                    className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                    aria-label="Ligar para cliente"
                  >
                    <Phone size={18} />
                  </a>
                )}
              </div>
            </div>

            {/* Valor */}
            <div className="p-5 bg-slate-900 rounded-[1.5rem] flex items-center justify-between border border-white/5">
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest italic">A Receber</p>
                <h4 className="text-2xl font-black text-white italic tracking-tighter">
                  R$ {selectedOrder.total.toFixed(2)}
                </h4>
              </div>
              <span className="text-[10px] font-black text-primary uppercase px-3 py-1 bg-primary/10 rounded-full">
                {selectedOrder.deliveryOrder?.paymentMethod || 'Não definido'}
              </span>
            </div>

            {/* Botão de Ação */}
            <div className="pt-2">
              {selectedOrder.status === 'READY' && !selectedOrder.deliveryOrder?.driverId ? (
                <Button
                  fullWidth
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                  className="h-16 rounded-2xl bg-white text-slate-900 font-black uppercase text-[10px] italic"
                >
                  <PlayCircle size={20} className="mr-3" /> VINCULAR E INICIAR
                </Button>
              ) : selectedOrder.status === 'READY' ? (
                <Button
                  fullWidth
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                  className="h-16 rounded-2xl bg-white text-slate-900 font-black uppercase text-[10px] italic"
                >
                  <Bike size={20} className="mr-3" /> SAIR PARA ENTREGA
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                  className="h-16 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[10px] italic"
                >
                  <CheckCircle size={20} className="mr-3" /> FINALIZAR ENTREGA
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // VIEW: LISTA PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      {/* Header */}
      <header className="px-6 py-8 border-b border-white/5 sticky top-0 z-[100] bg-slate-950/80 backdrop-blur-xl">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              isOnline ? "bg-emerald-500" : "bg-slate-800"
            )}>
              {isOnlineSyncing ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Power size={24} onClick={handleToggleOnline} className="cursor-pointer" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter">Cockpit Delivery</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase mt-1.5 flex items-center gap-1.5">
                {isOnline ? (
                  <><Wifi size={12} className="text-emerald-400" /> Online para Entregas</>
                ) : (
                  <><WifiOff size={12} className="text-slate-500" /> Pausado</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Stats Financeiros */}
      <div className="px-4 -mt-6 relative z-[101] max-w-lg mx-auto grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-[7px] font-black text-muted-foreground uppercase mb-1">Caixa (Mão)</p>
              <h3 className="text-xl font-black italic text-emerald-400 tracking-tighter">
                R$ {financialStats.cash.toFixed(2)}
              </h3>
            </>
          )}
        </div>
        <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-[7px] font-black text-muted-foreground uppercase mb-1">Taxas</p>
              <h3 className="text-xl font-black italic text-primary tracking-tighter">
                R$ {financialStats.fees.toFixed(2)}
              </h3>
            </>
          )}
        </div>
      </div>

      <main className="p-4 pt-8 space-y-6 max-w-lg mx-auto">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5" role="tablist">
              <button
                onClick={() => setHomeSubTab('my')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all",
                  homeSubTab === 'my' ? "bg-white text-slate-950 shadow-xl" : "text-muted-foreground"
                )}
                role="tab"
                aria-selected={homeSubTab === 'my'}
              >
                Minha Rota ({myOrders.length})
              </button>
              <button
                onClick={() => setHomeSubTab('queue')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase italic transition-all",
                  homeSubTab === 'queue' ? "bg-white text-slate-950 shadow-xl" : "text-muted-foreground"
                )}
                role="tab"
                aria-selected={homeSubTab === 'queue'}
              >
                Fila (Disponíveis) ({availableOrders.length})
              </button>
            </div>

            {/* Lista de Pedidos */}
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-48" />
                      </div>
                      <Skeleton className="h-5 w-5 rounded" />
                    </div>
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="py-20 text-center opacity-10 flex flex-col items-center">
                  <Truck size={48} className="mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {homeSubTab === 'my' ? 'Nenhum pedido na sua rota' : 'Nenhum pedido disponível na fila'}
                  </p>
                </div>
              ) : (
                activeOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={cn(
                      "p-4 rounded-[1.5rem] flex items-center gap-4 border transition-all active:scale-[0.98] cursor-pointer",
                      homeSubTab === 'my'
                        ? "bg-white text-slate-900 border-white shadow-xl"
                        : "bg-white/5 text-white border-white/5"
                    )}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectOrder(order)}
                  >
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      homeSubTab === 'my' ? "bg-slate-900 text-white" : "bg-white/10 text-muted-foreground"
                    )}>
                      <span className="text-lg font-black italic tracking-tighter">#{order.dailyOrderNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black uppercase italic text-xs truncate leading-none mb-1.5">
                        {order.deliveryOrder?.name || 'Cliente'}
                      </h4>
                      <p className="text-[9px] font-bold truncate opacity-50">
                        {order.deliveryOrder?.address || 'Sem endereço'}
                      </p>
                    </div>
                    <ChevronRight size={20} className="opacity-20" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] italic">
                Relatório de Turno
              </h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-5 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center opacity-10 flex flex-col items-center">
                <History size={48} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma entrega concluída hoje</p>
              </div>
            ) : (
              history.map(order => (
                <div key={order.id} className="p-5 bg-white/5 rounded-[2rem] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <CheckCircle size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-white italic">
                          #{order.dailyOrderNumber} • {order.deliveryOrder?.name}
                        </h4>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">
                          {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-black italic text-emerald-400">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    {['Dinheiro', 'Pix', 'Cartão'].map(method => {
                      const isActive = (order.deliveryOrder?.paymentMethod || '').toLowerCase().includes(method.toLowerCase());
                      return (
                        <button
                          key={method}
                          onClick={() => handleUpdatePayment(order.id, method)}
                          className={cn(
                            "h-9 rounded-xl text-[8px] font-black uppercase transition-all border",
                            isActive
                              ? "bg-white border-white text-slate-950"
                              : "bg-white/5 border-white/5 text-muted-foreground"
                          )}
                        >
                          {method}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 pt-4">
            <div className="p-10 bg-white text-slate-900 rounded-[2.5rem] text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] mx-auto flex items-center justify-center text-muted-foreground border-4 border-slate-50">
                <User size={40} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">
                {(authUser as DriverUser)?.name || 'Entregador'}
              </h3>
              <p className="text-[9px] font-black text-primary uppercase mt-1">
                ID: {(authUser as DriverUser)?.id?.slice(-6).toUpperCase() || '---'}
              </p>
              {isGeolocationDenied && (
                <div className="flex items-center justify-center gap-2 text-amber-600 mt-2">
                  <WifiOff size={14} />
                  <p className="text-[9px] font-bold uppercase">GPS desativado</p>
                </div>
              )}
            </div>
            <Button
              fullWidth
              variant="danger"
              onClick={() => { logout(); navigate('/login'); }}
              className="h-14 rounded-2xl uppercase font-black italic text-[10px]"
            >
              <LogOut size={18} className="mr-2" /> ENCERRAR EXPEDIENTE
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-950 border-t border-white/5 flex items-center justify-around px-8 z-[200]" role="navigation" aria-label="Navegação principal">
        {[
          { id: 'home' as DriverTab, icon: Radio, label: 'Cockpit' },
          { id: 'history' as DriverTab, icon: History, label: 'Acerto' },
          { id: 'profile' as DriverTab, icon: Smartphone, label: 'Conta' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setView('list'); }}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all",
                isActive ? "text-primary scale-110" : "text-foreground/60"
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <tab.icon size={22} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default DriverDashboard;
