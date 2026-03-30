import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Token de redefinição inválido ou ausente.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setIsSuccess(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-transparent z-10" />
        <div className="relative z-20 w-full h-full p-20 flex flex-col justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-2xl">
              <img src={logoImg} alt="Kicardapio" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Kicardapio</h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mt-1">Smart Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {isSuccess ? (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Senha Redefinida</h2>
                <p className="text-sm text-slate-500">Sua senha foi alterada com sucesso. Você já pode fazer login com a nova senha.</p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-14 rounded-2xl shadow-xl uppercase tracking-widest font-black text-xs gap-2"
              >
                IR PARA LOGIN <ArrowLeft size={16} />
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto">
                <Lock size={40} className="text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Link Inválido</h2>
                <p className="text-sm text-slate-500">Este link de redefinição é inválido ou está ausente. Solicite um novo link de redefinição.</p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-14 rounded-2xl shadow-xl uppercase tracking-widest font-black text-xs gap-2"
              >
                VOLTAR AO LOGIN <ArrowLeft size={16} />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Redefinir Senha</h2>
                <p className="text-sm text-slate-500">Escolha uma nova senha para acessar o sistema.</p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Nova Senha"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full h-14 rounded-2xl shadow-xl uppercase tracking-widest font-black text-xs"
              >
                REDEFINIR SENHA
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
