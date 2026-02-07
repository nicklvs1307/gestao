import React from 'react';
import TableFormModal from './TableFormModal';
import CategoryFormModal from './CategoryFormModal';
import PromotionFormModal from './PromotionFormModal';
import OrderDetailModal from './OrderDetailModal';
import PaymentMethodFormModal from './PaymentMethodFormModal';

interface GlobalModalsProps {
  // Table Modal
  isTableModalOpen: boolean;
  closeTableModal: () => void;
  saveTableModal: () => void;
  tableToEdit: any;

  // Category Modal
  isCategoryModalOpen: boolean;
  closeCategoryModal: () => void;
  saveCategoryModal: () => void;
  categoryToEdit: any;

  // Promotion Modal
  isPromotionModalOpen: boolean;
  closePromotionModal: () => void;
  savePromotionModal: () => void;
  promotionToEdit: any;

  // Order Modal
  isOrderDetailModalOpen: boolean;
  closeOrderDetailModal: () => void;
  orderToView: any;

  // Payment Method Modal
  isPaymentMethodModalOpen: boolean;
  closePaymentMethodModal: () => void;
  savePaymentMethodModal: () => void;
  paymentMethodToEdit: any;
}

function GlobalModals({
  isTableModalOpen, closeTableModal, saveTableModal, tableToEdit,
  isCategoryModalOpen, closeCategoryModal, saveCategoryModal, categoryToEdit,
  isPromotionModalOpen, closePromotionModal, savePromotionModal, promotionToEdit,
  isOrderDetailModalOpen, closeOrderDetailModal, orderToView,
  isPaymentMethodModalOpen, closePaymentMethodModal, savePaymentMethodModal, paymentMethodToEdit
}: GlobalModalsProps) {
  return (
    <>
      <TableFormModal 
        isOpen={isTableModalOpen} 
        onClose={closeTableModal} 
        onSave={saveTableModal} 
        tableToEdit={tableToEdit} 
      />
      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onSave={saveCategoryModal}
        categoryToEdit={categoryToEdit}
      />
      <PromotionFormModal
        isOpen={isPromotionModalOpen}
        onClose={closePromotionModal}
        onSave={savePromotionModal}
        promotionToEdit={promotionToEdit}
      />
      <OrderDetailModal
        isOpen={isOrderDetailModalOpen}
        onClose={closeOrderDetailModal}
        order={orderToView}
      />
      <PaymentMethodFormModal
        isOpen={isPaymentMethodModalOpen}
        onClose={closePaymentMethodModal}
        onSave={savePaymentMethodModal}
        methodToEdit={paymentMethodToEdit}
      />
    </>
  );
}

export default GlobalModals;
