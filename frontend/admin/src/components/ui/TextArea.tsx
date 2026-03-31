import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn(fullWidth && 'w-full', 'mb-4')}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'flex w-full rounded-xl border border-input bg-card px-4 py-3 text-sm',
          'placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-foreground resize-none',
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
});

TextArea.displayName = "TextArea";
