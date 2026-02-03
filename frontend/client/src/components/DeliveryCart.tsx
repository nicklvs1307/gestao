import React from 'react';
import type { LocalCartItem } from '../types';

interface DeliveryCartProps {
  items: LocalCartItem[];
  total: number;
  onRemoveItem: (localId: number) => void;
  onUpdateItemQuantity: (localId: number, newQuantity: number) => void;
}

const DeliveryCart: React.FC<DeliveryCartProps> = ({ items, total, onRemoveItem, onUpdateItemQuantity }) => {
  return (
    <div className="delivery-cart">
      <h2>Seu Pedido</h2>
      <div className="cart-items">
        {items.length === 0 ? (
          <p>Seu carrinho está vazio.</p>
        ) : (
          items.map(item => (
            <div key={item.localId} className="cart-item">
              <div className="item-info">
                <span className="item-name">{item.product.name}</span>
                <span className="item-price">R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="item-quantity">
                <button onClick={() => onUpdateItemQuantity(item.localId, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => onUpdateItemQuantity(item.localId, item.quantity + 1)}>+</button>
              </div>
              <button onClick={() => onRemoveItem(item.localId)} className="remove-item-btn">&times;</button>
            </div>
          ))
        )}
      </div>
      <div className="cart-total">
        <span>Total:</span>
        <span>R$ {total.toFixed(2).replace('.', ',')}</span>
      </div>
    </div>
  );
};

export default DeliveryCart;
