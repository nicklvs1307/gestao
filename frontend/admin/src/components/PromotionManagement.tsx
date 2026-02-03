import React, { useState, useEffect } from 'react';
import { getPromotions, deletePromotion, updatePromotion } from '../services/api';
import { Plus, Edit, Trash2, Percent, Calendar, Tag, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Supondo que a tipagem de Promotion venha de um arquivo central
// import type { Promotion } from '@/types/index';
type Promotion = any; 

// Componente de Toggle Switch
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
            e.stopPropagation();
            onChange(!checked);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
};

interface PromotionManagementProps {
  onAddPromotionClick: () => void;
  onEditPromotionClick: (promotion: Promotion) => void;
  refetchTrigger: number;
}

const PromotionManagement: React.FC<PromotionManagementProps> = ({ onAddPromotionClick, onEditPromotionClick, refetchTrigger }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPromotions = async () => {
    try {
      setIsLoading(true);
      const data = await getPromotions();
      if (Array.isArray(data)) {
          setPromotions(data);
      } else {
          setPromotions([]);
          console.error("Formato inválido recebido para promoções:", data);
      }
      setError(null);
    } catch (err) {
      setError('Falha ao buscar as promoções. Verifique sua conexão.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [refetchTrigger]);

  const handleDelete = async (promotionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta promoção?')) return;

    try {
      await deletePromotion(promotionId);
      fetchPromotions(); // Re-busca para atualizar a lista
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir a promoção.');
    }
  };

  const handleStatusChange = async (promotion: Promotion, isActive: boolean) => {
    const originalPromotions = [...promotions];
    setPromotions(prev => prev.map(p => p.id === promotion.id ? { ...p, isActive } : p));

    try {
      await updatePromotion(promotion.id, { isActive });
    } catch (err) {
      alert('Falha ao atualizar o status da promoção.');
      setPromotions(originalPromotions);
    }
  };

  if (isLoading) return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Carregando ofertas...</p>
      </div>
  );

  if (error) return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-8 text-center rounded-lg bg-destructive/5 border border-destructive/20 text-destructive mx-auto max-w-2xl mt-8">
        <AlertCircle className="h-12 w-12" />
        <div>
          <h3 className="text-lg font-semibold">Erro ao carregar</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <button 
          onClick={fetchPromotions}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ui-card p-4">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Promoções
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Ofertas e cupons ativos.</p>
        </div>
        <button 
          className="ui-button-primary h-10 px-4 text-[10px] uppercase tracking-widest"
          onClick={onAddPromotionClick}
        >
          <Plus size={16} />
          Nova Promoção
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border font-black tracking-widest">
              <tr>
                <th className="px-6 py-3 w-[25%]">Promoção</th>
                <th className="px-6 py-3">Alvo</th>
                <th className="px-6 py-3 text-center">Desconto</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {promotions.length === 0 ? (
                <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                        <Sparkles className="mx-auto h-10 w-10 opacity-20 mb-3" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Nenhuma oferta</p>
                    </td>
                </tr>
              ) : (
                promotions.map(promo => (
                  <tr key={promo.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-3">
                        <div className="flex flex-col">
                            <span className="font-bold text-xs uppercase italic tracking-tight">{promo.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-slate-400 font-bold uppercase">
                                <Calendar size={8} />
                                {format(parseISO(promo.startDate), 'dd/MM')} - {format(parseISO(promo.endDate), 'dd/MM')}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-3">
                        {promo.product ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                                <Tag size={8} />
                                {promo.product.name}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[8px] font-black uppercase tracking-widest border border-purple-100 dark:border-purple-900/30">
                                <Tag size={8} />
                                Global
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-3 text-center">
                        <span className="font-black text-xs italic text-green-600 dark:text-green-400">
                            {promo.discountType === 'percentage' || promo.discountType === 'PERCENTAGE' 
                                ? `${promo.discountValue}%` 
                                : `R$ ${promo.discountValue.toFixed(2)}`}
                        </span>
                    </td>
                    <td className="px-6 py-3">
                        <div className="flex flex-col items-center gap-1">
                            <ToggleSwitch 
                                checked={promo.isActive} 
                                onChange={(isChecked) => handleStatusChange(promo, isChecked)}
                            />
                            <span className={cn("text-[7px] font-black uppercase tracking-widest", promo.isActive ? "text-emerald-600" : "text-slate-400")}>
                                {promo.isActive ? "Ativo" : "Off"}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                            <button 
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                                onClick={() => onEditPromotionClick(promo)}
                            >
                                <Edit size={16} />
                            </button>
                            <button 
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                                onClick={() => handleDelete(promo.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PromotionManagement;

