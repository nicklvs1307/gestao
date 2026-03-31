import React, { useMemo, useCallback } from 'react';
import { X, Calculator, Wallet, CheckCircle, MoveRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useCartTotal } from '../../hooks/useCartStore';
import { PaymentMethod } from '../../../../types';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface CheckoutModalProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
}

const PaymentIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'CASH') return <span className="text-lg">💵</span>;
  if (type === 'PIX') return <span className="text-lg">📱</span>;
  return <span className="text-lg">💳</span>;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = React.memo(({ paymentMethods, onSubmitOrder }) => {
  const { 
    activeModal, setActiveModal,
    orderMode, selectedTable,
    posDeliveryFee, setPosDeliveryFee,
    posExtraCharge, setPosExtraCharge,
    posDiscountValue, setPosDiscountValue,
    posDiscountPercentage, setPosDiscountPercentage,
    posPaymentMethodId, setPosPaymentMethodId,
    posObservations, setPosObservations,
    isSubmitting
  } = usePosStore();

  const cartTotal = useCartTotal();
  const prefersReducedMotion = usePrefersReducedMotion();

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  const totalGeral = useMemo(() => {
    return cartTotal + parseFloat(posExtraCharge || '0') + parseFloat(posDeliveryFee || '0') - parseFloat(posDiscountValue || '0');
  }, [cartTotal, posExtraCharge, posDeliveryFee, posDiscountValue]);

  const handleDeliveryFeeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPosDeliveryFee(e.target.value);
  }, [setPosDeliveryFee]);

  const handleExtraChargeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPosExtraCharge(e.target.value);
  }, [setPosExtraCharge]);

  const handleDiscountValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPosDiscountValue(val);
    const numVal = parseFloat(val) || 0;
    const perc = cartTotal > 0 ? ((numVal / cartTotal) * 100).toFixed(2) : '0';
    setPosDiscountPercentage(perc === 'Infinity' || perc === 'NaN' ? '0' : perc);
  }, [setPosDiscountValue, setPosDiscountPercentage, cartTotal]);

  const handleDiscountPercentageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const perc = e.target.value;
    setPosDiscountPercentage(perc);
    const numPerc = parseFloat(perc) || 0;
    const val = ((numPerc / 100) * cartTotal).toFixed(2);
    setPosDiscountValue(val);
  }, [setPosDiscountPercentage, setPosDiscountValue, cartTotal]);

  const handleObservationsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPosObservations(e.target.value);
  }, [setPosObservations]);

  const handlePaymentMethodSelect = useCallback((methodId: string) => {
    setPosPaymentMethodId(methodId);
  }, [setPosPaymentMethodId]);

  const handleCloseModal = useCallback(() => {
    setActiveModal('none');
  }, [setActiveModal]);

  const handleSubmitOrder = useCallback(() => {
    if (posPaymentMethodId && !isSubmitting) {
      onSubmitOrder();
    }
  }, [onSubmitOrder, posPaymentMethodId, isSubmitting]);

  if (activeModal !== 'pos_checkout') return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={backdropTransition}
        onClick={handleCloseModal} 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.98, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.98, opacity: 0, y: 10 }} 
        transition={modalTransition}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh] sm:max-h-[90vh] border border-slate-200"
      >
        <header className="h-14 sm:h-16 bg-slate-900 text-white px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-lg">🛒</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase italic tracking-tighter">Finalização</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none">
                {orderMode === 'table' ? `Mesa ${selectedTable}` : 'Venda Direta / Delivery'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCloseModal} 
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>
            
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-[340px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                <Calculator size={14} className="text-orange-500" /> Resumo Financeiro
              </h4>
              
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Subtotal</span>
                  <span className="text-[11px] font-black text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Taxa Entrega</span>
                  <span className="text-[11px] font-bold text-blue-600">+ R$ {parseFloat(posDeliveryFee || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">Acréscimo</span>
                  <span className="text-[11px] font-bold text-rose-500">+ R$ {parseFloat(posExtraCharge || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Desconto</span>
                  <span className="text-[11px] font-bold text-emerald-600">- R$ {parseFloat(posDiscountValue || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                    R$ {totalGeral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Entrega (R$)</label>
                <input 
                  type="number" step="0.01" value={posDeliveryFee} 
                  onChange={handleDeliveryFeeChange}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-black text-[10px] text-blue-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 shadow-sm" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Acréscimo (R$)</label>
                <input 
                  type="number" step="0.01" value={posExtraCharge} 
                  onChange={handleExtraChargeChange}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-black text-[10px] text-rose-500 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100 shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Desconto</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-[9px] text-slate-400">R$</span>
                  <input 
                    type="number" step="0.01" value={posDiscountValue} 
                    onChange={handleDiscountValueChange}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-8 pr-3 font-black text-[10px] text-emerald-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 shadow-sm"
                  />
                </div>
                <div className="relative w-16">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-[9px] text-slate-400">%</span>
                  <input 
                    type="number" step="0.01" value={posDiscountPercentage}
                    onChange={handleDiscountPercentageChange}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 pr-7 font-black text-[10px] text-emerald-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-auto">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Observações</label>
              <textarea 
                value={posObservations} onChange={handleObservationsChange}
                className="w-full h-16 sm:h-20 bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-[10px] outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 shadow-sm resize-none"
                placeholder="Instruções..."
              />
            </div>
          </div>
          
          <div className="flex-1 bg-white p-4 flex flex-col">
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Wallet size={14} className="text-orange-500" /> Forma de Pagamento
                </h4>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                  <span className="text-[9px] font-black uppercase">Escolha 1</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {paymentMethods.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => handlePaymentMethodSelect(m.id)}
                    aria-pressed={posPaymentMethodId === m.id}
                    aria-label={`Selecionar ${m.name} como forma de pagamento`}
                    className={cn(
                      "h-12 sm:h-14 flex items-center px-3 gap-2 rounded-xl border-2 transition-all group relative",
                      posPaymentMethodId === m.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      posPaymentMethodId === m.id ? "bg-white/10" : "bg-slate-100 group-hover:bg-slate-200"
                    )}>
                      <PaymentIcon type={m.type} />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">{m.name}</span>
                    {posPaymentMethodId === m.id && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle size={12} className="text-emerald-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-4 -mb-4 p-4 rounded-b-2xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", posPaymentMethodId ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                  <span className={cn("text-[10px] font-black uppercase", posPaymentMethodId ? "text-emerald-600" : "text-rose-500")}>
                    {posPaymentMethodId ? 'Pronto' : 'Selecione'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCloseModal} className="h-9 px-4 rounded-lg border-slate-200 text-slate-600 font-black uppercase text-[9px] tracking-wider">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={!posPaymentMethodId || isSubmitting}
                  isLoading={isSubmitting}
                  className="h-9 sm:h-10 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[9px] tracking-wider shadow-lg disabled:opacity-30 disabled:grayscale transition-all"
                >
                  Confirmar <MoveRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
