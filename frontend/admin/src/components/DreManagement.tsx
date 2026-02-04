import React, { useState, useEffect } from 'react';
import { getDre } from '../services/api';
import { 
    Calculator, TrendingUp, DollarSign, ArrowDownCircle, 
    ArrowUpCircle, Percent, PieChart, Calendar, ChevronRight, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

const DreManagement: React.FC = () => {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dreData, setDreData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getDre(startDate, endDate);
            setDreData(data);
        } catch (error) {
            toast.error("Erro ao gerar DRE");
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
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Calculando Resultados...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                        <PieChart size={32} className="text-primary" /> DRE Gerencial
                    </h2>
                    <p className="text-slate-500 font-medium">Demonstrativo de Resultados do Exercício (Lucro Real).</p>
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

            {dreData && (
                <>
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ArrowUpCircle size={14} className="text-emerald-500" /> Faturamento Bruto
                            </p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.grossRevenue.toFixed(2)}</h4>
                            <div className="mt-4 pt-4 border-t border-slate-50 text-[9px] font-bold text-slate-400 uppercase">Total de vendas</div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ArrowDownCircle size={14} className="text-orange-500" /> CMV Total
                            </p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.totalCmv.toFixed(2)}</h4>
                            <div className="mt-4 pt-4 border-t border-slate-50 text-[9px] font-black text-orange-500 uppercase flex justify-between">
                                <span>Impacto</span>
                                <span>{dreData.cmvPercentage.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign size={14} className="text-primary" /> Margem Bruta
                            </p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.grossProfit.toFixed(2)}</h4>
                            <div className="mt-4 pt-4 border-t border-slate-50 text-[9px] font-black text-primary uppercase flex justify-between">
                                <span>Eficiência</span>
                                <span>{(dreData.grossMargin * 100).toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className={cn(
                            "p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between transition-all",
                            dreData.netProfit >= 0 ? "bg-slate-900 text-white" : "bg-red-600 text-white"
                        )}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-400" /> Lucro Líquido
                            </p>
                            <h4 className="text-3xl font-black italic tracking-tighter text-emerald-400">R$ {dreData.netProfit.toFixed(2)}</h4>
                            <div className="mt-4 pt-4 border-t border-white/10 text-[9px] font-black text-white/60 uppercase flex justify-between">
                                <span>Lucratividade</span>
                                <span>{(dreData.netMargin * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Detalhamento de Despesas Operacionais */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-black text-slate-900 uppercase italic text-sm tracking-widest flex items-center gap-2">
                                    <ArrowDownCircle className="text-red-500" size={20} /> Despesas Operacionais
                                </h3>
                                <span className="font-black text-red-600 text-sm">R$ {dreData.operatingExpenses.total.toFixed(2)}</span>
                            </div>
                            <div className="p-8 space-y-4">
                                {Object.entries(dreData.operatingExpenses.breakdown).map(([category, amount]: any) => (
                                    <div key={category} className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-slate-900 uppercase italic">{category}</span>
                                            <span className="text-xs font-bold text-slate-500">R$ {amount.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-red-400 rounded-full group-hover:bg-red-500 transition-all" 
                                                style={{ width: `${(amount / dreData.grossRevenue) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Representa {((amount / dreData.grossRevenue) * 100).toFixed(1)}% do faturamento</p>
                                    </div>
                                ))}
                                {Object.keys(dreData.operatingExpenses.breakdown).length === 0 && (
                                    <p className="text-center text-slate-400 italic py-8">Nenhuma despesa paga no período.</p>
                                )}
                            </div>
                        </div>

                        {/* Comparativo CMV e Lucro */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="font-black text-slate-900 uppercase italic text-sm tracking-widest flex items-center gap-2">
                                    <Info className="text-primary" size={20} /> Análise de Eficiência
                                </h3>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                            <Percent size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CMV Recomendado</p>
                                            <p className="font-black text-slate-900 uppercase italic text-xs">25% a 32%</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                                        Seu CMV atual está em <b className={cn(dreData.cmvPercentage > 32 ? "text-red-600" : "text-emerald-600")}>{dreData.cmvPercentage.toFixed(1)}%</b>. 
                                        {dreData.cmvPercentage > 32 ? " Atenção: revise seus custos de insumos ou aumente o preço de venda." : " Parabéns! Sua eficiência de cozinha está dentro da meta."}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Composição da Receita</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between text-[9px] font-black uppercase">
                                                    <span>CMV (Produtos)</span>
                                                    <span>{dreData.cmvPercentage.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-orange-400" style={{ width: `${dreData.cmvPercentage}%` }} />
                                                    <div className="h-full bg-red-400" style={{ width: `${(dreData.operatingExpenses.total / dreData.grossRevenue) * 100}%` }} />
                                                    <div className="h-full bg-emerald-400" style={{ width: `${(dreData.netProfit / dreData.grossRevenue) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 pt-2">
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-orange-500">
                                                <div className="w-2 h-2 rounded-full bg-orange-400" /> CMV
                                            </div>
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-red-500">
                                                <div className="w-2 h-2 rounded-full bg-red-400" /> Despesas
                                            </div>
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-emerald-500">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400" /> Lucro
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DreManagement;
