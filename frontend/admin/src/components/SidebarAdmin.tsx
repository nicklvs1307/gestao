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

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Caixa (Turnos)', path: '/cashier', icon: Wallet }, // Item Novo
    { name: 'PDV (Vendas)', path: '/pos', icon: Store },
    { name: 'KDS (Cozinha)', path: '/kds', icon: Monitor }, 
    { name: 'Pedidos', path: '/orders', icon: ShoppingBag },
    { name: 'Produtos', path: '/products', icon: UtensilsCrossed },
    { name: 'Insumos (Estoque)', path: '/ingredients', icon: Scale },
    { name: 'Cardápio (Cats)', path: '/categories', icon: List },
    { name: 'Promoções', path: '/promotions', icon: Percent },
    { name: 'Mesas', path: '/tables', icon: Armchair },
    { name: 'Relatórios', path: '/reports', icon: BarChart3 },
    { name: 'Financeiro', path: '/financial/entries', icon: DollarSign },
    { name: 'Contas Bancárias', path: '/financial/bank-accounts', icon: Landmark },
    { name: 'Cats Financeiras', path: '/financial/categories', icon: List },
    { name: 'Fornecedores', path: '/financial/suppliers', icon: Users },
    { name: 'Formas de Pagamento', path: '/payment-methods', icon: CreditCard },
    { name: 'Fiscal (NFC-e)', path: '/fiscal', icon: FileText },
    { name: 'Clientes', path: '/customers', icon: Users }, // Item Novo
    { name: 'Usuários', path: '/users', icon: Users },
    { name: 'Comissão Garçom', path: '/waiters/settlement', icon: DollarSign },
    { name: 'Entregadores', path: '/drivers', icon: Truck },
    { name: 'Acerto Motoboy', path: '/drivers/settlement', icon: Wallet },
    { name: 'Integrações', path: '/integrations', icon: Puzzle }, 
    { name: 'Configurações', path: '/settings', icon: Settings },
];

const SidebarAdmin: React.FC<SidebarAdminProps> = ({ isOpen, onClose }) => {
    const { logout } = useAuth();
    
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
                    "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:block shadow-xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="h-20 flex items-center justify-between px-6">
                    <div className="flex items-center justify-center w-full">
                       <img src={logoImg} alt="Kicardapio" className="h-10 w-auto object-contain" />
                    </div>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => onClose()}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-all duration-200 border-l-4",
                                isActive 
                                    ? "bg-orange-600 border-white text-white shadow-lg shadow-orange-900/20" 
                                    : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button 
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-900/20"
                    >
                        <LogOut size={18} />
                        <span>Fechar Loja (Sair)</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-600 mt-3 uppercase font-bold tracking-widest">
                        v2.4.0 Stable
                    </p>
                </div>
            </motion.aside>
        </>
    );
};

export default SidebarAdmin;
