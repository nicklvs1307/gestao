import React, { useCallback, useState, useEffect } from 'react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useNavigate } from 'react-router-dom';

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

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
  const prefersReducedMotion = usePrefersReducedMotion();

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
    <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 z-10 shrink-0">
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleStore} 
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all", 
            isStoreOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
          )}
          aria-pressed={isStoreOpen}
        >
          {isStoreOpen ? "LOJA ONLINE" : "LOJA FECHADA"}
        </button>
        <div className={cn(
          "px-3 py-2 rounded-lg text-xs font-bold uppercase border flex items-center gap-2", 
          isCashierOpen ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"
        )}>
          <div className={cn("w-2 h-2 rounded-full", isCashierOpen ? "bg-blue-500 animate-pulse" : "bg-slate-400")} />
          {isCashierOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
        </div>
      </div>
      
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full max-w-[280px] border border-slate-200">
        <button 
          onClick={() => handleTabChange('pos')} 
          aria-pressed={activeTab === 'pos'}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all", 
            activeTab === 'pos' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Catálogo
        </button>
        <button 
          onClick={() => handleTabChange('tables')} 
          aria-pressed={activeTab === 'tables'}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all", 
            activeTab === 'tables' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Mesas
        </button>
      </div>
      
      <div className="flex gap-2">
        {!isCashierOpen ? (
          <Button 
            size="sm" 
            className="rounded-lg px-4 h-10 text-sm font-bold uppercase bg-slate-900 hover:bg-slate-800" 
            onClick={handleOpenCashierModal}
          >
            Abrir Caixa
          </Button>
        ) : (
          <Button 
            variant="danger" 
            size="sm" 
            className="rounded-lg px-4 h-10 text-sm font-bold uppercase" 
            onClick={() => navigate('/cashier')}
          >
            Encerrar Turno
          </Button>
        )}
      </div>
    </div>
  );
});
