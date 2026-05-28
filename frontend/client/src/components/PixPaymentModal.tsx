import React from 'react';
import { X, Copy, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { toast } from 'sonner';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeImage: string;
  pixCopiaECola: string;
  onPaymentConfirmed: () => void;
  onCancelPayment: () => void;
  isLoading: boolean;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  qrCodeImage,
  pixCopiaECola,
  onPaymentConfirmed,
  onCancelPayment,
  isLoading,
}) => {
  if (!isOpen) return null;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCopiaECola);
    toast.success('Código PIX copiado!');
  };

  return (
    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm flex justify-center items-center z-[var(--z-modal)]">
      <div className="bg-card p-6 rounded-2xl shadow-2xl w-[90%] max-w-[400px] relative flex flex-col items-center text-center">
        <button className="absolute top-3 right-3 bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-primary mb-3">Pagamento via PIX</h2>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-8 text-primary">
            <Loader2 size={36} className="animate-spin" />
            <p className="text-sm text-muted-foreground">Aguardando confirmação do pagamento...</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4 text-sm">Escaneie o QR Code ou use o código Copia e Cola para pagar.</p>
            
            <div className="w-[200px] h-[200px] border border-slate-200 rounded-lg flex justify-center items-center mb-4 bg-white p-2 shadow-sm">
              {qrCodeImage ? (
                <img src={qrCodeImage} alt="QR Code PIX" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-muted-foreground text-sm">QR Code indisponível</div>
              )}
            </div>

            <div className="w-full mb-5">
              <p className="font-bold text-foreground mb-2 text-sm">PIX Copia e Cola:</p>
              <div className="flex border border-border rounded-lg overflow-hidden">
                <input type="text" value={pixCopiaECola} readOnly className="flex-1 border-none px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none" aria-label="Código PIX Copia e Cola" />
                <button className="bg-primary text-primary-foreground border-none px-4 cursor-pointer text-sm font-bold transition-colors hover:brightness-110 flex items-center gap-1.5" onClick={handleCopyPix}>
                  <Copy size={14} /> Copiar
                </button>
              </div>
            </div>

            <div className="flex gap-4 w-full justify-center">
              <Button variant="outline" onClick={onCancelPayment}>Cancelar Pedido</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PixPaymentModal;
