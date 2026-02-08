import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { getCategories } from '../services/api/categories';
import { getProductById, createProduct, updateProduct, uploadProductImage } from '../services/api/products';
import { getIngredients } from '../services/api/stock';
import { globalSizeService, GlobalSize } from '../services/api/globalSizes';
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
    
    // Novo: Grupos herdados da categoria selecionada
    const [inheritedAddonGroups, setInheritedAddonGroups] = useState<AddonGroup[]>([]);
    
    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors: formErrors } } = useForm<any>({
        defaultValues: { 
            name: '', 
            description: '', 
            price: 0, 
            imageUrl: '', 
            categoryIds: [], 
            isAvailable: true, 
            isFeatured: false, 
            stock: 0, 
            addonGroups: [], 
            sizes: [], 
            ingredients: [], 
            productionArea: 'Cozinha',
            measureUnit: 'UN'
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
                        if (!inherited.find(ig => ig.id === g.id)) {
                            inherited.push(g);
                        }
                    });
                }
            });
            setInheritedAddonGroups(inherited);
        } else {
            setInheritedAddonGroups([]);
        }
    }, [watchedCategoryIds, categories]);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'tamanhos' | 'complementos' | 'composição'>('geral');
    const [isPizza, setIsPizza] = useState(false);
    const [pizzaConfig, setPizzaConfig] = useState<any>({ maxFlavors: 2, sliceCount: 8, priceRule: 'higher', flavorCategoryId: '', sizes: { 'Grande': { active: true, maxFlavors: 2 }, 'Média': { active: true, maxFlavors: 2 }, 'Pequena': { active: true, maxFlavors: 1 } } });
    
    // Helper para formatar URL da imagem
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
                    getCategories(true),
                    getIngredients(), 
                    addonService.getAll(),
                    globalSizeService.getAll()
                ]);
                setCategories(cats); 
                setAvailableIngredients(ings); 
                setLibraryGroups(library);
                setGlobalSizes(gSizes);
                
                if (id) {
                    const product = await getProductById(id);
                    
                    if (product) {
                        console.log("Produto carregado para edição:", product);
                        
                        const initialCategoryIds = product.categories?.map((c: any) => c.id) || (product.categoryId ? [product.categoryId] : []);
                        
                        if (product.pizzaConfig) { 
                            setIsPizza(true); 
                            setPizzaConfig((prev: any) => ({ ...prev, ...product.pizzaConfig })); 
                        }

                        // Garante que o nome e outros campos básicos não sejam perdidos
                        const formData = {
                            ...product,
                            name: product.name || '',
                            description: product.description || '',
                            imageUrl: product.imageUrl || '',
                            categoryIds: initialCategoryIds, 
                            ingredients: product.ingredients?.map((i: any) => ({ 
                                ingredientId: i.ingredientId, 
                                quantity: Number(i.quantity) || 0 
                            })) || [],
                            sizes: product.sizes?.map((s: any) => ({
                                ...s,
                                price: Number(s.price) || 0,
                                globalSizeId: s.globalSizeId || ''
                            })) || [],
                            productionArea: product.productionArea || 'Cozinha',
                            measureUnit: product.measureUnit || 'UN',
                            stock: Number(product.stock) || 0,
                            price: Number(product.price) || 0,
                            ncm: product.ncm || '',
                            cfop: product.cfop || '',
                            saiposIntegrationCode: product.saiposIntegrationCode || ''
                        };

                        console.log("Resetando formulário com:", formData);
                        reset(formData);
                        
                        // Fallback: Se o reset não disparar o watch, forçamos o estado de carregamento a terminar
                        // mas garantimos que os valores básicos existam
                        if (product.name) {
                            setValue('name', product.name);
                        }
                    } else {
                        toast.error("Produto não encontrado.");
                        navigate('/products');
                    }
                }
            } catch (error) { 
                console.error("Erro ao carregar dados do produto:", error); 
                toast.error("Erro ao carregar dados.");
            } finally { 
                setIsLoading(false); 
            }
        };
        loadData();
    }, [id, reset, navigate]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsUploading(true);
        try { const data = await uploadProductImage(file); setValue('imageUrl', data.imageUrl); toast.success("Imagem atualizada!"); }
        catch (e) { toast.error("Erro no upload."); } finally { setIsUploading(false); }
    };

    const onFormError = (errors: any) => {
        console.error("Erros de validação:", errors);
        toast.error("Verifique os campos obrigatórios.");
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const payload = { 
                ...data, 
                price: Number(data.price), 
                stock: Number(data.stock), 
                categoryIds: data.categoryIds,
                addonGroups: data.addonGroups?.map((g: any) => ({ id: g.id })), 
                sizes: data.sizes?.map((s: any) => ({ ...s, price: Number(s.price) })), 
                ingredients: data.ingredients?.filter((i: any) => i.ingredientId && i.quantity > 0).map((i: any) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity) })), 
                pizzaConfig: isPizza ? pizzaConfig : null 
            };
            
            if (id) {
                await updateProduct(id, payload);
                toast.success("Produto atualizado!");
            } else {
                await createProduct(payload);
                toast.success("Produto criado com sucesso!");
            }
            navigate('/products');
        } catch (e) { 
            console.error("Erro ao salvar produto:", e);
            toast.error("Erro ao salvar produto."); 
        } finally { 
            setIsLoading(false); 
        }
    };

    if (isLoading && !watchAllFields.name && id) return <div className="flex h-screen items-center justify-center opacity-30"><Loader2 className="animate-spin text-orange-500" size={48} /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Fixo Premium */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200">
                <div className="flex items-center gap-5">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/products')} className="rounded-full bg-white h-12 w-12 shadow-sm"><ArrowLeft size={24}/></Button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{id ? 'Editar Produto' : 'Novo Produto'}</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Configuração Master de Cardápio</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-14 rounded-2xl font-black uppercase text-[10px] text-slate-400" onClick={() => navigate('/products')}>DESCARTAR</Button>
                    <Button onClick={handleSubmit(onSubmit, onFormError)} isLoading={isLoading} className="flex-1 lg:flex-none h-14 rounded-2xl px-10 shadow-xl shadow-orange-900/10 font-black italic uppercase tracking-widest gap-2">
                        <Save size={20} /> {id ? 'SALVAR ALTERAÇÕES' : 'CRIAR PRODUTO'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Coluna do Formulário */}
                <div className="xl:col-span-8 space-y-10">
                    
                    {/* Tabs de Navegação Interna */}
                    <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] gap-1 shadow-inner w-full max-w-2xl overflow-x-auto no-scrollbar">
                        {[
                            { id: 'geral', label: 'Dados Básicos', icon: Package },
                            { id: 'tamanhos', label: 'Tamanhos & Pizza', icon: Pizza },
                            { id: 'complementos', label: 'Opcionais', icon: List },
                            { id: 'composição', label: 'Ficha Técnica', icon: Layers }
                        ].map(tab => (
                            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap px-6", activeTab === tab.id ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                                <tab.icon size={14} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* CONTEÚDO: ABA GERAL */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'geral' && (
                            <motion.div key="geral" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between", watch('isAvailable') ? "border-emerald-500 bg-emerald-50/10" : "border-slate-100 bg-white")} onClick={() => setValue('isAvailable', !watch('isAvailable'))}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", watch('isAvailable') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}><CheckCircle size={24} /></div>
                                            <div><p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">Item Ativo</p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disponível no Cardápio</span></div>
                                        </div>
                                        <div className={cn("w-12 h-6 rounded-full relative transition-all", watch('isAvailable') ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", watch('isAvailable') ? "left-7" : "left-1")} /></div>
                                    </Card>
                                    <Card className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between", watch('isFeatured') ? "border-amber-500 bg-amber-50/10" : "border-slate-100 bg-white")} onClick={() => setValue('isFeatured', !watch('isFeatured'))}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", watch('isFeatured') ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400")}><Plus size={24} className="rotate-45" /></div>
                                            <div><p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">Destaque</p><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Topo da Categoria</span></div>
                                        </div>
                                        <div className={cn("w-12 h-6 rounded-full relative transition-all", watch('isFeatured') ? "bg-amber-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md", watch('isFeatured') ? "left-7" : "left-1")} /></div>
                                    </Card>
                                </div>

                                <Card className="p-10 border-slate-200 shadow-xl bg-white space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="md:col-span-2">
                                            <Input label="Nome Comercial do Produto" {...register('name', { required: true })} required placeholder="Ex: Pizza Margherita Premium" />
                                        </div>
                                        
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic flex items-center gap-2">
                                                <Layers size={14} className="text-orange-500" /> Categorias de Exibição
                                            </label>
                                            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                                                {categories.map(cat => {
                                                    const currentIds = watch('categoryIds') || [];
                                                    const isSelected = currentIds.includes(cat.id);
                                                    return (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) setValue('categoryIds', currentIds.filter((id: string) => id !== cat.id));
                                                                else setValue('categoryIds', [...currentIds, cat.id]);
                                                            }}
                                                            className={cn(
                                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                                                isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                                            )}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    );
                                                })}
                                                {categories.length === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase p-2">Nenhuma categoria cadastrada.</p>}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Descrição Gastronômica</label>
                                            <textarea {...register('description')} rows={3} className="ui-input w-full h-auto py-4 font-bold text-sm italic" placeholder="Descreva os sabores e ingredientes..." />
                                        </div>
                                        
                                        <div className="space-y-6 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                                            <Input label="Preço Base (R$)" type="number" step="0.01" {...register('price', { valueAsNumber: true })} icon={DollarSign} disabled={watch('sizes')?.length > 0} />
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Área de Preparo</label>
                                                <select {...register('productionArea')} className="ui-input w-full h-14 italic uppercase text-xs font-black">
                                                    <option value="Cozinha">Cozinha Principal</option>
                                                    <option value="Bar">Bar / Bebidas</option>
                                                    <option value="Pizzaria">Pizzaria / Forno</option>
                                                    <option value="Sobremesas">Confeitaria</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-6 pt-6 border-t border-slate-50">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-3 italic"><Settings2 size={14} className="text-blue-500" /> Parâmetros Fiscais & Integração</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="NCM (8 dígitos)" {...register('ncm')} placeholder="Ex: 21069090" />
                                                    <Input label="CFOP" {...register('cfop')} placeholder="Ex: 5102" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Unidade</label>
                                                        <select {...register('measureUnit')} className="ui-input w-full h-14 italic uppercase text-xs font-black">
                                                            <option value="UN">Unidade (UN)</option>
                                                            <option value="KG">Quilo (KG)</option>
                                                            <option value="LT">Litro (LT)</option>
                                                            <option value="DZ">Dúzia (DZ)</option>
                                                        </select>
                                                    </div>
                                                    <Input label="Cód. Integração" {...register('saiposIntegrationCode')} placeholder="Ex: SKU-123" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-slate-50">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-3 italic"><ImageIcon size={14} className="text-orange-500" /> Identidade Visual</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                            <div className="space-y-4">
                                                <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center p-6 group hover:border-orange-500 transition-all cursor-pointer overflow-hidden relative" onClick={() => (document.getElementById('img-upload') as any).click()}>
                                                    {watch('imageUrl') ? <img src={getImageUrl(watch('imageUrl'))} className="w-full h-full object-contain drop-shadow-xl" alt="" /> : <div className="text-center"><ImageIcon size={48} className="mx-auto text-slate-200 mb-2"/><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviar Foto</p></div>}
                                                    {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-orange-500" size={32}/></div>}
                                                </div>
                                                <input type="file" id="img-upload" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                            </div>
                                            <div className="space-y-6">
                                                <Input label="URL da Imagem (Opcional)" {...register('imageUrl')} />
                                                <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-3xl rounded-full" />
                                                    <p className="text-white font-black uppercase italic tracking-tighter text-sm mb-2 relative z-10">Dica Pro</p>
                                                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-relaxed relative z-10">Fotos reais aumentam a conversão em até 40%. Use iluminação natural.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* CONTEÚDO: ABA TAMANHOS & PIZZA */}
                        {activeTab === 'tamanhos' && (
                            <motion.div key="tamanhos" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-8">
                                <Card className={cn("p-8 border-2 transition-all cursor-pointer flex items-center justify-between", isPizza ? "border-orange-500 bg-orange-50/10 shadow-lg shadow-orange-900/5" : "border-slate-100 bg-white")} onClick={() => setIsPizza(!isPizza)}>
                                    <div className="flex items-center gap-5">
                                        <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-transform", isPizza ? "bg-orange-500 text-white shadow-orange-100 scale-110" : "bg-slate-100 text-slate-400")}><Pizza size={32} /></div>
                                        <div><h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Habilitar Modo Pizzaria</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Ativar seleção de múltiplos sabores</p></div>
                                    </div>
                                    <div className={cn("w-14 h-7 rounded-full relative transition-all shadow-inner", isPizza ? "bg-orange-500" : "bg-slate-300")}><div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md", isPizza ? "left-8" : "left-1")} /></div>
                                </Card>

                                {isPizza && (
                                    <Card className="p-10 border-orange-100 bg-white shadow-xl space-y-10 animate-in zoom-in-95 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Origem dos Sabores</h4>
                                                <select value={pizzaConfig.flavorCategoryId} onChange={e => setPizzaConfig({...pizzaConfig, flavorCategoryId: e.target.value})} className="ui-input w-full h-14 italic uppercase text-xs font-black shadow-inner"><option value="">Selecione Categoria...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
                                            </div>
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] italic flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Cálculo de Preço</h4>
                                                <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 shadow-inner">
                                                    <button type="button" onClick={() => setPizzaConfig({...pizzaConfig, priceRule: 'higher'})} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all", pizzaConfig.priceRule === 'higher' ? "bg-white text-orange-600 shadow-md" : "text-slate-400 hover:text-slate-600")}>MAIOR VALOR</button>
                                                    <button type="button" onClick={() => setPizzaConfig({...pizzaConfig, priceRule: 'average'})} className={cn("flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all", pizzaConfig.priceRule === 'average' ? "bg-white text-orange-600 shadow-md" : "text-slate-400 hover:text-slate-600")}>VALOR MÉDIO</button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-2"><h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] italic flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Variações de Tamanho</h3><Button variant="outline" size="sm" type="button" onClick={() => appendSize({ name: '', price: 0 })} className="rounded-xl border-slate-200 text-slate-500 gap-2 font-black italic"><Plus size={16} /> ADICIONAR VARIAÇÃO</Button></div>
                                    <div className="space-y-4">
                                        {sizeFields.map((field, index) => {
                                            const sizeName = watch(`sizes.${index}.name`);
                                            const currentSizeConfig = pizzaConfig.sizes[sizeName] || { active: true, slices: 8, maxFlavors: 2 };
                                            return (
                                                <Card key={field.id} className="p-6 border-2 border-slate-100 hover:border-orange-500/20 transition-all bg-white" noPadding>
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center px-6 py-2">
                                                        <div className="md:col-span-3">
                                                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Tamanho Padrão</label>
                                                            <select 
                                                                {...register(`sizes.${index}.globalSizeId`, { required: true })}
                                                                onChange={(e) => {
                                                                    const selected = globalSizes.find(s => s.id === e.target.value);
                                                                    if (selected) {
                                                                        setValue(`sizes.${index}.name`, selected.name);
                                                                    }
                                                                }}
                                                                className="ui-input w-full h-12 italic font-black"
                                                            >
                                                                <option value="">Selecione...</option>
                                                                {globalSizes.map(gs => (
                                                                    <option key={gs.id} value={gs.id}>{gs.name}</option>
                                                                ))}
                                                            </select>
                                                            <input type="hidden" {...register(`sizes.${index}.name`)} />
                                                        </div>
                                                        <div className="md:col-span-3"><Input label="Preço (R$)" type="number" step="0.01" {...register(`sizes.${index}.price`, { required: true, valueAsNumber: true })} icon={DollarSign} /></div>
                                                        {isPizza && (
                                                            <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-orange-400 ml-1 italic">Nº Fatias</label><input type="number" value={currentSizeConfig.slices} onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, [sizeName]: {...currentSizeConfig, active: true, slices: parseInt(e.target.value)}}})} className="ui-input w-full h-12 font-black text-center" /></div>
                                                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-orange-400 ml-1 italic">Max Sabores</label><select value={currentSizeConfig.maxFlavors} onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, [sizeName]: {...currentSizeConfig, active: true, maxFlavors: parseInt(e.target.value)}}})} className="ui-input w-full h-12 font-black text-center"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
                                                            </div>
                                                        )}
                                                        <div className="md:col-span-2 flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" type="button" onClick={() => removeSize(index)} className="h-12 w-12 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 transition-all"><Trash2 size={20}/></Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* CONTEÚDO: ABA COMPLEMENTOS */}
                        {activeTab === 'complementos' && (
                            <motion.div key="complementos" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-8">
                                {inheritedAddonGroups.length > 0 && (
                                    <Card className="p-8 border-orange-200 bg-orange-50/20 shadow-xl space-y-6">
                                        <div>
                                            <h3 className="text-xl font-black text-orange-600 uppercase italic tracking-tighter leading-none">Opcionais Herdados (Categoria)</h3>
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-2">Estes itens são automáticos para esta categoria</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {inheritedAddonGroups.map(group => (
                                                <div key={group.id} className="p-4 bg-white border-2 border-orange-200 rounded-2xl flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                                            <CheckCircle size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="block text-[11px] font-black uppercase italic text-slate-900">{group.name}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">HERDADO DA CATEGORIA</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                <Card className="p-8 border-slate-200 shadow-xl bg-white space-y-10">
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                                        <div><h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Biblioteca de Adicionais</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Vincule grupos pré-cadastrados ao produto</p></div>
                                        <Button variant="outline" size="sm" type="button" onClick={() => navigate('/addons')} className="rounded-xl border-blue-500 text-blue-600 gap-2 font-black italic"><Settings2 size={16}/> GERENCIAR BIBLIOTECA</Button>
                                    </div>
                                    <GlobalAddonSelector 
                                        availableGroups={libraryGroups} 
                                        selectedGroupIds={watch('addonGroups')?.map((g: any) => g.id) || []} 
                                        onToggle={(id) => {
                                            const current = watch('addonGroups') || [];
                                            const exists = current.find((g: any) => g.id === id);
                                            if (exists) setValue('addonGroups', current.filter((g: any) => g.id !== id));
                                            else setValue('addonGroups', [...current, libraryGroups.find(g => g.id === id)]);
                                        }}
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {/* CONTEÚDO: ABA FICHA TÉCNICA */}
                        {activeTab === 'composição' && (
                            <motion.div key="composição" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="space-y-8">
                                <Card className="p-10 border-emerald-100 bg-white shadow-xl">
                                    <CompositionList control={control} register={register} availableIngredients={availableIngredients} />
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Coluna de Preview Master */}
                <div className="xl:col-span-4 h-full">
                    <ProductMobilePreview watchFields={watchAllFields} isPizza={isPizza} pizzaConfig={pizzaConfig} getImageUrl={getImageUrl} />
                </div>

            </div>
        </div>
    );
}

// --- Sub-componente para Seleção de Biblioteca ---
function GlobalAddonSelector({ availableGroups, selectedGroupIds, onToggle }: { availableGroups: AddonGroup[], selectedGroupIds: string[], onToggle: (id: string) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableGroups.map(group => {
                const isSelected = selectedGroupIds.includes(group.id!);
                return (
                    <Card 
                        key={group.id}
                        onClick={() => onToggle(group.id!)}
                        className={cn(
                            "p-4 border-2 transition-all cursor-pointer flex items-center justify-between group",
                            isSelected ? "border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-900/5" : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                        noPadding
                    >
                        <div className="flex items-center gap-4 pl-4 py-4">
                            <div className={cn(
                                "w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-lg transition-all",
                                isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                            )}>
                                <Settings2 size={24} />
                            </div>
                            <div>
                                <span className={cn("block text-sm font-black uppercase italic tracking-tight", isSelected ? "text-slate-900" : "text-slate-500")}>
                                    {group.name}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {group.addons.length} ITENS • {group.type === 'single' ? 'ESCOLHA ÚNICA' : 'MÚLTIPLA'}
                                </span>
                            </div>
                        </div>
                        <div className="pr-6">
                            <div className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20" : "border-slate-200"
                            )}>
                                {isSelected && <Check size={14} strokeWidth={4} />}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

// --- Sub-componente para Ficha Técnica (Insumos) ---
function CompositionList({ control, register, availableIngredients }: { control: any, register: any, availableIngredients: any[] }) {
    const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] italic flex items-center gap-2">
                    <Target size={14} className="text-orange-500" /> Composição Estrutural
                </h3>
                <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => append({ ingredientId: '', quantity: 0 })}
                    className="h-10 rounded-xl border-orange-500 text-orange-600 font-black italic gap-2 hover:bg-orange-50"
                >
                    <Plus size={16} /> VINCULAR INSUMO
                </Button>
            </div>

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-5 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-orange-500/20 transition-all shadow-sm group" noPadding>
                        <div className="flex items-center gap-6 px-6 py-2">
                            <div className="flex-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1 block italic">Matéria-prima / Insumo</label>
                                <select 
                                    {...register(`ingredients.${index}.ingredientId`, { required: true })}
                                    className="ui-input w-full h-12 italic"
                                >
                                    <option value="">Selecione na lista...</option>
                                    {availableIngredients.map(ing => (
                                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-40">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1 block italic">Qtd. Utilizada</label>
                                <div className="relative">
                                    <input 
                                        type="number" step="0.001"
                                        {...register(`ingredients.${index}.quantity`, { required: true, valueAsNumber: true })}
                                        className="ui-input w-full h-12 font-black text-orange-600 pr-12 italic"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">UNI.</span>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-5 h-12 w-12 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 transition-all">
                                <Trash2 size={20} />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {fields.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30 opacity-30">
                    <Layers className="mx-auto text-slate-300 mb-4" size={64} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum insumo vinculado</p>
                </div>
            )}
        </div>
    );
};

// --- Componente de Preview Realista ---
function ProductMobilePreview({ watchFields, isPizza, pizzaConfig, getImageUrl }: { watchFields: any, isPizza: boolean, pizzaConfig: any, getImageUrl: (url: string) => string }) {
    const { name, description, price, imageUrl, addonGroups, sizes } = watchFields;
    const [selectedSizePreview, setSelectedSizePreview] = useState<any>(null);

    useEffect(() => { if (sizes && sizes.length > 0 && !selectedSizePreview) setSelectedSizePreview(sizes[0]); }, [sizes, selectedSizePreview]);

    return (
        <div className="sticky top-28 hidden xl:block animate-in fade-in zoom-in-95 duration-700">
            <div className="w-[320px] h-[650px] bg-slate-900 rounded-[3.5rem] p-3 shadow-2xl border-[10px] border-slate-800 relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center"><div className="w-12 h-1 bg-slate-700 rounded-full" /></div>
                
                <div className="w-full h-full bg-slate-50 rounded-[2.5rem] overflow-hidden flex flex-col relative">
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        {/* Imagem Cardápio */}
                        <div className="h-48 bg-slate-200 relative group overflow-hidden">
                            {imageUrl ? <img src={getImageUrl(imageUrl)} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="absolute inset-0 flex items-center justify-center text-slate-300"><ImageIcon size={48} strokeWidth={1} /></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                                <h3 className="text-white font-black text-lg italic tracking-tighter uppercase leading-none mb-1">{name || 'Nome do Item'}</h3>
                                <p className="text-white/60 text-[10px] font-medium leading-relaxed line-clamp-2">{description || 'Descrição detalhada aparecerá aqui para seus clientes...'}</p>
                            </div>
                        </div>

                        <div className="p-5 space-y-5">
                            {sizes && sizes.length > 0 && (
                                <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black uppercase text-slate-900 italic tracking-widest">1. Selecione o Tamanho</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        {sizes.map((s: any, i: number) => (
                                            <div key={i} onClick={() => setSelectedSizePreview(s)} className={cn("p-3 rounded-xl border-2 flex justify-between items-center transition-all cursor-pointer", selectedSizePreview?.name === s.name ? "border-orange-500 bg-orange-50" : "border-slate-50")}>
                                                <span className={cn("text-[11px] font-black uppercase italic", selectedSizePreview?.name === s.name ? "text-orange-600" : "text-slate-700")}>{s.name}</span>
                                                <span className="text-xs font-black text-slate-900 italic">R$ {Number(s.price).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isPizza && (
                                <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-orange-100 flex items-center justify-center text-center py-8">
                                    <div><Pizza size={32} className="text-orange-200 mx-auto mb-2" /><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Seleção de Sabores Ativa</p></div>
                                </div>
                            )}

                            {addonGroups?.map((group: any, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-900 italic tracking-widest block mb-3">{group.name}</span>
                                    <div className="space-y-2">
                                        {group.addons?.slice(0, 3).map((a: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /><span>{a.name}</span></div>
                                                <span className="text-emerald-600">+ R$ {Number(a.price).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botão Inferior Mobile */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 flex items-center justify-between shadow-2xl">
                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Subtotal</span><span className="text-xl font-black text-slate-900 italic tracking-tighter">R$ {Number(selectedSizePreview?.price || price || 0).toFixed(2)}</span></div>
                        <Button size="sm" className="h-12 px-6 rounded-2xl italic font-black text-[10px] shadow-lg shadow-orange-500/20">ADICIONAR</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductFormPage;
