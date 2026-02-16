import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Utensils, Pizza, Wallet, Users, BarChart3, 
    Package, LayoutDashboard, Settings, ShieldCheck, 
    Share2, Truck, Star, History, DollarSign, 
    Layers, ClipboardList, Tag, FileText, 
    Clock, MapPin, Users2, Ticket, Calculator,
    Receipt, Warehouse, MoveHorizontal, ShoppingCart,
    Bell, UserCog, Database, Building2, ChefHat, ListOrdered, Search, CreditCard, Monitor, Maximize2,
    MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { usePermission } from '../hooks/usePermission';

interface NavItem {
    label: string;
    path: string;
    icon: any;
    color?: string;
}

interface NavCategory {
    title: string;
    icon: any;
    items: NavItem[];
}

interface NavigationLauncherProps {
    isOpen: boolean;
    onClose: () => void;
}

const NavigationLauncher: React.FC<NavigationLauncherProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { hasPermission, isSuperAdmin } = usePermission();

    const categories: NavCategory[] = [
        {
            title: "Super Admin",
            icon: ShieldCheck,
            items: isSuperAdmin ? [
                { label: "Painel Global", path: "/super-admin", icon: LayoutDashboard },
                { label: "Gerenciar Franquias", path: "/super-admin/franchises", icon: Share2 },
                { label: "Gerenciar Lojas", path: "/super-admin/restaurants", icon: Database },
                { label: "Permissões Globais", path: "/super-admin/permissions", icon: ShieldCheck },
            ] : []
        },
        {
            title: "Gestão de Franquia",
            icon: Share2,
            items: hasPermission('reports:view_all') ? [
                { label: "Minhas Lojas", path: "/franchise/my-restaurants", icon: Database },
                { label: "Relatórios da Rede", path: "/franchise/reports", icon: BarChart3 },
            ] : []
        },
        {
            title: "Vendas & Operacional",
            icon: ShoppingCart,
            items: [
                { label: "Monitor de Pedidos", path: "/orders", icon: ListOrdered, permission: 'orders:view' },
                { label: "PDV - Frente de Caixa", path: "/pos", icon: Calculator, permission: 'pos:access' },
                { label: "KDS - Monitor de Cozinha", path: "/kds", icon: ChefHat, permission: 'kds:view' },
                { label: "Checklists & Rotinas", path: "/checklists", icon: ClipboardList, permission: 'orders:view' },
                { label: "Terminal do Garçom", path: "/waiter", icon: Utensils, permission: 'waiter:pos' },
            ].filter(item => hasPermission(item.permission))
        },
        {
            title: "Cardápio",
            icon: Utensils,
            items: [
                { label: "Cardápio", path: "/products", icon: Pizza, permission: 'products:view' },
                { label: "Categorias", path: "/categories", icon: Layers, permission: 'categories:manage' },
                { label: "Tamanhos Globais", path: "/global-sizes", icon: Maximize2, permission: 'products:manage' },
                { label: "Complementos", path: "/addons", icon: ListOrdered, permission: 'products:manage' },
                { label: "Promoções", path: "/promotions", icon: Tag, permission: 'products:manage' },
            ].filter(item => hasPermission(item.permission))
        },
        {
            title: "Financeiro",
            icon: DollarSign,
            items: [
                { label: "Acerto de Entregadores", path: "/drivers/settlement", icon: Truck, permission: 'driver_settlement:manage' },
                { label: "Acerto de Garçons", path: "/waiters/settlement", icon: Users2, permission: 'waiter_settlement:manage' },
                { label: "Categorias Financeiras", path: "/financial/categories", icon: ListOrdered, permission: 'financial_categories:manage' },
                { label: "Contas Bancárias", path: "/financial/bank-accounts", icon: Building2, permission: 'bank_accounts:manage' },
                { label: "Fluxo de Caixa", path: "/financial", icon: Wallet, permission: 'financial:view' },
                { label: "Formas de Pagamento", path: "/payment-methods", icon: CreditCard, permission: 'financial:manage' },
                { label: "Fornecedores", path: "/financial/suppliers", icon: Users2, permission: 'suppliers:manage' },
                { label: "Frentes de Caixa", path: "/cashier", icon: Calculator, permission: 'cashier:manage' },
                { label: "Lançamentos Financeiros", path: "/financial/entries", icon: Receipt, permission: 'financial:manage' },
                { label: "Fiscal (NFC-e)", path: "/fiscal", icon: Monitor, permission: 'settings:manage' },
            ].filter(item => hasPermission(item.permission))
        },
        {
            title: "Relacionamento com cliente",
            icon: Users,
            items: [
                { label: "Cadastro de Clientes", path: "/customers", icon: UserCog, permission: 'orders:view' },
                { label: "Cupons de Desconto", path: "/coupons", icon: Ticket, permission: 'products:manage' },
            ].filter(item => hasPermission(item.permission))
        },
        {
            title: "Relatórios",
            icon: FileText,
            items: [
                { label: "Cupons Gerados", path: "/reports/coupons", icon: Ticket, permission: 'reports:view' },
                { label: "Desempenho por Atendente", path: "/reports/staff", icon: Users2, permission: 'reports:performance' },
                { label: "Desempenho por Garçom", path: "/reports/waiters", icon: Users2, permission: 'reports:performance' },
                { label: "DRE Gerencial", path: "/reports/dre", icon: Calculator, permission: 'reports:financial' },
                { label: "Faturamento por Dia", path: "/reports/billing", icon: BarChart3, permission: 'reports:view' },
                { label: "Itens Consumidos", path: "/reports/consumed-items", icon: ClipboardList, permission: 'reports:view' },
                { label: "Itens Vendidos", path: "/reports/items", icon: ClipboardList, permission: 'reports:view' },
                { label: "Tempo de Produção", path: "/reports/production", icon: Clock, permission: 'reports:view' },
                { label: "Tempo por Status", path: "/reports/status-time", icon: Clock, permission: 'reports:view' },
                { label: "Vendas por Área de Entrega", path: "/reports/delivery-areas", icon: MapPin, permission: 'reports:view' },
                                {label: "Vendas por Forma de Pagamento", path: "/reports/payments", icon: CreditCard, permission: 'reports:view' },
                                { label: "Vendas por Período", path: "/reports/period", icon: BarChart3, permission: 'reports:view' },
                                { label: "Mapa Geográfico de Vendas", path: "/reports/sales-map", icon: MapPin, permission: 'reports:view' },
                            ].filter(item => hasPermission(item.permission))
                        },
                        {
                            title: "Estoque",
                            icon: Warehouse,
                            items: [
                                { label: "Análise e Simulação de CMV", path: "/stock/cmv", icon: Calculator, permission: 'reports:abc' },
                                { label: "Ficha Técnica", path: "/products", icon: FileText, permission: 'products:manage' },
                                { label: "Grupos de Ingrediente", path: "/ingredients/groups", icon: Layers, permission: 'stock:manage' },
                                { label: "Histórico de Posição de Estoque", path: "/stock/history", icon: History, permission: 'stock:view' },
                                { label: "Ingredientes e Insumos", path: "/ingredients", icon: Package, permission: 'stock:manage' },
                                { label: "Lista de Compras", path: "/stock/shopping-list", icon: ShoppingCart, permission: 'stock:manage' },
                                { label: "Movimentações de Estoque", path: "/stock/moves", icon: MoveHorizontal, permission: 'stock:manage' },
                                { label: "Notas de Entrada", path: "/stock/invoices", icon: Receipt, permission: 'stock:manage' },
                                { label: "Ordem de Compra", path: "/stock/purchase-orders", icon: ClipboardList, permission: 'stock:manage' },
                            ].filter(item => hasPermission(item.permission))
                        },
                        {
                            title: "Dashboards",
                            icon: LayoutDashboard,
                            items: [
                                { label: "Acompanhamento de Vendas", path: "/dashboard", icon: BarChart3, permission: 'reports:view' },
                                { label: "Canais", path: "/dashboard/channels", icon: Share2, permission: 'reports:view' },
                                { label: "Faturamento", path: "/dashboard/billing", icon: DollarSign, permission: 'reports:view' },
                                { label: "Vendas por Data / Hora", path: "/dashboard/hourly", icon: Clock, permission: 'reports:view' },
                                { label: "Mapa Geográfico", path: "/reports/sales-map", icon: MapPin, permission: 'reports:view' },
                            ].filter(item => hasPermission(item.permission))
                        },
        {
            title: "Opções da Loja",
            icon: Settings,
            items: [
                { label: "Áreas de Entrega", path: "/settings/delivery-zones", icon: MapPin, permission: 'settings:manage' },
                { label: "Canais de Venda e Integrações", path: "/integrations", icon: Share2, permission: 'integrations:manage' },
                { label: "Comandas", path: "/tables", icon: LayoutDashboard, permission: 'table:manage' },
                { label: "Configurações", path: "/settings/general", icon: Settings, permission: 'settings:manage' },
                { label: "Dados da Loja", path: "/settings", icon: Database, permission: 'settings:view' },
                { label: "Dados Fiscais", path: "/fiscal", icon: ShieldCheck, permission: 'settings:manage' },
                { label: "Entregadores", path: "/drivers", icon: Truck, permission: 'driver_settlement:manage' },
                { label: "Garçons", path: "/auth/waiters", icon: Users2, permission: 'waiter_settlement:manage' },
                { label: "Mesas", path: "/tables", icon: LayoutDashboard, permission: 'table:manage' },
                { label: "Modelos de Impressão", path: "/settings/printing", icon: FileText, permission: 'integrations:manage' },
                { label: "Motivos de Cancelamento", path: "/settings/cancellation-reasons", icon: X, permission: 'settings:manage' },
                { label: "Status da Venda", path: "/settings/sale-status", icon: Star, permission: 'settings:manage' },
                { label: "Turnos", path: "/settings/shifts", icon: Clock, permission: 'settings:manage' },
                { label: "Usuários e Permissões", path: "/users", icon: ShieldCheck, permission: 'users:manage' },
                { label: "WhatsApp & IA", path: "/whatsapp", icon: MessageSquare, permission: 'settings:manage' },
            ].filter(item => hasPermission(item.permission))
        }
    ];

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => 
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] overflow-hidden flex items-center justify-center p-4 sm:p-8">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />

                    {/* Central Menu Container */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                    >
                        {/* Top Barra de Busca e Header */}
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50">
                            <div className="flex-1 w-full relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Procurar ferramenta..." 
                                    className="ui-input w-full pl-12 h-12"
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 transition-all shadow-sm">
                                    <Bell size={20} />
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Corpo do Menu - Grid de Categorias */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-12">
                                
                                {/* Coluna Especial: Favoritos & Histórico */}
                                {searchQuery === '' && (
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-orange-600">
                                                <Star size={16} className="fill-current" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest">Favoritos</h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 italic">Seus atalhos.</p>
                                                <button className="text-[10px] font-black uppercase text-orange-600 hover:underline">+ Adicionar</button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <History size={16} />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest">Histórico</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Pedidos Recentes<br/>Caixa Aberto</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {filteredCategories.map((cat, idx) => (
                                    <div key={idx} className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                                            <div className="p-1.5 bg-slate-100 rounded text-slate-600">
                                                <cat.icon size={16} />
                                            </div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest">
                                                {cat.title}
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {cat.items.map((item, iIdx) => (
                                                <button
                                                    key={iIdx}
                                                    onClick={() => handleNavigate(item.path)}
                                                    className="group flex items-center gap-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-all text-left"
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-slate-200 group-hover:bg-orange-600 group-hover:scale-125 transition-all" />
                                                    <span className="group-hover:translate-x-1 transition-transform">
                                                        {item.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer / Info */}
                        <div className="px-10 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingCart size={12} className="text-orange-600" /> Kicardapio v2.5.0
                            </p>
                            <div className="flex gap-4">
                                <button className="text-[9px] font-black uppercase text-slate-400 hover:text-orange-600 transition-colors">Suporte</button>
                                <button className="text-[9px] font-black uppercase text-slate-400 hover:text-orange-600 transition-colors">Docs</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NavigationLauncher;