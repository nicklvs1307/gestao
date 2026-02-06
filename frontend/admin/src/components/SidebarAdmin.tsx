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
  Scale,
  Monitor,
  Puzzle,
  Landmark,
  CreditCard
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
                { name: 'KDS (Cozinha)', path: '/kds', icon: Monitor }, 
                { name: 'Pedidos', path: '/orders', icon: ShoppingBag },
            ]
        },
        {
            title: 'CARDÁPIO',
            items: [
                { name: '1. Categorias', path: '/categories', icon: List },
                { name: '2. Complementos', path: '/addons', icon: Puzzle },
                { name: '3. Produtos', path: '/products', icon: UtensilsCrossed },
                { name: '4. Promoções', path: '/promotions', icon: Percent },
                { name: 'Mesas & QR Code', path: '/tables', icon: Armchair },
            ]
        },
        {
            title: 'FINANCEIRO',
            items: [
                { name: 'Movimentações', path: '/financial/entries', icon: DollarSign },
                { name: 'Contas Bancárias', path: '/financial/bank-accounts', icon: Landmark },
                { name: 'Categorias Fin.', path: '/financial/categories', icon: List },
                { name: 'Fornecedores', path: '/financial/suppliers', icon: Users },
                { name: 'Formas de Pagamento', path: '/payment-methods', icon: CreditCard },
                { name: 'Fiscal (NFC-e)', path: '/fiscal', icon: FileText },
            ]
        },
        {
            title: 'PESSOAS & GESTÃO',
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
                        className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:block shadow-2xl border-r border-white/5",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0a0a]">
                    <div className="flex items-center justify-center w-full">
                       <img src={logoImg} alt="Kicardapio" className="h-10 w-auto object-contain brightness-110" />
                    </div>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar scroll-smooth">
                    {menuGroups.map((group) => (
                        <div key={group.title} className="px-4 space-y-1">
                            <h3 className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">{group.title}</h3>
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => onClose()}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200",
                                        isActive 
                                            ? "bg-orange-600/10 text-orange-500 shadow-sm" 
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon size={16} className={cn("transition-colors", isActive ? "text-orange-500" : "text-slate-500")} />
                                    <span>{item.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
                    <button 
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-black bg-white/5 hover:bg-red-600/20 text-slate-400 hover:text-red-500 transition-all border border-white/5"
                    >
                        <LogOut size={16} />
                        <span>ENCERRAR SESSÃO</span>
                    </button>
                    <p className="text-center text-[9px] text-slate-600 mt-4 uppercase font-bold tracking-widest opacity-50">
                        KiCardapio &copy; 2026
                    </p>
                </div>
            </motion.aside>
        </>
    );
};

export default SidebarAdmin;
