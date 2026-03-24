import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Plus, Trash2, Edit3, Disc, TrendingUp, TrendingDown, 
    Loader2, Search, Filter, PieChart, Info, AlertCircle 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const FinancialCategories: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({ type: 'EXPENSE' });
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const res = await api.get('/financial/categories');
            setCategories(res.data);
        } catch (error) {
            toast.error('Erro ao carregar categorias.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await api.put(`/financial/categories/${formData.id}`, formData);
                toast.success('Categoria atualizada!');
            } else {
                await api.post('/financial/categories', formData);
                toast.success('Categoria criada!');
            }
            setShowForm(false);
            setFormData({ type: 'EXPENSE' });
            loadCategories();
        } catch (error) {
            toast.error('Erro ao salvar categoria.');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Excluir esta categoria? Isso pode afetar relatórios históricos.', onConfirm: async () => {
            try {
                await api.delete(`/financial/categories/${id}`);
                toast.success('Categoria removida.');
                loadCategories();
            } catch (error) {
                toast.error('Erro ao excluir. Verifique se existem lançamentos vinculados.');
            }
            setConfirmData(prev => ({...prev, open: false}));
        }});
    };

    const filtered = categories.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const incomeCount = categories.filter(c => c.type === 'INCOME').length;
    const expenseCount = categories.filter(c => c.type === 'EXPENSE').length;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            {/* TOP ACTIONS & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                        <Disc size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total de Categorias</p>
                        <h4 className="text-xl font-black text-slate-900 italic leading-tight">{categories.length}</h4>
                    </div>
                </Card>

                <Card className="p-4 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Receitas</p>
                        <h4 className="text-xl font-black text-emerald-600 italic">{incomeCount}</h4>
                    </div>
                </Card>

                <Card className="p-4 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Despesas</p>
                        <h4 className="text-xl font-black text-rose-600 italic">{expenseCount}</h4>
                    </div>
                </Card>

                <div className="flex items-center justify-end">
                    <Button 
                        onClick={() => { setShowForm(true); setFormData({ type: 'EXPENSE' }); }}
                        className="h-14 w-full lg:w-auto px-8 rounded-2xl shadow-xl shadow-orange-500/10 font-black italic tracking-tighter uppercase text-[11px]"
                    >
                        <Plus size={18} className="mr-2" /> Nova Categoria
                    </Button>
                </div>
            </div>

            {/* LISTAGEM DENSA */}
            <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Estrutura do Plano de Contas</h3>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Pesquisar categoria..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ui-input w-full pl-11 h-10 text-[11px] font-bold uppercase tracking-widest"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando dados...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-4">Nome da Categoria / Conta</th>
                                    <th className="px-8 py-4 text-center">Natureza DRE</th>
                                    <th className="px-8 py-4 text-center">Visualização</th>
                                    <th className="px-8 py-4 text-right">Ações de Gestão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold italic text-sm">
                                            Nenhuma categoria encontrada para o filtro atual.
                                        </td>
                                    </tr>
                                ) : filtered.map((category) => (
                                    <tr key={category.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm border",
                                                    category.type === 'INCOME' 
                                                        ? "bg-emerald-50 border-emerald-100 text-emerald-500" 
                                                        : "bg-rose-50 border-rose-100 text-rose-500"
                                                )}>
                                                    <PieChart size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter group-hover:text-orange-600 transition-colors">
                                                        {category.name}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Plano de Contas Ativo</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                category.type === 'INCOME' 
                                                    ? "bg-emerald-100 text-emerald-700" 
                                                    : "bg-rose-100 text-rose-700"
                                            )}>
                                                {category.type === 'INCOME' ? 'Receita Operacional' : 'Despesa Operacional'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex justify-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Ativo" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-600 rounded-xl"
                                                    onClick={() => { setFormData(category); setShowForm(true); }}
                                                >
                                                    <Edit3 size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 rounded-xl"
                                                    onClick={() => handleDelete(category.id)}
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

            {/* MODAL ERP STYLE */}
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
                            className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                        {formData.id ? 'Editar Conta' : 'Nova Categoria'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuração do Plano de Contas</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Categoria</label>
                                    <Input 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        required 
                                        placeholder="Ex: Insumos de Cozinha, Aluguel..."
                                        className="h-12 text-sm font-bold uppercase tracking-tight"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Natureza Financeira (DRE)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'INCOME'})}
                                            className={cn(
                                                "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                                formData.type === 'INCOME' 
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                                                    : "border-slate-100 bg-white text-slate-400 grayscale hover:grayscale-0"
                                            )}
                                        >
                                            <TrendingUp size={24} />
                                            <span className="text-[10px] font-black uppercase">Receita</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'EXPENSE'})}
                                            className={cn(
                                                "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                                formData.type === 'EXPENSE' 
                                                    ? "border-rose-500 bg-rose-50 text-rose-700" 
                                                    : "border-slate-100 bg-white text-slate-400 grayscale hover:grayscale-0"
                                            )}
                                        >
                                            <TrendingDown size={24} />
                                            <span className="text-[10px] font-black uppercase">Despesa</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex gap-3">
                                    <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-orange-800 leading-relaxed uppercase">
                                        A natureza da categoria define como este lançamento impactará seu lucro líquido e relatórios de fluxo de caixa automáticos.
                                    </p>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Descartar</Button>
                                    <Button type="submit" className="flex-[2] h-14 rounded-2xl shadow-xl shadow-orange-500/20 uppercase text-[10px] font-black tracking-widest italic">
                                        {formData.id ? 'Salvar Alterações' : 'Confirmar Cadastro'}
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

export default FinancialCategories;
