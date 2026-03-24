import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Plus, Trash2, Edit3, Building2, Search, 
    Loader2, CreditCard, DollarSign, ArrowRightLeft,
    TrendingUp, ShieldCheck, Landmark
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const FinancialBankAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({ balance: 0 });
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financial/bank-accounts');
            setAccounts(res.data);
        } catch (error) {
            toast.error('Erro ao carregar contas bancárias.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, balance: parseFloat(formData.balance) };
            if (formData.id) {
                await api.put(`/financial/bank-accounts/${formData.id}`, payload);
                toast.success('Conta atualizada!');
            } else {
                await api.post('/financial/bank-accounts', payload);
                toast.success('Conta bancária registrada!');
            }
            setShowForm(false);
            setFormData({ balance: 0 });
            loadAccounts();
        } catch (error) {
            toast.error('Erro ao salvar conta.');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Excluir esta conta? Isso removerá o histórico de saldo associado.', onConfirm: async () => {
            try {
                await api.delete(`/financial/bank-accounts/${id}`);
                toast.success('Conta removida.');
                loadAccounts();
            } catch (error) {
                toast.error('Erro ao excluir. Verifique se existem lançamentos vinculados.');
            }
            setConfirmData(prev => ({...prev, open: false}));
        }});
    };

    const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
            {/* SUMÁRIO DE LIQUIDEZ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group col-span-1 md:col-span-2">
                    <Landmark size={120} className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Liquidez Total Consolidada</p>
                        <h2 className="text-4xl font-black italic tracking-tighter">
                            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="mt-4 flex gap-2">
                            <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                                <ShieldCheck size={10} /> Capital Seguro
                            </span>
                            <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                                <ArrowRightLeft size={10} /> {accounts.length} Contas Ativas
                            </span>
                        </div>
                    </div>
                </Card>

                <div className="flex flex-col gap-4 col-span-1 md:col-span-2">
                    <Button 
                        onClick={() => { setShowForm(true); setFormData({ balance: 0 }); }}
                        className="h-full rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:bg-white hover:border-orange-500 hover:text-orange-600 transition-all flex flex-col gap-2 items-center justify-center p-6"
                    >
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                            <Plus size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Nova Instituição</span>
                    </Button>
                </div>
            </div>

            {/* GRID DE CONTAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                        <Loader2 className="animate-spin" size={40} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Mapeando Ativos...</span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <p className="text-slate-400 font-bold italic">Nenhuma conta bancária configurada.</p>
                    </div>
                ) : accounts.map((account) => (
                    <motion.div key={account.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 border-slate-100 group relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors border border-slate-100 group-hover:border-orange-100 shadow-sm">
                                    <Landmark size={28} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => { setFormData(account); setShowForm(true); }}>
                                        <Edit3 size={14} className="text-slate-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-rose-50" onClick={() => handleDelete(account.id)}>
                                        <Trash2 size={14} className="text-rose-400" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter truncate">{account.bankName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                            AG {account.agency} • CC {account.accountNumber}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilidade em Conta</p>
                                    <div className="flex items-end justify-between">
                                        <span className={cn(
                                            "text-2xl font-black italic tracking-tighter leading-none",
                                            account.balance >= 0 ? "text-slate-900" : "text-rose-600"
                                        )}>
                                            R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <TrendingUp size={14} className="text-emerald-500" />
                                            <span className="text-[8px] font-black text-emerald-500 uppercase mt-0.5">Atualizado</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* MODAL CONTA BANCÁRIA */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{formData.id ? 'Editar Conta' : 'Vincular Nova Conta'}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Patrimônio Operacional</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 transition-all hover:rotate-90">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Instituição Bancária</label>
                                    <Input value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} required placeholder="Ex: Itau, Nubank, Caixa..." className="h-12 text-sm font-bold" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Agência</label>
                                        <Input value={formData.agency || ''} onChange={e => setFormData({...formData, agency: e.target.value})} placeholder="0001" className="h-12 text-sm font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta Corrente</label>
                                        <Input value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} placeholder="00000-0" className="h-12 text-sm font-bold" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Saldo de Abertura (R$)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={18} />
                                        <input 
                                            type="number" step="0.01" value={formData.balance} 
                                            onChange={e => setFormData({...formData, balance: e.target.value})} 
                                            className="ui-input w-full pl-10 h-14 text-xl font-black italic tracking-tighter text-slate-900 bg-slate-50 border-2 border-slate-100 focus:border-orange-500 transition-all rounded-2xl" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Cancelar</Button>
                                    <Button type="submit" className="flex-[2] h-14 rounded-2xl shadow-xl shadow-orange-500/20 uppercase text-[10px] font-black tracking-widest italic">Confirmar Registro</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmData.open}
                onClose={() => setConfirmData(prev => ({...prev, open: false}))}
                onConfirm={confirmData.onConfirm}
                title={confirmData.title}
                message={confirmData.message}
                variant="danger"
            />
        </div>
    );
};

export default FinancialBankAccounts;
