import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, DollarSign, ClipboardList, Printer, Download } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { KpiCard, ReportPageHeader, ReportTable, LoadingSpinner, EmptyState } from './index';

const AbcAnalysisView: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/abc-analysis').then(res => {
            setData(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner message="Analisando Performance..." />;

    const classA = data?.products?.filter((p: any) => p.classification === 'A') || [];
    const classB = data?.products?.filter((p: any) => p.classification === 'B') || [];
    const classC = data?.products?.filter((p: any) => p.classification === 'C') || [];
    const totalProducts = data?.products?.length || 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={BarChart3}
                iconBg="from-orange-500 to-orange-600"
                title="Curva ABC de Produtos"
                subtitle="Identifique seus itens mais lucrativos"
                actions={
                    <>
                        <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg bg-white"><Printer size={14} /></Button>
                        <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg bg-white"><Download size={14} /></Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={DollarSign} iconColor="text-orange-400" label="Faturamento Total" value={`R$ ${data?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`} subtitle="Últimos 30 dias" variant="dark" />
                <KpiCard icon={Package} iconColor="text-emerald-500" label="Total Produtos" value={totalProducts} subtitle="Analisados" accentColor="text-emerald-600" />
                <KpiCard icon={TrendingUp} iconColor="text-orange-500" label="Classe A" value={classA.length} subtitle="70% receita" accentColor="text-orange-600" />
                <KpiCard icon={TrendingUp} iconColor="text-slate-400" label="Classes B+C" value={classB.length + classC.length} subtitle="30% receita" accentColor="text-slate-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[
                    { c: 'A', label: 'Carros-chefe', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: TrendingUp },
                    { c: 'B', label: 'Intermediários', color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: TrendingUp },
                    { c: 'C', label: 'Baixo Giro', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', icon: TrendingUp },
                ].map(classe => {
                    const classProducts = data?.products?.filter((p: any) => p.classification === classe.c) || [];
                    const revenue = classProducts.reduce((sum: number, p: any) => sum + p.totalRevenue, 0);
                    return (
                        <Card key={classe.c} className={cn("p-6 border-2 relative overflow-hidden group hover:shadow-xl transition-all duration-300", classe.bg, classe.border)} noPadding>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg", classe.bg.replace('bg-', 'bg-').replace('-50', '-500'), "text-white")}>
                                        <classe.icon size={20} />
                                    </div>
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", classe.text, classe.border)}>Classe {classe.c}</span>
                                </div>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{classe.label}</p>
                                <h4 className={cn("text-2xl font-black italic tracking-tighter", classe.text)}>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{classProducts.length} Produtos</span>
                                    <span className="text-[9px] font-black text-slate-900">{data?.totalRevenue > 0 ? ((revenue / data.totalRevenue) * 100).toFixed(1) : 0}%</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 text-[80px] font-black opacity-[0.05] italic">{classe.c}</div>
                        </Card>
                    );
                })}
            </div>

            <ReportTable
                title="Detalhamento por Item"
                icon={ClipboardList}
                iconColor="text-orange-500"
                totalCount={totalProducts}
                columns={[
                    { label: 'Ranking' },
                    { label: 'Produto' },
                    { label: 'Classe', align: 'center' },
                    { label: 'Qtd. Vendida', align: 'right' },
                    { label: 'Faturamento', align: 'right' },
                    { label: 'Relevância', align: 'right' },
                ]}
                rows={data?.products?.map((p: any, idx: number) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-black text-slate-200 italic text-lg group-hover:text-orange-500 transition-colors">#{idx + 1}</td>
                        <td className="px-4 py-3 font-black text-xs text-slate-900 uppercase italic tracking-tight max-w-[200px] truncate">{p.name}</td>
                        <td className="px-4 py-3 text-center">
                            <span className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm border",
                                p.classification === 'A' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                p.classification === 'B' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                "bg-slate-50 text-slate-400 border-slate-100"
                            )}>{p.classification}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-500">{p.totalQty}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 italic tracking-tighter">R$ {p.totalRevenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right w-32">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <div className={cn(
                                    "h-full transition-all duration-1000",
                                    p.classification === 'A' ? "bg-emerald-500" : p.classification === 'B' ? "bg-orange-500" : "bg-slate-400"
                                )} style={{ width: `${p.accumulatedPercentage}%` }} />
                            </div>
                        </td>
                    </tr>
                ))}
                emptyState={!data?.products?.length ? <EmptyState icon={BarChart3} title="Nenhum produto encontrado" description="Não há dados de vendas suficientes" /> : undefined}
            />
        </div>
    );
};

export default AbcAnalysisView;
