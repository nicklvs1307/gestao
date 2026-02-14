import React, { useState } from 'react';
import { X, ArrowRight, Plus, Banknote, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../services/api/client';
import { toast } from 'sonner';

interface CashierActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'INCOME' | 'EXPENSE';
    onSuccess: () => void;
}

const CashierActionModal: React.FC<CashierActionModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return toast.error("Informe um valor válido.");
        
        setIsSaving(true);
        try {
            await apiClient.post('/cashier/transaction', {
                amount: parseFloat(amount),
                description,
                type
            });
            toast.success(type === 'INCOME' ? "Reforço registrado!" : "Sangria registrada!");
            onSuccess();
            onClose();
            setAmount('');
            setDescription('');
        } catch (error) {
            toast.error("Erro ao registrar movimentação.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="ui-modal-overlay">
            <div className="ui-modal-content w-full max-w-md">
                <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2.5 rounded-xl text-white shadow-lg",
                            type === 'INCOME' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-rose-600 shadow-rose-500/20"
                        )}>
                            {type === 'INCOME' ? <Plus size={20} /> : <ArrowRight size={20} className="rotate-180" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                                {type === 'INCOME' ? 'Reforço de Caixa' : 'Retirada (Sangria)'}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Lançamento Avulso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 rounded-full transition-all"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Lançamento (R$)</label>
                        <div className="relative group">
                            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={24} />
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                autoFocus
                                className="w-full h-16 pl-14 pr-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-4xl text-slate-900 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-200"
                                placeholder="0,00"
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Motivo</label>
                        <textarea 
                            required
                            className="ui-input w-full h-24 py-3 resize-none text-base"
                            placeholder="Ex: Troco inicial, Pagamento de frete..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isSaving}
                        className={cn(
                            "w-full h-14 text-white rounded-2xl font-black uppercase text-base tracking-widest shadow-xl transition-all flex items-center justify-center gap-2",
                            type === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                        )}
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                        Confirmar Lançamento
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CashierActionModal;
