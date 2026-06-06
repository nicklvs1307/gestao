import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    Package, Archive, Layers, ShoppingCart, 
    ClipboardList, AlertTriangle, Database, 
    ChefHat, Calculator, History, MoveHorizontal,
    Receipt, LayoutDashboard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

const StockLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalValue: 0, itemsInShortage: 0, activeIngredients: 0 });

    useEffect(() => {
        loadStockStats();
    }, [location.pathname]);

    const loadStockStats = async () => {
        try {
            const res = await api.get('/ingredients');
            const ings = res.data;
            const value = ings.reduce((acc: number, i: any) => acc + (i.stock * (i.averageCost || 0)), 0);
            const shortage = ings.filter((i: any) => i.stock <= (i.minStock || 0)).length;
            setStats({ totalValue: value, itemsInShortage: shortage, activeIngredients: ings.length });
        } catch (error) {
            console.error("Erro ao carregar estatísticas do estoque");
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Painel', path: '/stock/dashboard', icon: LayoutDashboard },
        { id: 'cmv', label: 'CMV', path: '/stock/cmv', icon: Calculator },
        { id: 'fichas', label: 'Fichas Técnicas', path: '/stock/fichas', icon: ChefHat },
        { id: 'ingredient-groups', label: 'Grupos', path: '/stock/ingredient-groups', icon: Layers },
        { id: 'history', label: 'Histórico', path: '/stock/history', icon: History },
        { id: 'ingredients', label: 'Insumos', path: '/stock/ingredients', icon: Package },
        { id: 'shopping-list', label: 'Compras', path: '/stock/shopping-list', icon: ShoppingCart },
        { id: 'moves', label: 'Movimentações', path: '/stock/moves', icon: MoveHorizontal },
        { id: 'invoices', label: 'Notas de Entrada', path: '/stock/invoices', icon: Receipt },
        { id: 'purchase-orders', label: 'Ordens de Compra', path: '/stock/purchase-orders', icon: ClipboardList },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* MINI DASHBOARD */}
            <div className="flex flex-wrap gap-3 w-full">
                <Card className="flex-1 min-w-[200px] p-3 border-slate-100 flex items-center gap-3 bg-white shadow-sm">
                    <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                        <Archive size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Patrimônio</p>
                        <p className="text-sm font-black text-slate-900 italic">R$ {(stats?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </Card>
                <Card className="flex-1 min-w-[160px] p-3 border-slate-100 flex items-center gap-3 bg-white shadow-sm">
                    <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Críticos</p>
                        <p className="text-sm font-black text-rose-600 italic">{stats.itemsInShortage} em falta</p>
                    </div>
                </Card>
                <Card className="flex-1 min-w-[160px] p-3 border-slate-100 flex items-center gap-3 bg-white shadow-sm">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Package size={18} />
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Insumos</p>
                        <p className="text-sm font-black text-blue-600 italic">{stats.activeIngredients} ativos</p>
                    </div>
                </Card>
            </div>

            {/* NAV TABS */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/50 shadow-inner">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || 
                        (item.path !== '/stock/dashboard' && location.pathname.startsWith(item.path));
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider",
                                isActive 
                                    ? "bg-white text-slate-900 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            )}
                        >
                            <item.icon size={14} className={cn(isActive ? "text-blue-500" : "text-slate-400")} />
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO */}
            <div>
                <Outlet />
            </div>
        </div>
    );
};

export default StockLayout;
