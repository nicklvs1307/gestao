import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { api, payDriverSettlement } from '../services/api';
import { 
  Truck, DollarSign, CreditCard, Landmark, 
  Calendar, RefreshCw, ChevronRight, User, Package, Wallet, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// ... (interface)

const DriverSettlement: React.FC = () => {
    // ... (state)

    const handlePaySettlement = async (settlement: SettlementData) => {
        if(!confirm(`Confirmar acerto de R$ ${settlement.totalToPay.toFixed(2)} com ${settlement.driverName}?`)) return;

        try {
            await payDriverSettlement({
                driverName: settlement.driverName,
                amount: settlement.totalToPay,
                date: date,
                driverId: settlement.driverId // Envia o ID para vincular o usuário
            });
            toast.success(`Acerto de ${settlement.driverName} registrado com sucesso!`);
            fetchSettlement();
        } catch (error) {
            toast.error("Erro ao registrar acerto.");
        }
    };
    const [data, setData] = useState<SettlementData[]>([]);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const fetchSettlement = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/orders/drivers/settlement?date=${date}`);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettlement();
    }, [date]);

    const totalToPayToDrivers = data.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const totalStoreNet = data.reduce((acc, curr) => acc + curr.storeNet, 0);

    return (
        <div className="space-y-5 animate-in fade-in duration-500 bg-background text-foreground min-h-full">
            {/* Header com Filtro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ui-card p-4">
                <div>
                    <h2 className="text-xl font-black text-foreground tracking-tighter italic uppercase flex items-center gap-2">
                        <Truck className="text-primary" size={24} /> Acertos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Acertos de motoboys e diárias.</p>
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Total Diárias/Taxas</p>
                    <h3 className="text-2xl font-black text-orange-400 tracking-tighter italic">
                        R$ {totalToPayToDrivers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>

                <div className="ui-card p-5 border border-border flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Saldo Líquido Loja</p>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter italic">
                        R$ {totalStoreNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {/* Lista por Entregador */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.length > 0 ? data.map((settlement, idx) => (
                    <div key={idx} className="ui-card overflow-hidden hover:shadow-md transition-all">
                        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-slate-400 border border-border">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-foreground uppercase italic tracking-tight">{settlement.driverName}</h4>
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                        <Package size={10} /> {settlement.totalOrders} Entregas
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">A Pagar</p>
                                <p className="text-lg font-black text-orange-600 dark:text-orange-400 tracking-tight italic">R$ {settlement.totalToPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-4 border-b border-border/50">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Wallet size={12} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Dinheiro</p>
                                        <p className="text-xs font-bold text-foreground italic">R$ {settlement.cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"><CreditCard size={12} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Cartão</p>
                                        <p className="text-xs font-bold text-foreground italic">R$ {settlement.card.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center"><Landmark size={12} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">PIX</p>
                                        <p className="text-xs font-bold text-foreground italic">R$ {settlement.pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center"><DollarSign size={12} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Taxas</p>
                                        <p className="text-xs font-bold text-foreground italic">R$ {settlement.deliveryFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-2">
                            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-3 flex items-center justify-between border border-border/50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Líquido p/ Loja</span>
                                <span className={cn("text-sm font-black italic", settlement.storeNet >= 0 ? "text-emerald-400" : "text-red-400")}>
                                    R$ {settlement.storeNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <button 
                                onClick={() => handlePaySettlement(settlement)}
                                className="w-full ui-button-primary h-10 text-[9px] uppercase tracking-widest italic"
                            >
                                <CheckCircle2 size={14} className="text-emerald-400" /> Confirmar Acerto
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="lg:col-span-2 ui-card p-12 flex flex-col items-center justify-center text-center bg-muted/10 border-dashed">
                        <Package size={32} className="text-slate-300 mb-4 opacity-20" />
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Sem entregas finalizadas</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverSettlement;
