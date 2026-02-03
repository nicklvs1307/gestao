import React, { useState, useEffect } from 'react';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient } from '../services/api';
import { 
  Plus, Search, Edit2, Trash2, Save, X, 
  Scale, AlertTriangle, Package, History, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const IngredientManagement: React.FC = () => {
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic">
                        <Scale className="text-primary" size={28} /> Gestão de Insumos
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Controle de estoque bruto e ficha técnica.</p>
                </div>
                
                <button 
                    onClick={() => { setEditingIngredient(null); setFormData({ name: '', unit: 'un', stock: 0, minStock: 0, lastUnitCost: 0 }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                    <Plus size={18} /> Novo Insumo
                </button>
            </div>

            {/* Barra de Pesquisa e Stats Rápidos */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar insumo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-primary transition-all font-bold text-slate-700 shadow-sm"
                    />
                </div>
                <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center animate-pulse"><AlertTriangle size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase">Estoque Baixo</p>
                        <p className="text-lg font-black text-amber-900 leading-none">{ingredients.filter(i => i.stock <= i.minStock).length} itens</p>
                    </div>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl flex items-center gap-4 text-white">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Package size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Cadastrado</p>
                        <p className="text-lg font-black leading-none">{ingredients.length} insumos</p>
                    </div>
                </div>
            </div>

            {/* Tabela de Insumos */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Insumo / Unidade</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque Atual</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mínimo</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Custo Últ. Compra</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(ing => (
                            <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase">{ing.unit}</div>
                                        <span className="font-bold text-slate-700 uppercase">{ing.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full font-black text-xs",
                                        ing.stock <= ing.minStock ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                                    )}>
                                        {ing.stock} {ing.unit}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-400 text-sm">{ing.minStock} {ing.unit}</td>
                                <td className="px-6 py-4 font-black text-slate-900 text-sm italic">R$ {Number(ing.lastUnitCost || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(ing)} className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(ing.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-slate-300">
                        <RefreshCw size={40} className="mb-4 opacity-20" />
                        <p className="font-black text-xs uppercase tracking-widest">Nenhum insumo encontrado</p>
                    </div>
                )}
            </div>

            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{editingIngredient ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome do Insumo</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-primary outline-none transition-all"
                                        placeholder="Ex: Pão de Hambúrguer"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Unidade</label>
                                        <select 
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-primary outline-none transition-all appearance-none"
                                            value={formData.unit}
                                            onChange={e => setFormData({...formData, unit: e.target.value})}
                                        >
                                            <option value="un">Unidade (un)</option>
                                            <option value="kg">Quilograma (kg)</option>
                                            <option value="gr">Grama (gr)</option>
                                            <option value="lt">Litro (lt)</option>
                                            <option value="ml">Mililitro (ml)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Custo Unit. (R$)</label>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-primary outline-none transition-all"
                                            value={formData.lastUnitCost}
                                            onChange={e => setFormData({...formData, lastUnitCost: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Estoque Atual</label>
                                        <input 
                                            type="number" step="0.001"
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-primary outline-none transition-all"
                                            value={formData.stock}
                                            onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Estoque Mínimo</label>
                                        <input 
                                            type="number" step="0.001"
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-slate-900 focus:border-primary outline-none transition-all"
                                            value={formData.minStock}
                                            onChange={e => setFormData({...formData, minStock: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 italic">
                                    <Save size={18} /> Salvar Insumo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientManagement;
