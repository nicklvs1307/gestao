import React, { useState, useEffect } from 'react';
import { api, payWaiterCommission } from '../services/api';
import { 
  Users, DollarSign, RefreshCw, Calendar, User, ShoppingBag, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
            toast.success(`Pagamento de ${waiter.waiterName} registrado no financeiro!`);
            fetchSettlement();
        } catch (error) {
            toast.error("Erro ao registrar pagamento.");
        }
    };

    useEffect(() => {
        fetchSettlement();
    }, [date]);

    // Totais do dia
    const totalSales = data.reduce((acc, curr) => acc + curr.totalSales, 0);
    const totalCommission = data.reduce((acc, curr) => acc + curr.commissionAmount, 0);

    return (
        <div className="space-y-5 animate-in fade-in duration-500 bg-background text-foreground min-h-full">
            {/* Header com Filtro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ui-card p-4">
                <div>
                    <h2 className="text-xl font-black text-foreground tracking-tighter italic uppercase flex items-center gap-2">
                        <DollarSign className="text-primary" size={24} /> Comissões
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Acertos e taxa de serviço.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="ui-input pl-10 h-10 w-full"
                        />
                    </div>
                    <button 
                        onClick={fetchSettlement}
                        className="ui-button-secondary h-10 px-3"
                    >
                        <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Resumo Geral do Dia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Vendas Totais</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter italic">
                        R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1 leading-none">Comissões ({data[0]?.serviceRate || 10}%)</p>
                    <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tighter italic">
                        R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {/* Lista por Garçom */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.length > 0 ? data.map((waiter, idx) => (
                    <div key={idx} className="ui-card overflow-hidden hover:shadow-md transition-all">
                        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-slate-400 border border-border shadow-sm">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-foreground uppercase italic tracking-tight">{waiter.waiterName}</h4>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <ShoppingBag size={10} /> {waiter.totalOrders} Pedidos
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Vendas</p>
                                <p className="text-sm font-bold text-foreground italic">R$ {waiter.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Repasse</p>
                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight italic">R$ {waiter.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        
                        <div className="px-5 pb-5">
                            <button 
                                className="w-full ui-button-secondary h-10 text-[9px] uppercase tracking-widest italic"
                                onClick={() => handlePayCommission(waiter)}
                            >
                                <DollarSign size={14} /> Registrar Pagamento
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="lg:col-span-2 ui-card p-12 flex flex-col items-center justify-center text-center bg-muted/10 border-dashed">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <User size={32} />
                        </div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Nenhum atendimento</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Nenhum acerto pendente para esta data.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterSettlement;
