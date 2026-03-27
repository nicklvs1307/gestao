import React, { useState, useEffect } from 'react';
import { Utensils, Package, DollarSign, TrendingUp, BarChart3, History } from 'lucide-react';
import { api } from '../../services/api';
import { KpiCard, ReportPageHeader, ReportTable, DateFilter, getDefaultDateRange, LoadingSpinner, EmptyState } from './index';

const ConsumedItemsView: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(getDefaultDateRange(30));

    useEffect(() => {
        api.get('/admin/reports/consumed-items', { params: dateFilter }).then(res => {
            setItems(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [dateFilter]);

    if (loading) return <LoadingSpinner message="Carregando Itens Consumidos..." />;

    const totalItems = items.length;
    const totalRevenue = items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
    const avgTicket = totalItems > 0 ? totalRevenue / totalItems : 0;
    const uniqueProducts = new Set(items.map(i => i.productId)).size;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={Utensils}
                iconBg="from-orange-500 to-orange-600"
                title="Itens Consumidos"
                subtitle="Detalhamento de tudo que saiu da cozinha"
                filters={
                    <DateFilter
                        startDate={dateFilter.start}
                        endDate={dateFilter.end}
                        onStartChange={(v) => setDateFilter(prev => ({ ...prev, start: v }))}
                        onEndChange={(v) => setDateFilter(prev => ({ ...prev, end: v }))}
                    />
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={Package} iconColor="text-orange-400" label="Total Itens" value={totalItems} subtitle="Consumidos" variant="dark" />
                <KpiCard icon={DollarSign} iconColor="text-emerald-500" label="Receita Gerada" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="Dos itens vendidos" accentColor="text-emerald-600" />
                <KpiCard icon={TrendingUp} iconColor="text-blue-500" label="Ticket Médio" value={`R$ ${avgTicket.toFixed(2)}`} subtitle="Por item" accentColor="text-blue-600" />
                <KpiCard icon={BarChart3} iconColor="text-purple-500" label="Produtos Únicos" value={uniqueProducts} subtitle="Diferentes" accentColor="text-purple-600" />
            </div>

            <ReportTable
                title="Detalhamento"
                icon={History}
                iconColor="text-orange-500"
                totalCount={totalItems}
                showingCount={Math.min(50, totalItems)}
                columns={[
                    { label: 'Data/Hora' },
                    { label: 'Pedido' },
                    { label: 'Origem' },
                    { label: 'Produto' },
                    { label: 'Qtd', align: 'center' },
                    { label: 'Valor Unit.', align: 'right' },
                    { label: 'Total', align: 'right' },
                ]}
                rows={items.slice(0, 50).map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{new Date(item.order?.createdAt || item.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 font-black text-slate-900 italic">#{item.order?.dailyOrderNumber || idx + 1}</td>
                        <td className="px-4 py-3">
                            <span className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600">
                                {item.order?.tableNumber ? `Mesa ${item.order.tableNumber}` : 'Delivery'}
                            </span>
                        </td>
                        <td className="px-4 py-3 font-black text-xs text-slate-900 uppercase italic tracking-tight max-w-[200px] truncate">{item.product?.name}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-500">R$ {item.priceAtTime.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600 italic tracking-tighter">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</td>
                    </tr>
                ))}
                emptyState={!items.length ? <EmptyState icon={Utensils} title="Nenhum item consumido" description="Não há registros no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default ConsumedItemsView;
