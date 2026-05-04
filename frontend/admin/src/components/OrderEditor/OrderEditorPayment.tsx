import React from 'react';
import { Clock, MapPin, Truck, ShoppingBag, Plus, Trash2, Tag, FileText, Info, DollarSign, Bike, CheckCircle, Lock } from 'lucide-react';
import { formatSP } from '@/lib/timezone';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import type { Order, PaymentMethod } from '../../types';
import { resolvePaymentLabel } from '@/utils/paymentUtils';

interface OrderEditorPaymentProps {
  order: Order;
  subtotal: number;
  totalGeral: number;
  remainingToPay: number;
  deliveryFee: number;
  discount: number;
  surcharge: number;
  isDelivery: boolean;
  drivers: { id: string; name: string }[];
  selectedDriverId: string;
  paymentMethods: PaymentMethod[];
  isAddingPayment: boolean;
  newPayment: { methodId: string; amount: number };
  internalObs: string;
  isSaving?: boolean;
  onDeliveryFeeChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
  onSurchargeChange: (value: number) => void;
  onAssignDriver: (driverId: string) => void;
  onAddPayment: () => void;
  onRemovePayment: (paymentId: string) => void;
  onSetIsAddingPayment: (value: boolean) => void;
  onNewPaymentChange: (payment: { methodId: string; amount: number }) => void;
  onInternalObsChange: (obs: string) => void;
}

const isIfoodOnlinePayment = (order: Order): boolean => {
  if (!order.ifoodOrderId) return false;
  if (!order.payments?.length) return false;
  return order.payments.some(p => 
    p.method?.toLowerCase().includes('pago online') || 
    p.method?.toLowerCase().includes('pix') ||
    p.method?.toLowerCase().includes('cartao')
  );
};

