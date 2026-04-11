import React, { memo, useCallback } from 'react';
import { formatSP } from '@/lib/timezone';
import { Wallet, Clock, User, Plus, Minus, RefreshCw, Calculator, History } from 'lucide-react';
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
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
          <Calculator size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
            Frente de <span className="text-primary">Caixa</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            {isOpen && session?.openedAt && (
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Aberto às {formatSP(session.openedAt, 'HH:mm')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {authUser?.name || 'Operador'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isOpen && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleIncome}
              className="h-9 text-[10px] font-black uppercase tracking-widest border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50 rounded-xl"
            >
              <Plus size={14} className="mr-1.5" /> REFORÇO
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpense}
              className="h-9 text-[10px] font-black uppercase tracking-widest border-rose-200 text-rose-600 hover:bg-rose-50 bg-rose-50/50 rounded-xl"
            >
              <Minus size={14} className="mr-1.5" /> SANGRIA
            </Button>
          </div>
        )}

        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border font-black uppercase text-[10px] tracking-widest',
          isOpen
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        )}>
          <div className={cn('w-2 h-2 rounded-full', isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')} />
          {isOpen ? 'CAIXA OPERACIONAL' : 'CAIXA FECHADO'}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="h-9 w-9 p-0 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onShowHistory}
          className="h-9 px-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          title="Histórico de caixas"
        >
          <History size={16} />
        </Button>
      </div>
    </div>
  );
});

CashierHeader.displayName = 'CashierHeader';
export default CashierHeader;
