import React from 'react';
import { X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { OperatingHour } from '../types';

interface StoreClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
  operatingHours?: OperatingHour[];
}

const getNextOpening = (operatingHours?: OperatingHour[]): string => {
  if (!operatingHours || operatingHours.length === 0) return '';
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const schedule = operatingHours.find(h => h.dayOfWeek === checkDay);
    if (schedule && !schedule.isClosed) {
      if (i === 0) {
        const [openH, openM] = schedule.openingTime.split(':').map(Number);
        if (currentTime < openH * 60 + openM) {
          return `Hoje às ${schedule.openingTime}`;
        }
      }
      return `${dayLabels[checkDay]} às ${schedule.openingTime}`;
    }
  }
  return '';
};

const StoreClosedModal: React.FC<StoreClosedModalProps> = ({ isOpen, onClose, restaurantName, operatingHours }) => {
  const nextOpening = getNextOpening(operatingHours);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center"
          >
            <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg hover:bg-slate-100" aria-label="Fechar">
                    <X size={18} className="text-slate-400" />
                </Button>
            </div>

            <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-5 border border-rose-100 shadow-lg shadow-rose-500/10">
                <Clock size={32} className="text-rose-500 animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-2 leading-none">
                Estamos Fechados
            </h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-2">
                Desculpe, o {restaurantName || 'restaurante'} não está aceitando novos pedidos no momento.
            </p>
            {nextOpening ? (
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-5">
                Abriremos {nextOpening}
              </p>
            ) : (
              <span className="text-slate-400 text-xs mt-2 block mb-5">Você ainda pode navegar pelo nosso cardápio e conhecer nossas delícias!</span>
            )}

            <div className="space-y-3">
                <Button 
                    fullWidth 
                    className="h-12 rounded-lg bg-slate-900 text-xs font-bold uppercase tracking-wider"
                    onClick={onClose}
                >
                    Continuar Navegando
                </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StoreClosedModal;
