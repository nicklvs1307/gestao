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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
            <ChefHat size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium">Nenhuma ficha técnica encontrada</p>
            <p className="text-sm mt-1">Clique em "Nova Ficha" para começar</p>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingFicha ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
                </h2>
                <button
                  onClick={() => { setIsCreating(false); setEditingFicha(null); }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Hambúrguer Clássico"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rendimento (porções)</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.yieldAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, yieldAmount: Number(e.target.value) || 1 }))}
                  />
                </div>

                {/* Ingredientes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Ingredientes *</label>
                    <Button onClick={addIngredient} size="sm" variant="outline">
                      <Plus size={14} className="mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formData.ingredients.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateIngredient(index, 'ingredientId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione...</option>
                          {availableIngredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} (R$ {ing.averageCost.toFixed(2)}/{ing.unit})
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value) || 0)}
                          className="w-24"
                          placeholder="Qtd"
                        />
                        <button
                          onClick={() => removeIngredient(index)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    ))}

                    {formData.ingredients.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nenhum ingrediente adicionado
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumo de custo */}
                {formData.ingredients.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Custo Total:</span>
                      <span className="font-bold text-blue-600">R$ {calcTotalCost().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Custo por Porção:</span>
                      <span className="font-bold">R$ {calcCostPerUnit().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setIsCreating(false); setEditingFicha(null); }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : null}
                  {editingFicha ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockFichasTecnicas;
