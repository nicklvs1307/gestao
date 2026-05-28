import React from 'react';
import { cn } from '../../lib/utils';

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
    <div className={cn(fullWidth && 'w-full', 'mb-4')}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'flex h-11 w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 font-medium text-foreground',
          error && 'border-destructive focus:ring-destructive/10',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  );
};
