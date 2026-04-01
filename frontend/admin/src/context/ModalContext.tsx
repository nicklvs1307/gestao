import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

interface ModalContextType {
  isTableModalOpen: boolean;
  tableToEdit: unknown | null;
  openTableModal: (table?: unknown) => void;
  closeTableModal: () => void;
  refetchTables: number;
  triggerTablesRefetch: () => void;

  isCategoryModalOpen: boolean;
  categoryToEdit: unknown | null;
  openCategoryModal: (category?: unknown) => void;
  closeCategoryModal: () => void;
  refetchCategories: number;
  triggerCategoriesRefetch: () => void;

  isOrderDetailModalOpen: boolean;
  orderToView: unknown | null;
  openOrderDetailModal: (order: unknown) => void;
  closeOrderDetailModal: () => void;

  isPaymentMethodModalOpen: boolean;
  paymentMethodToEdit: unknown | null;
  openPaymentMethodModal: (method?: unknown) => void;
  closePaymentMethodModal: () => void;
  refetchPaymentMethods: number;
  triggerPaymentMethodsRefetch: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTableModalOpen, setTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<unknown | null>(null);
  const [refetchTables, setRefetchTables] = useState(0);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<unknown | null>(null);
  const [refetchCategories, setRefetchCategories] = useState(0);

  const [isOrderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<unknown | null>(null);

  const [isPaymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
  const [paymentMethodToEdit, setPaymentMethodToEdit] = useState<unknown | null>(null);
  const [refetchPaymentMethods, setRefetchPaymentMethods] = useState(0);

  const openTableModal = useCallback((table: unknown = null) => {
    setTableToEdit(table);
    setTableModalOpen(true);
  }, []);
  const closeTableModal = useCallback(() => {
    setTableModalOpen(false);
    setTableToEdit(null);
  }, []);
  const triggerTablesRefetch = useCallback(() => setRefetchTables(prev => prev + 1), []);

  const openCategoryModal = useCallback((category: unknown = null) => {
    setCategoryToEdit(category);
    setCategoryModalOpen(true);
  }, []);
  const closeCategoryModal = useCallback(() => {
    setCategoryModalOpen(false);
    setCategoryToEdit(null);
  }, []);
  const triggerCategoriesRefetch = useCallback(() => setRefetchCategories(prev => prev + 1), []);

  const openOrderDetailModal = useCallback((order: unknown) => {
    setOrderToView(order);
    setOrderDetailModalOpen(true);
  }, []);
  const closeOrderDetailModal = useCallback(() => {
    setOrderDetailModalOpen(false);
    setOrderToView(null);
  }, []);

  const openPaymentMethodModal = useCallback((method: unknown = null) => {
    setPaymentMethodToEdit(method);
    setPaymentMethodModalOpen(true);
  }, []);
  const closePaymentMethodModal = useCallback(() => {
    setPaymentMethodModalOpen(false);
    setPaymentMethodToEdit(null);
  }, []);
  const triggerPaymentMethodsRefetch = useCallback(() => setRefetchPaymentMethods(prev => prev + 1), []);

  const value = useMemo<ModalContextType>(() => ({
    isTableModalOpen, tableToEdit, openTableModal, closeTableModal, refetchTables, triggerTablesRefetch,
    isCategoryModalOpen, categoryToEdit, openCategoryModal, closeCategoryModal, refetchCategories, triggerCategoriesRefetch,
    isOrderDetailModalOpen, orderToView, openOrderDetailModal, closeOrderDetailModal,
    isPaymentMethodModalOpen, paymentMethodToEdit, openPaymentMethodModal, closePaymentMethodModal, refetchPaymentMethods, triggerPaymentMethodsRefetch,
  }), [
    isTableModalOpen, tableToEdit, openTableModal, closeTableModal, refetchTables, triggerTablesRefetch,
    isCategoryModalOpen, categoryToEdit, openCategoryModal, closeCategoryModal, refetchCategories, triggerCategoriesRefetch,
    isOrderDetailModalOpen, orderToView, openOrderDetailModal, closeOrderDetailModal,
    isPaymentMethodModalOpen, paymentMethodToEdit, openPaymentMethodModal, closePaymentMethodModal, refetchPaymentMethods, triggerPaymentMethodsRefetch,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModals must be used within a ModalProvider');
  return context;
};
