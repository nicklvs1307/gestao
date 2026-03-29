import React, { memo } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Truck, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { AnimatePresence, motion } from 'framer-motion';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ui-modal-overlay">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="ui-modal-content w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter italic">
                    Acertos Pendentes
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Pedidos entregues sem fechamento financeiro
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-white transition-all"
              >
                <X size={22} />
              </button>
            </header>

            <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/30 space-y-3">
              {settlements.length > 0 ? (
                settlements.map(item => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs border border-slate-100">
                        #{item.order.dailyOrderNumber || item.order.id.slice(-3)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase italic leading-none">
                          {item.driver?.name || 'ENTREGADOR NÃO ATRIBUÍDO'}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                          {format(new Date(item.order.createdAt), 'HH:mm')} •{' '}
                          {format(new Date(item.order.createdAt), 'dd/MM')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 italic leading-none tabular-nums">
                        R$ {item.order.total.toFixed(2)}
                      </p>
                      <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-1 inline-block bg-rose-50 px-1.5 py-0.5 rounded">
                        Aguardando Acerto
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center opacity-20">
                  <CheckCircle size={48} className="mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Tudo em dia!
                  </p>
                </div>
              )}
            </div>

            <footer className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4">
              <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Total Pendente
                </span>
                <span className="text-xl font-black italic tabular-nums">
                  R$ {totalPending.toFixed(2)}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest leading-relaxed italic">
                Para fechar o caixa, você deve realizar o acerto financeiro{' '}
                <br /> desses pedidos no menu{' '}
                <span className="text-rose-500">"Gestão de Acertos"</span>.
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
