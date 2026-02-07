import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, deleteCategory, reorderCategories } from '../services/api';
import { Plus, Edit, Trash2, Layers, Loader2, AlertCircle, GripVertical, ChevronDown, CheckCircle, RefreshCw, Clock } from 'lucide-react';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';

interface CategoryManagementProps {
  onAddCategoryClick: () => void;
  onEditCategoryClick: (category: Category) => void;
  refetchTrigger: number;
}

interface SortableRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

function SortableRow({ category, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
  };

  const isSubcategory = !!category.parentId;

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "hover:bg-slate-50/80 transition-all group border-b border-slate-50 last:border-0",
        isDragging && "bg-white shadow-2xl scale-[1.02] ring-2 ring-orange-500 z-50 rounded-xl"
      )}
    >
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
           <button 
            {...attributes} 
            {...listeners}
            className="p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-lg group-hover:bg-white border border-transparent group-hover:border-slate-100 shadow-sm"
           >
             <GripVertical size={18} />
           </button>
           
           <div className={cn(
             "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all",
             isSubcategory ? "bg-blue-50 text-blue-500 border border-blue-100" : "bg-orange-50 text-orange-500 border border-orange-100"
           )}>
               <Layers size={20} />
           </div>
           
           <div className="flex flex-col">
              <span className="font-black text-xs text-slate-900 uppercase italic tracking-tight">{category.name}</span>
              <div className="flex items-center gap-2 mt-1">
                {isSubcategory ? (
                  <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none">Subcategoria</span>
                ) : (
                  <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none">Principal</span>
                )}
                {category.cuisineType && (
                  <span className="text-[8px] text-slate-400 font-bold uppercase italic border-l border-slate-200 pl-2">{category.cuisineType}</span>
                )}
              </div>
           </div>
        </div>
      </td>
      
      <td className="px-8 py-5 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex gap-1">
            {category.availableDays?.split(',').map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" title="Disponível" />
            ))}
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ativo</span>
        </div>
      </td>

      <td className="px-8 py-5 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <Button 
              variant="ghost"
              size="icon"
              className="bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-xl border border-slate-100" 
              onClick={() => onEdit(category)}
          >
            <Edit size={16} />
          </Button>
          <Button 
              variant="ghost"
              size="icon"
              className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-100" 
              onClick={() => onDelete(category.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
};

function CategoryManagement({ onAddCategoryClick, onEditCategoryClick, refetchTrigger }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
        setError('Dados inválidos do servidor.');
      }
      setError(null);
    } catch (err) {
      setError('Falha ao buscar as categorias.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [refetchTrigger]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);

      try {
        setIsReordering(true);
        const updates = newOrder.map((cat, index) => ({
          id: cat.id,
          order: index
        }));
        await reorderCategories(updates);
        toast.success("Ordem salva!");
      } catch (error) {
        console.error('Erro ao salvar nova ordem:', error);
        toast.error('Erro ao salvar nova ordem.');
        fetchCategories(); // Reverte
      } finally {
        setIsReordering(false);
      }
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Excluir esta categoria permanentemente?')) return;
    try {
      await deleteCategory(categoryId);
      toast.success("Categoria removida.");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir.');
    }
  };

  if (isLoading && !isReordering) return (
      <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Categorias...</span>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Organizar Menu</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Layers size={14} className="text-orange-500" /> Arraste para reordenar o cardápio
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white rounded-xl" onClick={fetchCategories}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={onAddCategoryClick} className="rounded-xl px-6 italic">
                <Plus size={18} /> NOVA CATEGORIA
            </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Estrutura de Exibição</th>
                <th className="px-8 py-4 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Visibilidade</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Ações</th>
              </tr>
            </thead>
            <tbody className="text-slate-900 divide-y divide-slate-50">
              {categories.length === 0 ? (
                 <tr>
                    <td colSpan={3} className="p-20 text-center">
                        <div className="flex flex-col items-center justify-center opacity-20">
                            <Layers size={64} strokeWidth={1} className="mb-4" />
                            <p className="font-black text-[10px] uppercase tracking-[0.3em]">Nenhuma categoria ativa</p>
                        </div>
                    </td>
                 </tr>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={categories.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {categories.map((cat) => (
                      <SortableRow 
                        key={cat.id} 
                        category={cat} 
                        onEdit={onEditCategoryClick} 
                        onDelete={handleDelete} 
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isReordering && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10">
          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Atualizando ordem no cardápio...</span>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;