import React, { useState, useEffect } from 'react';
import { api, payWaiterCommission } from '../services/api';
import { 
  Users, DollarSign, RefreshCw, Calendar, User, ShoppingBag, CheckCircle, ChevronRight, TrendingUp, Wallet, ArrowUpRight, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface WaiterSettlementData {
    waiterId: string;
    waiterName: string;
    totalOrders: number;
    totalSales: number;
    serviceRate: number;
    commissionAmount: number;
}

const WaiterSettlement: React.FC = () => {
    const [data, setData] = useState<WaiterSettlementData[]>([]);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const fetchSettlement = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/waiters/settlement?date=${date}`);
            setData(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar acertos.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayCommission = async (waiter: WaiterSettlementData) => {
        if(!confirm(`Confirmar pagamento de R$ ${waiter.commissionAmount.toFixed(2)} para ${waiter.waiterName}?`)) return;

        try {
            await payWaiterCommission({
                waiterId: waiter.waiterId,
                amount: waiter.commissionAmount,
                date: date
            });
            toast.success(`Pagamento de ${waiter.waiterName} registrado!`);
            fetchSettlement();
        } catch (error) {
            toast.error("Erro ao registrar pagamento.");
        }
    };

    useEffect(() => {
        fetchSettlement();
    }, [date]);

    const totalSales = data.reduce((acc, curr) => acc + curr.totalSales, 0);
    const totalCommission = data.reduce((acc, curr) => acc + curr.commissionAmount, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Acertos de Turno</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Wallet size={14} className="text-orange-500" /> Comissões e Taxas de Serviço
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <Calendar size={16} className="text-orange-500" />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="bg-white rounded-xl h-11 w-11" onClick={fetchSettlement}>
                        <RefreshCw size={18} className={cn(loading && "animate-spin text-orange-500")} />
                    </Button>
                </div>
            </div>

            {/* Dashboards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8 border-slate-100 bg-slate-900 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest border border-orange-500/30 px-2 py-1 rounded-md">Venda do Dia</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 italic">Faturamento em Atendimentos</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter italic relative z-10">
                        R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-8 border-orange-100 bg-orange-50/20 group hover:bg-white transition-all shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Total Comissões</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Taxa Aplicada: {data[0]?.serviceRate || 10}%</span>
                        </div>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Montante para Repasse</p>
                    <h3 className="text-4xl font-black text-orange-600 tracking-tighter italic">
                        R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>
            </div>

            {/* Listagem por Colaborador */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="p-8 animate-pulse bg-slate-50/50 border-slate-100 min-h-[200px]" />
                    ))
                ) : data.length > 0 ? data.map((waiter, idx) => (
                    <Card key={idx} className="p-0 overflow-hidden border-2 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl bg-white" noPadding>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none">{waiter.waiterName}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1">
                                                <ShoppingBag size={10} /> {waiter.totalOrders} Atendimentos
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500"><CheckCircle size={18} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Vendas</p>
                                    <p className="text-sm font-black text-slate-700 italic tracking-tighter">R$ {waiter.totalSales.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Comissão</p>
                                    <p className="text-xl font-black text-emerald-600 italic tracking-tighter leading-none">R$ {waiter.commissionAmount.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 pb-6 pt-2">
                            <Button 
                                fullWidth 
                                variant="secondary"
                                className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest italic gap-2 border-slate-200"
                                onClick={() => handlePayCommission(waiter)}
                            >
                                <DollarSign size={16} /> REGISTRAR PAGAMENTO
                            </Button>
                        </div>
                    </Card>
                )) : (
                    <div className="lg:col-span-full py-24 flex flex-col items-center justify-center text-center opacity-20">
                        <Users size={64} strokeWidth={1} className="text-slate-300 mb-4" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhum atendimento no período</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterSettlement;