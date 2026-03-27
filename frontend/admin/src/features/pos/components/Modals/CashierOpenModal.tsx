import React, { useState, useCallback } from 'react';
import { X, Wallet, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
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
        className="relative w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
              <Wallet size={28} />
            </div>
            <h3 className="text-xl font-bold uppercase text-slate-900 tracking-tight leading-none">
              Abertura de Caixa
            </h3>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>
        
        <div className="space-y-6">
          <Input 
            label="Fundo de Caixa Inicial (R$)" 
            type="number" 
            placeholder="0,00" 
            value={cashierAmount} 
            onChange={(e) => setCashierAmount(e.target.value)}
            className="text-2xl font-bold text-emerald-600" 
          />
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              fullWidth 
              onClick={handleClose}
              className="h-14 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-sm"
            >
              Cancelar
            </Button>
            <Button 
              fullWidth 
              size="lg" 
              className="h-14 rounded-xl gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase text-sm" 
              onClick={handleOpenCashier}
            >
              <CheckCircle size={20} /> Abrir Turno
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
