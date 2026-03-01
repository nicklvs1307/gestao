import React, { useState, useEffect } from 'react';
import { addonService } from '../services/api/addonService';
import type { AddonGroup } from '../services/api/addonService';
import { Plus, Edit2, Trash2, GripVertical, Loader2, List, Settings, RefreshCw, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
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

interface SortableGroupProps {
  group: AddonGroup;
  onEdit: (id: string) => void;
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
    <div ref={setNodeRef} style={style} className={cn("animate-in fade-in zoom-in-95 duration-300", isDragging && "z-50")}>
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
                        </div>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onDuplicate(group.id!)} title="Duplicar"><Copy size={14}/></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onEdit(group.id!)} title="Editar"><Edit2 size={14}/></Button>
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

const AddonManagement: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const groupsData = await addonService.getAll();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (error) { toast.error('Erro ao carregar dados.'); }
    finally { setLoading(false); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setLoading(true);
      await addonService.duplicate(id);
      toast.success('Grupo duplicado!');
      fetchData();
    } catch (error) { toast.error('Erro ao duplicar.'); }
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

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo permanentemente?')) return;
    try {
      await addonService.delete(id);
      toast.success('Grupo removido.');
      fetchData();
    } catch (error) { toast.error('Erro ao excluir.'); }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.saiposIntegrationCode?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [groups, searchTerm]);

  if (loading && !isReordering) return (
      <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Biblioteca...</span>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
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
            <Button onClick={() => navigate('/addons/new')} className="rounded-lg px-4 italic h-10 text-xs">
                <Plus size={16} /> NOVO GRUPO
            </Button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={16} />
        <input 
            type="text" 
            placeholder="Buscar por nome ou código..." 
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 focus:border-orange-500 outline-none transition-all font-bold text-xs uppercase italic shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map(g => g.id!)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGroups.map((group) => (
              <SortableGroupCard 
                key={group.id} 
                group={group} 
                onEdit={(id) => navigate(`/addons/${id}`)} 
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
            <button 
                onClick={() => navigate('/addons/new')}
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

      {filteredGroups.length === 0 && (
        <Card className="p-12 flex flex-col items-center justify-center text-slate-300 opacity-20 border-dashed border-2">
            <List size={48} strokeWidth={1} className="mb-4" />
            <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhuma configuração encontrada</p>
        </Card>
      )}

      {isReordering && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em] italic text-orange-400">Sincronizando sequência...</span>
        </div>
      )}
    </div>
  );
};

export default AddonManagement;
