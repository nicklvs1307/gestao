import jsPDF from 'jspdf';
import type { Order, OrderItem } from '../types';
import { format } from 'date-fns';
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
const sendToAgent = async (printer: string, content: string, type: 'escpos' | 'pdf' = 'pdf') => {
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
  if (configMode === 'escpos') return 'escpos';
  if (configMode === 'pdf') return 'pdf';
  // Auto: ESC/POS para impressoras de rede, PDF para USB/local
  return isNetworkPrinter(printer) ? 'escpos' : 'pdf';
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
  };
}

// ─── GERADOR DE PDF (FALLBACK) ────────────────────────────────────────
const getBase64Image = async (url: string): Promise<string | null> => {
  if (!url) return null;
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const response = await fetch(fullUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Falha ao carregar logo para impressão:", e);
    return null;
  }
};

const generateOrderReceiptPdf = (
  order: Order,
  itemsToPrint: OrderItem[],
  title: string,
  settings: ReceiptSettings,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  logoBase64: string | null,
  isProduction: boolean = false
): string => {
  const fontSizes = { small: 7, medium: 9, large: 11 };
  const baseSize = fontSizes[settings.fontSize] || 9;
  const leftMargin = 5;
  const rightMargin = 75;
  const maxContentWidth = 55;
  const centerX = 40;
  const lineHeight = baseSize * 0.42;

  const drawContent = (doc: jsPDF): number => {
    let y = 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize);

    if (!isProduction && settings.showLogo && logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 25, y, 30, 20);
        y += 22;
      } catch (err) { console.error("Erro ao inserir logo:", err); }
    }

    if (!isProduction) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize + 1);
      doc.text(restaurantInfo.name?.toUpperCase() || 'KICARDÁPIO', centerX, y, { align: 'center' });
      y += lineHeight;

      doc.setFontSize(baseSize - 1);
      doc.setFont('helvetica', 'normal');
      if (restaurantInfo.cnpj) {
        doc.text(`CNPJ: ${restaurantInfo.cnpj}`, centerX, y, { align: 'center' });
        y += lineHeight;
      }
      if (restaurantInfo.address) {
        const addrLines = doc.splitTextToSize(restaurantInfo.address, 70);
        doc.text(addrLines, centerX, y, { align: 'center' });
        y += (addrLines.length * lineHeight);
      }
      if (restaurantInfo.phone) {
        doc.text(`TEL: ${restaurantInfo.phone}`, centerX, y, { align: 'center' });
        y += lineHeight;
      }
      y += 1;
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      if (settings.headerText) {
        const headerLines = doc.splitTextToSize(settings.headerText.toUpperCase(), 70);
        doc.setFont('helvetica', 'bold');
        doc.text(headerLines, centerX, y, { align: 'center' });
        y += (headerLines.length * lineHeight) + 1;
        doc.text('------------------------------------------------', centerX, y, { align: 'center' });
        y += lineHeight;
      }
    }

    const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
    const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
    let typeLabel = order.orderType === 'TABLE' ? `MESA ${order.tableNumber}` : (isPickup ? 'RETIRADA/BALCÃO' : 'ENTREGA');

    y += 1;
    doc.setFontSize(baseSize + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(typeLabel, centerX, y, { align: 'center' });
    y += lineHeight + 1;

    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'normal');
    const dateStr = format(new Date(order.createdAt), "dd/MM/yyyy HH:mm");
    doc.text(dateStr, rightMargin, y, { align: 'right' });
    if (order.user?.name) {
      doc.setFont('helvetica', 'bold');
      doc.text(`ATEND: ${order.user.name.toUpperCase()}`, leftMargin, y);
    }
    y += lineHeight;

    doc.setFontSize(baseSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`, leftMargin, y);
    y += lineHeight;

    if (order.deliveryOrder) {
      doc.setFontSize(baseSize - 1);
      doc.setFont('helvetica', 'bold');
      doc.text(`CLIENTE: ${order.deliveryOrder.name || 'N/A'}`, leftMargin, y);
      y += lineHeight;
      if (!isProduction) {
        doc.setFont('helvetica', 'normal');
        doc.text(`FONE: ${order.deliveryOrder.phone || 'N/A'}`, leftMargin, y);
        y += lineHeight;
        if (!isPickup && order.deliveryOrder.address) {
          doc.setFont('helvetica', 'bold');
          const addrLines = doc.splitTextToSize(`END: ${order.deliveryOrder.address.toUpperCase()}`, 70);
          doc.text(addrLines, leftMargin, y);
          y += (addrLines.length * lineHeight);
        }
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    if (title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize);
      doc.text(title.toUpperCase(), centerX, y, { align: 'center' });
      y += lineHeight;
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
    }

    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'bold');
    if (isProduction) {
      doc.text('QTD  PRODUTO', leftMargin, y);
    } else {
      doc.text('QTD  DESCRIÇÃO', leftMargin, y);
      doc.text('VALOR', rightMargin, y, { align: 'right' });
    }
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    (itemsToPrint || []).forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize);
      const productText = `${item.quantity}x ${(item.product?.name || "Produto").toUpperCase()}`;
      const productLines = doc.splitTextToSize(productText, maxContentWidth + (isProduction ? 10 : 0));
      doc.text(productLines, leftMargin, y);
      if (!isProduction) {
        doc.text(((item.priceAtTime || 0) * (item.quantity || 0)).toFixed(2), rightMargin, y, { align: 'right' });
      }
      y += (productLines.length * lineHeight);

      doc.setFontSize(baseSize - 2);
      const detailMargin = leftMargin + 2;
      const detailWidth = 60;

      if (item.flavorsJson) {
        try {
          const flavors = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
          if (Array.isArray(flavors)) flavors.forEach((f: { name: string }) => {
            doc.setFont('helvetica', 'bold');
            const lines = doc.splitTextToSize(`> SABOR: ${(f.name || '').toUpperCase()}`, detailWidth);
            doc.text(lines, detailMargin, y);
            y += (lines.length * lineHeight);
          });
        } catch { /* empty */ }
      }
      if (item.sizeJson) {
        try {
          const size = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
          doc.setFont('helvetica', 'normal');
          doc.text(`> TAM: ${(size.name || '').toUpperCase()}`, detailMargin, y);
          y += lineHeight;
        } catch { /* empty */ }
      }
      if (item.addonsJson) {
        try {
          const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
          if (Array.isArray(addons)) addons.forEach((a: { name: string; quantity?: number }) => {
            doc.setFont('helvetica', 'bold');
            const qtyPrefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
            doc.text(`[+] ${qtyPrefix}${(a.name || '').toUpperCase()}`, detailMargin, y);
            y += lineHeight;
          });
        } catch { /* empty */ }
      }
      if (item.observations) {
        doc.setFont('helvetica', 'italic');
        const obsLines = doc.splitTextToSize(`(!) OBS: ${item.observations.toUpperCase()}`, detailWidth);
        doc.text(obsLines, detailMargin, y);
        y += (obsLines.length * lineHeight);
      }
      y += (settings.itemSpacing || 1);
    });

    y += 1;
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    if (!isProduction) {
      const totalQty = (itemsToPrint || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`QTD ITENS: ${totalQty}`, leftMargin, y);
      y += lineHeight;
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      const subtotal = order.total || 0;
      const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
      const discount = (order as { discount?: number }).discount || 0;
      const extraCharge = (order as { extraCharge?: number }).extraCharge || 0;
      const totalGeral = subtotal + deliveryFee - discount + extraCharge;

      doc.setFont('helvetica', 'normal');
      doc.text(`SUBTOTAL`, leftMargin, y);
      doc.text(`${subtotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;
      if (deliveryFee > 0) {
        doc.text(`TAXA ENTREGA`, leftMargin, y);
        doc.text(`${deliveryFee.toFixed(2)}`, rightMargin, y, { align: 'right' });
        y += lineHeight;
      }
      if (discount > 0) {
        doc.text(`DESCONTO (-)`, leftMargin, y);
        doc.text(`${discount.toFixed(2)}`, rightMargin, y, { align: 'right' });
        y += lineHeight;
      }
      doc.setFontSize(baseSize + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL`, leftMargin, y);
      doc.text(`${totalGeral.toFixed(2)}`, rightMargin, y, { align: 'right' });
      doc.setFontSize(baseSize - 1);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      doc.setFont('helvetica', 'bold');
      doc.text('PAGAMENTO:', leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const methodMap: Record<string, string> = { cash: 'DINHEIRO', credit_card: 'CARTÃO CRÉDITO', debit_card: 'CARTÃO DÉBITO', pix: 'PIX', meal_voucher: 'VALE REFEIÇÃO', card: 'CARTÃO (PDV)' };
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((p: { method: string; amount: number }) => {
          doc.text(`(${methodMap[p.method] || p.method.toUpperCase()})`, leftMargin, y);
          doc.text(`${p.amount.toFixed(2)}`, rightMargin, y, { align: 'right' });
          y += lineHeight;
        });
      } else if (order.deliveryOrder?.paymentMethod) {
        doc.text(`(${methodMap[order.deliveryOrder.paymentMethod] || order.deliveryOrder.paymentMethod.toUpperCase()})`, leftMargin, y);
        y += lineHeight;
      } else {
        doc.text('A PAGAR NO CAIXA', leftMargin, y);
        y += lineHeight;
      }
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text('*** FIM DA PRODUÇÃO ***', centerX, y, { align: 'center' });
      y += lineHeight;
    }

    if (!isProduction && settings.footerText) {
      const footerLines = doc.splitTextToSize(settings.footerText.toUpperCase(), 70);
      doc.setFont('helvetica', 'bold');
      doc.text(footerLines, centerX, y, { align: 'center' });
      y += (footerLines.length * lineHeight) + 1;
    }

    doc.setFontSize(baseSize - 3);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${order.id}`, leftMargin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('KICARDAPIO@', centerX, y, { align: 'center' });
    y += 8;
    return y;
  };

  const tempDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 2000] });
  const finalHeight = drawContent(tempDoc);
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: [80, finalHeight]
  });
  drawContent(doc);
  return doc.output('datauristring').split(',')[1];
};

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
    finalSettings = { showLogo: true, showAddress: true, fontSize: 'medium', headerText: '', footerText: '', itemSpacing: 2 };
  }

  const finalRestaurant = restaurantInfo || getRestaurantInfoFromStorage();

  // Pré-carregar logo apenas para PDF
  let logoBase64: string | null = null;
  if (finalSettings.showLogo && finalRestaurant.logoUrl) {
    logoBase64 = await getBase64Image(finalRestaurant.logoUrl);
  }

  const isTable = order.orderType === 'TABLE';
  const isCompleted = order.status === 'COMPLETED';

  // ── 1. IMPRESSÃO DO CAIXA (Via do Cliente / Extrato) ──
  const shouldPrintCashier = !isTable || (isTable && isCompleted);

  if (shouldPrintCashier && finalConfig.cashierPrinters?.length > 0) {
    for (const printer of finalConfig.cashierPrinters) {
      const mode = detectPrintMode(printer, finalConfig.printMode);

      if (mode === 'escpos') {
        const escPos = generateEscPosReceipt(order, order.items, isTable ? "EXTRATO DE CONTA" : "VIA CAIXA", finalSettings, finalRestaurant, false);
        await sendToAgent(printer, escPosToBase64(escPos), 'escpos');
      } else {
        const pdf = generateOrderReceiptPdf(order, order.items, isTable ? "EXTRATO DE CONTA" : "VIA CAIXA", finalSettings, finalRestaurant, logoBase64, false);
        await sendToAgent(printer, pdf, 'pdf');
      }
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
        const mode = detectPrintMode(k.printer, finalConfig.printMode);
        if (mode === 'escpos') {
          const escPos = generateEscPosReceipt(order, items, `VIA ${k.name.toUpperCase()}`, finalSettings, finalRestaurant, true);
          await sendToAgent(k.printer, escPosToBase64(escPos), 'escpos');
        } else {
          const pdf = generateOrderReceiptPdf(order, items, `VIA ${k.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
          await sendToAgent(k.printer, pdf, 'pdf');
        }
      }
    }

    // Bares
    for (const b of (finalConfig.barPrinters || [])) {
      const items = productionGroups[b.id];
      if (items && items.length > 0) {
        const mode = detectPrintMode(b.printer, finalConfig.printMode);
        if (mode === 'escpos') {
          const escPos = generateEscPosReceipt(order, items, `VIA ${b.name.toUpperCase()}`, finalSettings, finalRestaurant, true);
          await sendToAgent(b.printer, escPosToBase64(escPos), 'escpos');
        } else {
          const pdf = generateOrderReceiptPdf(order, items, `VIA ${b.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
          await sendToAgent(b.printer, pdf, 'pdf');
        }
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

  const baseSize = 9;
  const leftMargin = 5;
  const rightMargin = 75;
  const centerX = 40;
  const lineHeight = baseSize * 0.42;

  // Agregar itens dos pedidos da sessão
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

      // Agregar adicionais
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

  const drawContent = (doc: jsPDF): number => {
    let y = 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize);

    // Header do Restaurante
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 1);
    doc.text(info.name?.toUpperCase() || 'KICARDÁPIO', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'normal');
    if (info.cnpj) {
      doc.text(`CNPJ: ${info.cnpj}`, centerX, y, { align: 'center' });
      y += lineHeight;
    }
    if (info.address) {
      const addrLines = doc.splitTextToSize(info.address, 70);
      doc.text(addrLines, centerX, y, { align: 'center' });
      y += (addrLines.length * lineHeight);
    }
    if (info.phone) {
      doc.text(`TEL: ${info.phone}`, centerX, y, { align: 'center' });
      y += lineHeight;
    }
    y += 1;

    // Título
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize + 4);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHAMENTO DE CAIXA', centerX, y, { align: 'center' });
    y += lineHeight + 1;

    // Dados da sessão
    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'normal');
    doc.text(`ABERTURA: ${format(new Date(summary.openedAt as string), "dd/MM/yyyy HH:mm")}`, leftMargin, y);
    y += lineHeight;
    doc.text(`FECHAMENTO: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, leftMargin, y);
    y += lineHeight;

    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Resumo de quantidade
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL DE PEDIDOS: ${totalOrders}`, leftMargin, y);
    y += lineHeight;
    doc.text(`TOTAL DE ITENS: ${totalItems}`, leftMargin, y);
    y += lineHeight;
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Detalhamento de Produtos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize);
    doc.text('PRODUTOS VENDIDOS', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('QTD  DESCRIÇÃO', leftMargin, y);
    doc.text('VALOR', rightMargin, y, { align: 'right' });
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    const sortedItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
    sortedItems.forEach(item => {
      // Nome do produto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize);
      const productText = `${item.qty}x ${item.name.toUpperCase()}`;
      const productLines = doc.splitTextToSize(productText, 55);
      doc.text(productLines, leftMargin, y);
      doc.text(item.total.toFixed(2), rightMargin, y, { align: 'right' });
      y += (productLines.length * lineHeight);

      // Adicionais do produto
      doc.setFontSize(baseSize - 2);
      Object.entries(item.addons).forEach(([addonName, addonData]) => {
        doc.setFont('helvetica', 'normal');
        const addonText = `[+] ${addonData.qty}x ${addonName}`;
        const addonLines = doc.splitTextToSize(addonText, 50);
        doc.text(addonLines, leftMargin + 3, y);
        doc.text(addonData.total.toFixed(2), rightMargin, y, { align: 'right' });
        y += (addonLines.length * lineHeight);
      });

      y += 1;
    });

    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Resumo de Vendas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize);
    doc.text('RESUMO DE VENDAS', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    const salesByMethod = summary.salesByMethod as Record<string, number> || {};
    Object.entries(salesByMethod).forEach(([method, amount]) => {
      doc.text(methodMap[method] || method.toUpperCase(), leftMargin, y);
      doc.text(`R$ ${(amount as number).toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;
    });

    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL VENDAS', leftMargin, y);
    doc.text(`R$ ${(summary.totalSales as number || 0).toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Valores Informados na Contagem
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize);
    doc.text('VALORES INFORMADOS', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    if (closingDetails) {
      Object.entries(closingDetails).forEach(([method, value]) => {
        const numVal = parseFloat(value) || 0;
        if (numVal > 0) {
          doc.text(methodMap[method] || method.toUpperCase(), leftMargin, y);
          doc.text(`R$ ${numVal.toFixed(2)}`, rightMargin, y, { align: 'right' });
          y += lineHeight;
        }
      });
    }

    const totalInformed = closingDetails
      ? Object.values(closingDetails).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      : 0;

    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL INFORMADO', leftMargin, y);
    doc.text(`R$ ${totalInformed.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Saldo Final
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize);
    doc.text('SALDO FINAL', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.text('Fundo de Caixa (Inicial)', leftMargin, y);
    doc.text(`+ R$ ${(summary.initialAmount as number || 0).toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;
    doc.text('Total de Vendas', leftMargin, y);
    doc.text(`+ R$ ${(summary.totalSales as number || 0).toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;

    const adjustments = summary.adjustments as { sangria: number; reforco: number } || { sangria: 0, reforco: 0 };
    if (adjustments.reforco > 0) {
      doc.text('Reforços (+)', leftMargin, y);
      doc.text(`+ R$ ${adjustments.reforco.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;
    }
    if (adjustments.sangria > 0) {
      doc.text('Sangrias (-)', leftMargin, y);
      doc.text(`- R$ ${adjustments.sangria.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;
    }

    const expectedAmount = (summary.initialAmount as number || 0) + (summary.totalSales as number || 0) + adjustments.reforco - adjustments.sangria;
    y += 1;
    doc.setFontSize(baseSize);
    doc.setFont('helvetica', 'bold');
    doc.text('ESPERADO PELO SISTEMA', leftMargin, y);
    doc.text(`R$ ${expectedAmount.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;

    doc.text('INFORMADO POR VOCÊ', leftMargin, y);
    doc.text(`R$ ${totalInformed.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;

    // Diferença / Inconsistência
    const difference = Math.round((totalInformed - expectedAmount) * 100) / 100;
    if (difference !== 0) {
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
      if (difference > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text(`SOBRA: + R$ ${difference.toFixed(2)}`, centerX, y, { align: 'center' });
      } else {
        doc.setTextColor(200, 0, 0);
        doc.text(`FALTA: - R$ ${Math.abs(difference).toFixed(2)}`, centerX, y, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0);
      y += lineHeight;
    } else {
      doc.text('------------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text('CAIXA CONFERE - SEM INCONSISTÊNCIAS', centerX, y, { align: 'center' });
      y += lineHeight;
    }

    doc.setFontSize(baseSize - 1);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Observações
    if (summary.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES:', leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize((summary.notes as string).toUpperCase(), 70);
      doc.text(noteLines, leftMargin, y);
      y += (noteLines.length * lineHeight) + 2;
    }

    // Assinatura
    doc.setFontSize(baseSize - 1);
    doc.text("ASSINATURA RESPONSÁVEL:", leftMargin, y);
    y += 15;
    doc.text('____________________________________', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('KICARDÁPIO@', centerX, y, { align: 'center' });
    y += 10;

    return y;
  };

  const tempDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 2000] });
  const finalHeight = drawContent(tempDoc);
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: [80, finalHeight]
  });
  drawContent(doc);
  const pdf = doc.output('datauristring').split(',')[1];

  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      await sendToAgent(p, pdf, 'pdf');
    }
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
  
  // Margens reais (em mm) - 12mm = 1.2cm
  const TOP_MARGIN = 12;
  const BOTTOM_MARGIN = 12;
  const LEFT_MARGIN = 5;
  
  const baseSize = 9;
  const leftMargin = LEFT_MARGIN;
  const rightMargin = 75;
  const centerX = 40;
  const lineHeight = baseSize * 0.42;

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const drawContent = (doc: jsPDF, startY: number): number => {
    let y = startY;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize);

    // Header do Restaurante
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 1);
    doc.text(info.name?.toUpperCase() || 'KICARDÁPIO', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'normal');
    if (info.cnpj) {
      doc.text(`CNPJ: ${info.cnpj}`, centerX, y, { align: 'center' });
      y += lineHeight;
    }
    if (info.address) {
      const addrLines = doc.splitTextToSize(info.address, 70);
      doc.text(addrLines, centerX, y, { align: 'center' });
      y += (addrLines.length * lineHeight);
    }
    y += 1;

    // Título
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize + 4);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE ACERTO', centerX, y, { align: 'center' });
    y += lineHeight + 1;

    // Dados do período
    doc.setFontSize(baseSize - 1);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATA: ${date}`, leftMargin, y);
    y += lineHeight;
    doc.text(`PERÍODO: ${startTime} às ${endTime}`, leftMargin, y);
    y += lineHeight + 1;

    // Dados do entregador
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('ENTREGADOR', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(baseSize + 1);
    doc.text(settlement.driverName.toUpperCase(), centerX, y, { align: 'center' });
    y += lineHeight + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize - 1);
    doc.text(`ID: ${settlement.driverId.slice(0, 8)}`, leftMargin, y);
    y += lineHeight + 1;

    // Resumo de entregas
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DAS ENTREGAS', centerX, y, { align: 'center' });
    y += lineHeight + 1;

    doc.setFont('helvetica', 'normal');
    doc.text(`TOTAL DE ENTREGAS: ${settlement.totalOrders}`, leftMargin, y);
    y += lineHeight + 1;

    // Detalhamento por método de pagamento
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO FINANCEIRO', centerX, y, { align: 'center' });
    y += lineHeight + 1;

    doc.setFont('helvetica', 'normal');
    // Dinheiro
    doc.text('DINHEIRO (MÃO):', leftMargin, y);
    doc.text(formatCurrency(settlement.cash), rightMargin, y, { align: 'right' });
    y += lineHeight;
    
    // Cartão
    doc.text('CARTÃO (MACHINE):', leftMargin, y);
    doc.text(formatCurrency(settlement.card), rightMargin, y, { align: 'right' });
    y += lineHeight;
    
    // PIX
    doc.text('PIX (TRANSFERÊNCIA):', leftMargin, y);
    doc.text(formatCurrency(settlement.pix), rightMargin, y, { align: 'right' });
    y += lineHeight;

    // Taxa de entrega
    doc.text('TAXAS DE ENTREGA:', leftMargin, y);
    doc.text(`- ${formatCurrency(settlement.deliveryFees)}`, rightMargin, y, { align: 'right' });
    y += lineHeight + 1;

    // Linha separadora
    doc.text('─────────────────────────────────────────────────', centerX, y, { align: 'center' });
    y += lineHeight;

    // Totais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 1);
    
    // Total a receber (repasse)
    doc.text('TOTAL A RECEBER:', leftMargin, y);
    doc.text(formatCurrency(settlement.totalToPay), rightMargin, y, { align: 'right' });
    y += lineHeight;

    // Líquido loja
    doc.text('LÍQUIDO LOJA:', leftMargin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize - 1);
    doc.text(`(${settlement.totalOrders > 0 ? formatCurrency(settlement.storeNet / settlement.totalOrders) + '/ent' : '-'})`, rightMargin + 15, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 1);
    doc.text(formatCurrency(settlement.storeNet), rightMargin, y, { align: 'right' });
    y += lineHeight + 2;

    // Assinatura
    doc.text('─────────────────────────────────────────────────', centerX, y, { align: 'center' });
    y += lineHeight + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(baseSize - 1);
    doc.text('ASSINATURA DO ENTREGADOR:', centerX, y, { align: 'center' });
    y += lineHeight + 6;
    doc.text('_________________________________________', centerX, y, { align: 'center' });
    y += lineHeight + 4;
    
    doc.text('ASSINATURA DO CAIXA:', centerX, y, { align: 'center' });
    y += lineHeight + 6;
    doc.text('_________________________________________', centerX, y, { align: 'center' });
    y += lineHeight + 2;

    // Rodapé
    doc.setFontSize(baseSize - 2);
    doc.text('------------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('KICARDÁPIO - Sistema de Gestão', centerX, y, { align: 'center' });
    y += 10;

    return y;
  };

  // 1. Medir altura do conteúdo com margem superior
  const tempDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 2000] });
  const contentBottom = drawContent(tempDoc, TOP_MARGIN);
  const contentHeight = contentBottom; // altura desde y=0 até o fim do conteúdo
  
  // 2. Criar PDF com tamanho exato + margem inferior
  const totalHeight = contentHeight + BOTTOM_MARGIN;
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: [80, totalHeight]
  });
  
  // 3. Desenhar conteúdo com margem superior
  drawContent(doc, TOP_MARGIN);
  const pdf = doc.output('datauristring').split(',')[1];

  console.log('[printDriverSettlement] PDF gerado:', contentHeight.toFixed(1), 'mm conteúdo,', totalHeight.toFixed(1), 'mm total');
  console.log('[printDriverSettlement] Margens: topo=' + TOP_MARGIN + 'mm, rodapé=' + BOTTOM_MARGIN + 'mm');

  // Imprime na impressora do caixa
  const config = getPrinterConfigFromStorage();
  if (config.cashierPrinters && config.cashierPrinters.length > 0) {
    for (const p of config.cashierPrinters) {
      console.log('[printDriverSettlement] Enviando para impressora:', p);
      await sendToAgent(p, pdf, 'pdf');
    }
    toast.success(`Comprovante de ${settlement.driverName} enviado para impressão!`);
  } else {
    console.log('[printDriverSettlement] Nenhuma impressora de caixa configurada, abrindo fallback');
    // Fallback: abre em nova aba para impressão manual
    try {
      const pdfDataUri = doc.output('datauristring');
      const pdfWindow = window.open('', '_blank');
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html>
            <head><title>Comprovante - ${settlement.driverName}</title></head>
            <body style="margin:0;display:flex;justify-content:center;">
              <iframe src="${pdfDataUri}" style="width:100%;height:100vh;border:none;"></iframe>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      } else {
        toast.error('Pop-up bloqueado! Permita pop-ups para imprimir.');
      }
    } catch (err) {
      console.error('[printDriverSettlement] Erro no fallback:', err);
      toast.error('Erro ao abrir comprovante para impressão.');
    }
  }
};
