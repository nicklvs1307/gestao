import React, { useState, useEffect } from 'react';
import { Utensils, Package, DollarSign, TrendingUp, BarChart3, History, ChevronDown, ChevronRight, Layers, IceCream } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { KpiCard, ReportPageHeader, ReportTable, DateFilter, getDefaultDateRange, LoadingSpinner, EmptyState } from './index';

interface AddonFlavorItem {
    name: string;
    price: number;
    quantity?: number;
}

interface ConsumedItem {
    id: string;
    productId: string | null;
    productName: string;
    categories: string[];
    quantity: number;
    priceAtTime: number;
    createdAt: string;
    order: { dailyOrderNumber: number; tableNumber: number | null; createdAt: string } | null;
    addons: AddonFlavorItem[];
    flavors: AddonFlavorItem[];
}

const ConsumedItemsView: React.FC = () => {
    const [items, setItems] = useState<ConsumedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(getDefaultDateRange(30));
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
    const uniqueProducts = new Set(items.filter(i => i.productId).map(i => i.productId)).size;

    const totalAddons = items.reduce((acc, item) => acc + item.addons.length, 0);
    const totalFlavors = items.reduce((acc, item) => acc + item.flavors.length, 0);

    const toggleExpand = (id: string) => {
        setExpandedRow(prev => prev === id ? null : id);
    };

    const hasDetails = (item: ConsumedItem) => item.addons.length > 0 || item.flavors.length > 0;

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

            {(totalAddons > 0 || totalFlavors > 0) && (
                <div className="flex items-center gap-4 px-4 py-2.5 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Extras incluídos:</span>
                    {totalAddons > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-orange-600">
                            <Layers size={12} /> {totalAddons} adicionais
                        </span>
                    )}
                    {totalFlavors > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-orange-600">
                            <IceCream size={12} /> {totalFlavors} sabores
                        </span>
                    )}
                </div>
            )}

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
                rows={items.slice(0, 50).map((item, idx) => {
                    const isExpanded = expandedRow === item.id;
                    const expandable = hasDetails(item);

                    return (
                        <React.Fragment key={item.id}>
                            <tr
                                className={cn(
                                    "transition-colors group",
                                    expandable ? "cursor-pointer hover:bg-orange-50/50" : "hover:bg-slate-50",
                                    isExpanded && "bg-orange-50/30"
                                )}
                                onClick={() => expandable && toggleExpand(item.id)}
                            >
                                <td className="px-4 py-3 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1">
                                        {expandable && (
                                            <span className="text-slate-300 group-hover:text-orange-400 transition-colors">
                                                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                            </span>
                                        )}
                                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-black text-slate-900 italic text-xs">#{item.order?.dailyOrderNumber || idx + 1}</td>
                                <td className="px-4 py-3">
                                    <span className="text-[11px] font-semibold uppercase px-2 py-1 rounded bg-slate-100 text-slate-600">
                                        {item.order?.tableNumber ? `Mesa ${item.order.tableNumber}` : 'Delivery'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider max-w-[180px] truncate">{item.productName}</span>
                                        {expandable && (
                                            <span className="text-[9px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 shrink-0">
                                                +{item.addons.length + item.flavors.length}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-500">R$ {item.priceAtTime.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-600">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</td>
                            </tr>

                            {isExpanded && expandable && (
                                <tr>
                                    <td colSpan={7} className="p-0">
                                        <div className="bg-slate-50/80 border-t border-b border-slate-100 px-8 py-3 animate-in fade-in duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {item.addons.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <Layers size={11} className="text-orange-500" />
                                                            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Adicionais</span>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            {item.addons.map((addon, i) => (
                                                                <div key={i} className="flex items-center justify-between py-1 px-2.5 bg-white rounded border border-slate-100">
                                                                    <span className="text-[11px] font-medium text-slate-700">{addon.name}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-400">{addon.quantity || 1}x</span>
                                                                        <span className="text-[11px] font-semibold text-slate-900">R$ {((addon.price || 0) * (addon.quantity || 1)).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {item.flavors.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <IceCream size={11} className="text-orange-500" />
                                                            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Sabores</span>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            {item.flavors.map((flavor, i) => (
                                                                <div key={i} className="flex items-center justify-between py-1 px-2.5 bg-white rounded border border-slate-100">
                                                                    <span className="text-[11px] font-medium text-slate-700">{flavor.name}</span>
                                                                    <span className="text-[11px] font-semibold text-slate-900">R$ {(flavor.price || 0).toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
                emptyState={!items.length ? <EmptyState icon={Utensils} title="Nenhum item consumido" description="Não há registros no período selecionado" /> : undefined}
            />
        </div>
    );
};

export default ConsumedItemsView;
