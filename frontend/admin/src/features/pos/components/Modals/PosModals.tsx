import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckoutModal } from './CheckoutModal';
import { CashierOpenModal } from './CashierOpenModal';
import { CustomerSelectionModal } from '../../../../components/CustomerSelectionModal';
import { usePosStore } from '../../hooks/usePosStore';
import { PaymentMethod } from '../../../../types';

const ModalSkeleton = () => null;

interface PosModalsProps {
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
  onOpenCashier: (amount: string) => void;
  customerAddresses: string[];
  handleSelectCustomer: (customer: any) => void;
}

export const PosModals: React.FC<PosModalsProps> = ({
  paymentMethods, onSubmitOrder, onOpenCashier,
  customerAddresses, handleSelectCustomer
}) => {
  const { activeModal, setActiveModal } = usePosStore();

  return (
    <AnimatePresence>
      {activeModal === 'pos_checkout' && (
        <CheckoutModal 
          paymentMethods={paymentMethods} 
          onSubmitOrder={onSubmitOrder} 
        />
      )}

      {activeModal === 'cashier_open' && (
        <CashierOpenModal 
          onOpenCashier={onOpenCashier} 
        />
      )}

      {activeModal === 'delivery_info' && (
        <CustomerSelectionModal 
          isOpen={true}
          onClose={() => setActiveModal('none')} 
          onSelectCustomer={(data) => {
            handleSelectCustomer({
              name: data.name,
              phone: data.phone,
              address: data.addressStr
            });
            setActiveModal('none');
          }}
        />
      )}
    </AnimatePresence>
  );
};
