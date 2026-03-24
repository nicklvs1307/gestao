import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { api } from '../../services/api';
import { 
    Plus, Search, Edit2, Trash2, Filter, AlertTriangle, 
    Package, Info, ChevronRight, Scale, Layers, Loader2,
    Disc, Tag, ArrowRightLeft, History
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';

const StockIngredients: React.FC = () => {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState('all');
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

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
            {/* TOOLBAR PROFISSIONAL */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex flex-1 gap-3 w-full">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
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
                <Button className="h-12 px-8 rounded-2xl shadow-lg italic font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-black transition-all">
                    <Plus size={16} className="mr-2" /> CADASTRAR INSUMO
                </Button>
            </div>

            {/* TABELA DE ALTA DENSIDADE */}
            <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Almoxarifado...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-5">Identificação / SKU</th>
                                    <th className="px-8 py-5 text-center">Classificação</th>
                                    <th className="px-8 py-5 text-right">Saldo em Estoque</th>
                                    <th className="px-8 py-5 text-right">Valoração (Custo)</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic">Nenhum insumo encontrado.</td></tr>
                                ) : filtered.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:border-blue-100 transition-all shadow-sm">
                                                    <Tag size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs text-slate-900 uppercase italic tracking-tighter group-hover:text-blue-600 transition-colors">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SKU: {item.id.slice(-8).toUpperCase()}</span>
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
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Custo Médio Unitário</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="w-9 h-9 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 rounded-xl">
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
            <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData(prev => ({...prev, open: false}))} onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} title={confirmData.title} message={confirmData.message} />
        </div>
    );
};

export default StockIngredients;
