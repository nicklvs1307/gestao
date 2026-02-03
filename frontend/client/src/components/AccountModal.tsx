import React, { useState } from 'react';
import type { Order, OrderItem } from '../types';
import { getIntegrationSettings, requestCloseOrder, sendTableRequest } from '../services/api';
import { X, ReceiptText, UserCheck, CreditCard, ChevronRight, Clock, CheckCircle2, History, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRestaurant } from '../context/RestaurantContext';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onRequestClose: () => void;
  showInfoModal: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, order, onRequestClose, showInfoModal }) => {
  const [isClosing, setIsClosing] = useState(false);
  const { restaurantSettings } = useRestaurant();

  const subtotal = order?.total || 0;
  const serviceTaxPercentage = restaurantSettings?.serviceTaxPercentage || 0;
  const serviceFee = subtotal * (serviceTaxPercentage / 100);
  const total = subtotal + serviceFee;

  const handleCallWaiter = async () => {
    if (!order) return;
    try {
        await sendTableRequest(order.restaurantId, String(order.tableNumber), 'WAITER');
        showInfoModal('Garçom Chamado', 'O garçom foi notificado e logo virá à sua mesa.', 'success');
    } catch (e) {
        showInfoModal('Erro', 'Falha ao chamar garçom. Tente novamente.', 'error');
    }
  };

  const handleFinishAccount = async () => {
    if (!order) return;
    setIsClosing(true);
    try {
      // 1. Envia sinal de chamado de CONTA para o Admin
      await sendTableRequest(order.restaurantId, String(order.tableNumber), 'BILL');

      const settings = await getIntegrationSettings(order.restaurantId);
      if (settings.saiposIntegrationActive) {
        if (!order.saiposOrderId) {
            showInfoModal('Atenção', 'Sincronizando com o caixa...', 'info');
        }
        await requestCloseOrder(order.id);
        showInfoModal('Conta Finalizada', 'Solicitação enviada. Por favor, pague no caixa.', 'success');
        onRequestClose();
      } else {
        showInfoModal('Conta Solicitada', 'O garçom trará a sua conta em instantes.', 'success');
        onRequestClose();
      }
    } catch (error: any) {
      showInfoModal('Erro', 'Não foi possível fechar a conta automaticamente. Chame o garçom.', 'error');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className={cn("fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} />
      
      {/* Painel Lateral */}
      <div className={cn(
          "fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-500 ease-in-out transform flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="bg-white px-6 py-6 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 text-white p-2.5 rounded-xl">
                    <ReceiptText size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">Extrato da Mesa</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Mesa {order?.tableNumber || '?'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all">
                <X size={24} />
            </button>
        </div>

        {/* Itens do Pedido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!order || order.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
                    <History size={64} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-xs">Nenhum item consumido ainda</p>
                </div>
            ) : (
                <>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-2">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Itens Servidos
                    </h3>
                    <div className="space-y-3">
                        {order.items.map((item: OrderItem) => {
                            const selectedSize = item.sizeJson ? JSON.parse(item.sizeJson) : null;
                            const selectedAddons = item.addonsJson ? JSON.parse(item.addonsJson) : [];
                            
                            return (
                                <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100 shadow-inner">
                                        <img src={item.product.imageUrl} className="w-full h-full object-cover" alt={item.product.name} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="text-sm font-black text-slate-900 leading-tight truncate italic uppercase">
                                                {item.quantity}x {item.product.name}
                                            </h4>
                                            <span className="text-xs font-black text-slate-900 shrink-0">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {selectedSize && (
                                                <span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-orange-100">
                                                    {selectedSize.name}
                                                </span>
                                            )}
                                            {selectedAddons.map((addon: any) => (
                                                <span key={addon.id} className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border border-slate-200">
                                                    + {addon.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>

        {/* Resumo e Ações */}
        <div className="bg-white border-t border-slate-200 p-6 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0">
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {serviceTaxPercentage > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-tighter">
                        <span>Taxa de Serviço ({serviceTaxPercentage}%)</span>
                        <span>R$ {serviceFee.toFixed(2).replace('.', ',')}</span>
                    </div>
                )}
                <div className="bg-slate-900 text-white p-5 rounded-3xl flex justify-between items-center shadow-xl shadow-slate-200 mt-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total Geral</span>
                    <span className="text-2xl font-black italic text-emerald-400 tracking-tighter">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button 
                    onClick={handleCallWaiter}
                    className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-[1.5rem] text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                >
                    <UserCheck size={16} /> Chamar Garçom
                </button>
                <button 
                    onClick={handleFinishAccount}
                    disabled={isClosing || !order || order.items.length === 0}
                    className="w-full bg-primary text-white font-black py-5 rounded-[2rem] text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                    {isClosing ? 'Solicitando...' : 'Encerrar e Pagar'} <CreditCard size={18} />
                </button>
            </div>
        </div>

      </div>
    </>
  );
};

export default AccountModal;