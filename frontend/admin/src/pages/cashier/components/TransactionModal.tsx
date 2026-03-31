import React, { memo, useCallback } from 'react';
import { Minus, Plus, X, DollarSign } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import type { TransactionModalState } from '../hooks/useCashier';

interface TransactionModalProps {
  isOpen: TransactionModalState;
  amount: string;
  description: string;
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = memo(({
  isOpen,
  amount,
  description,
  onAmountChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}) => {
  const isIncome = isOpen === 'INCOME';

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  }, [onSubmit]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen !== 'none' && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden"
          >
            <header className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg',
                  isIncome ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                )}>
                  {isIncome ? <Plus size={24} /> : <Minus size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">
                    {isIncome ? 'Reforco de Caixa' : 'Sangria de Caixa'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {isIncome ? 'Entrada de numerario' : 'Retirada de numerario'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
              >
                <X size={20} />
              </button>
            </header>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Valor da Operacao (R$)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">
                    R$
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl pl-12 pr-4 text-2xl font-black focus:border-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Observacao / Motivo
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Ex: Adicao de troco..."
                  className="w-full h-12 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 text-sm font-bold focus:border-orange-500 focus:outline-none transition-all"
                />
              </div>
              
              <div className="pt-2">
                <Button
                  fullWidth
                  className={cn(
                    'h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl',
                    isIncome
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  )}
                >
                  <DollarSign size={18} className="mr-2" />
                  CONFIRMAR MOVIMENTACAO
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

TransactionModal.displayName = 'TransactionModal';
export default TransactionModal;
