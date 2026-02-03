import React from 'react';
import type { LocalCartItem } from '../types';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: LocalCartItem[];
  total: number;
  deliveryInfo: {
    name: string;
    phone: string;
    address: string;
    deliveryType: 'delivery' | 'pickup';
    paymentMethod: 'dinheiro' | 'cartao';
    changeFor?: string;
  } | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, items, total, deliveryInfo }) => {
  if (!isOpen || !deliveryInfo) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Confirme seu Pedido</h2>
        </div>
        <div className="modal-body">
          <div className="order-summary">
            <h3>Resumo do Pedido</h3>
            <div className="order-items">
              {items.map(item => (
                <div key={item.localId} className="order-item">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span>R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
            <div className="order-total">
              <strong>Total:</strong>
              <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
            </div>
            <hr />
            <h4>Detalhes da Entrega</h4>
            <p><strong>Nome:</strong> {deliveryInfo.name}</p>
            <p><strong>Telefone:</strong> {deliveryInfo.phone}</p>
            <p><strong>Endereço:</strong> {deliveryInfo.address}</p>
            <p><strong>Forma de Pagamento:</strong> {deliveryInfo.paymentMethod}</p>
            {deliveryInfo.paymentMethod === 'dinheiro' && deliveryInfo.changeFor && <p><strong>Troco para:</strong> R$ {deliveryInfo.changeFor}</p>}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Voltar</button>
          <button onClick={onConfirm} className="btn-primary">Confirmar Pedido</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;