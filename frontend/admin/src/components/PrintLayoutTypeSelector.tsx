import React from 'react';
import { cn } from '../lib/utils';
import { Truck, ShoppingBag, Armchair } from 'lucide-react';
import type { PrintLayoutType } from '../types/printLayout';
import { PRINT_LAYOUT_TYPE_LABELS } from '../types/printLayout';

interface PrintLayoutTypeSelectorProps {
  selectedType: PrintLayoutType;
  onSelectType: (type: PrintLayoutType) => void;
  layouts: Record<PrintLayoutType, any | null>;
  disabled?: boolean;
}

const TYPE_ICONS: Record<PrintLayoutType, React.ElementType> = {
  delivery: Truck,
  pickup: ShoppingBag,
  table: Armchair,
};

const TYPE_COLORS: Record<PrintLayoutType, { active: string; inactive: string; icon: string }> = {
  delivery: {
    active: 'bg-blue-500 text-white shadow-lg shadow-blue-200',
    inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200',
    icon: 'text-blue-500',
  },
  pickup: {
    active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-200',
    inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200',
    icon: 'text-emerald-500',
  },
  table: {
    active: 'bg-orange-500 text-white shadow-lg shadow-orange-200',
    inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200',
    icon: 'text-orange-500',
  },
};

export const PrintLayoutTypeSelector: React.FC<PrintLayoutTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  layouts,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Tipo de Comanda
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(PRINT_LAYOUT_TYPE_LABELS) as PrintLayoutType[]).map((type) => {
          const Icon = TYPE_ICONS[type];
          const colors = TYPE_COLORS[type];
          const isSelected = selectedType === type;
          const exists = layouts[type] !== null;
          
          return (
            <button
              key={type}
              onClick={() => onSelectType(type)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200',
                isSelected ? colors.active : colors.inactive,
                disabled && 'opacity-50 cursor-not-allowed',
                !exists && !isSelected && 'border-dashed'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isSelected ? 'bg-white/20' : 'bg-white'
              )}>
                <Icon size={20} className={isSelected ? 'text-white' : colors.icon} />
              </div>
              
              <div className="text-center">
                <p className={cn(
                  'text-[10px] font-black uppercase tracking-wider',
                  isSelected ? 'text-white' : 'text-slate-700'
                )}>
                  {PRINT_LAYOUT_TYPE_LABELS[type]}
                </p>
                <p className={cn(
                  'text-[7px] font-bold uppercase tracking-widest mt-0.5',
                  isSelected ? 'text-white/70' : 'text-slate-500'
                )}>
                  {exists ? 'Configurado' : 'Não configurado'}
                </p>
              </div>
              
              {isSelected && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
