import React from 'react';
import type { Order } from '../types';
import { useRestaurant } from '../context/RestaurantContext';

// QR Code estático como placeholder
const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://google.com';

interface ThankYouModalProps {
  isOpen: boolean;
  logoUrl?: string | null;
  order: Order | null;
}

const ThankYouModal: React.FC<ThankYouModalProps> = ({ isOpen, logoUrl, order }) => {
  const { restaurantSettings } = useRestaurant();
  
  // Lógica de cálculo de preço
  const subtotal = order?.total || 0;
  const serviceTaxPercentage = restaurantSettings?.serviceTax ?? 10;
  const serviceFee = subtotal * (serviceTaxPercentage / 100);
  const total = subtotal + serviceFee;

  return (
    <div className={`locked-screen-overlay ${isOpen ? 'open' : ''}`}>
      {order && (
        <div className="locked-screen-card">
          <div className="locked-screen-left">
            {logoUrl && <img src={logoUrl} alt="Logo" className="locked-screen-logo" />}
            <h3>Avalie sua Experiência</h3>
            <p>Sua opinião é muito importante para nós!</p>
            <img src={qrCodeUrl} alt="QR Code para avaliação" className="locked-screen-qrcode" />
          </div>
          <div className="locked-screen-right">
            <h1>Conta Solicitada</h1>
            <p className="subtitle">Em instantes, um de nossos atendentes irá até sua mesa com a conta para finalizar o pagamento.</p>
            
            <div className="locked-screen-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="summary-row">
                <span>Taxa de Serviço ({serviceTaxPercentage}%)</span>
                <span>R$ {serviceFee.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="summary-row total">
                <span>Total a Pagar</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <p className="footer-locked-message">Esta tela será liberada pelo caixa após o pagamento.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThankYouModal;
