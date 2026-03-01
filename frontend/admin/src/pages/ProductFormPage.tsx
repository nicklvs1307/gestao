import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { getCategories } from '../services/api/categories';
import { getProductById, createProduct, updateProduct, uploadProductImage } from '../services/api/products';
import { getIngredients } from '../services/api/stock';
import { globalSizeService } from '../services/api/globalSizes';
import type { GlobalSize } from '../services/api/globalSizes';
import { addonService } from '../services/api/addonService';
import type { AddonGroup } from '../services/api/addonService';
import type { Category } from '@/types/index';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AnimatePresence, motion } from 'framer-motion';

const { 
    ArrowLeft, Plus, Trash2, CheckCircle, Pizza, 
    Layers, Settings2, Loader2, Image: ImageIcon, Package, 
    Save, Check, List, DollarSign, ChevronRight, Star, AlertCircle,
    Truck, Utensils, Globe, FileText, Search, GripVertical, Edit2, Eye,
    Info
} = LucideIcons;

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

function ProductFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
    const [libraryGroups, setLibraryGroups] = useState<AddonGroup[]>([]);
    const [globalSizes, setGlobalSizes] = useState<GlobalSize[]>([]);
    const [inheritedAddonGroups, setInheritedAddonGroups] = useState<AddonGroup[]>([]);
    const [productData, setProductData] = useState<any>(null);

    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors: formErrors } } = useForm<any>({
        defaultValues: { 
            name: '', description: '', price: 0, imageUrl: '', categoryIds: [], 
            isAvailable: true, isFeatured: false, 
            allowDelivery: true, allowPos: true, allowOnline: true,
            stock: 0, addonGroups: [], 
            sizes: [], ingredients: [], productionArea: 'Cozinha', measureUnit: 'UN',
            ncm: '', cfop: '', saiposIntegrationCode: '', origin: 0, taxPercentage: 0,
            pizzaConfig: {
                active: false,
                priceRule: 'higher',
                maxFlavors: 1,
                flavorCategoryId: ''
            }
        }
    });

    const watchedCategoryIds = watch('categoryIds');

    useEffect(() => {
        const selectedCatIds = watchedCategoryIds || [];
        if (selectedCatIds.length > 0 && categories.length > 0) {
            const inherited: AddonGroup[] = [];
            selectedCatIds.forEach((id: string) => {
                const cat = categories.find(c => c.id === id);
                if (cat?.addonGroups) {
                    cat.addonGroups.forEach((g: any) => {
                        if (!inherited.find(ig => ig.id === g.id)) inherited.push(g);
                    });
                }
            });
            setInheritedAddonGroups(inherited);
        } else setInheritedAddonGroups([]);
    }, [watchedCategoryIds, categories]);

    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'tamanhos' | 'complementos' | 'composição' | 'fiscal'>('geral');
    
    const getImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const baseUrl = import.meta.env.VITE_API_URL || (window.location.origin.replace('5173', '3001'));
        return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({ control, name: "sizes" });
    const watchAllFields = watch();

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [cats, ings, library, gSizes] = await Promise.all([ 
                    getCategories(true), getIngredients(), addonService.getAll(), globalSizeService.getAll()
                ]);
                setCategories(cats); setAvailableIngredients(ings); setLibraryGroups(library); setGlobalSizes(gSizes);
                
                if (id && id !== 'new') {
                    const product = await getProductById(id);
                    if (product) {
                        let initialCategoryIds = Array.isArray(product.categories) ? product.categories.map((c: any) => c.id) : (product.categoryId ? [product.categoryId] : []);
                        const formattedData = {
                            ...product,
                            categoryIds: initialCategoryIds, 
                            ingredients: product.ingredients?.map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) || 0 })) || [],
                            sizes: product.sizes?.map((s: any) => ({ ...s, price: Number(s.price) || 0, globalSizeId: s.globalSizeId || '', name: s.name || '' })) || [],
                            stock: Number(product.stock) || 0,
                            price: Number(product.price) || 0,
                            taxPercentage: Number(product.taxPercentage) || 0,
                            pizzaConfig: product.pizzaConfig || { active: false, priceRule: 'higher', maxFlavors: 1, flavorCategoryId: '' }
                        };
                        setProductData(formattedData);
                        reset(formattedData);
                    } else navigate('/products');
                }
            } catch (error) { toast.error("Erro ao carregar dados."); }
            finally { setIsLoading(false); }
        };
        loadData();
    }, [id, navigate, reset]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsUploading(true);
        try { const data = await uploadProductImage(file); setValue('imageUrl', data.imageUrl); toast.success("Imagem atualizada!"); }
        catch (e) { toast.error("Erro no upload."); } finally { setIsUploading(false); }
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const payload = { 
                ...data, 
                price: Number(data.price), 
                stock: Number(data.stock), 
                taxPercentage: Number(data.taxPercentage || 0),
                categoryIds: data.categoryIds, 
                addonGroups: (data.addonGroups || []).map((g: any) => ({ id: g.id })), 
                sizes: (data.sizes || []).map((s: any) => ({ ...s, price: Number(s.price) })), 
                ingredients: (data.ingredients || []).filter((i: any) => i.ingredientId && i.quantity > 0).map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) })),
                pizzaConfig: data.pizzaConfig?.active ? data.pizzaConfig : null
            };
            if (id && id !== 'new') await updateProduct(id, payload);
            else await createProduct(payload);
            toast.success(id ? "Produto atualizado!" : "Produto criado!");
            navigate('/products');
        } catch (e) { toast.error("Erro ao salvar produto."); }
        finally { setIsLoading(false); }
    };

    if (isLoading && !productData && id && id !== 'new') return <div className="flex h-screen items-center justify-center opacity-30"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10 text-slate-900">
            {/* Header Super Compacto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/products')} className="rounded-lg bg-white h-9 w-9 border border-slate-200 shadow-sm"><ArrowLeft size={18}/></Button>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">{id && id !== 'new' ? 'Editar Ficha' : 'Novo Cadastro'}</h1>
                        <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5 italic">Gestão Técnica de Produto</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-9 rounded-lg font-black uppercase text-[9px] text-slate-400" onClick={() => navigate('/products')}>CANCELAR</Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isLoading} className="flex-1 lg:flex-none h-9 rounded-lg px-6 shadow-md font-black italic uppercase tracking-widest gap-2 text-[10px]">
                        <Save size={16} /> {id && id !== 'new' ? 'SALVAR' : 'CADASTRAR'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Coluna Principal */}
                <div className="xl:col-span-8 space-y-4">
                    
                    {/* Tabs Estilo Industrial */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'geral', label: 'Básico', icon: Package },
                            { id: 'tamanhos', label: 'Preços', icon: DollarSign },
                            { id: 'complementos', label: 'Opções', icon: List },
                            { id: 'composição', label: 'Produção', icon: Layers },
                            { id: 'fiscal', label: 'Fiscal', icon: FileText }
                        ].map(tab => (
                            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 min-w-[80px] py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5", activeTab === tab.id ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600")}>
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'geral' && (
                            <motion.div key="geral" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                
                                {/* Status e Destaque */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className={cn("p-2.5 border rounded-xl flex items-center justify-between transition-all cursor-pointer", watch('isAvailable') ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200")} onClick={() => setValue('isAvailable', !watch('isAvailable'))}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", watch('isAvailable') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}><CheckCircle size={16} /></div>
                                            <span className="text-[10px] font-black uppercase italic">Item Ativo</span>
                                        </div>
                                        <div className={cn("w-8 h-4 rounded-full relative", watch('isAvailable') ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", watch('isAvailable') ? "left-4.5" : "left-0.5")} /></div>
                                    </div>
                                    <div className={cn("p-2.5 border rounded-xl flex items-center justify-between transition-all cursor-pointer", watch('isFeatured') ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200")} onClick={() => setValue('isFeatured', !watch('isFeatured'))}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", watch('isFeatured') ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400")}><Star size={16} fill={watch('isFeatured') ? "currentColor" : "none"} /></div>
                                            <span className="text-[10px] font-black uppercase italic">Destaque</span>
                                        </div>
                                        <div className={cn("w-8 h-4 rounded-full relative", watch('isFeatured') ? "bg-amber-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", watch('isFeatured') ? "left-4.5" : "left-0.5")} /></div>
                                    </div>
                                </div>

                                {/* Flags de Visibilidade por Canal */}
                                <Card className="p-3 border-slate-200 bg-slate-50/50">
                                    <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-3 italic flex items-center gap-2">
                                        <Settings2 size={10} className="text-orange-500" /> Disponibilidade por Canal
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer", watch('allowDelivery') ? "bg-white border-blue-200 shadow-sm" : "bg-slate-100/50 border-slate-200 opacity-60")} onClick={() => setValue('allowDelivery', !watch('allowDelivery'))}>
                                            <div className="flex justify-between items-start"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", watch('allowDelivery') ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-400")}><Truck size={16} /></div><div className={cn("w-7 h-3.5 rounded-full relative transition-all", watch('allowDelivery') ? "bg-blue-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all", watch('allowDelivery') ? "left-4" : "left-0.5")} /></div></div>
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">Delivery</span>
                                        </div>
                                        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer", watch('allowPos') ? "bg-white border-emerald-200 shadow-sm" : "bg-slate-100/50 border-slate-200 opacity-60")} onClick={() => setValue('allowPos', !watch('allowPos'))}>
                                            <div className="flex justify-between items-start"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", watch('allowPos') ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}><Utensils size={16} /></div><div className={cn("w-7 h-3.5 rounded-full relative transition-all", watch('allowPos') ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all", watch('allowPos') ? "left-4" : "left-0.5")} /></div></div>
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">Salão / PDV</span>
                                        </div>
                                        <div className={cn("p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer", watch('allowOnline') ? "bg-white border-purple-200 shadow-sm" : "bg-slate-100/50 border-slate-200 opacity-60")} onClick={() => setValue('allowOnline', !watch('allowOnline'))}>
                                            <div className="flex justify-between items-start"><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", watch('allowOnline') ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-400")}><Globe size={16} /></div><div className={cn("w-7 h-3.5 rounded-full relative transition-all", watch('allowOnline') ? "bg-purple-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all", watch('allowOnline') ? "left-4" : "left-0.5")} /></div></div>
                                            <span className="text-[10px] font-black uppercase italic tracking-tighter">Pedido Online</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-4 border-slate-200 bg-white space-y-4 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-8">
                                            <Input label="Nome Comercial do Item" {...register('name', { required: true })} className="h-10 text-xs font-bold" required placeholder="Ex: Pizza Grande de Calabresa" />
                                        </div>
                                        <div className="md:col-span-4">
                                            <Input label="Preço de Venda (R$)" type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="h-10 text-xs font-black text-orange-600" icon={DollarSign} disabled={watch('sizes')?.length > 0} />
                                        </div>
                                        
                                        <div className="md:col-span-12 space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic flex items-center gap-2"><Layers size={10} className="text-orange-500" /> Categorias Vinculadas</label>
                                            <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-100 rounded-xl max-h-24 overflow-y-auto custom-scrollbar">
                                                {categories.map(cat => {
                                                    const currentIds = watch('categoryIds') || [];
                                                    const isSelected = currentIds.includes(cat.id);
                                                    return (
                                                        <button key={cat.id} type="button" onClick={() => isSelected ? setValue('categoryIds', currentIds.filter((id: string) => id !== cat.id)) : setValue('categoryIds', [...currentIds, cat.id])}
                                                            className={cn("px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all border", isSelected ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300")}>
                                                            {cat.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="md:col-span-8">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Descrição Comercial</label>
                                            <textarea {...register('description')} rows={2} className="ui-input w-full h-auto py-2 px-3 font-bold text-[11px] italic rounded-xl border border-slate-200" placeholder="Ex: Calabresa fatiada, cebola roxa e orégano..." />
                                        </div>
                                        
                                        <div className="md:col-span-4">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Setor de Produção</label>
                                            <select {...register('productionArea')} className="ui-input w-full h-10 italic uppercase text-[10px] font-black rounded-xl border border-slate-200 px-3">
                                                <option value="Cozinha">Cozinha</option>
                                                <option value="Bar">Bar</option>
                                                <option value="Pizzaria">Pizzaria</option>
                                                <option value="Copa">Copa</option>
                                            </select>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-4 border-slate-200 bg-white space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-orange-500 text-white p-1.5 rounded-lg"><Pizza size={14} /></div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-slate-900 italic leading-none">Configuração de Pizza</h4>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Marcar este produto como Pizza</p>
                                            </div>
                                        </div>
                                        <div className={cn("p-1.5 border rounded-lg flex items-center gap-3 transition-all cursor-pointer px-3", watch('pizzaConfig.active') ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200")} onClick={() => setValue('pizzaConfig.active', !watch('pizzaConfig.active'))}>
                                            <span className="text-[9px] font-black uppercase italic text-slate-600">{watch('pizzaConfig.active') ? 'ATIVADO' : 'DESATIVADO'}</span>
                                            <div className={cn("w-8 h-4 rounded-full relative", watch('pizzaConfig.active') ? "bg-orange-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", watch('pizzaConfig.active') ? "left-4.5" : "left-0.5")} /></div>
                                        </div>
                                    </div>

                                    {watch('pizzaConfig.active') && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Regra de Preço Padrão</label>
                                                <div className="flex p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
                                                    {[
                                                        { id: 'higher', label: 'Maior Valor' },
                                                        { id: 'average', label: 'Valor Médio' }
                                                    ].map(rule => (
                                                        <button key={rule.id} type="button" onClick={() => setValue('pizzaConfig.priceRule', rule.id)} className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", watch('pizzaConfig.priceRule') === rule.id ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:bg-slate-200")}>{rule.label}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Qtd. de Fatias</label>
                                                <input type="number" {...register('pizzaConfig.sliceCount')} className="ui-input w-full h-10 italic uppercase text-[10px] font-black rounded-xl border border-slate-200 px-3" />
                                            </div>
                                        </motion.div>
                                    )}
                                </Card>

                                <Card className="p-4 border-slate-200 bg-white">
                                    <h4 className="text-[9px] font-black uppercase text-slate-400 mb-3 flex items-center gap-2 italic"><ImageIcon size={10} className="text-orange-500" /> Imagem Comercial</h4>
                                    <div className="flex gap-4 items-center">
                                        <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative group hover:border-orange-500 cursor-pointer" onClick={() => (document.getElementById('img-upload') as any).click()}>
                                            {watch('imageUrl') ? <img src={getImageUrl(watch('imageUrl'))} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-slate-300"/>}
                                            {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={16}/></div>}
                                        </div>
                                        <input type="file" id="img-upload" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                        <div className="flex-1 space-y-2">
                                            <Input label="Caminho do Arquivo" {...register('imageUrl')} className="h-9 text-[10px]" />
                                            <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-tight">Ideal: 1000x1000px, fundo branco ou transparente para o App.</p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'tamanhos' && (
                            <motion.div key="tamanhos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-[10px] font-black uppercase text-slate-400 italic">Variações de Preço por Tamanho</h3>
                                    <Button variant="outline" size="sm" type="button" onClick={() => appendSize({ name: '', price: 0 })} className="h-8 rounded-lg border-slate-200 text-[9px] font-black italic"><Plus size={12} className="mr-1" /> ADICIONAR VARIante</Button>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {sizeFields.map((field, index) => (
                                        <Card key={field.id} className="p-3 border-slate-100 bg-white shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                <div className="md:col-span-5">
                                                    <select {...register(`sizes.${index}.globalSizeId`, { required: true })} onChange={(e) => { const selected = globalSizes.find(s => s.id === e.target.value); if (selected) setValue(`sizes.${index}.name`, selected.name); }} className="ui-input w-full h-9 text-[10px] font-black italic border border-slate-200 rounded-lg px-2"><option value="">Selecionar Tamanho...</option>{globalSizes.map(gs => <option key={gs.id} value={gs.id}>{gs.name}</option>)}</select>
                                                    <input type="hidden" {...register(`sizes.${index}.name`)} />
                                                </div>
                                                <div className="md:col-span-4"><Input type="number" step="0.01" {...register(`sizes.${index}.price`, { required: true, valueAsNumber: true })} className="h-9 text-[10px]" placeholder="R$ 0,00" /></div>
                                                <div className="md:col-span-2"><Input label="" placeholder="SKU" {...register(`sizes.${index}.saiposIntegrationCode`)} className="h-9 text-[10px]" /></div>
                                                <div className="md:col-span-1 flex justify-end"><Button variant="ghost" size="icon" type="button" onClick={() => removeSize(index)} className="h-8 w-8 text-rose-400 hover:bg-rose-50"><Trash2 size={14}/></Button></div>
                                            </div>
                                        </Card>
                                    ))}
                                    {sizeFields.length === 0 && (
                                        <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center opacity-30">
                                            <p className="text-[9px] font-black uppercase italic">Nenhuma variação definida. Usando preço base.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'complementos' && (
                            <motion.div key="complementos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <AddonGroupSelector 
                                    availableGroups={libraryGroups} 
                                    selectedGroups={watch('addonGroups') || []} 
                                    onUpdate={(newGroups) => setValue('addonGroups', newGroups)} 
                                    inheritedGroups={inheritedAddonGroups}
                                />
                            </motion.div>
                        )}

                        {activeTab === 'composição' && (
                            <motion.div key="composição" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <Card className="p-4 border-slate-200 bg-white"><CompositionList control={control} register={register} availableIngredients={availableIngredients} /></Card>
                            </motion.div>
                        )}

                        {activeTab === 'fiscal' && (
                            <motion.div key="fiscal" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <Card className="p-6 border-slate-200 bg-white space-y-6 shadow-sm">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black uppercase italic text-slate-900 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" /> Dados Fiscais & Integração
                                        </h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Informações obrigatórias para emissão de nota fiscal</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input label="NCM (8 dígitos)" {...register('ncm')} className="h-11 font-bold" placeholder="Ex: 21069090" />
                                        <Input label="CFOP Padrão" {...register('cfop')} className="h-11 font-bold" placeholder="Ex: 5102" />
                                        <Input label="Código SKU (Saipos)" {...register('saiposIntegrationCode')} className="h-11 font-black text-orange-600" placeholder="Ex: 11544566" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Unidade de Medida</label>
                                            <select {...register('measureUnit')} className="ui-input w-full h-11 italic uppercase text-[11px] font-black rounded-xl border border-slate-200 px-3 bg-white">
                                                <option value="UN">UN - UNIDADE</option>
                                                <option value="KG">KG - QUILOGRAMA</option>
                                                <option value="LT">LT - LITRO</option>
                                                <option value="DZ">DZ - DÚZIA</option>
                                                <option value="GR">GR - GRAMA</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Origem da Mercadoria</label>
                                            <select {...register('origin')} className="ui-input w-full h-11 italic uppercase text-[10px] font-black rounded-xl border border-slate-200 px-3 bg-white">
                                                <option value={0}>0 - NACIONAL</option>
                                                <option value={1}>1 - ESTRANGEIRA (IMPORTAÇÃO DIRETA)</option>
                                                <option value={2}>2 - ESTRANGEIRA (ADQUIRIDA NO MERCADO INTERNO)</option>
                                            </select>
                                        </div>
                                        <Input label="Carga Tributária (%)" type="number" step="0.01" {...register('taxPercentage')} className="h-11 font-bold" placeholder="0.00" />
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase italic">
                                            Certifique-se de preencher o NCM corretamente para evitar rejeições na emissão de NFC-e. O código SKU é vital para a sincronização automática com a Saipos.
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Coluna do Preview */}
                <div className="xl:col-span-4 h-full">
                    <ProductMobilePreview watchFields={watchAllFields} getImageUrl={getImageUrl} />
                </div>
            </div>
        </div>
    );
}

const SortableAddonGroupItem = ({ group, onRemove, onEdit, onView, isInherited }: { group: any, onRemove: () => void, onEdit: () => void, onView: () => void, isInherited?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0 };

    return (
        <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
            <div className={cn(
                "p-3 rounded-xl border flex items-center justify-between transition-all group/item shadow-sm",
                isInherited ? "bg-orange-50/50 border-orange-100" : "bg-white border-slate-200 hover:border-slate-300"
            )}>
                <div className="flex items-center gap-3">
                    {!isInherited && (
                        <button type="button" {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-lg">
                            <GripVertical size={14} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase italic text-slate-900 tracking-tight leading-none">{group.name}</span>
                            {isInherited && <span className="text-[7px] font-black bg-orange-500 text-white px-1 py-0.5 rounded italic uppercase">Herdado</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                {group.addons?.length || 0} Itens • {group.type === 'single' ? 'Escolha Única' : 'Múltipla'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" type="button" onClick={onView} className="h-8 w-8 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg"><Eye size={14} /></Button>
                    <Button variant="ghost" size="icon" type="button" onClick={onEdit} className="h-8 w-8 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-lg"><Edit2 size={14} /></Button>
                    {!isInherited && (
                        <Button variant="ghost" size="icon" type="button" onClick={onRemove} className="h-8 w-8 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg"><Trash2 size={14} /></Button>
                    )}
                </div>
            </div>
        </div>
    );
};

function AddonGroupSelector({ availableGroups, selectedGroups, onUpdate, inheritedGroups }: { availableGroups: AddonGroup[], selectedGroups: any[], onUpdate: (groups: any[]) => void, inheritedGroups: any[] }) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearch] = useState(false);
    const [viewingItems, setViewingItems] = useState<AddonGroup | null>(null);

    const filteredAvailable = availableGroups.filter(g => 
        !selectedGroups.find(sg => sg.id === g.id) && 
        !inheritedGroups.find(ig => ig.id === g.id) &&
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = selectedGroups.findIndex(g => g.id === active.id);
            const newIndex = selectedGroups.findIndex(g => g.id === over.id);
            onUpdate(arrayMove(selectedGroups, oldIndex, newIndex));
        }
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Lista Ativa / Sequência */}
            <div className="md:col-span-7 space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 italic">Sequência de Exibição (Fluxo do Cliente)</h3>
                    <Button variant="ghost" size="sm" type="button" onClick={() => setIsSearch(!isSearching)} className={cn("h-8 rounded-lg text-[9px] font-black italic", isSearching ? "text-orange-600 bg-orange-50" : "text-slate-400 bg-slate-50")}><Plus size={14} className="mr-1" /> VINCULAR NOVO</Button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {inheritedGroups.map(group => (
                                <SortableAddonGroupItem key={group.id} group={group} isInherited onRemove={() => {}} onEdit={() => navigate(`/addons/${group.id}`)} onView={() => setViewingItems(group)} />
                            ))}
                            {selectedGroups.map((group, index) => (
                                <SortableAddonGroupItem key={group.id} group={group} onRemove={() => onUpdate(selectedGroups.filter((_, i) => i !== index))} onEdit={() => navigate(`/addons/${group.id}`)} onView={() => setViewingItems(group)} />
                            ))}
                            {selectedGroups.length === 0 && inheritedGroups.length === 0 && (
                                <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center opacity-30 bg-slate-50/50">
                                    <List size={32} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-[9px] font-black uppercase italic">Nenhum complemento vinculado</p>
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Painel de Busca Lateral */}
            <div className="md:col-span-5 space-y-4">
                {isSearching ? (
                    <Card className="p-4 border-orange-500/20 bg-orange-50/30 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[10px] font-black uppercase text-orange-600 italic">Biblioteca Global</h4>
                            <button onClick={() => setIsSearch(false)} className="text-orange-400 hover:text-orange-600"><X size={14} /></button>
                        </div>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300" size={14} />
                            <input type="text" placeholder="Buscar grupo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-orange-100 outline-none text-[11px] font-bold italic" />
                        </div>
                        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            {filteredAvailable.map(group => (
                                <div key={group.id} onClick={() => { onUpdate([...selectedGroups, group]); setSearchTerm(''); }} className="p-2.5 bg-white border border-orange-100 rounded-xl flex items-center justify-between cursor-pointer hover:border-orange-500 transition-all group/btn">
                                    <span className="text-[10px] font-black uppercase italic text-slate-700 truncate">{group.name}</span>
                                    <Plus size={12} className="text-orange-400 group-hover/btn:scale-125 transition-transform" />
                                </div>
                            ))}
                            {filteredAvailable.length === 0 && <p className="text-[8px] font-bold text-slate-400 text-center py-4 uppercase">Nada encontrado</p>}
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <Card className="p-4 border-slate-100 bg-white">
                            <div className="flex items-center gap-2 mb-3">
                                <Info size={14} className="text-blue-500" />
                                <h4 className="text-[10px] font-black uppercase text-slate-900 italic">Dica de Gestão</h4>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase italic">
                                Arraste os grupos para definir a ordem que o cliente verá no cardápio. Complementos herdados da categoria aparecem sempre no topo por padrão.
                            </p>
                        </Card>
                        <Button variant="outline" className="w-full h-10 rounded-xl border-dashed text-[10px] font-black italic" onClick={() => navigate('/addons/new')}><Plus size={16} className="mr-2" /> CRIAR NOVO GRUPO</Button>
                    </div>
                )}
            </div>

            {/* Visualizador de Itens (Modal Overlay Simples) */}
            <AnimatePresence>
                {viewingItems && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingItems(null)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                                <span className="text-[11px] font-black uppercase italic tracking-wider">{viewingItems.name}</span>
                                <button onClick={() => setViewingItems(null)}><X size={18} /></button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                                {viewingItems.addons.map((a, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            {a.imageUrl && <img src={getImageUrl(a.imageUrl)} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                                            <span className="text-[10px] font-black uppercase italic text-slate-700">{a.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 italic">+ R$ {Number(a.price).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

function CompositionList({ control, register, availableIngredients }: { control: any, register: any, availableIngredients: any[] }) {
    const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-2 px-1"><h3 className="text-[10px] font-black uppercase text-slate-400 italic">Ficha Técnica / Insumos</h3><Button type="button" variant="outline" size="sm" onClick={() => append({ ingredientId: '', quantity: 0 })} className="h-7 rounded-lg border-orange-500 text-orange-600 font-black italic text-[9px]"><Plus size={12} className="mr-1" /> VINCULAR INSUMO</Button></div>
            <div className="space-y-1.5">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex-1"><select {...register(`ingredients.${index}.ingredientId`, { required: true })} className="ui-input w-full h-8 text-[10px] font-black italic border border-slate-200 rounded-lg px-2 bg-white"><option value="">Insumo...</option>{availableIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}</select></div>
                        <div className="w-20 relative"><input type="number" step="0.001" {...register(`ingredients.${index}.quantity`, { required: true, valueAsNumber: true })} className="ui-input w-full h-8 font-black text-orange-600 text-[10px] pr-6 italic border border-slate-200 rounded-lg px-2 bg-white" /><span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300 uppercase">Qtd</span></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-rose-400 hover:bg-rose-50"><Trash2 size={14} /></Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <div className="p-6 border-2 border-dashed border-slate-100 rounded-xl text-center opacity-20"><p className="text-[9px] font-black uppercase italic">Sem ficha técnica</p></div>
                )}
            </div>
        </div>
    );
};

function ProductMobilePreview({ watchFields, getImageUrl }: { watchFields: any, getImageUrl: (url: string) => string }) {
    const { name, description, price, imageUrl, addonGroups, sizes } = watchFields;
    const [selectedSizePreview, setSelectedSizePreview] = useState<any>(null);
    useEffect(() => { if (sizes && sizes.length > 0 && !selectedSizePreview) setSelectedSizePreview(sizes[0]); }, [sizes, selectedSizePreview]);
    
    const lowestPrice = sizes?.length > 0 ? Math.min(...sizes.map((s: any) => Number(s.price) || 0)) : price;

    return (
        <div className="sticky top-20 hidden xl:block animate-in fade-in zoom-in-95 duration-700 scale-90 origin-top">
            <div className="w-[280px] h-[560px] bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl border-[6px] border-slate-800 relative mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-xl z-50 flex items-center justify-center"><div className="w-8 h-1 bg-slate-700 rounded-full" /></div>
                <div className="w-full h-full bg-slate-50 rounded-[2rem] overflow-hidden flex flex-col relative">
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                        <div className="h-36 bg-slate-200 relative group overflow-hidden">{imageUrl ? <img src={getImageUrl(imageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3"><h3 className="text-white font-black text-xs italic uppercase leading-none mb-1">{name || 'Nome do Item'}</h3><p className="text-white/60 text-[7px] font-medium line-clamp-2 leading-tight">{description || 'Descrição comercial do produto para o cliente final...'}</p></div>
                        </div>
                        <div className="p-3 space-y-3">
                            {sizes?.length > 0 && <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100"><span className="text-[7px] font-black uppercase text-slate-900 italic block mb-1.5">Escolha o Tamanho</span><div className="space-y-1">{sizes.map((s: any, i: number) => <div key={i} onClick={() => setSelectedSizePreview(s)} className={cn("p-1.5 rounded-lg border flex justify-between items-center cursor-pointer transition-all", selectedSizePreview?.name === s.name ? "border-orange-500 bg-orange-50" : "border-slate-50")}><span className={cn("text-[8px] font-black uppercase italic", selectedSizePreview?.name === s.name ? "text-orange-600" : "text-slate-700")}>{s.name}</span><span className="text-[9px] font-black text-slate-900">R$ {Number(s.price).toFixed(2)}</span></div>)}</div></div>}
                            {addonGroups?.map((group: any, i: number) => (
                                <div key={i} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[7px] font-black uppercase text-slate-900 italic">{group.name}</span>
                                        {group.isFlavorGroup && <span className="text-[6px] font-black bg-amber-500 text-white px-1 rounded uppercase">Sabores</span>}
                                    </div>
                                    <div className="space-y-1">{group.addons?.slice(0, 2).map((a: any, idx: number) => <div key={idx} className="flex justify-between items-center text-[7px] font-bold text-slate-500"><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded bg-slate-100" /><span>{a.name}</span></div><span className="text-emerald-600">+ R$ {Number(a.price).toFixed(2)}</span></div>)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-100 flex items-center justify-between shadow-xl"><div className="flex flex-col"><span className="text-[6px] font-black text-slate-400 uppercase">Subtotal</span><span className="text-base font-black text-slate-900 italic tracking-tighter leading-none">R$ {Number(selectedSizePreview?.price || lowestPrice || 0).toFixed(2)}</span></div><Button size="sm" className="h-8 px-3 rounded-lg italic font-black text-[8px]">ADICIONAR</Button></div>
                </div>
            </div>
        </div>
    );
};

export default ProductFormPage;
