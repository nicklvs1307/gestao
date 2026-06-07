import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layers, Plus, Search, Trash2, Edit3, X, Loader2, 
  AlertTriangle, ChevronRight, Package
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface IngredientGroup {
  id: string;
  name: string;
  parentId: string | null;
  subGroups?: IngredientGroup[];
  _count?: { ingredients: number; subGroups: number };
}

const StockIngredientGroups: React.FC = () => {
  const [groups, setGroups] = useState<IngredientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroup, setEditingGroup] = useState<IngredientGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', parentId: '' as string | null });

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/ingredients/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreate = (parentId?: string) => {
    setIsCreating(true);
    setEditingGroup(null);
    setFormData({ name: '', parentId: parentId || null });
    setError('');
  };

  const handleEdit = (group: IngredientGroup) => {
    setIsCreating(true);
    setEditingGroup(group);
    setFormData({ name: group.name, parentId: group.parentId });
    setError('');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    try {
      setSaving(true);
      setError('');
      if (editingGroup) {
        await api.put(`/ingredients/groups/${editingGroup.id}`, formData);
        toast.success('Grupo atualizado!');
      } else {
        await api.post('/ingredients/groups', formData);
        toast.success('Grupo criado!');
      }
      setIsCreating(false);
      setEditingGroup(null);
      await loadGroups();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar grupo';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: IngredientGroup) => {
    if (!window.confirm(`Deletar o grupo "${group.name}"?`)) return;
    try {
      await api.delete(`/ingredients/groups/${group.id}`);
      toast.success('Grupo deletado!');
      await loadGroups();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao deletar grupo';
      toast.error(msg);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="text-blue-500" size={28} />
            Grupos de Ingrediente
          </h1>
          <p className="text-sm text-slate-500 mt-1">Organize seus insumos por categorias</p>
        </div>
        <Button onClick={() => handleCreate()} className="flex items-center gap-2">
          <Plus size={16} /> Novo Grupo
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input
            placeholder="Buscar grupo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-blue-500" />
                  {group.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {group._count?.ingredients || 0} ingredientes
                  {group._count?.subGroups ? ` · ${group._count.subGroups} subgrupos` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleCreate(group.id)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Adicionar subgrupo">
                  <Plus size={14} className="text-blue-500" />
                </button>
                <button onClick={() => handleEdit(group)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Editar">
                  <Edit3 size={14} className="text-slate-500" />
                </button>
                <button onClick={() => handleDelete(group)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Deletar">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {filteredGroups.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Layers size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="font-medium">Nenhum grupo encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Grupo" para começar</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
      {isCreating && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => { setIsCreating(false); setEditingGroup(null); }} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
          >
            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                    {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Classificação de Insumos</p>
                </div>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingGroup(null); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 transition-all hover:rotate-90">
                <X size={20} />
              </button>
            </header>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome do Grupo *</label>
                <input 
                  className="ui-input w-full h-12 text-sm font-bold uppercase" placeholder="Ex: Carnes, Laticínios, Verduras..."
                  value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} autoFocus
                />
              </div>

              {formData.parentId && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-2">
                  <ChevronRight size={14} className="text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Subgrupo de: <strong className="text-slate-700">{groups.find(g => g.id === formData.parentId)?.name}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" className="rounded-2xl h-12 uppercase text-[10px] font-black tracking-widest" onClick={() => { setIsCreating(false); setEditingGroup(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-12 px-8 shadow-lg uppercase text-[10px] font-black tracking-widest italic bg-slate-900 text-white hover:bg-black">
                {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                {editingGroup ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default StockIngredientGroups;
