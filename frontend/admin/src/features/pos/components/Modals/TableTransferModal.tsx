import React, { useCallback, useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../../../../components/ui/Input';
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
    if (e.key === 'Enter') {
      handleTransfer();
    }
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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
              <ArrowRightLeft size={24} />
            </div>
            <h3 className="text-xl font-bold uppercase text-slate-900 tracking-tight">Mover Consumo</h3>
          </div>
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Transferir da mesa</p>
            <p className="text-lg font-bold text-slate-900">{viewingTable.number}</p>
          </div>
          
          <Input 
            label="Mesa de Destino" 
            type="number" 
            placeholder="Digite o número..." 
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <p className="text-sm font-medium text-slate-500 text-center">
            Digite o número da nova mesa e pressione <span className="font-bold text-slate-700">Enter</span> para confirmar.
          </p>
          
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              fullWidth 
              onClick={handleBack}
              className="h-12 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-sm"
            >
              Cancelar
            </Button>
            <Button 
              fullWidth 
              onClick={handleTransfer}
              disabled={!targetTable || parseInt(targetTable) === viewingTable.number}
              className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase text-sm"
            >
              Transferir
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
