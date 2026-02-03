import React from 'react';
import { CheckCircle2, Clock, Utensils, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay com desfoque */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Container do Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Botão de Fechar */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all">
            <X size={20} />
        </button>

        <div className="p-10 text-center flex flex-col items-center">
            {/* Ícone Animado */}
            <div className="bg-emerald-50 text-emerald-500 p-8 rounded-[2.5rem] mb-8 relative">
                <CheckCircle2 size={64} strokeWidth={2.5} className="animate-in zoom-in-50 duration-500" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
                    <CheckCircle2 size={16} />
                </div>
            </div>

            <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-4">
                Pedido Recebido!
            </h2>
            
            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
                Já mandamos o seu pedido para o fogo! Agora é só relaxar que o rango já chega na mesa. 🍔🔥
            </p>

            {/* Timeline Simplificada */}
            <div className="w-full bg-slate-50 rounded-2xl p-4 flex items-center justify-between mb-8 border border-slate-100">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Previsão</span>
                </div>
                <span className="text-sm font-black text-slate-900 italic">15-25 min</span>
            </div>

            <button 
                onClick={onClose}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                Entendido! <Utensils size={16} className="text-primary" />
            </button>
        </div>

        {/* Efeito Visual Inferior */}
        <div className="h-2 bg-gradient-to-r from-primary via-orange-500 to-emerald-500" />
      </div>
    </div>
  );
};

export default OrderSuccessModal;
