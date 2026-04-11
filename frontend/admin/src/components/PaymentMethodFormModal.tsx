import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, LayoutDashboard, Truck, Utensils, CheckCircle, Info, ChevronRight, Loader2, DollarSign, Calendar, Percent, XCircle, Building2, Smartphone, Wallet, QrCode, Ticket } from 'lucide-react';
import type { PaymentMethod } from '../types';
import { createPaymentMethod, updatePaymentMethod } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (methodToEdit && isOpen) {
      setName(methodToEdit.name); setType(methodToEdit.type); setIsActive(methodToEdit.isActive);
      setAllowDelivery(methodToEdit.allowDelivery); setAllowPos(methodToEdit.allowPos); setAllowTable(methodToEdit.allowTable);
      setFeePercentage(methodToEdit.feePercentage ? String(methodToEdit.feePercentage) : '0');
      setDaysToReceive(methodToEdit.daysToReceive ? String(methodToEdit.daysToReceive) : '0');
    } else if (isOpen) {
      setName(''); setType('CASH'); setIsActive(true); setAllowDelivery(true); setAllowPos(true); setAllowTable(true);
      setFeePercentage('0'); setDaysToReceive('0');
    }
  }, [methodToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurantId) return;
    setIsLoading(true);
    try {
      const data = { 
        name, type, isActive, allowDelivery, allowPos, allowTable, 
        feePercentage: parseFloat(feePercentage) || 0, 
        daysToReceive: parseInt(daysToReceive) || 0 
      };
      
      if (methodToEdit) await updatePaymentMethod(methodToEdit.id, data);
      else await createPaymentMethod(user.restaurantId, data);
      
      toast.success(methodToEdit ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
      onSave();
      onClose();
    } catch (err: any) { 
        toast.error(err.response?.data?.error || 'Erro ao processar solicitação.'); 
    } finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  const types = [
    { value: 'CASH', label: 'Dinheiro Físico', icon: Wallet },
    { value: 'PIX', label: 'Transferência Pix', icon: QrCode },
    { value: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: CreditCard },
    { value: 'DEBIT_CARD', label: 'Cartão de Débito', icon: CreditCard },
    { value: 'VOUCHER', label: 'Vale Refeição / Ticket', icon: Ticket },
    { value: 'OTHER', label: 'Outros Métodos', icon: Building2 },
  ];

  return (
    <div className="ui-modal-overlay z-[var(--z-modal)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header Compacto & Profissional */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                        {methodToEdit ? 'Editar Cobrança' : 'Nova Forma de Receber'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 leading-none">Configuração ERP / Financeiro</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><X size={22}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <form onSubmit={handleSubmit} id="payment-form" className="p-6 space-y-5">
                
                {/* Nome e Tipo - Grid Denso */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Rótulo no Checkout (Nome Público)</label>
                        <input 
                            required 
                            className="ui-input w-full h-11 italic font-bold" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ex: Cartão de Crédito (Maquininha)" 
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Tipo de Processamento</label>
                        <div className="grid grid-cols-2 gap-2">
                            {types.map(t => (
                                <button 
                                    key={t.value} 
                                    type="button" 
                                    onClick={() => setType(t.value as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all",
                                        type === t.value ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                                    )}
                                >
                                    <t.icon size={14} className={type === t.value ? "text-orange-400" : "text-slate-300"} />
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Canais de Aceite - Horizontal Compacto */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block italic text-center">Disponibilidade nos Canais de Venda</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'delivery', label: 'Logística / Delivery', icon: Truck, state: allowDelivery, set: setAllowDelivery, color: 'blue' },
                            { id: 'pos', label: 'Balcão / PDV', icon: LayoutDashboard, state: allowPos, set: setAllowPos, color: 'emerald' },
                            { id: 'table', label: 'Mesas / Autoatend.', icon: Utensils, state: allowTable, set: setAllowTable, color: 'orange' }
                        ].map(item => (
                            <button key={item.id} type="button" onClick={() => item.set(!item.state)} className={cn(
                                "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1",
                                item.state ? `bg-${item.color}-50 border-${item.color}-500 text-${item.color}-700 shadow-md` : "bg-white border-slate-100 text-slate-300 opacity-40 grayscale"
                            )}>
                                <item.icon size={16} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Taxas Financeiras - Card Super Compacto */}
                {(type !== 'CASH') && (
                    <div className="p-4 bg-slate-900 rounded-[1.5rem] space-y-3 shadow-xl">
                        <div className="flex items-center gap-2 text-white opacity-80 mb-1">
                            <Building2 size={14} className="text-orange-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest italic">Regras de Conciliação Financeira</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Taxa Adm (%)</label>
                                <div className="relative">
                                    <Percent size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="w-full h-9 bg-slate-800 border-none rounded-lg pl-8 pr-2 text-xs font-black text-white outline-none focus:ring-1 focus:ring-orange-500"
                                        value={feePercentage} 
                                        onChange={e => setFeePercentage(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Prazo (Dias)</label>
                                <div className="relative">
                                    <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input 
                                        type="number" 
                                        className="w-full h-9 bg-slate-800 border-none rounded-lg pl-8 pr-2 text-xs font-black text-white outline-none focus:ring-1 focus:ring-orange-500"
                                        value={daysToReceive} 
                                        onChange={e => setDaysToReceive(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Ativo - Compacto */}
                <div 
                    className={cn(
                        "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between", 
                        isActive ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white"
                    )} 
                    onClick={() => setIsActive(!isActive)}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", isActive ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-100 text-slate-300")}>
                            {isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">Habilitado para Uso</p>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{isActive ? 'Ativo no sistema' : 'Inativo / Pausado'}</span>
                        </div>
                    </div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-all", isActive ? "bg-emerald-500" : "bg-slate-200")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", isActive ? "left-6" : "left-1")} />
                    </div>
                </div>
            </form>
        </div>

        {/* Footer Minimalista */}
        <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
            <Button variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50">CANCELAR</Button>
            <Button 
                type="submit" 
                form="payment-form" 
                disabled={isSubmitting} 
                isLoading={isSubmitting} 
                className="flex-[2] h-12 rounded-xl bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black text-[10px]"
            >
                {methodToEdit ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
            </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentMethodFormModal;