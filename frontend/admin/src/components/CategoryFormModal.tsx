import React, { useState, useEffect } from 'react';
import type { Category } from '@/types/index';
import { getCategories, createCategory, updateCategory } from '../services/api/categories';
import { addonService } from '../services/api/addonService';
import type { AddonGroup } from '../services/api/addonService';
import { X, Layers, Save, Loader2, ChevronDown, Clock, Calendar, Pizza, Info, Plus, Trash2, List, Check } from 'lucide-react';
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
    addonGroups: [] as string[],
  });

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [availableAddonGroups, setAvailableAddonGroups] = useState<AddonGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!categoryToEdit;

  const cuisineTypes = ['Geral', 'Pizza', 'Bebidas', 'Hambúrguer', 'Sobremesas', 'Japonesa', 'Italiana', 'Churrasco'];
  const daysOfWeek = [
    { id: '1', label: 'Dom' },
    { id: '2', label: 'Seg' },
    { id: '3', label: 'Ter' },
    { id: '4', label: 'Qua' },
    { id: '5', label: 'Qui' },
    { id: '6', label: 'Sex' },
    { id: '7', label: 'Sáb' },
  ];

  useEffect(() => {
    if (isOpen) {
      const fetchAllCategories = async () => {
        try {
          const [cats, addons] = await Promise.all([
            getCategories(true),
            addonService.getAll()
          ]);
          setAvailableAddonGroups(addons);
          if (isEditing && categoryToEdit) {
            setAllCategories(cats.filter((c: Category) => c.id !== categoryToEdit.id && c.parentId !== categoryToEdit.id));
          } else {
            setAllCategories(cats);
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
        addonGroups: categoryToEdit.addonGroups?.map((g: any) => g.id) || [],
      });
    } else {
      setFormData({
        name: '', description: '', cuisineType: 'Geral', saiposIntegrationCode: '', halfAndHalfRule: 'NONE', availableDays: '1,2,3,4,5,6,7', startTime: '00:00', endTime: '00:00', parentId: null, addonGroups: [],
      });
    }
  }, [categoryToEdit, isEditing, isOpen]);

  const toggleDay = (dayId: string) => {
    const days = formData.availableDays.split(',').filter(d => d !== '');
    if (days.includes(dayId)) setFormData({ ...formData, availableDays: days.filter(d => d !== dayId).join(',') });
    else setFormData({ ...formData, availableDays: [...days, dayId].sort().join(',') });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      if (isEditing && categoryToEdit) await updateCategory(categoryToEdit.id, formData);
      else await createCategory(formData);
      toast.success(isEditing ? "Atualizado!" : "Criado!");
      onSave(); 
    } catch (error) { toast.error('Falha ao salvar.'); }
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl">
        <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500 text-white p-2 rounded-xl"><Layers size={18} /></div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight leading-none">{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuração de Estrutura</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} id="category-form" className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Culinária</label>
                        <div className="relative">
                            <select value={formData.cuisineType} onChange={e => setFormData({ ...formData, cuisineType: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500 transition-all appearance-none">
                                {cuisineTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Código Integração</label>
                        <input type="text" value={formData.saiposIntegrationCode || ''} onChange={e => setFormData({ ...formData, saiposIntegrationCode: e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs outline-none focus:border-emerald-500" placeholder="SKU / ID" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Nome da Categoria</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs outline-none focus:border-emerald-500" placeholder="Ex: Pizzas Tradicionais" />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic flex items-center gap-2"><Pizza size={12} className="text-orange-500" /> Regra de Preço Meio a Meio</label>
                    <div className="flex p-1 bg-slate-200/50 rounded-xl gap-1">
                        {[
                            { id: 'NONE', label: 'OFF' },
                            { id: 'HIGHER_VALUE', label: 'Maior Valor' },
                            { id: 'AVERAGE_VALUE', label: 'Valor Médio' }
                        ].map(rule => (
                            <button key={rule.id} type="button" onClick={() => setFormData({ ...formData, halfAndHalfRule: rule.id })} className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", formData.halfAndHalfRule === rule.id ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:bg-slate-200")}>{rule.label}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Descrição Comercial</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-medium text-xs outline-none focus:border-emerald-500 resize-none" placeholder="..." />
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 block flex items-center gap-2 italic"><Calendar size={12} /> Dias de Exibição</label>
                    <div className="flex flex-wrap gap-1.5">
                        {daysOfWeek.map(day => {
                            const isActive = formData.availableDays.split(',').includes(day.id);
                            return (
                                <button key={day.id} type="button" onClick={() => toggleDay(day.id)} className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all border", isActive ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300")}>{day.label}</button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Início</label>
                        <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2 font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Fim</label>
                        <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2 font-bold text-xs" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic flex items-center gap-2"><Layers size={12} className="text-blue-500" /> Categoria Pai</label>
                    <select value={formData.parentId || 'null'} onChange={e => setFormData({ ...formData, parentId: e.target.value === 'null' ? null : e.target.value })} className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold text-xs text-slate-700 outline-none appearance-none">
                        <option value="null">Principal (Sem Pai)</option>
                        {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="md:col-span-2 space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 italic flex items-center gap-2"><List size={12} className="text-orange-500" /> Opcionais Herdados (Todos os produtos desta categoria)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {availableAddonGroups.map(group => {
                        const isSelected = formData.addonGroups.includes(group.id!);
                        return (
                            <div key={group.id} onClick={() => { const current = formData.addonGroups; isSelected ? setFormData({ ...formData, addonGroups: current.filter(id => id !== group.id) }) : setFormData({ ...formData, addonGroups: [...current, group.id!] }); }}
                                className={cn("flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer", isSelected ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-black uppercase italic truncate">{group.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[7px] font-bold opacity-60 uppercase">{group.addons.length} ITENS</span>
                                        {group.isFlavorGroup && <span className="text-[6px] font-black bg-amber-500 text-white px-1 rounded uppercase">Sabores</span>}
                                    </div>
                                </div>
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2", isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-200")}>{isSelected && <Check size={10} strokeWidth={4} className="text-white" />}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </form>

        <footer className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
          <button type="button" className="flex-1 h-11 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all" onClick={onClose}>DESCARTAR</button>
          <button type="submit" className="flex-[2] h-11 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2" form="category-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> SALVAR ESTRUTURA</>}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CategoryFormModal;