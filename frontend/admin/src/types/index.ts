export interface AddonOption {
  id: string;
  name: string;
  price: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  order: number;
  addonGroupId: string;
}

export interface AddonGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  order: number;
  productId: string;
  addons: Addon[];
}

export interface SizeOption {
  id: string;
  name: string;
  price: number;
  order: number;
  productId: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  restaurantId: string;
  products: Product[]; // Pode ser omitido se não for necessário no cliente
  // For sub-categories
  parentId?: string | null;
  subCategories?: Category[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isFeatured: boolean;
  isAvailable: boolean;
  stock: number;
  tags: string[];
  order: number;
  categoryId: string;
  restaurantId: string;
  category: Category;
  sizes: SizeOption[];
  addonGroups: AddonGroup[];
  pizzaConfig?: {
    maxFlavors: number;
    flavorCategoryId: string;
    priceRule: 'higher' | 'average';
    sizes: Record<string, { maxFlavors: number }>;
  };
}

export interface CartItem {
  id: string;
  cartItemId?: string; // Usado internamente no frontend
  productId: string;
  product?: Product;
  name: string;
  price: number;
  quantity: number;
  observation?: string;
  imageUrl?: string;
  selectedSize?: SizeOption;
  selectedAddons?: AddonOption[];
  totalPrice?: number;
  // Campos estruturados (JSON) para persistência e visualização rápida
  sizeJson?: string | null;
  addonsJson?: string | null;
  flavorsJson?: string | null;
  // Campos adicionais para o pedido
  productDbId: string;
  selectedSizeDbId?: string;
  selectedAddonDbIds?: string[];
  selectedFlavorIds?: string[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  observations?: string;
  priceAtTime: number;
  orderId: string;
  productId: string;
  product: Product;
  sizeJson?: string;
  addonsJson?: string;
  flavorsJson?: string; // Adicionado para suportar sabores de pizza
}

export interface DeliveryOrder {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  deliveryType?: string;
  paymentMethod?: string;
  changeFor?: number;
  deliveryFee: number;
  notes?: string;
  estimatedDeliveryTime?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  order: Order;
  customerId?: string;
  customer?: { id: string; name: string; phone: string };
  driverId?: string;
  driver?: { id: string; name: string };
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

export interface Order {
  id: string;
  dailyOrderNumber?: number;
  tableNumber: number;
  status: string;
  total: number;
  customerName?: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  orderType?: 'TABLE' | 'DELIVERY';
  items: OrderItem[];
  deliveryOrder?: DeliveryOrder;
  payments?: Payment[];
  user?: { name: string };
  discount?: number;
  extraCharge?: number;
  isPrinted?: boolean;
  isSettled?: boolean;
  settledAt?: string | null;
  invoice?: { id: string; pdfUrl?: string } | null;
  pendingAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
}

export interface TableSummary {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'awaiting_payment';
  totalAmount: number;
  items: OrderItem[];
  tabs?: {
    orderId: string;
    customerName: string;
    waiterName?: string;
    totalAmount: number;
    balanceDue: number; // Novo: Saldo devedor
    items: OrderItem[];
    createdAt: string;
  }[];
}

export interface RestaurantSettings {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundType?: string;
  backgroundImageUrl?: string;
  address?: string;
  phone?: string;
  serviceTaxPercentage?: number;
  openingHours?: string;
}

export interface Table {

  id: string;

  number: number;

  status: string;

  restaurantId: string;

}



export interface PaymentMethod {

  id: string;

  name: string;

  type: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'VOUCHER' | 'OTHER';

  isActive: boolean;

  allowDelivery: boolean;

  allowPos: boolean;

  allowTable: boolean;

  feePercentage?: number;

  daysToReceive?: number;

  restaurantId: string;

  createdAt: string;

  updatedAt: string;

}

// ============================================================
// Types para Driver Dashboard
// ============================================================

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  bonusPerDelivery?: number;
}

export interface DriverOrder {
  id: string;
  dailyOrderNumber?: number;
  status: 'PENDING' | 'READY' | 'SHIPPED' | 'COMPLETED' | 'CANCELED';
  total: number;
  orderType: string;
  createdAt: string;
  updatedAt: string;
  deliveryOrder: DriverDeliveryData | null;
  items?: Array<{
    id: string;
    quantity: number;
    observations?: string;
    priceAtTime: number;
    product?: { id: string; name: string };
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
}

export interface DriverDeliveryData {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  deliveryType?: string;
  paymentMethod?: string;
  changeFor?: number;
  deliveryFee: number;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderId: string;
  driverId?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export type Coords = [number, number];

export type DriverView = 'list' | 'detail';
export type DriverTab = 'home' | 'history' | 'profile';
export type DriverHomeSubTab = 'my' | 'queue';
