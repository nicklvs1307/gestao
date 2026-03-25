import { cn } from '../lib/utils';
import { Search, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

interface TableHeaderProps {
  restaurantSettings: any;
  tableNumber: string;
  isStoreOpen: boolean;
  onSearchOpen: () => void;
  onOpenAccountModal: () => void;
  t: ReturnType<typeof useTranslation>;
}

export const TableHeader = ({ 
  restaurantSettings, 
  tableNumber, 
  isStoreOpen, 
  onSearchOpen, 
  onOpenAccountModal,
  t 
}: TableHeaderProps) => {
  return (
    <header className="p-4 pb-2">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl border-3 border-white overflow-hidden shrink-0">
            {restaurantSettings?.restaurantLogo ? (
              <img src={restaurantSettings.restaurantLogo} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <span className="font-black italic text-primary">FS</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter italic">
              {restaurantSettings?.restaurantName || 'Carregando...'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              {isStoreOpen ? (
                <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.05em] uppercase">
                  {t('tableMenu.table')} {tableNumber}
                </span>
              ) : (
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.05em] uppercase">
                  {t('tableMenu.closed')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button 
            onClick={onSearchOpen}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-50 text-slate-400 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={t('tableMenu.searchPlaceholder')}
          >
            <Search size={20} />
          </button>
          <button 
            onClick={onOpenAccountModal}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-50 text-slate-400 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={t('tableMenu.requestAccount')}
          >
            <ReceiptText size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};