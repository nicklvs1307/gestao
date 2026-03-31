import React, { memo, useCallback } from 'react';
import { ArrowUpRight, CheckCircle, DollarSign, Receipt, ShieldCheck, Wallet } from 'lucide-react';
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
}) => {
  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onBack();
  }, [onBack]);

  const handleFinalize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onFinalize();
  }, [onFinalize]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="p-0 border-slate-200 shadow-xl bg-white overflow-hidden">
        <header className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck size={22} className="text-emerald-400" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">
                Relatorio de Auditoria
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Revisao final antes do encerramento
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest h-10"
          >
            Voltar
          </Button>
        </header>

        <div className="p-4 md:p-5 space-y-4 md:space-y-5">
          {/* 1. Balanço por Modalidade */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">
              <Receipt size={14} /> Balanco por Modalidade
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map(m => {
                const informed = parseFloat(closingValues[m.id] || '0');
                const expected = getExpectedValue(m.id);
                const diff = informed - expected;

                if (Math.abs(diff) < 0.01 && informed === 0) return null;

                return (
                  <div
                    key={m.id}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                        <m.icon size={18} />
                      </div>
                      <span className="text-xs font-black text-slate-700 uppercase italic tracking-tight">
                        {m.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase font-black">
                          Informado
                        </span>
                        <span className="text-xs font-black text-slate-900 italic tracking-tighter">
                          {formatCurrency(informed)}
                        </span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="block text-[8px] text-slate-400 uppercase font-black">
                          Sistema
                        </span>
                        <span className="text-xs font-bold text-slate-500 italic tracking-tighter">
                          {formatCurrency(expected)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'px-3 py-2 rounded-xl text-[10px] font-black w-24 text-center shadow-sm',
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
                );
              })}
            </div>
          </div>

          {/* 2. Destino do Dinheiro */}
          <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Wallet size={14} /> Numerario em Especie
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Dinheiro Total em Maos
                  </label>
                  <div className="text-xl font-black text-slate-900 mt-1 tracking-tighter">
                    {formatCurrency(cashInHand)}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Fundo de Troco (Prox. Turno)
                  </label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      className="w-full h-11 pl-8 pr-3 bg-white border-2 border-slate-200 rounded-xl font-black text-slate-900 focus:border-slate-900 focus:outline-none transition-all"
                      value={cashLeftover}
                      onChange={(e) => onCashLeftoverChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Deposito em Cofre
                </span>
                <ArrowUpRight size={20} className="opacity-80" />
              </div>
              <div className="text-3xl font-black tracking-tighter">
                {formatCurrency(safeDeposit)}
              </div>
              <p className="text-[9px] font-bold uppercase opacity-80 mt-3 tracking-widest">
                Lancamento automatico de saida para cofre da loja.
              </p>
            </div>
          </div>

          {/* 3. Observações */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
              Notas de Auditoria
            </label>
            <textarea
              className="w-full h-24 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-[11px] font-bold focus:border-slate-900 outline-none transition-all resize-none placeholder:text-slate-300"
              placeholder="Justificativa para quebras de caixa ou observacoes operacionais..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={handleFinalize}
            disabled={isLoading}
            className={cn(
              'h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-300 border-b-4 border-slate-700 active:border-b-0 active:mt-1 transition-all',
              isLoading && 'opacity-70 cursor-wait'
            )}
          >
            <CheckCircle size={20} className="mr-2 text-emerald-400" />
            {isLoading ? 'FINALIZANDO...' : 'FINALIZAR TURNO E IMPRIMIR RELATÓRIO'}
          </Button>
        </div>
      </Card>
    </div>
  );
});

CashierReviewStep.displayName = 'CashierReviewStep';
export default CashierReviewStep;
