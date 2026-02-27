export interface AddonOption {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  maxQuantity?: number;
}

export interface Addon {
  id: string;
  name: string;
  description?: string;
  price: number;
  maxQuantity: number;
  order: number;
  addonGroupId: string;
  saiposIntegrationCode?: string | null;
}

export interface AddonGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  isFlavorGroup?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  order: number;
  addons: Addon[];
  saiposIntegrationCode?: string | null;
}

export interface SizeOption {
  id: string;
  name: string;
  price: number;
  order: number;
  productId: string;
  globalSizeId?: string | null;
  saiposIntegrationCode?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  cuisineType?: string;
  order: number;
  restaurantId: string;
  products: Product[]; 
  addonGroups?: AddonGroup[];
  parentId?: string | null;
  subCategories?: Category[];
  saiposIntegrationCode?: string | null;
  halfAndHalfRule?: string;
  availableDays?: string;
  startTime?: string;
  endTime?: string;
}

export interface PizzaSizeConfig {
    active: boolean;
    slices: number;
    maxFlavors: number;
}

export interface PizzaConfig {
    maxFlavors: number;
    sliceCount: number;
    priceRule: 'higher' | 'average';
    flavorCategoryId?: string;
    sizes: {
        [key: string]: PizzaSizeConfig;
    };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isFeatured: boolean;
  isAvailable: boolean;
  isFlavor: boolean; 
  showInMenu: boolean; 
  stock: number;
  tags: string[];
  order: number;
  categoryId?: string; 
  categories: Category[]; 
  restaurantId: string;
  category?: Category; 
  sizes: SizeOption[];
  addonGroups: AddonGroup[];
  promotions: Promotion[];
  pizzaConfig?: PizzaConfig | null;
  saiposIntegrationCode?: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  code?: string | null;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string;
  product?: Product;
  saiposIntegrationCode?: string | null;
  minOrderValue?: number;
}

export interface LocalCartItem {
  localId: number; 
  product: Product;
  productId: string;
  quantity: number;
  priceAtTime: number;
  sizeId?: string | null;
  addonsIds?: string[];
  flavorIds?: string[];
  sizeJson: string | null;
  addonsJson: string | null;
  flavorsJson: string | null;
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
  flavorsJson?: string;
  flavorIds?: string[];
}

export interface Order {
  id: string;
  dailyOrderNumber?: number;
  tableNumber: number;
  status: string; 
  total: number;
  orderType?: 'TABLE' | 'DELIVERY';
  isPrinted: boolean;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  items: OrderItem[];
  saiposOrderId?: string | null;
  deliveryOrder?: {
    name: string;
    phone: string;
    address: string;
    deliveryType: string;
    deliveryFee: number;
  };
}

export interface SaiposIntegrationSettings {
  saiposIntegrationActive: boolean;
  saiposCodStore: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  saiposIntegrationCode?: string | null;
  allowDelivery: boolean;
  allowPos: boolean;
  allowTable: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  serviceTaxPercentage?: number;
  openingHours?: string;
  settings?: RestaurantSettings;
  categories: Category[];
  paymentMethods?: PaymentMethod[];
}

export interface RestaurantSettings {
  id: string;
  restaurantId: string;
  welcomeMessage?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundType?: string;
  backgroundImageUrl?: string;
  allowTakeaway?: boolean;
  menuUrl?: string;
  isOpen: boolean; 
  autoAcceptOrders: boolean; 
  autoPrintEnabled: boolean; 
  textColor?: string;
  restaurant: Restaurant;
}

export interface Table {
  id: string;
  number: number;
  status: string;
  restaurantId: string;
}
