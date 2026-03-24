import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api, payDriverSettlement } from '../services/api';
import { 
  Truck, DollarSign, CreditCard, Building2, 
  Calendar, RefreshCw, User, Package, Wallet, CheckCircle, 
  Clock, ArrowRightLeft, FileDown, Printer, Filter, TrendingUp
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
    const [startTime, setStartTime] = useState('00:00');
    const [endTime, setEndTime] = useState('23:59');
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    const fetchSettlement = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/orders/drivers/settlement`, {
                params: { date, startTime, endTime }
            });
            setData(res.data);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar acertos.");
        } finally {
            setLoading(false);
        }
    };

    const handlePaySettlement = async (settlement: SettlementData) => {
        setConfirmData({open: true, title: 'Confirmar Acerto', message: `CONFIRMAR ACERTO: R$ ${settlement.totalToPay.toFixed(2)} com ${settlement.driverName}?\nIsso lançará os valores no caixa aberto.`, onConfirm: async () => {
            try {
                await payDriverSettlement({
                    driverName: settlement.driverName,
                    amount: settlement.totalToPay,
                    date: date,
                    driverId: settlement.driverId
                });
                toast.success(`Acerto de ${settlement.driverName} registrado com sucesso!`);
                fetchSettlement();
            } catch (error: any) {
                toast.error(error.response?.data?.error || "Erro ao registrar acerto.");
            }
        }});
    };

    useEffect(() => {
        fetchSettlement();
    }, [date, startTime, endTime]);

    const totals = data.reduce((acc, curr) => ({
        toPay: acc.toPay + curr.totalToPay,
        net: acc.net + curr.storeNet,
        cash: acc.cash + curr.cash,
        card: acc.card + curr.card,
        pix: acc.pix + curr.pix,
        orders: acc.orders + curr.totalOrders
    }), { toPay: 0, net: 0, cash: 0, card: 0, pix: 0, orders: 0 });

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
            {/* ERP HEADER - COMPACT & FUNCTIONAL */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                            <Truck size={20} />
                        </div>
                        Gestão de Acertos (Logística)
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-13">
                        Controle de Turnos e Liquidação de Entregadores
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <Calendar size={14} className="text-orange-500" />
                        <input 
                            type="date" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none font-black text-[11px] uppercase outline-none text-slate-600 cursor-pointer"
                        />
                    </div>
                    
                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <input 
                            type="time" 
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-black text-[11px] outline-none text-slate-600"
                        />
                        <ArrowRightLeft size={12} className="text-slate-300" />
                        <input 
                            type="time" 
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-black text-[11px] outline-none text-slate-600"
                        />
                    </div>

                    <Button variant="primary" size="sm" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest italic" onClick={fetchSettlement}>
                        <Filter size={14} className="mr-2" /> APLICAR TURNO
                    </Button>
                </div>
            </div>

            {/* FINANCIAL SUMMARY TABLE - DENSE */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Repasse Entregadores', val: totals.toPay, icon: DollarSign, color: 'orange', bg: 'bg-orange-500' },
                    { label: 'Resultado Líquido Loja', val: totals.net, icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-500' },
                    { label: 'Total Coletado Dinheiro', val: totals.cash, icon: Wallet, color: 'blue', bg: 'bg-blue-500' },
                    { label: 'Volume de Entregas', val: totals.orders, icon: Package, color: 'slate', bg: 'bg-slate-700', isCurrency: false },
                ].map((stat, i) => (
                    <Card key={i} className="p-4 border-slate-100 flex items-center gap-4 bg-white hover:shadow-md transition-shadow">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", stat.bg)}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                            <h4 className="text-lg font-black text-slate-900 tracking-tighter italic leading-none">
                                {stat.isCurrency === false ? stat.val : `R$ ${stat.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </h4>
                        </div>
                    </Card>
                ))}
            </div>

            {/* MAIN DATA TABLE - ERP STYLE */}
            <Card className="p-0 overflow-hidden border-slate-100 shadow-xl bg-white" noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic">Entregador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-center">Entregas</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic">Dinheiro (Mão)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic">Cartão / PIX</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-orange-400">Taxas/Diária</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic bg-slate-800">Saldo Líquido Loja</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4 h-16 bg-slate-50/50" />
                                    </tr>
                                ))
                            ) : data.length > 0 ? data.map((settlement, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                                <User size={14} />
                                            </div>
                                            <span className="font-black text-slate-700 uppercase italic tracking-tighter text-sm">{settlement.driverName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-black">
                                            {settlement.totalOrders}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-emerald-600 font-black text-sm italic tracking-tighter">R$ {settlement.cash.toFixed(2)}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Coletado na Rua</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 font-black text-xs italic">R$ {settlement.card.toFixed(2)}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Cartão</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 font-black text-xs italic">R$ {settlement.pix.toFixed(2)}</span>
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">PIX</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-orange-600 font-black text-sm italic tracking-tighter">R$ {settlement.totalToPay.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 bg-slate-50/50">
                                        <span className={cn("font-black text-sm italic tracking-tighter", settlement.storeNet >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                            R$ {settlement.storeNet.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"
                                                title="Imprimir Comprovante"
                                            >
                                                <Printer size={14} />
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest italic bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all gap-1.5"
                                                onClick={() => handlePaySettlement(settlement)}
                                            >
                                                <CheckCircle size={14} /> LIQUIDAR
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Truck size={48} className="mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum acerto pendente para este turno</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 font-black border-t border-slate-200">
                            <tr>
                                <td className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400">TOTAIS DO PERÍODO</td>
                                <td className="px-6 py-4 text-center text-slate-900">{totals.orders}</td>
                                <td className="px-6 py-4 text-emerald-600">R$ {totals.cash.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-600">R$ {(totals.card + totals.pix).toFixed(2)}</td>
                                <td className="px-6 py-4 text-orange-600 underline">R$ {totals.toPay.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-900 bg-slate-100">R$ {totals.net.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest italic gap-2 border-slate-300">
                                        <FileDown size={14} /> EXPORTAR RELATÓRIO
                                    </Button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            {/* ERP COMPLIANCE FOOTER */}
            <div className="flex items-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Sincronizado com Fluxo de Caixa Centralizado</p>
            </div>
            <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData(prev => ({...prev, open: false}))} onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} title={confirmData.title} message={confirmData.message} />
        </div>
    );
};

export default DriverSettlement;