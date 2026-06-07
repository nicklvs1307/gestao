import React, { memo, useCallback } from 'react';
import { formatSP } from '@/lib/timezone';
import { Clock, User, Plus, Minus, RefreshCw, Calculator, History } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';

interface CashierHeaderProps {
  isOpen: boolean;
  session: any;
  authUser: any;
  loading: boolean;
  onRefresh: () => void;
  onIncome: () => void;
  onExpense: () => void;
  onShowHistory: () => void;
}

const CashierHeader: React.FC<CashierHeaderProps> = memo(({
  isOpen,
  session,
  authUser,
  loading,
  onRefresh,
  onIncome,
  onExpense,
  onShowHistory,
}) => {
  const handleIncome = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onIncome();
  }, [onIncome]);

  const handleExpense = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onExpense();
  }, [onExpense]);

  const handleRefresh = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
          <Calculator size={18} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase italic leading-none">
            Frente de <span className="text-primary">Caixa</span>
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            {isOpen && session?.openedAt && (
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-slate-500" />
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  Aberto às {formatSP(session.openedAt, 'HH:mm')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <User size={10} className="text-slate-500" />
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                {authUser?.name || 'Operador'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isOpen && (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleIncome}
              className="h-8 text-[9px] font-bold uppercase tracking-wider border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50 rounded-lg"
            >
              <Plus size={12} className="mr-1" /> REFORÇO
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpense}
              className="h-8 text-[9px] font-bold uppercase tracking-wider border-rose-200 text-rose-600 hover:bg-rose-50 bg-rose-50/50 rounded-lg"
            >
              <Minus size={12} className="mr-1" /> SANGRIA
            </Button>
          </div>
        )}

        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold uppercase text-[9px] tracking-wider',
          isOpen
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full', isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
          {isOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0 text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShowHistory}
          className="h-8 px-2 text-slate-500 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          title="Histórico de caixas"
        >
          <History size={14} />
        </Button>
      </div>
    </div>
  );
});

CashierHeader.displayName = 'CashierHeader';
export default CashierHeader;
