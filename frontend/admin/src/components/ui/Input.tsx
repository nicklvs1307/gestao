import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ElementType;
  noMargin?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  error, 
  fullWidth = true, 
  className = '', 
  id,
  icon: Icon,
  noMargin = false,
  ...props 
}, ref) => {
  const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={cn(fullWidth && 'w-full', !noMargin && 'mb-4')}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-foreground',
            error && 'border-destructive focus:ring-destructive/10',
            Icon && 'pl-12',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";
