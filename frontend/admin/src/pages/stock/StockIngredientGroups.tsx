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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
            <Layers size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium">Nenhum grupo encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Grupo" para começar</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </h2>
                <button onClick={() => { setIsCreating(false); setEditingGroup(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Carnes, Laticínios, Verduras..."
                    autoFocus
                  />
                </div>

                {formData.parentId && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                    Subgrupo de: {groups.find(g => g.id === formData.parentId)?.name}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => { setIsCreating(false); setEditingGroup(null); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                  {editingGroup ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIngredientGroups;
