import React, { useState, useEffect, useMemo } from 'react';
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
    Save, Check, List, DollarSign, Target, ChevronRight
} = LucideIcons;

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
            isAvailable: true, isFeatured: false, stock: 0, addonGroups: [], 
            sizes: [], ingredients: [], productionArea: 'Cozinha', measureUnit: 'UN'
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
    const [activeTab, setActiveTab] = useState<'geral' | 'tamanhos' | 'complementos' | 'composição'>('geral');
    const [isPizza, setIsPizza] = useState(false);
    const [pizzaConfig, setPizzaConfig] = useState<any>({ maxFlavors: 2, sliceCount: 8, priceRule: 'higher', flavorCategoryId: '', sizes: {} });
    
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
                
                if (id) {
                    const product = await getProductById(id);
                    if (product) {
                        let initialCategoryIds = Array.isArray(product.categories) ? product.categories.map((c: any) => c.id) : (product.categoryId ? [product.categoryId] : []);
                        if (product.pizzaConfig) { setIsPizza(true); setPizzaConfig((prev: any) => ({ ...prev, ...product.pizzaConfig })); }
                        const formattedData = {
                            ...product,
                            categoryIds: initialCategoryIds, 
                            ingredients: product.ingredients?.map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) || 0 })) || [],
                            sizes: product.sizes?.map((s: any) => ({ ...s, price: Number(s.price) || 0, globalSizeId: s.globalSizeId || '', name: s.name || '' })) || [],
                            stock: Number(product.stock) || 0,
                            price: Number(product.price) || 0,
                        };
                        setProductData(formattedData);
                        reset(formattedData);
                    } else navigate('/products');
                }
            } catch (error) { toast.error("Erro ao carregar dados."); }
            finally { setIsLoading(false); }
        };
        loadData();
    }, [id, navigate]);

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
                ...data, price: Number(data.price), stock: Number(data.stock), 
                categoryIds: data.categoryIds, addonGroups: data.addonGroups?.map((g: any) => ({ id: g.id })), 
                sizes: data.sizes?.map((s: any) => ({ ...s, price: Number(s.price) })), 
                ingredients: data.ingredients?.filter((i: any) => i.ingredientId && i.quantity > 0).map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) })), 
                pizzaConfig: isPizza ? pizzaConfig : null 
            };
            if (id) await updateProduct(id, payload);
            else await createProduct(payload);
            toast.success(id ? "Produto atualizado!" : "Produto criado com sucesso!");
            navigate('/products');
        } catch (e) { toast.error("Erro ao salvar produto."); }
        finally { setIsLoading(false); }
    };

    if (isLoading && !productData && id) return <div className="flex h-screen items-center justify-center opacity-30"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Compacto Premium */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-3 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/products')} className="rounded-full bg-white h-10 w-10 shadow-sm"><ArrowLeft size={20}/></Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{id ? 'Editar Produto' : 'Novo Produto'}</h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1 italic">Gestão de Cardápio</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-11 rounded-xl font-black uppercase text-[10px] text-slate-400" onClick={() => navigate('/products')}>DESCARTAR</Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isLoading} className="flex-1 lg:flex-none h-11 rounded-xl px-8 shadow-lg shadow-orange-900/10 font-black italic uppercase tracking-widest gap-2 text-[11px]">
                        <Save size={18} /> {id ? 'SALVAR' : 'CRIAR'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Coluna do Formulário */}
                <div className="xl:col-span-8 space-y-8">
                    
                    {/* Tabs Reduzidas */}
                    <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1 shadow-inner w-full max-w-xl overflow-x-auto no-scrollbar">
                        {[
                            { id: 'geral', label: 'Básico', icon: Package },
                            { id: 'tamanhos', label: 'Tamanhos', icon: Pizza },
                            { id: 'complementos', label: 'Opcionais', icon: List },
                            { id: 'composição', label: 'Insumos', icon: Layers }
                        ].map(tab => (
                            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap px-4", activeTab === tab.id ? "bg-white text-slate-900 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'geral' && (
                            <motion.div key="geral" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center justify-between", watch('isAvailable') ? "border-emerald-500 bg-emerald-50/10" : "border-slate-100 bg-white")} onClick={() => setValue('isAvailable', !watch('isAvailable'))}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", watch('isAvailable') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}><CheckCircle size={20} /></div>
                                            <div><p className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1">Item Ativo</p><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">No Cardápio</span></div>
                                        </div>
                                        <div className={cn("w-10 h-5 rounded-full relative transition-all", watch('isAvailable') ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", watch('isAvailable') ? "left-6" : "left-1")} /></div>
                                    </Card>
                                    <Card className={cn("p-4 border-2 transition-all cursor-pointer flex items-center justify-between", watch('isFeatured') ? "border-amber-500 bg-amber-50/10" : "border-slate-100 bg-white")} onClick={() => setValue('isFeatured', !watch('isFeatured'))}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", watch('isFeatured') ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400")}><Plus size={20} className="rotate-45" /></div>
                                            <div><p className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1">Destaque</p><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Topo da Lista</span></div>
                                        </div>
                                        <div className={cn("w-10 h-5 rounded-full relative transition-all", watch('isFeatured') ? "bg-amber-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", watch('isFeatured') ? "left-6" : "left-1")} /></div>
                                    </Card>
                                </div>

                                <Card className="p-6 md:p-8 border-slate-200 shadow-xl bg-white space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <Input label="Nome do Produto" {...register('name', { required: true })} required placeholder="Ex: Pizza Margherita" />
                                        </div>
                                        
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic flex items-center gap-2">
                                                <Layers size={12} className="text-orange-500" /> Categorias
                                            </label>
                                            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                                                {categories.map(cat => {
                                                    const currentIds = watch('categoryIds') || [];
                                                    const isSelected = currentIds.includes(cat.id);
                                                    return (
                                                        <button key={cat.id} type="button" onClick={() => isSelected ? setValue('categoryIds', currentIds.filter((id: string) => id !== cat.id)) : setValue('categoryIds', [...currentIds, cat.id])}
                                                            className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-2", isSelected ? "bg-orange-500 border-orange-500 text-white shadow-md" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300")}>
                                                            {cat.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Descrição</label>
                                            <textarea {...register('description')} rows={2} className="ui-input w-full h-auto py-3 font-bold text-xs italic" placeholder="Sabores e ingredientes..." />
                                        </div>
                                        
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                            <Input label="Preço Base (R$)" type="number" step="0.01" {...register('price', { valueAsNumber: true })} icon={DollarSign} disabled={watch('sizes')?.length > 0} />
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Área de Preparo</label>
                                                <select {...register('productionArea')} className="ui-input w-full h-11 italic uppercase text-[10px] font-black">
                                                    <option value="Cozinha">Cozinha Principal</option>
                                                    <option value="Bar">Bar / Bebidas</option>
                                                    <option value="Pizzaria">Pizzaria / Forno</option>
                                                    <option value="Sobremesas">Confeitaria</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50">
                                            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><Settings2 size={12} className="text-blue-500" /> Fiscal & Integração</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Input label="NCM" {...register('ncm')} placeholder="8 dígitos" />
                                                    <Input label="CFOP" {...register('cfop')} placeholder="5102" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Unidade</label>
                                                        <select {...register('measureUnit')} className="ui-input w-full h-11 italic uppercase text-[10px] font-black"><option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option><option value="DZ">DZ</option></select>
                                                    </div>
                                                    <Input label="Cód. Integ." {...register('saiposIntegrationCode')} placeholder="SKU" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-slate-50">
                                        <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 italic"><ImageIcon size={12} className="text-orange-500" /> Foto do Produto</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                            <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center p-4 group hover:border-orange-500 transition-all cursor-pointer overflow-hidden relative" onClick={() => (document.getElementById('img-upload') as any).click()}>
                                                {watch('imageUrl') ? <img src={getImageUrl(watch('imageUrl'))} className="w-full h-full object-contain drop-shadow-lg" alt="" /> : <div className="text-center"><ImageIcon size={32} className="mx-auto text-slate-200 mb-1"/><p className="text-[8px] font-black text-slate-400 uppercase">Enviar</p></div>}
                                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-orange-500" size={24}/></div>}
                                            </div>
                                            <input type="file" id="img-upload" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                            <div className="md:col-span-2 space-y-4">
                                                <Input label="URL Direta (Opcional)" {...register('imageUrl')} />
                                                <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 relative overflow-hidden">
                                                    <p className="text-white font-black uppercase italic tracking-tighter text-xs mb-1 relative z-10">Dica</p>
                                                    <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest leading-relaxed relative z-10">Fotos reais vendem muito mais.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'tamanhos' && (
                            <motion.div key="tamanhos" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-6">
                                <Card className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between", isPizza ? "border-orange-500 bg-orange-50/10 shadow-md" : "border-slate-100 bg-white")} onClick={() => setIsPizza(!isPizza)}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform", isPizza ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}><Pizza size={24} /></div>
                                        <div><h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">Modo Pizzaria</h3><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Habilitar múltiplos sabores</p></div>
                                    </div>
                                    <div className={cn("w-10 h-5 rounded-full relative transition-all", isPizza ? "bg-orange-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", isPizza ? "left-6" : "left-1")} /></div>
                                </Card>

                                {isPizza && (
                                    <Card className="p-6 border-orange-100 bg-white shadow-xl space-y-6 animate-in zoom-in-95 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <h4 className="text-[9px] font-black uppercase text-slate-400 italic">Origem dos Sabores</h4>
                                                <select value={pizzaConfig.flavorCategoryId} onChange={e => setPizzaConfig({...pizzaConfig, flavorCategoryId: e.target.value})} className="ui-input w-full h-11 italic uppercase text-[10px] font-black">{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-[9px] font-black uppercase text-slate-400 italic">Cálculo de Preço</h4>
                                                <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                                                    <button type="button" onClick={() => setPizzaConfig({...pizzaConfig, priceRule: 'higher'})} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all", pizzaConfig.priceRule === 'higher' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}>MAIOR</button>
                                                    <button type="button" onClick={() => setPizzaConfig({...pizzaConfig, priceRule: 'average'})} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all", pizzaConfig.priceRule === 'average' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}>MÉDIO</button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1"><h3 className="text-[10px] font-black uppercase text-slate-400 italic">Variações</h3><Button variant="outline" size="sm" type="button" onClick={() => appendSize({ name: '', price: 0 })} className="h-8 rounded-lg border-slate-200 text-[9px] font-black italic"><Plus size={12} className="mr-1" /> ADICIONAR</Button></div>
                                    <div className="space-y-3">
                                        {sizeFields.map((field, index) => {
                                            const sizeName = watch(`sizes.${index}.name`);
                                            const currentSizeConfig = pizzaConfig.sizes[sizeName] || { active: true, slices: 8, maxFlavors: 2 };
                                            return (
                                                <Card key={field.id} className="p-4 border-slate-100 hover:border-orange-500/20 transition-all bg-white shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                        <div className="md:col-span-4">
                                                            <select {...register(`sizes.${index}.globalSizeId`, { required: true })} onChange={(e) => { const selected = globalSizes.find(s => s.id === e.target.value); if (selected) setValue(`sizes.${index}.name`, selected.name); }} className="ui-input w-full h-10 text-[10px] font-black italic"><option value="">Tamanho...</option>{globalSizes.map(gs => <option key={gs.id} value={gs.id}>{gs.name}</option>)}</select>
                                                            <input type="hidden" {...register(`sizes.${index}.name`)} />
                                                        </div>
                                                        <div className="md:col-span-3"><Input type="number" step="0.01" {...register(`sizes.${index}.price`, { required: true, valueAsNumber: true })} placeholder="R$ 0,00" /></div>
                                                        {isPizza && (
                                                            <div className="md:col-span-4 grid grid-cols-2 gap-2">
                                                                <input type="number" placeholder="Fatias" value={currentSizeConfig.slices} onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, [sizeName]: {...currentSizeConfig, active: true, slices: parseInt(e.target.value)}}})} className="ui-input w-full h-10 text-center text-[10px]" />
                                                                <select value={currentSizeConfig.maxFlavors} onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, [sizeName]: {...currentSizeConfig, active: true, maxFlavors: parseInt(e.target.value)}}})} className="ui-input w-full h-10 text-center text-[10px]"><option value="1">1 Sab</option><option value="2">2 Sab</option><option value="3">3 Sab</option><option value="4">4 Sab</option></select>
                                                            </div>
                                                        )}
                                                        <div className="md:col-span-1 flex justify-end"><Button variant="ghost" size="icon" type="button" onClick={() => removeSize(index)} className="h-9 w-9 rounded-lg bg-rose-50 text-rose-400 hover:text-rose-600"><Trash2 size={16}/></Button></div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'complementos' && (
                            <motion.div key="complementos" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-6">
                                {inheritedAddonGroups.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {inheritedAddonGroups.map(group => (
                                            <div key={group.id} className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600"><CheckCircle size={16} /></div>
                                                <div><span className="block text-[10px] font-black uppercase italic text-slate-900">{group.name}</span><span className="text-[7px] font-bold text-orange-400 uppercase">HERDADO</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Card className="p-6 border-slate-200 shadow-xl bg-white space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                        <h3 className="text-sm font-black text-slate-900 uppercase italic">Biblioteca de Adicionais</h3>
                                        <Button variant="outline" size="sm" type="button" onClick={() => navigate('/addons')} className="h-8 rounded-lg text-[9px] font-black italic">GERENCIAR</Button>
                                    </div>
                                    <GlobalAddonSelector availableGroups={libraryGroups} selectedGroupIds={watch('addonGroups')?.map((g: any) => g.id) || []} onToggle={(id) => { const current = watch('addonGroups') || []; const exists = current.find((g: any) => g.id === id); exists ? setValue('addonGroups', current.filter((g: any) => g.id !== id)) : setValue('addonGroups', [...current, libraryGroups.find(g => g.id === id)]); }} />
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'composição' && (
                            <motion.div key="composição" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-6">
                                <Card className="p-6 border-emerald-100 bg-white shadow-xl"><CompositionList control={control} register={register} availableIngredients={availableIngredients} /></Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Preview Master Reduzido */}
                <div className="xl:col-span-4 h-full">
                    <ProductMobilePreview watchFields={watchAllFields} isPizza={isPizza} pizzaConfig={pizzaConfig} getImageUrl={getImageUrl} />
                </div>
            </div>
        </div>
    );
}

function GlobalAddonSelector({ availableGroups, selectedGroupIds, onToggle }: { availableGroups: AddonGroup[], selectedGroupIds: string[], onToggle: (id: string) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableGroups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id!);
                return (
                    <div key={group.id} onClick={() => onToggle(group.id!)} className={cn("p-3 border-2 rounded-xl transition-all cursor-pointer flex items-center justify-between group", isSelected ? "border-orange-500 bg-orange-50/30" : "border-slate-100 bg-white hover:border-slate-200")}>
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}><Settings2 size={18} /></div>
                            <div><span className="block text-xs font-black uppercase italic tracking-tight">{group.name}</span><span className="text-[8px] font-bold text-slate-400 uppercase">{group.addons.length} ITENS</span></div>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200")}>{isSelected && <Check size={12} strokeWidth={4} />}</div>
                    </div>
                );
            })}
        </div>
    );
};

function CompositionList({ control, register, availableIngredients }: { control: any, register: any, availableIngredients: any[] }) {
    const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 px-1"><h3 className="text-[10px] font-black uppercase text-slate-400 italic">Ficha Técnica</h3><Button type="button" variant="outline" size="sm" onClick={() => append({ ingredientId: '', quantity: 0 })} className="h-8 rounded-lg border-orange-500 text-orange-600 font-black italic text-[9px]"><Plus size={12} className="mr-1" /> VINCULAR</Button></div>
            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex-1"><select {...register(`ingredients.${index}.ingredientId`, { required: true })} className="ui-input w-full h-10 text-[10px] font-black italic"><option value="">Insumo...</option>{availableIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}</select></div>
                        <div className="w-24 relative"><input type="number" step="0.001" {...register(`ingredients.${index}.quantity`, { required: true, valueAsNumber: true })} className="ui-input w-full h-10 font-black text-orange-600 text-[10px] pr-8 italic" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300">QTD</span></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-9 w-9 text-rose-400"><Trash2 size={16} /></Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

function ProductMobilePreview({ watchFields, isPizza, pizzaConfig, getImageUrl }: { watchFields: any, isPizza: boolean, pizzaConfig: any, getImageUrl: (url: string) => string }) {
    const { name, description, price, imageUrl, addonGroups, sizes } = watchFields;
    const [selectedSizePreview, setSelectedSizePreview] = useState<any>(null);
    useEffect(() => { if (sizes && sizes.length > 0 && !selectedSizePreview) setSelectedSizePreview(sizes[0]); }, [sizes, selectedSizePreview]);
    return (
        <div className="sticky top-24 hidden xl:block animate-in fade-in zoom-in-95 duration-700 scale-95 origin-top">
            <div className="w-[300px] h-[600px] bg-slate-900 rounded-[3rem] p-2.5 shadow-2xl border-[8px] border-slate-800 relative mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center"><div className="w-10 h-1 bg-slate-700 rounded-full" /></div>
                <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden flex flex-col relative">
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                        <div className="h-40 bg-slate-200 relative group overflow-hidden">{imageUrl ? <img src={getImageUrl(imageUrl)} alt="" className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-300"><ImageIcon size={40} /></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4"><h3 className="text-white font-black text-sm italic uppercase leading-none mb-1">{name || 'Item'}</h3><p className="text-white/60 text-[8px] font-medium line-clamp-2">{description || 'Descrição...'}</p></div>
                        </div>
                        <div className="p-4 space-y-4">
                            {sizes?.length > 0 && <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><span className="text-[8px] font-black uppercase text-slate-900 italic block mb-2">Selecione o Tamanho</span><div className="space-y-1.5">{sizes.map((s: any, i: number) => <div key={i} onClick={() => setSelectedSizePreview(s)} className={cn("p-2 rounded-lg border flex justify-between items-center cursor-pointer transition-all", selectedSizePreview?.name === s.name ? "border-orange-500 bg-orange-50" : "border-slate-50")}><span className={cn("text-[9px] font-black uppercase italic", selectedSizePreview?.name === s.name ? "text-orange-600" : "text-slate-700")}>{s.name}</span><span className="text-[10px] font-black text-slate-900">R$ {Number(s.price).toFixed(2)}</span></div>)}</div></div>}
                            {isPizza && <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 text-center py-6"><div><Pizza size={24} className="text-orange-200 mx-auto mb-1" /><p className="text-[8px] font-black text-slate-400 uppercase italic">Sabores Ativos</p></div></div>}
                            {addonGroups?.map((group: any, i: number) => <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100"><span className="text-[8px] font-black uppercase text-slate-900 italic block mb-2">{group.name}</span><div className="space-y-1">{group.addons?.slice(0, 2).map((a: any, idx: number) => <div key={idx} className="flex justify-between items-center text-[8px] font-bold text-slate-500"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-slate-100" /><span>{a.name}</span></div><span className="text-emerald-600">+ {Number(a.price).toFixed(2)}</span></div>)}</div></div>)}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex items-center justify-between shadow-xl"><div className="flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase">Subtotal</span><span className="text-lg font-black text-slate-900 italic tracking-tighter">R$ {Number(selectedSizePreview?.price || price || 0).toFixed(2)}</span></div><Button size="sm" className="h-10 px-4 rounded-xl italic font-black text-[9px]">ADICIONAR</Button></div>
                </div>
            </div>
        </div>
    );
};

export default ProductFormPage;
