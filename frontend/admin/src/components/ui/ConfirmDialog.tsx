import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Button } from './Button';

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
  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 size={24} className="text-red-500" />,
    warning: <AlertTriangle size={24} className="text-amber-500" />,
    info: <Info size={24} className="text-blue-500" />,
  };

  const iconBgs = {
    danger: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-blue-50',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const,
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className={`w-14 h-14 ${iconBgs[variant]} rounded-2xl flex items-center justify-center mx-auto`}>
            {icons[variant]}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">{message}</p>
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
