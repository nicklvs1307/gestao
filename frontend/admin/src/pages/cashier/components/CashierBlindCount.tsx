import React, { memo, useCallback } from 'react';
import { ShieldCheck, Wallet, CreditCard, Smartphone, Receipt } from 'lucide-react';
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
  totalInformed: number;
  hasBlocks: boolean;
  onAuditAndFinalize: () => void;
}

const getMethodIcon = (id: string) => {
  if (id === 'all') return Receipt;
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
    <Card className="p-0 border-slate-200 shadow-lg overflow-hidden bg-white" noPadding>
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-orange-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-tight">
            Conferencia de Valores
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 rounded-md">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider">Auditoria</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
        {paymentMethods.map(m => {
          const isSelected = selectedMethod === m.id;
          const MethodIcon = getMethodIcon(m.id);

          return (
            <div
              key={m.id}
              onClick={() => handleMethodSelect(m.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer group hover:bg-slate-50 border-l-3',
                isSelected ? 'bg-orange-50/60 border-l-orange-500' : 'border-l-transparent'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                  isSelected
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                )}
              >
                <MethodIcon size={14} />
              </div>

              <span className={cn(
                'text-[11px] font-semibold uppercase tracking-wide shrink-0 w-24',
                isSelected ? 'text-slate-800' : 'text-slate-500'
              )}>
                {m.label}
              </span>

              <div className="flex-1 relative max-w-[160px]">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  value={closingValues[m.id] || ''}
                  onChange={(e) => handleValueChange(m.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'w-full h-8 bg-white border rounded-lg pl-7 pr-2 text-xs font-bold focus:outline-none transition-all tabular-nums',
                    isSelected
                      ? 'border-orange-300 focus:border-orange-500'
                      : 'border-slate-200 focus:border-slate-900'
                  )}
                  placeholder="0,00"
                />
              </div>

              {closingValues[m.id] && (
                <span className="text-[10px] font-bold text-emerald-600 tabular-nums shrink-0">
                  OK
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Total
          </span>
          <span className="text-lg font-bold text-white tabular-nums">
            {formatCurrency(totalInformed)}
          </span>
        </div>

        <Button
          onClick={handleAudit}
          disabled={hasBlocks}
          className={cn(
            'h-9 px-4 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all',
            hasBlocks
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-sm'
          )}
        >
          AUDITAR E FINALIZAR
        </Button>
      </div>
    </Card>
  );
});

CashierBlindCount.displayName = 'CashierBlindCount';
export default CashierBlindCount;
