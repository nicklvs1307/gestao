import React, { useCallback } from 'react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { useNavigate } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';
import { 
  UtensilsCrossed, 
  Store, 
  Bike, 
  ShoppingBag, 
  RefreshCw, 
  Wallet,
  Power
} from 'lucide-react';

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

  const handleTabChange = useCallback((tab: 'table' | 'counter' | 'delivery') => {
    setActiveTab(tab);
    if (tab === 'table') {
      onRefreshTables();
    }
  }, [setActiveTab, onRefreshTables]);

  const handleOpenCashierModal = useCallback(() => {
    setActiveModal('cashier_open');
  }, [setActiveModal]);

  const tabs = [
    { id: 'table' as const, label: 'Mesa', icon: UtensilsCrossed, color: 'emerald' },
    { id: 'counter' as const, label: 'Balcão', icon: ShoppingBag, color: 'blue' },
    { id: 'delivery' as const, label: 'Entrega', icon: Bike, color: 'orange' },
  ];

  return (
    <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 z-10 shrink-0">
      {/* Branding + Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-none">PDV</h1>
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Ponto de Venda</p>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleStore} 
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all", 
              isStoreOpen 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            )}
            aria-pressed={isStoreOpen}
          >
            <Power size={12} />
            {isStoreOpen ? 'Aberta' : 'Fechada'}
          </button>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border", 
            isCashierOpen 
              ? "bg-blue-50 text-blue-700 border-blue-200" 
              : "bg-slate-50 text-slate-500 border-slate-200"
          )}>
            <Wallet size={12} />
            <div className={cn("w-1.5 h-1.5 rounded-full", isCashierOpen ? "bg-blue-500 animate-pulse" : "bg-slate-400")} />
            {isCashierOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
          </div>
        </div>
      </div>
      
      {/* 3 Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full max-w-[420px] border border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)} 
              aria-pressed={isActive}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all", 
                isActive 
                  ? `bg-white text-${tab.color}-600 shadow-sm` 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon size={14} className={isActive ? `text-${tab.color}-600` : ''} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-lg px-3 h-10 text-xs font-bold uppercase gap-1.5 border-slate-200 hover:bg-slate-50"
          onClick={() => onRefreshTables()}
        >
          <RefreshCw size={14} />
        </Button>
        {!isCashierOpen ? (
          <Button 
            size="sm" 
            className="rounded-lg px-4 h-10 text-xs font-bold uppercase gap-1.5 bg-emerald-500 hover:bg-emerald-600" 
            onClick={handleOpenCashierModal}
          >
            <Wallet size={14} />
            Abrir Caixa
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-lg px-4 h-10 text-xs font-bold uppercase gap-1.5 border-slate-300 hover:bg-slate-50" 
            onClick={() => navigate('/cashier')}
          >
            <Store size={14} />
            Fechamento
          </Button>
        )}
      </div>
    </div>
  );
});
