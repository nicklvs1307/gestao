import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
}) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 size={24} className="text-destructive" />,
    warning: <AlertTriangle size={24} className="text-warning" />,
    info: <Info size={24} className="text-info" />,
  };

  const iconBgs = {
    danger: 'bg-destructive/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const,
  };

  return (
    <div className="fixed inset-0 z-[var(--z-toast)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-card text-card-foreground rounded-2xl shadow-2xl border border-border w-full max-w-sm',
        'animate-in fade-in zoom-in-95 duration-200'
      )}>
        <div className="p-6 text-center space-y-4">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto', iconBgs[variant])}>
            {icons[variant]}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground font-medium mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariants[variant]} fullWidth onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
