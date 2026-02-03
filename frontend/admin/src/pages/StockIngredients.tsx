import React, { useState, useEffect } from 'react';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from '../services/api';
import { 
  Plus, Search, Edit2, Trash2, Save, X, 
  Scale, AlertTriangle, Package, History, RefreshCw,
  ArrowRight, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const StockIngredients: React.FC = () => {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        unit: 'un',
        stock: 0,
        minStock: 0,
        lastUnitCost: 0
    });

    const loadIngredients = async () => {
        setLoading(true);
        try {
            const data = await getIngredients();
            setIngredients(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIngredients();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                stock: Number(formData.stock),
                minStock: Number(formData.minStock),
                lastUnitCost: Number(formData.lastUnitCost)
            };

            if (editingIngredient) {
                await updateIngredient(editingIngredient.id, payload);
                toast.success("Insumo atualizado!");
            } else {
                await createIngredient(payload);
                toast.success("Insumo cadastrado!");
            }
            setIsModalOpen(false);
            setEditingIngredient(null);
            setFormData({ name: '', unit: 'un', stock: 0, minStock: 0, lastUnitCost: 0 });
            loadIngredients();
        } catch (e) {
            toast.error("Erro ao salvar insumo");
        }
    };

    const handleEdit = (ing: any) => {
        setEditingIngredient(ing);
        setFormData({
            name: ing.name,
            unit: ing.unit,
            stock: ing.stock,
            minStock: ing.minStock || 0,
            lastUnitCost: ing.lastUnitCost || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir este insumo? Isso pode afetar as fichas técnicas.")) return;
        try {
            await deleteIngredient(id);
            loadIngredients();
            toast.success("Insumo excluído.");
        } catch (e) {
            toast.error("Erro ao excluir. Verifique se ele está em uso.");
        }
    };

    const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic flex items-center gap-3">
                        <Scale size={32} className="text-primary" /> Ingredientes e Insumos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Controle de estoque de matéria-prima e custo de produção.</p>
                </div>
                
                <button 
                    onClick={() => { setEditingIngredient(null); setFormData({ name: '', unit: 'un', stock: 0, minStock: 0, lastUnitCost: 0 }); setIsModalOpen(true); }}
                    className="bg-slate-900 dark:bg-primary text-white px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3"
                >
                    <Plus size={20} /> Novo Insumo
                </button>
            </div>

            {/* Stats e Pesquisa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                            <Search size={14} /> Localizar Insumo
                        </h3>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-14 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/20 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-none animate-pulse">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Atenção</p>
                            <p className="text-xl font-black text-amber-900 dark:text-amber-400 tracking-tight">
                                {ingredients.filter(i => i.stock <= i.minStock).length} em estoque baixo
                            </p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                            <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-widest text-sm">Lista de Insumos</h3>
                            <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase">
                                {filtered.length} Itens
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                        <th className="px-8 py-6">Insumo / Unidade</th>
                                        <th className="px-8 py-6">Saldo Atual</th>
                                        <th className="px-8 py-6">Custo Médio</th>
                                        <th className="px-8 py-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {filtered.map(ing => (
                                        <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase">{ing.unit}</div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-sm">{ing.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full font-black text-[10px] uppercase self-start border shadow-sm",
                                                        ing.stock <= ing.minStock ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    )}>
                                                        {ing.stock} {ing.unit}
                                                    </span>
                                                    {ing.stock <= ing.minStock && (
                                                        <p className="text-[8px] text-red-400 font-bold uppercase mt-1">Reposição necessária!</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-900 dark:text-white text-sm italic">R$ {Number(ing.lastUnitCost || 0).toFixed(2)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Última compra</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(ing)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-2xl transition-all"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(ing.id)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{editingIngredient ? 'Editar' : 'Novo'} Insumo</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Nome do Insumo</label>
                                <input 
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                    placeholder="Ex: Farinha de Trigo Tipo 1"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Unidade</label>
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all appearance-none"
                                        value={formData.unit}
                                        onChange={e => setFormData({...formData, unit: e.target.value})}
                                    >
                                        <option value="un">Unidade (un)</option>
                                        <option value="kg">Quilo (kg)</option>
                                        <option value="gr">Grama (gr)</option>
                                        <option value="lt">Litro (lt)</option>
                                        <option value="ml">Mililitro (ml)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Custo Unitário R$</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                        value={formData.lastUnitCost}
                                        onChange={e => setFormData({...formData, lastUnitCost: parseFloat(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Estoque Atual</label>
                                    <input 
                                        type="number" step="0.001"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                        value={formData.stock}
                                        onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Estoque Mínimo</label>
                                    <input 
                                        type="number" step="0.001"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-14 px-5 text-sm font-bold focus:border-primary outline-none transition-all"
                                        value={formData.minStock}
                                        onChange={e => setFormData({...formData, minStock: parseFloat(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 italic">Cancelar</button>
                            <button type="submit" className="flex-[2] h-14 bg-slate-900 dark:bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 italic">
                                <Save size={20} /> Salvar Insumo
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default StockIngredients;
