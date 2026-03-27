import React, { useState, useEffect } from 'react';
import { MapPin, Package, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { KpiCard, ReportPageHeader, ReportTable, LoadingSpinner, EmptyState } from './index';

const DeliveryAreaReportView: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/delivery-area-stats').then(res => {
            setStats(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner message="Analisando Áreas de Entrega..." />;

    const totalOrders = stats.reduce((acc, curr) => acc + curr.count, 0);
    const totalFees = stats.reduce((acc, curr) => acc + curr.totalFees, 0);
    const avgOrdersPerArea = stats.length > 0 ? Math.round(totalOrders / stats.length) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={MapPin}
                iconBg="from-blue-500 to-blue-600"
                title="Desempenho por Área"
                subtitle="Onde estão seus clientes mais fiéis"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={Package} iconColor="text-orange-400" label="Total Entregas" value={totalOrders} subtitle="Pedidos" variant="dark" />
                <KpiCard icon={DollarSign} iconColor="text-emerald-500" label="Taxas Geradas" value={`R$ ${totalFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="De entrega" accentColor="text-emerald-600" />
                <KpiCard icon={MapPin} iconColor="text-blue-500" label="Áreas Atendidas" value={stats.length} subtitle="Bairros" accentColor="text-blue-600" />
                <KpiCard icon={TrendingUp} iconColor="text-purple-500" label="Média por Área" value={avgOrdersPerArea} subtitle="Pedidos" accentColor="text-purple-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.slice(0, 4).map((s, i) => (
                    <Card key={i} className={cn(
                        "p-5 border-2 transition-all duration-300 hover:shadow-xl",
                        i === 0 ? "border-orange-100 bg-orange-50/30" :
                        i === 1 ? "border-blue-100 bg-blue-50/30" :
                        i === 2 ? "border-emerald-100 bg-emerald-50/30" :
                        "border-purple-100 bg-purple-50/30"
                    )}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                i === 0 ? "bg-orange-500 text-white" :
                                i === 1 ? "bg-blue-500 text-white" :
                                i === 2 ? "bg-emerald-500 text-white" :
                                "bg-purple-500 text-white"
                            )}>{i + 1}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400">TOP {i + 1}</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 uppercase italic truncate leading-none mb-3">{s.name}</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black tracking-tighter text-slate-900">{s.count}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">pedidos</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[8px] font-bold text-slate-400">Taxas: R$ {s.totalFees.toFixed(2)}</span>
                            <span className="text-[8px] font-black text-blue-600">{((s.count / totalOrders) * 100).toFixed(1)}%</span>
                        </div>
                    </Card>
                ))}
            </div>

            <ReportTable
                title="Todas as Áreas"
                icon={MapPin}
                iconColor="text-blue-500"
                totalCount={stats.length}
                columns={[
                    { label: 'Ranking' },
                    { label: 'Bairro / Região' },
                    { label: 'Volume Total', align: 'center' },
                    { label: 'Taxas Geradas', align: 'right' },
                    { label: 'Participação', align: 'right' },
                ]}
                rows={stats.map((s: any, idx: number) => {
                    const relevancy = totalOrders > 0 ? (s.count / totalOrders) * 100 : 0;
                    return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3">
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                    idx < 3 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                )}>{idx + 1}</span>
                            </td>
                            <td className="px-4 py-3 font-black text-xs text-slate-900 uppercase italic tracking-tight">{s.name}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-600">{s.count} pedidos</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-600 italic tracking-tighter">R$ {s.totalFees.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm font-black text-blue-500 italic">{relevancy.toFixed(1)}%</span>
                                    <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${relevancy}%` }} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                emptyState={!stats.length ? <EmptyState icon={MapPin} title="Nenhuma área encontrada" description="Não há entregas registradas" /> : undefined}
            />
        </div>
    );
};

export default DeliveryAreaReportView;
