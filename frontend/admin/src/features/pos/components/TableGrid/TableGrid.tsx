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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-12 gap-3">
        {tablesSummary.map(t => (
          <button 
            key={t.id} 
            onClick={() => handleTableClick(t)}
            aria-label={`Mesa ${t.number} - ${t.status === 'free' ? 'livre' : `ocupada - R$ ${(t.totalAmount || 0).toFixed(2)}`}`}
            className={cn(
              "flex flex-col rounded-xl border p-3 transition-all hover:scale-105 active:scale-95 shadow-sm min-h-[90px] relative overflow-hidden group", 
              t.status === 'free' ? "bg-white border-slate-200 hover:border-emerald-400" : "bg-rose-50 border-rose-200 hover:border-rose-400"
            )}
          >
            <div className={cn("absolute -top-2 -right-2 w-10 h-10 rounded-full opacity-5 transition-transform group-hover:scale-150", t.status === 'free' ? "bg-emerald-500" : "bg-rose-500")} />
            <span className={cn("text-xl font-black italic tracking-tighter", t.status === 'free' ? "text-slate-200" : "text-rose-600")}>{t.number < 10 ? `0${t.number}` : t.number}</span>
            <div className="mt-auto flex flex-col items-start">
              <span className={cn("text-[7px] font-black uppercase tracking-widest", t.status === 'free' ? "text-slate-300" : "text-rose-400")}>{t.status === 'free' ? 'Livre' : 'Ocupada'}</span>
              {t.status !== 'free' && <span className="font-black text-[11px] text-rose-900 tracking-tighter italic leading-none">R$ {(t.totalAmount || 0).toFixed(2)}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
