import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Store, Briefcase, Shield, X, Check, BarChart3, DollarSign, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

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
        franchiseName: '',
        franchiseSlug: '',
        restaurantName: '',
        restaurantSlug: '',
        restaurantFranchiseId: '',
        restaurantPlan: 'FREE',
        restaurantExpiresAt: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        roleName: '',
        roleDescription: '',
        selectedPermissions: [] as string[],
        editPlan: '',
        editStatus: '',
        editExpiresAt: ''
    });

    const fetchData = async () => {
        try {
            const [fRes, rRes, pRes, rolesRes] = await Promise.all([
                axios.get('http://localhost:3001/api/super-admin/franchises', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/super-admin/restaurants', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/super-admin/permissions', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/super-admin/roles', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setFranchises(fRes.data);
            setRestaurants(rRes.data);
            setPermissions(pRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error("Erro ao buscar dados", error);
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleCreateFranchise = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/super-admin/franchises', {
                name: formData.franchiseName,
                slug: formData.franchiseSlug
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Franquia criada com sucesso!");
            setIsFranchiseModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Erro ao criar franquia.");
        }
    };

    const handleCreateRestaurant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/super-admin/restaurants', {
                name: formData.restaurantName,
                slug: formData.restaurantSlug,
                franchiseId: formData.restaurantFranchiseId || null,
                plan: formData.restaurantPlan,
                expiresAt: formData.restaurantExpiresAt,
                adminName: formData.adminName,
                adminEmail: formData.adminEmail,
                adminPassword: formData.adminPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Loja e Administrador criados com sucesso!");
            setIsRestaurantModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao criar loja.");
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/super-admin/roles', {
                name: formData.roleName,
                description: formData.roleDescription,
                permissionIds: formData.selectedPermissions
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Cargo criado com sucesso!");
            setIsRoleModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Erro ao criar cargo.");
        }
    };

    const handleUpdatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.patch(`http://localhost:3001/api/super-admin/restaurants/${selectedStore.id}/subscription`, {
                plan: formData.editPlan,
                status: formData.editStatus,
                expiresAt: formData.editExpiresAt
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Assinatura atualizada!");
            setIsPlanModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error("Erro ao atualizar plano.");
        }
    };

    const togglePermission = (id: string) => {
        setFormData(prev => ({
            ...prev,
            selectedPermissions: prev.selectedPermissions.includes(id)
                ? prev.selectedPermissions.filter(p => p !== id)
                : [...prev.selectedPermissions, id]
        }));
    };

    if (loading) return <div className="p-10 text-center font-bold">Carregando painel...</div>;

    const renderContent = () => {
        switch (activeTab) {
            case 'subscriptions':
                return (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                <DollarSign className="text-emerald-500" /> Gestão de Assinaturas
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">Loja</th>
                                        <th className="px-6 py-4">Plano</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Expiração</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {restaurants.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-700">{r.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">{r.plan}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "text-[10px] font-black px-2 py-1 rounded-lg border",
                                                    r.status === 'ACTIVE' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-600 border-red-100"
                                                )}>{r.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : 'Vitalício'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStore(r);
                                                        setFormData({...formData, editPlan: r.plan, editStatus: r.status, editExpiresAt: r.expiresAt?.split('T')[0] || ''});
                                                        setIsPlanModalOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
                                                >
                                                    <Settings size={16} className="text-slate-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'franchises':
                return (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                <Briefcase className="text-yellow-500" /> Gerenciar Franquias
                            </h2>
                            <button onClick={() => setIsFranchiseModalOpen(true)} className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Nova Franquia</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {franchises.map(f => (
                                <div key={f.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-yellow-500 transition-all">
                                    <h3 className="font-black text-lg text-slate-900 italic uppercase tracking-tighter mb-2">{f.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-4 tracking-widest">{f.slug}</p>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                                        <span>Lojas: {f._count.restaurants}</span>
                                        <span>Usuários: {f._count.users}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'restaurants':
            case 'my-restaurants':
                const displayRestaurants = activeTab === 'my-restaurants' 
                    ? restaurants.filter(r => r.franchiseId === user?.franchiseId)
                    : restaurants;
                return (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                <Store className="text-blue-500" /> {activeTab === 'my-restaurants' ? 'Minhas Lojas' : 'Gerenciar Lojas'}
                            </h2>
                            {activeTab === 'restaurants' && (
                                <button onClick={() => setIsRestaurantModalOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Nova Loja</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayRestaurants.map(r => {
                                const isCurrent = localStorage.getItem('selectedRestaurantId') === r.id;
                                return (
                                    <div key={r.id} className={cn(
                                        "p-6 rounded-[2rem] border transition-all relative overflow-hidden",
                                        isCurrent ? "bg-blue-50 border-blue-500 shadow-md" : "bg-slate-50 border-slate-100 group hover:border-blue-500"
                                    )}>
                                        <h3 className="font-black text-lg text-slate-900 italic uppercase tracking-tighter mb-2">{r.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-2 tracking-widest">Franquia: {r.franchise?.name || 'Independente'}</p>
                                        <p className="text-[10px] font-black uppercase text-slate-500 mb-4">Plano: <span className="text-blue-600">{r.plan}</span></p>
                                        
                                        <button 
                                            onClick={() => {
                                                localStorage.setItem('selectedRestaurantId', r.id);
                                                toast.success(`Contexto alterado para: ${r.name}`);
                                                navigate('/dashboard');
                                            }} 
                                            className={cn(
                                                "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                isCurrent ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white"
                                            )}
                                        >
                                            {isCurrent ? 'Gerenciando Agora' : 'Gerenciar Loja'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'permissions':
                return (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                <Shield className="text-purple-500" /> Cargos e Permissões
                            </h2>
                            <button onClick={() => setIsRoleModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Novo Cargo</button>
                        </div>
                        <div className="space-y-3">
                            {roles.map(role => (
                                <div key={role.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter">{role.name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{role.description || 'Sem descrição'}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {role.permissions?.slice(0, 3).map((p: any) => (
                                            <span key={p.id} className="text-[8px] font-black uppercase px-2 py-0.5 bg-white border rounded">{p.name}</span>
                                        ))}
                                        {role.permissions?.length > 3 && <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-white border rounded">+{role.permissions.length - 3}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'reports':
                return (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px] items-center justify-center text-center">
                        <BarChart3 size={64} className="text-slate-200 mb-4" />
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-400">Relatórios Consolidados</h2>
                        <p className="text-slate-400 font-medium max-w-xs">Em breve: Visão Geral de faturamento e desempenho de toda a rede.</p>
                    </div>
                );
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Franquias', count: franchises.length, icon: Briefcase, color: 'text-yellow-500', bg: 'bg-yellow-50', path: '/super-admin/franchises' },
                            { label: 'Lojas', count: restaurants.length, icon: Store, color: 'text-blue-500', bg: 'bg-blue-50', path: '/super-admin/restaurants' },
                            { label: 'Assinaturas Ativas', count: restaurants.filter(r => r.status === 'ACTIVE').length, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', path: '/super-admin/subscriptions' },
                            { label: 'Cargos Criados', count: roles.length, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50', path: '/super-admin/permissions' },
                        ].map((stat, idx) => (
                            <div key={idx} onClick={() => navigate(stat.path)} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all cursor-pointer">
                                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
                                    <stat.icon size={32} />
                                </div>
                                <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</h2>
                                <p className="text-3xl font-black italic text-slate-900 leading-none">{stat.count}</p>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">
                        {activeTab === 'super-admin' ? 'Painel Super Admin' : 
                         activeTab === 'franchises' ? 'Gestão de Franquias' :
                         activeTab === 'restaurants' ? 'Gestão de Lojas' :
                         activeTab === 'subscriptions' ? 'Gestão de Assinaturas' :
                         activeTab === 'permissions' ? 'Cargos & Permissões' : 'Painel'}
                    </h1>
                    <p className="text-slate-500 font-medium">Controle total do ecossistema.</p>
                </div>
                
                {user?.isSuperAdmin && (
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        {[
                            { id: 'super-admin', label: 'Início', icon: Shield },
                            { id: 'franchises', label: 'Franquias', icon: Briefcase },
                            { id: 'restaurants', label: 'Lojas', icon: Store },
                            { id: 'subscriptions', label: 'Assinaturas', icon: DollarSign },
                            { id: 'permissions', label: 'Cargos', icon: Shield },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => navigate(tab.id === 'super-admin' ? '/super-admin' : `/super-admin/${tab.id}`)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                                    activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <tab.icon size={14} /> {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </header>
            
            <div className="mt-8">
                {renderContent()}
            </div>

            {/* Modais */}
            {isFranchiseModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Nova Franquia</h3>
                            <button onClick={() => setIsFranchiseModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateFranchise} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Franquia</label>
                                <input required className="ui-input w-full" value={formData.franchiseName} onChange={e => setFormData({...formData, franchiseName: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug (URL amigável)</label>
                                <input required className="ui-input w-full" value={formData.franchiseSlug} onChange={e => setFormData({...formData, franchiseSlug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}/>
                            </div>
                            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs mt-4">Criar Franquia</button>
                        </form>
                    </div>
                </div>
            )}

            {isRestaurantModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 my-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Onboarding de Nova Loja</h3>
                            <button onClick={() => setIsRestaurantModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateRestaurant} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div className="md:col-span-2"><h4 className="text-xs font-black uppercase text-blue-600 mb-2">Dados da Unidade</h4></div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Loja</label>
                                    <input required className="ui-input w-full" placeholder="Ex: Unidade Centro" value={formData.restaurantName} onChange={e => setFormData({...formData, restaurantName: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Slug / URL</label>
                                    <input required className="ui-input w-full" placeholder="unidade-centro" value={formData.restaurantSlug} onChange={e => setFormData({...formData, restaurantSlug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Plano de Acesso</label>
                                    <select className="ui-input w-full" value={formData.restaurantPlan} onChange={e => setFormData({...formData, restaurantPlan: e.target.value})}>
                                        <option value="FREE">Plano Free</option>
                                        <option value="SILVER">Plano Silver</option>
                                        <option value="GOLD">Plano Gold</option>
                                        <option value="DIAMOND">Plano Diamond</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Expiração (Opcional)</label>
                                    <input type="date" className="ui-input w-full" value={formData.restaurantExpiresAt} onChange={e => setFormData({...formData, restaurantExpiresAt: e.target.value})}/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Franquia (Opcional)</label>
                                    <select className="ui-input w-full" value={formData.restaurantFranchiseId} onChange={e => setFormData({...formData, restaurantFranchiseId: e.target.value})}>
                                        <option value="">Independente (Sem Franquia)</option>
                                        {franchises.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                                <div className="md:col-span-2"><h4 className="text-xs font-black uppercase text-blue-600 mb-2">Usuário Mestre (Admin)</h4></div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Responsável</label>
                                    <input required className="ui-input w-full" placeholder="Ex: Gerente Geral" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail de Acesso</label>
                                    <input required type="email" className="ui-input w-full" placeholder="admin@loja.com" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha Inicial</label>
                                    <input required type="password" title="Mínimo 6 caracteres" className="ui-input w-full" placeholder="••••••" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})}/>
                                </div>
                            </div>

                            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-600 transition-all">Finalizar Onboarding e Criar Loja</button>
                        </form>
                    </div>
                </div>
            )}

            {isRoleModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Novo Cargo Personalizado</h3>
                            <button onClick={() => setIsRoleModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateRole} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Cargo</label>
                                    <input required className="ui-input w-full" value={formData.roleName} onChange={e => setFormData({...formData, roleName: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição</label>
                                    <input className="ui-input w-full" value={formData.roleDescription} onChange={e => setFormData({...formData, roleDescription: e.target.value})}/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-3 block">Permissões Vinculadas</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {permissions.map(p => (
                                        <button 
                                            key={p.id}
                                            type="button"
                                            onClick={() => togglePermission(p.id)}
                                            className={cn(
                                                "p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all",
                                                formData.selectedPermissions.includes(p.id)
                                                    ? "bg-purple-50 border-purple-600 text-purple-700 shadow-sm"
                                                    : "bg-slate-50 border-slate-100 text-slate-500"
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase">{p.name}</span>
                                                <span className="text-[9px] opacity-70 font-medium">{p.description}</span>
                                            </div>
                                            {formData.selectedPermissions.includes(p.id) && <Check size={14}/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs sticky bottom-0 shadow-2xl">Criar Cargo</button>
                        </form>
                    </div>
                </div>
            )}

            {isPlanModalOpen && selectedStore && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter text-emerald-600">Ajustar Assinatura</h3>
                            <button onClick={() => setIsPlanModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-6">Editando: <span className="text-slate-900">{selectedStore.name}</span></p>
                        
                        <form onSubmit={handleUpdatePlan} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Plano</label>
                                <select className="ui-input w-full" value={formData.editPlan} onChange={e => setFormData({...formData, editPlan: e.target.value})}>
                                    <option value="FREE">FREE</option>
                                    <option value="SILVER">SILVER</option>
                                    <option value="GOLD">GOLD</option>
                                    <option value="DIAMOND">DIAMOND</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status da Conta</label>
                                <select className="ui-input w-full" value={formData.editStatus} onChange={e => setFormData({...formData, editStatus: e.target.value})}>
                                    <option value="ACTIVE">ATIVA (Normal)</option>
                                    <option value="SUSPENDED">SUSPENSA (Inadimplência)</option>
                                    <option value="TRIAL">TESTE (Gratuito Temporário)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data de Expiração</label>
                                <input type="date" className="ui-input w-full" value={formData.editExpiresAt} onChange={e => setFormData({...formData, editExpiresAt: e.target.value})}/>
                            </div>
                            <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs mt-4 hover:bg-emerald-700 shadow-xl shadow-emerald-100">Atualizar Assinatura</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;