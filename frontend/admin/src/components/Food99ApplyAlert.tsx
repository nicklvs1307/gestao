import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleFood99CancelApply, handleFood99RefundApply } from '../services/api/integrations';
import { ModalPortal } from './ui/ModalPortal';

interface Food99ApplyAlertProps {
  isOpen: boolean;
  type: 'cancel' | 'refund';
  orderId: number;
  applyId: number;
  reason?: string;
  onClose: () => void;
  onResolved: () => void;
}

const Food99ApplyAlert: React.FC<Food99ApplyAlertProps> = ({
  isOpen,
  type,
  orderId,
  applyId,
  reason,
  onClose,
  onResolved,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      if (type === 'cancel') {
        await handleFood99CancelApply(orderId, applyId, true);
      } else {
        await handleFood99RefundApply(orderId, applyId, true);
      }
      toast.success(type === 'cancel' ? 'Cancelamento aceito!' : 'Reembolso aprovado!');
      onResolved();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao processar solicitação');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const rejectReason = type === 'cancel' ? 'Pedido já em preparo' : 'Itens entregues conforme pedido';
      if (type === 'cancel') {
        await handleFood99CancelApply(orderId, applyId, false, rejectReason);
      } else {
        await handleFood99RefundApply(orderId, applyId, false, rejectReason);
      }
      toast.success(type === 'cancel' ? 'Cancelamento recusado!' : 'Reembolso recusado!');
      onResolved();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao processar solicitação');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase">
                  {type === 'cancel' ? 'Solicitação de Cancelamento' : 'Solicitação de Reembolso'}
                </h3>
                <p className="text-amber-100 text-sm">99Food - Pedido #{orderId}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-bold">Motivo:</span> {reason || 'Não informado'}
              </p>
            </div>

            <p className="text-sm text-slate-600">
              O cliente está solicitando {type === 'cancel' ? 'o cancelamento' : 'o reembolso'} deste pedido.
              Como deseja proceder?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-black text-sm uppercase tracking-wider transition-all hover:bg-red-100 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Recusar
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-600 font-black text-sm uppercase tracking-wider transition-all hover:bg-emerald-100 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Aceitar
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default Food99ApplyAlert;
