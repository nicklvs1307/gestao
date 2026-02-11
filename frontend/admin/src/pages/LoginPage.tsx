import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, Lock, LogIn, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { token, user } = await login({ email, password });
      authLogin(token, user);
      
      toast.success(`Bem-vindo de volta, ${user.name.split(' ')[0]}!`);
      
      const normalizedRole = user.role?.toLowerCase() || '';

      if (normalizedRole.includes('waiter')) {
          navigate('/waiter');
      } else if (normalizedRole.includes('driver')) {
          navigate('/driver/dashboard');
      } else {
          navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Acesso negado. Verifique seu e-mail e senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f8fafc] overflow-hidden">
      
      {/* PAINEL VISUAL (Esquerda - Oculto em Mobile) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-transparent z-10" />
        
        {/* Conteúdo do Painel Lateral */}
        <div className="relative z-20 w-full h-full p-20 flex flex-col justify-between text-white">
            <div className="flex items-center gap-4 group cursor-default">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-2xl shadow-black group-hover:rotate-3 transition-transform">
                    <img src={logoImg} alt="Kicardapio" className="w-full h-full object-contain" />
                </div>
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Kicardapio</h2>
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em] mt-1">Smart Management</p>
                </div>
            </div>

            <div className="max-w-xl">
                <h3 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
                    Gestão <span className="text-orange-500">Elite</span> para o seu Restaurante.
                </h3>
                <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md">
                    Controle pedidos, estoque, financeiro e delivery em uma plataforma única, robusta e ultra-veloz.
                </p>
                <div className="flex gap-10 mt-12">
                    <div className="flex flex-col"><span className="text-3xl font-black italic tracking-tighter text-white leading-none">100%</span><span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">Cloud Based</span></div>
                    <div className="flex flex-col"><span className="text-3xl font-black italic tracking-tighter text-white leading-none">SEFAZ</span><span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">NFC-e Ready</span></div>
                    <div className="flex flex-col"><span className="text-3xl font-black italic tracking-tighter text-white leading-none">MULTI</span><span className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-2">Tenant Engine</span></div>
                </div>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <ShieldCheck size={16} className="text-orange-500" />
                Sistema Protegido com Criptografia de Ponta
            </div>
        </div>
      </div>

      {/* PAINEL DE FORMULÁRIO (Direita) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-8 md:p-20 relative bg-white">
        
        {/* Decorativo Mobile */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-slate-900" />

        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-right-10 duration-700">
            
            <div className="mb-12 flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="lg:hidden w-24 h-24 bg-white rounded-3xl shadow-2xl border border-slate-100 flex items-center justify-center p-4 mb-8">
                    <img src={logoImg} alt="Kicardapio" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Acessar Painel</h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-3">Bem-vindo à nova era da sua gestão</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                    <Input 
                        label="E-mail de Acesso"
                        type="email"
                        required
                        icon={Mail}
                        placeholder="seu@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-14"
                    />
                    <div className="space-y-2">
                        <Input 
                            label="Senha Segura"
                            type="password"
                            required
                            icon={Lock}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="h-14"
                        />
                        <div className="flex justify-end">
                            <button type="button" className="text-[10px] font-black text-slate-400 hover:text-orange-600 uppercase tracking-widest transition-colors italic">Esqueci minha senha?</button>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button 
                        fullWidth 
                        size="lg" 
                        type="submit" 
                        isLoading={isSubmitting}
                        className="h-16 rounded-2xl shadow-2xl shadow-slate-200 uppercase italic font-black tracking-[0.2em] group"
                    >
                        {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
                        <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </form>

            <div className="mt-16 text-center lg:text-left">
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    &copy; 2026 Kicardapio System<br/>
                    Tecnologia de ponta para gastronomia.
                </p>
            </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;