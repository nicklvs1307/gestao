import React, { memo, useState, useCallback, useEffect } from 'react';
import { X, Truck, ShoppingBag, Clock, User, List, Plus, Trash2, CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react';
import { formatSP } from '@/lib/timezone';
import { toast } from 'sonner';
import type { PaymentMethod } from '../hooks/useCashier';
import { updatePaymentMethodSpecific, removeOrderPayment, addOrderPayment } from '../../../services/api';

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { name: string };
}

interface Order {
  id: string;
  dailyOrderNumber?: number;
  orderType: string;
  tableNumber?: number;
  total: number;
  status: string;
  createdAt: string;
  customerName?: string;
  items: OrderItem[];
  deliveryOrder?: { name?: string; address?: string };
  payments: Payment[];
  user?: { name: string };
}

interface CashierOrderDetailModalProps {
  isOpen: boolean;
  order: Order | null;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onRefresh: () => void;
}

const getMethodIcon = (method: string) => {
  const m = method.toLowerCase();
  if (m.includes('credit') || m.includes('credito')) return CreditCard;
  if (m.includes('debit') || m.includes('debito')) return Wallet;
  if (m.includes('pix')) return Smartphone;
  return Banknote;
};

const getMethodLabel = (method: string, paymentMethods: PaymentMethod[]) => {
  const m = method.toLowerCase();
  const found = paymentMethods.find(pm => 
    pm.id.toLowerCase() === m || 
    pm.label.toLowerCase().includes(m)
  );
  return found?.label || method;
};

