import React, { useCallback } from 'react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useNavigate } from 'react-router-dom';

interface PosHeaderProps {
  isStoreOpen: boolean;
  isCashierOpen: boolean;
  onToggleStore: () => void;
  onRefreshTables: () => void;
}

export const PosHeader = React.memo<PosHeaderProps>(({ 
  isStoreOpen, isCashierOpen, onToggleStore, onRefreshTables 
}) => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, setActiveModal } = usePosStore();

  const handleTabChange = useCallback((tab: 'pos' | 'tables') => {
    setActiveTab(tab);
    if (tab === 'tables') {
      onRefreshTables();
    }
  }, [setActiveTab, onRefreshTables]);

  const handleOpenCashierModal = useCallback(() => {
    setActiveModal('cashier_open');
  }, [setActiveModal]);

  return (
    <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-4 z-10 shrink-0">
      <div className="flex items-center gap-1.5">
        <button 
          onClick={onToggleStore} 
          className={cn(
            "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border transition-all", 
            isStoreOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
          )}
        >
          {isStoreOpen ? "LOJA ONLINE" : "LOJA FECHADA"}
        </button>
        <div className={cn(
          "px-2 py-1 rounded-md text-[8px] font-black uppercase border flex items-center gap-1.5", 
          isCashierOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-400 border-slate-200"
        )}>
          <div className={cn("w-1 h-1 rounded-full", isCashierOpen ? "bg-blue-500 animate-pulse" : "bg-slate-300")} />
          {isCashierOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
        </div>
      </div>
      <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 w-full max-w-[220px] border border-slate-200">
        <button 
          onClick={() => handleTabChange('pos')} 
          aria-pressed={activeTab === 'pos'}
          className={cn(
            "flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all", 
            activeTab === 'pos' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          )}
        >
          Catálogo
        </button>
        <button 
          onClick={() => handleTabChange('tables')} 
          aria-pressed={activeTab === 'tables'}
          className={cn(
            "flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all", 
            activeTab === 'tables' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          )}
        >
          Mesas
        </button>
      </div>
      <div className="flex gap-1.5">
        {!isCashierOpen ? (
          <Button size="sm" className="rounded-md px-3 h-7 text-[8px] font-black uppercase bg-slate-900" onClick={handleOpenCashierModal}>
            Abrir Caixa
          </Button>
        ) : (
          <Button variant="danger" size="sm" className="rounded-md px-3 h-7 text-[8px] font-black uppercase" onClick={() => navigate('/cashier')}>
            Encerrar Turno
          </Button>
        )}
      </div>
    </div>
  );
});
