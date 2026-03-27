import React, { useState, useCallback } from 'react';
import { X, CreditCard, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary, PaymentMethod } from '../../../../types';
import { cn } from '../../../../lib/utils';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface TablePaymentModalProps {
  viewingTable: TableSummary | null;
  paymentMethods: PaymentMethod[];
  onCheckout: (data: any) => void;
}

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

  const handleDiscountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscount(e.target.value);
  }, []);

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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl">
              <CreditCard size={24} />
            </div>
            <h3 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
              Finalizar Mesa {viewingTable.number < 10 ? `0${viewingTable.number}` : viewingTable.number}
            </h3>
          </div>
          <button 
            onClick={handleBack}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </header>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase text-slate-500 tracking-wider ml-1">Desconto (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                value={discount} 
                onChange={handleDiscountChange}
                className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 shadow-sm" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold uppercase text-slate-500 tracking-wider ml-1">Opções</label>
              <button 
                onClick={handleToggleServiceTax}
                className={cn(
                  "h-12 rounded-xl border-2 flex items-center justify-center gap-2 transition-all text-sm font-bold uppercase",
                  useServiceTax ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
                )}
              >
                {useServiceTax ? 'Com Taxa (10%)' : 'Sem Taxa'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase text-slate-400 tracking-wider">Total Líquido</span>
              <span className="text-3xl font-bold text-emerald-400">
                R$ {totalValue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Formas de Pagamento</h4>
              <button 
                onClick={handleTogglePartialPayment}
                className={cn(
                  "text-sm font-bold uppercase underline decoration-2 transition-all",
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
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold italic text-orange-500 text-2xl">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      autoFocus 
                      className="w-full h-16 bg-orange-50 border-2 border-orange-200 rounded-2xl pl-14 pr-5 text-2xl font-bold focus:border-orange-500 outline-none transition-all text-orange-900" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      placeholder="0,00" 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => handlePayment(m.id)}
                  className="p-5 flex flex-col items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                >
                  <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">
                    {m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}
                  </div>
                  <span className="text-sm font-bold uppercase text-slate-500 group-hover:text-emerald-700 text-center">
                    {m.name}
                  </span>
                </button>
              ))}
            </div>

            <Card className="p-4 bg-orange-50 border-orange-200 border-2 border-dashed">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-xl text-orange-500 shrink-0">
                  <Info size={18}/>
                </div>
                <p className="text-sm font-medium text-orange-700 leading-tight">
                  Para <span className="font-bold">Pagamento Parcial</span> ou <span className="font-bold">Divisão de Conta</span>, utilize a ferramenta de correção na aba de comandas.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <footer className="mt-6 pt-6 border-t border-slate-100 flex justify-start">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="uppercase text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Voltar para Detalhes
          </Button>
        </footer>
      </motion.div>
    </div>
  );
});
