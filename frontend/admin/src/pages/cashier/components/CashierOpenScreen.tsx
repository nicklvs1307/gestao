import React, { memo } from 'react';
import { Unlock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface CashierOpenScreenProps {
  initialAmount: string;
  onInitialAmountChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const CashierOpenScreen: React.FC<CashierOpenScreenProps> = memo(({
  initialAmount,
  onInitialAmountChange,
  onSubmit,
}) => {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="p-8 border-slate-200 shadow-xl bg-white relative">
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Unlock size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
            Iniciar Turno
          </h3>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
            Informe o fundo inicial para troco
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">
              Fundo de Reserva (R$)
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                R$
              </div>
              <input
                type="number"
                step="0.01"
                value={initialAmount}
                onChange={e => onInitialAmountChange(e.target.value)}
                required
                autoFocus
                placeholder="0,00"
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 text-xl font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <Button
            fullWidth
            size="lg"
            className="h-12 rounded-lg font-bold uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200"
          >
            ABRIR CAIXA AGORA
          </Button>
        </form>
      </Card>
    </div>
  );
});

CashierOpenScreen.displayName = 'CashierOpenScreen';
export default CashierOpenScreen;
