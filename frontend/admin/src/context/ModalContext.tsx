import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  // Table Modal
  isTableModalOpen: boolean;
  tableToEdit: any | null;
  openTableModal: (table?: any) => void;
  closeTableModal: () => void;
  refetchTables: number;
  triggerTablesRefetch: () => void;

  // Category Modal
  isCategoryModalOpen: boolean;
  categoryToEdit: any | null;
  openCategoryModal: (category?: any) => void;
  closeCategoryModal: () => void;
  refetchCategories: number;
  triggerCategoriesRefetch: () => void;

  // Order Detail Modal
  isOrderDetailModalOpen: boolean;
  orderToView: any | null;
  openOrderDetailModal: (order: any) => void;
  closeOrderDetailModal: () => void;

  // Payment Method Modal
  isPaymentMethodModalOpen: boolean;
  paymentMethodToEdit: any | null;
  openPaymentMethodModal: (method?: any) => void;
  closePaymentMethodModal: () => void;
  refetchPaymentMethods: number;
  triggerPaymentMethodsRefetch: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTableModalOpen, setTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<any | null>(null);
  const [refetchTables, setRefetchTables] = useState(0);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [refetchCategories, setRefetchCategories] = useState(0);

  const [isOrderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<any | null>(null);

  const [isPaymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [paymentMethodToEdit, setPaymentMethodToEdit] = useState<any | null>(null);
  const [refetchPaymentMethods, setRefetchPaymentMethods] = useState(0);

  // Handlers
  const openTableModal = (table = null) => { setTableToEdit(table); setTableModalOpen(true); };
  const closeTableModal = () => { setTableModalOpen(false); setTableToEdit(null); };
  const triggerTablesRefetch = () => setRefetchTables(prev => prev + 1);

  const openCategoryModal = (category = null) => { setCategoryToEdit(category); setCategoryModalOpen(true); };
  const closeCategoryModal = () => { setCategoryModalOpen(false); setCategoryToEdit(null); };
  const triggerCategoriesRefetch = () => setRefetchCategories(prev => prev + 1);

  const openOrderDetailModal = (order: any) => { setOrderToView(order); setOrderDetailModalOpen(true); };
  const closeOrderDetailModal = () => { setOrderDetailModalOpen(false); setOrderToView(null); };

  const openPaymentMethodModal = (method = null) => { setPaymentMethodToEdit(method); setPaymentMethodModalOpen(true); };
  const closePaymentMethodModal = () => { setPaymentMethodModalOpen(false); setPaymentMethodToEdit(null); };
  const triggerPaymentMethodsRefetch = () => setRefetchPaymentMethods(prev => prev + 1);

  return (
    <ModalContext.Provider value={{
      isTableModalOpen, tableToEdit, openTableModal, closeTableModal, refetchTables, triggerTablesRefetch,
      isCategoryModalOpen, categoryToEdit, openCategoryModal, closeCategoryModal, refetchCategories, triggerCategoriesRefetch,
      isOrderDetailModalOpen, orderToView, openOrderDetailModal, closeOrderDetailModal,
      isPaymentMethodModalOpen, paymentMethodToEdit, openPaymentMethodModal, closePaymentMethodModal, refetchPaymentMethods, triggerPaymentMethodsRefetch
    }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModals must be used within a ModalProvider');
  return context;
};
