import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Promotion } from '@/types/index';
import { 
    createPromotion, 
    updatePromotion, 
    getPromotions 
} from '../services/api';
import { 
    Save, Calendar, Ticket, Info, 
    ChevronLeft, Eye, ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Sincronizando dados...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-8 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/coupons')} className="rounded-xl hover:bg-slate-100">
                            <ChevronLeft size={24} />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                                    {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
                                </h1>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                    formData.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                                )}>
                                    {formData.isActive ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Configurar cupom de desconto</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => navigate('/coupons')} className="font-black text-[10px] uppercase tracking-widest text-slate-500">Descartar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting} className="h-12 px-8 rounded-xl shadow-xl shadow-purple-100 uppercase tracking-widest italic font-black flex items-center gap-2">
                            <Save size={18} /> {isEditing ? 'Atualizar Cupom' : 'Criar Cupom'}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-8 space-y-6">
                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-slate-900 text-white p-2 rounded-lg"><Ticket size={18} /></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Dados do Cupom</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <Input label="Nome Interno do Cupom" required placeholder="Ex: BEMVINDO10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <Input label="Descrição para o Cliente" placeholder="Ex: 10% de desconto para novos clientes" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-2">
                            <div className="bg-emerald-500 text-white p-2 rounded-lg"><span className="text-sm font-bold">%</span></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Regras de Desconto</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Modalidade de Cálculo</label>
                                <div className="flex p-1.5 bg-slate-50 border border-slate-100 rounded-2xl gap-1.5">
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'percentage'})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.discountType === 'percentage' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-white/50")}>Porcentagem (%)</button>
                                    <button type="button" onClick={() => setFormData({...formData, discountType: 'fixed_amount'})} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all", formData.discountType === 'fixed_amount' ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-white/50")}>Valor Fixo (R$)</button>
                                </div>
                            </div>
                            <Input label={`Valor do Desconto (${formData.discountType === 'percentage' ? '%' : 'R$'})`} type="number" required placeholder="0.00" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} />
                        </div>
                    </Card>

                    <Card className="p-8 border-none shadow-sm bg-indigo-900 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Ticket size={120} /></div>
                        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-2 relative z-10">
                            <div className="bg-white/20 text-white p-2 rounded-lg"><Ticket size={18} /></div>
                            <h3 className="text-sm font-black uppercase italic">Configurações do Cupom</h3>
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
                        
                        <div className="relative z-10 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest">
                                        Permitir combinar com promoções
                                    </label>
                                    <p className="text-[9px] text-indigo-200 font-bold uppercase italic leading-tight mt-1">
                                        Se desativado, este cupom não poderá ser usado quando o carrinho contiver itens em promoção
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, allowCouponOnPromotion: !formData.allowCouponOnPromotion})}
                                    className={cn(
                                        "w-12 h-6 rounded-full relative transition-all duration-300 ml-4",
                                        formData.allowCouponOnPromotion ? "bg-emerald-500" : "bg-white/20"
                                    )}
                                >
                                    <motion.div 
                                        animate={{ x: formData.allowCouponOnPromotion ? 26 : 2 }} 
                                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm" 
                                    />
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-[9px] text-indigo-200 font-bold uppercase italic leading-tight flex items-center gap-2 relative z-10">
                            <Info size={12}/> O cliente deve digitar este código no carrinho para receber o desconto.
                        </p>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
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

                    <div className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between group rounded-2xl", formData.isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white")} onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                        <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg", formData.isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                                <Eye size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-black uppercase italic text-slate-900 block leading-none">Status de Visibilidade</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{formData.isActive ? 'Ativo no Cardápio' : 'Pausado / Oculto'}</span>
                            </div>
                        </div>
                        <div className={cn("w-10 h-6 rounded-full relative transition-all duration-300", formData.isActive ? "bg-emerald-500" : "bg-slate-200")}>
                            <motion.div animate={{ x: formData.isActive ? 18 : 2 }} className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm" />
                        </div>
                    </div>

                    <Card className="p-6 border-blue-200 bg-blue-50/50 shadow-sm">
                        <div className="flex gap-3">
                            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-black uppercase italic text-blue-900">Sobre a Combinação</h4>
                                <p className="text-[9px] font-medium text-blue-800/70 leading-relaxed uppercase tracking-tight">
                                    O toggle "Permitir combinar com promoções" controla se este cupom pode ser aplicado quando o carrinho contiver itens com preço promocional. Se desativado, o cliente não conseguirá usar o cupom.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default CouponFormPage;