const formatCurrency = (value: number) => 
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const normalizePaymentMethod = (method: string): string => {
  if (!method) return '';
  return method.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const findMatchingMethodId = (method: string, paymentMethods: PaymentMethod[]): string => {
  const normalizedMethod = normalizePaymentMethod(method);
  const found = paymentMethods.find(pm => 
    normalizePaymentMethod(pm.id) === normalizedMethod ||
    normalizePaymentMethod(pm.label) === normalizedMethod
  );
  return found?.id || paymentMethods[0]?.id || '';
};

const CashierOrderDetailModal: React.FC<CashierOrderDetailModalProps> = memo(({
  isOpen,
  order,
  paymentMethods,
  onClose,
  onRefresh,
}) => {
  useEffect(() => {
    if (isOpen && order) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, order]);

  const [isLoading, setIsLoading] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');

  const paidAmount = order?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const isPartial = order ? paidAmount < order.total : false;
  const remainingAmount = order ? order.total - paidAmount : 0;

  const handleRemovePayment = useCallback(async (paymentId: string) => {
    if (!confirm('Remover este pagamento?')) return;
    
    setIsLoading(true);
    try {
      await removeOrderPayment(paymentId);
      toast.success('Pagamento removido!');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao remover pagamento.');
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  const handleUpdatePayment = useCallback(async (paymentId: string, newMethod: string) => {
    setIsLoading(true);
    try {
      await updatePaymentMethodSpecific(paymentId, newMethod);
      toast.success('Pagamento atualizado!');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao atualizar pagamento.');
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  const handleAddPayment = useCallback(async () => {
    if (!order || !newPaymentMethod || !newPaymentAmount) {
      toast.error('Preencha todos os campos.');
      return;
    }

    const amount = parseFloat(newPaymentAmount);
    if (amount <= 0 || amount > remainingAmount) {
      toast.error(`Valor deve ser maior que 0 e menor ou igual a ${formatCurrency(remainingAmount)}`);
      return;
    }

    setIsLoading(true);
    try {
      await addOrderPayment(order.id, { amount, method: newPaymentMethod });
      toast.success('Pagamento adicionado!');
      setShowAddPayment(false);
      setNewPaymentMethod('');
      setNewPaymentAmount('');
      onRefresh();
    } catch (error) {
      toast.error('Erro ao adicionar pagamento.');
    } finally {
      setIsLoading(false);
    }
  }, [order, newPaymentMethod, newPaymentAmount, remainingAmount, onRefresh]);

  if (!isOpen || !order) return null;

  const OrderIcon = order.orderType === 'DELIVERY' ? Truck : ShoppingBag;
  const orderLabel = order.tableNumber 
    ? `MESA ${order.tableNumber}` 
    : order.deliveryOrder?.name || order.customerName || 'BALCÃO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <OrderIcon size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
                Pedido #{order.dailyOrderNumber || order.id.slice(-3)}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {orderLabel} • {formatSP(order.createdAt, 'dd/MM HH:mm')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatSP(order.createdAt, 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{order.user?.name || 'Admin'}</span>
            </div>
            {order.status && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                order.status === 'CANCELED' ? 'bg-rose-100 text-rose-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {order.status}
              </span>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h3 className="text-xs font-black text-slate-900 uppercase italic tracking-widest mb-3 flex items-center gap-2">
              <List size={14} className="text-blue-500" />
              Itens do Pedido
            </h3>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-medium">
                    {item.quantity}x {item.product?.name || 'Item'}
                  </span>
                  <span className="text-slate-900 font-black">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
              <span className="text-xs font-black text-slate-600 uppercase">Total</span>
              <span className="text-sm font-black text-slate-900">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
                <CreditCard size={14} className="text-emerald-500" />
                Pagamentos
              </h3>
              {isPartial && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-lg">
                  PARCIAL
                </span>
              )}
            </div>

            {order.payments?.length > 0 ? (
              <div className="space-y-2">
                {order.payments.map((payment) => {
                  const MethodIcon = getMethodIcon(payment.method);
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <MethodIcon size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">
                            {getMethodLabel(payment.method, paymentMethods)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatSP(payment.createdAt, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-7 text-[10px] font-bold uppercase bg-slate-50 border border-slate-200 rounded-lg px-2 focus:border-slate-900 outline-none"
                            value={findMatchingMethodId(payment.method, paymentMethods)}
                            onChange={(e) => handleUpdatePayment(payment.id, e.target.value)}
                          >
                                {paymentMethods.map((pm) => (
                                  <option key={pm.id} value={pm.id}>
                                    {pm.label}
                                  </option>
                                ))}
                          </select>
                          <button
                            onClick={() => {
                              if (window.confirm(`⚠️ Deseja realmente excluir a forma de pagamento "${payment.method}" de R$ ${formatCurrency(payment.amount)}?`)) {
                                handleRemovePayment(payment.id);
                              }
                            }}
                            className="w-7 h-7 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Nenhum pagamento registrado</p>
            )}

            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 uppercase">Pago</span>
                <span className="font-black text-emerald-600">{formatCurrency(paidAmount)}</span>
              </div>
              {isPartial && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="font-bold text-amber-600 uppercase">Restante</span>
                  <span className="font-black text-amber-600">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
            </div>

            {isPartial && !showAddPayment && (
              <button
                onClick={() => setShowAddPayment(true)}
                className="mt-3 w-full h-10 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 border-dashed rounded-xl flex items-center justify-center gap-2 text-blue-600 font-black uppercase text-xs tracking-wider transition-all"
              >
                <Plus size={16} />
                Adicionar Pagamento
              </button>
            )}

            {showAddPayment && (
              <div className="mt-3 p-3 bg-white rounded-xl border-2 border-blue-200 space-y-3">
                <p className="text-xs font-black text-blue-700 uppercase">Novo Pagamento</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-9 text-xs font-bold uppercase bg-slate-50 border-2 border-slate-200 rounded-lg px-3 focus:border-slate-900 outline-none"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    className="w-28 h-9 text-xs font-bold text-right bg-slate-50 border-2 border-slate-200 rounded-lg px-3 focus:border-slate-900 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddPayment(false);
                      setNewPaymentMethod('');
                      setNewPaymentAmount('');
                    }}
                    className="flex-1 h-9 bg-slate-100 text-slate-600 font-black uppercase text-xs rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={isLoading}
                    className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CashierOrderDetailModal.displayName = 'CashierOrderDetailModal';
export default CashierOrderDetailModal;