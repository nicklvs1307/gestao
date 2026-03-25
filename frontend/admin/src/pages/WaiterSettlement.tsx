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
                    <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">Acertos de Turno</h1>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Wallet size={14} className="text-primary" /> Comissões e Taxas de Serviço
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-border shadow-sm">
                        <Calendar size={16} className="text-primary" />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none font-black text-[10px] uppercase outline-none text-slate-600"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="bg-white rounded-xl h-11 w-11" onClick={fetchSettlement}>
                        <RefreshCw size={18} className={cn(loading && "animate-spin text-primary")} />
                    </Button>
                </div>
            </div>

            {/* Dashboards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8 border-border bg-foreground text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-12 h-12 bg-white text-foreground rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/30 px-2 py-1 rounded-md">Venda do Dia</span>
                    </div>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 italic">Faturamento em Atendimentos</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter italic relative z-10">
                        R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-8 border-primary/10 bg-primary/5 group hover:bg-white transition-all shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Total Comissões</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Taxa Aplicada: {data[0]?.serviceRate || 10}%</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 italic">Montante para Repasse</p>
                    <h3 className="text-4xl font-black text-primary tracking-tighter italic">
                        R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>
            </div>

            {/* Listagem por Colaborador */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="p-8 animate-pulse bg-background/50 border-border min-h-[200px]" />
                    ))
                ) : data.length > 0 ? data.map((waiter, idx) => (
                    <Card key={idx} className="p-0 overflow-hidden border-2 border-border hover:border-primary/20 transition-all duration-300 hover:shadow-2xl bg-white" noPadding>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shadow-inner group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-foreground uppercase italic tracking-tighter leading-none">{waiter.waiterName}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                                                <ShoppingBag size={10} /> {waiter.totalOrders} Atendimentos
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500"><CheckCircle size={18} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-background rounded-2xl border border-border">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">Vendas</p>
                                    <p className="text-sm font-black text-foreground italic tracking-tighter">R$ {waiter.totalSales.toFixed(2).replace('.', ',')}</p>
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
                                className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest italic gap-2 border-border"
                                onClick={() => handlePayCommission(waiter)}
                            >
                                <DollarSign size={16} /> REGISTRAR PAGAMENTO
                            </Button>
                        </div>
                    </Card>
                )) : (
                    <div className="lg:col-span-full py-24 flex flex-col items-center justify-center text-center opacity-20">
                        <Users size={64} strokeWidth={1} className="text-muted-foreground/40 mb-4" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] italic">Nenhum atendimento no período</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterSettlement;