import React, { useState, useEffect } from 'react';
import { Ticket, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { KpiCard, ReportPageHeader, LoadingSpinner, EmptyState } from './index';

const CouponsReportView: React.FC = () => {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/reports/coupons').then(res => {
            setCoupons(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner message="Carregando Cupons..." />;

    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const inactiveCoupons = totalCoupons - activeCoupons;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <ReportPageHeader
                icon={Ticket}
                iconBg="from-emerald-500 to-emerald-600"
                title="Cupons de Desconto"
                subtitle="Performance das suas campanhas de marketing"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard icon={Ticket} iconColor="text-orange-400" label="Total de Cupons" value={totalCoupons} subtitle="Cadastrados" variant="dark" />
                <KpiCard icon={TrendingUp} iconColor="text-emerald-500" label="Cupons Ativos" value={activeCoupons} subtitle="Em circulação" accentColor="text-emerald-600" />
                <KpiCard icon={AlertCircle} iconColor="text-slate-400" label="Cupons Inativos" value={inactiveCoupons} subtitle="Encerrados" accentColor="text-slate-600" />
                <KpiCard icon={Package} iconColor="text-blue-500" label="Taxa de Uso" value={`${totalCoupons > 0 ? ((activeCoupons / totalCoupons) * 100).toFixed(0) : 0}%`} subtitle="Ativos / Total" accentColor="text-blue-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {coupons.map((coupon: any, idx: number) => (
                    <Card key={idx} className={cn(
                        "p-5 border-2 transition-all duration-300 hover:shadow-xl relative overflow-hidden",
                        coupon.isActive ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 bg-white"
                    )} noPadding>
                        {coupon.isActive && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500 text-white rounded-bl-full flex items-center justify-center">
                                <TrendingUp size={18} />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                                    coupon.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {coupon.isActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            <h4 className="text-xl font-black text-slate-900 italic tracking-tighter mb-2">{coupon.code || coupon.name}</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={cn(
                                    "text-lg font-black italic tracking-tighter",
                                    coupon.discountType === 'percentage' ? "text-orange-600" : "text-emerald-600"
                                )}>
                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue.toFixed(2)}`}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">OFF</span>
                            </div>
                            {coupon.product && (
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 truncate">
                                    {coupon.product.name}
                                </p>
                            )}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 uppercase">Validade</span>
                                <span className="text-[9px] font-bold text-slate-600">
                                    {coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString('pt-BR') : 'Sem prazo'}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {!coupons.length && (
                <EmptyState icon={Ticket} title="Nenhum cupom encontrado" description="Crie cupons em Promoções para campanhas de marketing" />
            )}
        </div>
    );
};

export default CouponsReportView;
