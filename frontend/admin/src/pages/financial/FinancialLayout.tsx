import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    Wallet, User, Disc, Building2, TrendingUp, TrendingDown, 
    DollarSign, Receipt, ArrowRightLeft, LayoutDashboard,
    ChevronRight, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

const FinancialLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });

    useEffect(() => {
        loadGlobalSummary();
    }, [location.pathname]);

    const loadGlobalSummary = async () => {
        try {
            const res = await api.get('/financial/transactions');
            const inc = res.data.summary.totalIncome;
            const exp = res.data.summary.totalExpense;
            setSummary({ totalIncome: inc, totalExpense: exp, balance: inc - exp });
        } catch (error) {
            console.error("Erro ao carregar resumo financeiro");
        }
    };

    const menuItems = [
        { id: 'entries', label: 'Fluxo de Caixa', path: '/financial/entries', icon: Wallet, desc: 'Lançamentos e extrato' },
        { id: 'categories', label: 'Plano de Contas', path: '/financial/categories', icon: Disc, desc: 'Categorização de DRE' },
        { id: 'suppliers', label: 'Fornecedores', path: '/financial/suppliers', icon: User, desc: 'Gestão de parceiros' },
        { id: 'bank-accounts', label: 'Contas & Bancos', path: '/financial/bank-accounts', icon: Building2, desc: 'Conciliação bancária' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* ERP HEADER - DENSIDADE DE INFORMAÇÃO */}
            <div className="flex flex-col xl:flex-row gap-6 items-start justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Módulo de Gestão Financeira</span>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none flex items-center gap-3">
                        ERP <span className="text-primary">Finance</span>
                    </h1>
                </div>

                {/* MINI DASHBOARD NO HEADER */}
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                    <div className="flex-1 min-w-[160px] bg-white border border-border p-3 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Entradas</p>
                            <p className="text-sm font-black text-emerald-600 italic">R$ {(summary?.totalIncome || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[160px] bg-white border border-border p-3 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                            <ArrowDownLeft size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Saídas</p>
                            <p className="text-sm font-black text-rose-600 italic">R$ {(summary?.totalExpense || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[180px] bg-slate-900 p-3 rounded-2xl shadow-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Saldo Real</p>
                            <p className="text-sm font-black text-white italic">R$ {(summary?.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* NAV TABS - ESTILO MODULAR */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-[1.25rem] w-fit border border-border/50 shadow-inner">
                {menuItems.map((item) => {
                    const isActive = location.pathname.includes(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "group relative px-5 py-3 rounded-xl transition-all flex items-center gap-3",
                                isActive 
                                    ? "bg-white text-foreground shadow-md scale-[1.02]" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                            )}
                        >
                            <item.icon size={16} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                                <span className="text-[7px] font-bold text-muted-foreground uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                    {item.desc}
                                </span>
                            </div>
                            {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
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

export default FinancialLayout;
