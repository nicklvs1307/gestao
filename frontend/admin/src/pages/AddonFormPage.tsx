import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addonService } from '../services/api/addonService';
import type { AddonGroup, Addon } from '../services/api/addonService';
import { uploadProductImage } from '../services/api/products';
import { 
    ArrowLeft, Plus, Trash2, Save, X, GripVertical, 
    Loader2, Settings, CheckCircle, Info, Copy, 
    Image as ImageIcon, Upload, List, Hash, ChefHat
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
import { getImageUrl } from '../utils/image';
import { getIngredients } from '../services/api/stock';

const SortableAddonRow = ({ addon, index, updateAddon, removeAddonRow, availableIngredients, navigate }: {
    addon: Addon;
    index: number;
    updateAddon: (index: number, field: keyof Addon, value: any) => void;
    removeAddonRow: (index: number) => void;
    availableIngredients: any[];
    navigate: any;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const calculatedCost = React.useMemo(() => {
    return (addon.ingredients || []).reduce((acc: number, item: any) => {
        const ing = availableIngredients.find(i => i.id === item.ingredientId);
        return acc + (Number(item.quantity) * (ing?.averageCost || ing?.lastUnitCost || 0));
    }, 0);
  }, [addon.ingredients, availableIngredients]);

  useEffect(() => {
    if (calculatedCost !== addon.costPrice && calculatedCost > 0) {
        updateAddon(index, 'costPrice', calculatedCost);
    }
  }, [calculatedCost]);

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
    <div ref={setNodeRef} style={style} className={cn("relative group", isDragging && "z-50")}>
      <div className="bg-white border-b border-x border-slate-100 first:border-t first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-2 p-1.5">
          <button 
              type="button"
              {...attributes} 
              {...listeners}
              className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors shrink-0"
          >
              <GripVertical size={14} />
          </button>

          <div className="flex-1 grid grid-cols-12 gap-2 items-center">
            {/* Nome */}
            <div className="col-span-3">
              <Input 
                  placeholder="Nome do Item" 
                  value={addon.name} 
                  onChange={(e) => updateAddon(index, 'name', e.target.value)} 
                  className="h-8 text-[11px] px-2 bg-transparent border-transparent hover:border-slate-200 focus:bg-white focus:border-orange-500 transition-all font-medium"
                  noMargin
              />
            </div>

            {/* Preço Venda */}
            <div className="col-span-1">
              <Input 
                  type="number" 
                  step="0.01" 
                  value={addon.price} 
                  onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value) || 0)} 
                  className="h-8 text-[11px] px-1 text-center font-bold"
                  noMargin
              />
            </div>

            {/* Custo Real */}
            <div className="col-span-1 relative group/cost">
              <Input 
                  type="number" 
                  value={addon.costPrice || 0} 
                  className="h-8 text-[11px] px-1 text-center border-rose-50 bg-rose-50/20 text-rose-600 font-bold"
                  readOnly
                  noMargin
              />
              <button 
                  type="button"
                  onClick={() => navigate('/production/technical-sheets')}
                  className="absolute -right-1 -top-1 opacity-0 group-hover/cost:opacity-100 text-rose-400 hover:text-rose-600 transition-all bg-white rounded-full shadow-sm p-0.5"
              >
                  <ChefHat size={10} />
              </button>
            </div>

            {/* Preço Promo */}
            <div className="col-span-1">
              <Input 
                  type="number" 
                  step="0.01" 
                  value={addon.promoPrice || ''} 
                  onChange={(e) => updateAddon(index, 'promoPrice', e.target.value ? parseFloat(e.target.value) : undefined)} 
                  className="h-8 text-[11px] px-1 text-center border-amber-100 bg-amber-50/20 text-amber-700 font-black"
                  placeholder="-"
                  noMargin
              />
            </div>

            {/* Datas Promo */}
            <div className="col-span-2 flex gap-1">
              <Input 
                  type="date" 
                  value={addon.promoStartDate ? new Date(addon.promoStartDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => updateAddon(index, 'promoStartDate', e.target.value)} 
                  className="h-8 text-[9px] px-1 leading-none"
                  noMargin
              />
              <Input 
                  type="date" 
                  value={addon.promoEndDate ? new Date(addon.promoEndDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => updateAddon(index, 'promoEndDate', e.target.value)} 
                  className="h-8 text-[9px] px-1 leading-none"
                  noMargin
              />
            </div>

            {/* SKU */}
            <div className="col-span-1">
              <Input 
                  placeholder="SKU" 
                  value={addon.saiposIntegrationCode || ''} 
                  onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)} 
                  className="h-8 text-[10px] px-1 text-center uppercase"
                  noMargin
              />
            </div>

            {/* Foto e Desc */}
            <div className="col-span-2 flex items-center gap-1.5 justify-end pr-1">
              <div className="relative group/photo">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all overflow-hidden",
                    addon.imageUrl ? "border-orange-200 bg-orange-50" : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : 
                    addon.imageUrl ? (
                      <img src={getImageUrl(addon.imageUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={14} className="text-slate-400" />
                    )
                  }
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="flex-1 min-w-0">
                <Input 
                    placeholder="Descrição..." 
                    value={addon.description || ''} 
                    onChange={(e) => updateAddon(index, 'description', e.target.value)} 
                    className="h-8 text-[10px] italic border-transparent hover:border-slate-200 focus:bg-white focus:border-orange-500 bg-transparent"
                    noMargin
                />
              </div>

              <Button variant="ghost" size="icon" onClick={() => removeAddonRow(index)} className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddonFormPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<AddonGroup>({
        name: '', 
        type: 'multiple', 
        isRequired: false, 
        isFlavorGroup: false, 
        priceRule: 'higher', 
        minQuantity: 0, 
        maxQuantity: 1, 
        order: 0, 
        saiposIntegrationCode: '', 
        addons: []
    });

    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const loadData = async () => {
            try {
                const ings = await getIngredients();
                setAvailableIngredients(ings);

                if (id && id !== 'new') {
                    setIsLoading(true);
                    const group = await addonService.getById(id);
                    if (group) {
                        setFormData({
                            ...group,
                            priceRule: group.priceRule || 'higher'
                        });
                    } else {
                        toast.error("Grupo não encontrado.");
                        navigate('/addons');
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                toast.error("Erro ao carregar dados.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleSave = async () => {
        if (!formData.name) return toast.error('O nome do grupo é obrigatório.');
        setIsSaving(true);
        try {
            if (id && id !== 'new') await addonService.update(id, formData);
            else await addonService.create(formData);
            toast.success(id ? 'Grupo atualizado!' : 'Grupo criado!');
            navigate('/addons');
        } catch (error) {
            toast.error('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const addAddonRow = () => {
        setFormData({
            ...formData,
            addons: [...formData.addons, { 
                name: '', 
                price: 0, 
                costPrice: 0,
                maxQuantity: 1, 
                order: formData.addons.length, 
                ingredients: [], 
                description: '', 
                imageUrl: '' 
            }]
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

    if (isLoading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Carregando...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/addons')} className="rounded-xl bg-white border border-slate-200 h-10 w-10 shadow-sm"><ArrowLeft size={20}/></Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                            {id && id !== 'new' ? 'Editar Grupo' : 'Nova Biblioteca'}
                        </h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 italic">Personalização de Itens e Regras de Escolha</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" onClick={() => navigate('/addons')} className="flex-1 lg:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400">CANCELAR</Button>
                    <Button onClick={handleSave} isLoading={isSaving} className="flex-1 lg:flex-none h-10 rounded-xl px-8 shadow-lg font-black italic uppercase tracking-widest gap-2 text-xs">
                        <Save size={18} /> {id && id !== 'new' ? 'SALVAR ALTERAÇÕES' : 'CRIAR BIBLIOTECA'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4 space-y-6">
                    <Card className="p-6 border-slate-200 bg-white space-y-6 shadow-sm">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase italic text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3">
                                <Settings size={16} className="text-orange-500" /> Definições de Regra
                            </h3>
                            
                            <Input label="Nome do Grupo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Escolha o Sabor" required className="h-11 font-bold" />
                            <Input label="Código de Integração (SKU)" value={formData.saiposIntegrationCode || ''} onChange={e => setFormData({ ...formData, saiposIntegrationCode: e.target.value })} placeholder="Ex: ADIC_TOPPING" className="h-11" />
                            
                            <div className="pt-2">
                                <Card className={cn("p-3 border transition-all cursor-pointer flex items-center gap-3", formData.isFlavorGroup ? "border-amber-500 bg-amber-50" : "border-slate-100 bg-slate-50/50 hover:bg-white")} onClick={() => setFormData({...formData, isFlavorGroup: !formData.isFlavorGroup})}>
                                    <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-all", formData.isFlavorGroup ? "bg-amber-500 border-amber-500 shadow-sm shadow-amber-200" : "bg-white border-slate-300")}>{formData.isFlavorGroup && <CheckCircle size={12} className="text-white" />}</div>
                                    <div className="flex-1">
                                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700 leading-none">Grupo de SABORES</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic block">Identifica itens que compõem frações da Pizza</span>
                                    </div>
                                </Card>
                            </div>

                            {formData.isFlavorGroup && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                                    <div className="flex-1">
                                        <div className="flex gap-2 items-center mb-1">
                                            <Info size={14} className="text-amber-600 shrink-0" />
                                            <p className="text-[8px] font-black text-amber-900 uppercase italic">Grupo de Sabores</p>
                                        </div>
                                        <p className="text-[8px] font-bold text-amber-700 leading-tight uppercase italic">
                                            ESTE GRUPO SERÁ TRATADO COMO SABORES NO CARDÁPIO. A REGRA DE PREÇO E O LIMITE DE FRAÇÕES SÃO DEFINIDOS INDIVIDUALMENTE EM CADA PRODUTO (PIZZA).
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-50">
                            <h3 className="text-xs font-black uppercase italic text-slate-900 flex items-center gap-2">
                                <List size={16} className="text-orange-500" /> Limites de Seleção
                            </h3>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Modo de Seleção</label>
                                <div className="grid grid-cols-2 p-1 bg-slate-50 border border-slate-200 rounded-xl gap-1">
                                    <button type="button" onClick={() => setFormData({...formData, type: 'single'})} className={cn("py-2.5 rounded-lg text-[10px] font-black uppercase transition-all", formData.type === 'single' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-white")}>Única</button>
                                    <button type="button" onClick={() => setFormData({...formData, type: 'multiple'})} className={cn("py-2.5 rounded-lg text-[10px] font-black uppercase transition-all", formData.type === 'multiple' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-white")}>Múltipla</button>
                                </div>
                            </div>

                            <Card className={cn("p-3 border transition-all cursor-pointer flex items-center gap-3", formData.isRequired ? "border-rose-500 bg-rose-50" : "border-slate-100 bg-slate-50/50 hover:bg-white")} onClick={() => setFormData({...formData, isRequired: !formData.isRequired})}>
                                <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-all", formData.isRequired ? "bg-rose-500 border-rose-500 shadow-sm shadow-rose-200" : "bg-white border-slate-300")}>{formData.isRequired && <CheckCircle size={12} className="text-white" />}</div>
                                <div className="flex-1">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-700 leading-none">Obrigatório</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic block">O cliente precisa escolher ao menos um item</span>
                                </div>
                            </Card>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Mínimo Total" type="number" value={formData.minQuantity} onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })} className="h-11 font-black text-blue-600" />
                                <Input label="Máximo Total" type="number" value={formData.maxQuantity} onChange={e => setFormData({ ...formData, maxQuantity: parseInt(e.target.value) || 1 })} className="h-11 font-black text-purple-600" />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-8 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black uppercase italic text-slate-900">Itens e Preços da Lista</h3>
                            <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">{formData.addons.length}</span>
                        </div>
                        <Button onClick={addAddonRow} className="rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 gap-2 font-black italic h-10 text-[11px] px-6 transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} /> ADICIONAR NOVO ITEM
                        </Button>
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
                        <div className="bg-slate-100/50 rounded-t-xl border border-slate-200 p-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <div className="w-6 shrink-0"></div>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                                <div className="col-span-3 pl-2">Nome do Item</div>
                                <div className="col-span-1 text-center">Venda</div>
                                <div className="col-span-1 text-center">Custo</div>
                                <div className="col-span-1 text-center">Promo</div>
                                <div className="col-span-2 text-center">Vigência Promo</div>
                                <div className="col-span-1 text-center">SKU</div>
                                <div className="col-span-2 text-right pr-4">Ações / Descrição</div>
                            </div>
                        </div>
                        <SortableContext items={formData.addons.map((_, i) => `addon-${i}`)} strategy={rectSortingStrategy}>
                            <div className="space-y-0 shadow-sm rounded-b-xl overflow-hidden border-x border-b border-slate-200">
                                {formData.addons.map((addon, index) => (
                                    <SortableAddonRow 
                                        key={`addon-${index}`}
                                        addon={addon}
                                        index={index}
                                        updateAddon={updateAddon}
                                        removeAddonRow={removeAddonRow}
                                        availableIngredients={availableIngredients}
                                        navigate={navigate}
                                    />
                                ))}
                                {formData.addons.length === 0 && (
                                    <div className="p-20 border-4 border-dashed border-slate-100 rounded-[2rem] text-center bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center opacity-20">
                                            <Hash size={64} strokeWidth={1} className="mb-4" />
                                            <p className="font-black text-sm uppercase tracking-[0.3em] italic">Lista Vazia</p>
                                            <p className="text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">Clique em Adicionar Item para começar a preencher<br/>esta biblioteca de complementos.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
};

export default AddonFormPage;
