import React from 'react';
import { X, Utensils, List, Trash2, Printer, MoveRight, Receipt, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary } from '../../../../types';
import { removeOrderItem, getPosTableSummary } from '../../../../services/api';
import { printOrder } from '../../../../services/printing';
import { toast } from 'sonner';

interface TableDetailsModalProps {
  viewingTable: TableSummary | null;
  setViewingTable: (table: TableSummary | null) => void;
  onRefreshTables: () => void;
}

export const TableDetailsModal: React.FC<TableDetailsModalProps> = ({ 
  viewingTable, setViewingTable, onRefreshTables 
}) => {
  const { activeModal, setActiveModal } = usePosStore();

  if (activeModal !== 'table_details' || !viewingTable) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100"><Utensils size={24} /></div>
            <div>
              <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Mesa 0{viewingTable.number}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Consumo</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setActiveModal('none')} className="bg-white rounded-full"><X size={24} /></Button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10 custom-scrollbar">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><List size={14} /> Itens Consumidos</h4>
            <div className="space-y-2">
              {viewingTable.items?.map((item: any) => (
                <Card key={item.id} className="p-4 border-slate-50 group hover:border-orange-200 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 uppercase italic">0{item.quantity}x {item.product.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.sizeJson && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{JSON.parse(item.sizeJson).name}</span>}
                        {item.addonsJson && JSON.parse(item.addonsJson).map((a:any) => <span key={a.id} className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">+{a.name}</span>)}
                      </div>
                      {item.observations && <p className="text-[8px] text-amber-600 font-bold mt-1 uppercase italic">Obs: {item.observations}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-xs italic text-slate-900">R$ {(item.quantity * (item.priceAtTime || 0)).toFixed(2)}</span>
                      <button 
                        onClick={async () => {
                          if(confirm('Remover este item do pedido?')) {
                            await removeOrderItem(viewingTable.id, item.id);
                            toast.success('Item removido');
                            onRefreshTables();
                            const updated = await getPosTableSummary();
                            const table = updated.find((t:any) => t.id === viewingTable.id);
                            if(table) setViewingTable(table);
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
              {(!viewingTable.items || viewingTable.items.length === 0) && (
                <p className="text-center py-10 text-slate-300 font-black uppercase text-[10px] italic">Nenhum item pendente</p>
              )}
            </div>
            <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Acumulado</span>
                <span className="text-3xl font-black italic text-emerald-400 tracking-tighter">R$ {(viewingTable.totalAmount || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><ArrowRightLeft size={14} /> Ações da Mesa</h4>
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={async () => {
                try {
                  const config = JSON.parse(localStorage.getItem('printer_config') || '{}');
                  await printOrder(viewingTable as any, config);
                  toast.success('Pré-conta enviada!');
                } catch (e) { toast.error('Erro ao imprimir'); }
              }}><div className="flex items-center gap-3"><Printer size={18} className="text-blue-500" /><span>Imprimir Pré-Conta</span></div><ChevronRight size={16} /></Button>
              <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={() => setActiveModal('transfer_table')}><div className="flex items-center gap-3"><MoveRight size={18} className="text-orange-500" /><span>Transferir Mesa</span></div><ChevronRight size={16} /></Button>
              <Button variant="outline" className="h-14 rounded-2xl justify-between px-6 bg-slate-50 border-slate-100" onClick={() => setActiveModal('payment_method')}><div className="flex items-center gap-3"><Receipt size={18} className="text-emerald-500" /><span>Encerrar e Pagar</span></div><ChevronRight size={16} /></Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
