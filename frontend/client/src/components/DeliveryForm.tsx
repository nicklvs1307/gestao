import React, { useState } from 'react';
import { IMaskInput } from 'react-imask';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
      return;
    }
    onSubmit({ name, phone, address });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-foreground/60 flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-card p-6 rounded-2xl shadow-2xl w-[90%] max-w-[500px]">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Informações de Entrega</h2>
          <button onClick={onClose} className="bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors p-1">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Nome"
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome completo"
            required
          />
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">Telefone (WhatsApp)</label>
            <IMaskInput
              mask="(00) 00000-0000"
              id="phone"
              value={phone}
              onAccept={(value) => setPhone(value as string)}
              placeholder="(XX) XXXXX-XXXX"
              required
              className="flex h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-foreground"
            />
          </div>
          <Input
            label="Endereço de Entrega"
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, Número, Bairro, Cidade"
            required
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Confirmar Pedido</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryForm;
