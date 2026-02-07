import React from 'react';
import logoImg from '../assets/logo.png';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  List, 
  Percent, 
  Armchair, 
  BarChart3, 
  Settings, 
  Plug, 
  Users, 
  Store,
  Truck,
  LogOut,
  X,
  DollarSign,
  FileText,
  Wallet,
  Monitor,
  Puzzle,
  Landmark,
  CreditCard,
  ChefHat
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface SidebarAdminProps {
    isOpen: boolean;
    onClose: () => void;
}

const SidebarAdmin: React.FC<SidebarAdminProps> = ({ isOpen, onClose }) => {
    const { logout } = useAuth();
    
    const menuGroups = [
        {
            title: 'OPERACIONAL',
            items: [
                { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
                { name: 'Caixa (Turnos)', path: '/cashier', icon: Wallet },
                { name: 'PDV (Vendas)', path: '/pos', icon: Store },
                { name: 'KDS (Cozinha)', path: '/kds', icon: ChefHat }, 
                { name: 'Pedidos', path: '/orders', icon: ShoppingBag },
            ]
        },
        {
            title: 'CARDÁPIO',
            items: [
                { name: 'Categorias', path: '/categories', icon: List },
                { name: 'Complementos', path: '/addons', icon: Puzzle },
                { name: 'Produtos', path: '/products', icon: UtensilsCrossed },
                { name: 'Promoções', path: '/promotions', icon: Percent },
                { name: 'Mesas & QR Code', path: '/tables', icon: Armchair },
            ]
        },
        {
            title: 'FINANCEIRO',
            items: [
                { name: 'Fluxo de Caixa', path: '/financial', icon: DollarSign },
                { name: 'Lançamentos', path: '/financial/entries', icon: FileText },
                { name: 'Contas Bancárias', path: '/financial/bank-accounts', icon: Landmark },
                { name: 'Formas de Pagamento', path: '/payment-methods', icon: CreditCard },
                { name: 'Fiscal (NFC-e)', path: '/fiscal', icon: Monitor },
            ]
        },
        {
            title: 'GESTÃO',
            items: [
                { name: 'Clientes', path: '/customers', icon: Users },
                { name: 'Usuários (Equipe)', path: '/users', icon: Users },
                { name: 'Comissão Garçom', path: '/waiters/settlement', icon: DollarSign },
                { name: 'Entregadores', path: '/drivers', icon: Truck },
                { name: 'Relatórios', path: '/reports', icon: BarChart3 },
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { name: 'Integrações', path: '/integrations', icon: Plug }, 
                { name: 'Configurações', path: '/settings', icon: Settings },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-[70] w-64 bg-[#0f172a] text-slate-300 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:block border-r border-slate-800 shadow-2xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header Branding */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50 bg-[#0f172a]">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                          <img src={logoImg} alt="Logo" className="w-7 h-7 object-contain brightness-0 invert" />
                       </div>
                       <span className="font-black text-white italic tracking-tighter text-lg">KICARDÁPIO</span>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto py-6 no-scrollbar custom-scrollbar">
                    {menuGroups.map((group) => (
                        <div key={group.title} className="px-4 mb-8">
                            <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 opacity-50">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => onClose()}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 group relative",
                                            isActive 
                                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                        )}
                                    >
                                        <item.icon size={18} className={cn("transition-colors shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                                        <span>{item.name}</span>
                                        {/* Indicador de Active lateral sutil */}
                                        {/* {isActive && <div className="absolute left-0 w-1 h-5 bg-white rounded-r-full" />} */}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Profile / Logout Section */}
                <div className="p-4 border-t border-slate-800/50 bg-[#0f172a]">
                    <button 
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-black text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    >
                        <LogOut size={18} />
                        <span>SAIR DO SISTEMA</span>
                    </button>
                    <div className="mt-4 px-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">v2.5.0</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-500/50 uppercase">Online</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default SidebarAdmin;