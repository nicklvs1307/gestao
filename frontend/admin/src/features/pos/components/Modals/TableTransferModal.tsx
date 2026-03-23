import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary } from '../../../../types';

interface TableTransferModalProps {
  viewingTable: TableSummary | null;
  onTransferTable: (newNumber: number) => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = ({
  viewingTable, onTransferTable
}) => {
  const { activeModal, setActiveModal } = usePosStore();

  if (activeModal !== 'transfer_table' || !viewingTable) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('table_details')} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl">
        <h3 className="text-xl font-black uppercase italic text-slate-900 mb-8 tracking-tighter">Mover Consumo</h3>
        <div className="space-y-6">
          <Input 
            label="Mesa de Destino" 
            type="number" 
            placeholder="Digite o número..." 
            onKeyDown={(e) => { 
              if(e.key === 'Enter') onTransferTable(parseInt((e.target as any).value)); 
            }} 
          />
          <p className="text-[9px] font-bold text-slate-400 uppercase italic text-center">Digite o número da nova mesa e pressione Enter para confirmar.</p>
          <Button variant="ghost" fullWidth onClick={() => setActiveModal('table_details')} className="uppercase text-[10px] font-black text-slate-400">Cancelar</Button>
        </div>
      </motion.div>
    </div>
  );
};
