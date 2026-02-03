import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Building2, Plus, Edit2, Trash2, Landmark, 
    Wallet, DollarSign, ArrowRight, X, CheckCircle2,
    PieChart, TrendingUp, LandmarkIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const BankAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({ name: '', type: 'BANK', balance: 0 });

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financial/bank-accounts');
            setAccounts(res.data);
        } catch (error) {
            toast.error('Erro ao carregar contas bancárias');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await api.put(`/financial/bank-accounts/${formData.id}`, formData);
                toast.success('Conta atualizada!');
            } else {
                await api.post('/financial/bank-accounts', formData);
                toast.success('Conta cadastrada!');
            }
            setShowForm(false);
            setFormData({ name: '', type: 'BANK', balance: 0 });
            loadAccounts();
        } catch (error) {
            toast.error('Erro ao salvar conta');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta conta?')) return;
        try {
            await api.delete(`/financial/bank-accounts/${id}`);
            toast.success('Conta excluída!');
            loadAccounts();
        } catch (error) {
            toast.error('Erro ao excluir. Verifique se há lançamentos nela.');
        }
    };

    const totalConsolidated = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                        <Landmark size={32} className="text-primary" /> Contas Bancárias
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie seus saldos em bancos, caixas e carteiras digitais.</p>
                </div>
                
                <button 
                    onClick={() => { setShowForm(true); setFormData({ name: '', type: 'BANK', balance: 0 }); }}
                    className="bg-slate-900 dark:bg-primary text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3"
                >
                    <Plus size={20} /> Nova Conta
                </button>
            </div>

            {/* Banner Consolidado */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                <TrendingUp size={200} className="absolute -right-20 -bottom-20 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-2 italic">Saldo Consolidado</h3>
                        <p className="text-5xl font-black italic tracking-tighter">
                            R$ {totalConsolidated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total de Contas</p>
                            <p className="text-xl font-black italic">{accounts.length}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Última Sincronização</p>
                            <p className="text-xl font-black italic">Agora</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Contas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
                    ))
                ) : accounts.map((acc) => (
                    <div key={acc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between group hover:border-primary transition-all">
                        <div className="flex justify-between items-start">
                            <div className={cn(
                                "p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform",
                                acc.type === 'CASH' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                            )}>
                                {acc.type === 'CASH' ? <Wallet size={24} /> : <Building2 size={24} />}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setFormData(acc); setShowForm(true); }} className="p-2 text-slate-400 hover:text-primary transition-all"><Edit2 size={18} /></button>
                                <button onClick={() => handleDelete(acc.id)} className="p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{acc.name}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                {acc.type === 'CASH' ? 'Dinheiro / Caixa' : 'Conta Bancária'}
                            </p>
                        </div>

                        <div className="mt-8 flex items-end justify-between">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-full border-2 border-slate-50 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                <ArrowRight size={18} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Formulário */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{formData.id ? 'Editar' : 'Nova'} Conta</h3>
                            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nome da Conta</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                    placeholder="Ex: Banco Itaú, Caixa Local, Nubank..."
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Tipo de Conta</label>
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="BANK">Banco</option>
                                        <option value="CASH">Dinheiro / Caixa</option>
                                        <option value="SAVINGS">Poupança / Reserva</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Saldo Inicial R$</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                        value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-14 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 italic">Cancelar</button>
                            <button type="submit" className="flex-[2] h-14 bg-slate-900 dark:bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 italic">
                                <CheckCircle2 size={20} /> {formData.id ? 'Salvar Alterações' : 'Criar Conta'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BankAccounts;
