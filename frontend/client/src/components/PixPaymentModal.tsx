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
    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm flex justify-center items-center z-[var(--z-toast)]">
      <div className="bg-card p-8 rounded-3xl shadow-2xl w-[90%] max-w-[450px] relative flex flex-col items-center text-center">
        <button className="absolute top-4 right-4 bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors p-1" onClick={onClose}>
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-primary mb-4">Pagamento via PIX</h2>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-10 text-primary">
            <Loader2 size={48} className="animate-spin" />
            <p className="text-sm text-muted-foreground">Aguardando confirmação do pagamento...</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-5 text-sm">Escaneie o QR Code ou use o código Copia e Cola para pagar.</p>
            
            <div className="w-[220px] h-[220px] border-2 border-primary rounded-xl flex justify-center items-center mb-5 bg-white p-2.5">
              {qrCodeImage ? (
                <img src={qrCodeImage} alt="QR Code PIX" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-muted-foreground text-sm">QR Code indisponível</div>
              )}
            </div>

            <div className="w-full mb-6">
              <p className="font-bold text-foreground mb-2.5 text-sm">PIX Copia e Cola:</p>
              <div className="flex border border-border rounded-xl overflow-hidden">
                <input type="text" value={pixCopiaECola} readOnly className="flex-1 border-none px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none" />
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
