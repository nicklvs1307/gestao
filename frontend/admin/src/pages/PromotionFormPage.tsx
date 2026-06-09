import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Product, Category, AddonGroup } from '@/types/index';
import { 
    createPromotion, updatePromotion, getProducts, getCategories, 
    getAddonGroups, getPromotions 
} from '../services/api';
import { 
    Save, Calendar, Percent, CheckCircle, Search, Package, 
    Layers, Zap, Tag, Eye, ArrowLeft, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'sonner';

const PromotionFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetType, setTargetType] = useState<'PRODUCT' | 'ADDON' | 'CATEGORY' | 'GLOBAL'>('PRODUCT');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [prods, cats, groups] = await Promise.all([getProducts(), getCategories(), getAddonGroups()]);
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
                productId: targetType === 'PRODUCT' ? formData.productId : null,
                addonId: targetType === 'ADDON' ? formData.addonId : null,
                categoryId: targetType === 'CATEGORY' ? formData.categoryId : null,
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
        <div className="flex h-64 items-center justify-center opacity-30 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Carregando...</span>
        </div>
    );

    const filteredItems = () => {
        if (targetType === 'PRODUCT') return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (targetType === 'ADDON') return addonGroups.flatMap(g => g.addons.map(a => ({ ...a, groupName: g.name })))
            .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return [];
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10 text-foreground">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sticky top-0 bg-background/90 backdrop-blur-md z-40 py-2 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/promotions')} className="rounded-lg bg-white h-9 w-9 border border-border shadow-sm"><ArrowLeft size={18}/></Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">{isEditing ? 'Editar Promoção' : 'Nova Promoção'}</h1>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", formData.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200")}>
                                {formData.isActive ? 'ATIVA' : 'INATIVA'}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] font-medium mt-0.5 italic">Preço especial em itens do cardápio</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-9 rounded-lg font-black uppercase text-[9px] text-muted-foreground" onClick={() => navigate('/promotions')}>CANCELAR</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting} className="flex-1 lg:flex-none h-9 rounded-lg px-6 shadow-md font-black italic uppercase tracking-widest gap-2 text-[10px]">
                        <Save size={14} /> {isEditing ? 'SALVAR' : 'CRIAR'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 space-y-4">
                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-slate-900 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Dados da Promoção</h3>
                        </div>
                        <Input label="Nome da Campanha" required placeholder="Ex: Black Friday 2026" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-9 text-[11px]" noMargin />
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider ml-1 italic">Descrição</label>
                            <textarea rows={2} className="w-full p-2.5 rounded-lg bg-background border border-border focus:border-primary transition-all font-medium text-[11px] italic outline-none resize-none" placeholder="Ex: Aproveite nossos itens em oferta por tempo limitado!" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </Card>

                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Regras de Desconto</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider ml-1 italic">Modalidade</label>
                                <div className="flex p-1 bg-muted rounded-xl gap-1 border border-border">
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'percentage'})} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", formData.discountType === 'percentage' ? "bg-white text-foreground shadow-sm border border-border" : "text-muted-foreground hover:bg-white/50")}>Porcentagem (%)</button>
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'fixed_amount'})} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", formData.discountType === 'fixed_amount' ? "bg-white text-foreground shadow-sm border border-border" : "text-muted-foreground hover:bg-white/50")}>Valor Fixo (R$)</button>
                                </div>
                            </div>
                            <Input label={`Valor (${formData.discountType === 'percentage' ? '%' : 'R$'})`} type="number" required placeholder="0.00" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} className="h-9 text-[11px]" noMargin />
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-5 space-y-4">
                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Vigência</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Início" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="h-9 text-[11px]" noMargin />
                            <Input label="Término" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="h-9 text-[11px]" noMargin />
                        </div>
                    </Card>

                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Alvo da Promoção</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[
                                { id: 'PRODUCT', label: 'Produto', icon: Package },
                                { id: 'ADDON', label: 'Adicional', icon: Zap },
                                { id: 'CATEGORY', label: 'Categoria', icon: Layers },
                                { id: 'GLOBAL', label: 'Geral', icon: Tag }
                            ].map(type => (
                                <button key={type.id} type="button" onClick={() => { setTargetType(type.id as any); setSearchTerm(''); }} className={cn("flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all", targetType === type.id ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-border bg-white text-muted-foreground hover:border-slate-300")}>
                                    <type.icon size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{type.label}</span>
                                </button>
                            ))}
                        </div>

                        {targetType === 'PRODUCT' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                    <input className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-lg text-[11px] font-medium outline-none focus:border-primary" placeholder="Pesquisar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                    {filteredItems().map((p: any) => (
                                        <button key={p.id} type="button" onClick={() => setFormData({...formData, productId: p.id})} className={cn("w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left", formData.productId === p.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border bg-white text-muted-foreground hover:bg-muted/50")}>
                                            <span className="text-[10px] font-bold uppercase">{p.name}</span>
                                            {formData.productId === p.id && <CheckCircle size={12} />}
                                        </button>
                                    ))}
                                    {filteredItems().length === 0 && <p className="text-center py-4 text-[10px] font-bold text-muted-foreground uppercase">Nenhum item encontrado</p>}
                                </div>
                            </div>
                        )}

                        {targetType === 'ADDON' && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                    <input className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-lg text-[11px] font-medium outline-none focus:border-primary" placeholder="Pesquisar adicional..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                    {filteredItems().map((a: any) => (
                                        <button key={a.id} type="button" onClick={() => setFormData({...formData, addonId: a.id})} className={cn("w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left", formData.addonId === a.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border bg-white text-muted-foreground hover:bg-muted/50")}>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase block">{a.name}</span>
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{a.groupName}</span>
                                            </div>
                                            {formData.addonId === a.id && <CheckCircle size={12} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {targetType === 'CATEGORY' && (
                            <div className="grid grid-cols-1 gap-1.5">
                                {categories.map(c => (
                                    <button key={c.id} type="button" onClick={() => setFormData({...formData, categoryId: c.id})} className={cn("w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left", formData.categoryId === c.id ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-border bg-white text-muted-foreground hover:bg-muted/50")}>
                                        <span className="text-[10px] font-bold uppercase">{c.name}</span>
                                        {formData.categoryId === c.id && <CheckCircle size={12} />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {targetType === 'GLOBAL' && (
                            <div className="p-4 bg-muted/50 rounded-xl border border-border text-center space-y-1">
                                <Tag size={20} className="mx-auto text-muted-foreground" />
                                <p className="text-[10px] font-bold uppercase text-foreground">Oferta Geral</p>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase">Aplicada a todos os itens do cardápio</p>
                            </div>
                        )}
                    </Card>

                    <div className={cn("p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer", formData.isActive ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-border")} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                        <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", formData.isActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}><Eye size={14} /></div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase block leading-none">Status</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{formData.isActive ? 'Ativa no Cardápio' : 'Pausada'}</span>
                            </div>
                        </div>
                        <div className={cn("w-8 h-4 rounded-full relative transition-all", formData.isActive ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", formData.isActive ? "left-4.5" : "left-0.5")} /></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromotionFormPage;
