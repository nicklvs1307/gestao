import React, { useState, useEffect } from 'react';
import { getStaffPerformance } from '../services/api';
import { 
    Users, TrendingUp, Award, Star, 
    Calendar, ChevronRight, UserCircle, Target, RefreshCw, Loader2, Trophy, ShoppingBag, DollarSign, ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

const StaffPerformance: React.FC = () => {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [staffData, setStaffData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getStaffPerformance(startDate, endDate);
            setStaffData(data);
        } catch (error) {
            toast.error("Erro ao buscar desempenho da equipe");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading && staffData.length === 0) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Auditando Performance da Equipe...</span>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-200"><Award size={32} /></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Ranking da Equipe</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Target size={12} className="text-orange-500" /> Produtividade e Conversão por Colaborador
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Calendar size={16} className="text-orange-500" />
                        <input type="date" className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <ChevronRight size={14} className="text-slate-300" />
                        <input type="date" className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <Button onClick={fetchData} size="sm" className="rounded-xl h-11 px-6 italic">FILTRAR</Button>
                    <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 bg-white" onClick={fetchData}><RefreshCw size={18} className={cn(loading && "animate-spin text-orange-500")}/></Button>
                </div>
            </div>

            {/* Grid de Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {staffData.map((staff, index) => {
                    const isTop1 = index === 0;
                    const performanceRatio = (staff.totalRevenue / (staffData[0]?.totalRevenue || 1)) * 100;

                    return (
                        <Card key={staff.userId} className={cn(
                            "p-0 overflow-hidden border-2 transition-all duration-300 group hover:shadow-2xl relative",
                            isTop1 ? "border-orange-500 bg-orange-50/10 shadow-orange-900/5" : "border-slate-100 bg-white"
                        )} noPadding>
                            {isTop1 && (
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500 text-white rounded-bl-[3rem] flex items-start justify-end p-5 shadow-xl z-10">
                                    <Trophy size={28} className="animate-bounce" />
                                </div>
                            )}

                            <div className="p-8 space-y-8">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                        isTop1 ? "bg-orange-500 text-white shadow-orange-100" : "bg-slate-900 text-white shadow-slate-200"
                                    )}>
                                        <UserCircle size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{staff.name}</h3>
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", isTop1 ? "bg-orange-500 text-white border-orange-500" : "bg-slate-100 text-slate-400 border-slate-200")}>{index + 1}º NO RANKING</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-2 mb-2"><DollarSign size={12} className="text-emerald-500"/><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Venda Total</p></div>
                                        <p className="text-lg font-black text-slate-900 italic tracking-tighter">R$ {staff.totalRevenue.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-2 mb-2"><ShoppingBag size={12} className="text-blue-500"/><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Pedidos</p></div>
                                        <p className="text-lg font-black text-slate-900 italic tracking-tighter">{staff.ordersCount} un</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-[1.5rem] p-5 flex items-center justify-between shadow-2xl relative overflow-hidden group/ticket">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-2xl rounded-full" />
                                    <div className="relative z-10">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ticket Médio</p>
                                        <p className="text-2xl font-black text-emerald-400 italic tracking-tighter leading-none">R$ {staff.averageTicket.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-emerald-400 relative z-10"><TrendingUp size={20}/></div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eficácia em Relação ao Top 1</span>
                                        <span className={cn("text-xs font-black italic", isTop1 ? "text-orange-500" : "text-slate-900")}>{performanceRatio.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className={cn("h-full transition-all duration-1000", isTop1 ? "bg-orange-500 shadow-[0_0_8px_orange]" : "bg-slate-400")} 
                                            style={{ width: `${performanceRatio}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {staffData.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-20">
                        <Trophy size={80} strokeWidth={1} className="text-slate-300 mb-4" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhum dado de produtividade no período</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPerformance;