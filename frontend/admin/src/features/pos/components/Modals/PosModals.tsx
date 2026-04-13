import React from 'react';
import { CheckoutModal } from './CheckoutModal';
import { CashierOpenModal } from './CashierOpenModal';
import { CustomerSelectionModal } from '../../../../components/CustomerSelectionModal';
import { usePosStore } from '../../hooks/usePosStore';
import { PaymentMethod } from '../../../../types';

interface PosModalsProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
  onOpenCashier: (amount: string) => void;
  customerAddresses: string[];
  handleSelectCustomer: (data: any) => void;
  handleSelectCounterCustomer?: (data: any) => void;
}

export const PosModals: React.FC<PosModalsProps> = ({
  paymentMethods, onSubmitOrder, onOpenCashier,
  customerAddresses, handleSelectCustomer, handleSelectCounterCustomer
}) => {
  const { activeModal, setActiveModal } = usePosStore();

  if (activeModal === 'none') return null;

  if (activeModal === 'pos_checkout') {
    return (
      <CheckoutModal 
        paymentMethods={paymentMethods} 
        onSubmitOrder={onSubmitOrder} 
      />
    );
  }

  if (activeModal === 'cashier_open') {
    return (
      <CashierOpenModal 
        onOpenCashier={onOpenCashier} 
      />
    );
  }

  if (activeModal === 'delivery_info') {
    return (
      <CustomerSelectionModal 
        isOpen={true}
        isDeliveryMode={true}
        onClose={() => setActiveModal('none')} 
        onSelectCustomer={(data) => {
          handleSelectCustomer({
            name: data.name,
            phone: data.phone,
            address: data.addressStr,
            complement: data.addressStructured?.complement,
            reference: data.addressStructured?.reference
          });
          setActiveModal('none');
        }}
      />
    );
  }

  if (activeModal === 'counter_customer') {
    return (
      <CustomerSelectionModal 
        isOpen={true}
        isDeliveryMode={false}
        onClose={() => setActiveModal('none')} 
        onSelectCustomer={(data) => {
          if (handleSelectCounterCustomer) {
            handleSelectCounterCustomer({
              name: data.name,
              phone: data.phone,
              address: data.addressStr,
              complement: data.addressStructured?.complement,
              reference: data.addressStructured?.reference,
              deliveryType: data.deliveryType
            });
          }
          setActiveModal('none');
        }}
      />
    );
  }

  return null;
};
