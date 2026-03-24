import React, { forwardRef } from 'react';

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
    <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-black text-slate-700 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={`
          flex w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm
          placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10
          disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900 resize-none
          ${error ? 'border-red-500 focus:ring-red-500/10' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-bold text-red-500">{error}</p>
      )}
    </div>
  );
});

TextArea.displayName = "TextArea";
