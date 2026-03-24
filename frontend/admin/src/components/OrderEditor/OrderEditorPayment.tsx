import React from 'react';
import { Clock, MapPin, Truck, Bike, Phone, ShoppingBag, Plus, Trash2, Tag, FileText, Info, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import type { Order, PaymentMethod } from '../../types';

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
  onDeliveryFeeChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
  onSurchargeChange: (value: number) => void;
  onAssignDriver: (driverId: string) => void;
  onUpdateDeliveryType: (type: 'delivery' | 'pickup') => void;
  onAddPayment: () => void;
  onRemovePayment: (paymentId: string) => void;
  onSetIsAddingPayment: (value: boolean) => void;
  onNewPaymentChange: (payment: { methodId: string; amount: number }) => void;
  onInternalObsChange: (obs: string) => void;
}

export const OrderEditorPayment: React.FC<OrderEditorPaymentProps> = ({
  order, subtotal, totalGeral, remainingToPay,
  deliveryFee, discount, surcharge,
  isDelivery, drivers, selectedDriverId,
  paymentMethods, isAddingPayment, newPayment, internalObs,
  onDeliveryFeeChange, onDiscountChange, onSurchargeChange,
  onAssignDriver, onUpdateDeliveryType,
  onAddPayment, onRemovePayment,
  onSetIsAddingPayment, onNewPaymentChange, onInternalObsChange,
}) => {
  return (
    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-100">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-3 space-y-3">
          <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={40} /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase italic mb-4 tracking-widest">Resumo Financeiro</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-slate-400 uppercase italic">Subtotal</span>
                <span className="text-[11px] font-black text-slate-900 italic">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-500 uppercase italic flex-1">Entrega</span>
                <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                  <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" value={deliveryFee} onChange={e => onDeliveryFeeChange(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-500 uppercase italic flex-1">Acréscimo</span>
                <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                  <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" value={surcharge} onChange={e => onSurchargeChange(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-rose-50/30 p-2 rounded-xl border border-rose-100/50">
                <span className="text-[9px] font-black text-rose-600 uppercase italic flex-1">Desconto</span>
                <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                  <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-rose-600 focus:ring-0" value={discount} onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase italic leading-none">Total Geral</span>
                  <span className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">R$ {totalGeral.toFixed(2)}</span>
                </div>
                {remainingToPay > 0 && (
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black text-rose-500 uppercase italic leading-none">A Pagar</span>
                    <span className="text-sm font-black text-rose-600 italic tracking-tighter leading-none">R$ {remainingToPay.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform"><Clock size={40} /></div>
            <h3 className="text-[9px] font-black text-slate-500 uppercase italic mb-3 tracking-widest">Registro de Pagamentos</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar-white pr-1">
              {order.payments?.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg group/pay border border-slate-700/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase italic leading-none">{pay.method}</span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">{format(new Date(pay.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black italic">R$ {pay.amount.toFixed(2)}</span>
                    <button onClick={() => onRemovePayment(pay.id)} className="p-1 hover:bg-rose-500 rounded transition-colors text-slate-500 hover:text-white">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
              {!order.payments?.length && (
                <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-xl text-[9px] font-black text-slate-600 uppercase italic">Nenhum pagamento registrado</div>
              )}
            </div>
            <button
              onClick={() => {
                onSetIsAddingPayment(true);
                onNewPaymentChange({ methodId: '', amount: remainingToPay > 0 ? remainingToPay : 0 });
              }}
              className="w-full mt-4 h-9 border border-blue-500/50 rounded-xl flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-black uppercase italic"
            >
              <Plus size={14} /> Registrar Pagamento
            </button>
          </Card>
        </div>

        <div className="col-span-5 space-y-3">
          <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-900 uppercase italic flex items-center gap-2 tracking-widest">
                <Truck size={16} className="text-blue-500" /> Logística de Entrega
              </h3>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => onUpdateDeliveryType('delivery')} className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase italic transition-all", isDelivery ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}>Delivery</button>
                <button onClick={() => onUpdateDeliveryType('pickup')} className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase italic transition-all", !isDelivery ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}>Balcão</button>
              </div>
            </div>

            {isDelivery ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">Vincular Entregador</label>
                    {selectedDriverId && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md font-black italic">VINCULADO</span>}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-9 relative">
                      <Bike size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        className="w-full h-11 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none italic uppercase"
                        value={selectedDriverId}
                        onChange={e => onAssignDriver(e.target.value)}
                      >
                        <option value="">SELECIONE O MOTOBOY...</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <button className="col-span-3 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-md">
                      <Phone size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase italic">Destinatário</span>
                    <p className="text-[10px] font-black text-slate-900 uppercase italic truncate">{order.deliveryOrder?.name || 'Não informado'}</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase italic">Telefone</span>
                    <p className="text-[10px] font-black text-slate-900 italic">{order.deliveryOrder?.phone || 'Não informado'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase italic">Pagamento</span>
                    <p className="text-[10px] font-black text-emerald-600 uppercase italic truncate">{order.deliveryOrder?.paymentMethod || 'Não informado'}</p>
                  </div>
                  {order.deliveryOrder?.changeFor && order.deliveryOrder.changeFor > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                      <span className="text-[8px] font-black text-amber-600 uppercase italic">Troco Para</span>
                      <p className="text-[10px] font-black text-amber-700 italic">R$ {order.deliveryOrder.changeFor.toFixed(2).replace('.', ',')}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 opacity-50">
                      <span className="text-[8px] font-black text-slate-400 uppercase italic">Troco</span>
                      <p className="text-[10px] font-black text-slate-400 italic">Sem Troco</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl space-y-2">
                  <span className="text-[8px] font-black text-blue-400 uppercase italic tracking-widest flex items-center gap-1"><MapPin size={10} /> Endereço de Entrega</span>
                  <p className="text-[11px] font-black text-slate-700 italic leading-snug">{order.deliveryOrder?.address || 'Retirada no Balcão'}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900 uppercase italic">Pedido para Retirada</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic mt-1">Nenhuma logística de entrega necessária</p>
                </div>
                <button onClick={() => onUpdateDeliveryType('delivery')} className="px-6 h-10 border border-orange-200 rounded-xl text-[9px] font-black text-orange-600 hover:bg-orange-50 transition-all uppercase italic">Mudar para Entrega</button>
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-4 space-y-3">
          {isAddingPayment && (
            <Card className="p-4 rounded-2xl border-blue-500 shadow-xl bg-white animate-in zoom-in-95 duration-200 ring-2 ring-blue-500/20">
              <h3 className="text-[10px] font-black text-blue-600 uppercase italic mb-4 tracking-widest flex items-center gap-2"><Plus size={14} /> Novo Recebimento</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase italic px-1">Método</label>
                  <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-900 outline-none" value={newPayment.methodId} onChange={e => onNewPaymentChange({ ...newPayment, methodId: e.target.value })}>
                    <option value="">FORMA...</option>
                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase italic px-1">Valor (R$)</label>
                  <input type="number" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-slate-900 outline-none" value={newPayment.amount || ''} onChange={e => onNewPaymentChange({ ...newPayment, amount: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={onAddPayment} className="flex-1 h-10 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg shadow-md hover:bg-blue-700 transition-all">Confirmar</button>
                <button onClick={() => onSetIsAddingPayment(false)} className="px-4 h-10 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-lg">Cancelar</button>
              </div>
            </Card>
          )}

          <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white">
            <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2 tracking-widest"><Tag size={14} className="text-orange-500" /> Notas Internas</h3>
            <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black text-slate-700 italic placeholder:text-slate-300 focus:ring-1 focus:ring-orange-500/20 h-32 resize-none" placeholder="Registrar nota técnica ou observação de cozinha..." value={internalObs} onChange={e => onInternalObsChange(e.target.value)} />
            <div className="mt-2 text-[7px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1"><Info size={8} /> Visível apenas para a equipe administrativa</div>
          </Card>

          <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white">
            <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2 tracking-widest"><FileText size={14} className="text-blue-500" /> Observações do Cliente</h3>
            <div className="p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl text-[10px] font-bold text-slate-600 italic h-24 overflow-y-auto custom-scrollbar leading-snug">
              {order.deliveryOrder?.observations || 'Nenhuma observação informada pelo cliente para esta entrega.'}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
