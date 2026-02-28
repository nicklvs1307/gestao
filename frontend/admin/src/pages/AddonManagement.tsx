import React, { useState, useEffect } from 'react';
import { addonService } from '../services/api/addonService';
import type { AddonGroup, Addon } from '../services/api/addonService';
import { getIngredients } from '../services/api';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical, Loader2, List, Settings, CheckCircle, Info, RefreshCw, Copy, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
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
  onDuplicate: (id: string) => void;
}

const SortableGroupCard = ({ group, onEdit, onDelete, onDuplicate }: SortableGroupProps) => {
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
            "p-0 overflow-hidden border transition-all duration-300 group hover:shadow-lg bg-white",
            isDragging ? "border-orange-500 scale-105 shadow-xl" : "border-slate-200"
        )}
        noPadding
      >
        <div className="p-4">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <button 
                        {...attributes} 
                        {...listeners}
                        className="p-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-orange-500 transition-colors bg-slate-50 rounded-lg"
                    >
                        <GripVertical size={16} />
                    </button>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900 uppercase italic tracking-tight leading-none">{group.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={cn(
                                "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider",
                                group.type === 'single' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                                {group.type === 'single' ? 'Única' : 'Múltipla'}
                            </span>
                            {group.isRequired && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 tracking-wider">Obrigatório</span>
                            )}
                            {group.isFlavorGroup && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 tracking-wider">Sabor/Pizza</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onDuplicate(group.id!)} title="Duplicar"><Copy size={14}/></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onEdit(group)} title="Editar"><Edit2 size={14}/></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500" onClick={() => onDelete(group.id!)} title="Excluir"><Trash2 size={14}/></Button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Itens ({group.addons.length})</p>
                <div className="flex flex-wrap gap-1.5">
                    {group.addons.slice(0, 8).map((addon, i) => (
                        <span key={i} className="text-[10px] font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                            {addon.name}
                        </span>
                    ))}
                    {group.addons.length > 8 && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase px-1 py-0.5">+{group.addons.length - 8}</span>
                    )}
                </div>
            </div>
            
            {group.saiposIntegrationCode && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cód: <b className="text-orange-500">{group.saiposIntegrationCode}</b></span>
                    <Settings size={12} className="text-slate-300" />
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

import { uploadProductImage } from '../services/api/products';

const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || (window.location.origin.replace('5173', '3001'));
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface SortableAddonRowProps {
  addon: Addon;
  index: number;
  updateAddon: (index: number, field: keyof Addon, value: any) => void;
  removeAddonRow: (index: number) => void;
}

const SortableAddonRow = ({ addon, index, updateAddon, removeAddonRow }: SortableAddonRowProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `addon-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
        const data = await uploadProductImage(file);
        updateAddon(index, 'imageUrl', data.imageUrl);
        toast.success("Imagem enviada!");
    } catch (error) {
        toast.error("Erro no upload.");
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-orange-500/30 transition-all shadow-sm group">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button 
                type="button"
                {...attributes} 
                {...listeners}
                className="p-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-lg shrink-0"
            >
                <GripVertical size={16} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1">
                <div className="md:col-span-4">
                    <Input 
                        placeholder="Nome do Item (ex: Bacon)" 
                        value={addon.name} 
                        onChange={(e) => updateAddon(index, 'name', e.target.value)} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-2">
                    <Input 
                        type="number" 
                        placeholder="Preço R$" 
                        step="0.01" 
                        value={addon.price} 
                        onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value))} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-2">
                    <Input 
                        placeholder="Cód Integração" 
                        value={addon.saiposIntegrationCode} 
                        onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-1">
                    <Input 
                        type="number" 
                        placeholder="Qtd Máx" 
                        value={addon.maxQuantity} 
                        onChange={(e) => updateAddon(index, 'maxQuantity', parseInt(e.target.value))} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                    <div className="relative flex-1 group/img">
                        <Input 
                            placeholder="URL ou Upload" 
                            value={addon.imageUrl || ''} 
                            onChange={(e) => updateAddon(index, 'imageUrl', e.target.value)} 
                            className="h-9 text-[10px] pr-8"
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>

                    {addon.imageUrl && (
                        <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                            <img src={getImageUrl(addon.imageUrl)} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeAddonRow(index)} className="h-9 w-9 bg-rose-50 text-rose-500 rounded-lg shrink-0"><Trash2 size={16} /></Button>
                </div>
            </div>
          </div>
          
          <div className="pl-11 grid grid-cols-1 md:grid-cols-12 gap-3">
             <div className="md:col-span-12">
                 <Input 
                    placeholder="Descrição do item (opcional)" 
                    value={addon.description || ''} 
                    onChange={(e) => updateAddon(index, 'description', e.target.value)} 
                    className="h-8 text-[10px]"
                />
             </div>
          </div>
        </div>
      </div>
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
    name: '', type: 'multiple', isRequired: false, isFlavorGroup: false, minQuantity: 0, maxQuantity: 1, order: 0, saiposIntegrationCode: '', addons: []
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

  const handleDuplicate = async (id: string) => {
    try {
      setLoading(true);
      await addonService.duplicate(id);
      toast.success('Grupo duplicado com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao duplicar grupo.');
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
      setFormData({ name: '', type: 'multiple', isRequired: false, isFlavorGroup: false, minQuantity: 0, maxQuantity: 1, order: 0, saiposIntegrationCode: '', addons: [] });
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

  const addAddonRow = () => {
    setFormData({
      ...formData,
      addons: [...formData.addons, { name: '', price: 0, maxQuantity: 1, order: formData.addons.length, ingredients: [], description: '', imageUrl: '' }]
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Complementos</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <List size={12} className="text-orange-500" /> Biblioteca de Adicionais e Personalização
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white rounded-lg h-10 w-10 p-0" onClick={fetchData}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={() => handleOpenModal()} className="rounded-lg px-4 italic h-10 text-xs">
                <Plus size={16} /> NOVO GRUPO
            </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map(g => g.id!)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => (
              <SortableGroupCard 
                key={group.id} 
                group={group} 
                onEdit={handleOpenModal} 
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
            {/* Card de Adicionar Rápido */}
            <button 
                onClick={() => handleOpenModal()}
                className="p-4 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/30 transition-all duration-300 min-h-[140px] rounded-xl"
            >
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-500 transition-all">
                    <Plus size={20} />
                </div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em] group-hover:text-orange-600 transition-colors">Novo Grupo</p>
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {groups.length === 0 && (
        <Card className="p-12 flex flex-col items-center justify-center text-slate-300 opacity-20 border-dashed border-2">
            <List size={48} strokeWidth={1} className="mb-4" />
            <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhuma configuração ativa</p>
        </Card>
      )}

      {isReordering && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em] italic">Salvando nova ordem...</span>
        </div>
      )}

      {/* Modal de Cadastro Premium */}
      {isModalOpen && (
        <div className="ui-modal-overlay">
          <div className="ui-modal-content w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl rounded-2xl">
            {/* Header Master */}
            <header className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                            {editingGroup ? 'Editar Estrutura' : 'Novo Grupo'}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Configuração de Regras e Itens</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full bg-slate-50 h-8 w-8"><X size={18} /></Button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                         <Input label="Nome do Grupo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Escolha o Sabor" required className="h-10 text-xs" />
                    </div>
                    <div>
                        <Input label="Cód. Integração" value={formData.saiposIntegrationCode} onChange={e => setFormData({ ...formData, saiposIntegrationCode: e.target.value })} placeholder="Ex: PIZZA_SABORES" className="h-10 text-xs" />
                    </div>
                    <div className="flex items-end gap-3">
                         <Card className={cn("p-2 border transition-all cursor-pointer flex items-center gap-2 w-full h-10 flex-row mb-[1px]", formData.isFlavorGroup ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white")} onClick={() => setFormData({...formData, isFlavorGroup: !formData.isFlavorGroup})}>
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", formData.isFlavorGroup ? "bg-amber-500 border-amber-500" : "border-slate-300")}>{formData.isFlavorGroup && <CheckCircle size={10} className="text-white" />}</div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Grupo de SABORES (Pizza)</span>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block">Tipo de Escolha</label>
                        <div className="flex p-1 bg-white border border-slate-200 rounded-lg gap-1">
                            <button type="button" onClick={() => setFormData({...formData, type: 'single'})} className={cn("flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all", formData.type === 'single' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:bg-slate-50")}>Única</button>
                            <button type="button" onClick={() => setFormData({...formData, type: 'multiple'})} className={cn("flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all", formData.type === 'multiple' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:bg-slate-50")}>Múltipla</button>
                        </div>
                    </div>
                    
                    <div>
                        <Card className={cn("p-2 border transition-all cursor-pointer flex items-center gap-2 w-full h-10 flex-row mb-[1px]", formData.isRequired ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white")} onClick={() => setFormData({...formData, isRequired: !formData.isRequired})}>
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", formData.isRequired ? "bg-rose-500 border-rose-500" : "border-slate-300")}>{formData.isRequired && <CheckCircle size={10} className="text-white" />}</div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Obrigatório</span>
                        </Card>
                    </div>

                    <div>
                        <Input 
                            label="Mínimo Total" 
                            type="number" 
                            value={formData.minQuantity} 
                            onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })} 
                            className="h-10 text-xs"
                        />
                    </div>
                    <div>
                        <Input 
                            label="Máximo Total" 
                            type="number" 
                            value={formData.maxQuantity} 
                            onChange={e => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) })} 
                            className="h-10 text-xs"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase italic flex items-center gap-2"><Info size={14} className="text-orange-500" /> Itens e Preços individuais</h4>
                        <Button variant="outline" size="sm" onClick={addAddonRow} className="rounded-lg border-orange-500 text-orange-600 hover:bg-orange-50 gap-2 font-black italic h-8 text-[10px] px-3"><Plus size={12} /> ADICIONAR ITEM</Button>
                    </div>

                    <DndContext 
                        sensors={sensors} 
                        collisionDetection={closestCenter} 
                        onDragEnd={(event) => {
                            const { active, over } = event;
                            if (over && active.id !== over.id) {
                                const oldIndex = parseInt(active.id.toString().split('-')[1]);
                                const newIndex = parseInt(over.id.toString().split('-')[1]);
                                const newAddons = arrayMove(formData.addons, oldIndex, newIndex);
                                setFormData({ ...formData, addons: newAddons.map((a, i) => ({ ...a, order: i })) });
                            }
                        }}
                    >
                        <SortableContext items={formData.addons.map((_, i) => `addon-${i}`)} strategy={rectSortingStrategy}>
                            <div className="space-y-2">
                                {formData.addons.map((addon, index) => (
                                    <SortableAddonRow 
                                        key={`addon-${index}`}
                                        addon={addon}
                                        index={index}
                                        updateAddon={updateAddon}
                                        removeAddonRow={removeAddonRow}
                                    />
                                ))}
                                {formData.addons.length === 0 && (
                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center opacity-30">
                                        <p className="text-[9px] font-black uppercase tracking-wider italic text-slate-400">Nenhum item adicionado a este grupo</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Footer Fixo */}
            <footer className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 h-11">CANCELAR</Button>
                <Button onClick={handleSave} className="flex-[2] h-11 rounded-xl shadow-lg shadow-slate-200 uppercase tracking-widest italic font-black text-xs">
                    <Save size={16} className="mr-2" /> SALVAR ALTERAÇÕES
                </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonManagement;