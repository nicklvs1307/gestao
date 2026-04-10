import React, { memo, useCallback } from 'react';
import { formatSP } from '@/lib/timezone';
import { Filter, Search, ShoppingBag, Truck, X, Receipt, CreditCard, AlertCircle, Wallet, Smartphone, Banknote } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { PaymentMethod } from '../hooks/useCashier';

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
  const m = method.toLowerCase();
  const found = paymentMethods.find(pm => 
    pm.id.toLowerCase() === m || 
    pm.label.toLowerCase().includes(m)
  );
  return found?.label || method;
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
      className="p-0 border-slate-200 shadow-xl overflow-hidden bg-white flex flex-col"
      noPadding
    >
      <div className="px-5 py-4 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
            <MethodIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
              Detalhamento: {currentMethod?.label}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {filteredOrders.length} movimentação(ões)
              </span>
            </div>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar lancamento..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="h-10 w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-9 pr-8 text-[10px] font-bold uppercase tracking-widest focus:border-slate-900 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[350px] p-3 space-y-2 bg-slate-50/30">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredOrders.map((order: any, index: number) => {
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
                  className="bg-white px-4 py-3 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 text-xs font-black text-slate-500 uppercase group-hover:bg-slate-900 group-hover:text-white transition-all">
                      #{orderNumber}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-2">
                        <OrderIcon size={12} className="text-orange-500" />
                        {orderLabel}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {formatSP(order.createdAt, 'HH:mm')} • {order.user?.name?.split(' ')[0] || 'ADMIN'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    {isMultiplePayments ? (
                      <div className="flex flex-wrap gap-1">
                        {payments.map((payment: any) => {
                          const methodLabel = getMethodLabel(payment.method, paymentMethods);
                          return (
                            <span key={payment.id} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase">
                              <CreditCard size={8} />
                              {methodLabel}: {formatCurrency(payment.amount)}
                            </span>
                          );
                        })}
                      </div>
                    ) : hasPayment ? (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        <CreditCard size={10} />
                        {isPartial ? 'PARCIAL' : 'PAGO'}
                      </div>
                    ) : null}
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900 italic tracking-tighter">
                        {formatCurrency(order.total)}
                      </p>
                      {isPartial && (
                        <p className="text-[9px] font-bold text-amber-600 uppercase">Parcial</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalByMethod > 0 && (
            <div className="mt-3 pt-3 border-t-2 border-slate-200 flex justify-between items-center px-2">
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Total desta forma</span>
              <span className="text-base font-black text-emerald-600 italic tracking-tight">{formatCurrency(totalByMethod)}</span>
            </div>
          )}
        ) : (
          <div className="flex flex-col items-center justify-center h-48 opacity-30">
            <Filter size={48} strokeWidth={1.5} className="text-slate-400 mb-3" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 text-center px-10 leading-tight">
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
