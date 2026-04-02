import React, { useMemo, useCallback, useEffect } from 'react';
import { X, Calculator, Wallet, CheckCircle, MoveRight, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useCartTotal } from '../../hooks/useCartStore';
import { PaymentMethod } from '../../../../types';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';
import { useScrollLock } from '../../../../hooks/useScrollLock';

interface CheckoutModalProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
}

const PaymentIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'CASH') return <Banknote size={20} />;
  if (type === 'PIX') return <Smartphone size={20} />;
  return <CreditCard size={20} />;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = React.memo(({ paymentMethods, onSubmitOrder }) => {
  const { 
    activeModal, setActiveModal,
    activeTab, selectedTable,
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
  const isCheckoutOpen = activeModal === 'checkout';

  useScrollLock(isCheckoutOpen);

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  const totalGeral = useMemo(() => {
    return cartTotal + parseFloat(posExtraCharge || '0') + parseFloat(posDeliveryFee || '0') - parseFloat(posDiscountValue || '0');
  }, [cartTotal, posExtraCharge, posDeliveryFee, posDiscountValue]);

  const handleCloseModal = useCallback(() => {
    setActiveModal('none');
  }, [setActiveModal]);

  const handleSubmitOrder = useCallback(() => {
    if (posPaymentMethodId && !isSubmitting) {
      onSubmitOrder();
    }
  }, [onSubmitOrder, posPaymentMethodId, isSubmitting]);

  if (activeModal !== 'pos_checkout') return null;

  const tabLabels: Record<string, { label: string; color: string }> = {
    table: { label: `Mesa ${selectedTable}`, color: 'emerald' },
    counter: { label: 'Balcão', color: 'blue' },
    delivery: { label: 'Entrega', color: 'orange' },
  };
  const currentTab = tabLabels[activeTab] || tabLabels.table;

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
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200"
      >
        {/* Header */}
        <header className="h-16 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight leading-none">Finalização</h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                {currentTab.label}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCloseModal} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>
            
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Coluna Esquerda - Resumo Financeiro */}
          <div className="w-full lg:w-[340px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Calculator size={14} className="text-orange-500" /> Resumo Financeiro
              </h4>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Subtotal</span>
                  <span className="text-sm font-black text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Taxa Entrega</span>
                  <span className="text-sm font-bold text-blue-600">+ R$ {parseFloat(posDeliveryFee || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">Acréscimo</span>
                  <span className="text-sm font-bold text-rose-500">+ R$ {parseFloat(posExtraCharge || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Desconto</span>
                  <span className="text-sm font-bold text-emerald-600">- R$ {parseFloat(posDiscountValue || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2.5 border-t border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                    R$ {totalGeral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Entrega (R$)</label>
                <input 
                  type="number" step="0.01" value={posDeliveryFee} 
                  onChange={(e) => setPosDeliveryFee(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-blue-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 shadow-sm transition-all" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Acréscimo (R$)</label>
                <input 
                  type="number" step="0.01" value={posExtraCharge} 
                  onChange={(e) => setPosExtraCharge(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-rose-500 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100 shadow-sm transition-all" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Desconto</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[9px] text-slate-400">R$</span>
                  <input 
                    type="number" step="0.01" value={posDiscountValue} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setPosDiscountValue(val);
                      const numVal = parseFloat(val) || 0;
                      const perc = cartTotal > 0 ? ((numVal / cartTotal) * 100).toFixed(2) : '0';
                      setPosDiscountPercentage(perc === 'Infinity' || perc === 'NaN' ? '0' : perc);
                    }}
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg pl-8 pr-3 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 shadow-sm transition-all"
                  />
                </div>
                <div className="relative w-16">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-[9px] text-slate-400">%</span>
                  <input 
                    type="number" step="0.01" value={posDiscountPercentage}
                    onChange={(e) => {
                      const perc = e.target.value;
                      setPosDiscountPercentage(perc);
                      const numPerc = parseFloat(perc) || 0;
                      const val = ((numPerc / 100) * cartTotal).toFixed(2);
                      setPosDiscountValue(val);
                    }}
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 pr-7 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 shadow-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-auto">
              <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Observações</label>
              <textarea 
                value={posObservations} onChange={(e) => setPosObservations(e.target.value)}
                className="w-full h-16 bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 shadow-sm resize-none transition-all"
                placeholder="Instruções..."
              />
            </div>
          </div>
          
          {/* Coluna Direita - Pagamento */}
          <div className="flex-1 bg-white p-5 flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Wallet size={14} className="text-orange-500" /> Forma de Pagamento
                </h4>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                  <span className="text-[9px] font-bold uppercase">Escolha 1</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paymentMethods.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setPosPaymentMethodId(m.id)}
                    aria-pressed={posPaymentMethodId === m.id}
                    aria-label={`Selecionar ${m.name} como forma de pagamento`}
                    className={cn(
                      "h-16 flex items-center px-4 gap-3 rounded-xl border-2 transition-all group relative",
                      posPaymentMethodId === m.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      posPaymentMethodId === m.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      <PaymentIcon type={m.type} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider truncate">{m.name}</span>
                    {posPaymentMethodId === m.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={14} className="text-emerald-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", posPaymentMethodId ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                  <span className={cn("text-[10px] font-bold uppercase", posPaymentMethodId ? "text-emerald-600" : "text-rose-500")}>
                    {posPaymentMethodId ? 'Pronto' : 'Selecione'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCloseModal} className="h-10 px-5 rounded-lg border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={!posPaymentMethodId || isSubmitting}
                  isLoading={isSubmitting}
                  className="h-10 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs tracking-wider shadow-lg disabled:opacity-30 disabled:grayscale transition-all gap-2"
                >
                  Confirmar <MoveRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
