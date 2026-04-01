import React from 'react';
import { useModals } from '../context/ModalContext';
import TableFormModal from './TableFormModal';
import CategoryFormModal from './CategoryFormModal';
import PaymentMethodFormModal from './PaymentMethodFormModal';

const GlobalModals: React.FC = () => {
  const {
    isTableModalOpen, tableToEdit, closeTableModal, triggerTablesRefetch,
    isCategoryModalOpen, categoryToEdit, closeCategoryModal, triggerCategoriesRefetch,
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
          categoryToEdit={categoryToEdit}
          onSave={triggerCategoriesRefetch}
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
