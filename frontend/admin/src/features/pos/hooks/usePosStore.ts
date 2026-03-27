import { create } from 'zustand';

interface PosState {
  orderMode: 'table' | 'delivery';
  deliverySubType: 'delivery' | 'pickup';
  selectedTable: string;
  customerName: string;
  deliveryInfo: {
    name: string;
    phone: string;
    address: string;
    deliveryType: 'delivery' | 'pickup';
  };
  activeTab: 'pos' | 'tables';
  activeModal: 'none' | 'cashier_open' | 'cashier_close' | 'delivery_info' | 'table_details' | 'payment_method' | 'transfer_table' | 'transfer_items' | 'pos_checkout';
  activeDeliveryOrderId: string | null;
  searchTerm: string;
  selectedCategory: string;
  selectedProductForAdd: any | null;
  tempQty: number;
  tempObs: string;
  selectedSizeId: string;
  selectedAddonIds: string[];
  showProductDrawer: boolean;
  posDeliveryFee: string;
  posExtraCharge: string;
  posDiscountValue: string;
  posDiscountPercentage: string;
  posPaymentMethodId: string;
  posObservations: string;
  isSubmitting: boolean;

  setOrderMode: (mode: 'table' | 'delivery') => void;
  setDeliverySubType: (type: 'delivery' | 'pickup') => void;
  setSelectedTable: (table: string) => void;
  setCustomerName: (name: string) => void;
  setDeliveryInfo: (info: any) => void;
  setActiveTab: (tab: 'pos' | 'tables') => void;
  setActiveModal: (modal: any) => void;
  setActiveDeliveryOrderId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProductForAdd: (product: any | null) => void;
  setTempQty: (qty: number) => void;
  setTempObs: (obs: string) => void;
  setSelectedSizeId: (id: string) => void;
  setSelectedAddonIds: (ids: string[]) => void;
  setShowProductDrawer: (show: boolean) => void;
  setPosDeliveryFee: (fee: string) => void;
  setPosExtraCharge: (charge: string) => void;
  setPosDiscountValue: (value: string) => void;
  setPosDiscountPercentage: (percentage: string) => void;
  setPosPaymentMethodId: (id: string) => void;
  setPosObservations: (obs: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  resetPos: () => void;
}

export const usePosStore = create<PosState>((set) => ({
  orderMode: 'table',
  deliverySubType: 'delivery',
  selectedTable: '',
  customerName: '',
  deliveryInfo: {
    name: '',
    phone: '',
    address: '',
    deliveryType: 'pickup'
  },
  activeTab: 'pos',
  activeModal: 'none',
  activeDeliveryOrderId: null,
  searchTerm: '',
  selectedCategory: 'all',
  selectedProductForAdd: null,
  tempQty: 1,
  tempObs: '',
  selectedSizeId: '',
  selectedAddonIds: [],
  showProductDrawer: false,
  posDeliveryFee: '0',
  posExtraCharge: '0',
  posDiscountValue: '0',
  posDiscountPercentage: '0',
  posPaymentMethodId: '',
  posObservations: '',
  isSubmitting: false,

  setOrderMode: (orderMode) => set({ orderMode }),
  setDeliverySubType: (deliverySubType) => set({ deliverySubType }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setCustomerName: (customerName) => set({ customerName }),
  setDeliveryInfo: (deliveryInfo) => set({ deliveryInfo }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setActiveDeliveryOrderId: (activeDeliveryOrderId) => set({ activeDeliveryOrderId }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedProductForAdd: (selectedProductForAdd) => set({ selectedProductForAdd }),
  setTempQty: (tempQty) => set({ tempQty }),
  setTempObs: (tempObs) => set({ tempObs }),
  setSelectedSizeId: (selectedSizeId) => set({ selectedSizeId }),
  setSelectedAddonIds: (selectedAddonIds) => set({ selectedAddonIds }),
  setShowProductDrawer: (showProductDrawer) => set({ showProductDrawer }),
  setPosDeliveryFee: (posDeliveryFee) => set({ posDeliveryFee }),
  setPosExtraCharge: (posExtraCharge) => set({ posExtraCharge }),
  setPosDiscountValue: (posDiscountValue) => set({ posDiscountValue }),
  setPosDiscountPercentage: (posDiscountPercentage) => set({ posDiscountPercentage }),
  setPosPaymentMethodId: (posPaymentMethodId) => set({ posPaymentMethodId }),
  setPosObservations: (posObservations) => set({ posObservations }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  resetPos: () => set({
    orderMode: 'table',
    selectedTable: '',
    customerName: '',
    deliveryInfo: { name: '', phone: '', address: '', deliveryType: 'pickup' },
    activeDeliveryOrderId: null,
    searchTerm: '',
    selectedCategory: 'all',
    selectedProductForAdd: null,
    tempQty: 1,
    tempObs: '',
    selectedSizeId: '',
    selectedAddonIds: [],
    showProductDrawer: false,
    posDeliveryFee: '0',
    posExtraCharge: '0',
    posDiscountValue: '0',
    posDiscountPercentage: '0',
    posPaymentMethodId: '',
    posObservations: '',
    isSubmitting: false
  })
}));

export const usePosOrderMode = () => usePosStore(state => state.orderMode);
export const usePosSelectedTable = () => usePosStore(state => state.selectedTable);
export const usePosActiveTab = () => usePosStore(state => state.activeTab);
export const usePosActiveModal = () => usePosStore(state => state.activeModal);
export const usePosSearchTerm = () => usePosStore(state => state.searchTerm);
export const usePosSelectedCategory = () => usePosStore(state => state.selectedCategory);
export const usePosDeliveryInfo = () => usePosStore(state => state.deliveryInfo);
