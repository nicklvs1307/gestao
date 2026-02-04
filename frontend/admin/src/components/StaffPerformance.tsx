import React, { useState, useEffect } from 'react';
import { getStaffPerformance } from '../services/api';
import { 
    Users, TrendingUp, Ticket, Award, Star, 
    Calendar, ChevronRight, UserCircle, Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

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

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Analisando Equipe...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                        <Award size={32} className="text-primary" /> Desempenho da Equipe
                    </h2>
                    <p className="text-slate-500 font-medium">Ranking de vendas por Atendente e Garçom.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <Calendar size={18} className="text-slate-400 ml-2" />
                    <input 
                        type="date" 
                        className="bg-transparent border-none font-bold text-xs uppercase outline-none"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    <ChevronRight size={14} className="text-slate-300" />
                    <input 
                        type="date" 
                        className="bg-transparent border-none font-bold text-xs uppercase outline-none"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                    <button 
                        onClick={fetchData}
                        className="ml-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all"
                    >
                        Filtrar
                    </button>
                </div>
            </div>

            {/* Ranking Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffData.map((staff, index) => (
                    <div key={staff.userId} className={cn(
                        "bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group relative overflow-hidden",
                        index === 0 && "border-primary/30 shadow-xl shadow-orange-100"
                    )}>
                        {/* Medalha p/ 1º Lugar */}
                        {index === 0 && (
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full flex items-end justify-start p-6">
                                <Star size={24} className="text-primary fill-primary" />
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                                <UserCircle size={40} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 uppercase italic leading-none">{staff.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{staff.role || 'Staff'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendas Totais</p>
                                <p className="text-lg font-black text-slate-900 italic">R$ {staff.totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedidos</p>
                                <p className="text-lg font-black text-slate-900 italic">{staff.ordersCount}</p>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
                            <div>
                                <p className="text-[8px] font-black text-primary uppercase tracking-widest">Ticket Médio</p>
                                <p className="text-xl font-black text-primary italic">R$ {staff.averageTicket.toFixed(2)}</p>
                            </div>
                            <Target size={24} className="text-primary opacity-20" />
                        </div>

                        {/* Barra de Progresso Relativa ao Top 1 */}
                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                <span>Performance Relativa</span>
                                <span>{((staff.totalRevenue / staffData[0].totalRevenue) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary rounded-full transition-all duration-1000" 
                                    style={{ width: `${(staff.totalRevenue / staffData[0].totalRevenue) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {staffData.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum dado de equipe no período.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPerformance;
