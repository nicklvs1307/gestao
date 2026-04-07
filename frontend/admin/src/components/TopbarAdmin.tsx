import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings, User, Plus, ArrowRight, Building2, Wallet, CheckCircle, Store, Monitor, ShoppingBag, Power, PowerOff, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getAdminOrders, getTableRequests } from '../services/api';
import apiClient from '../services/api/client';
import { getElapsedMinutes, getElapsedHours } from '@/lib/timezone';
import CashierActionModal from './CashierActionModal';
import { Button } from './ui/Button';
import { toast } from 'sonner';

interface TopbarAdminProps {
  title: string;
  onMenuClick: () => void;
}

const TopbarAdmin: React.FC<TopbarAdminProps> = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  
  const [cashierStatus, setCashierStatus] = useState<any>(null);
  const [isCashierDropdownOpen, setCashierDropdownOpen] = useState(false);
  const [cashierAction, setCashierAction] = useState<{ open: boolean, type: 'INCOME' | 'EXPENSE' }>({ open: false, type: 'INCOME' });

  const [currentRestaurant, setCurrentRestaurant] = useState<{name: string, logoUrl: string | null, slug?: string} | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isStoreLoading, setIsStoreLoading] = useState(false);

  // Ref para AbortController do polling
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const loadData = useCallback(async () => {
      cancelPendingRequests();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');

      if (selectedRestaurantId || user?.restaurantId) {
          try {
              const res = await apiClient.get('/settings', { signal });
              setCurrentRestaurant({
                  name: res.data.name,
                  logoUrl: res.data.logoUrl,
                  slug: res.data.slug
              });
              setIsStoreOpen(res.data.settings?.isOpen ?? false);
          } catch (e: any) {
              if (e.name !== 'AbortError') console.warn("Erro ao buscar dados da loja", e);
          }
      }

      if (user?.isSuperAdmin && !selectedRestaurantId) return;
      if (!user?.restaurantId && !selectedRestaurantId) return;

      try {
          const [orders, requests, cashierRes] = await Promise.all([
              getAdminOrders(),
              getTableRequests(),
              apiClient.get('/cashier/status', { signal })
          ]);
          const pending = orders.filter((o: any) => o.status === 'PENDING');
          setNotifCount(pending.length + requests.length);
          setCashierStatus(cashierRes.data);
      } catch (e: any) {
          if (e.name !== 'AbortError') console.warn(e);
      }
  }, [user?.restaurantId, cancelPendingRequests]);

  const toggleStoreStatus = async () => {
    try {
        setIsStoreLoading(true);
        const res = await apiClient.put('/settings/status', { isOpen: !isStoreOpen });
        setIsStoreOpen(res.data.isOpen);
        toast.success(res.data.isOpen ? "Loja aberta para novos pedidos!" : "Loja fechada para novos pedidos!");
    } catch (error) {
        console.error(error);
        toast.error("Erro ao alterar status da loja.");
    } finally {
        setIsStoreLoading(false);
    }
  };

  const getCashierTimeStr = () => {
      if (!cashierStatus?.session?.openedAt) return '';
      const hours = getElapsedHours(cashierStatus.session.openedAt);
      const mins = getElapsedMinutes(cashierStatus.session.openedAt) % 60;
      return `Aberto há ${hours}h e ${mins < 10 ? '0'+mins : mins}min`;
  };

  const handleCopyDeliveryLink = () => {
    let finalLink = '';
    const slug = currentRestaurant?.slug || user?.restaurantId || '';

    // Se o cliente salvou um domínio personalizado próprio e válido
    if (user?.menuUrl && !user.menuUrl.includes('localhost') && !user.menuUrl.includes('127.0.0.1')) {
      finalLink = user.menuUrl;
    } else if (window.location.hostname.includes('towersfy.com')) {
      // Regra específica para ambiente de produção padrão do KiCardápio / Towersfy
      finalLink = `https://${slug}.towersfy.com`;
    } else if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
      // Ambiente de desenvolvimento local
      finalLink = `http://localhost:5174/${slug}`;
    } else {
      // Outros ambientes em produção (gera subdomínio automático removendo o admin.)
      const baseHost = window.location.hostname.replace('admin.', '');
      finalLink = `https://${slug}.${baseHost}`;
    }

    finalLink = finalLink.endsWith('/') ? finalLink.slice(0, -1) : finalLink;

    navigator.clipboard.writeText(finalLink).then(() => {
      toast.success('Link do cardápio delivery copiado!');
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  };

  useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => {
          clearInterval(interval);
          cancelPendingRequests();
      };
  }, [loadData, cancelPendingRequests]);

  const displayLogo = currentRestaurant?.logoUrl || user?.logoUrl;
  const displayName = currentRestaurant?.name || 'Sua Unidade';

  return (
    <>
        <header className="bg-white/80 backdrop-blur-md h-16 px-6 flex items-center justify-between z-40 sticky top-0 border-b border-border">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onMenuClick} 
                    className="bg-background border-border"
                >
                    <Menu size={20} />
                </Button>
                
                <div className="hidden sm:block">
                    <h1 className="text-base font-black text-foreground italic uppercase tracking-tighter leading-none">{title}</h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* BOTÕES RÁPIDOS (STORE, POS, ORDERS) */}
                <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-border">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleStoreStatus}
                        isLoading={isStoreLoading}
                        className={cn(
                            "rounded-xl border-2 transition-all",
                            isStoreOpen ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100" : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                        )}
                        title={isStoreOpen ? "Loja Aberta (Clique para Fechar)" : "Loja Fechada (Clique para Abrir)"}
                    >
                        {isStoreOpen ? <Store size={20} /> : <PowerOff size={20} />}
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate('/pos')}
                        className="rounded-xl bg-background border-border text-foreground/60 hover:text-primary hover:border-primary/20 transition-all"
                        title="Ir para o PDV"
                    >
                        <Monitor size={20} />
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate('/orders')}
                        className="rounded-xl bg-background border-border text-foreground/60 hover:text-primary hover:border-primary/20 transition-all"
                        title="Gestor de Pedidos"
                    >
                        <ShoppingBag size={20} />
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleCopyDeliveryLink}
                        className="rounded-xl bg-background border-border text-foreground/60 hover:text-primary hover:border-primary/20 transition-all"
                        title="Copiar link do cardápio delivery"
                    >
                        <Link2 size={20} />
                    </Button>
                </div>

                {/* BOTÃO DE CAIXA */}
                {cashierStatus && (
                    <div className="relative hidden lg:block">
                        <button 
                            onClick={() => setCashierDropdownOpen(!isCashierDropdownOpen)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-widest shadow-sm",
                                cashierStatus?.isOpen ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                            )}
                        >
                            <div className={cn("w-2 h-2 rounded-full", cashierStatus?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                            {cashierStatus?.isOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
                        </button>

                        {isCashierDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setCashierDropdownOpen(false)} />
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-5 border-b border-border bg-background/50">
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">{getCashierTimeStr() || 'Turno Encerrado'}</p>
                                        {cashierStatus?.isOpen && (
                                            <p className="text-base font-black text-foreground italic">R$ {(cashierStatus.session?.cashBalance || 0).toFixed(2)}</p>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <button onClick={() => { setCashierAction({ open: true, type: 'EXPENSE' }); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-foreground/60 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 uppercase transition-all">
                                            <ArrowRight size={16} className="rotate-180" /> Retirada / Sangria
                                        </button>
                                        <button onClick={() => { setCashierAction({ open: true, type: 'INCOME' }); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-foreground/60 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 uppercase transition-all">
                                            <Plus size={16} /> Reforço / Suprimento
                                        </button>
                                        <div className="h-[1px] bg-border my-2 mx-2" />
                                        <button onClick={() => { navigate('/cashier'); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-black text-foreground bg-muted hover:bg-border flex items-center gap-3 uppercase transition-all">
                                            <CheckCircle size={16} /> Ir para Fechamento
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* NOTIFICAÇÕES */}
                <div className="relative">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "rounded-xl bg-background border-border relative", 
                            notifCount > 0 && "text-primary border-primary/10 bg-primary/5"
                        )}
                    >
                        <Bell size={20} />
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                {notifCount}
                            </span>
                        )}
                    </Button>
                </div>

                {/* PERFIL */}
                <div className="relative ml-2">
                    <div 
                        onClick={() => setProfileOpen(!isProfileOpen)} 
                        className="flex items-center gap-3 cursor-pointer p-1 rounded-xl hover:bg-background transition-all border-2 border-transparent hover:border-border"
                    >
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-black text-foreground leading-none italic uppercase tracking-tighter">{user?.name || 'Usuário'}</p>
                            <p className="text-xs font-bold text-muted-foreground uppercase mt-1 tracking-widest opacity-70">{displayName}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white border-2 border-border flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                            {displayLogo ? (
                                <img src={displayLogo.startsWith('http') ? displayLogo : `/api${displayLogo}`} alt="Empresa" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 size={20} className="text-muted-foreground/40" />
                            )}
                        </div>
                        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform mr-1", isProfileOpen && "rotate-180")} />
                    </div>
                    
                    {isProfileOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                            <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                <div className="p-2">
                                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-foreground/60 hover:bg-background transition-all">
                                        <Settings size={18} className="text-muted-foreground" /> Configurações da Loja
                                    </Link>
                                    <Link to="/users" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-foreground/60 hover:bg-background transition-all">
                                        <User size={18} className="text-muted-foreground" /> Meu Perfil
                                    </Link>
                                    <div className="h-[1px] bg-border my-1 mx-2" />
                                    <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-widest italic">
                                        <LogOut size={18} /> Encerrar Sessão
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>

        <CashierActionModal 
            isOpen={cashierAction.open} 
            onClose={() => setCashierAction({ ...cashierAction, open: false })}
            type={cashierAction.type}
            onSuccess={loadData}
        />
    </>
  );
};

export default TopbarAdmin;