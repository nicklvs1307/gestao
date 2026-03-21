import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPromotions, deletePromotion, updatePromotion } from '../services/api';
import { Plus, Edit, Trash2, Percent, Calendar, Tag, Loader2, Sparkles, RefreshCw, Ticket, Package, Layers, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { Button } from './ui/Button';
import { toast } from 'sonner';

type Promotion = any;

const PromotionManagement: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const fetchPromotions = async () => {
        try {
            setIsLoading(true);
            const data = await getPromotions();
            setPromotions(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Erro ao carregar promoções.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPromotions(); }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir esta promoção?')) return;
        try {
            await deletePromotion(id);
            toast.success("Promoção removida.");
            fetchPromotions();
        } catch (e) { toast.error("Erro ao excluir."); }
    };

    const handleStatusToggle = async (p: Promotion) => {
        try {
            const newStatus = !p.isActive;
            await updatePromotion(p.id, { isActive: newStatus });
            setPromotions(prev => prev.map(item => item.id === p.id ? { ...item, isActive: newStatus } : item));
            toast.success(newStatus ? "Promoção ativada!" : "Promoção pausada.");
        } catch (e) { toast.error("Erro ao alterar status."); }
    };

    const getStatusInfo = (p: Promotion) => {
        const now = new Date();
        const start = parseISO(p.startDate);
        const end = parseISO(p.endDate);
        
        if (!p.isActive) return { label: 'Pausada', color: 'bg-slate-100 text-slate-400', textColor: 'text-slate-400' };
        if (isBefore(now, start)) return { label: 'Agendada', color: 'bg-blue-50 text-blue-600', textColor: 'text-blue-500' };
        if (isAfter(now, end)) return { label: 'Expirada', color: 'bg-rose-50 text-rose-600', textColor: 'text-rose-500' };
        return { label: 'Ativa', color: 'bg-emerald-50 text-emerald-600', textColor: 'text-emerald-500' };
    };

    const getTargetIcon = (p: Promotion) => {
        if (p.productId) return <Package size={14} className="text-slate-400" />;
        if (p.addonId) return <Zap size={14} className="text-slate-400" />;
        if (p.categoryId) return <Layers size={14} className="text-slate-400" />;
        return <Tag size={14} className="text-slate-400" />;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header com Navegação */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Marketing & Ofertas</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestão de Promoções e Cupons</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="bg-white rounded-xl" onClick={fetchPromotions}>
                        <RefreshCw size={16} />
                    </Button>
                    <Button onClick={() => navigate('/promotions/new')} className="rounded-xl px-6 italic font-black shadow-lg shadow-orange-100">
                        <Plus size={16} /> Nova Campanha
                    </Button>
                </div>
            </div>

            {/* Tabela Densa de Promoções */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/70 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Campanha</th>
                            <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Desconto</th>
                            <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Alvo</th>
                            <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Vigência</th>
                            <th className="px-6 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                                </td>
                            </tr>
                        ) : promotions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center justify-center text-slate-300 opacity-50">
                                        <Sparkles size={48} strokeWidth={1} className="mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma campanha criada</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            promotions.map(promo => {
                                const status = getStatusInfo(promo);
                                return (
                                    <tr key={promo.id} className="border-b border-slate-50 last:border-b-0">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", promo.code ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600")}>
                                                    {promo.code ? <Ticket size={18} /> : <Percent size={18} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">{promo.name}</p>
                                                    {promo.code && <p className="text-xs text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded-md inline-block mt-1">{promo.code}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded-md border tracking-widest", status.color, status.textColor)}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 italic tracking-tighter text-base">
                                            {promo.discountType?.toLowerCase().includes('percentage') ? `${promo.discountValue}%` : `R$ ${promo.discountValue.toFixed(2).replace('.', ',')}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getTargetIcon(promo)}
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                                                    {promo.product ? promo.product.name : 'Geral'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                            {format(parseISO(promo.startDate), 'dd/MM/yy')} - {format(parseISO(promo.endDate), 'dd/MM/yy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white" onClick={() => navigate(`/promotions/${promo.id}`)}><Edit size={14}/></Button>
                                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white text-rose-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(promo.id)}><Trash2 size={14}/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PromotionManagement;
