import React, { memo } from 'react';
import {
  ArrowUpRight,
  CheckCircle,
  DollarSign,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { PaymentMethod } from '../hooks/useCashier';

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
}

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
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card className="p-0 border-slate-200 shadow-xl bg-white overflow-hidden">
        <header className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest">
              Relatório de Auditoria
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest h-7"
          >
            Voltar
          </Button>
        </header>

        <div className="p-5 space-y-6">
          {/* 1. Balanço por Modalidade */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">
              <Receipt size={14} /> Balanço por Modalidade
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {paymentMethods.map(m => {
                const informed = parseFloat(closingValues[m.id] || '0');
                const expected = getExpectedValue(m.id);
                const diff = informed - expected;

                if (Math.abs(diff) < 0.01 && informed === 0) return null;

                return (
                  <div
                    key={m.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-400">
                        <m.icon size={14} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                        {m.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase font-black">
                          Informado
                        </span>
                        <span className="text-[11px] font-black text-slate-900 tabular-nums">
                          R${' '}
                          {informed.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="block text-[8px] text-slate-400 uppercase font-black">
                          Sistema
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                          R${' '}
                          {expected.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-black w-20 text-center shadow-sm tabular-nums',
                          diff < -0.01
                            ? 'bg-rose-500 text-white'
                            : diff > 0.01
                              ? 'bg-blue-500 text-white'
                              : 'bg-emerald-500 text-white'
                        )}
                      >
                        {Math.abs(diff) < 0.01
                          ? 'OK'
                          : `${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Destino do Dinheiro */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <DollarSign size={80} />
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Wallet size={14} /> Numerário em Espécie
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Dinheiro Total em Mãos
                  </label>
                  <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tighter tabular-nums">
                    R${' '}
                    {cashInHand.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Fundo de Troco (Próx. Turno)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">
                      R$
                    </span>
                    <input
                      type="number"
                      className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg font-black text-slate-900 focus:border-slate-900 outline-none shadow-sm transition-all tabular-nums"
                      value={cashLeftover}
                      onChange={e => onCashLeftoverChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end bg-emerald-600 p-4 rounded-lg text-white shadow-xl shadow-emerald-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Depósito em Cofre
                </span>
                <ArrowUpRight size={20} className="opacity-80" />
              </div>
              <div className="text-3xl font-black tracking-tighter tabular-nums">
                R${' '}
                {safeDeposit.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-[9px] font-bold uppercase opacity-80 mt-2 tracking-widest">
                Lançamento automático de saída para cofre da loja.
              </p>
            </div>
          </div>

          {/* 3. Observações */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
              Notas de Auditoria
            </label>
            <textarea
              className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-bold focus:border-slate-900 outline-none resize-none transition-all placeholder:text-slate-300"
              placeholder="Justificativa para quebras de caixa ou observações operacionais..."
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={onFinalize}
            disabled={isLoading}
            className={cn(
              'h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-200 border-b-4 border-slate-700 active:border-b-0 active:mt-1 transition-all',
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
