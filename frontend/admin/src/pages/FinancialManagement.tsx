import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Wallet, User, Disc, Landmark, Plus, Trash2, Receipt, CreditCard, X, CheckCircle, QrCode, ArrowUpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const FinancialManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'transactions' | 'suppliers' | 'categories' | 'bank-accounts'>('transactions');
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        if (location.pathname === '/financial/bank-accounts') {
            setActiveTab('bank-accounts');
        } else if (location.pathname === '/financial/entries') {
            setActiveTab('transactions');
        } else if (location.pathname === '/financial/categories') {
            setActiveTab('categories');
        } else if (location.pathname === '/financial/suppliers') {
            setActiveTab('suppliers');
        } else {
            setActiveTab('transactions');
        }
    }, [location.pathname]);

    const handleTabChange = (tabId: string) => {
        const routes: Record<string, string> = {
            'transactions': '/financial/entries',
            'suppliers': '/financial/suppliers',
            'categories': '/financial/categories',
            'bank-accounts': '/financial/bank-accounts'
        };
        navigate(routes[tabId] || '/financial');
    };

    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(false);

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'transactions') {
                const res = await api.get('/financial/transactions');
                setTransactions(res.data.transactions);
                setSummary(res.data.summary);
                const [supRes, catRes] = await Promise.all([
                    api.get('/financial/suppliers'),
                    api.get('/financial/categories')
                ]);
                setSuppliers(supRes.data);
                setCategories(catRes.data);
            } else if (activeTab === 'suppliers') {
                const res = await api.get('/financial/suppliers');
                setSuppliers(res.data);
            } else if (activeTab === 'categories') {
                const res = await api.get('/financial/categories');
                setCategories(res.data);
            } else if (activeTab === 'bank-accounts') {
                const res = await api.get('/financial/bank-accounts');
                setBankAccounts(res.data);
            }
        } catch (error) {
            console.error("Erro ao carregar dados", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmitInvoice = async (orderId: string) => {
        try {
            setLoading(true);
            await api.post('/fiscal/emit', { orderId });
            toast.success('Solicitação de emissão enviada!');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao emitir nota.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let url = `/financial/${activeTab}`;
            const payload = { ...formData };
            if (activeTab === 'transactions') payload.amount = parseFloat(payload.amount);
            
            if (formData.id) {
                await api.put(`${url}/${formData.id}`, payload);
            } else {
                await api.post(url, payload);
            }
            toast.success('Salvo com sucesso!');
            setShowForm(false);
            setFormData({});
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar.');
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm('Tem certeza?')) return;
        try {
            let url = `/financial/${activeTab}`;
            await api.delete(`${url}/${id}`);
            loadData();
            toast.success('Excluído com sucesso!');
        } catch (error) {
            toast.error('Erro ao excluir.');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center ui-card p-4">
                <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter">Gestão Financeira</h2>
                <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full border border-border">
                    {[
                        { id: 'transactions', label: 'Lançamentos', icon: Wallet },
                        { id: 'suppliers', label: 'Fornecedores', icon: User },
                        { id: 'categories', label: 'Categorias', icon: Disc },
                        { id: 'bank-accounts', label: 'Contas', icon: Landmark }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'transactions' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-1">Receitas</h3>
                        <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tighter italic">R$ {summary.totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                        <h3 className="text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest mb-1">Despesas</h3>
                        <p className="text-2xl font-black text-red-900 dark:text-red-100 tracking-tighter italic">R$ {summary.totalExpense.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <h3 className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest mb-1">Saldo Atual</h3>
                        <p className={cn("text-2xl font-black tracking-tighter italic", (summary.totalIncome - summary.totalExpense) >= 0 ? "text-blue-900 dark:text-blue-100" : "text-red-900 dark:text-red-400")}>
                            R$ {(summary.totalIncome - summary.totalExpense).toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            <div className="ui-card overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="font-black text-foreground uppercase italic tracking-widest text-xs flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {activeTab === 'transactions' ? 'Livro de Transações' : activeTab === 'suppliers' ? 'Lista de Fornecedores' : activeTab === 'categories' ? 'Categorias de Lançamento' : 'Contas Bancárias'}
                    </h3>
                    <button 
                        onClick={() => { setShowForm(true); setFormData({}); }}
                        className="ui-button-primary h-9 px-4 text-[10px] uppercase tracking-widest"
                    >
                        <Plus size={14} /> Novo
                    </button>
                </div>

                <div className="p-0">
                    {activeTab === 'bank-accounts' && (
                        <div className="overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border bg-muted/10">
                                        <th className="px-6 py-4">Banco</th>
                                        <th className="px-6 py-4">Agência/Conta</th>
                                        <th className="px-6 py-4 text-center">Saldo</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {bankAccounts.map((b: any) => (
                                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-foreground uppercase text-xs">{b.bankName}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{b.agency} / {b.accountNumber}</td>
                                            <td className="px-6 py-4 text-center font-black text-foreground text-xs italic">R$ {b.balance.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setShowForm(true); setFormData(b); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><ArrowUpCircle size={16}/></button>
                                                    <button onClick={() => handleDelete(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {['transactions', 'suppliers', 'categories'].includes(activeTab) && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/10">
                                    <tr className="text-left text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-border">
                                        {activeTab === 'transactions' && <>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Descrição</th>
                                            <th className="px-6 py-4">Forma</th>
                                            <th className="px-6 py-4">Categoria</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </>}
                                        {activeTab === 'suppliers' && <>
                                            <th className="px-6 py-4">Nome</th>
                                            <th className="px-6 py-4">CNPJ</th>
                                            <th className="px-6 py-4">Contato</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </>}
                                        {activeTab === 'categories' && <>
                                            <th className="px-6 py-4">Nome</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {activeTab === 'transactions' && transactions.map((t: any) => {
                                        const isMesa = t.description.toLowerCase().includes('mesa');
                                        const isDelivery = t.order?.orderType === 'DELIVERY';
                                        
                                        return (
                                            <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400">{new Date(t.dueDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            {t.type === 'INCOME' && (
                                                                <span className={cn(
                                                                    "text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm",
                                                                    isMesa ? "bg-orange-100 text-orange-700" : isDelivery ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {isMesa ? 'MESA' : isDelivery ? 'DELIVERY' : 'BALCÃO'}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-foreground uppercase text-xs truncate max-w-[200px]">{t.description}</span>
                                                        </div>
                                                        {t.orderId && (
                                                            <span className="text-[8px] text-slate-400 font-bold italic uppercase tracking-tighter">REF: #{t.orderId.slice(-6)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {t.type === 'INCOME' ? (
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm transition-all",
                                                            t.paymentMethod === 'cash' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            t.paymentMethod === 'pix' ? "bg-teal-50 text-teal-600 border-teal-100" :
                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                        )}>
                                                            {t.paymentMethod === 'cash' ? 'Dinheiro' : 
                                                             t.paymentMethod === 'pix' ? 'Pix' : 
                                                             t.paymentMethod?.includes('card') ? 'Cartão' : (t.paymentMethod || 'Outro')}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] font-bold text-slate-300 italic uppercase">Saída</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">{t.category?.name || '-'}</td>
                                                <td className={cn("px-6 py-4 text-right font-black text-xs italic", t.type === 'INCOME' ? "text-emerald-600" : "text-red-600")}>R$ {t.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {t.type === 'INCOME' && t.orderId && !t.order?.invoice && (
                                                            <button 
                                                                onClick={() => handleEmitInvoice(t.orderId)}
                                                                className="p-2 bg-slate-900 text-white hover:bg-black rounded-lg transition-all shadow-sm"
                                                                title="Emitir Nota"
                                                            >
                                                                <Receipt size={14} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-600 p-1">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {activeTab === 'suppliers' && suppliers.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4 font-bold text-foreground uppercase text-xs">{s.name}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{s.cnpj}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{s.phone}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                    {activeTab === 'categories' && categories.map((c: any) => (
                                        <tr key={c.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4 font-bold text-foreground uppercase text-xs">{c.name}</td>
                                            <td className="px-6 py-4 uppercase text-[8px] font-black tracking-widest">{c.type === 'INCOME' ? <span className="text-emerald-600">Receita</span> : <span className="text-red-600">Despesa</span>}</td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL UNIFICADO DINÂMICO */}
            {showForm && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-xl">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
                            <h3 className="text-lg font-black text-foreground italic uppercase tracking-tight">
                                {formData.id ? 'Editar' : 'Adicionar'} Registro
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-full text-slate-400 transition-all"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {activeTab === 'transactions' ? (
                                <div className="space-y-5">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label><input className="ui-input w-full" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="Ex: Pagamento Internet" /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor R$</label><input type="number" step="0.01" className="ui-input w-full" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} required /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo</label><select className="ui-input w-full" value={formData.type || 'EXPENSE'} onChange={e => setFormData({...formData, type: e.target.value})}><option value="EXPENSE">Despesa (Saída)</option><option value="INCOME">Receita (Entrada)</option></select></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento</label><input type="date" className="ui-input w-full" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} required /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label><select className="ui-input w-full" value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})}><option value="">Selecione...</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                    </div>
                                </div>
                            ) : activeTab === 'suppliers' ? (
                                <div className="space-y-5">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Empresa</label><input className="ui-input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CNPJ</label><input className="ui-input w-full" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label><input className="ui-input w-full" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                                    </div>
                                </div>
                            ) : activeTab === 'bank-accounts' ? (
                                <div className="space-y-5">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Banco</label><input className="ui-input w-full" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} required placeholder="Ex: Itaú, Nubank..." /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Agência</label><input className="ui-input w-full" value={formData.agency || ''} onChange={e => setFormData({...formData, agency: e.target.value})} /></div>
                                        <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta</label><input className="ui-input w-full" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} /></div>
                                    </div>
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Saldo Inicial R$</label><input type="number" step="0.01" className="ui-input w-full" value={formData.balance || '0'} onChange={e => setFormData({...formData, balance: e.target.value})} /></div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Categoria</label><input className="ui-input w-full" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo</label><select className="ui-input w-full" value={formData.type || 'EXPENSE'} onChange={e => setFormData({...formData, type: e.target.value})}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="ui-button-secondary flex-1">Cancelar</button>
                                <button type="submit" className="ui-button-primary flex-1">
                                    {formData.id ? 'Salvar' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialManagement;
