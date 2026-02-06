import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, deleteCategory, reorderCategories } from '../services/api';
import { Plus, Edit, Trash2, Layers, Loader2, AlertCircle, GripVertical } from 'lucide-react';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const SortableRow = ({ category, onEdit, onDelete }: SortableRowProps) => {
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

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "hover:bg-muted/30 transition-colors group",
        isDragging && "bg-muted/50 shadow-lg opacity-80"
      )}
    >
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
           <button 
            {...attributes} 
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors"
           >
             <GripVertical size={16} />
           </button>
           <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
               <Layers size={14} />
           </div>
           <span className="font-bold text-xs uppercase italic tracking-tight">{category.name}</span>
           {(!category.subCategories || category.subCategories.length === 0) && (
             <span className="text-[7px] bg-muted text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
               Base
             </span>
           )}
        </div>
      </td>
      <td className="px-6 py-3 text-center font-black text-xs text-slate-400">{category.order}</td>
      <td className="px-6 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button 
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
              onClick={() => onEdit(category)}
          >
            <Edit size={16} />
          </button>
          <button 
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
              onClick={() => onDelete(category.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onAddCategoryClick, onEditCategoryClick, refetchTrigger }) => {
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
        setError('Dados inválidos recebidos do servidor.');
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
      } catch (error) {
        console.error('Erro ao salvar nova ordem:', error);
        alert('Falha ao salvar a nova ordem das categorias.');
        fetchCategories(); // Reverte
      } finally {
        setIsReordering(false);
      }
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteCategory(categoryId);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir a categoria.');
    }
  };

  if (isLoading && !isReordering) return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Carregando categorias...</p>
      </div>
  );

  if (error) return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-8 text-center rounded-lg bg-destructive/5 border border-destructive/20 text-destructive mx-auto max-w-2xl mt-8">
        <AlertCircle className="h-12 w-12" />
        <div>
          <h3 className="text-lg font-semibold">Erro ao carregar</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
        <button onClick={fetchCategories} className="ui-button-primary">Tentar Novamente</button>
      </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ui-card p-4">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Categorias
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
            Arraste para reordenar a exibição no cardápio.
          </p>
        </div>
        <button 
          className="ui-button-primary h-10 px-4 text-[10px] uppercase tracking-widest"
          onClick={onAddCategoryClick}
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border font-black tracking-widest">
              <tr>
                <th className="px-6 py-3 w-[60%]">Nome / Subcategoria</th>
                <th className="px-6 py-3 text-center">Ordem</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {categories.length === 0 ? (
                 <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400">
                        <Layers className="mx-auto h-10 w-10 opacity-20 mb-3" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Sem categorias</p>
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
      </div>
      {isReordering && (
        <div className="fixed bottom-10 right-10 bg-primary text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Salvando ordem...</span>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
