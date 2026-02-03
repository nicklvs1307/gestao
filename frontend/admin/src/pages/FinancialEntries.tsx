import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Wallet, Plus, Search, Filter, ArrowUpCircle, 
    ArrowDownCircle, Trash2, Calendar, Tag, User,
    X, CheckCircle2, DollarSign, Calculator, Receipt, ArrowRightLeft, Repeat
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const FinancialEntries: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showTransferForm, setShowTransferForm] = useState(false); // Modal de Transferência
    
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
            if (formData.id) {
                await api.put(`/financial/transactions/${formData.id}`, formData);
                toast.success('Lançamento atualizado!');
            } else {
                await api.post('/financial/transactions', formData);
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
        if (!confirm('Deseja excluir este lançamento?')) return;
        try {
            await api.delete(`/financial/transactions/${id}`);
            toast.success('Lançamento removido');
            loadData();
        } catch (error) {
            toast.error('Erro ao excluir');
        }
    };

    return (
        <div className="p-4 space-y-6 animate-in fade-in duration-500 bg-background text-foreground min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
                        <Receipt size={24} className="text-primary" /> Lançamentos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">Controle de entradas e saídas.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleSyncRecurring}
                        className="ui-button-secondary h-10 px-4 text-[10px] uppercase tracking-widest"
                        title="Sincronizar contas fixas"
                    >
                        <Repeat size={16} /> Sincronizar
                    </button>
                    <button 
                        onClick={() => setShowTransferForm(true)}
                        className="bg-blue-600 text-white px-4 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                    >
                        <ArrowRightLeft size={16} /> Transferir
                    </button>
                    <button 
                        onClick={() => { setShowForm(true); setFormData({ type: 'EXPENSE', status: 'PAID', dueDate: new Date().toISOString().split('T')[0], isRecurring: false, recurrenceFrequency: 'MONTHLY' }); }}
                        className="ui-button-primary h-10 px-4 text-[10px] uppercase tracking-widest"
                    >
                        <Plus size={16} /> Novo Lançamento
                    </button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                    <ArrowUpCircle size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80 leading-none">Receitas</h3>
                    <p className="text-2xl font-black italic tracking-tighter leading-none">R$ {summary.totalIncome.toFixed(2)}</p>
                </div>
                <div className="bg-red-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                    <ArrowDownCircle size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80 leading-none">Despesas</h3>
                    <p className="text-2xl font-black italic tracking-tighter leading-none">R$ {summary.totalExpense.toFixed(2)}</p>
                </div>
                <div className="ui-card p-5 relative overflow-hidden group">
                    <Calculator size={80} className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 text-foreground" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400 leading-none">Saldo</h3>
                    <p className={cn("text-2xl font-black italic tracking-tighter leading-none", (summary.totalIncome - summary.totalExpense) >= 0 ? "text-foreground" : "text-red-600")}>
                        R$ {(summary.totalIncome - summary.totalExpense).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div className="ui-card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-black text-foreground uppercase italic tracking-widest text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Movimentações
                    </h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="ui-input w-full pl-10 h-9 text-xs"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/5">
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Pagamento</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-8 bg-muted rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "p-1.5 rounded-lg text-white shadow-sm",
                                                t.type === 'INCOME' ? "bg-emerald-500" : "bg-red-500"
                                            )}>
                                                {t.type === 'INCOME' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs">{new Date(t.dueDate).toLocaleDateString()}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Vencimento</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold uppercase text-[11px] italic truncate max-w-[200px]">{t.description}</p>
                                            {t.isRecurring && <Repeat size={10} className="text-blue-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] font-black bg-muted text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                {t.category?.name || 'Geral'}
                                            </span>
                                            {t.supplier && (
                                                <span className="text-[8px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                                    <User size={8} /> {t.supplier.name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold uppercase italic text-slate-400">
                                        {t.paymentMethod || '-'}
                                    </td>
                                    <td className={cn("px-6 py-4 text-right font-black text-xs italic", t.type === 'INCOME' ? "text-emerald-600" : "text-red-600")}>
                                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => { setFormData(t); setShowForm(true); }}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            >
                                                <Filter size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Lançamento */}
            {showForm && (
                <div className="ui-modal-overlay">
                    <form onSubmit={handleSubmit} className="ui-modal-content w-full max-w-xl flex flex-col">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                                    <Plus size={20} className="text-primary" /> {formData.id ? 'Editar' : 'Novo'} Lançamento
                                </h3>
                            </div>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full text-slate-400 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                                <button 
                                    type="button" 
                                    onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                                    className={cn("flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all", formData.type === 'EXPENSE' ? "bg-red-500 text-white shadow-md" : "text-slate-400")}
                                >Despesa</button>
                                <button 
                                    type="button" 
                                    onClick={() => setFormData({...formData, type: 'INCOME'})}
                                    className={cn("flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all", formData.type === 'INCOME' ? "bg-emerald-500 text-white shadow-md" : "text-slate-400")}
                                >Receita</button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                                <input 
                                    type="text" 
                                    className="ui-input w-full"
                                    placeholder="Ex: Pagamento Aluguel"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor R$</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input 
                                            type="number" step="0.01"
                                            className="ui-input w-full pl-8"
                                            value={formData.amount || ''}
                                            onChange={e => setFormData({...formData, amount: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento</label>
                                    <input 
                                        type="date" 
                                        className="ui-input w-full"
                                        value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                                        onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                                    <select 
                                        className="ui-input w-full cursor-pointer"
                                        value={formData.categoryId || ''}
                                        onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.filter(c => c.type === formData.type).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta de Destino</label>
                                    <select 
                                        className="ui-input w-full cursor-pointer"
                                        value={formData.bankAccountId || ''}
                                        onChange={e => setFormData({...formData, bankAccountId: e.target.value})}
                                        required={formData.status === 'PAID'}
                                    >
                                        <option value="">Selecione...</option>
                                        {bankAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toFixed(2)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest flex items-center gap-2">
                                        <Repeat size={14} /> Recorrência
                                    </label>
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 accent-blue-600"
                                        checked={formData.isRecurring}
                                        onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                                    />
                                </div>
                                
                                {formData.isRecurring && (
                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                        <select 
                                            className="ui-input w-full h-9 text-xs"
                                            value={formData.recurrenceFrequency}
                                            onChange={e => setFormData({...formData, recurrenceFrequency: e.target.value})}
                                        >
                                            <option value="WEEKLY">Semanal</option>
                                            <option value="MONTHLY">Mensal</option>
                                            <option value="YEARLY">Anual</option>
                                        </select>
                                        <input 
                                            type="date"
                                            className="ui-input w-full h-9 text-xs"
                                            value={formData.recurrenceEndDate ? formData.recurrenceEndDate.split('T')[0] : ''}
                                            onChange={e => setFormData({...formData, recurrenceEndDate: e.target.value})}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl">
                                <span className="text-[10px] font-bold uppercase tracking-widest italic text-slate-400">Já foi pago/recebido?</span>
                                <input 
                                    type="checkbox"
                                    className="w-5 h-5 accent-primary"
                                    checked={formData.status === 'PAID'}
                                    onChange={e => setFormData({...formData, status: e.target.checked ? 'PAID' : 'PENDING'})}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-border flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="ui-button-secondary flex-1">Cancelar</button>
                            <button type="submit" className="ui-button-primary flex-[2] italic uppercase text-xs tracking-widest">
                                <CheckCircle2 size={18} /> Confirmar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Transferência */}
            {showTransferForm && (
                <div className="ui-modal-overlay">
                    <form onSubmit={handleTransferSubmit} className="ui-modal-content w-full max-w-sm">
                         <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                                <ArrowRightLeft size={20} className="text-blue-600" /> Transferência
                            </h3>
                            <button type="button" onClick={() => setShowTransferForm(false)} className="p-2 hover:bg-muted rounded-full text-slate-400"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Origem</label>
                                <select 
                                    className="ui-input w-full h-10 text-xs"
                                    value={transferData.fromAccountId || ''}
                                    onChange={e => setTransferData({...transferData, fromAccountId: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Destino</label>
                                <select 
                                    className="ui-input w-full h-10 text-xs"
                                    value={transferData.toAccountId || ''}
                                    onChange={e => setTransferData({...transferData, toAccountId: e.target.value})}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor R$</label>
                                <input 
                                    type="number" step="0.01"
                                    className="ui-input w-full h-12 text-lg font-black text-blue-600"
                                    value={transferData.amount || ''}
                                    onChange={e => setTransferData({...transferData, amount: e.target.value})}
                                    required
                                />
                            </div>
                            <button type="submit" className="ui-button-primary w-full bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-xs tracking-widest uppercase">
                                Confirmar Transferência
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FinancialEntries;
