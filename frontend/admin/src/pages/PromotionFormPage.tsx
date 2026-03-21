import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Promotion, Product, Category, AddonGroup } from '@/types/index';
import { 
    createPromotion, 
    updatePromotion, 
    getProducts, 
    getCategories, 
    getAddonGroups, 
    getPromotions 
} from '../services/api';
import { 
    X, Percent, Save, Calendar, Tag, Ticket, Info, 
    CheckCircle, ChevronLeft, Search, Package, 
    Layers, Zap, ArrowRight, Eye
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const PromotionFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Dados do Formulário
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '' as number | string,
        startDate: '',
        endDate: '',
        isActive: true,
        productId: '',
        addonId: '',
        categoryId: '',
        code: '',
        minOrderValue: 0 as number | string,
        usageLimit: '' as number | string,
    });

    // Dados de Suporte
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetType, setTargetType] = useState<'PRODUCT' | 'ADDON' | 'CATEGORY' | 'GLOBAL'>('PRODUCT');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [prods, cats, groups] = await Promise.all([
                    getProducts(),
                    getCategories(),
                    getAddonGroups()
                ]);
                setProducts(prods);
                setCategories(cats);
                setAddonGroups(groups);

                if (isEditing) {
                    const allPromos = await getPromotions();
                    const promo = allPromos.find((p: any) => p.id === id);
                    if (promo) {
                        setFormData({
                            name: promo.name,
                            description: promo.description || '',
                            discountType: promo.discountType,
                            discountValue: promo.discountValue,
                            startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
                            endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
                            isActive: promo.isActive,
                            productId: promo.productId || '',
                            addonId: promo.addonId || '',
                            categoryId: promo.categoryId || '',
                            code: promo.code || '',
                            minOrderValue: promo.minOrderValue || 0,
                            usageLimit: promo.usageLimit || '',
                        });
                        
                        if (promo.productId) setTargetType('PRODUCT');
                        else if (promo.addonId) setTargetType('ADDON');
                        else if (promo.categoryId) setTargetType('CATEGORY');
                        else setTargetType('GLOBAL');
                    }
                }
            } catch (error) {
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.discountValue || !formData.startDate || !formData.endDate) {
            toast.error("Preencha os campos obrigatórios.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                discountValue: Number(formData.discountValue),
                minOrderValue: Number(formData.minOrderValue),
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                productId: targetType === 'PRODUCT' ? formData.productId : null,
                addonId: targetType === 'ADDON' ? formData.addonId : null,
                categoryId: targetType === 'CATEGORY' ? formData.categoryId : null,
                code: formData.code || null
            };

            if (isEditing) await updatePromotion(id!, payload);
            else await createPromotion(payload);
            
            toast.success(isEditing ? "Promoção atualizada!" : "Promoção criada com sucesso!");
            navigate('/promotions');
        } catch (error) {
            toast.error("Erro ao salvar promoção.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando dados...</p>
        </div>
    );

    const filteredItems = () => {
        if (targetType === 'PRODUCT') {
            return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (targetType === 'ADDON') {
            return addonGroups.flatMap(g => g.addons.map(a => ({ ...a, groupName: g.name })))
                .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return [];
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Top Bar Fixa */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/promotions')} className="rounded-xl hover:bg-slate-100">
                            <ChevronLeft size={24} />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                                    {isEditing ? 'Editar Campanha' : 'Nova Promoção'}
                                </h1>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                    formData.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                                )}>
                                    {formData.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestão Industrial de Ofertas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => navigate('/promotions')} className="font-black text-[10px] uppercase tracking-widest text-slate-400">Descartar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting} className="h-12 px-8 rounded-xl shadow-xl shadow-orange-100 uppercase tracking-widest italic font-black flex items-center gap-2">
                            <Save size={18} /> {isEditing ? 'Atualizar Oferta' : 'Lançar Promoção'}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COLUNA ESQUERDA: CONFIGURAÇÕES */}
                <div className="lg:col-span-7 space-y-8">
                    {/* CARD 1: DADOS BÁSICOS */}
                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-slate-900 text-white p-2 rounded-lg"><Tag size={18} /></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Dados da Campanha</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <Input label="Nome Interno da Campanha" required placeholder="Ex: Black Friday 2026" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <Input label="Descrição para o Cliente" placeholder="Ex: Aproveite nossos itens em oferta por tempo limitado!" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </Card>

                    {/* CARD 2: REGRAS DE DESCONTO */}
                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-orange-500 text-white p-2 rounded-lg"><Percent size={18} /></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Regras de Desconto</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade de Cálculo</label>
                                <div className="flex p-1.5 bg-slate-50 border border-slate-100 rounded-2xl gap-1.5">
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'percentage'})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.discountType === 'percentage' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:bg-white/50")}>Porcentagem (%)</button>
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'fixed_amount'})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.discountType === 'fixed_amount' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:bg-white/50")}>Valor Fixo (R$)</button>
                                </div>
                            </div>
                            <Input label={`Valor do Desconto (${formData.discountType === 'percentage' ? '%' : 'R$'})`} type="number" required placeholder="0.00" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} />
                        </div>
                    </Card>

                    {/* CARD 3: CUPOM E LIMITES */}
                    <Card className="p-8 border-none shadow-sm bg-indigo-900 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Ticket size={120} /></div>
                        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-2 relative z-10">
                            <div className="bg-white/20 text-white p-2 rounded-lg"><Ticket size={18} /></div>
                            <h3 className="text-sm font-black uppercase italic">Configurações de Cupom</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Código do Cupom</label>
                                <input className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black uppercase placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" placeholder="Ex: PIZZA10" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Pedido Mínimo</label>
                                <input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Limite de Uso Total</label>
                                <input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl h-12 px-4 text-sm font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" placeholder="Sem limite" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                            </div>
                        </div>
                        <p className="text-[9px] text-indigo-200 font-bold uppercase italic leading-tight flex items-center gap-2 relative z-10">
                            <Info size={12}/> Se o código estiver preenchido, o cliente precisa digitar o cupom para ganhar o desconto.
                        </p>
                    </Card>
                </div>

                {/* COLUNA DIREITA: ALVOS E VALIDADE */}
                <div className="lg:col-span-5 space-y-8">
                    {/* CARD 4: VIGÊNCIA */}
                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-slate-900 text-white p-2 rounded-lg"><Calendar size={18} /></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Período de Validade</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Data de Início" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                            <Input label="Data de Término" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                        </div>
                    </Card>

                    {/* CARD 5: ALVO DA PROMOÇÃO (DINÂMICO) */}
                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-emerald-500 text-white p-2 rounded-lg"><Zap size={18} /></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Itens Participantes</h3>
                        </div>

                        {/* Seleção do Tipo de Alvo */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'PRODUCT', label: 'Produto', icon: Package },
                                { id: 'ADDON', label: 'Adicional/Sabor', icon: Zap },
                                { id: 'CATEGORY', label: 'Categoria', icon: Layers },
                                { id: 'GLOBAL', label: 'Geral', icon: Tag }
                            ].map(type => (
                                <button key={type.id} type="button" onClick={() => setTargetType(type.id as any)} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", targetType === type.id ? "border-slate-900 bg-slate-900 text-white shadow-lg" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200")}>
                                    <type.icon size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Seletor Dinâmico */}
                        {targetType === 'PRODUCT' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/10" placeholder="Pesquisar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {filteredItems().map((p: any) => (
                                        <button key={p.id} type="button" onClick={() => setFormData({...formData, productId: p.id})} className={cn("w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all", formData.productId === p.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-50 bg-white text-slate-600 hover:bg-slate-50")}>
                                            <span className="text-xs font-bold uppercase italic">{p.name}</span>
                                            {formData.productId === p.id && <CheckCircle size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {targetType === 'ADDON' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/10" placeholder="Pesquisar adicional ou sabor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {filteredItems().map((a: any) => (
                                        <button key={a.id} type="button" onClick={() => setFormData({...formData, addonId: a.id})} className={cn("w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all", formData.addonId === a.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-50 bg-white text-slate-600 hover:bg-slate-50")}>
                                            <div className="text-left">
                                                <span className="text-xs font-bold uppercase italic block">{a.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{a.groupName}</span>
                                            </div>
                                            {formData.addonId === a.id && <CheckCircle size={16} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {targetType === 'CATEGORY' && (
                            <div className="grid grid-cols-1 gap-2">
                                {categories.map(c => (
                                    <button key={c.id} type="button" onClick={() => setFormData({...formData, categoryId: c.id})} className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", formData.categoryId === c.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-50 bg-white text-slate-600 hover:bg-slate-50")}>
                                        <span className="text-xs font-bold uppercase italic">{c.name}</span>
                                        {formData.categoryId === c.id && <CheckCircle size={16} />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {targetType === 'GLOBAL' && (
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
                                <Tag size={32} className="mx-auto text-slate-300" />
                                <p className="text-xs font-black text-slate-900 uppercase italic">Oferta Geral</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed px-4">Esta promoção será aplicada a todos os itens do cardápio automaticamente.</p>
                            </div>
                        )}
                    </Card>

                    {/* CARD 6: STATUS FINAL */}
                    <Card className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between group", formData.isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white")} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                        <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg", formData.isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                <Eye size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-black uppercase italic text-slate-900 block leading-none">Status de Visibilidade</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{formData.isActive ? 'Ativa no Cardápio Digital' : 'Pausada / Oculta'}</span>
                            </div>
                        </div>
                        <div className={cn("w-10 h-6 rounded-full relative transition-all duration-300", formData.isActive ? "bg-emerald-500" : "bg-slate-200")}>
                            <motion.div animate={{ x: formData.isActive ? 18 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm" />
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default PromotionFormPage;
