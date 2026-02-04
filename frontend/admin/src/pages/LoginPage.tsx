import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, ChefHat } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (data: any) => {
    setError('');
    try {
      const { token, user } = await login(data);
      authLogin(token, user);
      
      // Redirecionamento Inteligente
      if (user.role === 'waiter') {
          navigate('/waiter');
      } else {
          navigate('/dashboard');
      }
    } catch (err) {
      setError('Credenciais inválidas. Por favor, tente novamente.');
      console.error('Erro de login:', err);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Imagem de Fundo Imersiva */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop")',
          filter: 'brightness(0.3) saturate(1.2)'
        }}
      />

      {/* Camada de Overlay Gradiente */}
      <div className="absolute inset-0 z-1 bg-gradient-to-br from-black/80 via-black/40 to-black/80" />

      {/* Container Central (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 mx-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
          
          {/* Logo e Branding */}
          <div className="mb-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-gold rounded-3xl flex items-center justify-center shadow-lg shadow-gold/20 transform -rotate-6 group transition-transform hover:rotate-0">
                <ChefHat size={40} className="text-black" />
            </div>
            <h1 className="text-3xl font-black text-white mt-6 italic tracking-tight">
                CARDÁPIO<span className="text-gold">TABLET</span>
            </h1>
            <div className="w-12 h-1 bg-gold mt-2 rounded-full opacity-50" />
          </div>

          <div className="w-full">
            <AuthForm onSubmit={handleSubmit} error={error} />
          </div>

          {/* Footer do Login */}
          <div className="mt-8 text-center">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                Sistema de Gestão Profissional v2.5
            </p>
          </div>
        </div>

        {/* Efeito Decorativo */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[80px]" />
      </div>
    </div>
  );
};

export default LoginPage;
