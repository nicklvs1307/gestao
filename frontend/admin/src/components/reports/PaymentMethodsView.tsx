import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { KpiCard, ReportPageHeader, ReportTable, LoadingSpinner, EmptyState } from './index';

const methodColors: Record<string, string> = {
    'Dinheiro': 'text-emerald-600 bg-emerald-50 border-emerald-100',
    'credit_card': 'text-blue-600 bg-blue-50 border-blue-100',
    'debit_card': 'text-purple-600 bg-purple-50 border-purple-100',
    'PIX': 'text-orange-600 bg-orange-50 border-orange-100',
    'meal_voucher': 'text-rose-600 bg-rose-50 border-rose-100',
};

const PaymentMethodsView: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        api.get('/admin/reports/payment-methods').then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner message="Carregando Métodos..." />;

    const total = data.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={CreditCard}
                iconBg="from-blue-500 to-blue-600"
                title="Vendas por Forma de Pagamento"
                subtitle={`Mix de recebimento dos últimos ${period} dias`}
                filters={
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-black text-[11px] uppercase outline-none text-slate-600"
                        >
                            <option value={7}>7 dias</option>
                            <option value={15}>15 dias</option>
                            <option value={30}>30 dias</option>
                            <option value={60}>60 dias</option>
                        </select>
                    </div>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard icon={DollarSign} iconColor="text-orange-400" label="Total Recebido" value={`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle={`Em ${period} dias`} variant="dark" />
                <KpiCard icon={CreditCard} iconColor="text-blue-500" label="Métodos Utilizados" value={data.length} subtitle="Diferentes" accentColor="text-blue-600" />
                <KpiCard icon={TrendingUp} iconColor="text-emerald-500" label="Ticket Médio" value={`R$ ${data.length > 0 ? (total / data.length).toFixed(2) : '0,00'}`} subtitle="Por método" accentColor="text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.map((pm: any, idx: number) => {
                    const perc = total > 0 ? (pm.total / total) * 100 : 0;
                    const methodKey = Object.keys(methodColors).find(k => pm.method?.toLowerCase().includes(k.toLowerCase())) || 'default';
                    const colors = methodColors[methodKey] || methodColors['default'];

                    return (
                        <Card key={idx} className="p-5 border border-slate-200 bg-white group hover:shadow-xl transition-all" noPadding>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={18} className={colors.split(' ')[0]} />
                                        <h4 className="text-lg font-black text-slate-900 uppercase italic truncate">{pm.method}</h4>
                                    </div>
                                    <span className="text-sm font-black text-blue-600">{perc.toFixed(1)}%</span>
                                </div>
                                <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 mb-3">R$ {pm.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                                    <div className={cn("h-full transition-all duration-1000", colors.split(' ')[0].replace('text-', 'bg-'))} style={{ width: `${perc}%` }} />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <ReportTable
                title="Detalhamento"
                icon={CreditCard}
                iconColor="text-blue-500"
                columns={[
                    { label: 'Método' },
                    { label: 'Valor Total', align: 'right' },
                    { label: 'Percentual', align: 'right' },
                    { label: 'Visualização', align: 'right' },
                ]}
                rows={data.map((pm: any, idx: number) => {
                    const perc = total > 0 ? (pm.total / total) * 100 : 0;
                    return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={14} className="text-slate-400" />
                                    <span className="font-black text-xs text-slate-900 uppercase italic">{pm.method}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 italic tracking-tighter">R$ {pm.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">{perc.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right">
                                <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden ml-auto">
                                    <div className="bg-blue-500 h-full" style={{ width: `${perc}%` }} />
                                </div>
                            </td>
                        </tr>
                    );
                })}
                emptyState={!data.length ? <EmptyState icon={CreditCard} title="Nenhum pagamento encontrado" description="Não há registros no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default PaymentMethodsView;