export const OrderEditorPayment: React.FC<OrderEditorPaymentProps> = ({
  order, subtotal, totalGeral, remainingToPay,
  deliveryFee, discount, surcharge,
  isDelivery, drivers, selectedDriverId,
  paymentMethods, isAddingPayment, newPayment, internalObs, isSaving,
  onDeliveryFeeChange, onDiscountChange, onSurchargeChange,
  onAssignDriver,
  onAddPayment, onRemovePayment,
  onSetIsAddingPayment, onNewPaymentChange, onInternalObsChange,
}) => {
  return (
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="grid grid-cols-12 gap-4">
        
        {/* COLUNA 1: FINANCEIRO + PAGAMENTOS */}
        <div className="col-span-4 space-y-4">
          
          {/* Resumo Financeiro */}
          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-[0.04]"><DollarSign size={60} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-500 rounded-full" /> Resumo Financeiro
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Subtotal</span>
                <span className="text-sm font-black text-slate-900">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Truck size={12} className="text-orange-500" /> Entrega
                </span>
                <div className="flex items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 mr-1">R$</span>
                  <input 
                    type="number" 
                    className="w-16 bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0 text-right" 
                    value={deliveryFee || ''} 
                    onChange={e => onDeliveryFeeChange(parseFloat(e.target.value) || 0)} 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Acréscimo</span>
                <div className="flex items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 mr-1">R$</span>
                  <input 
                    type="number" 
                    className="w-16 bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0 text-right" 
                    value={surcharge || ''} 
                    onChange={e => onSurchargeChange(parseFloat(e.target.value) || 0)} 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-rose-50/50 rounded-xl border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase">Desconto</span>
                <div className="flex items-center bg-white px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 mr-1">R$</span>
                  <input 
                    type="number" 
                    className="w-16 bg-transparent border-none p-0 text-sm font-black text-rose-600 focus:ring-0 text-right" 
                    value={discount || ''} 
                    onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)} 
                  />
                </div>
              </div>
              
              {/* Total Geral + A Pagar */}
              <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter">R$ {totalGeral.toFixed(2).replace('.', ',')}</div>
                  </div>
                  {remainingToPay > 0.01 && (
                    <div className="text-right px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block">A Pagar</span>
                      <span className="text-lg font-black text-rose-600 tracking-tighter">R$ {remainingToPay.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {remainingToPay <= 0.01 && order.payments && order.payments.length > 0 && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                      order.ifoodOrderId 
                        ? "bg-emerald-50 border border-emerald-200" 
                        : "bg-emerald-50 border border-emerald-200"
                    )}>
                      {order.ifoodOrderId ? <CheckCircle size={14} className="text-emerald-600" /> : <CheckCircle size={14} className="text-emerald-600" />}
                      <span className="text-[9px] font-black text-emerald-600 uppercase">
                        {order.ifoodOrderId ? 'Pago via iFood' : 'Pago'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Registro de Pagamentos */}
          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-[0.04]"><Clock size={60} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full" /> Pagamentos Registrados
            </h3>
            <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
              {order.payments?.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/pay hover:border-orange-200 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-800 uppercase">{resolvePaymentLabel(pay.method, paymentMethods)}</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">{formatSP(pay.createdAt, 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">R$ {pay.amount.toFixed(2).replace('.', ',')}</span>
                    {!order.ifoodOrderId && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`⚠️ Deseja realmente excluir a forma de pagamento "${resolvePaymentLabel(pay.method, paymentMethods)}" de R$ ${pay.amount.toFixed(2).replace('.', ',')}?`)) {
                            onRemovePayment(pay.id);
                          }
                        }} 
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-rose-400 hover:text-rose-600"
                        title="Remover pagamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!order.payments?.length && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase">
                  Nenhum pagamento registrado
                </div>
              )}
            </div>
            {order.ifoodOrderId ? (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-amber-700">
                  <Lock size={14} />
                  <span className="text-[9px] font-bold text-amber-700 uppercase">
                    Pagamento via iFood
                  </span>
                </div>
                <p className="text-[8px] text-amber-600 mt-1">
                  Não é possível adicionar pagamentos manualmente
                </p>
              </div>
            ) : (
              <button
                onClick={() => {
                  onSetIsAddingPayment(true);
                  onNewPaymentChange({ methodId: '', amount: remainingToPay > 0 ? remainingToPay : 0 });
                }}
                disabled={remainingToPay <= 0.01}
                className={cn(
                  "w-full mt-4 h-10 border-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase",
                  remainingToPay <= 0.01
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                )}
              >
                <Plus size={14} /> Registrar Pagamento
              </button>
            )}
          </Card>
        </div>

        {/* COLUNA 2: LOGÍSTICA DE ENTREGA */}
        <div className="col-span-4 space-y-4">
          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white min-h-[400px]">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" /> Logística de Entrega
            </h3>

            {/* Entregador */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vincular Entregador</label>
                {selectedDriverId && (
                  <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">
                    <CheckCircle size={8} /> Vinculado
                  </span>
                )}
              </div>
              <div className="relative">
                <Bike size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="w-full h-11 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none uppercase shadow-sm"
                  value={selectedDriverId}
                  onChange={e => onAssignDriver(e.target.value)}
                >
                  <option value="">SELECIONE O MOTOBOY...</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destinatário</span>
                <p className="text-[10px] font-black text-slate-900 uppercase truncate">{order.deliveryOrder?.name || 'Não informado'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telefone</span>
                <p className="text-[10px] font-black text-slate-900">{order.deliveryOrder?.phone || 'Não informado'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pagamento</span>
                <p className="text-[10px] font-black text-emerald-600 uppercase truncate">{resolvePaymentLabel(order.deliveryOrder?.paymentMethod, paymentMethods) || 'Não informado'}</p>
              </div>
              {order.deliveryOrder?.changeFor && order.deliveryOrder.changeFor > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block mb-1">Troco Para</span>
                  <p className="text-[10px] font-black text-amber-700">R$ {order.deliveryOrder.changeFor.toFixed(2).replace('.', ',')}</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl opacity-60">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Troco</span>
                  <p className="text-[10px] font-black text-slate-400">Sem Troco</p>
                </div>
              )}
            </div>

            {/* Endereço */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={10} /> Endereço de Entrega
              </span>
              <p className="text-[11px] font-bold text-slate-700 leading-snug">
                {order.deliveryOrder?.address || 'Retirada no Balcão'}
                {order.deliveryOrder?.complement && <span className="text-amber-600"> ({order.deliveryOrder.complement})</span>}
                {order.deliveryOrder?.reference && <span className="text-blue-600"> - Ref: {order.deliveryOrder.reference}</span>}
              </p>
            </div>

            {/* Observações do Cliente */}
            <div className="mt-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-orange-500 rounded-full" /> Obs. do Cliente
              </h3>
              <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-[10px] font-bold text-slate-600 h-20 overflow-y-auto custom-scrollbar leading-snug italic">
                {order.deliveryOrder?.notes || 'Nenhuma observação informada pelo cliente.'}
              </div>
            </div>
          </Card>
        </div>

        {/* COLUNA 3: NOVO PAGAMENTO + NOTAS INTERNAS */}
        <div className="col-span-4 space-y-4">
          
          {/* Form de Novo Pagamento */}
          {isAddingPayment && (
            <Card className="p-5 rounded-2xl border-orange-300 shadow-lg bg-white animate-in zoom-in-95 duration-200 ring-2 ring-orange-500/10">
              <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Plus size={14} /> Novo Recebimento
              </h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">Forma de Pagamento</label>
                  <select 
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 uppercase" 
                    value={newPayment.methodId} 
                    onChange={e => onNewPaymentChange({ ...newPayment, methodId: e.target.value })}
                  >
                    <option value="">SELECIONE...</option>
                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" 
                    value={newPayment.amount || ''} 
                    onChange={e => onNewPaymentChange({ ...newPayment, amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0,00" 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onAddPayment} 
                  className="flex-1 h-11 bg-orange-600 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-orange-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} /> Confirmar
                </button>
                <button 
                  onClick={() => onSetIsAddingPayment(false)} 
                  className="px-4 h-11 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </Card>
          )}

          {/* Notas Internas */}
          <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-400 rounded-full" /> Notas Internas
            </h3>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 h-32 resize-none transition-all" 
              placeholder="Registrar nota técnica ou observação interna..." 
              value={internalObs} 
              onChange={e => onInternalObsChange(e.target.value)} 
            />
            <div className="mt-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Info size={10} /> Visível apenas para a equipe administrativa
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
