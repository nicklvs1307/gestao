import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Wallet, User, Disc, Building2, Plus, Trash2, Receipt, CreditCard, X, CheckCircle, QrCode, ArrowUpCircle, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const FinancialManagement: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'transactions' | 'suppliers' | 'categories' | 'bank-accounts'>('transactions');
    const [transactions, setTransactions] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(false);

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});

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
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header e Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Financeiro</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <DollarSign size={14} className="text-orange-500" /> Gestão de Fluxo de Caixa e Contas
                    </p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 shadow-inner">
                    {[
                        { id: 'transactions', label: 'Lançamentos', icon: Wallet },
                        { id: 'suppliers', label: 'Fornecedores', icon: User },
                        { id: 'categories', label: 'Categorias', icon: Disc },
                        { id: 'bank-accounts', label: 'Contas', icon: Building2 }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                                activeTab === tab.id 
                                    ? "bg-white text-slate-900 shadow-md scale-[1.02]" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resumo de Saldo Estilo Premium */}
            {activeTab === 'transactions' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-emerald-100 bg-emerald-50/30 group hover:bg-white transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                <TrendingUp size={24} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-1 rounded-md">Entradas</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Recebido</p>
                        <h3 className="text-3xl font-black text-emerald-900 tracking-tighter italic">R$ {summary.totalIncome.toFixed(2).replace('.', ',')}</h3>
                    </Card>

                    <Card className="p-6 border-rose-100 bg-rose-50/30 group hover:bg-white transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                                <TrendingDown size={24} />
                            </div>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-100 px-2 py-1 rounded-md">Saídas</span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Pago</p>
                        <h3 className="text-3xl font-black text-rose-900 tracking-tighter italic">R$ {summary.totalExpense.toFixed(2).replace('.', ',')}</h3>
                    </Card>

                    <Card className="p-6 border-slate-200 bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest border border-orange-500/30 px-2 py-1 rounded-md">Disponível</span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Saldo Atual</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter italic relative z-10">
                            R$ {(summary.totalIncome - summary.totalExpense).toFixed(2).replace('.', ',')}
                        </h3>
                    </Card>
                </div>
            )}

            {/* Listagens */}
            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-base">
                            {activeTab === 'transactions' ? 'Livro de Lançamentos' : activeTab === 'suppliers' ? 'Meus Fornecedores' : activeTab === 'categories' ? 'Categorias de Fluxo' : 'Minhas Contas'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registros atualizados do sistema</p>
                    </div>
                    <Button size="sm" className="px-6 rounded-xl italic" onClick={() => { setShowForm(true); setFormData({}); }}>
                        <Plus size={16} /> ADICIONAR
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando dados...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    {activeTab === 'bank-accounts' ? (
                                        <>
                                            <th className="px-8 py-4">Instituição / Banco</th>
                                            <th className="px-8 py-4">Agência & Conta</th>
                                            <th className="px-8 py-4 text-center">Saldo em Conta</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'transactions' ? (
                                        <>
                                            <th className="px-8 py-4">Vencimento</th>
                                            <th className="px-8 py-4">Descrição / Origem</th>
                                            <th className="px-8 py-4">Meio / Categoria</th>
                                            <th className="px-8 py-4 text-right">Valor Bruto</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : activeTab === 'suppliers' ? (
                                        <>
                                            <th className="px-8 py-4">Empresa / Razão Social</th>
                                            <th className="px-8 py-4">Documento (CNPJ)</th>
                                            <th className="px-8 py-4">Contato Direto</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-8 py-4">Nome da Categoria</th>
                                            <th className="px-8 py-4 text-center">Natureza</th>
                                            <th className="px-8 py-4 text-right">Ações</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeTab === 'bank-accounts' && bankAccounts.map((b: any) => (
                                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors shadow-sm">
                                                    <Building2 size={20} />
                                                </div>
                                                <span className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{b.bankName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{b.agency} / {b.accountNumber}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="font-black text-sm text-slate-900 italic tracking-tighter">R$ {b.balance.toFixed(2).replace('.', ',')}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 hover:bg-orange-50" onClick={() => { setShowForm(true); setFormData(b); }}><ArrowUpCircle size={18} className="text-orange-500"/></Button>
                                                <Button variant="ghost" size="icon" className="rounded-xl bg-slate-50 hover:bg-rose-50" onClick={() => handleDelete(b.id)}><Trash2 size={18} className="text-rose-500"/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'transactions' && transactions.map((t: any) => {
                                    const isMesa = t.description.toLowerCase().includes('mesa');
                                    const isDelivery = t.order?.orderType === 'DELIVERY';
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.dueDate).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {t.type === 'INCOME' && (
                                                            <span className={cn(
                                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm",
                                                                isMesa ? "bg-orange-500 text-white" : isDelivery ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                                                            )}>
                                                                {isMesa ? 'Mesa' : isDelivery ? 'Delivery' : 'Balcão'}
                                                            </span>
                                                        )}
                                                        <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter truncate max-w-[250px]">{t.description}</span>
                                                    </div>
                                                    {t.orderId && <span className="text-[9px] text-slate-400 font-bold uppercase italic opacity-60">ID: #{t.orderId.slice(-6).toUpperCase()}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.category?.name || 'Geral'}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <CreditCard size={10} className="text-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{t.paymentMethod || 'Dinheiro'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={cn("px-8 py-5 text-right font-black text-base italic tracking-tighter", t.type === 'INCOME' ? "text-emerald-600" : "text-rose-600")}>
                                                {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {t.type === 'INCOME' && t.orderId && !t.order?.invoice && (
                                                        <Button variant="ghost" size="icon" className="bg-slate-900 text-white hover:bg-black rounded-xl" onClick={() => handleEmitInvoice(t.orderId)}><Receipt size={16} /></Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-rose-50" onClick={() => handleDelete(t.id)}><Trash2 size={18} className="text-slate-300 group-hover:text-rose-500"/></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {activeTab === 'suppliers' && suppliers.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-5 font-black text-xs text-slate-900 uppercase italic tracking-tighter">{s.name}</td>
                                        <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.cnpj || '---'}</span></td>
                                        <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.phone || '---'}</span></td>
                                        <td className="px-8 py-5 text-right"><Button variant="ghost" size="icon" className="hover:bg-rose-50 rounded-xl" onClick={() => handleDelete(s.id)}><Trash2 size={18} className="text-rose-500"/></Button></td>
                                    </tr>
                                ))}

                                {activeTab === 'categories' && categories.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-8 py-5 font-black text-xs text-slate-900 uppercase italic tracking-tighter">{c.name}</td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                c.type === 'INCOME' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                            )}>
                                                {c.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right"><Button variant="ghost" size="icon" className="hover:bg-rose-50 rounded-xl" onClick={() => handleDelete(c.id)}><Trash2 size={18} className="text-rose-500"/></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* MODAL UNIFICADO PREMIUM */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                            <header className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                    {formData.id ? 'Editar' : 'Novo'} Lançamento
                                </h3>
                                <Button variant="ghost" size="icon" className="rounded-full bg-white" onClick={() => setShowForm(false)}><X size={24}/></Button>
                            </header>
                            
                            <form onSubmit={handleSubmit} className="p-10 space-y-6">
                                {activeTab === 'transactions' ? (
                                    <div className="space-y-6">
                                        <Input label="Descrição do Lançamento" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="Ex: Pagamento de Fornecedor" />
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label="Valor Bruto (R$)" type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Operação</label>
                                                <select className="ui-input w-full h-12" value={formData.type || 'EXPENSE'} onChange={e => setFormData({...formData, type: e.target.value})}>
                                                    <option value="EXPENSE">Despesa (Saída)</option>
                                                    <option value="INCOME">Receita (Entrada)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label="Data de Vencimento" type="date" value={formData.dueDate ? formData.dueDate.split('T')[0] : ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria Financeira</label>
                                                <select className="ui-input w-full h-12" value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                                                    <option value="">Selecionar...</option>
                                                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab === 'suppliers' ? (
                                    <div className="space-y-6">
                                        <Input label="Nome da Empresa" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label="CNPJ" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                                            <Input label="Telefone" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                        </div>
                                    </div>
                                ) : activeTab === 'bank-accounts' ? (
                                    <div className="space-y-6">
                                        <Input label="Nome da Instituição" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} required placeholder="Ex: Banco do Brasil, Itaú..." />
                                        <div className="grid grid-cols-2 gap-6">
                                            <Input label="Agência" value={formData.agency || ''} onChange={e => setFormData({...formData, agency: e.target.value})} />
                                            <Input label="Número da Conta" value={formData.accountNumber || ''} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                                        </div>
                                        <Input label="Saldo Inicial (R$)" type="number" step="0.01" value={formData.balance || '0'} onChange={e => setFormData({...formData, balance: e.target.value})} />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <Input label="Nome da Categoria" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Natureza da Operação</label>
                                            <select className="ui-input w-full h-12" value={formData.type || 'EXPENSE'} onChange={e => setFormData({...formData, type: e.target.value})}>
                                                <option value="EXPENSE">Despesa</option>
                                                <option value="INCOME">Receita</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl" onClick={() => setShowForm(false)}>Cancelar</Button>
                                    <Button type="submit" fullWidth className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">
                                        {formData.id ? 'Salvar Alterações' : 'Confirmar Registro'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FinancialManagement;