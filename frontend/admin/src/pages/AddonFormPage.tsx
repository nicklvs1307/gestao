import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addonService } from '../services/api/addonService';
import type { AddonGroup, Addon } from '../services/api/addonService';
import { uploadProductImage } from '../services/api/products';
import { 
    ArrowLeft, Plus, Trash2, Save, X, GripVertical, 
    Loader2, Settings, CheckCircle, Info, Copy, 
    Image as ImageIcon, Upload, List, Hash
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

const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || (window.location.origin.replace('5173', '3001'));
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};

const SortableAddonRow = ({ addon, index, updateAddon, removeAddonRow }: {
    addon: Addon;
    index: number;
    updateAddon: (index: number, field: keyof Addon, value: any) => void;
    removeAddonRow: (index: number) => void;
}) => {
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
                        onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value) || 0)} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-2">
                    <Input 
                        placeholder="Cód Integração" 
                        value={addon.saiposIntegrationCode || ''} 
                        onChange={(e) => updateAddon(index, 'saiposIntegrationCode', e.target.value)} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-1">
                    <Input 
                        type="number" 
                        placeholder="Qtd Máx" 
                        value={addon.maxQuantity} 
                        onChange={(e) => updateAddon(index, 'maxQuantity', parseInt(e.target.value) || 1)} 
                        className="h-9 text-xs"
                    />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                    <div className="relative flex-1">
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "w-full h-9 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all",
                                addon.imageUrl ? "border-orange-500/30 text-orange-600 bg-orange-50/30" : "border-slate-200 text-slate-400 hover:border-slate-300"
                            )}
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                            {addon.imageUrl ? 'Alterar Foto' : 'Subir Foto'}
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
                    placeholder="Descrição curta do item (aparece no cardápio)" 
                    value={addon.description || ''} 
                    onChange={(e) => updateAddon(index, 'description', e.target.value)} 
                    className="h-8 text-[10px] italic font-medium"
                />
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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const loadData = async () => {
            if (id && id !== 'new') {
                try {
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
                } catch (error) {
                    toast.error("Erro ao carregar dados.");
                } finally {
                    setIsLoading(false);
                }
            } else {
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Carregando Ficha Técnica...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Técnico */}
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
                {/* Coluna Principal: Regras e Configuração */}
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
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic block">Ativa lógica de precificação de Pizzas</span>
                                    </div>
                                </Card>
                            </div>

                            {formData.isFlavorGroup && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-amber-100/30 border border-amber-200 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Info size={14} className="text-amber-600" />
                                        <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-widest italic">Regra de Preço</h4>
                                    </div>
                                    <div className="flex p-1 bg-white rounded-xl gap-1 border border-amber-200">
                                        {[
                                            { id: 'higher', label: 'Maior Valor' },
                                            { id: 'average', label: 'Valor Médio' }
                                        ].map(rule => (
                                            <button key={rule.id} type="button" onClick={() => setFormData({ ...formData, priceRule: rule.id as any })} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", formData.priceRule === rule.id ? "bg-amber-500 text-white shadow-sm" : "text-amber-400 hover:bg-amber-50")}>{rule.label}</button>
                                        ))}
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

                {/* Coluna de Itens (Addons) */}
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
