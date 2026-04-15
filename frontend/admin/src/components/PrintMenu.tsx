import React, { useState, useCallback } from 'react';
import { Printer, Loader2, ChevronDown, ShoppingCart, ChefHat, Wine } from 'lucide-react';
import { toast } from 'sonner';
import type { Order } from '@/types';
import { getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder, type PrintTarget } from '../services/printer';

interface PrintMenuProps {
  order: Order;
  onPrinted?: () => void;
}

const printTargetLabels: Record<PrintTarget, string> = {
  all: 'Imprimir Todos',
  cashier: 'Imprimir Caixa',
  kitchen: 'Imprimir Cozinha',
  bar: 'Imprimir Bar',
};

const printTargetIcons: Record<PrintTarget, React.ReactNode> = {
  all: <Printer size={14} />,
  cashier: <ShoppingCart size={14} />,
  kitchen: <ChefHat size={14} />,
  bar: <Wine size={14} />,
};

export const PrintMenu: React.FC<PrintMenuProps> = ({ order, onPrinted }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingTarget, setPrintingTarget] = useState<PrintTarget | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePrintTarget = useCallback(async (target: PrintTarget) => {
    handleClose();
    setIsPrinting(true);
    setPrintingTarget(target);

    try {
      const settingsData = await getSettings();
      const restaurantInfo = {
        name: settingsData.name,
        address: settingsData.address,
        phone: settingsData.phone,
        cnpj: settingsData.fiscalConfig?.cnpj,
        logoUrl: settingsData.logoUrl,
      };
      const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
      
      await printOrder(order, printerConfig, undefined, restaurantInfo, target);
      await markOrderAsPrinted(order.id);
      
      const targetLabel = printTargetLabels[target];
      toast.success(`${targetLabel} enviado!`);
      onPrinted?.();
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Falha na impressão.');
    } finally {
      setIsPrinting(false);
      setPrintingTarget(null);
    }
  }, [order, onPrinted]);

  const isAnyPrinting = isPrinting;
  const currentLabel = printingTarget 
    ? printTargetLabels[printingTarget] 
    : 'Imprimir';

  const printTargets: PrintTarget[] = ['all', 'cashier', 'kitchen', 'bar'];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isAnyPrinting}
        className="flex items-center gap-1.5 h-9 px-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-md disabled:opacity-50"
      >
        {isAnyPrinting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Printer size={14} />
        )}
        {currentLabel}
        {!isAnyPrinting && <ChevronDown size={12} className="ml-1" />}
      </button>

      {/* Dropdown para OrderCard (mais simples) */}
      {anchorEl && anchorEl.classList.contains('print-menu-card') && (
        <div
          className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[160px] overflow-hidden"
          style={{
            position: 'absolute',
          }}
        >
          {printTargets.map((target) => (
            <button
              key={target}
              onClick={() => handlePrintTarget(target)}
              disabled={isPrinting}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {printTargetIcons[target]}
              {printTargetLabels[target]}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

interface PrintMenuDropdownProps {
  order: Order;
  onPrinted?: () => void;
}

export const PrintMenuDropdown: React.FC<PrintMenuDropdownProps> = ({ order, onPrinted }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingTarget, setPrintingTarget] = useState<PrintTarget | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePrintTarget = useCallback(async (target: PrintTarget) => {
    handleClose();
    setIsPrinting(true);
    setPrintingTarget(target);

    try {
      const settingsData = await getSettings();
      const restaurantInfo = {
        name: settingsData.name,
        address: settingsData.address,
        phone: settingsData.phone,
        cnpj: settingsData.fiscalConfig?.cnpj,
        logoUrl: settingsData.logoUrl,
      };
      const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
      
      await printOrder(order, printerConfig, undefined, restaurantInfo, target);
      await markOrderAsPrinted(order.id);
      
      const targetLabel = printTargetLabels[target];
      toast.success(`${targetLabel} enviado!`);
      onPrinted?.();
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Falha na impressão.');
    } finally {
      setIsPrinting(false);
      setPrintingTarget(null);
    }
  }, [order, onPrinted]);

  const isAnyPrinting = isPrinting;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isAnyPrinting}
        className="flex items-center gap-1.5 h-9 px-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-md disabled:opacity-50"
      >
        {isAnyPrinting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Printer size={14} />
        )}
        {printingTarget ? printTargetLabels[printingTarget] : 'Imprimir'}
        {!isAnyPrinting && <ChevronDown size={12} className="ml-1" />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-[400] min-w-[180px] overflow-hidden"
          style={{ 
            position: 'absolute',
            right: 0,
            top: '100%'
          }}
        >
          {(['all', 'cashier', 'kitchen', 'bar'] as PrintTarget[]).map((target) => (
            <button
              key={target}
              onClick={() => handlePrintTarget(target)}
              disabled={isPrinting}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 flex items-center justify-center text-slate-500">
                {printTargetIcons[target]}
              </span>
              {printTargetLabels[target]}
            </button>
          ))}
        </div>
      )}
      
      {/* Overlay para fechar ao clicar fora */}
      {open && (
        <div 
          className="fixed inset-0 z-[350]" 
          onClick={handleClose}
        />
      )}
    </>
  );
};

export default PrintMenu;