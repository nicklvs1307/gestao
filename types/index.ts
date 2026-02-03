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
}

export interface CartItem {
  id: string;
  productId: string;
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
}

export interface Order {
  id: string;
  tableNumber: number;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  items: OrderItem[];
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