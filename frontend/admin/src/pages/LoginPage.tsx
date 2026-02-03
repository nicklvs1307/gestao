import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed } from 'lucide-react';

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
    <div className="min-h-screen w-full flex bg-background">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5 border-r border-border">
         <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
         <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-8 p-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                <UtensilsCrossed size={64} className="text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Gestão Inteligente</h1>
            <p className="text-lg text-muted-foreground max-w-sm">
              Gerencie seus pedidos, produtos e clientes em um único lugar com eficiência e simplicidade.
            </p>
         </div>
      </div>

      {/* Lado Direito - Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px] space-y-6">
           <AuthForm onSubmit={handleSubmit} error={error} />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;