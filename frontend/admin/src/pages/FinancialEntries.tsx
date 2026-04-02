import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../services/api';
import { 
  Wallet, Plus, Search, Filter, ArrowUpCircle, 
  ArrowDownCircle, Trash2, Calendar, Tag, User,
  X, CheckCircle, DollarSign, Calculator, Receipt, 
  ArrowRightLeft, Repeat, Loader2, ArrowUpRight, ArrowDownLeft,
  FileText, MoreHorizontal, RefreshCw, Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useScrollLock } from '../hooks/useScrollLock';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING';
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  category?: { name: string };
  supplier?: { name: string };
  isRecurring?: boolean;
  bankAccountId?: string;
}

const FinancialEntries: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<{ totalIncome: number; totalExpense: number }>({ totalIncome: 0, totalExpense: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  useScrollLock(showForm || showTransferForm);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
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
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transRes, catRes, supRes] = await Promise.all([
        api.get('/financial/transactions'),
        api.get('/financial/categories'),
        api.get('/financial/suppliers')
      ]);
      setTransactions(transRes.data.transactions || []);
      setSummary({
        totalIncome: transRes.data.summary?._sum?.amount || 0,
        totalExpense: 0
      });
      setCategories(catRes.data);
      setSuppliers(supRes.data);
      
      try {
        const bankRes = await api.get('/financial/bank-accounts');
        setBankAccounts(bankRes.data);
      } catch (e) { 
        console.warn("Módulo de contas bancárias ainda não disponível"); 
      }

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
    setSaving(true);
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
    } finally {
      setSaving(false);
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
    setConfirmData({
      open: true, 
      title: 'Confirmar Exclusão', 
      message: 'Deseja excluir este lançamento? Esta ação não pode ser desfeita.', 
      onConfirm: async () => {
        try {
          await api.delete(`/financial/transactions/${id}`);
          toast.success('Lançamento removido');
          loadData();
        } catch (error) {
          toast.error('Erro ao excluir');
        }
      }
    });
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.category?.name?.toLowerCase().includes(query)
      );
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    return filtered;
  }, [transactions, searchQuery, filterType]);

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Fluxo de <span className="text-primary">Caixa</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Lançamentos, Extrato e Movimentações
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={handleSyncRecurring}
              className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center gap-1.5"
            >
              <Repeat size={12} /> Sincronizar
            </button>
            <button 
              onClick={() => setShowTransferForm(true)}
              className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 hover:bg-white transition-all flex items-center gap-1.5"
            >
              <ArrowRightLeft size={12} /> Transferir
            </button>
          </div>
          <Button 
            onClick={() => { setShowForm(true); setFormData({ type: 'EXPENSE', status: 'PAID', dueDate: new Date().toISOString().split('T')[0], isRecurring: false, recurrenceFrequency: 'MONTHLY' }); }}
            className="h-10 px-6 rounded-xl shadow-lg shadow-primary/10 font-black italic tracking-tighter uppercase text-[10px]"
          >
            <Plus size={16} className="mr-2" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <ArrowUpCircle size={16} className="text-emerald-200" />
            <span className="text-[7px] font-black text-emerald-200 uppercase tracking-widest">Entradas</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(totalIncome)}</p>
          <p className="text-[7px] font-bold text-emerald-200 mt-1">Total de receitas no período</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <ArrowDownCircle size={16} className="text-rose-200" />
            <span className="text-[7px] font-black text-rose-200 uppercase tracking-widest">Saídas</span>
          </div>
          <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(totalExpense)}</p>
          <p className="text-[7px] font-bold text-rose-200 mt-1">Total de despesas no período</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <Calculator size={16} className="text-orange-400" />
            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">Saldo</span>
          </div>
          <p className={cn("text-2xl font-black italic tracking-tighter", balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatCurrency(balance)}
          </p>
          <p className="text-[7px] font-bold text-white/60 mt-1">Saldo líquido do período</p>
        </Card>
      </div>

      {/* TABELA */}
      <Card className="overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <div>
              <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Livro de Movimentações</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filteredTransactions.length} registro(s)</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                    filterType === type 
                      ? type === 'INCOME' ? "bg-emerald-100 text-emerald-700" 
                      : type === 'EXPENSE' ? "bg-rose-100 text-rose-700"
                      : "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
            
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar lançamento..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando dados...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-400">
                        <FileText size={40} className="mb-3 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum lançamento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black",
                          t.type === 'INCOME' ? "bg-emerald-500" : "bg-rose-500"
                        )}>
                          {t.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-600 uppercase italic">
                            {t.dueDate ? format(new Date(t.dueDate), 'dd/MM/yyyy') : '-'}
                          </span>
                          <span className={cn("text-[7px] font-bold uppercase", t.status === 'PAID' ? "text-emerald-500" : "text-amber-500")}>
                            {t.status === 'PAID' ? 'Liquidado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 uppercase italic tracking-tight truncate max-w-[200px]">
                          {t.description}
                        </span>
                        {t.isRecurring && (
                          <span className="text-[7px] font-bold bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded uppercase tracking-widest inline-flex items-center gap-1 mt-1 w-fit">
                            <Repeat size={8} /> Recorrente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-widest">
                        {t.category?.name || 'Geral'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                        {t.paymentMethod || 'Carteira'}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-black text-sm italic tracking-tighter",
                      t.type === 'INCOME' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => { setFormData(t); setShowForm(true); }}
                          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-primary hover:bg-orange-50 transition-all flex items-center justify-center"
                        >
                          <Filter size={12} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* MODAL LANÇAMENTO */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <header className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                    {formData.id ? 'Editar Registro' : 'Novo Lançamento'}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Livro Diário de Fluxo de Caixa</p>
                </div>
                <button onClick={() => setShowForm(false)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200">
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="flex gap-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                    className={cn("flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all", formData.type === 'EXPENSE' ? "bg-rose-500 text-white shadow-lg" : "text-slate-400")}
                  >Saída (Despesa)</button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'INCOME'})}
                    className={cn("flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all", formData.type === 'INCOME' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400")}
                  >Entrada (Receita)</button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição do Lançamento</label>
                  <input 
                    type="text" 
                    className="ui-input w-full h-11 text-sm font-bold"
                    placeholder="Ex: Pagamento Fornecedor Carne..."
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
                      <input 
                        type="number" step="0.01"
                        className="ui-input w-full h-11 pl-10 text-sm font-bold"
                        value={formData.amount || ''}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Competência</label>
                    <input 
                      type="date" 
                      className="ui-input w-full h-11 text-sm font-bold"
                      value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta Bancária</label>
                    <select 
                      className="ui-input w-full h-11 text-[10px] font-bold uppercase"
                      value={formData.bankAccountId || ''}
                      onChange={e => setFormData({...formData, bankAccountId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} (R$ {acc.balance?.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                    <select 
                      className="ui-input w-full h-11 text-[10px] font-bold uppercase"
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

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat size={14} className="text-blue-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Lançamento Recorrente</span>
                    </div>
                    <input 
                      type="checkbox"
                      className="w-5 h-5 accent-blue-600"
                      checked={formData.isRecurring || false}
                      onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                    />
                  </div>
                  
                  {formData.isRecurring && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <select 
                        className="ui-input h-9 text-[9px] font-bold uppercase"
                        value={formData.recurrenceFrequency || 'MONTHLY'}
                        onChange={e => setFormData({...formData, recurrenceFrequency: e.target.value})}
                      >
                        <option value="WEEKLY">Semanal</option>
                        <option value="MONTHLY">Mensal</option>
                        <option value="YEARLY">Anual</option>
                      </select>
                      <input 
                        type="date"
                        className="ui-input h-9 text-[9px] font-bold"
                        value={formData.recurrenceEndDate ? formData.recurrenceEndDate.split('T')[0] : ''}
                        onChange={e => setFormData({...formData, recurrenceEndDate: e.target.value})}
                        placeholder="Data fim"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Liquidado (Pago/Recebido)</span>
                    </div>
                    <input 
                      type="checkbox"
                      className="w-5 h-5 accent-emerald-600"
                      checked={formData.status === 'PAID'}
                      onChange={e => setFormData({...formData, status: e.target.checked ? 'PAID' : 'PENDING'})}
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3 shrink-0">
                  <Button type="button" variant="ghost" className="flex-1 h-11 rounded-2xl uppercase text-[9px] font-black tracking-widest" onClick={() => setShowForm(false)}>
                    Descartar
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-[2] h-11 rounded-2xl shadow-lg shadow-primary/20 uppercase text-[9px] font-black tracking-widest italic">
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    Confirmar Lançamento
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TRANSFERÊNCIA */}
      <AnimatePresence>
        {showTransferForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowTransferForm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
              <header className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-blue-600" /> Transferência
                </h3>
                <button onClick={() => setShowTransferForm(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all">
                  <X size={18}/>
                </button>
              </header>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Origem</label>
                  <select className="ui-input w-full h-11 text-[10px] font-bold uppercase" value={transferData.fromAccountId || ''} onChange={e => setTransferData({...transferData, fromAccountId: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Destino</label>
                  <select className="ui-input w-full h-11 text-[10px] font-bold uppercase" value={transferData.toAccountId || ''} onChange={e => setTransferData({...transferData, toAccountId: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="ui-input w-full h-12 text-xl font-black italic tracking-tighter text-blue-600 bg-blue-50 border-none rounded-xl" 
                    value={transferData.amount || ''} 
                    onChange={e => setTransferData({...transferData, amount: e.target.value})} 
                    required 
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleTransferSubmit} 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 text-[9px] font-black tracking-[0.2em] uppercase rounded-xl mt-2"
                >
                  <ArrowRightLeft size={14} className="mr-2" /> Confirmar Transferência
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={confirmData.open} 
        onClose={() => setConfirmData(prev => ({...prev, open: false}))} 
        onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} 
        title={confirmData.title} 
        message={confirmData.message} 
      />
    </div>
  );
};

export default FinancialEntries;