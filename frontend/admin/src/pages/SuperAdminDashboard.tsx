import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Store, Briefcase, Shield, X, Check, BarChart3, DollarSign, Settings, Users, Key, Calendar, RefreshCw, ChevronRight, LayoutDashboard, Loader2, ArrowUpRight, Target, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AnimatePresence, motion } from 'framer-motion';

const SuperAdminDashboard: React.FC = () => {
    const { token, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [franchises, setFranchises] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const activeTab = location.pathname.split('/').pop() || 'super-admin';

    // Modal States
    const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
    const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<any | null>(null);

    // Form States
    const [formData, setFormData] = useState({
        franchiseName: '', franchiseSlug: '', restaurantName: '', restaurantSlug: '',
        restaurantFranchiseId: '', restaurantPlan: 'FREE', restaurantExpiresAt: '',
        adminName: '', adminEmail: '', adminPassword: '', roleName: '', roleDescription: '',
        selectedPermissions: [] as string[], editPlan: '', editStatus: '', editExpiresAt: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fRes, rRes, pRes, rolesRes] = await Promise.all([
                api.get('/super-admin/franchises'),
                api.get('/super-admin/restaurants'),
                api.get('/super-admin/permissions'),
                api.get('/super-admin/roles')
            ]);
            setFranchises(fRes.data);
            setRestaurants(rRes.data);
            setPermissions(pRes.data);
            setRoles(rolesRes.data);
        } catch (error) { toast.error("Erro ao sincronizar dados globais."); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [token]);

    const togglePermission = (id: string) => {
        setFormData(prev => ({
            ...prev,
            selectedPermissions: prev.selectedPermissions.includes(id)
                ? prev.selectedPermissions.filter(p => p !== id)
                : [...prev.selectedPermissions, id]
        }));
    };

    const handleCreateFranchise = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/super-admin/franchises', {
                name: formData.franchiseName,
                slug: formData.franchiseSlug
            });
            toast.success("Franquia criada com sucesso!");
            setIsFranchiseModalOpen(false);
            fetchData();
        } catch (error) { toast.error("Erro ao criar franquia."); }
    };

    const handleCreateRestaurant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/super-admin/restaurants', {
                name: formData.restaurantName,
                slug: formData.restaurantSlug,
                franchiseId: formData.restaurantFranchiseId || null,
                plan: formData.restaurantPlan,
                expiresAt: formData.restaurantExpiresAt || null,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword
            });
            toast.success("Unidade provisionada com sucesso!");
            setIsRestaurantModalOpen(false);
            fetchData();
        } catch (error) { toast.error("Erro no onboarding da unidade."); }
    };

    const handleUpdateSubscription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStore) return;
        try {
            await api.patch(`/super-admin/restaurants/${selectedStore.id}/subscription`, {
                plan: formData.editPlan,
                status: formData.editStatus,
                expiresAt: formData.editExpiresAt || null
            });
            toast.success("Assinatura atualizada!");
            setIsPlanModalOpen(false);
            fetchData();
        } catch (error) { toast.error("Erro ao atualizar assinatura."); }
    };

    if (loading && franchises.length === 0) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Autenticando Nível Mestre...</span>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'subscriptions':
                return (
                    <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white animate-in fade-in duration-500">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div><h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><DollarSign size={24} className="text-emerald-500" /> Gestão de Receita SaaS</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status de faturamento das unidades</p></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Loja / Cliente</th>
                                        <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Plano Ativo</th>
                                        <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status de Conta</th>
                                        <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Próx. Vencimento</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Gerenciar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {restaurants.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5 font-black text-xs text-slate-900 uppercase italic">{r.name}</td>
                                            <td className="px-8 py-5"><span className="text-[9px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">{r.plan}</span></td>
                                            <td className="px-8 py-5"><span className={cn("text-[9px] font-black px-2 py-1 rounded-lg border shadow-sm", r.status === 'ACTIVE' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-rose-50 text-rose-600 border-rose-100")}>{r.status}</span></td>
                                            <td className="px-8 py-5 text-[10px] font-bold text-slate-500 italic uppercase">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : 'VITALÍCIO'}</td>
                                            <td className="px-8 py-5 text-right"><Button variant="ghost" size="icon" className="bg-slate-100 text-slate-400 hover:text-orange-600 rounded-xl" onClick={() => { setSelectedStore(r); setFormData({...formData, editPlan: r.plan, editStatus: r.status, editExpiresAt: r.expiresAt?.split('T')[0] || ''}); setIsPlanModalOpen(true); }}><Settings size={16} /></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'franchises':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Briefcase size={24} className="text-orange-500" /> Redes de Franquias</h2>
                            <Button onClick={() => setIsFranchiseModalOpen(true)} className="rounded-xl px-6 italic"><Plus size={18} /> NOVA REDE</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {franchises.map(f => (
                                <Card key={f.id} className="p-8 border-slate-100 hover:border-orange-500/20 transition-all duration-300 hover:shadow-2xl group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 opacity-20 -mr-12 -mt-12 rounded-full" />
                                    <h3 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter mb-2 leading-none">{f.name}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">SLUG: {f.slug}</p>
                                    <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                                        <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Unidades</span><span className="text-sm font-black italic text-orange-600">{f._count.restaurants}</span></div>
                                        <div className="flex flex-col text-right"><span className="text-[8px] font-black text-slate-400 uppercase">Usuários</span><span className="text-sm font-black italic text-slate-900">{f._count.users}</span></div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'restaurants':
                return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><Store size={24} className="text-blue-500" /> Portfólio de Lojas</h2>
                            <Button onClick={() => setIsRestaurantModalOpen(true)} className="rounded-xl px-6 italic"><Plus size={18} /> NOVO ONBOARDING</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {restaurants.map(r => {
                                const isCurrent = localStorage.getItem('selectedRestaurantId') === r.id;
                                return (
                                    <Card key={r.id} className={cn("p-8 border-2 transition-all duration-300 group hover:shadow-2xl relative overflow-hidden flex flex-col justify-between", isCurrent ? "border-blue-500 bg-blue-50/30 shadow-blue-900/10" : "border-slate-100 bg-white")}>
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <h3 className="font-black text-xl text-slate-900 italic uppercase tracking-tighter leading-none pr-4">{r.name}</h3>
                                                <span className={cn("text-[8px] font-black px-2 py-0.5 rounded border shadow-sm tracking-widest", r.plan === 'DIAMOND' ? "bg-slate-900 text-white border-slate-900" : "bg-blue-50 text-blue-600 border-blue-100")}>{r.plan}</span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-8">FRANQUIA: <b className="text-slate-600">{r.franchise?.name || 'INDEPENDENTE'}</b></p>
                                        </div>
                                        <Button 
                                            fullWidth 
                                            variant={isCurrent ? "primary" : "outline"}
                                            onClick={() => { localStorage.setItem('selectedRestaurantId', r.id); toast.success(`Contexto: ${r.name}`); navigate('/dashboard'); }}
                                            className={cn("h-11 rounded-xl text-[10px] font-black uppercase italic tracking-widest gap-2", isCurrent ? "bg-blue-600 shadow-blue-900/20" : "bg-white text-blue-600 border-blue-100")}
                                        >
                                            {isCurrent ? <CheckCircle size={14}/> : <Settings size={14}/>}
                                            {isCurrent ? 'GERENCIANDO AGORA' : 'ACESSAR PAINEL'}
                                        </Button>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="space-y-10 animate-in fade-in duration-700">
                        {/* KPIs Globais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Franquias', count: franchises.length, icon: Briefcase, color: 'orange', path: '/super-admin/franchises' },
                                { label: 'Lojas Ativas', count: restaurants.length, icon: Store, color: 'blue', path: '/super-admin/restaurants' },
                                { label: 'Contratos Ativos', count: restaurants.filter(r => r.status === 'ACTIVE').length, icon: DollarSign, color: 'emerald', path: '/super-admin/subscriptions' },
                                { label: 'Cargos Criados', count: roles.length, icon: ShieldCheck, color: 'purple', path: '/super-admin/permissions' },
                            ].map((stat, idx) => (
                                <Card key={idx} onClick={() => navigate(stat.path)} className="p-8 border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer bg-white">
                                    <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110", `bg-${stat.color}-500 text-white shadow-${stat.color}-100`)}>
                                        <stat.icon size={32} />
                                    </div>
                                    <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 leading-none">{stat.label}</h2>
                                    <p className="text-4xl font-black italic text-slate-900 tracking-tighter leading-none">{stat.count}</p>
                                    <div className="mt-6 pt-6 border-t border-slate-50 w-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[8px] font-black uppercase text-orange-500 tracking-widest italic">Ver Detalhes</span><ChevronRight size={10} className="text-orange-500"/></div>
                                </Card>
                            ))}
                        </div>

                        {/* Visão de Performance da Plataforma */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <Card className="lg:col-span-8 p-10 bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div><h3 className="text-2xl font-black italic uppercase tracking-tighter">Crescimento da Rede</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Volume de novas unidades por período</p></div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-orange-500"><Target size={32}/></div>
                                    </div>
                                    <div className="h-[250px] w-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2rem] bg-black/20 opacity-30"><p className="text-[10px] font-black uppercase tracking-[0.3em]">Gráfico de Escalabilidade (Em Breve)</p></div>
                                </div>
                            </Card>
                            <Card className="lg:col-span-4 p-10 border-slate-100 bg-white shadow-xl space-y-8">
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-900 border-b border-slate-50 pb-4">Acesso Direto</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Monitor de Infraestrutura', icon: RefreshCw },
                                        { label: 'Logs de Segurança', icon: Key },
                                        { label: 'Gestão de Usuários Globais', icon: Users },
                                        { label: 'Configurações de Planos', icon: Settings }
                                    ].map((item, i) => (
                                        <button key={i} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-500/20 group transition-all text-left">
                                            <div className="flex items-center gap-3"><item.icon size={18} className="text-slate-400 group-hover:text-orange-500 transition-colors"/><span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-slate-900">{item.label}</span></div>
                                            <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Header Mestre Super Admin */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                        {activeTab === 'super-admin' ? 'Controle Mestre' : activeTab === 'franchises' ? 'Rede de Franquias' : activeTab === 'restaurants' ? 'Portfólio de Lojas' : activeTab === 'subscriptions' ? 'Gestão Financeira SaaS' : 'Painel'}
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-2"><ShieldCheck size={16} className="text-orange-500" /> Administrador Global do Sistema</p>
                </div>
                
                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] gap-1 shadow-inner overflow-x-auto no-scrollbar max-w-full">
                    {[
                        { id: 'super-admin', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'franchises', label: 'Franquias', icon: Briefcase },
                        { id: 'restaurants', label: 'Unidades', icon: Store },
                        { id: 'subscriptions', label: 'Contratos', icon: DollarSign },
                        { id: 'permissions', label: 'Segurança', icon: Shield },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => navigate(tab.id === 'super-admin' ? '/super-admin' : `/super-admin/${tab.id}`)} className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap", activeTab === tab.id ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <main className="mt-10">{renderContent()}</main>

            {/* MODAIS SUPER ADMIN PREMIUM */}
            <AnimatePresence>
                {/* Modal Franquia */}
                {isFranchiseModalOpen && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-md overflow-hidden flex flex-col">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4"><div className="bg-orange-500 text-white p-3 rounded-2xl shadow-xl shadow-orange-100"><Briefcase size={24} /></div><div><h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Nova Franquia</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Estrutura de Rede</p></div></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsFranchiseModalOpen(false)} className="rounded-full bg-slate-50"><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleCreateFranchise} className="p-10 space-y-6 bg-slate-50/30">
                                <Input label="Nome da Rede" required value={formData.franchiseName} onChange={e => setFormData({...formData, franchiseName: e.target.value})} placeholder="Ex: Roma Pizzaria Group"/>
                                <Input label="Slug / Subdomínio" required value={formData.franchiseSlug} onChange={e => setFormData({...formData, franchiseSlug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="ex: roma-group"/>
                                <div className="pt-6"><Button fullWidth size="lg" className="h-14 rounded-2xl font-black uppercase tracking-widest italic shadow-xl shadow-slate-200">CRIAR ESTRUTURA</Button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Modal Loja (Onboarding) */}
                {isRestaurantModalOpen && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-3xl overflow-hidden flex flex-col">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4"><div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl shadow-blue-100"><Store size={24} /></div><div><h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Onboarding Unidade</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Provisionamento de Loja e Admin</p></div></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsRestaurantModalOpen(false)} className="rounded-full bg-slate-50"><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleCreateRestaurant} className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 space-y-10">
                                <div className="space-y-6"><h4 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-100 pb-4"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Dados da Operação</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="Nome da Unidade" required value={formData.restaurantName} onChange={e => setFormData({...formData, restaurantName: e.target.value})} placeholder="Ex: Unidade Shopping Centro"/>
                                        <Input label="Slug / Identificador" required value={formData.restaurantSlug} onChange={e => setFormData({...formData, restaurantSlug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="unidade-centro"/>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Plano do Contrato</label><select className="ui-input w-full h-12" value={formData.restaurantPlan} onChange={e => setFormData({...formData, restaurantPlan: e.target.value})}><option value="FREE">FREE (Limitado)</option><option value="SILVER">SILVER (Standard)</option><option value="GOLD">GOLD (Premium)</option><option value="DIAMOND">DIAMOND (Unlimited)</option></select></div>
                                        <Input label="Validade Contratual" type="date" value={formData.restaurantExpiresAt} onChange={e => setFormData({...formData, restaurantExpiresAt: e.target.value})}/>
                                        <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Franquia Vinculada (Opcional)</label><select className="ui-input w-full h-12" value={formData.restaurantFranchiseId} onChange={e => setFormData({...formData, restaurantFranchiseId: e.target.value})}><option value="">LOJA INDEPENDENTE</option>{franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                                    </div>
                                </div>
                                <div className="space-y-6 pt-4"><h4 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-100 pb-4"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Usuário Mestre (Proprietário)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2"><Input label="Nome Completo do Admin" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} placeholder="Gerente ou Dono"/></div>
                                        <Input label="E-mail de Login" type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} placeholder="dono@loja.com"/>
                                        <Input label="Senha Temporária" type="password" required value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} placeholder="••••••"/>
                                    </div>
                                </div>
                            </form>
                            <footer className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0"><Button variant="ghost" onClick={() => setIsRestaurantModalOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">CANCELAR</Button><Button type="submit" onClick={handleCreateRestaurant} className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black bg-blue-600 hover:bg-blue-500">FINALIZAR E CRIAR LOJA</Button></footer>
                        </motion.div>
                    </div>
                )}

                {/* Modal Assinatura (Plano) */}
                {isPlanModalOpen && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-md overflow-hidden flex flex-col">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4"><div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl shadow-emerald-100"><DollarSign size={24} /></div><div><h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Gestão de Plano</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedStore?.name}</p></div></div>
                                <Button variant="ghost" size="icon" onClick={() => setIsPlanModalOpen(false)} className="rounded-full bg-slate-50"><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleUpdateSubscription} className="p-10 space-y-6 bg-slate-50/30">
                                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Plano Ativo</label><select className="ui-input w-full h-12" value={formData.editPlan} onChange={e => setFormData({...formData, editPlan: e.target.value})}><option value="FREE">FREE</option><option value="SILVER">SILVER</option><option value="GOLD">GOLD</option><option value="DIAMOND">DIAMOND</option></select></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Status do Contrato</label><select className="ui-input w-full h-12" value={formData.editStatus} onChange={e => setFormData({...formData, editStatus: e.target.value})}><option value="ACTIVE">ATIVO</option><option value="SUSPENDED">SUSPENSO</option><option value="TRIAL">TESTE (TRIAL)</option></select></div>
                                <Input label="Nova Validade" type="date" value={formData.editExpiresAt} onChange={e => setFormData({...formData, editExpiresAt: e.target.value})}/>
                                <div className="pt-6"><Button fullWidth size="lg" className="h-14 rounded-2xl font-black uppercase tracking-widest italic shadow-xl shadow-slate-200 bg-emerald-600 hover:bg-emerald-500">SALVAR ALTERAÇÕES</Button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SuperAdminDashboard;