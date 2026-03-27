import React, { useMemo, useCallback } from 'react';
import { X, ShoppingBag, Calculator, Wallet, Info, CheckCircle, MoveRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useCartStore } from '../../hooks/useCartStore';
import { PaymentMethod } from '../../../../types';

interface CheckoutModalProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ paymentMethods, onSubmitOrder }) => {
  const { 
    activeModal, setActiveModal,
    orderMode, selectedTable,
    posDeliveryFee, setPosDeliveryFee,
    posExtraCharge, setPosExtraCharge,
    posDiscountValue, setPosDiscountValue,
    posDiscountPercentage, setPosDiscountPercentage,
    posPaymentMethodId, setPosPaymentMethodId,
    posObservations, setPosObservations
  } = usePosStore();

  const { getCartTotal } = useCartStore();
  const cartTotal = useMemo(() => getCartTotal(), [getCartTotal]);

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
    if (posPaymentMethodId) {
      onSubmitOrder();
    }
  }, [onSubmitOrder, posPaymentMethodId]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <motion.div 
        initial={{ scale: 0.98, opacity: 0, y: 10 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.98, opacity: 0, y: 10 }} 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-slate-200"
      >
        <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-orange-500 rounded-lg"><ShoppingBag size={18} /></div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest italic">Finalização de Venda</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">{orderMode === 'table' ? `Mesa ${selectedTable}` : 'Venda Direta / Delivery'}</p>
            </div>
          </div>
          <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"><X size={20} /></button>
        </header>
            
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda: Ajustes Financeiros */}
          <div className="w-[380px] bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Calculator size={14} className="text-orange-500" /> Resumo Financeiro
              </h4>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                  <span>Subtotal</span>
                  <span className="text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 uppercase">
                  <span>Taxa Entrega</span>
                  <span>+ R$ {parseFloat(posDeliveryFee || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase">
                  <span>Acréscimo</span>
                  <span>+ R$ {parseFloat(posExtraCharge || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase border-b border-slate-100 pb-3">
                  <span>Desconto</span>
                  <span>- R$ {parseFloat(posDiscountValue || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                  <span className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">
                    R$ {totalGeral.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Entrega (R$)</label>
                <input 
                  type="number" step="0.01" value={posDeliveryFee} 
                  onChange={handleDeliveryFeeChange}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-blue-600 outline-none focus:border-blue-500 shadow-sm" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Acréscimo (R$)</label>
                <input 
                  type="number" step="0.01" value={posExtraCharge} 
                  onChange={handleExtraChargeChange}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-rose-500 outline-none focus:border-rose-500 shadow-sm" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Desconto Aplicado</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[10px]">R$</span>
                  <input 
                    type="number" step="0.01" value={posDiscountValue} 
                    onChange={handleDiscountValueChange}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-7 pr-3 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
                <div className="relative w-20">
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-[10px]">%</span>
                  <input 
                    type="number" step="0.01" value={posDiscountPercentage}
                    onChange={handleDiscountPercentageChange}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 font-bold text-xs text-emerald-600 outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 mt-auto">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações do Pedido</label>
              <textarea 
                value={posObservations} onChange={handleObservationsChange}
                className="w-full h-20 bg-white border border-slate-200 rounded-lg p-3 font-medium text-[11px] outline-none focus:border-orange-500 shadow-sm resize-none"
                placeholder="Instruções de entrega ou preparo..."
              />
            </div>
          </div>
          
          {/* Coluna Direita: Métodos de Pagamento */}
          <div className="flex-1 bg-white p-8 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <Wallet size={14} className="text-orange-500" /> Métodos de Recebimento
                </h4>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Info size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-tight">Escolha 01 forma de pagamento</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {paymentMethods.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => handlePaymentMethodSelect(m.id)}
                    aria-pressed={posPaymentMethodId === m.id}
                    aria-label={`Selecionar ${m.name} como forma de pagamento`}
                    className={cn(
                      "h-14 flex items-center px-4 gap-3 rounded-xl border-2 transition-all group relative overflow-hidden",
                      posPaymentMethodId === m.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02]" 
                        : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                      posPaymentMethodId === m.id ? "bg-white/10" : "bg-slate-50 group-hover:bg-slate-100"
                    )}>
                      {m.type === 'CASH' ? '💵' : m.type === 'PIX' ? '📱' : '💳'}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">{m.name}</span>
                    {posPaymentMethodId === m.id && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle size={10} className="text-emerald-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-8 -mb-8 p-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status do Pagamento</span>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", posPaymentMethodId ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                  <span className={cn("text-xs font-black uppercase italic", posPaymentMethodId ? "text-emerald-600" : "text-rose-500")}>
                    {posPaymentMethodId ? 'Aguardando Confirmação' : 'Selecione o Meio de Pagamento'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCloseModal} className="h-12 px-6 rounded-xl border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={!posPaymentMethodId}
                  className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-30 disabled:grayscale transition-all"
                >
                  Confirmar e Enviar <MoveRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
