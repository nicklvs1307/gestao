import type { Order, OrderItem } from '../../types';

export interface PrinterConfig {
  cashierPrinters: string[];
  kitchenPrinters: { id: string; name: string; printer: string }[];
  barPrinters: { id: string; name: string; printer: string }[];
  categoryMapping: Record<string, string>;
  printMode?: 'escpos' | 'pdf' | 'auto';
}

export interface ReceiptSettings {
  showLogo?: boolean;
  showAddress?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  headerText?: string;
  footerText?: string;
  itemSpacing?: number;
  paperFeed?: number;
  useInit?: boolean;
}

export interface RestaurantInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  logoUrl?: string | null;
}

export interface CashierClosureData {
  openedAt: string;
  totalOrders: number;
  totalItems: number;
  salesByMethod: Record<string, number>;
  totalSales: number;
  initialAmount: number;
  adjustments: { sangria: number; reforco: number };
  notes?: string;
  items?: Array<{
    name: string;
    qty: number;
    total: number;
    addons?: Record<string, { qty: number; total: number }>;
  }>;
  closingDetails?: Record<string, string>;
  canceledOrders?: Array<{
    id: string;
    dailyOrderNumber: number;
    total: number;
    canceledAt: string;
  }>;
  totalCanceledAmount?: number;
}

export interface DriverSettlementData {
  driverId: string;
  driverName: string;
  totalOrders: number;
  cash: number;
  card: number;
  pix: number;
  deliveryFees: number;
  totalToPay: number;
  storeNet: number;
}
