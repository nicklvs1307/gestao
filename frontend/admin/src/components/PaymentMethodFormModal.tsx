import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, LayoutDashboard, Truck, Utensils, CheckCircle, Info, ChevronRight, Loader2, DollarSign, Calendar, Percent, XCircle, Building2 } from 'lucide-react';
import type { PaymentMethod } from '../types';
import { createPaymentMethod, updatePaymentMethod } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

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
  const [feePercentage, setFeePercentage] = useState<string>('0');
  const [daysToReceive, setDaysToReceive] = useState<string>('0');
  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (methodToEdit) {
      setName(methodToEdit.name); setType(methodToEdit.type); setIsActive(methodToEdit.isActive);
      setAllowDelivery(methodToEdit.allowDelivery); setAllowPos(methodToEdit.allowPos); setAllowTable(methodToEdit.allowTable);
      setFeePercentage(methodToEdit.feePercentage ? String(methodToEdit.feePercentage) : '0');
      setDaysToReceive(methodToEdit.daysToReceive ? String(methodToEdit.daysToReceive) : '0');
    } else {
      setName(''); setType('CASH'); setIsActive(true); setAllowDelivery(true); setAllowPos(true); setAllowTable(true);
      setFeePercentage('0'); setDaysToReceive('0');
    }
  }, [methodToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurantId) return;
    setIsLoading(true);
    try {
      const data = { name, type, isActive, allowDelivery, allowPos, allowTable, feePercentage: parseFloat(feePercentage), daysToReceive: parseInt(daysToReceive) };
      if (methodToEdit) await updatePaymentMethod(methodToEdit.id, data);
      else await createPaymentMethod(user.restaurantId, data);
      toast.success(methodToEdit ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
      onSave();
    } catch (err) { toast.error('Erro ao processar solicitação.'); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  const types = [
    { value: 'CASH', label: 'Dinheiro Físico' },
    { value: 'PIX', label: 'Transferência Pix' },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
    { value: 'VOUCHER', label: 'Vale Refeição / Ticket' },
    { value: 'OTHER', label: 'Outros Métodos' },
  ];

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header Premium */}
        <div className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
                    <CreditCard size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                        {methodToEdit ? 'Editar Cobrança' : 'Nova Forma de Receber'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Checkout e Configuração Financeira</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50"><X size={24}/></Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <form onSubmit={handleSubmit} id="payment-form" className="p-10 space-y-8">
                <div className="space-y-6">
                    <Input label="Nome para o Cliente" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Cartão de Crédito (Maquininha)" />
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Tipo de Processamento</label>
                        <select className="ui-input w-full h-12 italic" value={type} onChange={e => setType(e.target.value as any)}>
                            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Canais de Aceite */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block italic">Disponibilidade de Uso</label>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'delivery', label: 'DELIVERY', icon: Truck, state: allowDelivery, set: setAllowDelivery, color: 'emerald' },
                            { id: 'pos', label: 'BALCÃO/PDV', icon: LayoutDashboard, state: allowPos, set: setAllowPos, color: 'blue' },
                            { id: 'table', label: 'MESA/TABLET', icon: Utensils, state: allowTable, set: setAllowTable, color: 'orange' }
                        ].map(item => (
                            <button key={item.id} type="button" onClick={() => item.set(!item.state)} className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                item.state ? `bg-${item.color}-50 border-${item.color}-500 text-${item.color}-700 shadow-lg scale-[1.02]` : "bg-white border-slate-100 text-slate-300 grayscale opacity-50"
                            )}>
                                <item.icon size={20} />
                                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Taxas Financeiras - Card Premium */}
                {(type !== 'CASH') && (
                    <Card className="p-6 border-blue-100 bg-blue-50/20 space-y-6">
                        <h4 className="text-xs font-black text-blue-900 uppercase italic flex items-center gap-2">
                            <Building2 size={16} className="text-blue-500" /> Custos de Operação
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Taxa Adm (%)" type="number" step="0.01" value={feePercentage} onChange={e => setFeePercentage(e.target.value)} icon={Percent} />
                            <Input label="Prazo Receb. (Dias)" type="number" value={daysToReceive} onChange={e => setDaysToReceive(e.target.value)} icon={Calendar} />
                        </div>
                        <p className="text-[9px] text-blue-400 font-bold uppercase italic leading-tight flex items-center gap-2">
                            <Info size={12}/> Estes valores serão usados para o cálculo do Lucro Líquido no seu DRE.
                        </p>
                    </Card>
                )}

                <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center justify-between", isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white")} onClick={() => setIsActive(!isActive)}>
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", isActive ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-slate-100 text-slate-300")}>{isActive ? <CheckCircle size={20} /> : <XCircle size={20} />}</div>
                        <div><p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">Status Ativo</p><span className="text-[9px] font-bold text-slate-400 uppercase">Habilitar opção para uso imediato</span></div>
                    </div>
                    <div className={cn("w-12 h-6 rounded-full relative transition-all shadow-inner", isActive ? "bg-emerald-500" : "bg-slate-200")}><div className={cn("absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-md", isActive ? "left-7" : "left-1")} /></div>
                </Card>
            </form>
        </div>

        {/* Footer Fixo */}
        <div className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">CANCELAR</Button>
            <Button type="submit" form="payment-form" disabled={isSubmitting} isLoading={isSubmitting} className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">
                {methodToEdit ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodFormModal;