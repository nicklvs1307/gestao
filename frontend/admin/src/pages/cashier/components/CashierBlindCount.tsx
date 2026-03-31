import React, { memo, useCallback } from 'react';
import { ArrowRight, Calculator, ShieldCheck, Wallet, CreditCard, Smartphone, Receipt } from 'lucide-react';
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

const getMethodIcon = (id: string) => {
  if (id === 'cash') return Wallet;
  if (id === 'pix') return Smartphone;
  if (id.includes('credit') || id.includes('debit')) return CreditCard;
  return Receipt;
};

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
  const handleMethodSelect = useCallback((id: string) => onMethodSelect(id), [onMethodSelect]);
  const handleValueChange = useCallback((id: string, value: string) => onClosingValueChange(id, value), [onClosingValueChange]);
  const handleAudit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onAuditAndFinalize();
  }, [onAuditAndFinalize]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Card className="p-0 border-slate-200 shadow-xl overflow-hidden bg-white" noPadding>
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-orange-400" />
          <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
            Conferencia de Valores
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Modo Auditoria</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
        {paymentMethods.map(m => {
          const isSelected = selectedMethod === m.id;
          const MethodIcon = getMethodIcon(m.id);

          return (
            <div
              key={m.id}
              onClick={() => handleMethodSelect(m.id)}
              className={cn(
                'p-4 transition-all cursor-pointer group hover:bg-slate-50 relative border-l-4',
                isSelected ? 'bg-orange-50/50 border-orange-500' : 'border-transparent'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-white border border-slate-200'
                    )}
                  >
                    <MethodIcon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">
                      {m.label}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Informe o total encontrado
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    readOnly={m.id === 'cash'}
                    value={closingValues[m.id] || ''}
                    onChange={(e) => handleValueChange(m.id, e.target.value)}
                    className={cn(
                      'w-full h-11 bg-white border-2 rounded-xl pl-8 pr-3 text-sm font-black focus:outline-none transition-all tabular-nums',
                      isSelected 
                        ? 'border-orange-200 focus:border-orange-500' 
                        : 'border-slate-200 focus:border-slate-900',
                      m.id === 'cash' && 'bg-slate-50 text-slate-500 cursor-not-allowed'
                    )}
                    placeholder="0,00"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (m.id === 'cash') onOpenMoneyCounter();
                    }}
                  />
                </div>

                {m.id === 'cash' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMoneyCounter();
                    }}
                    className="h-11 px-4 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Calculator size={14} />
                    Contar
                  </button>
                ) : (
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300'
                    )}
                  >
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Total Informado
          </span>
          <span className="text-2xl font-black text-white italic tracking-tighter">
            {formatCurrency(totalInformed)}
          </span>
        </div>

        <Button
          fullWidth
          onClick={handleAudit}
          disabled={hasBlocks}
          className={cn(
            'h-12 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg',
            hasBlocks
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30'
          )}
        >
          AUDITAR E FINALIZAR <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </Card>
  );
});

CashierBlindCount.displayName = 'CashierBlindCount';
export default CashierBlindCount;
