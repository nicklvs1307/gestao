import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, deleteCategory } from '../services/api';
import { Plus, Edit, Trash2, ChevronRight, Layers, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategoryManagementProps {
  onAddCategoryClick: () => void;
  onEditCategoryClick: (category: Category) => void;
  refetchTrigger: number;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ onAddCategoryClick, onEditCategoryClick, refetchTrigger }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      // Garante que data é um array antes de setar
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error("Formato de dados inválido recebido:", data);
        setCategories([]);
        setError('Dados inválidos recebidos do servidor.');
      }
      setError(null);
    } catch (err) {
      setError('Falha ao buscar as categorias. Verifique sua conexão.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [refetchTrigger]);

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Subcategorias e produtos associados podem ser afetados.')) return;

    try {
      await deleteCategory(categoryId);
      fetchCategories(); // Re-fetch categories to update the list
    } catch (err: any) {
      alert(err.response?.data?.error || 'Falha ao excluir a categoria.');
    }
  };

  if (isLoading) return (
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
        <button 
          onClick={fetchCategories}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
        >
          Tentar Novamente
        </button>
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
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Estrutura do cardápio e subcategorias.</p>
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
                categories.flatMap(cat => [
                  // Categoria Principal
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                         <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                             <Layers size={14} />
                         </div>
                         <span className="font-bold text-xs uppercase italic tracking-tight">{cat.name}</span>
                         {(!cat.subCategories || cat.subCategories.length === 0) && (
                           <span className="text-[7px] bg-muted text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
                             Base
                           </span>
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center font-black text-xs text-slate-400">{cat.order}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                            onClick={() => onEditCategoryClick(cat)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                            onClick={() => handleDelete(cat.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>,
                  // Subcategorias
                  ...(cat.subCategories || []).map(subCat => (
                    <tr key={subCat.id} className="bg-muted/5 hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-2">
                        <div className="flex items-center gap-2 pl-10 text-slate-500 relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-3 h-px bg-border"></div>
                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                            <span className="text-[11px] font-medium uppercase tracking-tight italic">{subCat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-2 text-center text-[10px] font-bold text-slate-400">{subCat.order}</td>
                      <td className="px-6 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            className="p-1 text-slate-400 hover:text-primary rounded transition-colors" 
                            onClick={() => onEditCategoryClick(subCat)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" 
                            onClick={() => handleDelete(subCat.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
