import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] h-[85vh]',
  };

  return (
    <div className={cn('fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4')}>
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-card text-card-foreground rounded-2xl shadow-2xl border border-border w-full',
        sizes[size],
        'animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
