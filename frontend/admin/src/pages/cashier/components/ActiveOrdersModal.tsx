import React, { memo, useCallback, useEffect } from 'react';
import { formatSP } from '@/lib/timezone';
import { CheckCircle, Truck, ShoppingBag, X, AlertTriangle, Clock, User } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ModalPortal } from '../../../components/ui/ModalPortal';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { name: string };
}

interface ActiveOrder {
  id: string;
  dailyOrderNumber?: number;
  orderType: string;
  tableNumber?: number;
  total: number;
  status: string;
  createdAt: string;
  customerName?: string;
  items: OrderItem[];
  deliveryOrder?: { name?: string; address?: string; driver?: { name?: string } };
  payments: any[];
  user?: { name: string };
}

interface ActiveOrdersModalProps {
  isOpen: boolean;
  orders: ActiveOrder[];
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BUILDING: { label: 'Montando', color: 'bg-slate-100 text-slate-700' },
  PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  PREPARING: { label: 'Preparando', color: 'bg-blue-100 text-blue-700' },
  READY: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-700' },
  SHIPPED: { label: 'Saiu Entrega', color: 'bg-purple-100 text-purple-700' },
};

const getOrderIcon = (orderType: string) => {
  return orderType === 'DELIVERY' ? Truck : ShoppingBag;
};

const getOrderLabel = (order: ActiveOrder) => {
  if (order.tableNumber) return `MESA ${order.tableNumber}`;
  if (order.deliveryOrder?.name) return order.deliveryOrder.name;
  if (order.customerName) return order.customerName;
  return 'BALCAO';
};

const formatCurrency = (value: number) => 
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ActiveOrdersModal: React.FC<ActiveOrdersModalProps> = memo(({
  isOpen,
  orders,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const totalPending = orders.reduce((acc, order) => acc + order.total, 0);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border-2 border-slate-200 overflow-hidden">
          <header className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">
                    Pedidos Ativos
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Pedidos em andamento que impedem o fechamento
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-amber-50 hover:text-amber-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="p-5 max-h-[50vh] overflow-y-auto bg-slate-50/30 space-y-3">
            {orders.length > 0 ? (
              orders.map(order => {
                const orderNumber = order.dailyOrderNumber || order.id.slice(-3);
                const OrderIcon = getOrderIcon(order.orderType);
                const orderLabel = getOrderLabel(order);
                const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700' };
                
                return (
                  <div
                    key={order.id}
                    className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 text-xs border border-slate-200 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all">
                        #{orderNumber}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase italic leading-none flex items-center gap-2">
                          <OrderIcon size={12} className="text-amber-500" />
                          {orderLabel}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            <Clock size={10} />
                            {formatSP(order.createdAt, 'HH:mm')}
                          </span>
                          <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            <User size={10} />
                            {order.user?.name?.split(' ')[0] || 'ADMIN'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900 italic leading-none tracking-tighter">
                        {formatCurrency(order.total)}
                      </p>
                      <span className={`text-[8px] font-black uppercase tracking-widest mt-2 inline-block px-2 py-1 rounded-lg ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center opacity-40">
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Nenhum pedido ativo!
                </p>
              </div>
            )}
          </div>

          <footer className="p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white flex justify-between items-center shadow-xl">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Total Pendente
                </span>
              </div>
              <span className="text-2xl font-black italic tracking-tighter">
                {formatCurrency(totalPending)}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 font-bold uppercase text-center tracking-widest leading-relaxed">
              Finalize ou cancele esses pedidos antes de fechar o caixa.
            </p>
            
            <Button
              fullWidth
              onClick={onClose}
              className="h-12 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              ENTENDI, VOU VERIFICAR
            </Button>
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
});

ActiveOrdersModal.displayName = 'ActiveOrdersModal';
export default ActiveOrdersModal;
