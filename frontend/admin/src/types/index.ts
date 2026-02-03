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
  productId: string;
  product?: Product; // Opcional para não quebrar outros lugares, mas útil para impressão
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  selectedSize?: SizeOption;
  selectedAddons?: AddonOption[];
  totalPrice: number;
  // Campos adicionais para o pedido
  productDbId: string; // ID do produto no banco de dados
  selectedSizeDbId?: string; // ID do tamanho no banco de dados
  selectedAddonDbIds?: string[]; // IDs dos adicionais no banco de dados
  selectedFlavorIds?: string[]; // IDs dos sabores no banco de dados
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
  customerName?: string | null; // Adicionado suporte a comandas individuais
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  orderType?: 'TABLE' | 'DELIVERY';
  items: OrderItem[];
  deliveryOrder?: DeliveryOrder;
  payments?: Payment[];
  user?: { name: string };
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
