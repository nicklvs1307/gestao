import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Plus, Trash2, Edit3, Building2, Search, 
  Loader2, CreditCard, DollarSign, ArrowRightLeft,
  TrendingUp, ShieldCheck, Landmark, X, Save,
  Wallet, PiggyBank, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';

interface BankAccount {
  id: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  balance: number;
  createdAt?: string;
}

const FinancialBankAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useScrollLock(showForm);

  const [formData, setFormData] = useState<Partial<BankAccount>>({ balance: 0 });
  const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
  const [saving, setSaving] = useState(false);

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
    if (!formData.bankName?.trim()) {
      toast.error('Nome do banco é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData, balance: parseFloat(String(formData.balance || 0)) };
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
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmData({
      open: true, 
      title: 'Confirmar Exclusão', 
      message: 'Excluir esta conta? Isso removerá o histórico de saldo associado e todos os lançamentos vinculados.', 
      onConfirm: async () => {
        try {
          await api.delete(`/financial/bank-accounts/${id}`);
          toast.success('Conta removida.');
          loadAccounts();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Erro ao excluir. Verifique se existem lançamentos vinculados.');
        }
        setConfirmData(prev => ({...prev, open: false}));
      }
    });
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Contas <span className="text-primary">& Bancos</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Gestão de Patrimônio e Conciliação Bancária
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => { setShowForm(true); setFormData({ balance: 0 }); }}
          className="h-10 px-6 rounded-xl shadow-lg shadow-primary/10 font-black italic tracking-tighter uppercase text-[10px]"
        >
          <Plus size={16} className="mr-2" /> Nova Conta
        </Button>
      </div>

      {/* RESUMO DE LIQUIDEZ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl col-span-1 md:col-span-2 relative overflow-hidden">
          <Landmark size={100} className="absolute -right-6 -bottom-6 opacity-5" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank size={14} className="text-orange-400" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Liquidez Total Consolidada</span>
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter">
              {formatCurrency(totalBalance)}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck size={10} /> Capital Seguro
              </span>
              <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                <ArrowRightLeft size={10} /> {accounts.length} Contas Ativas
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-white border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Média por Conta</span>
          </div>
          <p className="text-xl font-black text-slate-800 italic tracking-tighter">
            {formatCurrency(accounts.length > 0 ? totalBalance / accounts.length : 0)}
          </p>
          <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Saldo médio por instituição</p>
        </Card>
      </div>

      {/* GRID DE CONTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
            <Loader2 className="animate-spin" size={40} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Mapeando Ativos...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Landmark size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold italic text-sm">Nenhuma conta bancária configurada.</p>
            <Button 
              onClick={() => { setShowForm(true); setFormData({}); }}
              className="mt-4 h-10 px-6 rounded-xl text-[10px] font-black uppercase"
            >
              <Plus size={16} className="mr-2" /> Adicionar Primeira Conta
            </Button>
          </div>
        ) : accounts.map((account, idx) => (
          <motion.div 
            key={account.id} 
            layout 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="p-5 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 border-slate-100 group relative bg-white rounded-2xl" noPadding>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors border border-slate-100 group-hover:border-orange-100 shadow-sm">
                    <Landmark size={22} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg bg-slate-100" onClick={() => { setFormData(account); setShowForm(true); }}>
                      <Edit3 size={12} className="text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-rose-50" onClick={() => handleDelete(account.id)}>
                      <Trash2 size={12} className="text-rose-400" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter truncate">
                      {account.bankName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        AG {account.agency || '---'} • CC {account.accountNumber || '---'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Disponibilidade em Conta</p>
                    <div className="flex items-end justify-between">
                      <span className={cn(
                        "text-2xl font-black italic tracking-tighter leading-none",
                        (account.balance || 0) >= 0 ? "text-slate-900" : "text-rose-600"
                      )}>
                        {formatCurrency(account.balance || 0)}
                      </span>
                      <div className="flex flex-col items-end">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-[7px] font-black text-emerald-500 uppercase mt-0.5">Atualizado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        {/* Card Adicionar */}
        {!loading && (
          <div 
            onClick={() => { setShowForm(true); setFormData({}); }}
            className="p-5 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-600 transition-all duration-300 min-h-[200px] rounded-2xl"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-orange-400 group-hover:text-orange-500 transition-all">
              <Plus size={22} />
            </div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-orange-600 transition-colors">Nova Instituição</p>
          </div>
        )}
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
              onClick={() => setShowForm(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <header className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                    {formData.id ? 'Editar Conta' : 'Vincular Nova Conta'}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Patrimônio Operacional</p>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 transition-all hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Instituição Bancária</label>
                  <Input 
                    value={formData.bankName || ''} 
                    onChange={e => setFormData({...formData, bankName: e.target.value})} 
                    required 
                    placeholder="Ex: Itaú, Nubank, Caixa..." 
                    className="h-11 text-sm font-bold" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Agência</label>
                    <Input 
                      value={formData.agency || ''} 
                      onChange={e => setFormData({...formData, agency: e.target.value})} 
                      placeholder="0001" 
                      className="h-11 text-sm font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta Corrente</label>
                    <Input 
                      value={formData.accountNumber || ''} 
                      onChange={e => setFormData({...formData, accountNumber: e.target.value})} 
                      placeholder="00000-0" 
                      className="h-11 text-sm font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Saldo de Abertura (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formData.balance} 
                      onChange={e => setFormData({...formData, balance: e.target.value})} 
                      className="w-full pl-10 h-12 text-lg font-black italic tracking-tighter text-slate-900 bg-slate-50 border-2 border-slate-100 focus:border-orange-500 transition-all rounded-xl" 
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-11 rounded-2xl uppercase text-[9px] font-black tracking-widest" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="flex-[2] h-11 rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-[9px] font-black tracking-widest italic"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    Confirmar Registro
                  </Button>
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