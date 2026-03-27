import React, { useCallback } from 'react';
import { cn } from '../../../../lib/utils';
import { TableSummary } from '../../../../types';

interface TableGridProps {
  tablesSummary: TableSummary[];
  onTableClick: (table: TableSummary) => void;
}

export const TableGrid = React.memo<TableGridProps>(({ tablesSummary, onTableClick }) => {
  const handleTableClick = useCallback((table: TableSummary) => {
    onTableClick(table);
  }, [onTableClick]);

  return (
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-12 gap-4">
        {tablesSummary.map(t => (
          <button 
            key={t.id} 
            onClick={() => handleTableClick(t)}
            aria-label={`Mesa ${t.number} - ${t.status === 'free' ? 'livre' : `ocupada - R$ ${(t.totalAmount || 0).toFixed(2)}`}`}
            className={cn(
              "flex flex-col rounded-xl border-2 p-4 transition-all hover:scale-105 active:scale-95 shadow-sm min-h-[100px] relative overflow-hidden group", 
              t.status === 'free' ? "bg-white border-slate-200 hover:border-emerald-400" : "bg-rose-50 border-rose-200 hover:border-rose-400"
            )}
          >
            <div className={cn("absolute -top-3 -right-3 w-14 h-14 rounded-full opacity-10 transition-transform group-hover:scale-150", t.status === 'free' ? "bg-emerald-500" : "bg-rose-500")} />
            <span className={cn("text-2xl font-bold tracking-tight", t.status === 'free' ? "text-slate-300" : "text-rose-600")}>
              {t.number < 10 ? `0${t.number}` : t.number}
            </span>
            <div className="mt-auto flex flex-col items-start">
              <span className={cn("text-xs font-bold uppercase tracking-wider", t.status === 'free' ? "text-slate-400" : "text-rose-500")}>
                {t.status === 'free' ? 'Livre' : 'Ocupada'}
              </span>
              {t.status !== 'free' && (
                <span className="font-bold text-sm text-rose-900 tracking-tight leading-none mt-1">
                  R$ {(t.totalAmount || 0).toFixed(2)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
