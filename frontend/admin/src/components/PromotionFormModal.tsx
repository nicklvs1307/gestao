import React, { useState, useEffect } from 'react';
// import type { Promotion, Product } from '@/types/index';
type Promotion = any;
type Product = any;
import { createPromotion, updatePromotion, getProducts } from '../services/api';
import { X, Percent, Save, Loader2, Calendar, Tag, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  promotionToEdit?: Promotion | null;
}

const DISCOUNT_TYPES = [
    { value: 'percentage', label: 'Porcentagem (%)' },
    { value: 'fixed_amount', label: 'Valor Fixo (R$)' }
];

const PromotionFormModal: React.FC<PromotionFormModalProps> = ({ isOpen, onClose, onSave, promotionToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState<number | string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  // Novos campos: Cupons
  const [code, setCode] = useState('');
  const [minOrderValue, setMinOrderValue] = useState<number | string>(0);
  const [usageLimit, setUsageLimit] = useState<number | string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!promotionToEdit;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await getProducts();
        if (Array.isArray(productsData)) {
            setProducts(productsData);
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && promotionToEdit) {
      setName(promotionToEdit.name);
      setDescription(promotionToEdit.description || '');
      setDiscountType(promotionToEdit.discountType);
      setDiscountValue(promotionToEdit.discountValue);
      setStartDate(promotionToEdit.startDate ? new Date(promotionToEdit.startDate).toISOString().split('T')[0] : '');
      setEndDate(promotionToEdit.endDate ? new Date(promotionToEdit.endDate).toISOString().split('T')[0] : '');
      setIsActive(promotionToEdit.isActive);
      setSelectedProductId(promotionToEdit.productId || '');
      setCode(promotionToEdit.code || '');
      setMinOrderValue(promotionToEdit.minOrderValue || 0);
      setUsageLimit(promotionToEdit.usageLimit || '');
    } else {
      setName('');
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue('');
      setStartDate('');
      setEndDate('');
      setIsActive(true);
      setSelectedProductId('');
      setCode('');
      setMinOrderValue(0);
      setUsageLimit('');
    }
  }, [promotionToEdit, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !discountValue || !startDate || !endDate) return;

    setIsSubmitting(true);
    const promotionData = { 
      name, 
      description, 
      discountType, 
      discountValue: Number(discountValue), 
      startDate, 
      endDate, 
      isActive,
      productId: selectedProductId || null,
      code: code || null,
      minOrderValue: Number(minOrderValue),
      usageLimit: usageLimit ? Number(usageLimit) : null
    };

    try {
      if (isEditing && promotionToEdit) {
        await updatePromotion(promotionToEdit.id, promotionData);
      } else {
        await createPromotion(promotionData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save promotion:', error);
      alert('Falha ao salvar a promoção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-2xl">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Percent size={20} />
            </div>
            <h3 className="font-bold text-slate-900">{isEditing ? 'Editar Promoção' : 'Nova Promoção'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={20} /></button>
        </div>

        {/* Corpo Scrollável */}
        <div className="overflow-y-auto p-6 custom-scrollbar max-h-[70vh]">
            <form id="promotion-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Nome e Descrição */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Promoção</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          required 
                          placeholder="Ex: Happy Hour de Sexta"
                          className="ui-input w-full"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                        <textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="Regras ou detalhes..."
                            rows={2}
                            className="ui-input w-full h-auto py-2 resize-none"
                        />
                    </div>
                </div>

                {/* CONFIGURAÇÕES DE CUPOM */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                        <Tag size={14} /> Regras de Cupom (Opcional)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Código</label>
                            <input 
                                type="text"
                                placeholder="PIZZA10"
                                className="ui-input w-full h-9 text-xs uppercase font-black"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Vlr Mín</label>
                            <input 
                                type="number"
                                className="ui-input w-full h-9 text-xs"
                                value={minOrderValue}
                                onChange={e => setMinOrderValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Limite</label>
                            <input 
                                type="number"
                                placeholder="∞"
                                className="ui-input w-full h-9 text-xs"
                                value={usageLimit}
                                onChange={e => setUsageLimit(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Produto Alvo</label>
                        <select 
                            value={selectedProductId} 
                            onChange={e => setSelectedProductId(e.target.value)} 
                            className="ui-input w-full cursor-pointer"
                        >
                            <option value="">Aplicar no Carrinho Geral</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo</label>
                            <select 
                                value={discountType} 
                                onChange={e => setDiscountType(e.target.value)}
                                className="ui-input w-full cursor-pointer"
                            >
                                {DISCOUNT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor</label>
                            <input 
                                type="number" 
                                value={discountValue} 
                                onChange={e => setDiscountValue(e.target.value)} 
                                required 
                                className="ui-input w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Início</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            required 
                            className="ui-input w-full"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Término</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            required 
                            className="ui-input w-full"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                        type="checkbox" 
                        id="isActive"
                        checked={isActive} 
                        onChange={e => setIsActive(e.target.checked)} 
                        className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none uppercase">
                        Promoção Ativa
                    </label>
                </div>
            </form>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button type="button" className="ui-button-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="ui-button-primary flex-1" form="promotion-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionFormModal;
