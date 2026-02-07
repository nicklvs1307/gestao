import React, { useState, useEffect } from 'react';
import { api, payDriverSettlement } from '../services/api';
import { 
  Truck, DollarSign, CreditCard, Landmark, 
  Calendar, RefreshCw, User, Package, Wallet, CheckCircle, ArrowUpRight, TrendingUp, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface SettlementData {
    driverId: string;
    driverName: string;
    totalOrders: number;
    cash: number;
    card: number;
    pix: number;
    deliveryFees: number;
    totalToPay: number;
    storeNet: number;
}

const DriverSettlement: React.FC = () => {
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
            toast.error("Erro ao carregar acertos.");
        } finally {
            setLoading(false);
        }
    };

    const handlePaySettlement = async (settlement: SettlementData) => {
        if(!confirm(`Confirmar acerto de R$ ${settlement.totalToPay.toFixed(2)} com ${settlement.driverName}?`)) return;

        try {
            await payDriverSettlement({
                driverName: settlement.driverName,
                amount: settlement.totalToPay,
                date: date,
                driverId: settlement.driverId
            });
            toast.success(`Acerto de ${settlement.driverName} registrado!`);
            fetchSettlement();
        } catch (error) {
            toast.error("Erro ao registrar acerto.");
        }
    };

    useEffect(() => {
        fetchSettlement();
    }, [date]);

    const totalToPayToDrivers = data.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const totalStoreNet = data.reduce((acc, curr) => acc + curr.storeNet, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Acerto de Entregas</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Truck size={14} className="text-orange-500" /> Prestação de Contas Logística
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
                            <Truck size={24} />
                        </div>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest border border-orange-500/30 px-2 py-1 rounded-md italic">Custo Logístico</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 italic">Total Diárias/Taxas a Pagar</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter italic relative z-10">
                        R$ {totalToPayToDrivers.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-8 border-emerald-100 bg-emerald-50/20 group hover:bg-white transition-all shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-500/30 px-2 py-1 rounded-md italic">Resultado</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Saldo Líquido Loja (Delivery)</p>
                    <h3 className="text-4xl font-black text-emerald-600 tracking-tighter italic">
                        R$ {totalStoreNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </Card>
            </div>

            {/* Listagem por Entregador */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="p-8 animate-pulse bg-slate-50/50 border-slate-100 min-h-[300px]" />
                    ))
                ) : data.length > 0 ? data.map((settlement, idx) => (
                    <Card key={idx} className="p-0 overflow-hidden border-2 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl bg-white" noPadding>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none">{settlement.driverName}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                                <Package size={10} /> {settlement.totalOrders} Entregas
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">A Repassar</p>
                                    <p className="text-xl font-black text-orange-600 italic tracking-tighter leading-none">R$ {settlement.totalToPay.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Dinheiro', val: settlement.cash, icon: Wallet, color: 'emerald' },
                                    { label: 'Cartão', val: settlement.card, icon: CreditCard, color: 'blue' },
                                    { label: 'PIX', val: settlement.pix, icon: Landmark, color: 'purple' },
                                    { label: 'Taxas', val: settlement.deliveryFees, icon: DollarSign, color: 'orange' },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-white border border-slate-100", `text-${item.color}-500`)}>
                                            <item.icon size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{item.label}</p>
                                            <p className="text-xs font-black text-slate-700 italic">R$ {item.val.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-[1.5rem] p-4 flex items-center justify-between border border-white/5 shadow-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Líquido Loja</span>
                                </div>
                                <span className={cn("text-base font-black italic tracking-tighter", settlement.storeNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    R$ {settlement.storeNet.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                        
                        <div className="px-6 pb-6 pt-2">
                            <Button 
                                fullWidth 
                                variant="secondary"
                                className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest italic gap-2 border-slate-200"
                                onClick={() => handlePaySettlement(settlement)}
                            >
                                <CheckCircle size={16} className="text-emerald-500" /> CONFIRMAR ACERTO
                            </Button>
                        </div>
                    </Card>
                )) : (
                    <div className="lg:col-span-full py-24 flex flex-col items-center justify-center text-center opacity-20">
                        <Truck size={64} strokeWidth={1} className="text-slate-300 mb-4" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic">Nenhuma entrega finalizada para esta data</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverSettlement;