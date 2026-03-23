import React, { useState } from 'react';
import { Wallet, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { usePosStore } from '../../hooks/usePosStore';

interface CashierOpenModalProps {
  onOpenCashier: (amount: string) => void;
}

export const CashierOpenModal: React.FC<CashierOpenModalProps> = ({ onOpenCashier }) => {
  const { activeModal, setActiveModal } = usePosStore();
  const [cashierAmount, setCashierAmount] = useState('');

  if (activeModal !== 'cashier_open') return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal('none')} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
            <Wallet size={24} />
          </div>
          <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Abertura de Caixa</h3>
        </div>
        <div className="space-y-6 relative z-10">
          <Input 
            label="Fundo de Caixa Inicial (R$)" 
            type="number" 
            placeholder="0,00" 
            value={cashierAmount} 
            onChange={e => setCashierAmount(e.target.value)} 
            className="text-2xl font-black text-emerald-600" 
          />
          <Button 
            fullWidth size="lg" className="h-14 rounded-2xl gap-3" 
            onClick={() => onOpenCashier(cashierAmount)}
          >
            <CheckCircle size={20} /> Abrir Turno
          </Button>
          <Button 
            variant="ghost" fullWidth onClick={() => setActiveModal('none')} 
            className="text-slate-400 uppercase text-[10px] font-black tracking-widest"
          >
            Cancelar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
