import type { Order, OrderItem } from '../types';
import { formatSP } from '@/lib/timezone';
import { toast } from 'sonner';
import { generateEscPosReceipt, escPosToBase64 } from './escpos';

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

      if (product?.categories && product.categories.length > 0) {
        categoryName = product.categories[0].name;
      } else if ((product as { category?: { name?: string } })?.category?.name) {
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
  sessionOrders?: any[]
) => {
  const status = await checkAgentStatus();
  if (!status) { toast.error("Agente de impressão não encontrado!"); return; }

  const config = printerConfig || { cashierPrinters: [] };
  const info = restaurantInfo || getRestaurantInfoFromStorage();

  const itemMap: Record<string, { name: string; qty: number; total: number; addons: Record<string, { qty: number; total: number }> }> = {};
  let totalOrders = 0;
  let totalItems = 0;

  (sessionOrders || []).forEach((order: any) => {
    if (order.status === 'CANCELED') return;
    totalOrders++;
    (order.items || []).forEach((item: any) => {
      totalItems += (item.quantity || 0);
      const productName = item.product?.name || 'Produto';
      const key = productName.toUpperCase();

      if (!itemMap[key]) {
        itemMap[key] = { name: productName, qty: 0, total: 0, addons: {} };
      }
      itemMap[key].qty += (item.quantity || 0);
      itemMap[key].total += (item.priceAtTime || 0) * (item.quantity || 0);

      if (item.addonsJson) {
        try {
          const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
          if (Array.isArray(addons)) {
            addons.forEach((a: { name: string; price?: number; quantity?: number }) => {
              const addonName = (a.name || 'Adicional').toUpperCase();
              const addonQty = (a.quantity || 1) * (item.quantity || 1);
              const addonPrice = (a.price || 0) * addonQty;
              if (!itemMap[key].addons[addonName]) {
                itemMap[key].addons[addonName] = { qty: 0, total: 0 };
              }
              itemMap[key].addons[addonName].qty += addonQty;
              itemMap[key].addons[addonName].total += addonPrice;
            });
          }
        } catch { /* empty */ }
      }
    });
  });

  const methodMap: Record<string, string> = {
    cash: 'DINHEIRO', dinheiro: 'DINHEIRO',
    credit_card: 'CARTÃO CRÉDITO', credito: 'CARTÃO CRÉDITO',
    debit_card: 'CARTÃO DÉBITO', debito: 'CARTÃO DÉBITO',
    pix: 'PIX',
    meal_voucher: 'VALE REFEIÇÃO', vale_refeicao: 'VALE REFEIÇÃO',
    card: 'CARTÃO (PDV)',
    other: 'OUTROS'
  };

  const ESC = '\x1b';
  const GS = '\x1d';
  const ALIGN_CENTER = ESC + 'a' + '\x01';
  const ALIGN_LEFT = ESC + 'a' + '\x00';
  const ALIGN_RIGHT = ESC + 'a' + '\x02';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const FONT_NORMAL = ESC + '!' + '\x00';
  const FONT_DOUBLE = ESC + '!' + '\x30';
  const FONT_DOUBLE_W = ESC + '!' + '\x20';
  const FEED = (n: number) => ESC + 'd' + String.fromCharCode(n);
  const CUT = GS + 'V' + '\x00';
  const LINE = '------------------------------------------\n';

  let buf = '';
  buf += ALIGN_LEFT + FONT_NORMAL;

  buf += ALIGN_CENTER + FONT_DOUBLE + (info.name?.toUpperCase() || 'KICARDÁPIO') + '\n' + FONT_NORMAL + ALIGN_LEFT;
  if (info.cnpj) buf += ALIGN_CENTER + `CNPJ: ${info.cnpj}\n` + ALIGN_LEFT;
  if (info.address) buf += ALIGN_CENTER + `${info.address.substring(0, 80)}\n` + ALIGN_LEFT;
  if (info.phone) buf += ALIGN_CENTER + `TEL: ${info.phone}\n` + ALIGN_LEFT;

  buf += LINE;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + 'FECHAMENTO DE CAIXA' + '\n' + FONT_NORMAL + ALIGN_LEFT + '\n';

  buf += `ABERTURA: ${formatSP(summary.openedAt as string, "dd/MM/yyyy HH:mm")}\n`;
  buf += `FECHAMENTO: ${formatSP(new Date(), "dd/MM/yyyy HH:mm")}\n`;
  buf += LINE;

  buf += BOLD_ON + `TOTAL DE PEDIDOS: ${totalOrders}\n` + BOLD_OFF;
  buf += BOLD_ON + `TOTAL DE ITENS: ${totalItems}\n` + BOLD_OFF;
  buf += LINE;

  buf += ALIGN_CENTER + BOLD_ON + 'PRODUTOS VENDIDOS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE;
  buf += BOLD_ON + 'QTD  DESCRIÇÃO' + ' '.repeat(18) + 'VALOR\n' + BOLD_OFF;
  buf += LINE;

  const sortedItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
  sortedItems.forEach(item => {
    buf += BOLD_ON + `${item.qty}x ${item.name.toUpperCase()}\n` + BOLD_OFF;
    buf += ALIGN_RIGHT + `R$ ${item.total.toFixed(2)}\n` + ALIGN_LEFT;
    Object.entries(item.addons).forEach(([addonName, addonData]) => {
      buf += `  [+] ${addonData.qty}x ${addonName}\n`;
      buf += ALIGN_RIGHT + `  R$ ${addonData.total.toFixed(2)}\n` + ALIGN_LEFT;
    });
    buf += '\n';
  });

  buf += LINE;
  buf += ALIGN_CENTER + BOLD_ON + 'RESUMO DE VENDAS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE;

  const salesByMethod = summary.salesByMethod as Record<string, number> || {};
  Object.entries(salesByMethod).forEach(([method, amount]) => {
    buf += `${(methodMap[method] || method.toUpperCase()).padEnd(28)} R$ ${(amount as number).toFixed(2)}\n`;
  });
  buf += '\n';
  buf += BOLD_ON + `TOTAL VENDAS`.padEnd(32) + `R$ ${(summary.totalSales as number || 0).toFixed(2)}\n` + BOLD_OFF;
  buf += LINE;

  buf += ALIGN_CENTER + BOLD_ON + 'VALORES INFORMADOS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE;

  if (closingDetails) {
    Object.entries(closingDetails).forEach(([method, value]) => {
      const numVal = parseFloat(value) || 0;
      if (numVal > 0) {
        buf += `${(methodMap[method] || method.toUpperCase()).padEnd(28)} R$ ${numVal.toFixed(2)}\n`;
      }
    });
  }

  const totalInformed = closingDetails
    ? Object.values(closingDetails).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
    : 0;

  buf += '\n';
  buf += BOLD_ON + `TOTAL INFORMADO`.padEnd(32) + `R$ ${totalInformed.toFixed(2)}\n` + BOLD_OFF;
  buf += LINE;

  buf += ALIGN_CENTER + BOLD_ON + 'SALDO FINAL' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE;

  const adjustments = summary.adjustments as { sangria: number; reforco: number } || { sangria: 0, reforco: 0 };

  buf += `Fundo de Caixa (Inicial)`.padEnd(32) + `+ R$ ${(summary.initialAmount as number || 0).toFixed(2)}\n`;
  buf += `Total de Vendas`.padEnd(32) + `+ R$ ${(summary.totalSales as number || 0).toFixed(2)}\n`;
  if (adjustments.reforco > 0) buf += `Reforcos (+)`.padEnd(32) + `+ R$ ${adjustments.reforco.toFixed(2)}\n`;
  if (adjustments.sangria > 0) buf += `Sangrias (-)`.padEnd(32) + `- R$ ${adjustments.sangria.toFixed(2)}\n`;

  const expectedAmount = (summary.initialAmount as number || 0) + (summary.totalSales as number || 0) + adjustments.reforco - adjustments.sangria;
  buf += '\n';
  buf += BOLD_ON + `ESPERADO PELO SISTEMA`.padEnd(32) + `R$ ${expectedAmount.toFixed(2)}\n` + BOLD_OFF;
  buf += BOLD_ON + `INFORMADO POR VOCE`.padEnd(32) + `R$ ${totalInformed.toFixed(2)}\n` + BOLD_OFF;

  const difference = Math.round((totalInformed - expectedAmount) * 100) / 100;
  buf += LINE;
  if (difference !== 0) {
    if (difference > 0) {
      buf += ALIGN_CENTER + BOLD_ON + `SOBRA: + R$ ${difference.toFixed(2)}\n` + BOLD_OFF + ALIGN_LEFT;
    } else {
      buf += ALIGN_CENTER + BOLD_ON + `FALTA: - R$ ${Math.abs(difference).toFixed(2)}\n` + BOLD_OFF + ALIGN_LEFT;
    }
  } else {
    buf += ALIGN_CENTER + 'CAIXA CONFERE - SEM INCONSISTENCIAS\n' + ALIGN_LEFT;
  }
  buf += LINE;

  if (summary.notes) {
    buf += BOLD_ON + 'OBSERVACOES:\n' + BOLD_OFF;
    buf += `${(summary.notes as string).toUpperCase().substring(0, 120)}\n\n`;
  }

  buf += '\nASSINATURA RESPONSAVEL:\n';
  buf += '____________________________________\n\n';
  buf += ALIGN_CENTER + BOLD_ON + 'KICARDAPIO@\n' + BOLD_OFF + ALIGN_LEFT;

  buf += FEED(5) + CUT;

  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      await sendToAgent(p, escPosToBase64(buf), 'escpos');
    }
    toast.success('Fechamento de caixa enviado para impressão!');
  }
};

// ─── IMPRESSÃO DE ACERTO DE ENTREGADOR ─────────────────────────────────
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
  orders?: any[];
}

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
  
  const ESC = '\x1b';
  const GS = '\x1d';
  const ALIGN_CENTER = ESC + 'a' + '\x01';
  const ALIGN_LEFT = ESC + 'a' + '\x00';
  const ALIGN_RIGHT = ESC + 'a' + '\x02';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const FONT_NORMAL = ESC + '!' + '\x00';
  const FONT_DOUBLE = ESC + '!' + '\x30';
  const FONT_DOUBLE_W = ESC + '!' + '\x20';
  const FEED = (n: number) => ESC + 'd' + String.fromCharCode(n);
  const CUT = GS + 'V' + '\x00';
  const LINE = '------------------------------------------\n';

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  let buf = '';
  buf += ALIGN_LEFT + FONT_NORMAL;

  buf += ALIGN_CENTER + FONT_DOUBLE + (info.name?.toUpperCase() || 'KICARDAPIO') + '\n' + FONT_NORMAL + ALIGN_LEFT;
  if (info.cnpj) buf += ALIGN_CENTER + `CNPJ: ${info.cnpj}\n` + ALIGN_LEFT;
  if (info.address) buf += ALIGN_CENTER + `${info.address.substring(0, 80)}\n` + ALIGN_LEFT;

  buf += '\n' + LINE;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + 'COMPROVANTE DE ACERTO' + '\n' + FONT_NORMAL + ALIGN_LEFT + '\n';

  buf += `DATA: ${date}\n`;
  buf += `PERIODO: ${startTime} as ${endTime}\n\n`;

  buf += LINE;
  buf += ALIGN_CENTER + BOLD_ON + 'ENTREGADOR' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + settlement.driverName.toUpperCase() + '\n' + FONT_NORMAL + ALIGN_LEFT + '\n';
  buf += `ID: ${settlement.driverId.slice(0, 8)}\n\n`;

  buf += LINE;
  buf += ALIGN_CENTER + BOLD_ON + 'RESUMO DAS ENTREGAS' + '\n' + BOLD_OFF + ALIGN_LEFT + '\n';
  buf += `TOTAL DE ENTREGAS: ${settlement.totalOrders}\n\n`;

  buf += LINE;
  buf += ALIGN_CENTER + BOLD_ON + 'DETALHAMENTO FINANCEIRO' + '\n' + BOLD_OFF + ALIGN_LEFT + '\n';

  buf += `DINHEIRO (MAO):`.padEnd(32) + formatCurrency(settlement.cash) + '\n';
  buf += `CARTAO (MACHINE):`.padEnd(32) + formatCurrency(settlement.card) + '\n';
  buf += `PIX (TRANSFERENCIA):`.padEnd(32) + formatCurrency(settlement.pix) + '\n';
  buf += `TAXAS DE ENTREGA:`.padEnd(32) + `- ${formatCurrency(settlement.deliveryFees)}` + '\n\n';

  buf += '==========================================\n';
  buf += BOLD_ON + `TOTAL A RECEBER:`.padEnd(32) + formatCurrency(settlement.totalToPay) + '\n' + BOLD_OFF;
  buf += BOLD_ON + `LIQUIDO LOJA:`.padEnd(32) + formatCurrency(settlement.storeNet) + '\n' + BOLD_OFF;
  if (settlement.totalOrders > 0) {
    buf += ALIGN_RIGHT + `(${formatCurrency(settlement.storeNet / settlement.totalOrders)}/ent)\n` + ALIGN_LEFT;
  }
  buf += '\n';

  buf += '==========================================\n\n';
  buf += ALIGN_CENTER + 'ASSINATURA DO ENTREGADOR:\n\n' + ALIGN_LEFT;
  buf += ALIGN_CENTER + '_________________________________________\n\n' + ALIGN_LEFT;
  buf += ALIGN_CENTER + 'ASSINATURA DO CAIXA:\n\n' + ALIGN_LEFT;
  buf += ALIGN_CENTER + '_________________________________________\n\n' + ALIGN_LEFT;

  buf += LINE;
  buf += ALIGN_CENTER + `Emitido em: ${formatSP(new Date(), "dd/MM/yyyy HH:mm")}\n` + ALIGN_LEFT;
  buf += ALIGN_CENTER + 'KICARDAPIO - Sistema de Gestao\n' + ALIGN_LEFT;

  buf += FEED(5) + CUT;

  const escPosBase64 = escPosToBase64(buf);
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
