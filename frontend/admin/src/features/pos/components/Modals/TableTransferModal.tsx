import React, { useCallback, useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary } from '../../../../types';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface TableTransferModalProps {
  viewingTable: TableSummary | null;
  onTransferTable: (newNumber: number) => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = React.memo(({
  viewingTable, onTransferTable
}) => {
  const { activeModal, setActiveModal } = usePosStore();
  const [targetTable, setTargetTable] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  if (activeModal !== 'transfer_table' || !viewingTable) return null;

  const handleTransfer = useCallback(() => {
    const tableNumber = parseInt(targetTable);
    if (tableNumber && tableNumber > 0) {
      onTransferTable(tableNumber);
    }
  }, [targetTable, onTransferTable]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTransfer();
  }, [handleTransfer]);

  const handleBack = useCallback(() => {
    setActiveModal('table_details');
  }, [setActiveModal]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={backdropTransition}
        onClick={handleBack} 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight leading-none">Transferir Mesa</h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Mover consumo</p>
            </div>
          </div>
          <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-5">
          {/* De */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transferir da mesa</p>
            <p className="text-lg font-black text-slate-900">{viewingTable.number < 10 ? `0${viewingTable.number}` : viewingTable.number}</p>
          </div>
          
          {/* Para */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider ml-1">Mesa de Destino</label>
            <input 
              type="number" 
              placeholder="Digite o número..." 
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 shadow-sm transition-all"
            />
          </div>
          
          <p className="text-[10px] font-medium text-slate-400 text-center">
            Digite o número da nova mesa e pressione <span className="font-bold text-slate-600">Enter</span> para confirmar.
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <Button 
              variant="outline" 
              fullWidth 
              onClick={handleBack}
              className="h-12 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-xs"
            >
              Cancelar
            </Button>
            <Button 
              fullWidth 
              onClick={handleTransfer}
              disabled={!targetTable || parseInt(targetTable) === viewingTable.number}
              className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-xs disabled:opacity-30 disabled:grayscale transition-all"
            >
              Transferir
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
