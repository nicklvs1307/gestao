import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { X, ShoppingBag, Calculator, Wallet, Info, CheckCircle, MoveRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useCartTotal } from '../../hooks/useCartStore';
import { PaymentMethod } from '../../../../types';

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

interface CheckoutModalProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
}

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

  if (activeModal !== 'pos_checkout') return null;

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

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
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
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200"
      >
        <header className="h-16 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-xl"><ShoppingBag size={20} /></div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider">Finalização de Venda</h3>
              <p className="text-xs font-medium text-slate-400 leading-none">{orderMode === 'table' ? `Mesa ${selectedTable}` : 'Venda Direta / Delivery'}</p>
            </div>
          </div>
          <button 
            onClick={handleCloseModal} 
            className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={22} />
          </button>
        </header>
            
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[400px] bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Calculator size={16} className="text-orange-500" /> Resumo Financeiro
              </h4>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-900 font-bold">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-blue-600">
                  <span>Taxa Entrega</span>
                  <span>+ R$ {parseFloat(posDeliveryFee || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-rose-500">
                  <span>Acréscimo</span>
                  <span>+ R$ {parseFloat(posExtraCharge || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium text-emerald-600 border-b border-slate-100 pb-4">
                  <span>Desconto</span>
                  <span>- R$ {parseFloat(posDiscountValue || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Geral</span>
                  <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                    R$ {totalGeral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Entrega (R$)</label>
                <input 
                  type="number" step="0.01" value={posDeliveryFee} 
                  onChange={handleDeliveryFeeChange}
                  className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm text-blue-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Acréscimo (R$)</label>
                <input 
                  type="number" step="0.01" value={posExtraCharge} 
                  onChange={handleExtraChargeChange}
                  className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm text-rose-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Desconto Aplicado</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">R$</span>
                  <input 
                    type="number" step="0.01" value={posDiscountValue} 
                    onChange={handleDiscountValueChange}
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-4 font-bold text-sm text-emerald-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm"
                  />
                </div>
                <div className="relative w-24">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">%</span>
                  <input 
                    type="number" step="0.01" value={posDiscountPercentage}
                    onChange={handleDiscountPercentageChange}
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm text-emerald-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider ml-1">Observações do Pedido</label>
              <textarea 
                value={posObservations} onChange={handleObservationsChange}
                className="w-full h-24 bg-white border border-slate-200 rounded-xl p-4 font-medium text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 shadow-sm resize-none"
                placeholder="Instruções de entrega ou preparo..."
              />
            </div>
          </div>
          
          <div className="flex-1 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <Wallet size={16} className="text-orange-500" /> Métodos de Recebimento
                </h4>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                  <Info size={14} />
                  <span className="text-xs font-medium uppercase">Escolha 01 forma de pagamento</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => handlePaymentMethodSelect(m.id)}
                    aria-pressed={posPaymentMethodId === m.id}
                    aria-label={`Selecionar ${m.name} como forma de pagamento`}
                    className={cn(
                      "h-16 flex items-center px-5 gap-4 rounded-xl border-2 transition-all group relative overflow-hidden",
                      posPaymentMethodId === m.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02]" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xl",
                      posPaymentMethodId === m.id ? "bg-white/10" : "bg-slate-100 group-hover:bg-slate-200"
                    )}>
                      {m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider truncate">{m.name}</span>
                    {posPaymentMethodId === m.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={14} className="text-emerald-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-8 -mb-8 p-8">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Status do Pagamento</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", posPaymentMethodId ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                  <span className={cn("text-sm font-bold uppercase", posPaymentMethodId ? "text-emerald-600" : "text-rose-500")}>
                    {posPaymentMethodId ? 'Aguardando Confirmação' : 'Selecione o Meio de Pagamento'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCloseModal} className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={!posPaymentMethodId || isSubmitting}
                  isLoading={isSubmitting}
                  className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider shadow-lg disabled:opacity-30 disabled:grayscale transition-all"
                >
                  Confirmar e Enviar <MoveRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
