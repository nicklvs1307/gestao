import React, { useState, useEffect } from 'react';
import { getPromotions, deletePromotion, updatePromotion } from '../services/api';
import { Plus, Edit, Trash2, Percent, Calendar, Tag, Loader2, Sparkles, RefreshCw, Ticket, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';

type Promotion = any; 

const PromotionManagement: React.FC<{ refetchTrigger: number; onAddPromotionClick: () => void; onEditPromotionClick: (p: any) => void }> = ({ onAddPromotionClick, onEditPromotionClick, refetchTrigger }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const data = await getPromotions();
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar promoções.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPromotions(); }, [refetchTrigger]);

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
    
    if (!p.isActive) return { label: 'Pausada', color: 'bg-slate-100 text-slate-400' };
    if (isBefore(now, start)) return { label: 'Agendada', color: 'bg-blue-50 text-blue-600' };
    if (isAfter(now, end)) return { label: 'Expirada', color: 'bg-rose-50 text-rose-600' };
    return { label: 'Ativa', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  if (isLoading) return (
      <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Ofertas...</span>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Marketing & Ofertas</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Percent size={14} className="text-orange-500" /> Gestão de Promoções e Cupons
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white rounded-xl" onClick={fetchPromotions}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={onAddPromotionClick} className="rounded-xl px-6 italic">
                <Plus size={18} /> NOVA PROMOÇÃO
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {promotions.length === 0 ? (
            <Card className="col-span-full p-20 flex flex-col items-center justify-center text-slate-300 opacity-30 border-dashed border-2">
                <Sparkles size={64} strokeWidth={1} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma oferta ativa</p>
            </Card>
        ) : (
            promotions.map(promo => {
                const status = getStatusInfo(promo);
                return (
                    <Card key={promo.id} className="p-0 overflow-hidden border-2 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl flex flex-col" noPadding>
                        <div className="p-6 flex-1 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", promo.code ? "bg-purple-500 text-white shadow-purple-100" : "bg-orange-500 text-white shadow-orange-100")}>
                                        {promo.code ? <Ticket size={24} /> : <Percent size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none">{promo.name}</h3>
                                        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border mt-2 inline-block tracking-widest shadow-sm", status.color)}>
                                            {status.label}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50" onClick={() => onEditPromotionClick(promo)}><Edit size={16}/></Button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desconto</span>
                                    <span className="text-xl font-black text-emerald-600 italic tracking-tighter">
                                        {promo.discountType?.toLowerCase().includes('percentage') ? `${promo.discountValue}%` : `R$ ${promo.discountValue.toFixed(2).replace('.', ',')}`}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Válido De</p>
                                        <p className="text-[10px] font-bold text-slate-700 uppercase italic">{format(parseISO(promo.startDate), 'dd/MMM/yy')}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Até</p>
                                        <p className="text-[10px] font-bold text-slate-700 uppercase italic">{format(parseISO(promo.endDate), 'dd/MMM/yy')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 px-2">
                                    <Tag size={14} className="text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                                        {promo.product ? `Apenas em: ${promo.product.name}` : 'Válido para todo o cardápio'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer do Card com Toggle */}
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleStatusToggle(promo)}>
                                <div className={cn("w-10 h-5 rounded-full relative transition-all duration-300", promo.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-100" : "bg-slate-200")}>
                                    <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm", promo.isActive ? "left-6" : "left-1")} />
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", promo.isActive ? "text-emerald-600" : "text-slate-400")}>
                                    {promo.isActive ? 'Ativa' : 'Pausada'}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(promo.id)}><Trash2 size={16}/></Button>
                        </div>
                    </Card>
                );
            })
        )}
      </div>
    </div>
  );
};

export default PromotionManagement;