import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Plus, Trash2, Edit3, User, Search, 
    Loader2, Building2, Phone, FileText,
    ExternalLink, Mail, MapPin, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const FinancialSuppliers: React.FC = () => {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

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
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Excluir fornecedor? Isso não apagará os lançamentos vinculados a ele.', onConfirm: async () => {
            try {
                await api.delete(`/financial/suppliers/${id}`);
                toast.success('Fornecedor removido.');
                loadSuppliers();
            } catch (error) {
                toast.error('Erro ao excluir.');
            }
            setConfirmData(prev => ({...prev, open: false}));
        }});
    };

    const filtered = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.cnpj && s.cnpj.includes(searchQuery))
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-500">
            {/* ESTATÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total de Parceiros</p>
                        <h4 className="text-xl font-black text-slate-900 italic">{suppliers.length}</h4>
                    </div>
                </Card>
                <Card className="p-4 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Com CNPJ Ativo</p>
                        <h4 className="text-xl font-black text-slate-900 italic">{suppliers.filter(s => s.cnpj).length}</h4>
                    </div>
                </Card>
                <div className="flex items-center justify-end">
                    <Button 
                        onClick={() => { setShowForm(true); setFormData({}); }}
                        className="h-14 w-full px-8 rounded-2xl shadow-xl shadow-blue-500/10 font-black italic tracking-tighter uppercase text-[11px]"
                    >
                        <Plus size={18} className="mr-2" /> Novo Fornecedor
                    </Button>
                </div>
            </div>

            {/* TABELA DE GESTÃO */}
            <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Base de Fornecedores Homologados</h3>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Nome ou CNPJ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ui-input w-full pl-11 h-10 text-[11px] font-bold uppercase tracking-widest"
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
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-4">Empresa / Razão Social</th>
                                    <th className="px-8 py-4">Identificação (CNPJ)</th>
                                    <th className="px-8 py-4 text-center">Contato Principal</th>
                                    <th className="px-8 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((s) => (
                                    <tr key={s.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shadow-sm">
                                                    <Building2 size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter group-hover:text-blue-600 transition-colors">
                                                        {s.name}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Fornecedor Ativo</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider bg-slate-100 px-2 py-1 rounded">
                                                {s.cnpj || 'ISENTO/NÃO INF.'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {s.phone ? (
                                                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[10px]">
                                                        <Phone size={10} className="text-blue-500" /> {s.phone}
                                                    </div>
                                                ) : (
                                                    <span className="text-[8px] font-black text-slate-300 uppercase italic">Sem Telefone</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-xl"
                                                    onClick={() => { setFormData(s); setShowForm(true); }}
                                                >
                                                    <Edit3 size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 rounded-xl"
                                                    onClick={() => handleDelete(s.id)}
                                                >
                                                    <Trash2 size={16} />
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

            {/* MODAL FORNECEDOR */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                        {formData.id ? 'Editar Parceiro' : 'Novo Fornecedor'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Homologação de Fornecedores</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                                    <Input 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        required 
                                        placeholder="Ex: Coca-Cola, Distribuidora XYZ..."
                                        className="h-12 text-sm font-bold uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CNPJ</label>
                                        <Input 
                                            value={formData.cnpj || ''} 
                                            onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                                            placeholder="00.000.000/0000-00"
                                            className="h-12 text-sm font-bold font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone Comercial</label>
                                        <Input 
                                            value={formData.phone || ''} 
                                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                                            placeholder="(00) 00000-0000"
                                            className="h-12 text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-blue-800 leading-relaxed uppercase">
                                        Vincular fornecedores aos seus lançamentos financeiros permite uma análise detalhada de compras e histórico de preços por parceiro.
                                    </p>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Descartar</Button>
                                    <Button type="submit" className="flex-[2] h-14 rounded-2xl shadow-xl shadow-blue-500/20 uppercase text-[10px] font-black tracking-widest italic">
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
