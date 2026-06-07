import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ModalPortal } from './ModalPortal';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  maxWidth?: string;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  maxWidth,
  footer,
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',      // 384px — Confirms
    md: 'max-w-md',      // 448px — Compact forms
    lg: 'max-w-lg',      // 512px — Complex forms
    xl: 'max-w-2xl',     // 672px — Tables/data
    full: 'max-w-[85vw] h-[85vh]',  // Full-view
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className={cn('fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4')}>
        <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
        <div className={cn(
          'relative bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full',
          maxWidth || sizes[size],
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
    </ModalPortal>
  );
};
