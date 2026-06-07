import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { api } from '../../services/api';
import { 
    Plus, Search, Edit2, Trash2, Filter, AlertTriangle, 
    Package, Info, ChevronRight, Scale, Layers, Loader2,
    Disc, Tag, ArrowRightLeft, History, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface IngredientFormData {
    name: string;
    unit: string;
    groupId: string;
    stock: number;
    minStock: number;
    controlStock: boolean;
    controlCmv: boolean;
    isProduced: boolean;
}

const UNITS = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'fd', 'pct', 'dz', 'sc'];

const StockIngredients: React.FC = () => {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState('all');
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
    
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<IngredientFormData>({
        name: '',
        unit: 'un',
        groupId: '',
        stock: 0,
        minStock: 0,
        controlStock: true,
        controlCmv: true,
        isProduced: false
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ingRes, groupRes] = await Promise.all([
                api.get('/ingredients'),
                api.get('/ingredients/groups')
            ]);
            setIngredients(ingRes.data);
            setGroups(groupRes.data);
        } catch (error) {
            toast.error("Falha ao carregar insumos.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            unit: 'un',
            groupId: '',
            stock: 0,
            minStock: 0,
            controlStock: true,
            controlCmv: true,
            isProduced: false
        });
        setShowForm(true);
    };

    const handleEdit = (ingredient: any) => {
        setEditingId(ingredient.id);
        setFormData({
            name: ingredient.name || '',
            unit: ingredient.unit || 'un',
            groupId: ingredient.groupId || '',
            stock: ingredient.stock || 0,
            minStock: ingredient.minStock || 0,
            controlStock: ingredient.controlStock ?? true,
            controlCmv: ingredient.controlCmv ?? true,
            isProduced: ingredient.isProduced ?? false
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }
        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/ingredients/${editingId}`, formData);
                toast.success('Insumo atualizado!');
            } else {
                await api.post('/ingredients', formData);
                toast.success('Insumo criado!');
            }
            setShowForm(false);
            setEditingId(null);
            await loadData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar insumo');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Excluir este insumo? Isso removerá o histórico e vínculos.', onConfirm: async () => {
            try {
                await api.delete(`/ingredients/${id}`);
                toast.success('Insumo removido!');
                loadData();
            } catch (e) {
                toast.error('Não é possível excluir insumos com movimentações.');
            }
        }});
    };

    const filtered = ingredients.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = filterGroup === 'all' || i.groupId === filterGroup;
        return matchesSearch && matchesGroup;
    });

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-500">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex flex-1 gap-3 w-full">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                            className="ui-input w-full pl-12 h-12 text-[11px] font-black uppercase tracking-widest" 
                            placeholder="Buscar no catálogo de insumos..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="ui-input h-12 px-6 text-[10px] font-black uppercase italic cursor-pointer bg-slate-50 border-none"
                        value={filterGroup}
                        onChange={e => setFilterGroup(e.target.value)}
                    >
                        <option value="all">Todos os Grupos</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                <Button 
                    onClick={handleCreate}
                    className="h-12 px-8 rounded-2xl shadow-lg italic font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-black transition-all"
                >
                    <Plus size={16} className="mr-2" /> CADASTRAR INSUMO
                </Button>
            </div>

            {/* TABELA */}
            <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Almoxarifado...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-5">Identificação / SKU</th>
                                    <th className="px-8 py-5 text-center">Classificação</th>
                                    <th className="px-8 py-5 text-right">Saldo em Estoque</th>
                                    <th className="px-8 py-5 text-right">Valoração (Custo)</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-500 font-bold italic">Nenhum insumo encontrado.</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-blue-500 group-hover:border-blue-100 transition-all shadow-sm">
                                                    <Tag size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter group-hover:text-blue-600 transition-colors">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">SKU: {item.id.slice(-8).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest border border-slate-200">
                                                <Layers size={10} className="mr-1.5 opacity-40" /> {item.group?.name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className={cn(
                                                "inline-flex flex-col items-end px-3 py-1.5 rounded-xl border transition-all",
                                                item.stock <= (item.minStock || 0) 
                                                    ? "bg-rose-50 border-rose-100 text-rose-600 shadow-sm" 
                                                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                            )}>
                                                <div className="flex items-center gap-1.5 font-black text-xs italic">
                                                    {item.stock} <span className="text-[9px] opacity-60 uppercase">{item.unit || 'UN'}</span>
                                                    {item.stock <= (item.minStock || 0) && <AlertTriangle size={12} className="animate-pulse" />}
                                                </div>
                                                <span className="text-[7px] font-black uppercase tracking-widest mt-0.5 opacity-60">
                                                    Mín: {item.minStock || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-black text-slate-900 italic tracking-tighter">
                                                    R$ {(item.averageCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Custo Médio Unitário</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-xl" onClick={() => handleEdit(item)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 rounded-xl" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 size={14} />
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

            {/* MODAL CRIAR/EDITAR */}
            <AnimatePresence>
            {showForm && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => { setShowForm(false); setEditingId(null); }} />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
                    >
                        <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                        {editingId ? 'Editar Insumo' : 'Novo Insumo'}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Cadastro de Matéria-Prima</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 transition-all hover:rotate-90">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome do Insumo *</label>
                                <input 
                                    className="ui-input w-full h-12 text-sm font-bold uppercase" placeholder="Ex: Farinha de Trigo"
                                    value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Unidade</label>
                                    <select value={formData.unit} onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))} className="ui-input w-full h-12 text-[11px] font-bold uppercase bg-white border-slate-200">
                                        {UNITS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Grupo</label>
                                    <select value={formData.groupId} onChange={e => setFormData(prev => ({ ...prev, groupId: e.target.value }))} className="ui-input w-full h-12 text-[11px] font-bold uppercase bg-white border-slate-200">
                                        <option value="">Sem grupo</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Estoque Atual</label>
                                    <input type="number" min="0" step="0.01" className="ui-input w-full h-12 text-sm font-bold" value={formData.stock} onChange={e => setFormData(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Estoque Mínimo</label>
                                    <input type="number" min="0" step="0.01" className="ui-input w-full h-12 text-sm font-bold" value={formData.minStock} onChange={e => setFormData(prev => ({ ...prev, minStock: Number(e.target.value) || 0 }))} />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.controlStock} onChange={e => setFormData(prev => ({ ...prev, controlStock: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                                    <span className="text-sm font-bold text-slate-700">Controla estoque</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.controlCmv} onChange={e => setFormData(prev => ({ ...prev, controlCmv: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                                    <span className="text-sm font-bold text-slate-700">Compõe CMV</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isProduced} onChange={e => setFormData(prev => ({ ...prev, isProduced: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                                    <span className="text-sm font-bold text-slate-700">É produzido</span>
                                </label>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <Button variant="ghost" className="rounded-2xl h-12 uppercase text-[10px] font-black tracking-widest" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-12 px-8 shadow-lg uppercase text-[10px] font-black tracking-widest italic bg-slate-900 text-white hover:bg-black">
                                {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                                {editingId ? 'Salvar Alterações' : 'Criar Insumo'}
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

export default StockIngredients;
