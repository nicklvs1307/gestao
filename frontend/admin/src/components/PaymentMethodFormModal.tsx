import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, LayoutDashboard, Truck, Utensils } from 'lucide-react';
import type { PaymentMethod } from '../types';
import { createPaymentMethod, updatePaymentMethod } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface PaymentMethodFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  methodToEdit: PaymentMethod | null;
}

const PaymentMethodFormModal: React.FC<PaymentMethodFormModalProps> = ({ isOpen, onClose, onSave, methodToEdit }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethod['type']>('CASH');
  const [isActive, setIsActive] = useState(true);
  const [allowDelivery, setAllowDelivery] = useState(true);
  const [allowPos, setAllowPos] = useState(true);
  const [allowTable, setAllowTable] = useState(true);
  
  // Novos campos financeiros
  const [feePercentage, setFeePercentage] = useState<string>('0');
  const [daysToReceive, setDaysToReceive] = useState<string>('0');

  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (methodToEdit) {
      setName(methodToEdit.name);
      setType(methodToEdit.type);
      setIsActive(methodToEdit.isActive);
      setAllowDelivery(methodToEdit.allowDelivery);
      setAllowPos(methodToEdit.allowPos);
      setAllowTable(methodToEdit.allowTable);
      setFeePercentage(methodToEdit.feePercentage ? String(methodToEdit.feePercentage) : '0');
      setDaysToReceive(methodToEdit.daysToReceive ? String(methodToEdit.daysToReceive) : '0');
    } else {
      setName('');
      setType('CASH');
      setIsActive(true);
      setAllowDelivery(true);
      setAllowPos(true);
      setAllowTable(true);
      setFeePercentage('0');
      setDaysToReceive('0');
    }
  }, [methodToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurantId) return;

    try {
      setIsLoading(true);
      const data = { 
        name, 
        type, 
        isActive, 
        allowDelivery, 
        allowPos, 
        allowTable,
        feePercentage: parseFloat(feePercentage),
        daysToReceive: parseInt(daysToReceive)
      };
      
      if (methodToEdit) {
        await updatePaymentMethod(methodToEdit.id, data);
        toast.success('Forma de pagamento atualizada!');
      } else {
        await createPaymentMethod(user.restaurantId, data);
        toast.success('Forma de pagamento criada!');
      }
      onSave();
    } catch (err) {
      toast.error('Erro ao salvar forma de pagamento.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const types = [
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'PIX', label: 'Pix' },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
    { value: 'VOUCHER', label: 'Vale Refeição / Voucher' },
    { value: 'OTHER', label: 'Outros' },
  ];

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-xl">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <CreditCard size={20} />
            </div>
            <h3 className="font-bold text-slate-900">
              {methodToEdit ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome de Exibição</label>
              <input 
                className="ui-input w-full"
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="Ex: Cartão de Crédito"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Pagamento</label>
              <select 
                className="ui-input w-full cursor-pointer"
                value={type}
                onChange={e => setType(e.target.value as any)}
              >
                {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Onde aceitar?</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAllowDelivery(!allowDelivery)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5",
                    allowDelivery ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-100 text-slate-400 opacity-50"
                  )}
                >
                  <Truck size={18} />
                  <span className="text-[8px] font-black uppercase">Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllowPos(!allowPos)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5",
                    allowPos ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-400 opacity-50"
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span className="text-[8px] font-black uppercase">PDV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllowTable(!allowTable)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5",
                    allowTable ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-white border-slate-100 text-slate-400 opacity-50"
                  )}
                >
                  <Utensils size={18} />
                  <span className="text-[8px] font-black uppercase">Mesa</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900 leading-none">Meio de Pagamento Ativo</p>
                <p className="text-[9px] font-medium text-slate-400 uppercase mt-1">Exibir para clientes e equipe.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                  isActive ? 'bg-primary' : 'bg-slate-200'
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
                  isActive ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            {/* Configurações de Taxas e Prazos */}
            {(type === 'CREDIT_CARD' || type === 'DEBIT_CARD' || type === 'VOUCHER' || type === 'PIX') && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-widest flex items-center gap-2">
                      <CreditCard size={14} /> Configurações Financeiras
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Taxa (%)</label>
                          <input 
                              type="number" step="0.01"
                              className="ui-input w-full h-10"
                              value={feePercentage}
                              onChange={e => setFeePercentage(e.target.value)}
                              placeholder="0.00"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Prazo (Dias)</label>
                          <input 
                              type="number"
                              className="ui-input w-full h-10"
                              value={daysToReceive}
                              onChange={e => setDaysToReceive(e.target.value)}
                              placeholder="0"
                          />
                      </div>
                  </div>
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="ui-button-secondary flex-1">Cancelar</button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="ui-button-primary flex-1"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {methodToEdit ? 'Salvar Alterações' : 'Criar Forma'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodFormModal;