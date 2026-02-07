import React, { useState, useEffect } from 'react';
import type { Promotion, Product } from '@/types/index';
import { createPromotion, updatePromotion, getProducts } from '../services/api';
import { X, Percent, Save, Loader2, Calendar, Tag, Ticket, Info, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { toast } from 'sonner';

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  promotionToEdit?: Promotion | null;
}

const PromotionFormModal: React.FC<PromotionFormModalProps> = ({ isOpen, onClose, onSave, promotionToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '' as number | string,
    startDate: '',
    endDate: '',
    isActive: true,
    productId: '',
    code: '',
    minOrderValue: 0 as number | string,
    usageLimit: '' as number | string,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!promotionToEdit;

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && promotionToEdit) {
      setFormData({
        name: promotionToEdit.name,
        description: promotionToEdit.description || '',
        discountType: promotionToEdit.discountType,
        discountValue: promotionToEdit.discountValue,
        startDate: promotionToEdit.startDate ? new Date(promotionToEdit.startDate).toISOString().split('T')[0] : '',
        endDate: promotionToEdit.endDate ? new Date(promotionToEdit.endDate).toISOString().split('T')[0] : '',
        isActive: promotionToEdit.isActive,
        productId: promotionToEdit.productId || '',
        code: promotionToEdit.code || '',
        minOrderValue: promotionToEdit.minOrderValue || 0,
        usageLimit: promotionToEdit.usageLimit || '',
      });
    } else {
      setFormData({
        name: '', description: '', discountType: 'percentage', discountValue: '',
        startDate: '', endDate: '', isActive: true, productId: '',
        code: '', minOrderValue: 0, usageLimit: '',
      });
    }
  }, [promotionToEdit, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.discountValue || !formData.startDate || !formData.endDate) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        discountValue: Number(formData.discountValue),
        minOrderValue: Number(formData.minOrderValue),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        productId: formData.productId || null,
        code: formData.code || null
      };

      if (isEditing && promotionToEdit) await updatePromotion(promotionToEdit.id, payload);
      else await createPromotion(payload);
      
      toast.success(isEditing ? "Promoção atualizada!" : "Promoção criada com sucesso!");
      onSave();
    } catch (error) {
      toast.error("Erro ao salvar promoção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header Premium */}
        <div className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-xl shadow-orange-100">
                    <Percent size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                        {isEditing ? 'Editar Oferta' : 'Criar Promoção'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Campanhas e Descontos</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50">
                <X size={24} />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <form onSubmit={handleSubmit} id="promotion-form" className="p-10 space-y-8">
                {/* Dados Básicos */}
                <div className="space-y-4">
                    <Input label="Nome da Campanha" required placeholder="Ex: Cupom de Boas-vindas" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <Input label="Descrição Curta (Opcional)" placeholder="Ex: Válido apenas para o primeiro pedido via Delivery." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                {/* Configurações de Desconto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
                        <div className="flex p-1 bg-white border border-slate-100 rounded-xl gap-1">
                            <button type="button" onClick={() => setFormData({...formData, discountType: 'percentage'})} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", formData.discountType === 'percentage' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}>Porcentagem</button>
                            <button type="button" onClick={() => setFormData({...formData, discountType: 'fixed_amount'})} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", formData.discountType === 'fixed_amount' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}>Valor Fixo</button>
                        </div>
                    </div>
                    <Input label={`Valor do Desconto (${formData.discountType === 'percentage' ? '%' : 'R$'})`} type="number" required placeholder="0.00" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} />
                </div>

                {/* REGRAS DE CUPOM - CARD ESPECIAL */}
                <Card className="p-6 border-purple-100 bg-purple-50/20 space-y-6">
                    <h4 className="text-xs font-black text-purple-900 uppercase italic flex items-center gap-2">
                        <Ticket size={16} className="text-purple-500" /> Ativar como Cupom?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Código" placeholder="CUPOM10" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                        <Input label="Valor Mínimo" type="number" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} />
                        <Input label="Uso Máximo" type="number" placeholder="∞" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                    </div>
                    <p className="text-[9px] text-purple-400 font-bold uppercase italic leading-tight flex items-center gap-2">
                        <Info size={12}/> Deixe o código em branco se quiser aplicar o desconto automaticamente a todos.
                    </p>
                </Card>

                {/* ALVO E VALIDADE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aplicar Desconto Em:</label>
                        <select className="ui-input w-full h-12" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                            <option value="">Todo o Cardápio (Geral)</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Válido De" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                        <Input label="Até" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                    </div>
                </div>

                <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center gap-3", formData.isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white")} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                    <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", formData.isActive ? "bg-emerald-500 border-emerald-500" : "border-slate-300")}>{formData.isActive && <CheckCircle size={14} className="text-white" />}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Promoção Ativa e Visível no Cardápio</span>
                </Card>
            </form>
        </div>

        {/* Rodapé Fixo */}
        <div className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancelar</Button>
            <Button type="submit" form="promotion-form" disabled={isSubmitting} isLoading={isSubmitting} className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">
                {isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR CAMPANHA'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PromotionFormModal;