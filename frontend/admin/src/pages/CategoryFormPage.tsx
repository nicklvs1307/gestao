import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
    ArrowLeft, Save, Loader2, CheckCircle, 
    Layers, Settings2, Truck, Utensils, Globe, Info, 
    Hash, List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCategoryById, createCategory, updateCategory } from '../services/api/categories';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion } from 'framer-motion';

function CategoryFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            description: '',
            cuisineType: 'Geral',
            isActive: true,
            allowDelivery: true,
            allowPos: true,
            allowOnline: true,
            saiposIntegrationCode: '',
            availableDays: '1,2,3,4,5,6,7',
            startTime: '',
            endTime: ''
        }
    });

    useEffect(() => {
        const loadData = async () => {
            if (id && id !== 'new') {
                try {
                    setIsLoading(true);
                    const category = await getCategoryById(id);
                    if (category) {
                        reset(category);
                    } else {
                        toast.error("Categoria não encontrada.");
                        navigate('/products');
                    }
                } catch (error) {
                    toast.error("Erro ao carregar categoria.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, navigate, reset]);

    const onSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            if (id && id !== 'new') {
                await updateCategory(id, data);
                toast.success("Categoria atualizada!");
            } else {
                await createCategory(data);
                toast.success("Categoria criada!");
            }
            navigate('/products');
        } catch (error) {
            toast.error("Erro ao salvar categoria.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && id && id !== 'new') {
        return (
            <div className="flex h-[60vh] items-center justify-center opacity-30">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-slate-900">
            {/* Header Super Compacto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/products')} className="rounded-xl bg-white h-10 w-10 border border-slate-200 shadow-sm">
                        <ArrowLeft size={20}/>
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
                            {id && id !== 'new' ? 'Editar Categoria' : 'Nova Categoria'}
                        </h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 italic">
                            Organização de Grupos de Produtos
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => navigate('/products')}>
                        CANCELAR
                    </Button>
                    <Button onClick={handleSubmit(onSubmit)} isLoading={isSaving} className="flex-1 lg:flex-none h-10 rounded-xl px-8 shadow-lg font-black italic uppercase tracking-widest gap-2 text-xs">
                        <Save size={18} /> {id && id !== 'new' ? 'SALVAR ALTERAÇÕES' : 'CRIAR CATEGORIA'}
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6">
                
                {/* Status e Visibilidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card 
                        className={cn(
                            "p-4 border-2 transition-all cursor-pointer flex items-center justify-between",
                            watch('isActive') ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100"
                        )}
                        onClick={() => setValue('isActive', !watch('isActive'))}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                watch('isActive') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <span className="block text-xs font-black uppercase italic text-slate-900">Categoria Ativa</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exibir no cardápio</span>
                            </div>
                        </div>
                        <div className={cn(
                            "w-10 h-5 rounded-full relative transition-all",
                            watch('isActive') ? "bg-emerald-500" : "bg-slate-300"
                        )}>
                            <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                watch('isActive') ? "left-6" : "left-1"
                            )} />
                        </div>
                    </Card>

                    <Card className="p-4 border-slate-200 bg-slate-50/50 flex items-center gap-3">
                        <div className="bg-orange-100 text-orange-600 p-2.5 rounded-xl">
                            <Hash size={20} />
                        </div>
                        <div className="flex-1">
                            <Input 
                                label="Código de Integração" 
                                {...register('saiposIntegrationCode')}
                                className="h-9 text-[10px] font-black uppercase"
                                placeholder="EX: CAT_01"
                            />
                        </div>
                    </Card>
                </div>

                <Card className="p-6 border-slate-200 bg-white space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8">
                            <Input 
                                label="Nome da Categoria" 
                                {...register('name', { required: true })}
                                className="h-11 font-black text-sm uppercase italic"
                                placeholder="Ex: Pizzas Clássicas, Bebidas..."
                                required
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block mb-1.5">Tipo de Cozinha</label>
                            <select 
                                {...register('cuisineType')}
                                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-black uppercase italic outline-none focus:border-orange-500 transition-all"
                            >
                                <option value="Geral">Geral</option>
                                <option value="Pizza">Pizza</option>
                                <option value="Bebidas">Bebidas</option>
                                <option value="Sobremesas">Sobremesas</option>
                                <option value="Lanches">Lanches</option>
                            </select>
                        </div>
                        <div className="md:col-span-12">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block mb-1.5">Descrição Curta</label>
                            <textarea 
                                {...register('description')}
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium outline-none focus:border-orange-500 transition-all"
                                placeholder="Descreva brevemente o que o cliente encontrará aqui..."
                            />
                        </div>
                    </div>
                </Card>

                {/* Canais de Visibilidade */}
                <Card className="p-6 border-slate-200 bg-white">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings2 size={16} className="text-orange-500" />
                        <h3 className="text-xs font-black uppercase italic text-slate-900">Visibilidade por Canal</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'allowDelivery', label: 'Delivery', icon: Truck, color: 'blue' },
                            { id: 'allowPos', label: 'Salão / PDV', icon: Utensils, color: 'emerald' },
                            { id: 'allowOnline', label: 'Cardápio Digital', icon: Globe, color: 'purple' }
                        ].map(canal => (
                            <div 
                                key={canal.id}
                                onClick={() => setValue(canal.id as any, !watch(canal.id as any))}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all cursor-pointer group flex flex-col gap-4",
                                    watch(canal.id as any) 
                                        ? `bg-white border-${canal.color}-500 shadow-md` 
                                        : "bg-slate-50 border-transparent opacity-60 grayscale"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                        watch(canal.id as any) ? `bg-${canal.color}-500 text-white` : "bg-slate-200 text-slate-400"
                                    )}>
                                        <canal.icon size={20} />
                                    </div>
                                    <div className={cn(
                                        "w-8 h-4 rounded-full relative transition-all",
                                        watch(canal.id as any) ? `bg-${canal.color}-500` : "bg-slate-300"
                                    )}>
                                        <div className={cn(
                                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                            watch(canal.id as any) ? "left-4.5" : "left-0.5"
                                        )} />
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase italic tracking-wider",
                                    watch(canal.id as any) ? "text-slate-900" : "text-slate-400"
                                )}>
                                    {canal.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-3">
                        <Info size={18} className="text-orange-500 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-900 leading-relaxed uppercase italic">
                            Ao desativar a visibilidade de uma categoria para um canal, todos os produtos vinculados a ela também deixarão de aparecer naquele canal específico.
                        </p>
                    </div>
                </Card>

            </div>
        </div>
    );
}

export default CategoryFormPage;
