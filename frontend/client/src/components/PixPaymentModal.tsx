import React from 'react';
import './PixPaymentModal.css';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeImage: string; // URL ou base64 do QR Code
  pixCopiaECola: string;
  onPaymentConfirmed: () => void; // Callback quando o pagamento for confirmado
  onCancelPayment: () => void; // Callback para cancelar o pagamento
  isLoading: boolean; // Indica se está aguardando a confirmação do pagamento
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
    alert('Código PIX copiado!');
  };

  return (
    <div className="pix-modal-overlay">
      <div className="pix-modal-content">
        <button className="pix-modal-close" onClick={onClose}>&times;</button>
        <h2 className="pix-modal-title">Pagamento via PIX</h2>

        {isLoading ? (
          <div className="pix-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Aguardando confirmação do pagamento...</p>
          </div>
        ) : (
          <>
            <p className="pix-modal-description">Escaneie o QR Code ou use o código Copia e Cola para pagar.</p>
            
            <div className="pix-qr-code-container">
              {qrCodeImage ? (
                <img src={qrCodeImage} alt="QR Code PIX" className="pix-qr-code" />
              ) : (
                <div className="pix-qr-code-placeholder">QR Code indisponível</div>
              )}
            </div>

            <div className="pix-copy-paste-container">
              <p className="pix-copy-paste-label">PIX Copia e Cola:</p>
              <div className="pix-copy-paste-box">
                <input type="text" value={pixCopiaECola} readOnly className="pix-copy-paste-input" />
                <button className="pix-copy-paste-btn" onClick={handleCopyPix}>
                  <i className="fas fa-copy"></i> Copiar
                </button>
              </div>
            </div>

            <div className="pix-modal-actions">
              <button className="btn-cancel" onClick={onCancelPayment}>Cancelar Pedido</button>
              {/* O botão de confirmação manual pode ser removido em produção, pois a confirmação deve vir do webhook */}
              {/* <button className="btn-confirm" onClick={onPaymentConfirmed}>Confirmar Pagamento (Dev)</button> */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PixPaymentModal;
