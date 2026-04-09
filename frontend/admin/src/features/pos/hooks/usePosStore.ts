import { create } from 'zustand';
import { Product } from '../../../types';

export type PosTab = 'table' | 'counter' | 'delivery' | 'tables';

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  complement?: string;
  reference?: string;
  deliveryType: 'delivery' | 'retirada';
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  observation?: string;
  selectedSize?: { id: string; name: string; price: number };
  selectedSizeDbId?: string;
  sizeJson?: string;
  selectedAddonDbIds?: string[];
  addonsJson?: string;
}

interface PosState {
  // Tab ativa: mesa, balcão ou delivery
  activeTab: PosTab;
  
  // Modal ativo
  activeModal: 'none' | 'cashier_open' | 'delivery_info' | 'counter_customer' | 'pos_checkout';
  
  // Contexto Mesa
  selectedTable: string;
  customerName: string;
  
  // Contexto Delivery
  deliveryInfo: DeliveryInfo;
  deliverySubType: 'delivery' | 'pickup';
  activeDeliveryOrderId: string | null;
  
  // Catálogo
  searchTerm: string;
  selectedCategory: string;
  
  // Drawer de produto
  selectedProductForAdd: Product | null;
  tempQty: number;
  tempObs: string;
  selectedSizeId: string;
  selectedAddonIds: string[];
  showProductDrawer: boolean;
  
  // Checkout
  posDeliveryFee: string;
  posExtraCharge: string;
  posDiscountValue: string;
  posDiscountPercentage: string;
  posPaymentMethodId: string;
  posObservations: string;
  isSubmitting: boolean;

  // Actions
  setActiveTab: (tab: PosTab) => void;
  setActiveModal: (modal: PosState['activeModal']) => void;
  
  // Mesa
  setSelectedTable: (table: string) => void;
  setCustomerName: (name: string) => void;
  
  // Delivery
  setDeliveryInfo: (info: DeliveryInfo) => void;
  setDeliverySubType: (type: 'delivery' | 'pickup') => void;
  setActiveDeliveryOrderId: (id: string | null) => void;
  
  // Catálogo
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  
  // Drawer
  setSelectedProductForAdd: (product: Product | null) => void;
  setTempQty: (qty: number) => void;
  setTempObs: (obs: string) => void;
  setSelectedSizeId: (id: string) => void;
  setSelectedAddonIds: (ids: string[]) => void;
  setShowProductDrawer: (show: boolean) => void;
  
  // Checkout
  setPosDeliveryFee: (fee: string) => void;
  setPosExtraCharge: (charge: string) => void;
  setPosDiscountValue: (value: string) => void;
  setPosDiscountPercentage: (percentage: string) => void;
  setPosPaymentMethodId: (id: string) => void;
  setPosObservations: (obs: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  
  resetPos: () => void;
}

const initialState = {
  activeTab: 'delivery' as PosTab,
  activeModal: 'none' as PosState['activeModal'],
  selectedTable: '',
  customerName: '',
  deliveryInfo: {
    name: '',
    phone: '',
    address: '',
    deliveryType: 'retirada' as const
  },
  deliverySubType: 'delivery' as const,
  activeDeliveryOrderId: null as string | null,
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
};

export const usePosStore = create<PosState>((set) => ({
  ...initialState,

  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveModal: (activeModal) => set({ activeModal }),
  
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setCustomerName: (customerName) => set({ customerName }),
  
  setDeliveryInfo: (deliveryInfo) => set({ deliveryInfo }),
  setDeliverySubType: (deliverySubType) => set({ deliverySubType }),
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
  
  resetPos: () => set(initialState)
}));

// Selectors
export const usePosActiveTab = () => usePosStore(s => s.activeTab);
export const usePosActiveModal = () => usePosStore(s => s.activeModal);
export const usePosSelectedTable = () => usePosStore(s => s.selectedTable);
export const usePosSearchTerm = () => usePosStore(s => s.searchTerm);
export const usePosSelectedCategory = () => usePosStore(s => s.selectedCategory);
export const usePosDeliveryInfo = () => usePosStore(s => s.deliveryInfo);
