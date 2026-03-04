import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, deleteCategory, reorderCategories } from '../services/api';
import { Plus, Edit, Trash2, Layers, Loader2, GripVertical, CheckCircle, RefreshCw, Clock } from 'lucide-react';
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
        isDragging && "bg-white shadow-2xl scale-[1.01] ring-1 ring-orange-500 z-50 rounded-lg"
      )}
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
           <button 
            {...attributes} 
            {...listeners}
            className="p-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-lg group-hover:bg-white border border-transparent group-hover:border-slate-100 shadow-sm"
           >
             <GripVertical size={16} />
           </button>
           
           <div className={cn(
             "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all",
             isSubcategory ? "bg-blue-50 text-blue-500 border border-blue-100" : "bg-orange-50 text-orange-500 border border-orange-100"
           )}>
               <Layers size={18} />
           </div>
           
           <div className="flex flex-col">
              <span className="font-bold text-xs text-slate-900 uppercase italic tracking-tight">{category.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isSubcategory ? (
                  <span className="text-[7px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none">Sub</span>
                ) : (
                  <span className="text-[7px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none">Main</span>
                )}
                {category.cuisineType && (
                  <span className="text-[7px] text-slate-400 font-bold uppercase italic border-l border-slate-200 pl-2">{category.cuisineType}</span>
                )}
              </div>
           </div>
        </div>
      </td>
      
      <td className="px-4 py-2.5 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-0.5">
            {category.availableDays?.split(',').map(d => (
              <div key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Disponível" />
            ))}
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ativo</span>
        </div>
      </td>

      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <Button 
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg border border-slate-100" 
              onClick={() => onEdit(category)}
          >
            <Edit size={14} />
          </Button>
          <Button 
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-100" 
              onClick={() => onDelete(category.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );
}

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
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast.success("Categoria excluída.");
    } catch (err) {
      toast.error("Erro ao excluir categoria.");
    }
  };

  if (isLoading && !isReordering) {
    return (
      <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Sincronizando Categorias...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Categorias</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <Layers size={12} className="text-orange-500" /> Estrutura do Cardápio Digital
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white rounded-lg h-10 w-10 p-0" onClick={fetchCategories}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={onAddCategoryClick} className="rounded-lg px-6 h-10 italic font-black text-xs">
                <Plus size={16} className="mr-2" /> NOVA CATEGORIA
            </Button>
        </div>
      </div>

      {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 italic animate-bounce">
              <CheckCircle size={16} className="rotate-45" /> {error}
          </div>
      )}

      <Card className="p-0 overflow-hidden border border-slate-200 shadow-xl bg-white rounded-2xl" noPadding>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Nome e Organização</th>
                  <th className="px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Status Operacional</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Ações</th>
                </tr>
              </thead>
              <SortableContext 
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-slate-50">
                  {categories.map((category) => (
                    <SortableRow 
                      key={category.id} 
                      category={category} 
                      onEdit={onEditCategoryClick}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </DndContext>
        
        {categories.length === 0 && !isLoading && (
          <div className="p-16 text-center bg-slate-50/30">
            <div className="flex flex-col items-center justify-center opacity-20 grayscale">
              <Layers size={48} strokeWidth={1} className="mb-3" />
              <p className="font-black text-[9px] uppercase tracking-[0.2em] italic">Vazio</p>
            </div>
          </div>
        )}
      </Card>

      {isReordering && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em] italic">Salvando nova ordem...</span>
        </div>
      )}
    </div>
  );
}

export default CategoryManagement;