import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Carregando...' }) => {
  return (
    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
      <Loader2 className="animate-spin text-orange-500" size={40} />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{message}</p>
    </div>
  );
};
