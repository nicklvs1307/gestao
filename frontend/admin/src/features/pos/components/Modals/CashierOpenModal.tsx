import React, { useState, useCallback } from 'react';
import { X, Wallet, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface CashierOpenModalProps {
  onOpenCashier: (amount: string) => void;
}

export const CashierOpenModal: React.FC<CashierOpenModalProps> = React.memo(({ onOpenCashier }) => {
  const { activeModal, setActiveModal } = usePosStore();
  const [cashierAmount, setCashierAmount] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  if (activeModal !== 'cashier_open') return null;

  const handleOpenCashier = useCallback(() => {
    onOpenCashier(cashierAmount);
  }, [onOpenCashier, cashierAmount]);

  const handleClose = useCallback(() => {
    setActiveModal('none');
  }, [setActiveModal]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={backdropTransition}
        onClick={handleClose} 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight leading-none">Abertura de Caixa</h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Fundo de caixa inicial</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Valor Inicial (R$)</label>
            <input 
              type="number" 
              placeholder="0,00" 
              value={cashierAmount} 
              onChange={(e) => setCashierAmount(e.target.value)}
              className="w-full h-14 bg-white border border-slate-200 rounded-xl px-4 font-black text-2xl text-emerald-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 shadow-sm transition-all"
            />
          </div>
          
          <div className="flex gap-3 pt-1">
            <Button 
              variant="outline"
              fullWidth 
              onClick={handleClose}
              className="h-12 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-xs"
            >
              Cancelar
            </Button>
            <Button 
              fullWidth 
              size="lg" 
              className="h-12 rounded-xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase text-xs transition-all" 
              onClick={handleOpenCashier}
            >
              <CheckCircle size={16} /> Abrir Turno
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
