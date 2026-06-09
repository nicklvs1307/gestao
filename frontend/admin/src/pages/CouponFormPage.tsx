import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPromotion, updatePromotion, getPromotions } from '../services/api';
import { Save, Calendar, Ticket, Info, Eye, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'sonner';

const CouponFormPage: React.FC = () => {
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
        code: '',
        minOrderValue: 0 as number | string,
        usageLimit: '' as number | string,
        allowCouponOnPromotion: true,
    });

    useEffect(() => {
        const loadData = async () => {
            try {
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
                            code: promo.code || '',
                            minOrderValue: promo.minOrderValue || 0,
                            usageLimit: promo.usageLimit || '',
                            allowCouponOnPromotion: promo.allowCouponOnPromotion !== false,
                        });
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
        if (!formData.name || !formData.code || !formData.discountValue || !formData.startDate || !formData.endDate) {
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
                code: formData.code.toUpperCase(),
                allowCouponOnPromotion: formData.allowCouponOnPromotion,
                productId: null,
                addonId: null,
                categoryId: null,
            };
            if (isEditing) await updatePromotion(id!, payload);
            else await createPromotion(payload);
            toast.success(isEditing ? "Cupom atualizado!" : "Cupom criado com sucesso!");
            navigate('/coupons');
        } catch (error) {
            toast.error("Erro ao salvar cupom.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center opacity-30 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Carregando...</span>
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10 text-foreground">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sticky top-0 bg-background/90 backdrop-blur-md z-40 py-2 border-b border-border">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" type="button" onClick={() => navigate('/coupons')} className="rounded-lg bg-white h-9 w-9 border border-border shadow-sm"><ArrowLeft size={18}/></Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h1>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", formData.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200")}>
                                {formData.isActive ? 'ATIVO' : 'INATIVO'}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] font-medium mt-0.5 italic">Cupom de desconto para clientes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" type="button" className="flex-1 lg:flex-none h-9 rounded-lg font-black uppercase text-[9px] text-muted-foreground" onClick={() => navigate('/coupons')}>CANCELAR</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting} className="flex-1 lg:flex-none h-9 rounded-lg px-6 shadow-md font-black italic uppercase tracking-widest gap-2 text-[10px]">
                        <Save size={14} /> {isEditing ? 'SALVAR' : 'CRIAR'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 space-y-4">
                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-slate-900 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Dados do Cupom</h3>
                        </div>
                        <Input label="Nome do Cupom" required placeholder="Ex: BEMVINDO10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-9 text-[11px]" noMargin />
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider ml-1 italic">Descrição</label>
                            <textarea rows={2} className="w-full p-2.5 rounded-lg bg-background border border-border focus:border-primary transition-all font-medium text-[11px] italic outline-none resize-none" placeholder="Ex: 10% de desconto para novos clientes" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </Card>

                    <Card className="p-4 border-border bg-white space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
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

                    <Card className="p-4 border-border bg-indigo-900 text-white space-y-3 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 mb-1 relative z-10">
                            <div className="w-1.5 h-4 bg-white/40 rounded-full" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest italic">Configurações do Cupom</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Código</label>
                                <input className="w-full bg-white/10 border border-white/20 rounded-lg h-9 px-3 text-[11px] font-black uppercase placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" placeholder="Ex: PIZZA10" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Pedido Mínimo</label>
                                <input type="number" className="w-full bg-white/10 border border-white/20 rounded-lg h-9 px-3 text-[11px] font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-200 uppercase tracking-widest ml-1">Limite de Uso</label>
                                <input type="number" className="w-full bg-white/10 border border-white/20 rounded-lg h-9 px-3 text-[11px] font-black placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-white/30" placeholder="Sem limite" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                            </div>
                        </div>
                        
                        <div className="relative z-10 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest">Combinar com promoções</label>
                                    <p className="text-[8px] text-indigo-200 font-bold uppercase italic leading-tight mt-0.5">Se desativado, não será usado com itens em promoção</p>
                                </div>
                                <button type="button" onClick={() => setFormData({...formData, allowCouponOnPromotion: !formData.allowCouponOnPromotion})} className={cn("w-10 h-5 rounded-full relative transition-all ml-3", formData.allowCouponOnPromotion ? "bg-emerald-500" : "bg-white/20")}>
                                    <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm", formData.allowCouponOnPromotion ? "left-[22px]" : "left-[3px]")} />
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-[8px] text-indigo-200 font-bold uppercase italic leading-tight flex items-center gap-1.5 relative z-10">
                            <Info size={10}/> Cliente digita o código no carrinho para receber o desconto
                        </p>
                    </Card>
                </div>

                <div className="xl:col-span-4 space-y-4">
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

                    <div className={cn("p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer", formData.isActive ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-border")} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                        <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", formData.isActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}><Eye size={14} /></div>
                            <div>
                                <span className="text-[10px] font-semibold uppercase block leading-none">Status</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{formData.isActive ? 'Ativo no Cardápio' : 'Pausado'}</span>
                            </div>
                        </div>
                        <div className={cn("w-8 h-4 rounded-full relative transition-all", formData.isActive ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", formData.isActive ? "left-4.5" : "left-0.5")} /></div>
                    </div>

                    <Card className="p-3 border-blue-200 bg-blue-50/50 shadow-sm">
                        <div className="flex gap-2.5">
                            <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <h4 className="text-[9px] font-black uppercase italic text-blue-900">Sobre a Combinação</h4>
                                <p className="text-[8px] font-medium text-blue-800/70 leading-relaxed uppercase tracking-tight">
                                    O toggle controla se este cupom pode ser aplicado quando o carrinho contiver itens com preço promocional.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CouponFormPage;
