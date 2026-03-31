import React, { useState, useCallback } from 'react';
import { X, CreditCard, Banknote, Smartphone, Receipt, Info, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary, PaymentMethod } from '../../../../types';
import { cn } from '../../../../lib/utils';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface TablePaymentModalProps {
  viewingTable: TableSummary | null;
  paymentMethods: PaymentMethod[];
  onCheckout: (data: any) => void;
}

const PaymentIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'CASH') return <Banknote size={22} />;
  if (type === 'PIX') return <Smartphone size={22} />;
  return <CreditCard size={22} />;
};

export const TablePaymentModal: React.FC<TablePaymentModalProps> = React.memo(({
  viewingTable, paymentMethods, onCheckout
}) => {
  const { activeModal, setActiveModal } = usePosStore();
  const [discount, setDiscount] = useState('0');
  const [useServiceTax, setUseServiceTax] = useState(true);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  if (activeModal !== 'payment_method' || !viewingTable) return null;

  const totalValue = viewingTable.totalAmount - parseFloat(discount || '0');

  const handleToggleServiceTax = useCallback(() => {
    setUseServiceTax(!useServiceTax);
  }, [useServiceTax]);

  const handleTogglePartialPayment = useCallback(() => {
    setIsPartialPayment(!isPartialPayment);
    setPaymentAmount('');
  }, [isPartialPayment]);

  const handlePayment = useCallback((methodId: string) => {
    onCheckout({ 
      paymentMethod: methodId, 
      discount: parseFloat(discount || '0'), 
      useServiceTax, 
      amount: isPartialPayment ? parseFloat(paymentAmount) : totalValue 
    });
  }, [onCheckout, discount, useServiceTax, isPartialPayment, paymentAmount, totalValue]);

  const handleBack = useCallback(() => {
    setActiveModal('table_details');
  }, [setActiveModal]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={backdropTransition}
        onClick={handleBack} 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header */}
        <header className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight leading-none">
                Finalizar Mesa {viewingTable.number < 10 ? `0${viewingTable.number}` : viewingTable.number}
              </h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Pagamento</p>
            </div>
          </div>
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Desconto + Taxa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Desconto (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                value={discount} 
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 font-bold text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 shadow-sm transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Taxa Serviço</label>
              <button 
                onClick={handleToggleServiceTax}
                className={cn(
                  "w-full h-11 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-xs font-bold uppercase",
                  useServiceTax 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {useServiceTax ? 'Com Taxa (10%)' : 'Sem Taxa'}
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Líquido</span>
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                R$ {totalValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Formas de Pagamento</h4>
              <button 
                onClick={handleTogglePartialPayment}
                className={cn(
                  "text-[10px] font-bold uppercase underline decoration-2 transition-all",
                  isPartialPayment ? "text-orange-500" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {isPartialPayment ? 'Cancelar Parcial' : 'Pagamento Parcial?'}
              </button>
            </div>

            <AnimatePresence>
              {isPartialPayment && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-orange-500 text-lg">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      autoFocus 
                      className="w-full h-14 bg-orange-50 border-2 border-orange-200 rounded-xl pl-12 pr-4 text-xl font-black focus:border-orange-500 outline-none transition-all text-orange-900" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      placeholder="0,00" 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => handlePayment(m.id)}
                  className="p-4 flex flex-col items-center gap-2.5 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                  )}>
                    <PaymentIcon type={m.type} />
                  </div>
                  <span className="text-xs font-bold uppercase text-slate-500 group-hover:text-emerald-700 text-center">
                    {m.name}
                  </span>
                </button>
              ))}
            </div>

            <Card className="p-3 bg-orange-50 border-orange-200 border-dashed">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                  <Info size={14}/>
                </div>
                <p className="text-[10px] font-medium text-orange-700 leading-relaxed">
                  Para <span className="font-bold">Pagamento Parcial</span> ou <span className="font-bold">Divisão de Conta</span>, utilize a ferramenta de correção na aba de comandas.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 pt-3 border-t border-slate-100 flex justify-start shrink-0">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="uppercase text-xs font-bold text-slate-500 hover:text-slate-700 gap-2"
          >
            <ArrowLeft size={14} />
            Voltar para Detalhes
          </Button>
        </footer>
      </motion.div>
    </div>
  );
});
