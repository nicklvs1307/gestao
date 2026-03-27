import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckoutModal } from './CheckoutModal';
import { CustomerSelectionModal } from '../../../../components/CustomerSelectionModal';
import { usePosStore } from '../../hooks/usePosStore';
import { TableSummary, PaymentMethod } from '../../../../types';

const TableDetailsModal = lazy(() => import('./TableDetailsModal').then(module => ({ default: module.TableDetailsModal })));
const TablePaymentModal = lazy(() => import('./TablePaymentModal').then(module => ({ default: module.TablePaymentModal })));
const TableTransferModal = lazy(() => import('./TableTransferModal').then(module => ({ default: module.TableTransferModal })));
const CashierOpenModal = lazy(() => import('./CashierOpenModal').then(module => ({ default: module.CashierOpenModal })));

const ModalSkeleton = () => null;

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
      {activeModal === 'table_details' && (
        <Suspense fallback={<ModalSkeleton />}>
          <TableDetailsModal 
            viewingTable={viewingTable} 
            setViewingTable={setViewingTable} 
            onRefreshTables={onRefreshTables} 
          />
        </Suspense>
      )}
      
      {activeModal === 'pos_checkout' && (
        <CheckoutModal 
          paymentMethods={paymentMethods} 
          onSubmitOrder={onSubmitOrder} 
        />
      )}

      {activeModal === 'table_payment' && (
        <Suspense fallback={<ModalSkeleton />}>
          <TablePaymentModal 
            viewingTable={viewingTable} 
            paymentMethods={paymentMethods} 
            onCheckout={onCheckoutTable} 
          />
        </Suspense>
      )}

      {activeModal === 'transfer_table' && (
        <Suspense fallback={<ModalSkeleton />}>
          <TableTransferModal 
            viewingTable={viewingTable} 
            onTransferTable={onTransferTable} 
          />
        </Suspense>
      )}

      {activeModal === 'cashier_open' && (
        <Suspense fallback={<ModalSkeleton />}>
          <CashierOpenModal 
            onOpenCashier={onOpenCashier} 
          />
        </Suspense>
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
