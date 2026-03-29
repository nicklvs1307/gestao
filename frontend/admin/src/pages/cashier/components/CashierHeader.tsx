import React, { memo } from 'react';
import { format } from 'date-fns';
import { Wallet, Clock, User, Plus, Minus, RefreshCw } from 'lucide-react';
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
}

const CashierHeader: React.FC<CashierHeaderProps> = memo(({
  isOpen,
  session,
  authUser,
  loading,
  onRefresh,
  onIncome,
  onExpense,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-[40]">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-900 text-white rounded-lg">
          <Wallet size={18} />
        </div>
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-slate-900 leading-none tracking-tight">
            Gestão de Caixa
          </h2>
          {isOpen && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Clock size={12} className="text-slate-300" />{' '}
                Aberto às{' '}
                {session?.openedAt
                  ? format(new Date(session.openedAt), 'HH:mm')
                  : '--:--'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <User size={12} className="text-slate-300" />{' '}
                {authUser?.name || 'Operador'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOpen && (
          <div className="flex gap-2 mr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onIncome}
              className="h-8 text-[10px] font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/30"
            >
              <Plus size={14} className="mr-1" /> REFORÇO
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExpense}
              className="h-8 text-[10px] font-bold border-rose-100 text-rose-600 hover:bg-rose-50 bg-rose-50/30"
            >
              <Minus size={14} className="mr-1" /> SANGRIA
            </Button>
          </div>
        )}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border font-black uppercase text-[10px] tracking-widest',
            isOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          )}
        >
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            )}
          />
          {isOpen ? 'CAIXA OPERACIONAL' : 'CAIXA FECHADO'}
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors ml-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
});

CashierHeader.displayName = 'CashierHeader';
export default CashierHeader;
