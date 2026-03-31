import React, { useCallback, useState, useMemo } from 'react';
import { X, Utensils, List, Trash2, Printer, MoveRight, Receipt, ChevronRight, ArrowRightLeft, Users, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { cn } from '../../../../lib/utils';
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
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

  const backdropTransition = prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 };
  const modalTransition = prefersReducedMotion ? { duration: 0.1 } : { type: "spring", damping: 25, stiffness: 300 };

  if (activeModal !== 'table_details' || !viewingTable) return null;

  const tabs = viewingTable.tabs || [];
  
  // Seleciona a primeira tab por padrão
  const activeTab = useMemo(() => {
    if (selectedTabId) return tabs.find(t => t.orderId === selectedTabId) || tabs[0];
    return tabs[0];
  }, [tabs, selectedTabId]);

  const activeItems = activeTab?.items || viewingTable.items || [];

  const handleRemoveItem = useCallback(async (itemId: string) => {
    if(confirm('Remover este item do pedido?')) {
      const orderId = activeTab?.orderId || viewingTable.tabs?.[0]?.orderId;
      if (!orderId) return;
      await removeOrderItem(orderId, itemId);
      toast.success('Item removido');
      onRefreshTables();
      const updated = await getPosTableSummary();
      const table = updated.find((t: TableSummary) => t.id === viewingTable.id);
      if(table) setViewingTable(table);
    }
  }, [activeTab?.orderId, viewingTable.id, viewingTable.tabs, onRefreshTables, setViewingTable]);

  const handlePrintPreBill = useCallback(async () => {
    try {
      const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
      if (!activeTab || !activeItems.length) {
        toast.error('Nenhum item para imprimir');
        return;
      }
      const orderForPrint = {
        id: activeTab.orderId,
        orderType: 'TABLE' as const,
        status: 'PENDING' as const,
        tableNumber: viewingTable.number,
        customerName: activeTab.customerName,
        totalAmount: activeTab.totalAmount,
        items: activeItems.map((item: any) => ({
          ...item,
          product: item.product || { name: item.name, categories: [] },
          priceAtTime: item.priceAtTime || 0,
        })),
      };
      await printOrder(orderForPrint as any, config);
      toast.success(`Pré-conta de ${activeTab.customerName} enviada!`);
    } catch (e) { 
      console.error('[printPreBill] Erro:', e);
      toast.error('Erro ao imprimir pré-conta'); 
    }
  }, [activeTab, activeItems, viewingTable.number]);

  const handleTransferTable = useCallback(() => {
    setActiveModal('transfer_table');
  }, [setActiveModal]);

  const handleOpenPayment = useCallback(() => {
    setActiveModal('payment_method');
  }, [setActiveModal]);

  const handleClose = useCallback(() => {
    setActiveModal('none');
    setSelectedTabId(null);
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
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* Header */}
        <header className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Utensils size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight leading-none">
                Mesa {viewingTable.number < 10 ? `0${viewingTable.number}` : viewingTable.number}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {tabs.length} {tabs.length === 1 ? 'comanda' : 'comandas'} · R$ {(viewingTable.totalAmount || 0).toFixed(2)}
              </p>
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
        
        {/* Tabs de Comandas */}
        {tabs.length > 0 && (
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Comandas:</span>
              {tabs.map(tab => (
                <button
                  key={tab.orderId}
                  onClick={() => setSelectedTabId(tab.orderId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0",
                    (selectedTabId === tab.orderId || (!selectedTabId && tab === tabs[0]))
                      ? "bg-white border-rose-300 shadow-sm"
                      : "bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-300"
                  )}
                >
                  <Users size={12} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">{tab.customerName}</span>
                  <span className="text-[10px] font-bold text-emerald-600">R$ {tab.totalAmount.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
          {/* Coluna Esquerda - Itens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <List size={14} /> 
                {activeTab ? `Itens de ${activeTab.customerName}` : 'Itens Consumidos'}
              </h4>
              <span className="text-[9px] font-bold text-slate-400">{activeItems.length} {activeItems.length === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="space-y-2">
              {activeItems.map((item: any) => (
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
              {(!activeItems || activeItems.length === 0) && (
                <div className="py-12 text-center">
                  <FileText size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 font-medium uppercase text-xs">Nenhum item nesta comanda</p>
                </div>
              )}
            </div>
            
            {/* Total da Comanda */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                    {activeTab ? `Total ${activeTab.customerName}` : 'Total Acumulado'}
                  </span>
                  {tabs.length > 1 && (
                    <span className="text-[9px] text-slate-500">{tabs.length} comandas na mesa</span>
                  )}
                </div>
                <span className="text-3xl font-black text-emerald-400 tracking-tight">
                  R$ {(activeTab?.totalAmount || viewingTable.totalAmount || 0).toFixed(2).replace('.', ',')}
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
                disabled={activeItems.length === 0}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Printer size={20} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 block">Imprimir Pré-Conta</span>
                    <span className="text-[9px] text-slate-400">
                      {activeTab ? `Conta de ${activeTab.customerName}` : 'Imprime os itens consumidos'}
                    </span>
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

            {/* Resumo de todas as comandas */}
            {tabs.length > 1 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Resumo das Comandas</h5>
                <div className="space-y-2">
                  {tabs.map(tab => (
                    <div key={tab.orderId} className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{tab.customerName}</span>
                      <span className="text-xs font-black text-slate-900">R$ {tab.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-500 uppercase">Total Mesa</span>
                    <span className="text-sm font-black text-emerald-600">R$ {viewingTable.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
