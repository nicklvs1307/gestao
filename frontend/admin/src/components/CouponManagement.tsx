import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPromotions, deletePromotion } from '../services/api';
import { Plus, Edit, Trash2, Loader2, RefreshCw, Ticket } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseISO, isAfter, isBefore } from 'date-fns';
import { formatSP } from '@/lib/timezone';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { toast } from 'sonner';
import type { Promotion } from '../types';

const CouponManagement: React.FC = () => {
    const [coupons, setCoupons] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [confirmData, setConfirmData] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
    const navigate = useNavigate();

    const fetchCoupons = async () => {
        try {
            setIsLoading(true);
            const allPromos = await getPromotions();
            const onlyCoupons = Array.isArray(allPromos) ? allPromos.filter(p => !!p.code) : [];
            setCoupons(onlyCoupons);
        } catch (err) {
            toast.error('Erro ao carregar cupons.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar Exclusão', message: 'Tem certeza que deseja excluir este cupom?', onConfirm: async () => {
            try {
                await deletePromotion(id);
                toast.success('Cupom excluído!');
                fetchCoupons();
            } catch (err) {
                toast.error('Erro ao excluir cupom.');
            }
        }});
    };

    const getStatusInfo = (p: Promotion) => {
        const now = new Date();
        const start = parseISO(p.startDate);
        const end = parseISO(p.endDate);

        if (!p.isActive) return { label: 'Inativa', color: 'bg-slate-100', textColor: 'text-slate-500' };
        if (isBefore(now, start)) return { label: 'Agendada', color: 'bg-blue-50', textColor: 'text-blue-500' };
        if (isAfter(now, end)) return { label: 'Expirada', color: 'bg-rose-50', textColor: 'text-rose-400' };
        return { label: 'Ativa', color: 'bg-emerald-50', textColor: 'text-emerald-600' };
    };

    const usagePercentage = (coupon: Promotion) => {
        if (!coupon.usageLimit) return 0;
        return Math.min(100, ((coupon.usedCount || 0) / coupon.usageLimit) * 100);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-wide uppercase leading-none">Cupons de Desconto</h1>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <Ticket size={12} className="text-purple-500" /> 
                        Gestão de cupons de desconto para clientes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-border rounded-xl" onClick={fetchCoupons}>
                        <RefreshCw size={16} className={cn("text-muted-foreground", isLoading && "animate-spin")} />
                    </Button>
                    <Button onClick={() => navigate('/coupons/new')} className="rounded-xl px-6 font-bold h-10 shadow-lg text-xs gap-2">
                        <Plus size={16} /> NOVO CUPOM
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border border-border shadow-xl bg-white rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead className="bg-muted/80 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Cupom</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Desconto</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Pedido Mínimo</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Limite de Uso</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Vigência</th>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20">
                                        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : coupons.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center bg-muted/30">
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <Ticket size={48} strokeWidth={1} className="mb-3" />
                                            <p className="font-bold text-[10px] uppercase tracking-[0.2em]">Nenhum cupom criado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                coupons.map(coupon => {
                                    const status = getStatusInfo(coupon);
                                    return (
                                        <tr key={coupon.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                                                        <Ticket size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">{coupon.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded-md inline-block mt-1">
                                                            {coupon.code}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded-md border tracking-widest", status.color, status.textColor)}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-emerald-600 italic tracking-tighter text-base">
                                                {coupon.discountType === 'percentage' 
                                                    ? `${coupon.discountValue}%` 
                                                    : `R$ ${coupon.discountValue.toFixed(2).replace('.', ',')}`}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-500">
                                                {coupon.minOrderValue && coupon.minOrderValue > 0 
                                                    ? `R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}` 
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-purple-500 rounded-full" 
                                                            style={{ width: `${usagePercentage(coupon)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {coupon.usedCount || 0}/{coupon.usageLimit || '∞'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-500">
                                                {formatSP(coupon.startDate, 'dd/MM')} - {formatSP(coupon.endDate, 'dd/MM')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary border border-border shadow-sm" onClick={() => navigate(`/coupons/${coupon.id}`)}>
                                                        <Edit size={14}/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive border border-border shadow-sm" onClick={() => handleDelete(coupon.id)}>
                                                        <Trash2 size={14}/>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData({...confirmData, open: false})} onConfirm={() => {confirmData.onConfirm(); setConfirmData({...confirmData, open: false});}} title={confirmData.title} message={confirmData.message} />
        </div>
    );
};

export default CouponManagement;
