import React, { useState, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, Settings, User, Plus, ArrowRight, Building2, Wallet, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getAdminOrders, getTableRequests } from '../services/api';
import apiClient from '../services/api/client';
import { differenceInMinutes, differenceInHours } from 'date-fns';
import CashierActionModal from './CashierActionModal';
import { Button } from './ui/Button';

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

  const [currentRestaurant, setCurrentRestaurant] = useState<{name: string, logoUrl: string | null} | null>(null);

  const loadData = async () => {
      const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');
      
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
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
  }, [user?.restaurantId]);

  const displayLogo = currentRestaurant?.logoUrl || user?.logoUrl;
  const displayName = currentRestaurant?.name || 'Sua Unidade';

  return (
    <>
        <header className="bg-white/80 backdrop-blur-md h-16 px-6 flex items-center justify-between z-40 sticky top-0 border-b border-slate-200">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onMenuClick} 
                    className="bg-slate-50 border-slate-100"
                >
                    <Menu size={20} />
                </Button>
                
                <div className="hidden sm:block">
                    <h1 className="text-base font-black text-slate-900 italic uppercase tracking-tighter leading-none">{title}</h1>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* BOTÃO DE CAIXA */}
                {cashierStatus && (
                    <div className="relative hidden md:block">
                        <button 
                            onClick={() => setCashierDropdownOpen(!isCashierDropdownOpen)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm",
                                cashierStatus?.isOpen ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                            )}
                        >
                            <div className={cn("w-2 h-2 rounded-full", cashierStatus?.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                            {cashierStatus?.isOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
                        </button>

                        {isCashierDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setCashierDropdownOpen(false)} />
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{getCashierTimeStr() || 'Turno Encerrado'}</p>
                                        {cashierStatus?.isOpen && (
                                            <p className="text-base font-black text-slate-900 italic">R$ {cashierStatus.session.cashBalance?.toFixed(2) || '0.00'}</p>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <button onClick={() => { setCashierAction({ open: true, type: 'EXPENSE' }); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 uppercase transition-all">
                                            <ArrowRight size={16} className="rotate-180" /> Retirada / Sangria
                                        </button>
                                        <button onClick={() => { setCashierAction({ open: true, type: 'INCOME' }); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 uppercase transition-all">
                                            <Plus size={16} /> Reforço / Suprimento
                                        </button>
                                        <div className="h-[1px] bg-slate-100 my-2 mx-2" />
                                        <button onClick={() => { navigate('/cashier'); setCashierDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-[11px] font-black text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-3 uppercase transition-all">
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
                            "rounded-xl bg-slate-50 border-slate-100 relative", 
                            notifCount > 0 && "text-orange-600 border-orange-100 bg-orange-50"
                        )}
                    >
                        <Bell size={20} />
                        {notifCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                {notifCount}
                            </span>
                        )}
                    </Button>
                </div>

                {/* PERFIL */}
                <div className="relative ml-2">
                    <div 
                        onClick={() => setProfileOpen(!isProfileOpen)} 
                        className="flex items-center gap-3 cursor-pointer p-1 rounded-xl hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100"
                    >
                        <div className="text-right hidden lg:block">
                            <p className="text-xs font-black text-slate-900 leading-none italic uppercase tracking-tighter">{user?.name || 'Usuário'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest opacity-70">{displayName}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                            {displayLogo ? (
                                <img src={displayLogo.startsWith('http') ? displayLogo : `/api${displayLogo}`} alt="Empresa" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 size={20} className="text-slate-300" />
                            )}
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform mr-1", isProfileOpen && "rotate-180")} />
                    </div>
                    
                    {isProfileOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                            <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                <div className="p-2">
                                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                        <Settings size={18} className="text-slate-400" /> Configurações da Loja
                                    </Link>
                                    <Link to="/users" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                        <User size={18} className="text-slate-400" /> Meu Perfil
                                    </Link>
                                    <div className="h-[1px] bg-slate-50 my-1 mx-2" />
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