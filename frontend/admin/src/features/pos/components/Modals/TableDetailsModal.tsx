import React, { useCallback } from 'react';
import { X, Utensils, List, Trash2, Printer, MoveRight, Receipt, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary } from '../../../../types';
import { removeOrderItem, getPosTableSummary } from '../../../../services/api';
import { printOrder } from '../../../../services/printing';
import { toast } from 'sonner';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface TableDetailsModalProps {
  viewingTable: TableSummary | null;
  setViewingTable: (table: TableSummary | null) => void;
  onRefreshTables: () => void;
}

export const TableDetailsModal: React.FC<TableDetailsModalProps> = React.memo(({ 
  viewingTable, setViewingTable, onRefreshTables 
}) => {
  const { activeModal, setActiveModal } = usePosStore();
  const prefersReducedMotion = usePrefersReducedMotion();

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  if (activeModal !== 'table_details' || !viewingTable) return null;

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if(confirm('Remover este item do pedido?')) {
      await removeOrderItem(viewingTable.id, itemId);
      toast.success('Item removido');
      onRefreshTables();
      const updated = await getPosTableSummary();
      const table = updated.find((t: TableSummary) => t.id === viewingTable.id);
      if(table) setViewingTable(table);
    }
  }, [viewingTable.id, onRefreshTables, setViewingTable]);

  const handlePrintPreBill = useCallback(async () => {
    try {
      const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
      await printOrder(viewingTable as any, config);
      toast.success('Pré-conta enviada!');
    } catch (e) { 
      toast.error('Erro ao imprimir'); 
    }
  }, [viewingTable]);

  const handleTransferTable = useCallback(() => {
    setActiveModal('transfer_table');
  }, [setActiveModal]);

  const handleOpenPayment = useCallback(() => {
    setActiveModal('payment_method');
  }, [setActiveModal]);

  const handleClose = useCallback(() => {
    setActiveModal('none');
  }, [setActiveModal]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={backdropTransition}
        onClick={handleClose} 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={modalTransition}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header */}
        <header className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Utensils size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight leading-none">
                Mesa {viewingTable.number < 10 ? `0${viewingTable.number}` : viewingTable.number}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Consumo</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2.5 bg-white rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
          {/* Coluna Esquerda - Itens */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <List size={14} /> Itens Consumidos
            </h4>
            <div className="space-y-2">
              {viewingTable.items?.map((item: any) => (
                <Card key={item.id} className="p-3 border-slate-200 hover:border-orange-300 transition-all group">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-800 uppercase">
                        {item.quantity < 10 ? `0${item.quantity}` : item.quantity}x {item.product?.name || item.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.sizeJson && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                            {JSON.parse(item.sizeJson).name}
                          </span>
                        )}
                        {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, idx: number) => (
                          <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                            +{a.name}
                          </span>
                        ))}
                      </div>
                      {item.observations && (
                        <p className="text-[9px] text-amber-600 font-medium mt-1.5 uppercase italic">
                          Obs: {item.observations}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-sm text-slate-900 whitespace-nowrap">
                        R$ {(item.quantity * (item.priceAtTime || 0)).toFixed(2)}
                      </span>
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        aria-label={`Remover ${item.product?.name || item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {(!viewingTable.items || viewingTable.items.length === 0) && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium uppercase text-xs">Nenhum item pendente</p>
                </div>
              )}
            </div>
            
            {/* Total Acumulado */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Acumulado</span>
                <span className="text-3xl font-black text-emerald-400 tracking-tight">
                  R$ {(viewingTable.totalAmount || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Ações */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <ArrowRightLeft size={14} /> Ações da Mesa
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl justify-between px-5 bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all" 
                onClick={handlePrintPreBill}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Printer size={20} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block">Imprimir Pré-Conta</span>
                    <span className="text-[9px] text-slate-400">Imprime os itens consumidos</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl justify-between px-5 bg-white border-slate-200 hover:bg-slate-50 hover:border-orange-300 transition-all" 
                onClick={handleTransferTable}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <MoveRight size={20} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block">Transferir Mesa</span>
                    <span className="text-[9px] text-slate-400">Move consumo para outra mesa</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 rounded-2xl justify-between px-5 bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-300 transition-all" 
                onClick={handleOpenPayment}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block">Encerrar e Pagar</span>
                    <span className="text-[9px] text-slate-400">Finaliza a conta da mesa</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
