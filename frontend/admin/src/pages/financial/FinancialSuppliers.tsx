import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Plus, Trash2, Edit3, User, Search, 
  Loader2, Building2, Phone, FileText,
  Mail, MapPin, Info, X, Save, Package
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';

interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const FinancialSuppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useScrollLock(showForm);

  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/financial/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Nome do fornecedor é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      if (formData.id) {
        await api.put(`/financial/suppliers/${formData.id}`, formData);
        toast.success('Fornecedor atualizado!');
      } else {
        await api.post('/financial/suppliers', formData);
        toast.success('Fornecedor cadastrado!');
      }
      setShowForm(false);
      setFormData({});
      loadSuppliers();
    } catch (error) {
      toast.error('Erro ao salvar fornecedor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmData({
      open: true, 
      title: 'Confirmar Exclusão', 
      message: 'Excluir fornecedor? Isso não apagará os lançamentos vinculados a ele, mas removerá o cadastro da base.', 
      onConfirm: async () => {
        try {
          await api.delete(`/financial/suppliers/${id}`);
          toast.success('Fornecedor removido.');
          loadSuppliers();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Erro ao excluir.');
        }
        setConfirmData(prev => ({...prev, open: false}));
      }
    });
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.cnpj && s.cnpj.includes(searchQuery)) ||
      (s.phone && s.phone.includes(searchQuery))
    );
  }, [suppliers, searchQuery]);

  const withCnpj = suppliers.filter(s => s.cnpj).length;
  const withoutCnpj = suppliers.filter(s => !s.cnpj).length;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-2 duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Gestão de <span className="text-primary">Fornecedores</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Cadastro, Homologação e Parceiros Comerciais
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => { setShowForm(true); setFormData({}); }}
          className="h-10 px-6 rounded-xl shadow-lg shadow-primary/10 font-black italic tracking-tighter uppercase text-[10px]"
        >
          <Plus size={16} className="mr-2" /> Novo Fornecedor
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Parceiros</p>
            <h4 className="text-lg font-black text-slate-900 italic">{suppliers.length}</h4>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Com CNPJ</p>
            <h4 className="text-lg font-black text-slate-900 italic">{withCnpj}</h4>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Sem CNPJ</p>
            <h4 className="text-lg font-black text-slate-900 italic">{withoutCnpj}</h4>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[7px] font-black text-white/60 uppercase tracking-widest">Base Ativa</p>
              <p className="text-sm font-black italic tracking-tight">Homologados</p>
            </div>
            <Building2 size={18} className="text-orange-400" />
          </div>
        </Card>
      </div>

      {/* TABELA */}
      <Card className="overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full" />
            <div>
              <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Base de Fornecedores Homologados</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filtered.length} registro(s) encontrado(s)</p>
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Nome, CNPJ ou telefone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Carregando base...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3">Empresa / Razão Social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3 text-center">Contato</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center text-slate-400">
                        <Building2 size={40} className="mb-3 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhum fornecedor encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-all shadow-sm">
                          <Building2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter group-hover:text-blue-600 transition-colors">
                            {s.name}
                          </span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor Ativo</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.cnpj ? (
                        <span className="text-[10px] font-bold text-slate-600 font-mono tracking-wider bg-slate-100 px-2 py-1 rounded">
                          {s.cnpj}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase italic">Não informado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {s.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[9px]">
                            <Phone size={10} className="text-blue-500" /> {s.phone}
                          </div>
                        ) : (
                          <span className="text-[8px] font-black text-slate-300 uppercase italic">Sem telefone</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 rounded-xl transition-all"
                          onClick={() => { setFormData(s); setShowForm(true); }}
                        >
                          <Edit3 size={15} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

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
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <header className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                    {formData.id ? 'Editar Parceiro' : 'Novo Fornecedor'}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Homologação de Fornecedores</p>
                </div>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200 transition-all hover:rotate-90"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                  <Input 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    placeholder="Ex: Coca-Cola, Distribuidora XYZ..."
                    className="h-11 text-sm font-bold uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">CNPJ</label>
                    <Input 
                      value={formData.cnpj || ''} 
                      onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                      placeholder="00.000.000/0000-00"
                      className="h-11 text-sm font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
                    <Input 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="(00) 00000-0000"
                      className="h-11 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail (opcional)</label>
                  <Input 
                    value={formData.email || ''} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="contato@fornecedor.com"
                    className="h-11 text-sm font-bold"
                    type="email"
                  />
                </div>

                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                  <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[8px] font-bold text-blue-800 leading-relaxed uppercase">
                    Vincular fornecedores aos seus lançamentos financeiros permite uma análise detalhada de compras e histórico de preços por parceiro comercial.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-11 rounded-2xl uppercase text-[9px] font-black tracking-widest" 
                    onClick={() => setShowForm(false)}
                  >
                    Descartar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="flex-[2] h-11 rounded-2xl shadow-lg shadow-blue-500/20 uppercase text-[9px] font-black tracking-widest italic"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    {formData.id ? 'Salvar Alterações' : 'Confirmar Registro'}
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

export default FinancialSuppliers;