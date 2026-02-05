import React, { useState, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings, User, Plus, ArrowRight, BarChart3, CheckCircle, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getAdminOrders, getTableRequests } from '../services/api';
import apiClient from '../services/api/client';
import { differenceInMinutes, differenceInHours } from 'date-fns';
import logoImg from '../assets/logo.png';
import CashierActionModal from './CashierActionModal';

interface TopbarAdminProps {
  title: string;
  onMenuClick: () => void;
}

const TopbarAdmin: React.FC<TopbarAdminProps> = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  const [cashierStatus, setCashierStatus] = useState<any>(null);
  const [isCashierDropdownOpen, setCashierDropdownOpen] = useState(false);
  const [cashierAction, setCashierAction] = useState<{ open: boolean, type: 'INCOME' | 'EXPENSE' }>({ open: false, type: 'INCOME' });

  const [currentRestaurant, setCurrentRestaurant] = useState<{name: string, logoUrl: string | null} | null>(null);

  const loadData = async () => {
      const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');
      
      // Busca informações da loja atual (especialmente para SuperAdmin que muda contexto)
      if (selectedRestaurantId || user?.restaurantId) {
          try {
              const res = await apiClient.get('/settings');
              setCurrentRestaurant({
                  name: res.data.name,
                  logoUrl: res.data.logoUrl
              });
          } catch (e) { console.warn("Erro ao buscar dados da loja", e); }
      }

      if (user?.isSuperAdmin && !selectedRestaurantId) return;
      if (!user?.restaurantId && !selectedRestaurantId) return;

      try {
          const [orders, requests, cashierRes] = await Promise.all([
              getAdminOrders(),
              getTableRequests(),
              apiClient.get('/cashier/status')
          ]);
          const pending = orders.filter((o: any) => o.status === 'PENDING');
          setPendingOrders(pending);
          setPendingRequests(requests);
          setNotifCount(pending.length + requests.length);
          setCashierStatus(cashierRes.data);
      } catch (e) { console.warn(e); }
  };

  const getCashierTimeStr = () => {
      if (!cashierStatus?.session?.openedAt) return '';
      const now = new Date();
      const opened = new Date(cashierStatus.session.openedAt);
      const hours = differenceInHours(now, opened);
      const mins = differenceInMinutes(now, opened) % 60;
      return `Aberto há ${hours}h e ${mins < 10 ? '0'+mins : mins}min`;
  };

  useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 15000);
      return () => clearInterval(interval);
  }, [user?.restaurantId]);

  const displayLogo = currentRestaurant?.logoUrl || user?.logoUrl;
  const displayName = currentRestaurant?.name || 'Unidade';

  return (
    <>
        <header className="bg-white/95 backdrop-blur-md h-14 px-6 flex items-center justify-between z-40 sticky top-0 border-b border-slate-200 shadow-sm transition-all">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="p-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition-all">
                    <Menu size={18} />
                </button>
                <div className="h-8 w-auto cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <img src={logoImg} alt="Kicardapio" className="h-6 w-auto object-contain" />
                </div>
                <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
                <div className="hidden sm:block">
                    <h1 className="text-sm font-black text-slate-900 italic uppercase tracking-tighter leading-none">{title}</h1>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* BOTÃO DE CAIXA */}
                {(user?.restaurantId || localStorage.getItem('selectedRestaurantId')) && (
                    <div className="relative hidden md:block">
                        <button 
                            onClick={() => setCashierDropdownOpen(!isCashierDropdownOpen)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-widest shadow-sm",
                                cashierStatus?.isOpen ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cashierStatus?.isOpen ? "bg-emerald-500" : "bg-rose-500")} />
                            CAIXA - {user?.name || 'OPERADOR'}
                        </button>

                        {isCashierDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setCashierDropdownOpen(false)} />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2">
                                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getCashierTimeStr() || 'Caixa Fechado'}</p>
                                        {cashierStatus?.isOpen && (
                                            <p className="text-sm font-black text-slate-900 italic mt-1">Dinheiro em Caixa: R$ {cashierStatus.session.cashBalance?.toFixed(2) || '0.00'}</p>
                                        )}
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button onClick={() => { setCashierAction({ open: true, type: 'EXPENSE' }); setCashierDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase">
                                            <ArrowRight size={14} className="rotate-180 text-rose-500" /> Retirada (Sangria)
                                        </button>
                                        <button onClick={() => { setCashierAction({ open: true, type: 'INCOME' }); setCashierDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 uppercase">
                                            <Plus size={14} className="text-emerald-500" /> Reforço (Suprimento)
                                        </button>
                                        <button onClick={() => { navigate('/cashier'); setCashierDropdownOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-2 uppercase mt-2">
                                            <CheckCircle size={14} /> Fechar Caixa
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* NOTIFICAÇÕES */}
                <div className="relative">
                    <button onClick={() => setNotificationsOpen(!isNotificationsOpen)} className={cn(
                        "p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-transparent transition-all relative", 
                        notifCount > 0 && "text-primary border-primary/20 bg-orange-50"
                    )}>
                        <Bell size={18} />
                        {notifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">{notifCount}</span>}
                    </button>
                </div>

                {/* PERFIL (LOGO DA EMPRESA) */}
                <div className="relative">
                    <div onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center gap-3 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-slate-900 leading-none italic">{user?.name || 'Usuário'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{displayName}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                            {displayLogo ? (
                                <img src={displayLogo.startsWith('http') ? displayLogo : `${import.meta.env.VITE_API_URL || ''}${displayLogo}`} alt="Empresa" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 size={20} className="text-slate-300" />
                            )}
                        </div>
                        <ChevronDown size={12} className={cn("text-slate-400 transition-transform", isProfileOpen && "rotate-180")} />
                    </div>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-2">
                            <div className="p-2 space-y-0.5">
                                <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                    <Settings size={16} className="text-slate-400" /> Configurações da Loja
                                </Link>
                                <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest italic mt-1">
                                    <LogOut size={16} /> Encerrar Sessão
                                </button>
                            </div>
                        </div>
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
