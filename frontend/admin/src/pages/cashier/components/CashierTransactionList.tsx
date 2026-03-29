import React, { memo } from 'react';
import { format } from 'date-fns';
import { Filter, HelpCircle, Search, ShoppingBag, Truck, X } from 'lucide-react';
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

const CashierTransactionList: React.FC<CashierTransactionListProps> = memo(({
  paymentMethods,
  selectedMethod,
  filteredOrders,
  onUpdatePayment,
  searchTerm,
  onSearchChange,
}) => {
  const currentMethod = paymentMethods.find(m => m.id === selectedMethod);
  const MethodIcon = currentMethod?.icon || HelpCircle;

  return (
    <Card
      className="p-0 border-slate-200 shadow-md overflow-hidden bg-white h-full flex flex-col"
      noPadding
    >
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded border border-slate-200 flex items-center justify-center">
            <MethodIcon size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              Detalhamento: {currentMethod?.label}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              {filteredOrders.length} movimentação(ões)
            </p>
          </div>
        </div>
        <div className="relative w-full md:w-56">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Filtrar lançamento..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="h-10 w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 text-xs font-bold outline-none focus:border-slate-900 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-1.5 bg-slate-50/30">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {filteredOrders.map((order: any, index: number) => (
              <div
                key={order.id}
                style={{ animationDelay: `${index * 30}ms` }}
                className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-slate-300 transition-all group animate-fade-in-up"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="h-8 w-8 bg-slate-50 rounded flex items-center justify-center shrink-0 border border-slate-100 text-xs font-bold text-slate-400 uppercase group-hover:bg-slate-900 group-hover:text-white transition-all">
                    #{order.dailyOrderNumber || order.id.slice(-3)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      {order.orderType === 'DELIVERY' ? (
                        <Truck size={12} className="text-blue-500" />
                      ) : (
                        <ShoppingBag size={12} className="text-indigo-500" />
                      )}
                      {order.tableNumber
                        ? `MESA ${order.tableNumber}`
                        : order.deliveryOrder?.name || 'BALCÃO'}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      {format(new Date(order.createdAt), 'HH:mm')} •{' '}
                      {order.user?.name?.split(' ')[0] || 'ADMIN'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 leading-none tabular-nums">
                      R$ {order.total.toFixed(2)}
                    </p>
                  </div>

                  <div className="w-[130px]">
                    <select
                      className="w-full h-10 bg-slate-50 border border-slate-200 rounded px-2 text-xs font-bold outline-none focus:border-slate-900"
                      value={selectedMethod}
                      onChange={e => onUpdatePayment(order.id, e.target.value)}
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
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 opacity-20">
            <Filter size={32} strokeWidth={1.5} className="mb-2 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 text-center px-10 leading-tight">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma transação registrada nesta modalidade'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});

CashierTransactionList.displayName = 'CashierTransactionList';
export default CashierTransactionList;
