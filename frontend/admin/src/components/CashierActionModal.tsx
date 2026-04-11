import React, { useState } from 'react';
import { X, ArrowRight, Plus, Banknote, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import apiClient from '../services/api/client';
import { toast } from 'sonner';
import { Button } from './ui/Button';

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
        <div className="ui-modal-overlay z-[var(--z-modal)]">
            <div className="ui-modal-content w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg text-white shadow-sm",
                            type === 'INCOME' ? "bg-emerald-600" : "bg-rose-600"
                        )}>
                            {type === 'INCOME' ? <Plus size={18} /> : <ArrowRight size={18} className="rotate-180" />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight leading-none">
                                {type === 'INCOME' ? 'Reforço de Caixa' : 'Sangria de Caixa'}
                            </h3>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Lançamento Avulso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-full transition-all outline-none"><X size={20} /></button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Valor da Operação (R$)</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">R$</div>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                autoFocus
                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xl text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-200"
                                placeholder="0,00"
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição / Motivo</label>
                        <textarea 
                            required
                            className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 resize-none"
                            placeholder="Ex: Troco inicial, Pagamento de frete..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="pt-2">
                        <Button 
                            type="submit"
                            fullWidth
                            disabled={isSaving}
                            className={cn(
                                "h-11 rounded-lg font-bold uppercase tracking-widest text-xs shadow-lg transition-all",
                                type === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20" : "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20"
                            )}
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle size={16} className="mr-2" />}
                            CONFIRMAR LANÇAMENTO
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CashierActionModal;