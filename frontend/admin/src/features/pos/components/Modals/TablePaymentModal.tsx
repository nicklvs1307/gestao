import React, { useState } from 'react';
import { X, CreditCard, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary, PaymentMethod } from '../../../../types';
import { cn } from '../../../../lib/utils';

interface TablePaymentModalProps {
  viewingTable: TableSummary | null;
  paymentMethods: PaymentMethod[];
  onCheckout: (data: any) => void;
}

export const TablePaymentModal: React.FC<TablePaymentModalProps> = ({
  viewingTable, paymentMethods, onCheckout
}) => {
  const { activeModal, setActiveModal } = usePosStore();
  const [discount, setDiscount] = useState('0');
  const [useServiceTax, setUseServiceTax] = useState(true);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  if (activeModal !== 'payment_method' || !viewingTable) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('table_details')} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl"><CreditCard size={20} /></div>
            <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter">Finalizar Mesa 0{viewingTable.number}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setActiveModal('table_details')}><X size={20} /></Button>
        </header>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Desconto (R$)" type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções</label>
              <button onClick={() => setUseServiceTax(!useServiceTax)} className={cn("h-11 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase italic", useServiceTax ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-100 text-slate-400")}>
                {useServiceTax ? 'Com Taxa (10%)' : 'Sem Taxa'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Líquido</span>
              <span className="text-2xl font-black italic text-emerald-400">R$ {(viewingTable.totalAmount - parseFloat(discount || '0')).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Formas de Pagamento</h4>
              <button onClick={() => { setIsPartialPayment(!isPartialPayment); setPaymentAmount(''); }} className={cn("text-[8px] font-black uppercase underline decoration-2 transition-all", isPartialPayment ? "text-orange-500" : "text-slate-400")}>
                {isPartialPayment ? 'Cancelar Parcial' : 'Pagamento Parcial?'}
              </button>
            </div>

            <AnimatePresence>
              {isPartialPayment && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black italic text-orange-500 text-xl">R$</span>
                    <input type="number" step="0.01" autoFocus className="w-full h-14 bg-orange-50 border-2 border-orange-200 rounded-2xl pl-12 pr-4 text-xl font-black italic focus:border-orange-500 outline-none transition-all text-orange-900" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0,00" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(m => (
                <button key={m.id} onClick={() => onCheckout({ paymentMethod: m.id, discount: parseFloat(discount || '0'), useServiceTax, amount: isPartialPayment ? parseFloat(paymentAmount) : (viewingTable.totalAmount - parseFloat(discount || '0')) })} className="p-4 flex flex-col items-center gap-2 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group">
                  <div className="text-2xl grayscale group-hover:grayscale-0 transition-all">{m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}</div>
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-emerald-700 text-center">{m.name}</span>
                </button>
              ))}
            </div>

            <Card className="p-4 bg-orange-50 border-orange-100 border-2 border-dashed">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-orange-500 shadow-sm"><Info size={16}/></div>
                <p className="text-[9px] font-bold text-orange-700 leading-tight uppercase">Para <span className="font-black">Pagamento Parcial</span> ou <span className="font-black">Divisão de Conta</span>, utilize a ferramenta de correção na aba de comandas.</p>
              </div>
            </Card>
          </div>
        </div>

        <footer className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <Button variant="ghost" onClick={() => setActiveModal('table_details')} className="uppercase text-[10px] font-black text-slate-400 italic">Voltar para Detalhes</Button>
        </footer>
      </motion.div>
    </div>
  );
};
