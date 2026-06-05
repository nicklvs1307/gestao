import React, { memo, useCallback, useState } from 'react';
import { ArrowUpRight, CheckCircle, ChevronDown, ChevronRight, Receipt, ShieldCheck, Wallet, ShoppingBag } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { PaymentMethod, BreakdownMethod, BreakdownTransaction } from '../hooks/useCashier';

interface CashierReviewStepProps {
  paymentMethods: PaymentMethod[];
  closingValues: Record<string, string>;
  getExpectedValue: (methodId: string) => number;
  cashInHand: number;
  safeDeposit: number;
  cashLeftover: string;
  onCashLeftoverChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onBack: () => void;
  onFinalize: () => void;
  isLoading?: boolean;
  breakdownByMethod?: Record<string, BreakdownMethod>;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const CashierReviewStep: React.FC<CashierReviewStepProps> = memo(({
  paymentMethods,
  closingValues,
  getExpectedValue,
  cashInHand,
  safeDeposit,
  cashLeftover,
  onCashLeftoverChange,
  notes,
  onNotesChange,
  onBack,
  onFinalize,
  isLoading = false,
  breakdownByMethod,
}) => {
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());

  const toggleMethod = useCallback((methodId: string) => {
    setExpandedMethods(prev => {
      const next = new Set(prev);
      if (next.has(methodId)) {
        next.delete(methodId);
      } else {
        next.add(methodId);
      }
      return next;
    });
  }, []);

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onBack();
  }, [onBack]);

  const handleFinalize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onFinalize();
  }, [onFinalize]);

  const normalize = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  };

  const getBreakdownForMethod = (methodId: string): BreakdownMethod | undefined => {
    if (!breakdownByMethod) return undefined;

    // Busca direta por variações conhecidas do methodId
    const directKeys = [methodId, 'pago online', 'online_paid'];
    for (const key of directKeys) {
      if (breakdownByMethod[key]) return breakdownByMethod[key];
    }

    // Busca por similaridade: normaliza todas as chaves do breakdown e compara
    const normalizedMethodId = normalize(methodId);
    const breakdownKeys = Object.keys(breakdownByMethod);
    for (const key of breakdownKeys) {
      if (normalize(key) === normalizedMethodId) return breakdownByMethod[key];
      // Match parcial: se o methodId contém a chave normalizada ou vice-versa
      if (normalize(key).includes(normalizedMethodId) || normalizedMethodId.includes(normalize(key))) {
        return breakdownByMethod[key];
      }
    }

    return undefined;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card className="p-0 border-slate-200 shadow-lg bg-white overflow-hidden">
        <header className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Relatorio de Auditoria
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Revisao final antes do encerramento
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider h-9"
          >
            Voltar
          </Button>
        </header>

        <div className="p-4 md:p-5 space-y-4">
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 px-1">
              <Receipt size={13} /> Balanco por Modalidade
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {paymentMethods.map(m => {
                const informed = parseFloat(closingValues[m.id] || '0');
                const expected = getExpectedValue(m.id);
                const diff = informed - expected;
                const breakdown = getBreakdownForMethod(m.id);
                const hasTransactions = breakdown && breakdown.transactions && breakdown.transactions.length > 0;
                const isExpanded = expandedMethods.has(m.id);

                if (Math.abs(diff) < 0.01 && informed === 0 && !hasTransactions) return null;

                return (
                  <div key={m.id}>
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all",
                        isExpanded && hasTransactions && "rounded-b-none"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-400 shrink-0">
                          <m.icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide truncate">
                              {m.label}
                            </span>
                            {hasTransactions && (
                              <button
                                onClick={() => toggleMethod(m.id)}
                                className={cn(
                                  "flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all shrink-0",
                                  isExpanded
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                )}
                              >
                                {isExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                                {breakdown?.transactions?.length || 0} trans.
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold">Info</span>
                          <span className="text-[11px] font-bold text-slate-900 tabular-nums">{formatCurrency(informed)}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="block text-[9px] text-slate-400 uppercase font-bold">Sist</span>
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{formatCurrency(expected)}</span>
                        </div>
                        <div
                          className={cn(
                            'px-2.5 py-1.5 rounded text-[10px] font-bold w-24 text-center',
                            diff < -0.01
                              ? 'bg-rose-500 text-white'
                              : diff > 0.01
                                ? 'bg-blue-500 text-white'
                                : 'bg-emerald-500 text-white'
                          )}
                        >
                          {Math.abs(diff) < 0.01
                            ? 'OK'
                            : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                        </div>
                      </div>
                    </div>

                    {isExpanded && hasTransactions && (
                      <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-3 space-y-1.5 max-h-44 overflow-y-auto">
                        {breakdown.transactions.map((t: BreakdownTransaction, idx: number) => (
                          <div
                            key={t.id || idx}
                            className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingBag size={11} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-700">
                                #{t.orderNumber || t.orderId?.slice(-4) || 'N/A'}
                              </span>
                              {t.orderTotal && (
                                <span className="text-[9px] text-slate-400">
                                  (total: {formatCurrency(t.orderTotal)})
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Wallet size={13} /> Numerario em Especie
              </h4>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Dinheiro Total em Maos
                  </label>
                  <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {formatCurrency(cashInHand)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fundo de Troco (Prox. Turno)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      className="w-full h-9 pl-7 pr-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs text-slate-900 focus:border-slate-900 focus:outline-none transition-all tabular-nums"
                      value={cashLeftover}
                      onChange={(e) => onCashLeftoverChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-lg text-white shadow-lg shadow-emerald-500/20">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Deposito em Cofre
                </span>
                <ArrowUpRight size={18} className="opacity-80" />
              </div>
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {formatCurrency(safeDeposit)}
              </div>
              <p className="text-[9px] font-semibold uppercase opacity-80 mt-2.5 tracking-wider">
                Lancamento automatico de saida para cofre da loja.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider px-1">
              Notas de Auditoria
            </label>
            <textarea
              className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium focus:border-slate-900 outline-none transition-all resize-none placeholder:text-slate-300"
              placeholder="Justificativa para quebras de caixa ou observacoes operacionais..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>

          <Button
            fullWidth
            onClick={handleFinalize}
            disabled={isLoading}
            className={cn(
              'h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px] shadow-md transition-all',
              isLoading && 'opacity-70 cursor-wait'
            )}
          >
            <CheckCircle size={18} className="mr-2 text-emerald-400" />
            {isLoading ? 'FINALIZANDO...' : 'FINALIZAR TURNO E IMPRIMIR RELATÓRIO'}
          </Button>
        </div>
      </Card>
    </div>
  );
});

CashierReviewStep.displayName = 'CashierReviewStep';
export default CashierReviewStep;
