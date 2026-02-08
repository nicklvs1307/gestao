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
  price: number;
  maxQuantity: number;
  order: number;
  addonGroupId: string;
}

export interface AddonGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minQuantity?: number;
  maxQuantity?: number;
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
  products: Product[]; 
  parentId?: string | null;
  subCategories?: Category[];
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
  stock: number;
  tags: string[];
  order: number;
  categoryId: string;
  restaurantId: string;
  category: Category;
  sizes: SizeOption[];
  addonGroups: AddonGroup[];
  promotions: Promotion[];
  pizzaConfig?: PizzaConfig | null; // Adicionado aqui
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productId?: string;
  product?: Product;
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

export interface Restaurant {
  id: string;
  slug: string; // Adicionado
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  serviceTaxPercentage?: number;
  openingHours?: string;
  settings?: RestaurantSettings;
  categories: Category[];
  paymentMethods?: { id: string; name: string; type: string }[];
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
  textColor?: string;
  restaurant: Restaurant;
}

export interface Table {
  id: string;
  number: number;
  status: string;
  restaurantId: string;
}
