import React from 'react';
import { useModals } from '../context/ModalContext';
import TableFormModal from './TableFormModal';
import CategoryFormModal from './CategoryFormModal';
import OrderDetailModal from './OrderDetailModal';
import PaymentMethodFormModal from './PaymentMethodFormModal';

const GlobalModals: React.FC = () => {
  const {
    isTableModalOpen, tableToEdit, closeTableModal, triggerTablesRefetch,
    isCategoryModalOpen, categoryToEdit, closeCategoryModal, triggerCategoriesRefetch,
    isOrderDetailModalOpen, orderToView, closeOrderDetailModal,
    isPaymentMethodModalOpen, paymentMethodToEdit, closePaymentMethodModal, triggerPaymentMethodsRefetch
  } = useModals();

  return (
    <>
      {isTableModalOpen && (
        <TableFormModal
          isOpen={isTableModalOpen}
          onClose={closeTableModal}
          table={tableToEdit}
          onSave={triggerTablesRefetch}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryFormModal
          isOpen={isCategoryModalOpen}
          onClose={closeCategoryModal}
          category={categoryToEdit}
          onSave={triggerCategoriesRefetch}
        />
      )}

      {isOrderDetailModalOpen && (
        <OrderDetailModal
          isOpen={isOrderDetailModalOpen}
          onClose={closeOrderDetailModal}
          order={orderToView}
        />
      )}

      {isPaymentMethodModalOpen && (
        <PaymentMethodFormModal
          isOpen={isPaymentMethodModalOpen}
          onClose={closePaymentMethodModal}
          methodToEdit={paymentMethodToEdit}
          onSave={triggerPaymentMethodsRefetch}
        />
      )}
    </>
  );
};

export default GlobalModals;
