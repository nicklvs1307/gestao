import React, { useState } from 'react';
import { IMaskInput } from 'react-imask';
import './DeliveryForm.css';

interface DeliveryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deliveryInfo: { name: string; phone: string; address: string }) => void;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    onSubmit({ name, phone, address });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="delivery-form-overlay">
      <div className="delivery-form-container">
        <div className="delivery-form-header">
          <h2>Informações de Entrega</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="delivery-form">
          <div className="form-group">
            <label htmlFor="name">Nome</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome completo"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Telefone (WhatsApp)</label>
            <IMaskInput
              mask="(00) 00000-0000"
              id="phone"
              value={phone}
              onAccept={(value) => setPhone(value)}
              placeholder="(XX) XXXXX-XXXX"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">Endereço de Entrega</label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, Número, Bairro, Cidade"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
            <button type="submit" className="btn-submit">Confirmar Pedido</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryForm;