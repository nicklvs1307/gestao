import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { 
    ArrowLeft, 
    Plus, 
    Trash2, 
    GripVertical, 
    CloudUpload, 
    ChevronDown, 
    CheckCircle, 
    Pizza, 
    Maximize2, 
    List,
    Layers,
    Info,
    Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCategories, createProduct, updateProduct, getProducts, getIngredients, uploadProductImage } from '../services/api';
import type { Product, Category } from '@/types/index';
import { toast } from 'sonner';

// --- Sub-componente para Adicionais ---
const AddonsList = ({ groupIndex, control, register }: { groupIndex: number, control: any, register: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `addonGroups.${groupIndex}.addons`
    });

    return (
        <div className="space-y-3">
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in slide-in-from-left-1 duration-200">
                    <div className="flex-grow">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Nome do Adicional</label>
                        <input 
                            {...register(`addonGroups.${groupIndex}.addons.${index}.name`, { required: true })}
                            placeholder="Ex: Bacon"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Preço (R$)</label>
                        <input 
                            type="number" step="0.01"
                            {...register(`addonGroups.${groupIndex}.addons.${index}.price`, { required: true, valueAsNumber: true })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="w-20">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Qtd. Máx</label>
                        <input 
                            type="number"
                            {...register(`addonGroups.${groupIndex}.addons.${index}.maxQuantity`, { required: true, valueAsNumber: true })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue={1}
                        />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="mt-4 p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button 
                type="button" 
                onClick={() => append({ name: '', price: 0, maxQuantity: 1 })}
                className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[9px] font-black text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
                <Plus size={12} /> Adicionar Adicional
            </button>
        </div>
    );
};

// --- Sub-componente para Ficha Técnica (Insumos) ---
const CompositionList = ({ control, register, availableIngredients }: { control: any, register: any, availableIngredients: any[] }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "ingredients"
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest italic">Composição do Produto</h3>
                <button 
                    type="button" 
                    onClick={() => append({ ingredientId: '', quantity: 0 })}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                    <Plus size={14} /> Vincular Insumo
                </button>
            </div>

            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4 bg-white p-4 border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-left-2 duration-200">
                    <div className="flex-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Insumo</label>
                        <select 
                            {...register(`ingredients.${index}.ingredientId`, { required: true })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Selecione...</option>
                            {availableIngredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Qtd. Gasta</label>
                        <input 
                            type="number" step="0.001"
                            {...register(`ingredients.${index}.quantity`, { required: true, valueAsNumber: true })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-orange-600 outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button type="button" onClick={() => remove(index)} className="mt-5 p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}

            {fields.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                    <Layers className="mx-auto text-slate-200 mb-3 opacity-50" size={40} />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum insumo vinculado a este produto.</p>
                    <p className="text-slate-300 text-[10px] mt-1 italic">Vincule insumos para ter baixa automática no estoque.</p>
                </div>
            )}
        </div>
    );
};

// --- Componente de Preview do Celular ---
const ProductMobilePreview = ({ watchFields, isPizza, pizzaConfig }: { watchFields: any, isPizza: boolean, pizzaConfig: any }) => {
    const { name, description, price, imageUrl, addonGroups, sizes } = watchFields;
    const [selectedSizePreview, setSelectedSizePreview] = useState<any>(null);

    useEffect(() => {
        if (sizes && sizes.length > 0 && !selectedSizePreview) {
            setSelectedSizePreview(sizes[0]);
        }
    }, [sizes, selectedSizePreview]);

    return (
        <div className="sticky top-28 hidden xl:block">
            <p className="text-center text-xs font-black text-slate-400 uppercase mb-4 tracking-tighter">Visualização: {isPizza ? "Modo Pizzaria" : "Modo Varejo"}</p>
            <div className="w-[300px] h-[600px] bg-white rounded-[40px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
                <div className="h-6 w-full flex justify-between px-6 pt-2 items-center z-10 bg-white/50 backdrop-blur-sm absolute top-0">
                    <span className="text-[10px] font-bold">19:30</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-2 bg-black rounded-sm"></div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto scrollbar-hide bg-slate-50">
                    <div className="h-40 bg-slate-200 relative group">
                        {imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic font-bold">
                                {isPizza ? <Pizza size={40} className="opacity-20"/> : "Foto"}
                             </div>
                        )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                            <div>
                                <h3 className="text-lg font-black leading-tight italic text-white shadow-sm">{name || 'Nome do Produto'}</h3>
                                <p className="text-[10px] text-white/80 line-clamp-2">{description || 'Descrição...'}</p>
                            </div>
                       </div>
                    </div>

                    <div className="p-4 pb-24 space-y-4">
                        {sizes && sizes.length > 0 && (
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-black uppercase text-slate-700">1. Escolha o Tamanho</span>
                                    <span className="text-[9px] bg-red-500 text-white px-2 rounded uppercase font-bold">Obrigatório</span>
                                </div>
                                <div className="space-y-2">
                                    {sizes.map((size: any, index: number) => {
                                        const config = isPizza && pizzaConfig.sizes ? pizzaConfig.sizes[size.name] : null;
                                        const isSelected = selectedSizePreview?.name === size.name;

                                        return (
                                            <div 
                                                key={index} 
                                                onClick={() => setSelectedSizePreview(size)}
                                                className={cn(
                                                    "flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all",
                                                    isSelected ? "border-orange-500 bg-orange-50" : "border-slate-100 hover:border-slate-300"
                                                )}
                                            >
                                                <div>
                                                    <span className={cn("font-bold text-xs block", isSelected ? "text-orange-700" : "text-slate-700")}>{size.name || "Tamanho"}</span>
                                                    {isPizza && config && config.active && (
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            {config.slices} Fatias • Até {config.maxFlavors} Sabores
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-black text-sm text-slate-900">R$ {Number(size.price).toFixed(2).replace('.', ',')}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {isPizza && (
                             <div className="bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-black uppercase text-orange-700 flex items-center gap-1"><Pizza size={10}/> 2. Escolha os Sabores</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] p-2 bg-slate-50 rounded border border-slate-100 italic text-slate-400">
                                        Lista de sabores da categoria selecionada aparecerá aqui...
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isPizza && addonGroups && addonGroups.map((group: any, index: number) => (
                            <div key={index} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-black uppercase text-slate-700">{group.name}</span>
                                    {group.isRequired && <span className="text-[9px] bg-slate-800 text-white px-2 py-0.5 rounded uppercase font-bold">Obrigatório</span>}
                                </div>
                                <div className="space-y-1">
                                    {group.addons && group.addons.map((addon: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-[10px] p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                                <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-sm border border-slate-300"></div>
                                                <span>{addon.name}</span>
                                                </div>
                                                <span className="font-bold text-green-600">+ R$ {Number(addon.price).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500">Total Estimado</span>
                        <span className="text-lg font-black text-slate-900">
                            R$ {(Number(selectedSizePreview?.price || price || 0)).toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                    <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-orange-100 uppercase tracking-wide">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProductFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'tamanhos' | 'complementos' | 'composição'>('geral');
    
    const [isPizza, setIsPizza] = useState(false);
    const [pizzaConfig, setPizzaConfig] = useState<any>({
        maxFlavors: 2,
        sliceCount: 8,
        priceRule: 'higher',
        flavorCategoryId: '',
        sizes: {
            'Grande': { active: true, slices: 8, maxFlavors: 2 },
            'Familia': { active: false, slices: 12, maxFlavors: 4 }
        }
    });
    
    const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<any>({
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            imageUrl: '',
            categoryId: '',
            isAvailable: true,
            isFeatured: false,
            stock: 0,
            tags: [],
            addonGroups: [],
            sizes: [],
            ingredients: []
        }
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const data = await uploadProductImage(file);
            setValue('imageUrl', data.imageUrl);
            toast.success("Imagem enviada com sucesso!");
        } catch (error) {
            console.error("Erro no upload:", error);
            toast.error("Falha ao enviar imagem.");
        } finally {
            setIsUploading(false);
        }
    };

    const { fields: addonGroupFields, append: appendAddonGroup, remove: removeAddonGroup } = useFieldArray({
        control,
        name: "addonGroups"
    });

    const { fields: sizeFields, append: appendSize, remove: removeSize } = useFieldArray({
        control,
        name: "sizes"
    });

    const watchAllFields = watch();

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [categoriesData, ingredientsData] = await Promise.all([
                    getCategories(),
                    getIngredients()
                ]);
                
                setCategories(categoriesData);
                setAvailableIngredients(ingredientsData);

                if (id) {
                    const products = await getProducts();
                    const product = products.find((p: any) => p.id === id);
                    if (product) {
                        reset({
                            ...product,
                            ingredients: product.ingredients?.map((i: any) => ({
                                ingredientId: i.ingredientId,
                                quantity: i.quantity
                            })) || []
                        });
                        if (product.pizzaConfig) {
                            setIsPizza(true);
                            setPizzaConfig((prev: any) => ({ 
                                ...prev, 
                                ...product.pizzaConfig,
                                sizes: product.pizzaConfig.sizes || prev.sizes
                            }));
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, reset]);

    const onSubmit = async (data: any) => {
        try {
            setIsLoading(true);
            const formattedData = {
                ...data,
                price: Number(data.price),
                stock: Number(data.stock),
                addonGroups: data.addonGroups?.map((group: any) => ({
                    ...group,
                    addons: group.addons?.map((addon: any) => ({
                        ...addon,
                        price: Number(addon.price)
                    }))
                })),
                sizes: data.sizes?.map((size: any) => ({
                    ...size,
                    price: Number(size.price)
                })),
                ingredients: data.ingredients?.filter((i: any) => i.ingredientId && i.quantity > 0).map((i: any) => ({
                    ingredientId: i.ingredientId,
                    quantity: Number(i.quantity)
                })),
                pizzaConfig: isPizza ? pizzaConfig : null
            };

            if (id) {
                await updateProduct(id, formattedData);
                toast.success("Produto atualizado com sucesso!");
            } else {
                await createProduct(formattedData);
                toast.success("Produto criado com sucesso!");
            }
            navigate('/products');
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            toast.error("Erro ao salvar produto");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-8 py-4 flex justify-between items-center shadow-sm/50 backdrop-blur-md bg-white/80">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/products')} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold italic tracking-tight">{id ? 'Editar Produto' : 'Novo Produto'}</h1>
                        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                            Gestão de Produtos
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/products')} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-sm">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit(onSubmit)} 
                        disabled={isLoading}
                        className="px-8 py-2 bg-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition text-sm italic flex items-center gap-2"
                    >
                        {isLoading ? 'SALVANDO...' : 'SALVAR PRODUTO'}
                        {!isLoading && <CheckCircle size={16} />}
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-8 py-10 flex gap-10">
                <div className="flex-1 space-y-8 min-w-0">
                    <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
                        {['geral', 'tamanhos', 'complementos', 'composição'].map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize",
                                    activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {tab === 'composição' ? 'Ficha Técnica' : tab}
                            </button>
                        ))}
                    </div>

                    <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'geral' && 'hidden')}>
                        <div className="flex flex-wrap gap-4">
                            <label className={cn(
                                "flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none",
                                watch('isAvailable') ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", watch('isAvailable') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                        <CheckCircle size={20} />
                                    </div>
                                    <div>
                                        <span className={cn("block text-sm font-black uppercase tracking-tight", watch('isAvailable') ? "text-emerald-700" : "text-slate-500")}>Produto Ativo</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Visível no Cardápio</span>
                                    </div>
                                </div>
                                <Controller
                                    name="isAvailable"
                                    control={control}
                                    render={({ field }) => (
                                        <div 
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn("w-12 h-6 rounded-full relative transition-colors", field.value ? "bg-emerald-500" : "bg-slate-300")}
                                        >
                                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", field.value ? "left-7" : "left-1")} />
                                        </div>
                                    )}
                                />
                            </label>

                            <label className={cn(
                                "flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none",
                                watch('isFeatured') ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", watch('isFeatured') ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400")}>
                                        <Plus size={20} className="rotate-45" />
                                    </div>
                                    <div>
                                        <span className={cn("block text-sm font-black uppercase tracking-tight", watch('isFeatured') ? "text-amber-700" : "text-slate-500")}>Em Destaque</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Topo do Cardápio</span>
                                    </div>
                                </div>
                                <Controller
                                    name="isFeatured"
                                    control={control}
                                    render={({ field }) => (
                                        <div 
                                            onClick={() => field.onChange(!field.value)}
                                            className={cn("w-12 h-6 rounded-full relative transition-colors", field.value ? "bg-amber-500" : "bg-slate-300")}
                                        >
                                            <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", field.value ? "left-7" : "left-1")} />
                                        </div>
                                    )}
                                />
                            </label>
                        </div>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                            <h2 className="text-lg font-black mb-6 flex items-center gap-2 italic text-slate-800">
                                <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm not-italic">01</span>
                                Informações Principais
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Nome do Produto *</label>
                                    <input 
                                        {...register('name', { required: "Nome é obrigatório" })}
                                        type="text" 
                                        placeholder="Ex: Smash Burger Duplo" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition font-medium"
                                    />
                                    {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name.message}</span>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Descrição no Cardápio</label>
                                    <textarea 
                                        {...register('description')}
                                        rows={3} 
                                        placeholder="Descreva os ingredientes e diferenciais..." 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition text-sm"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Preço Base (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-orange-600 font-bold">R$</span>
                                        <input 
                                            {...register('price', { valueAsNumber: true })}
                                            type="number" 
                                            step="0.01"
                                            placeholder="0,00" 
                                            disabled={watchAllFields.sizes && watchAllFields.sizes.length > 0}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-orange-500 font-bold text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Categoria</label>
                                    <div className="relative">
                                        <select 
                                            {...register('categoryId', { required: true })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-medium text-slate-600"
                                        >
                                            <option value="">Selecione...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Estoque</label>
                                    <input 
                                        {...register('stock', { valueAsNumber: true })}
                                        type="number" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition font-medium"
                                    />
                                </div>
                            </div>

                            <div className="mt-8">
                                <label className="block text-xs font-bold text-slate-500 mb-4 uppercase tracking-wide">Foto do Produto (URL)</label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <input 
                                            {...register('imageUrl')}
                                            type="text"
                                            placeholder="https://..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition text-sm mb-2" 
                                        />
                                        <label className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition cursor-pointer group">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                            />
                                            {isUploading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-2" />
                                            ) : (
                                                <CloudUpload className="text-3xl text-slate-300 mb-2 group-hover:text-orange-400 transition-colors" />
                                            )}
                                            <p className="text-sm font-bold text-slate-500 group-hover:text-orange-600">
                                                {isUploading ? 'Enviando...' : 'Clique para enviar foto'}
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'tamanhos' && 'hidden')}>
                        {/* CONFIGURAÇÃO DE PIZZARIA GLOBAL NA ABA TAMANHOS */}
                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-lg font-black flex items-center gap-2 italic text-slate-800">
                                        <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm not-italic">02</span>
                                        Tamanhos & Configuração
                                    </h2>
                                </div>

                                <div 
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none",
                                        isPizza ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"
                                    )}
                                    onClick={() => setIsPizza(!isPizza)}
                                >
                                    <Pizza size={18} className={isPizza ? "text-orange-500" : "text-slate-300"} />
                                    <span className={cn("block text-xs font-black uppercase tracking-wide", isPizza ? "text-orange-600" : "text-slate-400")}>
                                        Modo Pizzaria
                                    </span>
                                </div>
                            </div>

                            {isPizza && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-orange-50/50 border-2 border-orange-100 rounded-2xl animate-in zoom-in-95 duration-200">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Layers className="text-orange-500" size={18} />
                                            <h3 className="text-sm font-black uppercase text-slate-700">Origem dos Sabores</h3>
                                        </div>
                                        <div className="form-group">
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Categoria que contém os sabores:</label>
                                            <select 
                                                value={pizzaConfig.flavorCategoryId} 
                                                onChange={e => setPizzaConfig({...pizzaConfig, flavorCategoryId: e.target.value})}
                                                className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-bold text-sm text-slate-700 focus:border-orange-500 outline-none transition"
                                            >
                                                <option value="">Selecione a categoria de sabores...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1">
                                                <Info size={10}/> O cliente escolherá os sabores desta categoria para montar a pizza.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="text-orange-500" size={18} />
                                            <h3 className="text-sm font-black uppercase text-slate-700">Regra de Preço Multi-Sabor</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                                pizzaConfig.priceRule === 'higher' ? "border-orange-500 bg-white" : "border-transparent bg-slate-100/50"
                                            )}>
                                                <input 
                                                    type="radio" 
                                                    name="price_rule_page" 
                                                    checked={pizzaConfig.priceRule === 'higher'}
                                                    onChange={() => setPizzaConfig({...pizzaConfig, priceRule: 'higher'})}
                                                    className="accent-orange-500 h-4 w-4" 
                                                />
                                                <span className="text-xs font-bold text-slate-700">Preço do sabor mais caro</span>
                                            </label>
                                            <label className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                                pizzaConfig.priceRule === 'average' ? "border-orange-500 bg-white" : "border-transparent bg-slate-100/50"
                                            )}>
                                                <input 
                                                    type="radio" 
                                                    name="price_rule_page" 
                                                    checked={pizzaConfig.priceRule === 'average'}
                                                    onChange={() => setPizzaConfig({...pizzaConfig, priceRule: 'average'})}
                                                    className="accent-orange-500 h-4 w-4" 
                                                />
                                                <span className="text-xs font-bold text-slate-700">Média aritmética dos valores</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Tamanhos Disponíveis</h3>
                                </div>
                                
                                {sizeFields.map((field, index) => {
                                    const sizeName = watch(`sizes.${index}.name`);
                                    const currentSizeConfig = pizzaConfig.sizes[sizeName] || { active: true, slices: 8, maxFlavors: 2 };

                                    const updateSizeConfig = (key: string, value: any) => {
                                        setPizzaConfig((prev: any) => ({
                                            ...prev,
                                            sizes: {
                                                ...prev.sizes,
                                                [sizeName]: {
                                                    ...currentSizeConfig,
                                                    active: true,
                                                    [key]: value
                                                }
                                            }
                                        }));
                                    };

                                    return (
                                        <div key={field.id} className={cn("relative p-5 rounded-2xl border-2 transition-all", isPizza ? "border-orange-100 bg-white shadow-sm" : "border-slate-100 bg-slate-50/30")}>
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                <div className="md:col-span-4">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Nome do Tamanho</label>
                                                    <input 
                                                        {...register(`sizes.${index}.name`, { required: true })}
                                                        placeholder="Ex: Grande"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Preço Base (R$)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-purple-600 font-bold text-xs">R$</span>
                                                        <input 
                                                            type="number"
                                                            step="0.01"
                                                            {...register(`sizes.${index}.price`, { required: true, valueAsNumber: true })}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-7 py-2 text-sm font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {isPizza && (
                                                    <>
                                                        <div className="md:col-span-2">
                                                            <label className="text-[9px] font-black uppercase text-orange-400 mb-1 block">Fatias</label>
                                                            <input 
                                                                type="number"
                                                                value={currentSizeConfig.slices}
                                                                onChange={(e) => updateSizeConfig('slices', parseInt(e.target.value))}
                                                                className="w-full bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm font-bold text-orange-700 outline-none"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-[9px] font-black uppercase text-orange-400 mb-1 block">Máx. Sabores</label>
                                                            <select 
                                                                value={currentSizeConfig.maxFlavors}
                                                                onChange={(e) => updateSizeConfig('maxFlavors', parseInt(e.target.value))}
                                                                className="w-full bg-orange-50 border border-orange-200 rounded-lg px-2 py-2 text-sm font-bold text-orange-700 outline-none appearance-none"
                                                            >
                                                                <option value="1">1 Sabor</option>
                                                                <option value="2">2 Sabores</option>
                                                                <option value="3">3 Sabores</option>
                                                                <option value="4">4 Sabores</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="md:col-span-1 flex justify-end">
                                                    <button type="button" onClick={() => removeSize(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <button 
                                    type="button" 
                                    onClick={() => appendSize({ name: '', price: 0 })}
                                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:text-purple-500 hover:border-purple-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    <Plus size={14} /> Adicionar Novo Tamanho
                                </button>
                            </div>
                        </section>
                    </div>

                    <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'complementos' && 'hidden')}>
                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black flex items-center gap-2 italic text-slate-800">
                                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm not-italic">03</span>
                                    Grupos de Complementos
                                </h2>
                                <button 
                                    type="button" 
                                    onClick={() => appendAddonGroup({ name: 'Novo Grupo', type: 'multiple', isRequired: false, addons: [] })}
                                    className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} /> Criar Novo Grupo
                                </button>
                            </div>

                            <div className="space-y-6">
                                {addonGroupFields.map((field, index) => (
                                    <div key={field.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:border-blue-200 transition-colors bg-white">
                                        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-100">
                                            <input 
                                                {...register(`addonGroups.${index}.name`, { required: true })}
                                                className="bg-transparent border-none text-sm font-black text-slate-700 focus:ring-0 placeholder:text-slate-400 w-full"
                                                placeholder="Nome do Grupo"
                                            />
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-slate-500">Obrigatório?</label>
                                                    <input 
                                                        type="checkbox" 
                                                        {...register(`addonGroups.${index}.isRequired`)}
                                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300" 
                                                    />
                                                </div>
                                                <button type="button" onClick={() => removeAddonGroup(index)} className="p-1 text-slate-400 hover:text-red-500 transition">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <AddonsList groupIndex={index} control={control} register={register} />
                                        </div>
                                    </div>
                                ))}
                                
                                {addonGroupFields.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <List className="mx-auto text-slate-200 mb-2" size={32} />
                                        <p className="text-slate-400 font-bold text-sm">Nenhum grupo de adicionais criado.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== 'composição' && 'hidden')}>
                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic">
                            <h2 className="text-lg font-black mb-2 flex items-center gap-2 italic text-slate-800">
                                <span className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm not-italic">04</span>
                                Ficha Técnica (Insumos)
                            </h2>
                            <p className="text-xs text-slate-400 mb-8 font-medium">Os insumos vinculados abaixo serão descontados do estoque automaticamente a cada venda deste produto.</p>

                            <CompositionList 
                                control={control} 
                                register={register} 
                                availableIngredients={availableIngredients} 
                            />
                        </section>
                    </div>
                </div>

                <ProductMobilePreview 
                    watchFields={watchAllFields} 
                    isPizza={isPizza} 
                    pizzaConfig={pizzaConfig}
                />
            </div>
        </div>
    );
};

export default ProductFormPage;
