import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../services/api';
import { 
    Wallet, Plus, Search, Filter, ArrowUpCircle, 
    ArrowDownCircle, Trash2, Calendar, Tag, User,
    X, CheckCircle, DollarSign, Calculator, Receipt, 
    ArrowRightLeft, Repeat, Loader2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const FinancialEntries: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showTransferForm, setShowTransferForm] = useState(false);
    
    const [formData, setFormData] = useState<any>({
        type: 'EXPENSE',
        status: 'PAID',
        dueDate: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        isRecurring: false,
        recurrenceFrequency: 'MONTHLY'
    });

    const [transferData, setTransferData] = useState<any>({
        date: new Date().toISOString().split('T')[0]
    });

    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    const loadData = async () => {
        setLoading(true);
        try {
            const [transRes, catRes, supRes] = await Promise.all([
                api.get('/financial/transactions'),
                api.get('/financial/categories'),
                api.get('/financial/suppliers')
            ]);
            setTransactions(transRes.data.transactions);
            setSummary(transRes.data.summary);
            setCategories(catRes.data);
            setSuppliers(supRes.data);
            
            try {
                const bankRes = await api.get('/financial/bank-accounts');
                setBankAccounts(bankRes.data);
            } catch (e) { console.warn("Módulo de contas bancárias ainda não disponível"); }

        } catch (error) {
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSyncRecurring = async () => {
        try {
            const res = await api.post('/financial/transactions/sync-recurring');
            if (res.data.generatedCount > 0) {
                toast.success(`${res.data.generatedCount} lançamentos recorrentes gerados!`);
                loadData();
            } else {
                toast.info('Nenhuma recorrência pendente para hoje.');
            }
        } catch (e) {
            toast.error('Erro ao sincronizar recorrências.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, amount: parseFloat(formData.amount) };
            if (formData.id) {
                await api.put(`/financial/transactions/${formData.id}`, payload);
                toast.success('Lançamento atualizado!');
            } else {
                await api.post('/financial/transactions', payload);
                toast.success('Lançamento realizado!');
            }
            setShowForm(false);
            setFormData({ type: 'EXPENSE', status: 'PAID', dueDate: new Date().toISOString().split('T')[0], isRecurring: false, recurrenceFrequency: 'MONTHLY' });
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar lançamento');
        }
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (transferData.fromAccountId === transferData.toAccountId) {
            return toast.error("A conta de origem e destino devem ser diferentes.");
        }
        try {
            await api.post('/financial/transactions/transfer', transferData);
            toast.success('Transferência realizada com sucesso!');
            setShowTransferForm(false);
            setTransferData({ date: new Date().toISOString().split('T')[0] });
            loadData();
        } catch (error) {
            toast.error('Erro ao realizar transferência.');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Deseja excluir este lançamento?', onConfirm: async () => {
            try {
                await api.delete(`/financial/transactions/${id}`);
                toast.success('Lançamento removido');
                loadData();
            } catch (error) {
                toast.error('Erro ao excluir');
            }
        }});
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ACTIONS BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3 bg-muted p-1 rounded-2xl border border-border shadow-inner">
                    <button 
                        onClick={handleSyncRecurring}
                        className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white transition-all flex items-center gap-2"
                        title="Sincronizar contas fixas"
                    >
                        <Repeat size={12} /> Sincronizar
                    </button>
                    <button 
                        onClick={() => setShowTransferForm(true)}
                        className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-blue-600 hover:bg-white transition-all flex items-center gap-2"
                    >
                        <ArrowRightLeft size={12} /> Transferir
                    </button>
                </div>
                
                <Button 
                    onClick={() => { setShowForm(true); setFormData({ type: 'EXPENSE', status: 'PAID', dueDate: new Date().toISOString().split('T')[0], isRecurring: false, recurrenceFrequency: 'MONTHLY' }); }}
                    className="h-12 px-8 rounded-2xl shadow-xl shadow-primary/10 font-black italic tracking-tighter uppercase text-[10px]"
                >
                    <Plus size={16} className="mr-2" /> Novo Lançamento
                </Button>
            </div>

            {/* LISTAGEM DE MOVIMENTAÇÕES */}
            <Card className="overflow-hidden border-border/60 shadow-xl shadow-slate-200/40">
                <div className="p-5 border-b border-border bg-background/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-primary rounded-full" />
                        <h3 className="font-black text-foreground uppercase italic tracking-tighter text-sm">Livro de Movimentações Financeiras</h3>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar lançamento..." 
                            className="ui-input w-full pl-11 h-10 text-[11px] font-bold uppercase tracking-widest"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b border-border bg-background/20">
                                <th className="px-8 py-4">Data / Vencimento</th>
                                <th className="px-8 py-4">Descrição do Lançamento</th>
                                <th className="px-8 py-4">Método / Origem</th>
                                <th className="px-8 py-4 text-right">Valor Líquido</th>
                                <th className="px-8 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                            ) : transactions.map((t) => (
                                <tr key={t.id} className="group hover:bg-background/80 transition-all duration-300">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm border",
                                                t.type === 'INCOME' ? "bg-emerald-500 border-emerald-400" : "bg-rose-500 border-rose-400"
                                            )}>
                                                {t.type === 'INCOME' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-[11px] text-foreground uppercase italic tracking-tighter">
                                                    {new Date(t.dueDate).toLocaleDateString()}
                                                </span>
                                                <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">
                                                    {t.status === 'PAID' ? 'Liquidado' : 'Provisionado'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs text-foreground uppercase italic tracking-tighter truncate max-w-[250px]">
                                                {t.description}
                                            </span>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[7px] font-black bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-widest border border-border">
                                                    {t.category?.name || 'Geral'}
                                                </span>
                                                {t.isRecurring && (
                                                    <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                                        <Repeat size={8} /> Recorrente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center text-slate-300">
                                                <Receipt size={14} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">{t.paymentMethod || 'Carteira'}</span>
                                        </div>
                                    </td>
                                    <td className={cn(
                                        "px-8 py-5 text-right font-black text-sm italic tracking-tighter",
                                        t.type === 'INCOME' ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setFormData(t); setShowForm(true); }}
                                                className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-orange-50 transition-all flex items-center justify-center"
                                            >
                                                <Filter size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t.id)}
                                                className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* MODAL LANÇAMENTO ERP STYLE */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
                        >
                            <header className="px-8 py-6 bg-background border-b border-border flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-xl font-black text-foreground italic uppercase tracking-tighter leading-none">{formData.id ? 'Editar Registro' : 'Novo Lançamento'}</h3>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Livro Diário de Fluxo de Caixa</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm border border-border">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* TIPO SELECTOR */}
                                <div className="flex gap-1 p-1.5 bg-muted rounded-2xl border border-border">
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                                        className={cn("flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all", formData.type === 'EXPENSE' ? "bg-rose-500 text-white shadow-lg" : "text-muted-foreground")}
                                    >Saída (Despesa)</button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, type: 'INCOME'})}
                                        className={cn("flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all", formData.type === 'INCOME' ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground")}
                                    >Entrada (Receita)</button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Descrição do Lançamento</label>
                                    <input 
                                        type="text" 
                                        className="ui-input w-full h-12 text-sm font-bold"
                                        placeholder="Ex: Pagamento Fornecedor Carne..."
                                        value={formData.description || ''}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Valor Nominal (R$)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                                            <input 
                                                type="number" step="0.01"
                                                className="ui-input w-full h-12 pl-10 text-sm font-bold"
                                                value={formData.amount || ''}
                                                onChange={e => setFormData({...formData, amount: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Data de Competência</label>
                                        <input 
                                            type="date" 
                                            className="ui-input w-full h-12 text-sm font-bold"
                                            value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                                            onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Conta Bancária / Destino</label>
                                        <select 
                                            className="ui-input w-full h-12 text-[11px] font-bold uppercase tracking-tight"
                                            value={formData.bankAccountId || ''}
                                            onChange={e => setFormData({...formData, bankAccountId: e.target.value})}
                                            required={formData.status === 'PAID'}
                                        >
                                            <option value="">Selecione...</option>
                                            {bankAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.bankName} (R$ {acc.balance.toFixed(2)})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Categoria Financeira</label>
                                        <select 
                                            className="ui-input w-full h-12 text-[11px] font-bold uppercase tracking-tight"
                                            value={formData.categoryId || ''}
                                            onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                        >
                                            <option value="">Selecione...</option>
                                            {categories.filter(c => c.type === formData.type).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* CONFIGURAÇÕES AVANÇADAS */}
                                <div className="bg-background p-6 rounded-[2rem] border border-border space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white rounded-lg border border-border flex items-center justify-center text-blue-500">
                                                <Repeat size={14} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Lançamento Recorrente</span>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-blue-600"
                                            checked={formData.isRecurring}
                                            onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                                        />
                                    </div>
                                    
                                    {formData.isRecurring && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3 pt-2">
                                            <select 
                                                className="ui-input h-10 text-[10px] font-bold uppercase"
                                                value={formData.recurrenceFrequency}
                                                onChange={e => setFormData({...formData, recurrenceFrequency: e.target.value})}
                                            >
                                                <option value="WEEKLY">Semanal</option>
                                                <option value="MONTHLY">Mensal</option>
                                                <option value="YEARLY">Anual</option>
                                            </select>
                                            <input 
                                                type="date"
                                                className="ui-input h-10 text-[10px] font-bold"
                                                value={formData.recurrenceEndDate ? formData.recurrenceEndDate.split('T')[0] : ''}
                                                onChange={e => setFormData({...formData, recurrenceEndDate: e.target.value})}
                                            />
                                        </motion.div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-border">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-white rounded-lg border border-border flex items-center justify-center text-emerald-500">
                                                <CheckCircle size={14} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Liquidado (Já pago/recebido)</span>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-emerald-600"
                                            checked={formData.status === 'PAID'}
                                            onChange={e => setFormData({...formData, status: e.target.checked ? 'PAID' : 'PENDING'})}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4 shrink-0">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Descartar</Button>
                                    <Button type="submit" className="flex-[2] h-14 rounded-2xl shadow-xl shadow-primary/20 uppercase text-[10px] font-black tracking-widest italic">
                                        Confirmar Lançamento
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL TRANSFERÊNCIA ERP STYLE */}
            <AnimatePresence>
                {showTransferForm && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowTransferForm(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-border">
                             <header className="px-8 py-6 bg-background border-b border-border flex items-center justify-between">
                                <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter flex items-center gap-2">
                                    <ArrowRightLeft size={20} className="text-blue-600" /> Transferência
                                </h3>
                                <button onClick={() => setShowTransferForm(false)} className="p-2 hover:bg-white rounded-full text-muted-foreground transition-all"><X size={20}/></button>
                            </header>
                            <div className="p-8 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Origem dos Fundos</label>
                                    <select className="ui-input w-full h-12 text-[11px] font-bold uppercase" value={transferData.fromAccountId || ''} onChange={e => setTransferData({...transferData, fromAccountId: e.target.value})} required>
                                        <option value="">Selecione...</option>
                                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Destino dos Fundos</label>
                                    <select className="ui-input w-full h-12 text-[11px] font-bold uppercase" value={transferData.toAccountId || ''} onChange={e => setTransferData({...transferData, toAccountId: e.target.value})} required>
                                        <option value="">Selecione...</option>
                                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Valor da Remessa (R$)</label>
                                    <input type="number" step="0.01" className="ui-input w-full h-14 text-2xl font-black italic tracking-tighter text-blue-600 bg-blue-50 border-none rounded-2xl" value={transferData.amount || ''} onChange={e => setTransferData({...transferData, amount: e.target.value})} required />
                                </div>
                                <Button type="submit" onClick={handleTransferSubmit} className="w-full h-14 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-[10px] font-black tracking-[0.2em] uppercase rounded-2xl mt-4">
                                    Confirmar Transferência
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData(prev => ({...prev, open: false}))} onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} title={confirmData.title} message={confirmData.message} />
        </div>
    );
};

export default FinancialEntries;
