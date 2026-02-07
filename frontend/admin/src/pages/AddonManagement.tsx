import React, { useState, useEffect } from 'react';
import { addonService, AddonGroup, Addon } from '../services/api/addonService';
import { getIngredients } from '../services/api';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical, Loader2, List, Settings, CheckCircle, Info, RefreshCw } from 'lucide-react';
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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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
        "animate-in fade-in zoom-in-95 duration-300",
        isDragging && "z-50"
      )}
    >
      <Card 
        className={cn(
            "p-0 overflow-hidden border-2 transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1 bg-white",
            isDragging ? "border-orange-500 scale-105 shadow-orange-900/20" : "border-slate-100"
        )}
        noPadding
      >
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <button 
                        {...attributes} 
                        {...listeners}
                        className="p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-xl"
                    >
                        <GripVertical size={18} />
                    </button>
                    <div>
                        <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none">{group.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-widest",
                                group.type === 'single' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                                {group.type === 'single' ? 'Seleção Única' : 'Múltipla'}
                            </span>
                            {group.isRequired && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 tracking-widest">Obrigatório</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-50" onClick={() => onEdit(group)}><Edit2 size={14}/></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-rose-50 text-rose-500" onClick={() => onDelete(group.id!)}><Trash2 size={14}/></Button>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Itens no Grupo ({group.addons.length})</p>
                <div className="flex flex-wrap gap-2">
                    {group.addons.slice(0, 6).map((addon, i) => (
                        <span key={i} className="text-[10px] font-bold uppercase italic bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                            {addon.name}
                        </span>
                    ))}
                    {group.addons.length > 6 && (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic px-2 py-1">+{group.addons.length - 6} mais</span>
                    )}
                </div>
            </div>
            
            {group.saiposIntegrationCode && (
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Integração: <b className="text-orange-500">{group.saiposIntegrationCode}</b></span>
                    <Settings size={14} className="text-slate-200" />
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

const AddonManagement: React.FC = () => {
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [formData, setFormData] = useState<AddonGroup>({
    name: '', type: 'multiple', isRequired: false, order: 0, saiposIntegrationCode: '', addons: []
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, ingredientsData] = await Promise.all([ addonService.getAll(), getIngredients() ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setIngredients(ingredientsData);
    } catch (error) { toast.error('Erro ao carregar dados.'); }
    finally { setLoading(false); }
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
        toast.success("Ordem atualizada!");
      } catch (error) { toast.error('Falha ao salvar ordem.'); fetchData(); }
      finally { setIsReordering(false); }
    }
  };

  const handleOpenModal = (group?: AddonGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({ ...group });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', type: 'multiple', isRequired: false, order: 0, saiposIntegrationCode: '', addons: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error('O nome do grupo é obrigatório.');
    try {
      if (editingGroup?.id) await addonService.update(editingGroup.id, formData);
      else await addonService.create(formData);
      toast.success(editingGroup ? 'Grupo atualizado!' : 'Grupo criado!');
      setIsModalOpen(false);
      fetchData();
    } catch (error) { toast.error('Erro ao salvar.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo permanentemente?')) return;
    try {
      await addonService.delete(id);
      toast.success('Grupo removido.');
      fetchData();
    } catch (error) { toast.error('Erro ao excluir.'); }
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

  if (loading && !isReordering) return (
      <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Biblioteca...</span>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Complementos</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <List size={14} className="text-orange-500" /> Biblioteca de Adicionais e Personalização
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white rounded-xl" onClick={fetchData}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={() => handleOpenModal()} className="rounded-xl px-6 italic">
                <Plus size={18} /> NOVO GRUPO
            </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map(g => g.id!)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groups.map((group) => (
              <SortableGroupCard 
                key={group.id} 
                group={group} 
                onEdit={handleOpenModal} 
                onDelete={handleDelete} 
              />
            ))}
            {/* Card de Adicionar Rápido */}
            <Card 
                onClick={() => handleOpenModal()}
                className="p-6 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/30 transition-all duration-300 min-h-[200px]"
            >
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-500 transition-all">
                    <Plus size={24} />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-orange-600 transition-colors">Novo Grupo</p>
            </Card>
          </div>
        </SortableContext>
      </DndContext>

      {groups.length === 0 && (
        <Card className="p-24 flex flex-col items-center justify-center text-slate-300 opacity-20 border-dashed border-2">
            <List size={64} strokeWidth={1} className="mb-4" />
            <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhuma configuração ativa</p>
        </Card>
      )}

      {isReordering && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Salvando nova ordem...</span>
        </div>
      )}

      {/* Modal de Cadastro Premium */}
      {isModalOpen && (
        <div className="ui-modal-overlay">
          <div className="ui-modal-content w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header Master */}
            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                            {editingGroup ? 'Editar Estrutura' : 'Novo Grupo de Adicionais'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Configuração de Regras e Itens</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full bg-slate-50"><X size={24} /></Button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input label="Nome do Grupo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Escolha o Ponto da Carne" required />
                    <Input label="Código de Integração" value={formData.saiposIntegrationCode} onChange={e => setFormData({ ...formData, saiposIntegrationCode: e.target.value })} placeholder="Ex: REF_PONTO_01" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade de Escolha</label>
                        <div className="flex p-1 bg-white border border-slate-100 rounded-xl gap-1">
                            <button type="button" onClick={() => setFormData({...formData, type: 'single'})} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", formData.type === 'single' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}>Única (Rádio)</button>
                            <button type="button" onClick={() => setFormData({...formData, type: 'multiple'})} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", formData.type === 'multiple' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50")}>Múltipla (Check)</button>
                        </div>
                    </div>
                    
                    <div className="flex items-end">
                        <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center gap-3 w-full h-12 flex-row", formData.isRequired ? "border-rose-500 bg-rose-50" : "border-slate-100 bg-white")} onClick={() => setFormData({...formData, isRequired: !formData.isRequired})}>
                            <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all", formData.isRequired ? "bg-rose-500 border-rose-500" : "border-slate-300")}>{formData.isRequired && <CheckCircle size={14} className="text-white" />}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Este grupo é OBRIGATÓRIO</span>
                        </Card>
                    </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-900 uppercase italic flex items-center gap-2"><Info size={16} className="text-orange-500" /> Itens e Preços individuais</h4>
                        <Button variant="outline" size="sm" onClick={addAddonRow} className="rounded-xl border-orange-500 text-orange-600 hover:bg-orange-50 gap-2 font-black italic"><Plus size={14} /> ADICIONAR ITEM</Button>
                    </div>

                    <div className="space-y-3">
                        {formData.addons.map((addon, index) => (
                            <div key={index} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:border-orange-500/20 transition-all shadow-sm group">
                                <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                        <Input label="Nome do Item" placeholder="Ex: Bacon Extra" value={addon.name} onChange={(e) => updateAddon(index, 'name', e.target.value)} />
                                        <Input label="Preço (R$)" type="number" step="0.01" value={addon.price} onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value))} />
                                        <Input label="Cód. Integração" value={addon.saiposIntegrationCode} onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)} />
                                        <Input label="Qtd Máx" type="number" value={addon.maxQuantity} onChange={(e) => updateAddon(index, 'maxQuantity', parseInt(e.target.value))} />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex flex-col gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => moveAddon(index, 'up')} disabled={index === 0} className="h-8 w-8 rounded-lg bg-slate-50 disabled:opacity-20"><ChevronUp size={16} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => moveAddon(index, 'down')} disabled={index === formData.addons.length - 1} className="h-8 w-8 rounded-lg bg-slate-50 disabled:opacity-20"><ChevronDown size={16} /></Button>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeAddonRow(index)} className="h-12 w-12 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={20} /></Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.addons.length === 0 && (
                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Nenhum item adicionado a este grupo</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Fixo */}
            <footer className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">CANCELAR</Button>
                <Button onClick={handleSave} className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">
                    <Save size={20} className="mr-2" /> SALVAR ALTERAÇÕES
                </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonManagement;