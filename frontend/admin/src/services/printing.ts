import type { Order, OrderItem } from '../types';
import { formatSP } from '@/lib/timezone';
import { toast } from 'sonner';
import { 
  generateEscPosReceipt, 
  escPosToBase64, 
  generateCashierClosureReceipt, 
  generateDriverSettlementReceipt,
  type CashierClosureData,
  type DriverSettlementData
} from './escpos';

const AGENT_URL = 'http://localhost:4676';

// ─── HELPERS ──────────────────────────────────────────────────────────────
const getPrinterConfigFromStorage = (): PrinterConfig => {
  try {
    const config = localStorage.getItem('printer_config');
    if (config) {
      return JSON.parse(config);
    }
  } catch (e) {
    console.error('Erro ao ler config de impressão:', e);
  }
  return { cashierPrinters: [], kitchenPrinters: [], barPrinters: [], categoryMapping: {} };
};

// ─── CONFIGURAÇÃO DO AGENTE ───────────────────────────────────────────
const getAgentUrl = () => AGENT_URL;
const getAgentToken = () => 'kicardapio-printer-2024'; // Deve bater com o server.js

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 3000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

export interface PrinterConfig {
  cashierPrinters: string[];
  kitchenPrinters: { id: string; name: string; printer: string }[];
  barPrinters: { id: string; name: string; printer: string }[];
  categoryMapping: Record<string, string>;
  /** Modo de impressão: 'escpos' para térmicas, 'pdf' para fallback */
  printMode?: 'escpos' | 'pdf' | 'auto';
}

export interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  fontSize: 'small' | 'medium' | 'large';
  headerText: string;
  footerText: string;
  itemSpacing?: number;
  paperFeed?: number;
  useInit?: boolean;
}

interface RestaurantInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  cnpj?: string | null;
  logoUrl?: string | null;
}

// ─── VERIFICAÇÃO DO AGENTE ────────────────────────────────────────────
export const checkAgentStatus = async (): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(`${getAgentUrl()}/status`);
    return res.ok;
  } catch {
    return false;
  }
};

export const getPrinters = async (): Promise<string[]> => {
  try {
    const res = await fetchWithTimeout(`${getAgentUrl()}/printers`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((p: unknown) =>
        typeof p === 'string' ? p : ((p as { name?: string }).name || (p as { printer?: string }).printer || '')
      );
    }
    return [];
  } catch (e) {
    console.error('Erro ao buscar impressoras', e);
    return [];
  }
};

// ─── ENVIO PARA O AGENTE ──────────────────────────────────────────────
const sendToAgent = async (printer: string, content: string, type: 'escpos' | 'pdf' = 'escpos') => {
  if (!printer) return;

  await fetchWithTimeout(`${getAgentUrl()}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printer,
      content,
      type,
      token: getAgentToken(),
    }),
  }, 8000);
};

// ─── DETECÇÃO DE MODO DE IMPRESSÃO ────────────────────────────────────
function isNetworkPrinter(printer: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}/.test(printer) ||
    printer.startsWith('\\\\') ||
    printer.toLowerCase().includes('network') ||
    printer.toLowerCase().includes('tcp');
}

function detectPrintMode(printer: string, configMode?: string): 'escpos' | 'pdf' {
  if (configMode === 'pdf') return 'pdf';
  // Sempre ESC/POS — funciona para USB e rede sem problemas de feed
  return 'escpos';
}

// ─── HELPERS DE STORAGE ───────────────────────────────────────────────
function getRestaurantInfoFromStorage(): RestaurantInfo {
  return {
    name: localStorage.getItem('restaurant_name') || 'Minha Loja',
    address: localStorage.getItem('restaurant_address'),
    phone: localStorage.getItem('restaurant_phone'),
    cnpj: localStorage.getItem('restaurant_cnpj'),
    logoUrl: localStorage.getItem('restaurant_logo'),
  };
}

function getReceiptSettingsFromStorage(): ReceiptSettings {
  const layout = localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings');
  return layout ? JSON.parse(layout) : {
    showLogo: true,
    showAddress: true,
    fontSize: 'medium',
    headerText: '',
    footerText: '',
    itemSpacing: 2,
    paperFeed: 3,
    useInit: false,
  };
}

// ─── FUNÇÕES PÚBLICAS DE IMPRESSÃO ───────────────────────────────────

export const printOrder = async (
  order: Order,
  config: PrinterConfig,
  receiptSettings?: ReceiptSettings,
  restaurantInfo?: RestaurantInfo
) => {
  const status = await checkAgentStatus();
  if (!status) {
    toast.error("Agente de impressão não encontrado!");
    return;
  }

  if (!order || !order.items || order.items.length === 0) {
    console.error("Pedido sem itens para impressão:", order);
    toast.error("O pedido está vazio ou não foi carregado para impressão.");
    return;
  }

  const finalConfig: PrinterConfig = {
    cashierPrinters: config?.cashierPrinters || [],
    kitchenPrinters: config?.kitchenPrinters || [],
    barPrinters: config?.barPrinters || [],
    categoryMapping: config?.categoryMapping || {},
    printMode: config?.printMode || 'auto',
  };

  const storageLayout = localStorage.getItem('receipt_layout');
  const storageSettings = localStorage.getItem('receipt_settings');
  let finalSettings: ReceiptSettings;

  if (receiptSettings && Object.keys(receiptSettings).length > 0) {
    finalSettings = receiptSettings;
  } else if (storageLayout) {
    finalSettings = JSON.parse(storageLayout);
  } else if (storageSettings) {
    finalSettings = JSON.parse(storageSettings);
  } else {
    finalSettings = { showLogo: true, showAddress: true, fontSize: 'medium', headerText: '', footerText: '', itemSpacing: 2, paperFeed: 3, useInit: false };
  }

  const finalRestaurant = restaurantInfo || getRestaurantInfoFromStorage();

  const isTable = order.orderType === 'TABLE';
  const isCompleted = order.status === 'COMPLETED';

  // ── 1. IMPRESSÃO DO CAIXA (Via do Cliente / Extrato) ──
  const shouldPrintCashier = !isTable || (isTable && isCompleted);

  if (shouldPrintCashier && finalConfig.cashierPrinters?.length > 0) {
    for (const printer of finalConfig.cashierPrinters) {
      const escPos = generateEscPosReceipt(order, order.items, isTable ? "EXTRATO DE CONTA" : "VIA CAIXA", finalSettings, finalRestaurant, false);
      await sendToAgent(printer, escPosToBase64(escPos), 'escpos');
    }
  }

  // ── 2. IMPRESSÃO NA PRODUÇÃO (Cozinha/Bar) ──
  const shouldPrintProduction = !isTable || (isTable && !isCompleted);

  if (shouldPrintProduction) {
    const productionGroups: Record<string, OrderItem[]> = {};

    (order.items || []).forEach(item => {
      const product = item.product;
      let categoryName = "Geral";

      if ((product as { category?: { name?: string } })?.category?.name) {
        categoryName = (product as { category?: { name?: string } }).category!.name;
      } else if ((item as { category?: { name?: string } }).category?.name) {
        categoryName = (item as { category?: { name?: string } }).category!.name;
      }

      const destinationId = finalConfig.categoryMapping[categoryName] || finalConfig.categoryMapping[categoryName.trim()] || 'k1';
      if (destinationId === 'none') return;

      if (!productionGroups[destinationId]) productionGroups[destinationId] = [];
      productionGroups[destinationId].push(item);
    });

    // Cozinhas
    for (const k of (finalConfig.kitchenPrinters || [])) {
      const items = productionGroups[k.id];
      if (items && items.length > 0) {
        const escPos = generateEscPosReceipt(order, items, `VIA ${k.name.toUpperCase()}`, finalSettings, finalRestaurant, true);
        await sendToAgent(k.printer, escPosToBase64(escPos), 'escpos');
      }
    }

    // Bares
    for (const b of (finalConfig.barPrinters || [])) {
      const items = productionGroups[b.id];
      if (items && items.length > 0) {
        const escPos = generateEscPosReceipt(order, items, `VIA ${b.name.toUpperCase()}`, finalSettings, finalRestaurant, true);
        await sendToAgent(b.printer, escPosToBase64(escPos), 'escpos');
      }
    }
  }
};

export const printTableCheckout = async (
  tableNumber: number,
  items: Record<string, unknown>[],
  payments: Record<string, unknown>[],
  order?: Order,
  restaurantInfo?: RestaurantInfo,
  printerConfig?: { cashierPrinters: string[] },
  receiptSettings?: ReceiptSettings
) => {
  const status = await checkAgentStatus();
  if (!status) { toast.error("Agente de impressão não encontrado!"); return; }

  const config = printerConfig || { cashierPrinters: [] };
  const settings = receiptSettings || getReceiptSettingsFromStorage();
  const info = restaurantInfo || getRestaurantInfoFromStorage();

  const dummyOrder: Order = order || {
    id: 'CONTA-' + tableNumber,
    tableNumber: tableNumber,
    orderType: 'TABLE',
    status: 'COMPLETED',
    total: items.reduce((acc, i) => acc + ((i.priceAtTime as number || 0) * (i.quantity as number || 0)), 0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: items as unknown as Order['items'],
    payments: payments as unknown as Order['payments'],
    restaurantId: '',
  };

  const escPos = generateEscPosReceipt(dummyOrder, items as unknown as OrderItem[], `EXTRATO MESA ${tableNumber}`, settings, info, false);

  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      await sendToAgent(p, escPosToBase64(escPos), 'escpos');
    }
  }
};

export const printCashierClosure = async (
  summary: Record<string, unknown>,
  restaurantInfo?: RestaurantInfo,
  printerConfig?: { cashierPrinters: string[] },
  closingDetails?: Record<string, string>,
  sessionOrders?: unknown[]
) => {
  const status = await checkAgentStatus();
  if (!status) { toast.error("Agente de impressão não encontrado!"); return; }

  const config = printerConfig || { cashierPrinters: [] };
  const info = restaurantInfo || getRestaurantInfoFromStorage();

  const itemMap: Record<string, { name: string; qty: number; total: number; addons: Record<string, { qty: number; total: number }> }> = {};
  let totalOrders = 0;
  let totalItems = 0;

  (sessionOrders || []).forEach((order: unknown) => {
    const o = order as { status?: string; items?: unknown[] };
    if (o.status === 'CANCELED') return;
    totalOrders++;
    (o.items || []).forEach((item: unknown) => {
      const i = item as { quantity?: number; product?: { name?: string }; priceAtTime?: number; addonsJson?: unknown };
      totalItems += (i.quantity || 0);
      const productName = i.product?.name || 'Produto';
      const key = productName.toUpperCase();

      if (!itemMap[key]) {
        itemMap[key] = { name: productName, qty: 0, total: 0, addons: {} };
      }
      itemMap[key].qty += (i.quantity || 0);
      itemMap[key].total += (i.priceAtTime || 0) * (i.quantity || 0);

      if (i.addonsJson) {
        try {
          const addons = typeof i.addonsJson === 'string' ? JSON.parse(i.addonsJson) : i.addonsJson;
          if (Array.isArray(addons)) {
            addons.forEach((a: { name?: string; price?: number; quantity?: number }) => {
              const addonName = (a.name || 'Adicional').toUpperCase();
              const addonQty = (a.quantity || 1) * (i.quantity || 1);
              const addonPrice = (a.price || 0) * addonQty;
              if (!itemMap[key].addons[addonName]) {
                itemMap[key].addons[addonName] = { qty: 0, total: 0 };
              }
              itemMap[key].addons[addonName].qty += addonQty;
              itemMap[key].addons[addonName].total += addonPrice;
            });
          }
        } catch { /* ignore */ }
      }
    });
  });

  const closureData: CashierClosureData = {
    openedAt: summary.openedAt as string,
    totalOrders,
    totalItems,
    salesByMethod: summary.salesByMethod as Record<string, number> || {},
    totalSales: summary.totalSales as number || 0,
    initialAmount: summary.initialAmount as number || 0,
    adjustments: {
      sangria: (summary.adjustments as { sangria?: number })?.sangria || 0,
      reforco: (summary.adjustments as { reforco?: number })?.reforco || 0,
    },
    notes: summary.notes as string | undefined,
    items: Object.values(itemMap).map(item => ({
      name: item.name,
      qty: item.qty,
      total: item.total,
      addons: item.addons
    })),
    closingDetails,
  };

  const escPos = generateCashierClosureReceipt(closureData, info, closingDetails, sessionOrders);

  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      await sendToAgent(p, escPosToBase64(escPos), 'escpos');
    }
    toast.success('Fechamento de caixa enviado para impressão!');
  }
};

// ─── IMPRESSÃO DE ACERTO DE ENTREGADOR ─────────────────────────────────

export const printDriverSettlement = async (
  settlement: DriverSettlementData,
  date: string,
  startTime: string,
  endTime: string,
  restaurantInfo?: RestaurantInfo
) => {
  const status = await checkAgentStatus();
  if (!status) { 
    toast.error("Agente de impressão não encontrado!"); 
    return; 
  }

  const info = restaurantInfo || getRestaurantInfoFromStorage();

  const settlementData: DriverSettlementData = {
    driverId: settlement.driverId,
    driverName: settlement.driverName,
    totalOrders: settlement.totalOrders,
    cash: settlement.cash,
    card: settlement.card,
    pix: settlement.pix,
    deliveryFees: settlement.deliveryFees,
    totalToPay: settlement.totalToPay,
    storeNet: settlement.storeNet,
  };

  const escPos = generateDriverSettlementReceipt(settlementData, date, startTime, endTime, info);
  const escPosBase64 = escPosToBase64(escPos);
  const config = getPrinterConfigFromStorage();
  
  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      await sendToAgent(p, escPosBase64, 'escpos');
    }
    toast.success(`Comprovante de ${settlement.driverName} enviado para impressão!`);
  } else {
    toast.error('Nenhuma impressora de caixa configurada.');
  }
};
