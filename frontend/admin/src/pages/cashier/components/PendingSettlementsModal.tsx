import React, { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Truck, X, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingSettlementsModalProps {
  isOpen: boolean;
  settlements: any[];
  onClose: () => void;
}

const PendingSettlementsModal: React.FC<PendingSettlementsModalProps> = memo(({
  isOpen,
  settlements,
  onClose,
}) => {
  const totalPending = settlements.reduce((acc, i) => acc + i.order.total, 0);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden"
          >
            <header className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">
                      Acertos Pendentes
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Pedidos entregues sem fechamento financeiro
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="p-5 max-h-[50vh] overflow-y-auto bg-slate-50/30 space-y-3">
              {settlements.length > 0 ? (
                settlements.map(item => {
                  const orderNumber = item.order.dailyOrderNumber || item.order.id.slice(-3);
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-xs border border-slate-200">
                          #{orderNumber}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase italic leading-none">
                            {item.driver?.name || 'ENTREGADOR NAO ATRIBUIDO'}
                          </h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            {format(new Date(item.order.createdAt), 'HH:mm')} • {format(new Date(item.order.createdAt), 'dd/MM')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-slate-900 italic leading-none tracking-tighter">
                          {formatCurrency(item.order.total)}
                        </p>
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 inline-block bg-rose-50 px-2 py-1 rounded-lg">
                          Aguardando Acerto
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center opacity-40">
                  <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Tudo em dia!
                  </p>
                </div>
              )}
            </div>

            <footer className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
              <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex justify-between items-center shadow-xl">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Pendente
                  </span>
                </div>
                <span className="text-2xl font-black italic tracking-tighter">
                  {formatCurrency(totalPending)}
                </span>
              </div>
              
              <p className="text-xs text-slate-400 font-bold uppercase text-center tracking-widest leading-relaxed">
                Para fechar o caixa, voce deve realizar o acerto financeiro desses pedidos no menu <span className="text-rose-500 font-black">"Gestao de Acertos"</span>.
              </p>
              
              <Button
                fullWidth
                onClick={onClose}
                className="h-12 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                ENTENDI, VOU VERIFICAR
              </Button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

PendingSettlementsModal.displayName = 'PendingSettlementsModal';
export default PendingSettlementsModal;
