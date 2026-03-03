import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import * as LucideIcons from 'lucide-react';
import { cn } from '../lib/utils';
import { getCategories } from '../services/api/categories';
import { getProducts, createProduct, updateProduct, uploadProductImage, getProductById } from '../services/api/products';
import { getAddonGroups } from '../services/api/addonService';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    Plus, Trash2, Save, ArrowLeft, Package, 
    Layers, Settings2, Star, CheckCircle, Clock, 
    Truck, Utensils, Globe, Info, Hash, Image as ImageIcon,
    Upload, Loader2, ChevronRight, Search, GripVertical
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import { ImageCropperModal } from '../components/ui/ImageCropperModal';

const ProductFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [allAddonGroups, setAllAddonGroups] = useState<any[]>([]);
    const [productData, setProductData] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cropper, setCropper] = useState<{ isOpen: boolean, src: string } | null>(null);

    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            stock: 0,
            imageUrl: '',
            isAvailable: true,
            isFeatured: false,
            allowDelivery: true,
            allowPos: true,
            allowOnline: true,
            categoryIds: [],
            taxPercentage: 0,
            measureUnit: 'UN',
            addonGroups: [],
            sizes: [],
            ingredients: [],
            pizzaConfig: {
                active: false,
                priceRule: 'higher',
                maxFlavors: 1,
                flavorCategoryId: ''
            }
        }
    });

    const { fields: sizeFields, append: addSize, remove: removeSize } = useFieldArray({ control, name: 'sizes' });
    const { fields: addonFields, append: addAddonGroup, remove: removeAddonGroup } = useFieldArray({ control, name: 'addonGroups' });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            setCropper({ isOpen: true, src: reader.result as string });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (blob: Blob) => {
        setIsUploading(true);
        try {
            const optimizedFile = new File([blob], `product-${Date.now()}.webp`, { type: 'image/webp' });
            const data = await uploadProductImage(optimizedFile);
            setValue('imageUrl', data.imageUrl);
            toast.success("Imagem otimizada e carregada!");
        } catch (error) {
            toast.error("Erro no upload da imagem.");
        } finally {
            setIsUploading(false);
            setCropper(null);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [cats, addons] = await Promise.all([getCategories(true), getAddonGroups()]);
                setCategories(cats);
                setAllAddonGroups(addons);

                if (id && id !== 'new') {
                    const product = await getProductById(id);
                    if (product) {
                        const initialCategoryIds = product.categories?.map((c: any) => c.id) || [];
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

    const onSubmit = async (data: any) => {
        setIsSaving(true);
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
            toast.success("Produto salvo com sucesso!");
            navigate('/products');
        } catch (error) { toast.error("Falha ao salvar."); }
        finally { setIsSaving(false); }
    };

    if (isLoading && id && id !== 'new') return <div className="flex h-64 items-center justify-center opacity-30"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-slate-900">
            {cropper && (
                <ImageCropperModal 
                    isOpen={cropper.isOpen}
                    imageSrc={cropper.src}
                    onClose={() => setCropper(null)}
                    onCropComplete={handleCropComplete}
                />
            )}
            {/* Header Super Compacto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/products')} className="rounded-xl bg-white h-10 w-10 border border-slate-200 shadow-sm">
                        <ArrowLeft size={20}/>
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">{id && id !== 'new' ? 'Editar Produto' : 'Novo Produto'}</h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 italic flex items-center gap-2">
                            <Hash size={10} className="text-orange-500" /> {id && id !== 'new' ? `Ref: ${id.slice(-6).toUpperCase()}` : 'Criação de novo item'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => navigate('/products')}>CANCELAR</Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isSaving} className="flex-1 lg:flex-none h-10 rounded-xl px-8 shadow-lg font-black italic uppercase tracking-widest gap-2 text-xs">
                        <Save size={18} /> {id && id !== 'new' ? 'SALVAR ALTERAÇÕES' : 'CRIAR PRODUTO'}
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Coluna Esquerda: Dados Básicos */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="p-6 border-slate-200 bg-white space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Package size={16} className="text-orange-500" />
                            <h3 className="text-xs font-black uppercase italic text-slate-900">Informações Principais</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-8">
                                <Input label="Nome do Produto" {...register('name', { required: true })} className="h-11 font-black text-sm uppercase italic" placeholder="Ex: Pizza Calabresa Gourmet" />
                            </div>
                            <div className="md:col-span-4">
                                <Input label="Preço Base" type="number" {...register('price')} className="h-11 font-black text-sm" prefix="R$" />
                            </div>
                            <div className="md:col-span-12">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block mb-1.5">Descrição Comercial</label>
                                <textarea {...register('description')} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium outline-none focus:border-orange-500 transition-all" placeholder="Detalhes que vendem o produto..." />
                            </div>
                            
                            {/* Upload de Imagem Integrado */}
                            <div className="md:col-span-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block mb-1.5">Imagem Comercial</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative group/upload">
                                        <button 
                                            type="button"
                                            onClick={() => (document.getElementById('product-image-upload') as HTMLInputElement)?.click()}
                                            className={cn(
                                                "w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden",
                                                watch('imageUrl') ? "border-orange-500/30 bg-orange-50/10" : "border-slate-200 text-slate-400 hover:border-slate-300"
                                            )}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? <Loader2 size={24} className="animate-spin" /> : (
                                                watch('imageUrl') ? (
                                                    <img src={getImageUrl(watch('imageUrl'))} className="w-full h-full object-cover" />
                                                ) : <Upload size={24} />
                                            )}
                                            {!watch('imageUrl') && !isUploading && <span className="text-[8px] font-black uppercase">Upload</span>}
                                        </button>
                                        <input id="product-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="relative">
                                            <Input 
                                                placeholder="Link da imagem" 
                                                {...register('imageUrl')}
                                                className="h-9 text-[9px] pl-7"
                                            />
                                            <ImageIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight px-1">Será processada para WebP (mais leve) e redimensionada para 800x800px.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-4">
                                <Input label="Estoque Atual" type="number" {...register('stock')} className="h-11 font-black text-sm" suffix="un" />
                            </div>
                            <div className="md:col-span-4">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block mb-1.5">Unidade</label>
                                <select {...register('measureUnit')} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-black uppercase italic outline-none focus:border-orange-500 transition-all">
                                    <option value="UN">Unidade (UN)</option>
                                    <option value="KG">Quilo (KG)</option>
                                    <option value="LT">Litro (LT)</option>
                                    <option value="DZ">Dúzia (DZ)</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Categorias - Seleção Múltipla Moderna */}
                    <Card className="p-6 border-slate-200 bg-white">
                        <div className="flex items-center gap-2 mb-6">
                            <Layers size={16} className="text-orange-500" />
                            <h3 className="text-xs font-black uppercase italic text-slate-900">Categorização do Item</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {categories.map(cat => {
                                const isSelected = watch('categoryIds')?.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            const current = watch('categoryIds') || [];
                                            const next = isSelected ? current.filter((id: string) => id !== cat.id) : [...current, cat.id];
                                            setValue('categoryIds', next);
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all text-left group",
                                            isSelected ? "bg-orange-50 border-orange-500 shadow-md shadow-orange-900/5" : "bg-slate-50 border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className={cn("text-[9px] font-black uppercase italic tracking-tighter truncate", isSelected ? "text-orange-600" : "text-slate-400")}>{cat.name}</span>
                                            <div className="flex items-center justify-between">
                                                <span className={cn("text-[7px] font-bold uppercase", isSelected ? "text-orange-400" : "text-slate-300")}>{cat.cuisineType || 'Geral'}</span>
                                                {isSelected && <CheckCircle size={10} className="text-orange-500" />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Tamanhos e Variações */}
                    <Card className="p-6 border-slate-200 bg-white space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-orange-500" />
                                <h3 className="text-xs font-black uppercase italic text-slate-900">Tamanhos e Variações</h3>
                            </div>
                            <Button type="button" size="sm" onClick={() => addSize({ name: '', price: 0, globalSizeId: '', saiposIntegrationCode: '' })} className="h-8 rounded-lg italic font-black text-[9px] gap-2"><Plus size={14}/> ADICIONAR VARIante</Button>
                        </div>
                        <div className="space-y-3">
                            {sizeFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 items-end animate-in slide-in-from-top-2 duration-300">
                                    <div className="md:col-span-5"><Input label="Nome da Variação" {...register(`sizes.${index}.name`)} className="h-9 font-bold text-xs uppercase" placeholder="Pequena, Média, 1 Litro..." /></div>
                                    <div className="md:col-span-4"><Input label="Preço" type="number" {...register(`sizes.${index}.price`)} className="h-9 font-black" prefix="R$" /></div>
                                    <div className="md:col-span-2"><Input label="Integração" {...register(`sizes.${index}.saiposIntegrationCode`)} className="h-9 text-[9px]" /></div>
                                    <div className="md:col-span-1 flex justify-end pb-1"><Button variant="ghost" size="icon" onClick={() => removeSize(index)} className="h-9 w-9 bg-rose-50 text-rose-500 rounded-lg"><Trash2 size={16}/></Button></div>
                                </div>
                            ))}
                            {sizeFields.length === 0 && <div className="text-center py-8 opacity-20"><Package size={32} className="mx-auto mb-2"/><p className="text-[10px] font-black uppercase tracking-widest">Sem variações cadastradas</p></div>}
                        </div>
                    </Card>
                </div>

                {/* Coluna Direita: Status, Visibilidade e Adicionais */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Status Global */}
                    <Card className="p-6 border-slate-200 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase italic text-slate-900">Status do Item</h3>
                            <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", watch('isAvailable') ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]")} />
                        </div>
                        <div className="space-y-3">
                            <label className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", watch('isAvailable') ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-transparent")}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", watch('isAvailable') ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}><Star size={20}/></div>
                                    <span className="text-[10px] font-black uppercase italic text-slate-900">Disponível</span>
                                </div>
                                <input type="checkbox" {...register('isAvailable')} className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                            </label>
                            <label className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer", watch('isFeatured') ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-transparent")}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", watch('isFeatured') ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400")}><Star size={20} className="fill-current"/></div>
                                    <span className="text-[10px] font-black uppercase italic text-slate-900">Destaque</span>
                                </div>
                                <input type="checkbox" {...register('isFeatured')} className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                            </label>
                        </div>
                    </Card>

                    {/* Canais de Venda */}
                    <Card className="p-6 border-slate-200 bg-white">
                        <h3 className="text-xs font-black uppercase italic text-slate-900 mb-4">Canais de Visibilidade</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'allowDelivery', icon: Truck, label: 'Delivery', color: 'blue' },
                                { id: 'allowPos', icon: Utensils, label: 'Salão', color: 'emerald' },
                                { id: 'allowOnline', icon: Globe, label: 'Online', color: 'purple' }
                            ].map(canal => (
                                <button
                                    key={canal.id}
                                    type="button"
                                    onClick={() => setValue(canal.id as any, !watch(canal.id as any))}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                        watch(canal.id as any) ? `bg-${canal.color}-50 border-${canal.color}-500 shadow-sm` : "bg-slate-50 border-transparent opacity-40"
                                    )}
                                >
                                    <canal.icon size={18} className={cn(watch(canal.id as any) ? `text-${canal.color}-600` : "text-slate-400")} />
                                    <span className="text-[8px] font-black uppercase italic">{canal.label}</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Grupos de Adicionais - Arrastável */}
                    <Card className="p-6 border-slate-200 bg-white space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black uppercase italic text-slate-900">Opções e Adicionais</h3>
                            <div className="relative group">
                                <Button type="button" size="sm" className="h-8 rounded-lg italic font-black text-[9px] gap-2">VINCULAR GRUPO <ChevronRight size={14}/></Button>
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-200 max-h-80 overflow-y-auto custom-scrollbar">
                                    <div className="p-2 border-b border-slate-100 mb-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12}/>
                                            <input type="text" placeholder="Buscar grupo..." className="w-full bg-slate-50 border-none rounded-lg py-1.5 pl-7 pr-2 text-[10px] outline-none" />
                                        </div>
                                    </div>
                                    {allAddonGroups.filter(g => !watch('addonGroups')?.some((ag: any) => ag.id === g.id)).map(group => (
                                        <button key={group.id} type="button" onClick={() => addAddonGroup({ id: group.id, name: group.name })} className="w-full text-left p-2.5 rounded-xl hover:bg-orange-50 text-[10px] font-black uppercase italic transition-colors flex items-center justify-between group/item">
                                            {group.name} <Plus size={12} className="text-slate-300 group-hover/item:text-orange-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {addonFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group/row">
                                    <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing" />
                                    <span className="flex-1 text-[10px] font-black uppercase italic truncate">{allAddonGroups.find(g => g.id === (field as any).id)?.name || (field as any).name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => removeAddonGroup(index)} className="h-7 w-7 bg-white text-slate-300 hover:text-rose-500 rounded-lg border border-slate-100 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={12}/></Button>
                                </div>
                            ))}
                            {addonFields.length === 0 && <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl opacity-30"><p className="text-[8px] font-black uppercase tracking-widest">Sem complementos vinculados</p></div>}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProductFormPage;
