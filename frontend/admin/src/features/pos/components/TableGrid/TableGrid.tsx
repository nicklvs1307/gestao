import React, { useCallback } from 'react';
import { cn } from '../../../../lib/utils';
import { TableSummary } from '../../../../types';
import { Clock, Users } from 'lucide-react';

interface TableGridProps {
  tablesSummary: TableSummary[];
  onTableClick: (table: TableSummary) => void;
}

export const TableGrid = React.memo<TableGridProps>(({ tablesSummary, onTableClick }) => {
  const handleTableClick = useCallback((table: TableSummary) => {
    onTableClick(table);
  }, [onTableClick]);

  return (
    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="mb-4">
        <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight">Gestão de Mesas</h2>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          {tablesSummary.filter(t => t.status !== 'free').length} ocupadas · {tablesSummary.filter(t => t.status === 'free').length} livres
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
        {tablesSummary.map(t => (
          <button 
            key={t.id} 
            onClick={() => handleTableClick(t)}
            aria-label={`Mesa ${t.number} - ${t.status === 'free' ? 'livre' : `ocupada - R$ ${(t.totalAmount || 0).toFixed(2)}`}`}
            className={cn(
              "flex flex-col rounded-xl border-2 p-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm min-h-[110px] relative overflow-hidden group", 
              t.status === 'free' 
                ? "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-emerald-100/50" 
                : "bg-rose-50/50 border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50"
            )}
          >
            {/* Background decoration */}
            <div className={cn(
              "absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150", 
              t.status === 'free' ? "bg-emerald-500" : "bg-rose-500"
            )} />
            
            {/* Número da mesa */}
            <span className={cn(
              "text-2xl font-black tracking-tight leading-none", 
              t.status === 'free' ? "text-slate-300" : "text-rose-600"
            )}>
              {t.number < 10 ? `0${t.number}` : t.number}
            </span>
            
            {/* Status */}
            <div className="mt-auto flex flex-col items-start gap-1">
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider", 
                t.status === 'free' ? "text-slate-400" : "text-rose-500"
              )}>
                {t.status === 'free' ? 'Livre' : 'Ocupada'}
              </span>
              
              {t.status !== 'free' && (
                <>
                  <span className="font-black text-sm text-rose-900 tracking-tight leading-none">
                    R$ {(t.totalAmount || 0).toFixed(2)}
                  </span>
                  {t.items && t.items.length > 0 && (
                    <span className="text-[9px] font-medium text-rose-400 flex items-center gap-1">
                      <Users size={10} />
                      {t.items.length} {t.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
