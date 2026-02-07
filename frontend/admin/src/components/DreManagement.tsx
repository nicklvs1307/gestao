import React, { useState, useEffect } from 'react';
import { getDre } from '../services/api';
import { 
    Calculator, TrendingUp, DollarSign, ArrowDownCircle, 
    ArrowUpCircle, Percent, PieChart, Calendar, ChevronRight, Info, RefreshCw, Loader2, Target, Download, Printer
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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

    useEffect(() => { fetchData(); }, []);

    if (loading && !dreData) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Calculando Resultados Gerenciais...</span>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-200"><PieChart size={32} /></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">DRE Gerencial</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Demonstrativo de Resultados do Exercício</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <Calendar size={16} className="text-orange-500" />
                        <input type="date" className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <ChevronRight size={14} className="text-slate-300" />
                        <input type="date" className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <Button onClick={fetchData} size="sm" className="rounded-xl h-11 px-6 italic">FILTRAR</Button>
                    <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 bg-white"><Download size={18} className="text-slate-400"/></Button>
                </div>
            </div>

            {dreData && (
                <>
                    {/* KPIs Mestres do DRE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-8 border-slate-100 bg-white hover:border-orange-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><ArrowUpCircle size={24} /></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Venda Bruta</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Recebido</p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.grossRevenue.toFixed(2).replace('.', ',')}</h4>
                        </Card>

                        <Card className="p-8 border-slate-100 bg-white hover:border-orange-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100 group-hover:scale-110 transition-transform"><ArrowDownCircle size={24} /></div>
                                <div className="text-orange-600 flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none italic">CMV Total</span>
                                    <span className="text-[9px] font-bold">{dreData.cmvPercentage.toFixed(1)}% do FAT.</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Custo Insumos</p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.totalCmv.toFixed(2).replace('.', ',')}</h4>
                        </Card>

                        <Card className="p-8 border-slate-100 bg-white hover:border-emerald-500/20 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform"><DollarSign size={24} /></div>
                                <div className="text-emerald-600 flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none italic">Margem Bruta</span>
                                    <span className="text-[9px] font-bold">{(dreData.grossMargin * 100).toFixed(1)}% eficiência</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lucro Operacional</p>
                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {dreData.grossProfit.toFixed(2).replace('.', ',')}</h4>
                        </Card>

                        <Card className={cn("p-8 border-2 transition-all relative overflow-hidden group shadow-2xl", dreData.netProfit >= 0 ? "bg-slate-900 border-emerald-500/30" : "bg-rose-600 border-rose-400")}>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", dreData.netProfit >= 0 ? "bg-white text-slate-900" : "bg-white text-rose-600")}><TrendingUp size={24} /></div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", dreData.netProfit >= 0 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-white border-white/20 bg-white/10")}>{(dreData.netMargin * 100).toFixed(1)}% Margem</span>
                            </div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1 relative z-10", dreData.netProfit >= 0 ? "text-slate-400" : "text-rose-100")}>Resultado Líquido</p>
                            <h4 className={cn("text-4xl font-black italic tracking-tighter relative z-10", dreData.netProfit >= 0 ? "text-emerald-400" : "text-white")}>R$ {dreData.netProfit.toFixed(2).replace('.', ',')}</h4>
                            <div className="absolute -right-4 -bottom-4 text-white opacity-[0.03] group-hover:scale-110 transition-transform"><DollarSign size={120} /></div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Coluna de Custos e Despesas */}
                        <Card className="lg:col-span-7 p-0 overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-black text-slate-900 uppercase italic text-sm tracking-widest flex items-center gap-3"><div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><ArrowDownCircle size={18} /></div> Despesas Operacionais</h3>
                                <span className="font-black text-rose-600 text-base italic tracking-tighter">- R$ {dreData.operatingExpenses.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="p-8 space-y-8">
                                {Object.entries(dreData.operatingExpenses.breakdown).map(([category, amount]: any) => {
                                    const impact = (amount / dreData.grossRevenue) * 100;
                                    return (
                                        <div key={category} className="group cursor-default">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-orange-600 transition-colors">{category}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Impacto: {impact.toFixed(1)}% do total</span>
                                                </div>
                                                <span className="text-sm font-black text-slate-700 italic">R$ {amount.toFixed(2).replace('.', ',')}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                                <div className="h-full bg-rose-400 rounded-full transition-all duration-1000 group-hover:bg-rose-500" style={{ width: `${impact}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.keys(dreData.operatingExpenses.breakdown).length === 0 && (
                                    <div className="py-12 text-center opacity-20"><Info size={40} className="mx-auto mb-3" /><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma despesa registrada</p></div>
                                )}
                            </div>
                        </Card>

                        {/* Coluna de Análise Estratégica */}
                        <div className="lg:col-span-5 space-y-8">
                            <Card className="p-8 border-emerald-100 bg-emerald-50/10 space-y-8">
                                <h3 className="text-sm font-black uppercase text-emerald-900 italic flex items-center gap-3 border-b border-emerald-100/50 pb-4"><div className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-100"><Target size={18}/></div> Auditoria de Eficiência</h3>
                                
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                                        <div className="flex items-center gap-4 mb-4 relative z-10">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", dreData.cmvPercentage > 32 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600")}><Percent size={24} /></div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status do CMV</p>
                                                <p className={cn("font-black uppercase italic text-sm", dreData.cmvPercentage > 32 ? "text-rose-600" : "text-emerald-600")}>{dreData.cmvPercentage > 32 ? 'ACIMA DO RECOMENDADO' : 'DENTRO DA META'}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase italic relative z-10">
                                            O seu custo de insumos representa <b className="text-slate-900">{dreData.cmvPercentage.toFixed(1)}%</b> do faturamento. {dreData.cmvPercentage > 32 ? "Sugerimos revisar as fichas técnicas ou negociar com fornecedores." : "Excelente gestão de desperdícios e compras."}
                                        </p>
                                        <div className="absolute -right-4 -bottom-4 text-emerald-500/5 group-hover:scale-110 transition-transform"><RefreshCw size={80} /></div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic ml-1">Divisão do Faturamento</h4>
                                        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                            <div className="w-full h-6 bg-slate-50 rounded-2xl overflow-hidden flex shadow-inner p-1">
                                                <div className="h-full bg-orange-500 rounded-l-xl transition-all duration-1000" style={{ width: `${dreData.cmvPercentage}%` }} />
                                                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(dreData.operatingExpenses.total / dreData.grossRevenue) * 100}%` }} />
                                                {dreData.netProfit > 0 && <div className="h-full bg-emerald-500 rounded-r-xl transition-all duration-1000" style={{ width: `${(dreData.netProfit / dreData.grossRevenue) * 100}%` }} />}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl"><span className="text-[8px] font-black uppercase text-orange-500">CMV</span><span className="text-[10px] font-black text-slate-900 italic">{dreData.cmvPercentage.toFixed(1)}%</span></div>
                                                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl"><span className="text-[8px] font-black uppercase text-rose-500">DESPESAS</span><span className="text-[10px] font-black text-slate-900 italic">{((dreData.operatingExpenses.total / dreData.grossRevenue) * 100).toFixed(1)}%</span></div>
                                                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl"><span className="text-[8px] font-black uppercase text-emerald-500">LUCRO</span><span className="text-[10px] font-black text-slate-900 italic">{((dreData.netProfit / dreData.grossRevenue) * 100).toFixed(1)}%</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Botões de Ação Final */}
                            <div className="flex flex-col gap-3">
                                <Button variant="outline" fullWidth className="h-14 rounded-2xl bg-white border-slate-200 uppercase tracking-widest text-[10px] font-black italic shadow-md group"><Printer size={18} className="mr-2 text-slate-400 group-hover:text-orange-500" /> Imprimir Demonstrativo</Button>
                                <Button variant="ghost" fullWidth className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 hover:bg-orange-50">Manual de Instruções Financeiras</Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DreManagement;