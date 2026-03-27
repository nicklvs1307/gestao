import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Calendar, DollarSign, ShoppingBag, TrendingUp, CreditCard, History, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { KpiCard, ReportPageHeader, ReportTable, DateFilter, LoadingSpinner, EmptyState } from './index';

const SalesPeriodView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    const fetchSales = useCallback(() => {
        setLoading(true);
        api.get('/admin/reports/sales-period', { params: { startDate: dates.start, endDate: dates.end } }).then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [dates]);

    useEffect(() => { fetchSales(); }, []);

    if (loading && !data) return <LoadingSpinner message="Carregando Vendas..." />;

    const paymentTotals = data?.paymentStats ? Object.entries(data.paymentStats).filter(([,v]) => (v as number) > 0) : [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={Calendar}
                iconBg="from-orange-500 to-orange-600"
                title="Vendas por Período"
                subtitle="Listagem detalhada de transações"
                filters={
                    <>
                        <DateFilter
                            startDate={dates.start}
                            endDate={dates.end}
                            onStartChange={(v) => setDates(prev => ({ ...prev, start: v }))}
                            onEndChange={(v) => setDates(prev => ({ ...prev, end: v }))}
                        />
                        <Button onClick={fetchSales} size="sm" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase">
                            <RefreshCw size={14} className={cn(loading && "animate-spin", "mr-2")} />
                            {loading ? '...' : 'FILTRAR'}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={DollarSign} iconColor="text-orange-400" label="Total Faturado" value={`R$ ${data?.totalSales?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`} subtitle="Bruto" variant="dark" />
                <KpiCard icon={ShoppingBag} iconColor="text-blue-500" label="Total de Pedidos" value={data?.count || 0} subtitle="Completos" accentColor="text-blue-600" />
                <KpiCard icon={TrendingUp} iconColor="text-emerald-500" label="Ticket Médio" value={`R$ ${data?.count > 0 ? (data.totalSales / data.count).toFixed(2) : '0,00'}`} subtitle="Por pedido" accentColor="text-emerald-600" />
                <KpiCard icon={CreditCard} iconColor="text-purple-500" label="Métodos" value={paymentTotals.length} subtitle="Utilizados" accentColor="text-purple-600" />
            </div>

            {paymentTotals.length > 0 && (
                <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-2xl">
                    <h4 className="font-black text-slate-900 uppercase italic text-xs tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={14} className="text-orange-500" /> Resumo por Forma de Pagamento
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {paymentTotals.map(([method, value]: [string, any], idx: number) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{method}</p>
                                <p className="text-sm font-black italic tracking-tighter text-emerald-600">R$ {value.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ReportTable
                title="Detalhamento de Pedidos"
                icon={History}
                iconColor="text-orange-500"
                totalCount={data?.sales?.length || 0}
                showingCount={Math.min(50, data?.sales?.length || 0)}
                columns={[
                    { label: 'ID / Data' },
                    { label: 'Tipo' },
                    { label: 'Mesa' },
                    { label: 'Status' },
                    { label: 'Total', align: 'right' },
                ]}
                rows={data?.sales?.slice(0, 50).map((o: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3">
                            <p className="font-black text-slate-900 italic">#{o.dailyOrderNumber || o.id?.slice(-4)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(o.createdAt).toLocaleString('pt-BR')}</p>
                        </td>
                        <td className="px-4 py-3">
                            <span className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600">{o.orderType || 'Delivery'}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-600">{o.tableNumber || '-'}</td>
                        <td className="px-4 py-3">
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border",
                                o.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                o.status === 'CANCELED' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-orange-50 text-orange-600 border-orange-100"
                            )}>{o.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 italic tracking-tighter">R$ {o.total.toFixed(2)}</td>
                    </tr>
                ))}
                emptyState={!data?.sales?.length ? <EmptyState icon={Calendar} title="Nenhuma venda encontrada" description="Não há vendas no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default SalesPeriodView;
