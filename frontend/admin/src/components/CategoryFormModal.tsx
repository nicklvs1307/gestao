import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, createCategory, updateCategory } from '../services/api';
import { X, Layers, Save, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  categoryToEdit?: Category | null;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!categoryToEdit;

  useEffect(() => {
    if (isOpen) {
      const fetchAllCategories = async () => {
        try {
          const data = await getCategories(true); // Fetch flat list
          if (isEditing && categoryToEdit) {
            const descendants = new Set([categoryToEdit.id]);
            const getDescendants = (catId: string) => {
              const children = data.filter((c: Category) => c.parentId === catId);
              for (const child of children) {
                descendants.add(child.id);
                getDescendants(child.id);
              }
            };
            getDescendants(categoryToEdit.id);
            setAllCategories(data.filter((c: Category) => !descendants.has(c.id)));
          } else {
            setAllCategories(data);
          }
        } catch (error) {
          console.error("Failed to fetch categories", error);
        }
      };
      fetchAllCategories();
    }
  }, [isOpen, isEditing, categoryToEdit]);

  useEffect(() => {
    if (isEditing && categoryToEdit) {
      setName(categoryToEdit.name);
      setParentId(categoryToEdit.parentId || null);
    } else {
      setName('');
      setParentId(null);
    }
  }, [categoryToEdit, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const categoryData = { 
      name: name.trim(), 
      parentId: parentId === 'null' ? null : parentId 
    };

    try {
      if (isEditing && categoryToEdit) {
        await updateCategory(categoryToEdit.id, categoryData);
      } else {
        await createCategory(categoryData);
      }
      onSave(); 
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Falha ao salvar a categoria. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-lg">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-slate-900">{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all"><X size={20} /></button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} id="category-form" className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome da Categoria</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              placeholder="Ex: Bebidas Especiais"
              className="ui-input w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Categoria Pai (Subcategoria)</label>
            <div className="relative">
              <select 
                value={parentId || 'null'} 
                onChange={e => setParentId(e.target.value === 'null' ? null : e.target.value)}
                className="ui-input w-full appearance-none cursor-pointer"
              >
                <option value="null">Nenhuma (Categoria Principal)</option>
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </form>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button type="button" className="ui-button-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="ui-button-primary flex-1" form="category-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryFormModal;