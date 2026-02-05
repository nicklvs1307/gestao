import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (data: any) => {
    setError('');
    try {
      const { token, user } = await login(data);
      authLogin(token, user);
      
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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      {/* Imagem de Fundo com Overlay Sólido */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop")',
        }}
      />
      <div className="absolute inset-0 z-1 bg-slate-950/80 backdrop-blur-sm" />

      {/* Container Central - Design Sólido e Moderno */}
      <div className="relative z-10 w-full max-w-[420px] mx-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[2rem] p-10 shadow-2xl flex flex-col items-center border border-slate-200">
          
          {/* Logo Branding */}
          <div className="mb-10 flex flex-col items-center">
            <div className="w-32 h-32 flex items-center justify-center mb-4">
                <img 
                  src={logoImg} 
                  alt="Kicardapio" 
                  className="w-full h-full object-contain drop-shadow-md"
                />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                KICARDÁPIO
              </h1>
              <p className="text-slate-500 text-sm font-medium">Gestão Inteligente de Pedidos</p>
            </div>
            <div className="w-16 h-1 bg-orange-500 mt-4 rounded-full" />
          </div>

          <div className="w-full">
            <AuthForm onSubmit={handleSubmit} error={error} />
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">
                &copy; 2026 Kicardapio. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
