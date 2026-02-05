import React, { useState } from 'react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthFormProps {
  isRegister?: boolean;
  onSubmit: (data: any) => void;
  error: string;
  success?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ isRegister, onSubmit, error, success }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const dataToSubmit: any = { email, password };
    if (isRegister) {
      dataToSubmit.name = name;
    }
    // Simula delay para feedback visual (opcional) ou aguarda promessa real se fosse passada
    await onSubmit(dataToSubmit);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {isRegister && (
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-slate-700 ml-1">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="name"
                type="text"
                required
                className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pl-10 py-2 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:opacity-50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">E-mail de Acesso</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="email"
              type="email"
              required
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pl-10 py-2 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@kicardapio.com"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="password"
              type="password"
              required
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pl-10 py-2 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1 text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 rounded-xl bg-green-50 text-green-600 text-xs font-bold border border-green-100 animate-in fade-in slide-in-from-top-1 text-center">
            {success}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className="flex items-center justify-center w-full h-12 rounded-xl text-sm font-bold transition-all bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span>{isRegister ? 'Criar Minha Conta' : 'Acessar Painel'}</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
