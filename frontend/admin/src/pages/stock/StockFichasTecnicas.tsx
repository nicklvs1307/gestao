import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChefHat, Plus, Search, Trash2, Copy, Link2, Unlink, 
  Edit3, X, Loader2, Package, AlertTriangle, Calculator,
  ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  FichaTecnica,
  FichaTecnicaIngredient,
  CreateFichaTecnicaDTO,
  getAll,
  getById,
  create,
  update,
  remove,
  duplicate
} from '../../services/api/fichaTecnicaService';
import { api } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Ingredient {
  id: string;
  name: string;
  averageCost: number;
  unit: string;
  stock: number;
}

const StockFichasTecnicas: React.FC = () => {
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFicha, setEditingFicha] = useState<FichaTecnica | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateFichaTecnicaDTO>({
    name: '',
    description: '',
    yieldAmount: 1,
    ingredients: []
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fichasData, ingredientsData] = await Promise.all([
        getAll(searchTerm || undefined),
        api.get('/ingredients')
      ]);
      setFichas(fichasData);
      setAvailableIngredients(ingredientsData.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingFicha(null);
    setFormData({
      name: '',
      description: '',
      yieldAmount: 1,
      ingredients: []
    });
    setError('');
  };

  const handleEdit = async (ficha: FichaTecnica) => {
    try {
      const fullFicha = await getById(ficha.id);
      setEditingFicha(fullFicha);
      setIsCreating(true);
      setFormData({
        name: fullFicha.name,
        description: fullFicha.description || '',
        yieldAmount: fullFicha.yieldAmount,
        ingredients: fullFicha.ingredients.map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity
        }))
      });
      setError('');
    } catch (err) {
      console.error('Erro ao carregar ficha:', err);
    }
  };

  const handleDuplicate = async (ficha: FichaTecnica) => {
    try {
      await duplicate(ficha.id);
      await loadData();
    } catch (err) {
      console.error('Erro ao duplicar ficha:', err);
      setError('Erro ao duplicar ficha');
    }
  };

  const handleDelete = async (ficha: FichaTecnica) => {
    if (!window.confirm(`Deletar a ficha técnica "${ficha.name}"?`)) return;
    
    try {
      await remove(ficha.id);
      await loadData();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao deletar ficha';
      setError(message);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (formData.ingredients.length === 0) {
      setError('Adicione pelo menos 1 ingrediente');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      if (editingFicha) {
        await update(editingFicha.id, formData);
      } else {
        await create(formData);
      }
      
      setIsCreating(false);
      setEditingFicha(null);
      await loadData();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao salvar ficha';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientId: '', quantity: 0 }]
    }));
  };

  const updateIngredient = (index: number, field: 'ingredientId' | 'quantity', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const calcTotalCost = () => {
    return formData.ingredients.reduce((sum, item) => {
      const ingredient = availableIngredients.find(i => i.id === item.ingredientId);
      return sum + ((ingredient?.averageCost || 0) * item.quantity);
    }, 0);
  };

  const calcCostPerUnit = () => {
    const total = calcTotalCost();
    return formData.yieldAmount > 0 ? total / formData.yieldAmount : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ChefHat className="text-blue-500" size={28} />
            Fichas Técnicas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Receitas e composição dos produtos
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Nova Ficha
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input
            placeholder="Buscar ficha técnica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fichas.map((ficha) => (
          <Card key={ficha.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{ficha.name}</h3>
                {ficha.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ficha.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(ficha)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit3 size={14} className="text-slate-500" />
                </button>
                <button
                  onClick={() => handleDuplicate(ficha)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplicar"
                >
                  <Copy size={14} className="text-slate-500" />
                </button>
                <button
                  onClick={() => handleDelete(ficha)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="Deletar"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Rendimento:</span>
                <span className="font-medium">{ficha.yieldAmount} porções</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Custo Total:</span>
                <span className="font-medium text-blue-600">
                  R$ {ficha.costPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Custo/porção:</span>
                <span className="font-medium">
                  R$ {(ficha.yieldAmount > 0 ? ficha.costPrice / ficha.yieldAmount : 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ingredientes:</span>
                <span className="font-medium">{ficha.ingredients?.length || 0}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <Package size={12} />
                {ficha._count?.products || 0} produtos
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <Link2 size={12} />
                {ficha._count?.addons || 0} adicionais
              </div>
            </div>
          </Card>
        ))}

        {fichas.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <ChefHat size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="font-medium">Nenhuma ficha técnica encontrada</p>
            <p className="text-sm mt-1">Clique em "Nova Ficha" para começar</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
      {isCreating && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => { setIsCreating(false); setEditingFicha(null); }} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <ChefHat size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                    {editingFicha ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Composição do Prato</p>
                </div>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingFicha(null); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200 transition-all hover:rotate-90">
                <X size={20} />
              </button>
            </header>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome *</label>
                  <input className="ui-input w-full h-12 text-sm font-bold uppercase" placeholder="Ex: Hambúrguer Clássico" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descrição</label>
                  <input className="ui-input w-full h-12 text-sm font-bold" placeholder="Descrição opcional" value={formData.description || ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rendimento (porções)</label>
                <input type="number" min="1" className="ui-input w-full h-12 text-sm font-bold" value={formData.yieldAmount} onChange={e => setFormData(prev => ({ ...prev, yieldAmount: Number(e.target.value) || 1 }))} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                    <Package size={14} className="text-slate-500" /> Ingredientes *
                  </label>
                  <button type="button" onClick={addIngredient} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-1.5">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>

                <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50/30">
                  <div className="divide-y divide-slate-100">
                    {formData.ingredients.map((item, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 px-4">
                        <select value={item.ingredientId} onChange={e => updateIngredient(index, 'ingredientId', e.target.value)} className="flex-1 ui-input h-10 text-[10px] font-bold uppercase bg-white border-slate-200">
                          <option value="">Selecione...</option>
                          {availableIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} (R$ {ing.averageCost.toFixed(2)}/{ing.unit})</option>)}
                        </select>
                        <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateIngredient(index, 'quantity', Number(e.target.value) || 0)} className="ui-input w-20 h-10 text-xs font-bold text-center bg-white border-slate-200" placeholder="Qtd" />
                        <button type="button" onClick={() => removeIngredient(index)} className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.ingredients.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6 italic">Nenhum ingrediente adicionado</p>
                )}
              </div>

              {formData.ingredients.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Custo Total</span>
                    <span className="text-xl font-black italic tracking-tighter text-slate-900">R$ {calcTotalCost().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Custo por Porção</span>
                    <span className="text-lg font-black italic tracking-tighter text-slate-900">R$ {calcCostPerUnit().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" className="rounded-2xl h-12 uppercase text-[10px] font-black tracking-widest" onClick={() => { setIsCreating(false); setEditingFicha(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-12 px-8 shadow-lg uppercase text-[10px] font-black tracking-widest italic bg-slate-900 text-white hover:bg-black">
                {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                {editingFicha ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default StockFichasTecnicas;
