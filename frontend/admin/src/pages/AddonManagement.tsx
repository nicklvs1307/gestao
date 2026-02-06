import React, { useState, useEffect } from 'react';
import { addonService, AddonGroup, Addon } from '../services/api/addonService';
import { getIngredients } from '../services/api';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableGroupProps {
  group: AddonGroup;
  onEdit: (group: AddonGroup) => void;
  onDelete: (id: string) => void;
}

const SortableGroupCard = ({ group, onEdit, onDelete }: SortableGroupProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: group.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "bg-card-dark border border-white/10 rounded-xl p-5 hover:border-gold/50 transition-all group relative",
        isDragging && "opacity-50 border-gold shadow-2xl z-50 scale-105"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <button 
            {...attributes} 
            {...listeners}
            className="mt-1 p-1 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gold transition-colors"
          >
            <GripVertical size={18} />
          </button>
          <div>
            <h3 className="text-lg font-bold text-white">{group.name}</h3>
            <span className={`text-xs px-2 py-1 rounded ${group.type === 'single' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {group.type === 'single' ? 'Seleção Única' : 'Múltipla Escolha'}
            </span>
            {group.isRequired && <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Obrigatório</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(group)} className="p-2 text-gray-400 hover:text-gold hover:bg-gold/10 rounded-lg">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(group.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2 pl-8">
        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Itens ({group.addons.length})</p>
        <div className="flex flex-wrap gap-2">
          {group.addons.map((addon, i) => (
            <span key={i} className="text-[10px] font-bold uppercase bg-white/5 border border-white/5 px-2 py-1 rounded text-gray-400">
              {addon.name}
            </span>
          ))}
        </div>
      </div>
      
      {group.saiposIntegrationCode && (
        <div className="mt-4 pt-4 border-t border-white/5 text-[9px] uppercase font-black text-gray-600 tracking-widest">
          Integração: <span className="text-gold">{group.saiposIntegrationCode}</span>
        </div>
      )}
    </div>
  );
};

const AddonManagement: React.FC = () => {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        getIngredients()
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setIngredients(ingredientsData);
    } catch (error) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      const newOrder = arrayMove(groups, oldIndex, newIndex);
      setGroups(newOrder);
      try {
        setIsReordering(true);
        const updates = newOrder.map((g, index) => ({ id: g.id!, order: index }));
        await addonService.reorder(updates);
      } catch (error) {
        toast.error('Falha ao salvar ordem.');
        fetchData();
      } finally {
        setIsReordering(false);
      }
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
        toast.success('Grupo atualizado!');
      } else {
        await addonService.create(formData);
        toast.success('Grupo criado!');
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

  const moveAddon = (index: number, direction: 'up' | 'down') => {
    const newAddons = [...formData.addons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newAddons.length) return;
    [newAddons[index], newAddons[targetIndex]] = [newAddons[targetIndex], newAddons[index]];
    setFormData({ ...formData, addons: newAddons.map((a, i) => ({ ...a, order: i })) });
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
    setFormData({ ...formData, addons: newAddons.map((a, i) => ({ ...a, order: i })) });
  };

  const updateAddon = (index: number, field: keyof Addon, value: any) => {
    const newAddons = [...formData.addons];
    newAddons[index] = { ...newAddons[index], [field]: value };
    setFormData({ ...formData, addons: newAddons });
  };

  if (loading && !isReordering) return <div className="p-8 text-center text-white animate-pulse font-black uppercase tracking-widest text-xs">Carregando Biblioteca...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-card-dark border border-white/10 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Biblioteca de Complementos</h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Arraste os cards para reordenar a exibição.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gold hover:bg-yellow-600 text-black px-6 h-12 rounded-xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-gold/20"
        >
          <Plus size={20} /> Novo Grupo
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map(g => g.id!)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <SortableGroupCard 
                key={group.id} 
                group={group} 
                onEdit={handleOpenModal} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {groups.length === 0 && (
        <div className="text-center py-20 bg-card-dark border border-dashed border-white/10 rounded-3xl">
           <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Nenhum grupo cadastrado</p>
        </div>
      )}

      {isReordering && (
        <div className="fixed bottom-10 right-10 bg-gold text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest">Salvando ordem...</span>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-card-dark border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white"><X /></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nome do Grupo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-gold outline-none transition-all font-bold"
                    placeholder="Ex: Escolha a Borda"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Código Saipos/iFood</label>
                  <input
                    type="text"
                    value={formData.saiposIntegrationCode}
                    onChange={(e) => setFormData({ ...formData, saiposIntegrationCode: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-gold outline-none transition-all font-bold"
                    placeholder="Ex: BORDAS_01"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-8 items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isRequired}
                      onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${formData.isRequired ? 'bg-gold' : 'bg-gray-700'}`}></div>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isRequired ? 'translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-xs text-white font-black uppercase tracking-widest">Obrigatório</span>
                </label>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={formData.type === 'single'} onChange={() => setFormData({ ...formData, type: 'single' })} className="accent-gold w-4 h-4" />
                    <span className="text-xs text-white font-black uppercase tracking-widest">Única</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={formData.type === 'multiple'} onChange={() => setFormData({ ...formData, type: 'multiple' })} className="accent-gold w-4 h-4" />
                    <span className="text-xs text-white font-black uppercase tracking-widest">Múltipla</span>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Itens do Grupo</h3>
                  <button onClick={addAddonRow} className="bg-gold/10 text-gold border border-gold/20 px-4 py-2 rounded-xl hover:bg-gold/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Plus size={14} /> Novo Item</button>
                </div>

                <div className="space-y-3">
                  {formData.addons.map((addon, index) => (
                    <div key={index} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/[0.08] transition-all">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                            placeholder="Nome"
                            value={addon.name}
                            onChange={(e) => updateAddon(index, 'name', e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-gold font-bold"
                            />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold text-[10px] font-bold">R$</span>
                                <input
                                type="number"
                                placeholder="Preço"
                                value={addon.price}
                                onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-gold font-bold"
                                />
                            </div>
                            <input
                            placeholder="Cód. Integração"
                            value={addon.saiposIntegrationCode}
                            onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-gold font-bold"
                            />
                            <input
                            type="number"
                            placeholder="Qtd Máx"
                            value={addon.maxQuantity}
                            onChange={(e) => updateAddon(index, 'maxQuantity', parseInt(e.target.value))}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-gold font-bold"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => moveAddon(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-gold disabled:opacity-20 transition-colors"><ChevronUp size={16} /></button>
                            <button onClick={() => moveAddon(index, 'down')} disabled={index === formData.addons.length - 1} className="p-1.5 text-gray-500 hover:text-gold disabled:opacity-20 transition-colors"><ChevronDown size={16} /></button>
                          </div>
                          <button onClick={() => removeAddonRow(index)} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/10 bg-black/40 flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleSave} className="bg-gold hover:bg-yellow-600 text-black px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-gold/20 transition-all active:scale-95"><Save size={20} /> Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonManagement;
