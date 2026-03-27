import React, { useState, useEffect } from 'react';
import { History, Clock, TrendingUp, Truck, Package } from 'lucide-react';
import { api } from '../../services/api';
import { KpiCard, ReportPageHeader, ReportTable, DateFilter, getDefaultDateRange, LoadingSpinner, EmptyState } from './index';

const StatusTimeView: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(getDefaultDateRange(0));

    useEffect(() => {
        api.get('/admin/reports/status-time', { params: dateFilter }).then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [dateFilter]);

    if (loading) return <LoadingSpinner message="Analisando Tempo por Status..." />;

    const avgWait = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.waitToPrepareMinutes, 0) / data.length) : 0;
    const avgPrepare = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.prepareToReadyMinutes, 0) / data.length) : 0;
    const avgDelivery = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.readyToCompleteMinutes, 0) / data.length) : 0;
    const avgTotal = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.totalCycleMinutes, 0) / data.length) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={History}
                iconBg="from-blue-500 to-blue-600"
                title="Tempo por Status"
                subtitle="Identifique gargalos na sua operação"
                filters={
                    <DateFilter
                        startDate={dateFilter.start}
                        endDate={dateFilter.end}
                        onStartChange={(v) => setDateFilter(prev => ({ ...prev, start: v }))}
                        onEndChange={(v) => setDateFilter(prev => ({ ...prev, end: v }))}
                        iconColor="text-blue-500"
                    />
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard icon={Clock} iconColor="text-orange-400" label="Ciclo Total" value={`${avgTotal} min`} subtitle="Média" variant="dark" />
                <KpiCard icon={Clock} iconColor="text-blue-500" label="Espera" value={`${avgWait} min`} subtitle="Aguardando" accentColor="text-blue-600" />
                <KpiCard icon={TrendingUp} iconColor="text-orange-500" label="Produção" value={`${avgPrepare} min`} subtitle="Preparando" accentColor="text-orange-600" />
                <KpiCard icon={Truck} iconColor="text-emerald-500" label="Entrega" value={`${avgDelivery} min`} subtitle="Pronto → Final" accentColor="text-emerald-600" />
                <KpiCard icon={Package} iconColor="text-purple-500" label="Total Pedidos" value={data.length} subtitle="Processados" accentColor="text-purple-600" />
            </div>

            <ReportTable
                title="Detalhamento por Pedido"
                icon={History}
                iconColor="text-blue-500"
                totalCount={data.length}
                showingCount={Math.min(50, data.length)}
                columns={[
                    { label: 'Pedido' },
                    { label: 'Espera', align: 'center' },
                    { label: 'Produção', align: 'center' },
                    { label: 'Entrega', align: 'center' },
                    { label: 'Ciclo Total', align: 'center' },
                ]}
                rows={data.slice(0, 50).map((o: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-black text-slate-900 italic">#{o.dailyOrderNumber}</td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-lg font-black italic tracking-tighter text-slate-600">{o.waitToPrepareMinutes}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">min</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-lg font-black italic tracking-tighter text-orange-600">{o.prepareToReadyMinutes}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">min</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-lg font-black italic tracking-tighter text-emerald-600">{o.readyToCompleteMinutes}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">min</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-lg font-black italic tracking-tighter text-blue-600">{o.totalCycleMinutes}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">min</span>
                        </td>
                    </tr>
                ))}
                emptyState={!data.length ? <EmptyState icon={History} title="Nenhum dado encontrado" description="Não há pedidos no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default StatusTimeView;
