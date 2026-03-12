import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    TrendingUp, TrendingDown, AlertTriangle, Package, 
    Layers, ShoppingCart, Hammer, ClipboardList, 
    ArrowUpRight, ArrowDownLeft, Disc, History, Archive,
    Calculator, Scale, Warehouse
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { motion } from 'framer-motion';

const StockDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>({
        totalValue: 0,
        criticalItems: [],
        recentMoves: [],
        topConsumed: [],
        activeIngredients: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [ingRes, moveRes] = await Promise.all([
                api.get('/ingredients'),
                api.get('/stock/moves').catch(() => ({ data: [] }))
            ]);
            
            const ings = ingRes.data;
            const value = ings.reduce((acc: number, i: any) => acc + (i.stock * (i.averageCost || 0)), 0);
            const critical = ings.filter((i: any) => i.stock <= (i.minStock || 0)).slice(0, 5);
            
            setStats({
                totalValue: value,
                criticalItems: critical,
                recentMoves: moveRes.data.slice(0, 5),
                activeIngredients: ings.length
            });
        } catch (error) {
            console.error("Erro ao carregar dashboard de estoque");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            {/* GRID PRINCIPAL DE KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-white border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Warehouse size={20} />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Ativo Circulante</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Valor em Almoxarifado</p>
                        <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">
                            R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                </Card>

                <Card className="p-5 bg-white border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all border-l-4 border-l-rose-500">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Ruptura</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Itens em Alerta Crítico</p>
                        <h3 className="text-2xl font-black text-rose-600 italic tracking-tighter leading-none">
                            {stats.criticalItems.length} SKUs
                        </h3>
                    </div>
                </Card>

                <Card className="p-5 bg-white border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Giro</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Eficiência de Compra</p>
                        <h3 className="text-2xl font-black text-emerald-600 italic tracking-tighter leading-none">94%</h3>
                    </div>
                </Card>

                <Card className="p-5 bg-white border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all border-l-4 border-l-slate-900">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                            <Archive size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Mix</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Mix de Insumos Ativos</p>
                        <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">
                            {stats.activeIngredients} Itens
                        </h3>
                    </div>
                </Card>
            </div>

            {/* SEÇÃO ANALÍTICA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ITENS PARA REPOSIÇÃO IMEDIATA */}
                <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/40">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Reposição Imediata (Ruptura)</h3>
                        </div>
                        <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {stats.criticalItems.length === 0 ? (
                                    <tr><td className="p-10 text-center text-slate-400 font-bold italic text-xs uppercase tracking-widest">Estoque saudável. Sem rupturas.</td></tr>
                                ) : stats.criticalItems.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">{item.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Estoque Atual: {item.stock} {item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest bg-rose-100 px-2 py-0.5 rounded-full">Falta: {(item.minStock || 0) - item.stock} {item.unit}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Mínimo: {item.minStock}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <button className="w-full text-center text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline">Ver lista completa de compras</button>
                    </div>
                </Card>

                {/* ÚLTIMAS MOVIMENTAÇÕES */}
                <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/40">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                            <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Log de Movimentações Recentes</h3>
                        </div>
                        <History size={18} className="text-blue-500" />
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-50">
                                {stats.recentMoves.length === 0 ? (
                                    <tr><td className="p-10 text-center text-slate-400 font-bold italic text-xs uppercase tracking-widest">Nenhuma movimentação registrada hoje.</td></tr>
                                ) : stats.recentMoves.map((move: any) => (
                                    <tr key={move.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                                                    move.type === 'IN' ? "bg-emerald-500" : move.type === 'OUT' ? "bg-rose-500" : "bg-blue-500"
                                                )}>
                                                    {move.type === 'IN' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter">{move.ingredient?.name || 'Insumo'}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(move.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "text-[11px] font-black italic tracking-tighter",
                                                move.type === 'IN' ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {move.type === 'IN' ? '+' : '-'}{move.quantity} {move.ingredient?.unit}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <button className="w-full text-center text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline">Auditar extrato completo</button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default StockDashboard;
