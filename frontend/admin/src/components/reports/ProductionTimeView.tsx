import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Package } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { KpiCard, ReportPageHeader, ReportTable, DateFilter, getDefaultDateRange, LoadingSpinner, EmptyState } from './index';

const ProductionTimeView: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(getDefaultDateRange(0));

    useEffect(() => {
        api.get('/admin/reports/production-time', { params: dateFilter }).then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [dateFilter]);

    if (loading) return <LoadingSpinner message="Analisando Tempo de Produção..." />;

    const avgTime = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.durationMinutes, 0) / data.length) : 0;
    const excellentCount = data.filter(d => d.durationMinutes <= 20).length;
    const regularCount = data.filter(d => d.durationMinutes > 20 && d.durationMinutes <= 40).length;
    const slowCount = data.filter(d => d.durationMinutes > 40).length;
    const totalOrders = data.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={TrendingUp}
                iconBg="from-orange-500 to-orange-600"
                title="Tempo de Produção"
                subtitle="Performance da sua cozinha"
                filters={
                    <DateFilter
                        startDate={dateFilter.start}
                        endDate={dateFilter.end}
                        onStartChange={(v) => setDateFilter(prev => ({ ...prev, start: v }))}
                        onEndChange={(v) => setDateFilter(prev => ({ ...prev, end: v }))}
                    />
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard icon={Clock} iconColor="text-orange-400" label="Média Geral" value={`${avgTime} min`} subtitle="Por pedido" variant="dark" />
                <KpiCard icon={Clock} iconColor="text-emerald-500" label="Excelente" value={excellentCount} subtitle="≤ 20 min" accentColor="text-emerald-600" />
                <KpiCard icon={Clock} iconColor="text-orange-500" label="Regular" value={regularCount} subtitle="21-40 min" accentColor="text-orange-600" />
                <KpiCard icon={Clock} iconColor="text-rose-500" label="Lento" value={slowCount} subtitle="> 40 min" accentColor="text-rose-600" />
                <KpiCard icon={Package} iconColor="text-blue-500" label="Total Pedidos" value={totalOrders} subtitle="Processados" accentColor="text-blue-600" />
            </div>

            <ReportTable
                title="Detalhamento por Pedido"
                icon={TrendingUp}
                iconColor="text-orange-500"
                totalCount={totalOrders}
                showingCount={Math.min(50, totalOrders)}
                columns={[
                    { label: 'Pedido' },
                    { label: 'Início Prep.' },
                    { label: 'Pronto em' },
                    { label: 'Duração', align: 'center' },
                    { label: 'Status', align: 'center' },
                ]}
                rows={data.slice(0, 50).map((o: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-black text-slate-900 italic">#{o.dailyOrderNumber}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{o.preparingAt ? new Date(o.preparingAt).toLocaleTimeString('pt-BR') : '-'}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{o.readyAt ? new Date(o.readyAt).toLocaleTimeString('pt-BR') : (o.completedAt ? new Date(o.completedAt).toLocaleTimeString('pt-BR') : '-')}</td>
                        <td className="px-4 py-3 text-center">
                            <span className="text-lg font-black italic tracking-tighter text-slate-700">{o.durationMinutes}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">min</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border",
                                o.durationMinutes <= 20 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                o.durationMinutes <= 40 ? "bg-orange-50 text-orange-600 border-orange-100" :
                                "bg-rose-50 text-rose-600 border-rose-100"
                            )}>
                                {o.durationMinutes <= 20 ? 'Excelente' : o.durationMinutes <= 40 ? 'Regular' : 'Lento'}
                            </span>
                        </td>
                    </tr>
                ))}
                emptyState={!data.length ? <EmptyState icon={TrendingUp} title="Nenhum dado encontrado" description="Não há pedidos processados no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default ProductionTimeView;
