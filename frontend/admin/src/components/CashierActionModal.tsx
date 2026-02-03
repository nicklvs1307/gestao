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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2.5 rounded-xl text-white",
                            type === 'INCOME' ? "bg-emerald-500" : "bg-rose-500"
                        )}>
                            {type === 'INCOME' ? <Plus size={20} /> : <ArrowRight size={20} className="rotate-180" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">
                                {type === 'INCOME' ? 'Reforço de Caixa' : 'Retirada (Sangria)'}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Movimentação Avulsa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 rounded-full transition-all"><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Valor em Dinheiro (R$)</label>
                        <div className="relative group">
                            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                autoFocus
                                className="w-full h-14 pl-11 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl text-slate-900 focus:border-slate-900 focus:bg-white outline-none transition-all"
                                placeholder="0,00"
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Motivo / Descrição</label>
                        <textarea 
                            required
                            className="w-full rounded-2xl bg-slate-50 border-2 border-slate-100 p-4 font-bold text-sm outline-none focus:border-slate-900 transition-all"
                            placeholder="Ex: Troco inicial, Pagamento fornecedor..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isSaving}
                        className={cn(
                            "w-full h-16 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2",
                            type === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                        )}
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Confirmar Lançamento
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CashierActionModal;
