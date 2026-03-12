import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    Package, Archive, Layers, ShoppingCart, Hammer, 
    ClipboardList, Plus, AlertTriangle, TrendingDown, 
    Database, Search, Bell, X, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const StockLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalValue: 0, itemsInShortage: 0, activeIngredients: 0 });
    const [loading, setLoading] = useState(false);

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
        { id: 'dashboard', label: 'Painel Geral', path: '/stock/dashboard', icon: Layers, desc: 'Visão macro do estoque' },
        { id: 'ingredients', label: 'Insumos & Matéria-Prima', path: '/stock/ingredients', icon: Package, desc: 'Gestão de catálogo' },
        { id: 'purchases', label: 'Entradas de Notas', path: '/stock/purchases', icon: ShoppingCart, desc: 'Compras e fornecedores' },
        { id: 'production', label: 'Produção Interna', path: '/stock/production', icon: Hammer, desc: 'Fichas técnicas e processos' },
        { id: 'audit', label: 'Balanço & Inventário', path: '/stock/audit', icon: ClipboardList, desc: 'Controle de perdas e acertos' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* ERP STOCK HEADER - ALTA DENSIDADE */}
            <div className="flex flex-col xl:flex-row gap-6 items-start justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Database size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Módulo de Gestão de Ativos & Estoque</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
                        ERP <span className="text-blue-600">Inventory</span>
                    </h1>
                </div>

                {/* MINI DASHBOARD NO HEADER */}
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <Card className="flex-1 min-w-[200px] p-3 border-slate-100 flex items-center gap-4 bg-white shadow-sm">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Archive size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor do Patrimônio</p>
                            <p className="text-sm font-black text-slate-900 italic">R$ {(stats?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </Card>
                    <Card className="flex-1 min-w-[160px] p-3 border-slate-100 flex items-center gap-4 bg-white shadow-sm">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Itens Críticos</p>
                            <p className="text-sm font-black text-rose-600 italic">{stats.itemsInShortage} em falta</p>
                        </div>
                    </Card>
                    <Card className="flex-1 min-w-[160px] p-3 border-slate-100 flex items-center gap-4 bg-white shadow-sm">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Insumos Ativos</p>
                            <p className="text-sm font-black text-blue-600 italic">{stats.activeIngredients} cadastrados</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* NAV TABS - ESTILO MODULAR */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-[1.25rem] w-fit border border-slate-200/50 shadow-inner">
                {menuItems.map((item) => {
                    const isActive = location.pathname.includes(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "group relative px-5 py-3 rounded-xl transition-all flex items-center gap-3",
                                isActive 
                                    ? "bg-white text-slate-900 shadow-md scale-[1.02]" 
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            )}
                        >
                            <item.icon size={16} className={cn(isActive ? "text-blue-500" : "text-slate-400")} />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                                <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DINÂMICO */}
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default StockLayout;
