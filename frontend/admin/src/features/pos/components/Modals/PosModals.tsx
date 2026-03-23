import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { TableDetailsModal } from './TableDetailsModal';
import { CheckoutModal } from './CheckoutModal';
import { CashierOpenModal } from './CashierOpenModal';
import { TablePaymentModal } from './TablePaymentModal';
import { TableTransferModal } from './TableTransferModal';
import { CustomerSelectionModal } from '../../../../components/CustomerSelectionModal';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary, PaymentMethod } from '../../../../types';

interface PosModalsProps {
  viewingTable: TableSummary | null;
  setViewingTable: (table: TableSummary | null) => void;
  onRefreshTables: () => void;
  paymentMethods: PaymentMethod[];
  onSubmitOrder: () => void;
  onCheckoutTable: (data: any) => void;
  onTransferTable: (newNumber: number) => void;
  onOpenCashier: (amount: string) => void;
  customerAddresses: string[];
  handleSelectCustomer: (customer: any) => void;
}

export const PosModals: React.FC<PosModalsProps> = ({
  viewingTable, setViewingTable, onRefreshTables,
  paymentMethods, onSubmitOrder, onCheckoutTable, onTransferTable, onOpenCashier,
  customerAddresses, handleSelectCustomer
}) => {
  const { activeModal, setActiveModal } = usePosStore();

  return (
    <AnimatePresence>
      <TableDetailsModal 
        viewingTable={viewingTable} 
        setViewingTable={setViewingTable} 
        onRefreshTables={onRefreshTables} 
      />
      
      <CheckoutModal 
        paymentMethods={paymentMethods} 
        onSubmitOrder={onSubmitOrder} 
      />

      <TablePaymentModal 
        viewingTable={viewingTable} 
        paymentMethods={paymentMethods} 
        onCheckout={onCheckoutTable} 
      />

      <TableTransferModal 
        viewingTable={viewingTable} 
        onTransferTable={onTransferTable} 
      />

      <CashierOpenModal 
        onOpenCashier={onOpenCashier} 
      />

      {activeModal === 'delivery_info' && (
        <CustomerSelectionModal 
          onClose={() => setActiveModal('none')} 
          onSelect={handleSelectCustomer}
          availableAddresses={customerAddresses}
        />
      )}
    </AnimatePresence>
  );
};
