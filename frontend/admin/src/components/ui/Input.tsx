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
  const inputId = id || props.name || Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            flex h-14 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm 
            placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10
            disabled:cursor-not-allowed disabled:opacity-50 transition-all font-black text-slate-900 italic uppercase tracking-wide
            ${error ? 'border-red-500 focus:ring-red-500/10 bg-red-50' : ''}
            ${Icon ? 'pl-12' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-widest pl-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
