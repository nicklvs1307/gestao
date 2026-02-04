import React, { useState, useEffect } from 'react';
import { addonService, AddonGroup, Addon } from '../services/api/addonService';
import { ingredientService } from '../services/api/ingredientService';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const AddonManagement: React.FC = () => {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<AddonGroup>({
    name: '',
    type: 'multiple',
    isRequired: false,
    order: 0,
    saiposIntegrationCode: '',
    addons: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, ingredientsData] = await Promise.all([
        addonService.getAll(),
        ingredientService.getAll()
      ]);
      setGroups(groupsData);
      setIngredients(ingredientsData);
    } catch (error) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (group?: AddonGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({ ...group });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        type: 'multiple',
        isRequired: false,
        order: 0,
        saiposIntegrationCode: '',
        addons: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('O nome do grupo é obrigatório.');
      return;
    }

    try {
      if (editingGroup?.id) {
        await addonService.update(editingGroup.id, formData);
        toast.success('Grupo atualizado com sucesso!');
      } else {
        await addonService.create(formData);
        toast.success('Grupo criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar grupo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
      await addonService.delete(id);
      toast.success('Grupo excluído.');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir.');
    }
  };

  const addAddonRow = () => {
    setFormData({
      ...formData,
      addons: [...formData.addons, { name: '', price: 0, maxQuantity: 1, order: formData.addons.length, ingredients: [] }]
    });
  };

  const removeAddonRow = (index: number) => {
    const newAddons = [...formData.addons];
    newAddons.splice(index, 1);
    setFormData({ ...formData, addons: newAddons });
  };

  const updateAddon = (index: number, field: keyof Addon, value: any) => {
    const newAddons = [...formData.addons];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setFormData({ ...formData, addons: newAddons });
  };

  if (loading) return <div className="p-8 text-center">Carregando Biblioteca...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Biblioteca de Complementos</h1>
          <p className="text-gray-400">Gerencie grupos de adicionais globais para seus produtos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gold hover:bg-yellow-600 text-black px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
        >
          <Plus size={20} /> Novo Grupo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-card-dark border border-white/10 rounded-xl p-5 hover:border-gold/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{group.name}</h3>
                <span className={`text-xs px-2 py-1 rounded ${group.type === 'single' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                  {group.type === 'single' ? 'Seleção Única' : 'Múltipla Escolha'}
                </span>
                {group.isRequired && <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Obrigatório</span>}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleOpenModal(group)} className="p-2 text-gray-400 hover:text-gold hover:bg-gold/10 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(group.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase font-bold">Itens ({group.addons.length})</p>
              <div className="flex flex-wrap gap-2">
                {group.addons.map((addon, i) => (
                  <span key={i} className="text-sm bg-white/5 border border-white/5 px-2 py-1 rounded text-gray-300">
                    {addon.name} (+R$ {addon.price.toFixed(2)})
                  </span>
                ))}
              </div>
            </div>
            
            {group.saiposIntegrationCode && (
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500">
                Integração: <code className="bg-black/30 px-1 rounded text-gold">{group.saiposIntegrationCode}</code>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card-dark border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Complementos'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Nome do Grupo (Ex: Escolha o Molho)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-gold outline-none"
                    placeholder="Ex: Adicionais de Burger"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Código de Integração (Saipos/iFood)</label>
                  <input
                    type="text"
                    value={formData.saiposIntegrationCode}
                    onChange={(e) => setFormData({ ...formData, saiposIntegrationCode: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-gold outline-none"
                    placeholder="Ex: COD_MOLHOS"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${formData.isRequired ? 'bg-gold' : 'bg-gray-600'}`}></div>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.isRequired ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span className="text-sm text-white font-medium">Obrigatório</span>
                </label>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={formData.type === 'single'}
                      onChange={() => setFormData({ ...formData, type: 'single' })}
                      className="accent-gold"
                    />
                    <span className="text-sm text-white">Seleção Única</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={formData.type === 'multiple'}
                      onChange={() => setFormData({ ...formData, type: 'multiple' })}
                      className="accent-gold"
                    />
                    <span className="text-sm text-white">Múltipla Escolha</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Itens do Grupo
                  </h3>
                  <button
                    onClick={addAddonRow}
                    className="text-xs bg-gold/10 text-gold border border-gold/20 px-3 py-1 rounded-full hover:bg-gold/20 transition-all flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.addons.map((addon, index) => (
                    <div key={index} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          placeholder="Nome (Ex: Bacon)"
                          value={addon.name}
                          onChange={(e) => updateAddon(index, 'name', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold"
                        />
                        <input
                          type="number"
                          placeholder="Preço"
                          value={addon.price}
                          onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value))}
                          className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold"
                        />
                        <input
                          placeholder="Cod. Int."
                          value={addon.saiposIntegrationCode}
                          onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold"
                        />
                        <div className="flex gap-2">
                           <input
                            type="number"
                            placeholder="Qtd Máx"
                            value={addon.maxQuantity}
                            onChange={(e) => updateAddon(index, 'maxQuantity', parseInt(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-gold"
                          />
                          <button onClick={() => removeAddonRow(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-lg text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-gold hover:bg-yellow-600 text-black px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-gold/20"
              >
                <Save size={20} /> Salvar Grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonManagement;
