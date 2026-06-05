import React, { memo, useCallback } from 'react';
import { formatSP } from '@/lib/timezone';
import { Filter, Search, ShoppingBag, Truck, X, Receipt, CreditCard, Wallet, Smartphone, Banknote } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { PaymentMethod } from '../hooks/useCashier';
import { resolvePaymentLabel } from '@/utils/paymentUtils';

interface CashierTransactionListProps {
  paymentMethods: PaymentMethod[];
  selectedMethod: string;
  filteredOrders: any[];
  totalByMethod: number;
  onUpdatePayment: (orderId: string, method: string) => void;
  onOrderClick: (order: any) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const getOrderIcon = (orderType: string) => {
  return orderType === 'DELIVERY' ? Truck : ShoppingBag;
};

const getOrderLabel = (order: any) => {
  return order.tableNumber ? `MESA ${order.tableNumber}` : order.deliveryOrder?.name || 'BALCÃO';
};

const getMethodLabel = (method: string, paymentMethods: PaymentMethod[]) => {
  const mappedMethods = paymentMethods.map(pm => ({
    id: pm.id,
    name: pm.label,
    type: pm.type
  }));
  return resolvePaymentLabel(method, mappedMethods);
};

const getMethodIcon = (method: string) => {
  const m = method.toLowerCase();
  if (m.includes('credit') || m.includes('credito')) return CreditCard;
  if (m.includes('pix')) return Smartphone;
  if (m.includes('debit') || m.includes('debito')) return Wallet;
  return Banknote;
};

const CashierTransactionList: React.FC<CashierTransactionListProps> = memo(({
  paymentMethods,
  selectedMethod,
  filteredOrders,
  totalByMethod,
  onUpdatePayment,
  onOrderClick,
  searchTerm,
  onSearchChange,
}) => {
  const currentMethod = paymentMethods.find(m => m.id === selectedMethod);
  const MethodIcon = currentMethod?.icon || Receipt;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleUpdatePayment = useCallback((orderId: string, method: string) => {
    onUpdatePayment(orderId, method);
  }, [onUpdatePayment]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <Card
      className="p-0 border-slate-200 shadow-lg overflow-hidden bg-white flex flex-col"
      noPadding
    >
      <div className="px-4 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center shrink-0">
            <MethodIcon size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              {currentMethod?.label}
            </h3>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {filteredOrders.length} movimentação(ões)
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar lancamento..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="h-8 w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 text-[10px] font-semibold uppercase tracking-wider focus:border-slate-900 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] bg-white">
        {filteredOrders.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order: any) => {
              const OrderIcon = getOrderIcon(order.orderType);
              const orderLabel = getOrderLabel(order);
              const orderNumber = order.dailyOrderNumber || order.id.slice(-3);
              const payments = order.payments || [];
              const paidAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
              const isPartial = order._isPartial || (payments.length > 0 && paidAmount < order.total);
              const methodAmount = order._methodAmount || 0;
              const hasPayment = payments.length > 0;
              const isMultiplePayments = payments.length > 1;

              return (
                <div
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0 w-8 text-center">
                      #{orderNumber}
                    </span>
                    <OrderIcon size={13} className="text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-slate-800 uppercase truncate block">
                        {orderLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatSP(order.createdAt, 'HH:mm')} • {order.user?.name?.split(' ')[0] || 'ADMIN'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isMultiplePayments ? (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {payments.map((payment: any) => {
                          const methodLabel = getMethodLabel(payment.method, paymentMethods);
                          return (
                            <span key={payment.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold uppercase">
                              {methodLabel}: {formatCurrency(payment.amount)}
                            </span>
                          );
                        })}
                      </div>
                    ) : hasPayment ? (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isPartial ? 'PARCIAL' : 'PAGO'}
                      </span>
                    ) : null}
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatCurrency(methodAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
            <Filter size={36} strokeWidth={1.5} className="text-slate-400 mb-2" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-center px-10">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma transacao registrada nesta modalidade'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});

CashierTransactionList.displayName = 'CashierTransactionList';
export default CashierTransactionList;
