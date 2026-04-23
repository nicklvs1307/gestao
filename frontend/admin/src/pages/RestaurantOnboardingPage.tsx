import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getFranchises } from '../services/api/superAdmin';
import { toast } from 'sonner';
import { Store, ArrowLeft, Loader2, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface Franchise {
    id: string;
    name: string;
}

const RestaurantOnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [formData, setFormData] = useState({
        restaurantName: '',
        restaurantSlug: '',
        restaurantFranchiseId: '',
        restaurantPlan: 'FREE',
        restaurantExpiresAt: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    useEffect(() => {
        const fetchFranchises = async () => {
            try {
                const res = await getFranchises();
                setFranchises(res);
            } catch (error) {
                console.error('Erro ao buscar franquias:', error);
            }
        };
        fetchFranchises();
    }, []);

    const handleCreateRestaurant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.restaurantName || !formData.restaurantSlug || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
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
            toast.success('Unidade provisionada com sucesso!');
            navigate('/super-admin/restaurants');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Erro no onboarding da unidade.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    };

    return (
        <div className="min-h-screen bg-slate-50/30">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/super-admin/restaurants')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Voltar ao Portfólio</span>
                    </button>
                </div>

                <Card className="overflow-hidden shadow-2xl border-slate-100">
                    <header className="px-10 py-8 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl shadow-blue-100">
                                <Store size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                                    Onboarding Unidade
                                </h1>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Provisionamento de Loja e Admin
                                </p>
                            </div>
                        </div>
                    </header>

                    <form onSubmit={handleCreateRestaurant} className="p-10 space-y-10">
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-100 pb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Dados da Operação
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input 
                                    label="Nome da Unidade" 
                                    required 
                                    value={formData.restaurantName}
                                    onChange={e => {
                                        setFormData({
                                            ...formData,
                                            restaurantName: e.target.value,
                                            restaurantSlug: generateSlug(e.target.value)
                                        });
                                    }}
                                    placeholder="Ex: Unidade Shopping Centro"
                                />
                                <Input 
                                    label="Slug / Identificador" 
                                    required 
                                    value={formData.restaurantSlug}
                                    onChange={e => setFormData({...formData, restaurantSlug: generateSlug(e.target.value)})}
                                    placeholder="unidade-centro"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                                        Plano do Contrato
                                    </label>
                                    <select 
                                        className="ui-input w-full h-12"
                                        value={formData.restaurantPlan}
                                        onChange={e => setFormData({...formData, restaurantPlan: e.target.value})}
                                    >
                                        <option value="FREE">FREE (Limitado)</option>
                                        <option value="SILVER">SILVER (Standard)</option>
                                        <option value="GOLD">GOLD (Premium)</option>
                                        <option value="DIAMOND">DIAMOND (Unlimited)</option>
                                    </select>
                                </div>
                                <Input 
                                    label="Validade Contratual" 
                                    type="date"
                                    value={formData.restaurantExpiresAt}
                                    onChange={e => setFormData({...formData, restaurantExpiresAt: e.target.value})}
                                />
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                                        Franquia Vinculada (Opcional)
                                    </label>
                                    <select 
                                        className="ui-input w-full h-12"
                                        value={formData.restaurantFranchiseId}
                                        onChange={e => setFormData({...formData, restaurantFranchiseId: e.target.value})}
                                    >
                                        <option value="">LOJA INDEPENDENTE</option>
                                        {franchises.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h3 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-100 pb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Usuário Mestre (Proprietário)
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Input 
                                        label="Nome Completo do Admin" 
                                        required 
                                        value={formData.adminName}
                                        onChange={e => setFormData({...formData, adminName: e.target.value})}
                                        placeholder="Gerente ou Dono"
                                    />
                                </div>
                                <Input 
                                    label="E-mail de Login" 
                                    type="email"
                                    required 
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                                    placeholder="dono@loja.com"
                                />
                                <Input 
                                    label="Senha Temporária" 
                                    type="password"
                                    required 
                                    value={formData.adminPassword}
                                    onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                                    placeholder="••••••"
                                />
                            </div>
                        </div>
                    </form>

                    <footer className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                        <Button 
                            variant="ghost" 
                            onClick={() => navigate('/super-admin/restaurants')}
                            className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400"
                        >
                            CANCELAR
                        </Button>
                        <Button 
                            onClick={handleCreateRestaurant}
                            disabled={loading}
                            className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black bg-blue-600 hover:bg-blue-500"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'FINALIZAR E CRIAR LOJA'}
                        </Button>
                    </footer>
                </Card>
            </div>
        </div>
    );
};

export default RestaurantOnboardingPage;