import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, DollarSign, ShoppingBag, TrendingUp, CreditCard, Truck, Store, Users, X, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { formatSP } from '@/lib/timezone';
import { Button } from '../ui/Button';
import { KpiCard, ReportPageHeader, DateFilter, LoadingSpinner, EmptyState } from './index';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const dayNames = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
];

const orderTypeLabels: Record<string, string> = {
    DELIVERY: 'Delivery',
    PICKUP: 'Retirada',
    TABLE: 'Salão'
};

const BillingReportView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dates, setDates] = useState({
        start: formatSP(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
        end: formatSP(new Date(), 'yyyy-MM-dd')
    });
    const [orderTypes, setOrderTypes] = useState<string[]>(['DELIVERY', 'PICKUP', 'TABLE']);
    const [excludeDays, setExcludeDays] = useState<number[]>([]);

    const fetchBilling = useCallback(() => {
        setLoading(true);
        api.get('/admin/reports/billing', {
            params: {
                startDate: dates.start,
                endDate: dates.end,
                orderTypes: orderTypes.join(','),
                excludeDays: excludeDays.join(',')
            }
        }).then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [dates, orderTypes, excludeDays]);

    useEffect(() => {
        fetchBilling();
    }, []);

    const toggleOrderType = (type: string) => {
        setOrderTypes(prev => 
            prev.includes(type) 
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const toggleExcludeDay = (day: number) => {
        setExcludeDays(prev => 
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const chartData = useMemo(() => {
        if (!data?.daily?.length) return null;
        
        const labels = data.daily.map((d: any) => {
            const date = new Date(d.date);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        });

        return {
            line: {
                labels,
                datasets: [{
                    label: 'Faturamento Diário',
                    data: data.daily.map((d: any) => d.revenue),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f97316',
                    pointBorderWidth: 2,
                }]
            },
            bar: {
                labels: dayNames.map(d => d.label),
                datasets: [{
                    label: 'Faturamento por Dia da Semana',
                    data: dayNames.map(d => {
                        const dayData = data.daily.filter((item: any) => item.dayOfWeek === d.value);
                        return dayData.reduce((sum: number, item: any) => sum + item.revenue, 0);
                    }),
                    backgroundColor: [
                        '#ef4444', '#f97316', '#eab308', '#22c55e', 
                        '#06b6d4', '#3b82f6', '#8b5cf6'
                    ],
                    borderRadius: 8,
                }]
            }
        };
    }, [data]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => `R$ ${context.raw?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 0}`
                }
            }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                grid: { color: '#f1f5f9' },
                ticks: { 
                    font: { size: 10, weight: 'bold' as const }, 
                    color: '#94a3b8',
                    callback: (value: any) => `R$ ${value.toLocaleString('pt-BR')}`
                }
            },
            x: { 
                grid: { display: false }, 
                ticks: { font: { size: 10, weight: 'bold' as const }, color: '#94a3b8' } 
            }
        }
    };

    if (loading && !data) return <LoadingSpinner message="Carregando Faturamento..." />;

    const { totals } = data || {};

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={DollarSign}
                iconBg="from-emerald-500 to-emerald-600"
                title="Faturamento por Dia"
                subtitle="Relatório detalhado de vendas diárias"
                filters={
                    <div className="flex flex-wrap items-center gap-2">
                        <DateFilter
                            startDate={dates.start}
                            endDate={dates.end}
                            onStartChange={(v) => setDates(prev => ({ ...prev, start: v }))}
                            onEndChange={(v) => setDates(prev => ({ ...prev, end: v }))}
                        />
                    </div>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <Button onClick={fetchBilling} size="sm" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase">
                            <RefreshCw size={14} className={cn(loading && "animate-spin", "mr-2")} />
                            {loading ? '...' : 'FILTRAR'}
                        </Button>
                    </div>
                }
            />

            {/* Filtros de Tipo de Pedido */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipos:</span>
                    {['DELIVERY', 'PICKUP', 'TABLE'].map(type => (
                        <button
                            key={type}
                            onClick={() => toggleOrderType(type)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all",
                                orderTypes.includes(type)
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-orange-300"
                            )}
                        >
                            {type === 'DELIVERY' && <Truck size={12} />}
                            {type === 'PICKUP' && <Store size={12} />}
                            {type === 'TABLE' && <Users size={12} />}
                            {orderTypeLabels[type]}
                        </button>
                    ))}
                    
                    <span className="text-slate-200">|</span>
                    
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Excluir dias:</span>
                    {dayNames.map(day => (
                        <button
                            key={day.value}
                            onClick={() => toggleExcludeDay(day.value)}
                            className={cn(
                                "w-8 h-8 rounded-lg text-[9px] font-black uppercase border transition-all",
                                excludeDays.includes(day.value)
                                    ? "bg-rose-500 text-white border-rose-500"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-rose-300"
                            )}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard 
                    icon={DollarSign} 
                    iconColor="text-emerald-500" 
                    label="Faturamento Total" 
                    value={`R$ ${(totals?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Período selecionado"
                    variant="dark"
                />
                <KpiCard 
                    icon={ShoppingBag} 
                    iconColor="text-blue-500" 
                    label="Total de Pedidos" 
                    value={totals?.totalOrders || 0}
                    subtitle="Completos"
                    accentColor="text-blue-600"
                />
                <KpiCard 
                    icon={TrendingUp} 
                    iconColor="text-orange-500" 
                    label="Ticket Médio" 
                    value={`R$ ${(totals?.avgTicket || 0).toFixed(2).replace('.', ',')}`}
                    subtitle="Por pedido"
                />
                <KpiCard 
                    icon={Users} 
                    iconColor="text-purple-500" 
                    label="Itens Vendidos" 
                    value={totals?.totalItems || 0}
                    subtitle="Total de itens"
                    accentColor="text-purple-600"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard 
                    icon={Truck} 
                    iconColor="text-amber-500" 
                    label="Taxa Entrega" 
                    value={`R$ ${(totals?.totalDeliveryFee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Total delivery"
                />
                <KpiCard 
                    icon={CreditCard} 
                    iconColor="text-cyan-500" 
                    label="Acréscimos" 
                    value={`R$ ${(totals?.totalExtraCharge || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Taxa serviço"
                />
                <KpiCard 
                    icon={CreditCard} 
                    iconColor="text-rose-500" 
                    label="Descontos" 
                    value={`R$ ${(totals?.totalDiscount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Concedidos"
                />
                <KpiCard 
                    icon={X} 
                    iconColor="text-red-500" 
                    label="Cancelados" 
                    value={totals?.totalCanceledOrders || 0}
                    subtitle={`R$ ${(totals?.totalCanceledRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    accentColor="text-red-600"
                />
            </div>

            {/* Gráficos */}
            {data?.daily?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Evolução do Faturamento</h4>
                        <div className="h-[250px]">
                            {chartData && <Line data={chartData.line} options={chartOptions} />}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Por Dia da Semana</h4>
                        <div className="h-[250px]">
                            {chartData && <Bar data={chartData.bar} options={chartOptions} />}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabela de Dados */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Detalhamento Diário</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                                <th className="px-3 py-2 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Dia</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Pedidos</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Vendas</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Acumulado</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Ticket</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Itens</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Taxa Entrega</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Acréscimos</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Descontos</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Cancelados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.daily?.length > 0 ? (
                                data.daily.map((day: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-3">
                                            <span className="text-[11px] font-black text-slate-900">{day.date}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">{day.dayName}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[11px] font-black text-slate-900">{day.orders}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[11px] font-black text-emerald-600">R$ {day.revenue.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-slate-600">R$ {day.accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-slate-500">R$ {day.avgTicket.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-slate-500">{day.itemsCount}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-amber-600">R$ {day.deliveryFee.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-cyan-600">R$ {day.extraCharge.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className="text-[10px] font-bold text-rose-600">R$ {day.discount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className={cn("text-[10px] font-bold", day.canceledOrders > 0 ? "text-red-600" : "text-slate-400")}>
                                                {day.canceledOrders} (R$ {day.canceledRevenue.toFixed(2)})
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="px-3 py-12 text-center">
                                        <EmptyState 
                                            icon={Calendar} 
                                            title="Nenhum dado encontrado" 
                                            description="Tente ajustar os filtros" 
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingReportView;
