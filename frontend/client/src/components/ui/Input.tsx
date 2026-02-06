import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  fullWidth = true, 
  className = '', 
  id,
  ...props 
}) => {
  const inputId = id || props.name || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white 
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10
          disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900
          ${error ? 'border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-bold text-red-500 animate-pulse">{error}</p>
      )}
    </div>
  );
};
