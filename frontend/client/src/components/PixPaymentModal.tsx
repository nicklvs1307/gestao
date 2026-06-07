import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Loader2, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeBase64: string;
  pixPayload: string;
  amount: number;
  expiresAt: string;
  onPaymentConfirmed: () => void;
  onCancelPayment: () => void;
  isLoading: boolean;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  qrCodeBase64,
  pixPayload,
  amount,
  expiresAt,
  onPaymentConfirmed,
  onCancelPayment,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<'waiting' | 'confirmed' | 'expired'>('waiting');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = Math.max(0, expires - now);
      setTimeLeft(diff);

      if (diff === 0) {
        setStatus('expired');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, expiresAt]);

  useEffect(() => {
    if (!isOpen) {
      setStatus('waiting');
      setTimeLeft(0);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[var(--z-modal)] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-1"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-black">PIX</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Pagamento via PIX</h2>
          <p className="text-blue-100 text-sm mt-1">Escaneie o QR Code para pagar</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-sm text-slate-500 font-medium">Gerando QR Code...</p>
            </div>
          ) : status === 'expired' ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">QR Code Expirado</p>
                <p className="text-sm text-slate-500 mt-1">Gere um novo código para continuar</p>
              </div>
              <button
                onClick={onCancelPayment}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Gerar Novo Código
              </button>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="w-[220px] h-[220px] border-2 border-slate-100 rounded-2xl flex justify-center items-center bg-white p-3 shadow-inner">
                  {qrCodeBase64 ? (
                    <img
                      src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-400 text-sm text-center">QR Code indisponível</div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Valor a pagar</p>
                <p className="text-3xl font-black text-slate-900">
                  R$ {amount.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 rounded-xl">
                <Clock size={16} className={timeLeft < 300000 ? 'text-red-500' : 'text-slate-400'} />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Expira em</span>
                <span className={`font-mono text-lg font-black ${timeLeft < 300000 ? 'text-red-500' : 'text-slate-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Copia e Cola */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">PIX Copia e Cola</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixPayload}
                    readOnly
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-600 bg-slate-50 font-mono truncate focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Código PIX Copia e Cola"
                  />
                  <button
                    onClick={handleCopyPix}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      copied
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Como pagar:</p>
                <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
                  <li>Abra o aplicativo do seu banco</li>
                  <li>Escolha a opção <strong>Pagar com PIX</strong></li>
                  <li>Escaneie o QR Code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              {/* Aguardando Pagamento */}
              <div className="flex items-center justify-center gap-2 py-3 bg-amber-50 rounded-xl border border-amber-100">
                <Loader2 size={16} className="animate-spin text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Aguardando confirmação do pagamento...
                </span>
              </div>

              {/* Botão Cancelar */}
              <button
                onClick={onCancelPayment}
                className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar Pedido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixPaymentModal;
