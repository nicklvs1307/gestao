import React from 'react';
import type { LocalCartItem } from '../types';
import { Button } from './ui/Button';

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
    <div className="fixed inset-0 bg-foreground/70 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)]">
      <div className="bg-card p-8 rounded-2xl w-[90%] max-w-[500px] shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Confirme seu Pedido</h2>
        </div>
        <div className="mb-6">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3 uppercase tracking-wide">Resumo do Pedido</h3>
          <div className="space-y-2 mt-3">
            {items.map(item => (
              <div key={item.localId} className="flex justify-between text-sm">
                <span className="text-foreground">{item.quantity}x {item.product.name}</span>
                <span className="font-semibold text-foreground">R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t border-border">
            <span className="text-foreground">Total:</span>
            <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
          <hr className="my-4 border-border" />
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Detalhes da Entrega</h4>
          <div className="space-y-1.5 text-sm text-foreground">
            <p><strong>Nome:</strong> {deliveryInfo.name}</p>
            <p><strong>Telefone:</strong> {deliveryInfo.phone}</p>
            <p><strong>Endereço:</strong> {deliveryInfo.address}</p>
            <p><strong>Forma de Pagamento:</strong> {deliveryInfo.paymentMethod}</p>
            {deliveryInfo.paymentMethod === 'dinheiro' && deliveryInfo.changeFor && <p><strong>Troco para:</strong> R$ {deliveryInfo.changeFor}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button variant="success" onClick={onConfirm}>Confirmar Pedido</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
