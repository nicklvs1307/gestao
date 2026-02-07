import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, createCategory, updateCategory } from '../services/api';
import { X, Layers, Save, Loader2, ChevronDown, Clock, Calendar, Pizza, Info, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  categoryToEdit?: Category | null;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  // Estados do Formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisineType: 'Geral',
    saiposIntegrationCode: '',
    halfAndHalfRule: 'NONE',
    availableDays: '1,2,3,4,5,6,7',
    startTime: '00:00',
    endTime: '00:00',
    parentId: null as string | null,
  });

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!categoryToEdit;

  const cuisineTypes = ['Geral', 'Pizza', 'Bebidas', 'Hambúrguer', 'Sobremesas', 'Japonesa', 'Italiana', 'Churrasco'];
  const daysOfWeek = [
    { id: '1', label: 'Domingo' },
    { id: '2', label: 'Segunda' },
    { id: '3', label: 'Terça' },
    { id: '4', label: 'Quarta' },
    { id: '5', label: 'Quinta' },
    { id: '6', label: 'Sexta' },
    { id: '7', label: 'Sábado' },
  ];

  useEffect(() => {
    if (isOpen) {
      const fetchAllCategories = async () => {
        try {
          const data = await getCategories(true);
          if (isEditing && categoryToEdit) {
            // Filtra para evitar auto-referência ou circularidade
            setAllCategories(data.filter((c: Category) => c.id !== categoryToEdit.id && c.parentId !== categoryToEdit.id));
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
      setFormData({
        name: categoryToEdit.name || '',
        description: categoryToEdit.description || '',
        cuisineType: categoryToEdit.cuisineType || 'Geral',
        saiposIntegrationCode: categoryToEdit.saiposIntegrationCode || '',
        halfAndHalfRule: categoryToEdit.halfAndHalfRule || 'NONE',
        availableDays: categoryToEdit.availableDays || '1,2,3,4,5,6,7',
        startTime: categoryToEdit.startTime || '00:00',
        endTime: categoryToEdit.endTime || '00:00',
        parentId: categoryToEdit.parentId || null,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        cuisineType: 'Geral',
        saiposIntegrationCode: '',
        halfAndHalfRule: 'NONE',
        availableDays: '1,2,3,4,5,6,7',
        startTime: '00:00',
        endTime: '00:00',
        parentId: null,
      });
    }
  }, [categoryToEdit, isEditing, isOpen]);

  const toggleDay = (dayId: string) => {
    const days = formData.availableDays.split(',').filter(d => d !== '');
    if (days.includes(dayId)) {
      setFormData({ ...formData, availableDays: days.filter(d => d !== dayId).join(',') });
    } else {
      setFormData({ ...formData, availableDays: [...days, dayId].sort().join(',') });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && categoryToEdit) {
        await updateCategory(categoryToEdit.id, formData);
        toast.success("Categoria atualizada!");
      } else {
        await createCategory(formData);
        toast.success("Categoria criada com sucesso!");
      }
      onSave(); 
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Falha ao salvar a categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                <span className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100">
                    <Layers size={20} />
                </span>
                {isEditing ? `Editar categoria ${formData.name}` : 'Criar Nova Categoria'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all shadow-sm border border-slate-50"><X size={24} /></button>
        </div>

        {/* Corpo do Formulário - Scrollable */}
        <form onSubmit={handleSubmit} id="category-form" className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Coluna Esquerda: Informações Básicas */}
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Culinária</label>
                    <div className="relative">
                        <select 
                            value={formData.cuisineType}
                            onChange={e => setFormData({ ...formData, cuisineType: e.target.value })}
                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                        >
                            {cuisineTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome da Categoria</label>
                    <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        required 
                        placeholder="Ex: Pizzas Salgadas"
                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Código PDV (Opcional)</label>
                    <input 
                        type="text" 
                        value={formData.saiposIntegrationCode || ''} 
                        onChange={e => setFormData({ ...formData, saiposIntegrationCode: e.target.value })} 
                        placeholder="Identificador externo"
                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                </div>

                {/* Regra Meio a Meio */}
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block flex items-center gap-2">
                        <Pizza size={14} className="text-orange-500" /> Meio a meio?
                    </label>
                    <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                        {[
                            { id: 'NONE', label: 'Não oferecer' },
                            { id: 'HIGHER_VALUE', label: 'Maior valor' },
                            { id: 'AVERAGE_VALUE', label: 'Valor médio' }
                        ].map(rule => (
                            <button
                                key={rule.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, halfAndHalfRule: rule.id })}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                                    formData.halfAndHalfRule === rule.id ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {rule.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Descrição (Opcional)</label>
                    <textarea 
                        value={formData.description || ''} 
                        onChange={e => setFormData({ ...formData, description: e.target.value })} 
                        rows={3}
                        placeholder="Uma breve descrição sobre a categoria..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-medium text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
                    />
                </div>
            </div>

            {/* Coluna Direita: Disponibilidade e Subcategorias */}
            <div className="space-y-8">
                {/* Disponibilidade por Dia */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block flex items-center gap-2">
                        <Calendar size={14} /> Disponível em quais dias?
                    </label>
                    <div className="space-y-2">
                        {daysOfWeek.map(day => {
                            const isActive = formData.availableDays.split(',').includes(day.id);
                            return (
                                <div 
                                    key={day.id}
                                    onClick={() => toggleDay(day.id)}
                                    className="flex items-center justify-between cursor-pointer group"
                                >
                                    <span className={cn("text-xs font-bold transition-colors", isActive ? "text-slate-700" : "text-slate-300")}>
                                        {day.label}
                                    </span>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        isActive ? "bg-emerald-500" : "bg-slate-200"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                                            isActive ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block italic">Horário Início</label>
                        <div className="relative">
                            <input 
                                type="time"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 transition-all"
                            />
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block italic">Horário Fim</label>
                        <div className="relative">
                            <input 
                                type="time"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-emerald-500 transition-all"
                            />
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        </div>
                    </div>
                </div>

                {/* Subcategoria */}
                <div className="p-6 bg-blue-50/50 rounded-[2rem] border-2 border-dashed border-blue-100">
                    <label className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-3 block flex items-center gap-2">
                        <Layers size={14} /> Categoria Pai (Opcional)
                    </label>
                    <div className="relative">
                        <select 
                            value={formData.parentId || 'null'} 
                            onChange={e => setFormData({ ...formData, parentId: e.target.value === 'null' ? null : e.target.value })}
                            className="w-full h-12 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-sm text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none"
                        >
                            <option value="null">Nenhuma (Esta é uma Categoria Principal)</option>
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                    <p className="text-[9px] text-blue-400 mt-3 italic flex items-center gap-1">
                        <Info size={10}/> Use para organizar sub-itens (ex: Vinhos dentro de Bebidas).
                    </p>
                </div>
            </div>
          </div>
        </form>

        {/* Rodapé com Ações */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex gap-4 sticky bottom-0">
          <button 
            type="button" 
            className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-50 hover:text-red-500 transition-all active:scale-95" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-[2] h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-3" 
            form="category-form" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
            ) : (
                <>
                    <Save size={20} />
                    {isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryFormModal;