import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error, 
  fullWidth = true, 
  className = '', 
  id,
  icon: Icon,
  ...props 
}, ref) => {
  const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-black text-slate-700 mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            flex h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm 
            placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10
            disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900
            ${error ? 'border-red-500 focus:ring-red-500/10' : ''}
            ${Icon ? 'pl-12' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs font-bold text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
