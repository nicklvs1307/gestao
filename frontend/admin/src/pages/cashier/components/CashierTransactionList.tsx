import React, { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Filter, Search, ShoppingBag, Truck, X, Receipt } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { PaymentMethod } from '../hooks/useCashier';

interface CashierTransactionListProps {
  paymentMethods: PaymentMethod[];
  selectedMethod: string;
  filteredOrders: any[];
  onUpdatePayment: (orderId: string, method: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const getOrderIcon = (orderType: string) => {
  return orderType === 'DELIVERY' ? Truck : ShoppingBag;
};

const getOrderLabel = (order: any) => {
  return order.tableNumber ? `MESA ${order.tableNumber}` : order.deliveryOrder?.name || 'BALCÃO';
};

const CashierTransactionList: React.FC<CashierTransactionListProps> = memo(({
  paymentMethods,
  selectedMethod,
  filteredOrders,
  onUpdatePayment,
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

      <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-3 bg-slate-50/30">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredOrders.map((order: any, index: number) => {
              const OrderIcon = getOrderIcon(order.orderType);
              const orderLabel = getOrderLabel(order);
              const orderNumber = order.dailyOrderNumber || order.id.slice(-3);
              
              return (
                <div
                  key={order.id}
                  className="bg-white px-4 py-3 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all group"
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
                        {format(new Date(order.createdAt), 'HH:mm')} • {order.user?.name?.split(' ')[0] || 'ADMIN'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900 italic tracking-tighter">
                        {formatCurrency(order.total)}
                      </p>
                    </div>

                    <div className="w-[140px]">
                      <select
                        className="w-full h-9 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 text-[10px] font-bold uppercase tracking-widest focus:border-slate-900 focus:outline-none transition-all"
                        value={selectedMethod}
                        onChange={(e) => handleUpdatePayment(order.id, e.target.value)}
                      >
                        {paymentMethods.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
