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
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Overlay com desfoque */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      {/* Container do Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Botão de Fechar */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg transition-all duration-200" aria-label="Fechar">
            <X size={18} />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
            {/* Ícone Animado */}
            <div className="bg-emerald-50 text-emerald-500 p-6 rounded-2xl mb-6 relative">
                <CheckCircle2 size={56} strokeWidth={2} className="animate-in zoom-in-50 duration-500" />
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-7 h-7 rounded-full flex items-center justify-center border-3 border-white shadow-md animate-bounce">
                    <CheckCircle2 size={14} />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-3">
                Pedido Recebido!
            </h2>
            
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                Já mandamos o seu pedido para o fogo! Agora é só relaxar que o rango já chega na mesa.
            </p>

            {/* Timeline Simplificada */}
            <div className="w-full bg-slate-50 rounded-lg p-4 flex items-center justify-between mb-6 border border-slate-100">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Previsão</span>
                </div>
                <span className="text-sm font-bold text-slate-900">15-25 min</span>
            </div>

            <button 
                onClick={onClose}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg text-sm uppercase tracking-wider shadow-lg hover:bg-slate-800 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
                Entendido! <Utensils size={16} className="text-primary" />
            </button>
        </div>

        {/* Efeito Visual Inferior */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-orange-500 to-emerald-500" />
      </div>
    </div>
  );
};

export default OrderSuccessModal;
