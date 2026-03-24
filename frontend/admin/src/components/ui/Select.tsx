import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  options,
  placeholder,
  ...props
}, ref) => {
  const inputId = id || props.name || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-black text-slate-700 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={`
            flex h-12 w-full appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 pr-10 text-sm
            focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10
            disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900
            ${error ? 'border-red-500 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <p className="mt-1 text-xs font-bold text-red-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = "Select";
