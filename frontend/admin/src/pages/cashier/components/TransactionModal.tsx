import React, { memo } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { AnimatePresence, motion } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen !== 'none' && (
        <div className="ui-modal-overlay">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="ui-modal-content w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200"
          >
            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg text-white',
                    isIncome ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                >
                  {isIncome ? <Plus size={20} /> : <Minus size={20} />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isIncome ? 'Reforço de Caixa' : 'Sangria de Caixa'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={onSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Valor da Operação (R$)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                    R$
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={amount}
                    onChange={e => onAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 text-xl font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Observação / Motivo
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={e => onDescriptionChange(e.target.value)}
                  placeholder="Ex: Adição de troco..."
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-semibold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="pt-2">
                <Button
                  fullWidth
                  className={cn(
                    'h-11 rounded-lg font-bold uppercase tracking-wider text-xs shadow-lg',
                    isIncome
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  )}
                >
                  CONFIRMAR MOVIMENTAÇÃO
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
