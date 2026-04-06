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
  const FONT_SMALL = ESC + '!' + '\x01';
  const FEED = (n: number) => ESC + 'd' + String.fromCharCode(n);
  const CUT = GS + 'V' + '\x00';
  const LINE = '================================================\n';
  const LINE_THIN = '------------------------------------------------\n';
  const W = 48; // largura do papel 80mm em caracteres

  function row(label: string, value: string): string {
    return `${label.padEnd(W - 14)}${value}\n`;
  }

  function rowBold(label: string, value: string): string {
    return BOLD_ON + row(label, value) + BOLD_OFF;
  }

  let buf = '';
  buf += ALIGN_LEFT + FONT_NORMAL;

  // Header
  buf += ALIGN_CENTER + FONT_DOUBLE + (info.name?.toUpperCase() || 'KICARDÁPIO') + '\n' + FONT_NORMAL + ALIGN_LEFT;
  if (info.cnpj) buf += ALIGN_CENTER + `CNPJ: ${info.cnpj}\n` + ALIGN_LEFT;
  if (info.address) buf += ALIGN_CENTER + `${info.address.substring(0, W)}\n` + ALIGN_LEFT;
  if (info.phone) buf += ALIGN_CENTER + `TEL: ${info.phone}\n` + ALIGN_LEFT;

  buf += '\n' + LINE;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + '  FECHAMENTO DE CAIXA  ' + '\n' + FONT_NORMAL + ALIGN_LEFT;
  buf += LINE;

  // Dados da sessão
  buf += `Abertura:   ${formatSP(summary.openedAt as string, "dd/MM/yyyy HH:mm")}\n`;
  buf += `Fechamento: ${formatSP(new Date(), "dd/MM/yyyy HH:mm")}\n`;
  buf += LINE_THIN;
  buf += rowBold('TOTAL DE PEDIDOS:', String(totalOrders));
  buf += rowBold('TOTAL DE ITENS:', String(totalItems));
  buf += LINE_THIN;

  // Produtos vendidos
  buf += ALIGN_CENTER + BOLD_ON + 'PRODUTOS VENDIDOS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;
  buf += BOLD_ON + 'QTD  DESCRIÇÃO'.padEnd(W - 14) + 'VALOR\n' + BOLD_OFF;
  buf += LINE_THIN;

  const sortedItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
  sortedItems.forEach(item => {
    buf += BOLD_ON + `${item.qty}x ${item.name.toUpperCase()}`.padEnd(W - 14) + `R$ ${item.total.toFixed(2)}\n` + BOLD_OFF;
    Object.entries(item.addons).forEach(([addonName, addonData]) => {
      buf += (`  [+] ${addonData.qty}x ${addonName}`).padEnd(W - 14) + `R$ ${addonData.total.toFixed(2)}\n`;
    });
  });

  buf += LINE_THIN;

  // Resumo de vendas
  buf += ALIGN_CENTER + BOLD_ON + 'RESUMO DE VENDAS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;

  const salesByMethod = summary.salesByMethod as Record<string, number> || {};
  Object.entries(salesByMethod).forEach(([method, amount]) => {
    buf += row((methodMap[method] || method.toUpperCase()), `R$ ${(amount as number).toFixed(2)}`);
  });

  buf += LINE_THIN;
  buf += rowBold('TOTAL VENDAS:', `R$ ${(summary.totalSales as number || 0).toFixed(2)}`);
  buf += LINE_THIN;

  // Valores informados
  buf += ALIGN_CENTER + BOLD_ON + 'VALORES INFORMADOS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;

  if (closingDetails) {
    Object.entries(closingDetails).forEach(([method, value]) => {
      const numVal = parseFloat(value) || 0;
      if (numVal > 0) {
        buf += row((methodMap[method] || method.toUpperCase()), `R$ ${numVal.toFixed(2)}`);
      }
    });
  }

  const totalInformed = closingDetails
    ? Object.values(closingDetails).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
    : 0;

  buf += LINE_THIN;
  buf += rowBold('TOTAL INFORMADO:', `R$ ${totalInformed.toFixed(2)}`);
  buf += LINE_THIN;

  // Saldo final
  buf += ALIGN_CENTER + BOLD_ON + 'SALDO FINAL' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;

  const adjustments = summary.adjustments as { sangria: number; reforco: number } || { sangria: 0, reforco: 0 };

  buf += row('Fundo de Caixa (Inicial)', `+ R$ ${(summary.initialAmount as number || 0).toFixed(2)}`);
  buf += row('Total de Vendas', `+ R$ ${(summary.totalSales as number || 0).toFixed(2)}`);
  if (adjustments.reforco > 0) buf += row('Reforços (+)', `+ R$ ${adjustments.reforco.toFixed(2)}`);
  if (adjustments.sangria > 0) buf += row('Sangrias (-)', `- R$ ${adjustments.sangria.toFixed(2)}`);

  const expectedAmount = (summary.initialAmount as number || 0) + (summary.totalSales as number || 0) + adjustments.reforco - adjustments.sangria;

  buf += LINE;
  buf += rowBold('ESPERADO PELO SISTEMA', `R$ ${expectedAmount.toFixed(2)}`);
  buf += rowBold('INFORMADO POR VOCÊ', `R$ ${totalInformed.toFixed(2)}`);
  buf += LINE;

  const difference = Math.round((totalInformed - expectedAmount) * 100) / 100;
  if (difference !== 0) {
    if (difference > 0) {
      buf += ALIGN_CENTER + BOLD_ON + `SOBRA: + R$ ${difference.toFixed(2)}\n` + BOLD_OFF + ALIGN_LEFT;
    } else {
      buf += ALIGN_CENTER + BOLD_ON + `FALTA: - R$ ${Math.abs(difference).toFixed(2)}\n` + BOLD_OFF + ALIGN_LEFT;
    }
  } else {
    buf += ALIGN_CENTER + BOLD_ON + 'CAIXA CONFERE - SEM INCONSISTÊNCIAS\n' + BOLD_OFF + ALIGN_LEFT;
  }
  buf += LINE;

  if (summary.notes) {
    buf += BOLD_ON + 'OBSERVAÇÕES:\n' + BOLD_OFF;
    const notes = (summary.notes as string).toUpperCase();
    for (let i = 0; i < notes.length; i += W) {
      buf += notes.substring(i, i + W) + '\n';
    }
    buf += '\n';
  }

  buf += '\nASSINATURA RESPONSÁVEL:\n\n';
  buf += '____________________________________\n\n';
  buf += ALIGN_CENTER + BOLD_ON + 'KICARDÁPIO@\n' + BOLD_OFF + ALIGN_LEFT;

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
  const LINE = '================================================\n';
  const LINE_THIN = '------------------------------------------------\n';
  const W = 48;

  function row(label: string, value: string): string {
    return `${label.padEnd(W - 14)}${value}\n`;
  }

  function rowBold(label: string, value: string): string {
    return BOLD_ON + row(label, value) + BOLD_OFF;
  }

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  let buf = '';
  buf += ALIGN_LEFT + FONT_NORMAL;

  // Header
  buf += ALIGN_CENTER + FONT_DOUBLE + (info.name?.toUpperCase() || 'KICARDÁPIO') + '\n' + FONT_NORMAL + ALIGN_LEFT;
  if (info.cnpj) buf += ALIGN_CENTER + `CNPJ: ${info.cnpj}\n` + ALIGN_LEFT;
  if (info.address) buf += ALIGN_CENTER + `${info.address.substring(0, W)}\n` + ALIGN_LEFT;

  buf += '\n' + LINE;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + '  COMPROVANTE DE ACERTO  ' + '\n' + FONT_NORMAL + ALIGN_LEFT;
  buf += LINE;

  // Período
  buf += `Data:     ${date}\n`;
  buf += `Período:  ${startTime} às ${endTime}\n`;
  buf += LINE_THIN;

  // Entregador
  buf += ALIGN_CENTER + BOLD_ON + 'ENTREGADOR' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += ALIGN_CENTER + FONT_DOUBLE_W + settlement.driverName.toUpperCase() + '\n' + FONT_NORMAL + ALIGN_LEFT;
  buf += `ID: ${settlement.driverId.slice(0, 8)}\n`;
  buf += LINE_THIN;

  // Resumo
  buf += ALIGN_CENTER + BOLD_ON + 'RESUMO DAS ENTREGAS' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;
  buf += rowBold('TOTAL DE ENTREGAS:', String(settlement.totalOrders));
  buf += LINE_THIN;

  // Detalhamento financeiro
  buf += ALIGN_CENTER + BOLD_ON + 'DETALHAMENTO FINANCEIRO' + '\n' + BOLD_OFF + ALIGN_LEFT;
  buf += LINE_THIN;
  buf += row('Dinheiro (Mão)', formatCurrency(settlement.cash));
  buf += row('Cartão (Machine)', formatCurrency(settlement.card));
  buf += row('PIX (Transferência)', formatCurrency(settlement.pix));
  buf += row('Taxas de Entrega', `- ${formatCurrency(settlement.deliveryFees)}`);
  buf += LINE_THIN;

  // Totais
  buf += LINE;
  buf += rowBold('TOTAL A RECEBER:', formatCurrency(settlement.totalToPay));
  buf += rowBold('LÍQUIDO LOJA:', formatCurrency(settlement.storeNet));
  if (settlement.totalOrders > 0) {
    buf += ALIGN_CENTER + `(${formatCurrency(settlement.storeNet / settlement.totalOrders)}/ent)\n` + ALIGN_LEFT;
  }
  buf += LINE;

  // Assinaturas
  buf += '\nASSINATURA DO ENTREGADOR:\n\n';
  buf += '_________________________________________\n\n';
  buf += 'ASSINATURA DO CAIXA:\n\n';
  buf += '_________________________________________\n\n';

  buf += LINE_THIN;
  buf += ALIGN_CENTER + `Emitido em: ${formatSP(new Date(), "dd/MM/yyyy HH:mm")}\n` + ALIGN_LEFT;
  buf += ALIGN_CENTER + 'KICARDÁPIO - Sistema de Gestão\n' + ALIGN_LEFT;

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
