import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mail, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Email é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setIsSuccess(true);
      toast.success('Se o email estiver cadastrado, você receberá um link de redefinição.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao processar solicitação.');
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
                <h2 className="text-3xl font-black uppercase tracking-tighter">Email Enviado</h2>
                <p className="text-sm text-slate-500">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
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
                <h2 className="text-3xl font-black uppercase tracking-tighter">Esqueci a Senha</h2>
                <p className="text-sm text-slate-500">Informe seu email para receber um link de redefinição.</p>
              </div>

              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full h-14 rounded-2xl shadow-xl uppercase tracking-widest font-black text-xs"
              >
                ENVIAR LINK
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/login')}
                className="w-full h-14 rounded-2xl uppercase tracking-widest font-black text-xs gap-2"
              >
                VOLTAR AO LOGIN <ArrowLeft size={16} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
