import React, { memo } from 'react';
import { ArrowRight, Calculator, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { PaymentMethod } from '../hooks/useCashier';

interface CashierBlindCountProps {
  paymentMethods: PaymentMethod[];
  selectedMethod: string;
  onMethodSelect: (id: string) => void;
  closingValues: Record<string, string>;
  onClosingValueChange: (id: string, value: string) => void;
  onOpenMoneyCounter: () => void;
  totalInformed: number;
  hasBlocks: boolean;
  onAuditAndFinalize: () => void;
}

const CashierBlindCount: React.FC<CashierBlindCountProps> = memo(({
  paymentMethods,
  selectedMethod,
  onMethodSelect,
  closingValues,
  onClosingValueChange,
  onOpenMoneyCounter,
  totalInformed,
  hasBlocks,
  onAuditAndFinalize,
}) => {
  return (
    <Card className="p-0 border-slate-200 shadow-md overflow-hidden bg-white" noPadding>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Conferência de Valores
        </h3>
        <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
          <ShieldCheck size={10} /> MODO AUDITORIA
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
        {paymentMethods.map(m => {
          const isSelected = selectedMethod === m.id;

          return (
            <div
              key={m.id}
              onClick={() => onMethodSelect(m.id)}
              className={cn(
                'p-3 transition-all cursor-pointer group hover:bg-slate-50 relative border-l-4',
                isSelected ? 'bg-slate-50 border-slate-900' : 'border-transparent'
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-white border border-slate-200'
                    )}
                  >
                    <m.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight leading-none">
                      {m.label}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Informe o total
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">
                    R$
                  </span>
                  <input
                    type="number"
                    readOnly={m.id === 'cash'}
                    value={closingValues[m.id] || ''}
                    onChange={e => onClosingValueChange(m.id, e.target.value)}
                    className={cn(
                      'w-full h-8 bg-white border border-slate-200 rounded-md pl-7 pr-2 text-xs font-bold focus:border-slate-900 outline-none shadow-sm transition-all tabular-nums',
                      m.id === 'cash' && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                    )}
                    placeholder="0,00"
                    onClick={e => {
                      e.stopPropagation();
                      if (m.id === 'cash') onOpenMoneyCounter();
                    }}
                  />
                </div>

                {m.id === 'cash' ? (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOpenMoneyCounter();
                    }}
                    className="h-8 px-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded-md transition-all shadow-sm"
                  >
                    <Calculator size={14} />
                  </button>
                ) : (
                  <div
                    className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center transition-all',
                      isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'
                    )}
                  >
                    <ChevronRight size={12} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-900 space-y-3 shrink-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Total Informado
          </span>
          <span className="text-lg font-black text-white tracking-tighter tabular-nums">
            R${' '}
            {totalInformed.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <Button
          fullWidth
          onClick={onAuditAndFinalize}
          disabled={hasBlocks}
          className={cn(
            'h-10 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg',
            hasBlocks
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
          )}
        >
          AUDITAR E FINALIZAR <ArrowRight size={14} className="ml-2" />
        </Button>
      </div>
    </Card>
  );
});

CashierBlindCount.displayName = 'CashierBlindCount';
export default CashierBlindCount;
