import type { Order, OrderItem } from '../types';
import { formatSP } from '@/lib/timezone';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES ESC/POS
// ═══════════════════════════════════════════════════════════════════════════

const ESC = '\x1b';
const GS = '\x1d';

export const ESC_POS = {
  INIT: ESC + '@',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  FONT_NORMAL: ESC + '!' + '\x00',
  FONT_SMALL: ESC + '!' + '\x01',
  FONT_MEDIUM: ESC + '!' + '\x11',
  FONT_BOLD: ESC + '!' + '\x08',
  FONT_BOLD_MED: ESC + '!' + '\x18',
  FONT_DOUBLE_W: ESC + '!' + '\x20',
  FONT_DOUBLE: ESC + '!' + '\x30',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FEED_LINES: (n: number) => ESC + 'd' + String.fromCharCode(n),
  CUT_PAPER: GS + 'V' + '\x00',
  CUT_PARTIAL: GS + 'V' + '\x01',
} as const;

// Largura padrão do papel 80mm = 42 chars
export const PAPER_WIDTH = 42;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ReceiptSettings {
  showLogo?: boolean;
  showAddress?: boolean;
  headerText?: string;
  footerText?: string;
  paperFeed?: number;
  useInit?: boolean;
}

export interface RestaurantInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  cnpj?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPAS DE TRADUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: 'DINHEIRO',
  dinheiro: 'DINHEIRO',
  credit_card: 'CARTÃO CRÉDITO',
  credito: 'CARTÃO CRÉDITO',
  debit_card: 'CARTÃO DÉBITO',
  debito: 'CARTÃO DÉBITO',
  pix: 'PIX',
  meal_voucher: 'VALE REFEIÇÃO',
  vale_refeicao: 'VALE REFEIÇÃO',
  card: 'CARTÃO (PDV)',
  other: 'OUTROS',
};

const PAYMENT_METHOD_CLOSURE_MAP: Record<string, string> = {
  cash: 'DINHEIRO',
  dinheiro: 'DINHEIRO',
  credit_card: 'CARTÃO CRÉDITO',
  credito: 'CARTÃO CRÉDITO',
  debit_card: 'CARTÃO DÉBITO',
  debito: 'CARTÃO DÉBITO',
  pix: 'PIX',
  meal_voucher: 'VALE REFEIÇÃO',
  vale_refeicao: 'VALE REFEIÇÃO',
  card: 'CARTÃO (PDV)',
  other: 'OUTROS',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - CONSTRUÇÃO DE LINHAS
// ═══════════════════════════════════════════════════════════════════════════

function line(char: string = '-', width: number = PAPER_WIDTH): string {
  return char.repeat(width) + '\n';
}

function alignCenter(text: string): string {
  return ESC_POS.ALIGN_CENTER + text + '\n' + ESC_POS.ALIGN_LEFT;
}

function alignRight(text: string): string {
  return ESC_POS.ALIGN_RIGHT + text + '\n' + ESC_POS.ALIGN_LEFT;
}

function bold(text: string): string {
  return ESC_POS.BOLD_ON + text + ESC_POS.BOLD_OFF;
}

function double(text: string): string {
  return ESC_POS.FONT_DOUBLE + text + ESC_POS.FONT_NORMAL;
}

function doubleWidth(text: string): string {
  return ESC_POS.FONT_DOUBLE_W + text + ESC_POS.FONT_NORMAL;
}

function row(label: string, value: string, width: number = PAPER_WIDTH): string {
  const padding = width - 14;
  return `${label.padEnd(padding)}${value}\n`;
}

function rowBold(label: string, value: string, width: number = PAPER_WIDTH): string {
  return bold(row(label, value, width));
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function formatCurrencyBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function wrapText(text: string, width: number = PAPER_WIDTH): string {
  let result = '';
  for (let i = 0; i < text.length; i += width) {
    result += text.substring(i, i + width) + '\n';
  }
  return result;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  return phone;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILDERS - CABEÇALHO E RODAPÉ
// ═══════════════════════════════════════════════════════════════════════════

function buildHeader(info: RestaurantInfo | Record<string, unknown>, settings: ReceiptSettings, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  buf += ESC_POS.ALIGN_LEFT + ESC_POS.FONT_NORMAL;
  
  if (settings.useInit) {
    buf += ESC_POS.INIT;
  }

  // Nome do restaurante
  const infoCasted = info as RestaurantInfo;
  buf += ESC_POS.ALIGN_CENTER + double((infoCasted.name || 'KICARDÁPIO').toUpperCase()) + ESC_POS.ALIGN_LEFT;

  // CNPJ
  const cnpj = infoCasted.cnpj;
  if (cnpj) {
    buf += ESC_POS.ALIGN_CENTER + `CNPJ: ${cnpj}` + ESC_POS.ALIGN_LEFT;
  }

  // Endereço
  const address = infoCasted.address;
  if (address) {
    const addrStr = String(address);
    if (addrStr.length <= width) {
      buf += ESC_POS.ALIGN_CENTER + addrStr + ESC_POS.ALIGN_LEFT;
    } else {
      const mid = Math.floor(width / 2);
      const breakPoint = addrStr.lastIndexOf(' ', mid);
      const bp = breakPoint < 10 ? mid : breakPoint;
      buf += ESC_POS.ALIGN_CENTER + addrStr.substring(0, bp) + ESC_POS.ALIGN_LEFT;
      buf += ESC_POS.ALIGN_CENTER + addrStr.substring(bp + 1, width * 2) + ESC_POS.ALIGN_LEFT;
    }
  }

  // Telefone
  const phone = (info as RestaurantInfo).phone;
  if (phone) {
    buf += ESC_POS.ALIGN_CENTER + `TEL: ${formatPhone(phone)}` + ESC_POS.ALIGN_LEFT;
  }

  buf += line('-', width);

  // Texto adicional do header
  if (settings.headerText) {
    buf += ESC_POS.ALIGN_CENTER + bold(settings.headerText.toUpperCase().substring(0, width * 2)) + ESC_POS.ALIGN_LEFT;
    buf += line('-', width);
  }

  return buf;
}

function buildOrderType(order: Order, width: number = PAPER_WIDTH): string {
  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
  
  let typeLabel: string;
  if (order.orderType === 'TABLE') {
    typeLabel = `MESA ${order.tableNumber}`;
  } else if (isPickup) {
    typeLabel = 'RETIRADA / BALCÃO';
  } else {
    typeLabel = 'ENTREGA';
  }

  return ESC_POS.ALIGN_CENTER + double(typeLabel) + ESC_POS.ALIGN_LEFT;
}

function buildOrderInfo(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  // Data/Hora
  buf += formatSP(order.createdAt, 'dd/MM/yyyy HH:mm') + '\n';

  // Atendente
  if (order.user?.name) {
    buf += bold(`ATEND: ${order.user.name.toUpperCase()}`) + '\n';
  }

  // Número do pedido
  buf += double(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`) + ESC_POS.FONT_NORMAL;

  return buf;
}

function buildCustomerInfo(order: Order, isProduction: boolean, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  if (!order.deliveryOrder) return buf;

  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';

  buf += bold(`CLIENTE: ${(order.deliveryOrder.name || 'N/A').toUpperCase()}`) + '\n';

  if (!isProduction) {
    buf += `FONE: ${order.deliveryOrder.phone || 'N/A'}\n`;

    if (!isPickup && order.deliveryOrder.address) {
      buf += bold(`END: ${order.deliveryOrder.address.toUpperCase()}`) + '\n';
    }
  }

  return buf;
}

function buildItems(
  items: OrderItem[],
  isProduction: boolean,
  width: number = PAPER_WIDTH
): string {
  let buf = '';
  
  // Cabeçalho da tabela de itens
  buf += bold;
  if (isProduction) {
    buf += 'QTD  PRODUTO\n';
  } else {
    buf += 'QTD  DESCRIÇÃO'.padEnd(28) + 'VALOR\n';
  }
  buf += ESC_POS.BOLD_OFF;
  buf += line('-', width);

  // Itens
  (items || []).forEach(item => {
    const productName = item.product?.name || 'Produto';
    const qty = item.quantity || 1;

    if (isProduction) {
      buf += ESC_POS.BOLD_ON + `${qty}x ${productName.toUpperCase()}` + '\n' + ESC_POS.BOLD_OFF;
    } else {
      const totalItem = ((item.priceAtTime || 0) * qty);
      buf += ESC_POS.BOLD_ON + `${qty}x ${productName.toUpperCase()}`.padEnd(28) + formatCurrency(totalItem) + '\n' + ESC_POS.BOLD_OFF;
    }

    // Sabores
    if (item.flavorsJson) {
      try {
        const flavors = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
        if (Array.isArray(flavors)) {
          flavors.forEach((f: { name: string }) => {
            buf += ESC_POS.BOLD_ON + `  SABOR: ${(f.name || '').toUpperCase()}` + '\n' + ESC_POS.BOLD_OFF;
          });
        }
      } catch { /* ignore */ }
    }

    // Tamanho
    if (item.sizeJson) {
      try {
        const size = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
        buf += ESC_POS.BOLD_ON + `  TAMANHO: ${(size.name || '').toUpperCase()}` + '\n' + ESC_POS.BOLD_OFF;
      } catch { /* ignore */ }
    }

    // Adicionais
    if (item.addonsJson) {
      try {
        const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
        if (Array.isArray(addons)) {
          addons.forEach((a: { name: string; quantity?: number }) => {
            const prefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
            buf += ESC_POS.BOLD_ON + `  + ${prefix}${(a.name || '').toUpperCase()}` + '\n' + ESC_POS.BOLD_OFF;
          });
        }
      } catch { /* ignore */ }
    }

    // Observação do item
    if (item.observations) {
      buf += ESC_POS.BOLD_ON + ESC_POS.UNDERLINE_ON + `  OBS: ${item.observations.toUpperCase()}` + '\n' + ESC_POS.UNDERLINE_OFF + ESC_POS.BOLD_OFF;
    }

    buf += '\n';
  });

  return buf;
}

function buildObservations(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  const generalObs = (order as { notes?: string }).notes || order.deliveryOrder?.notes;
  
  if (generalObs) {
    buf += ESC_POS.BOLD_ON + ESC_POS.UNDERLINE_ON + `OBS GERAL: ${generalObs.toUpperCase()}` + '\n' + ESC_POS.UNDERLINE_OFF + ESC_POS.BOLD_OFF;
    buf += line('-', width);
  }
  
  return buf;
}

function buildTotals(order: Order, items: OrderItem[], width: number = PAPER_WIDTH): string {
  let buf = '';
  
  const totalQty = (items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  buf += ESC_POS.BOLD_ON + `QTD ITENS: ${totalQty}` + '\n' + ESC_POS.BOLD_OFF;
  buf += line('-', width);

  const subtotal = order.total || 0;
  const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
  const discount = (order as { discount?: number }).discount || 0;
  const extraCharge = (order as { extraCharge?: number }).extraCharge || 0;
  const totalGeral = subtotal + deliveryFee - discount + extraCharge;

  buf += `SUBTOTAL`.padEnd(28) + formatCurrency(subtotal) + '\n';
  if (deliveryFee > 0) {
    buf += `TAXA ENTREGA`.padEnd(28) + formatCurrency(deliveryFee) + '\n';
  }
  if (discount > 0) {
    buf += `DESCONTO (-)`.padEnd(28) + formatCurrency(discount) + '\n';
  }

  buf += line('=', width);
  buf += double(`TOTAL`.padEnd(28) + formatCurrency(totalGeral)) + ESC_POS.FONT_NORMAL;
  buf += line('=', width);

  return buf;
}

function buildPaymentInfo(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  buf += ESC_POS.BOLD_ON + 'PAGAMENTO:' + '\n' + ESC_POS.BOLD_OFF;

  if (order.payments && order.payments.length > 0) {
    order.payments.forEach((p: { method: string; amount: number }) => {
      const method = PAYMENT_METHOD_MAP[p.method] || p.method.toUpperCase();
      buf += `${method.padEnd(28)}R$ ${p.amount.toFixed(2)}` + '\n';
    });
  } else if (order.deliveryOrder?.paymentMethod) {
    const method = PAYMENT_METHOD_MAP[order.deliveryOrder.paymentMethod] || order.deliveryOrder.paymentMethod.toUpperCase();
    buf += method + '\n';
  } else {
    buf += 'A PAGAR NO CAIXA\n';
  }

  buf += line('-', width);
  
  return buf;
}

function buildFooter(order: Order, settings: ReceiptSettings, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  if (settings.footerText) {
    buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + settings.footerText.toUpperCase().substring(0, width * 2) + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  }

  buf += ESC_POS.ALIGN_CENTER;
  buf += `ID: ${order.id}` + '\n';
  buf += ESC_POS.BOLD_ON + 'KICARDÁPIO@' + '\n' + ESC_POS.BOLD_OFF;
  buf += ESC_POS.ALIGN_LEFT;

  const feedLines = settings.paperFeed ?? 3;
  buf += ESC_POS.FEED_LINES(feedLines);
  buf += ESC_POS.CUT_PAPER;

  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS DE GERAÇÃO DE RECEIPTS
// ═══════════════════════════════════════════════════════════════════════════

export function generateEscPosReceipt(
  order: Order,
  itemsToPrint: OrderItem[],
  title: string,
  settings: ReceiptSettings,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  isProduction: boolean = false
): string {
  const W = PAPER_WIDTH;
  let buf = '';

  // Cabeçalho (apenas para não-produção)
  if (!isProduction) {
    buf += buildHeader(restaurantInfo, settings, W);
  }

  // Tipo de pedido
  buf += buildOrderType(order, W);

  // Info do pedido
  buf += buildOrderInfo(order, W);

  // Dados do cliente (apenas para delivery/retirada)
  if (order.deliveryOrder) {
    buf += buildCustomerInfo(order, isProduction, W);
  }

  buf += line('-', W);

  // Título da via
  if (title) {
    buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + title.toUpperCase() + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
    buf += line('-', W);
  }

  // Itens
  buf += buildItems(itemsToPrint, isProduction, W);

  // Observações gerais
  buf += buildObservations(order, W);

  // Totais e pagamento (apenas para não-produção)
  if (!isProduction) {
    buf += buildTotals(order, itemsToPrint, W);
    buf += buildPaymentInfo(order, W);
  } else {
    buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + '*** FIM DA PRODUÇÃO ***' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  }

  // Rodapé
  buf += buildFooter(order, settings, W);

  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════
// GERAÇÃO DE FECHAMENTO DE CAIXA
// ═══════════════════════════════════════════════════════════════════════════

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
}

export function generateCashierClosureReceipt(
  closure: CashierClosureData,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  closingDetails?: Record<string, string>,
  sessionOrders?: unknown[]
): string {
  const W = PAPER_WIDTH;
  let buf = '';

  // ═══ CABEÇALHO ═══
  buf += ESC_POS.ALIGN_LEFT + ESC_POS.FONT_NORMAL;
  const infoClosure = restaurantInfo as RestaurantInfo;
  buf += ESC_POS.ALIGN_CENTER + double((infoClosure.name || 'KICARDÁPIO').toUpperCase()) + ESC_POS.ALIGN_LEFT;
  
  if (infoClosure.cnpj) {
    buf += ESC_POS.ALIGN_CENTER + `CNPJ: ${infoClosure.cnpj}` + ESC_POS.ALIGN_LEFT;
  }
  if (infoClosure.address) {
    buf += ESC_POS.ALIGN_CENTER + infoClosure.address.substring(0, W) + ESC_POS.ALIGN_LEFT;
  }
  if (infoClosure.phone) {
    buf += ESC_POS.ALIGN_CENTER + `TEL: ${formatPhone(infoClosure.phone)}` + ESC_POS.ALIGN_LEFT;
  }

  buf += '\n' + line('=', W);
  buf += ESC_POS.ALIGN_CENTER + doubleWidth('  FECHAMENTO DE CAIXA  ') + ESC_POS.ALIGN_LEFT;
  buf += line('=', W);

  // ═══ DADOS DA SESSÃO ═══
  buf += `Abertura:   ${formatSP(closure.openedAt as string, 'dd/MM/yyyy HH:mm')}\n`;
  buf += `Fechamento: ${formatSP(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
  buf += line('-', W);
  buf += rowBold('TOTAL DE PEDIDOS:', String(closure.totalOrders), W);
  buf += rowBold('TOTAL DE ITENS:', String(closure.totalItems), W);
  buf += line('-', W);

  // ═══ PRODUTOS VENDIDOS ═══
  if (closure.items && closure.items.length > 0) {
    buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'PRODUTOS VENDIDOS' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
    buf += line('-', W);
    buf += ESC_POS.BOLD_ON + 'QTD  DESCRIÇÃO'.padEnd(W - 14) + 'VALOR\n' + ESC_POS.BOLD_OFF;
    buf += line('-', W);

    const sortedItems = [...closure.items].sort((a, b) => b.qty - a.qty);
    sortedItems.forEach(item => {
      buf += ESC_POS.BOLD_ON + `${item.qty}x ${item.name.toUpperCase()}`.padEnd(W - 14) + formatCurrency(item.total) + '\n' + ESC_POS.BOLD_OFF;
      if (item.addons) {
        Object.entries(item.addons).forEach(([addonName, addonData]) => {
          buf += (`  [+] ${addonData.qty}x ${addonName}`).padEnd(W - 14) + formatCurrency(addonData.total) + '\n';
        });
      }
    });

    buf += line('-', W);
  }

  // ═══ RESUMO DE VENDAS ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'RESUMO DE VENDAS' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += line('-', W);

  Object.entries(closure.salesByMethod).forEach(([method, amount]) => {
    const label = PAYMENT_METHOD_CLOSURE_MAP[method] || method.toUpperCase();
    buf += row(label, formatCurrency(amount as number), W);
  });

  buf += line('-', W);
  buf += rowBold('TOTAL VENDAS:', formatCurrency(closure.totalSales), W);
  buf += line('-', W);

  // ═══ VALORES INFORMADOS ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'VALORES INFORMADOS' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += line('-', W);

  let totalInformed = 0;
  if (closingDetails) {
    Object.entries(closingDetails).forEach(([method, value]) => {
      const numVal = parseFloat(value) || 0;
      if (numVal > 0) {
        const label = PAYMENT_METHOD_CLOSURE_MAP[method] || method.toUpperCase();
        buf += row(label, formatCurrency(numVal), W);
        totalInformed += numVal;
      }
    });
  }

  buf += line('-', W);
  buf += rowBold('TOTAL INFORMADO:', formatCurrency(totalInformed), W);
  buf += line('-', W);

  // ═══ SALDO FINAL ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'SALDO FINAL' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += line('-', W);

  buf += row('Fundo de Caixa (Inicial)', `+ ${formatCurrency(closure.initialAmount)}`, W);
  buf += row('Total de Vendas', `+ ${formatCurrency(closure.totalSales)}`, W);
  if (closure.adjustments.reforco > 0) {
    buf += row('Reforços (+)', `+ ${formatCurrency(closure.adjustments.reforco)}`, W);
  }
  if (closure.adjustments.sangria > 0) {
    buf += row('Sangrias (-)', `- ${formatCurrency(closure.adjustments.sangria)}`, W);
  }

  const expectedAmount = closure.initialAmount + closure.totalSales + closure.adjustments.reforco - closure.adjustments.sangria;

  buf += line('=', W);
  buf += rowBold('ESPERADO PELO SISTEMA', formatCurrency(expectedAmount), W);
  buf += rowBold('INFORMADO POR VOCÊ', formatCurrency(totalInformed), W);
  buf += line('=', W);

  const difference = Math.round((totalInformed - expectedAmount) * 100) / 100;
  if (difference !== 0) {
    if (difference > 0) {
      buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + `SOBRA: + ${formatCurrency(difference)}` + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
    } else {
      buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + `FALTA: - ${formatCurrency(Math.abs(difference))}` + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
    }
  } else {
    buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'CAIXA CONFERE - SEM INCONSISTÊNCIAS' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  }
  buf += line('=', W);

  // ═══ OBSERVAÇÕES ═══
  if (closure.notes) {
    buf += ESC_POS.BOLD_ON + 'OBSERVAÇÕES:' + '\n' + ESC_POS.BOLD_OFF;
    const notes = (closure.notes as string).toUpperCase();
    buf += wrapText(notes, W) + '\n';
  }

  buf += '\nASSINATURA RESPONSÁVEL:\n\n';
  buf += '____________________________________\n\n';
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'KICARDÁPIO@' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;

  buf += ESC_POS.FEED_LINES(5) + ESC_POS.CUT_PAPER;

  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════
// GERAÇÃO DE ACERTO DE ENTREGADOR
// ═══════════════════════════════════════════════════════════════════════════

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

export function generateDriverSettlementReceipt(
  settlement: DriverSettlementData,
  date: string,
  startTime: string,
  endTime: string,
  restaurantInfo: RestaurantInfo | Record<string, unknown>
): string {
  const W = PAPER_WIDTH;
  let buf = '';

  // ═══ CABEÇALHO ═══
  buf += ESC_POS.ALIGN_LEFT + ESC_POS.FONT_NORMAL;
  const infoDriver = restaurantInfo as RestaurantInfo;
  buf += ESC_POS.ALIGN_CENTER + double((infoDriver.name || 'KICARDÁPIO').toUpperCase()) + ESC_POS.ALIGN_LEFT;
  
  if (infoDriver.cnpj) {
    buf += ESC_POS.ALIGN_CENTER + `CNPJ: ${infoDriver.cnpj}` + ESC_POS.ALIGN_LEFT;
  }
  if (infoDriver.address) {
    buf += ESC_POS.ALIGN_CENTER + infoDriver.address.substring(0, W) + ESC_POS.ALIGN_LEFT;
  }

  buf += '\n' + line('=', W);
  buf += ESC_POS.ALIGN_CENTER + doubleWidth('  COMPROVANTE DE ACERTO  ') + ESC_POS.ALIGN_LEFT;
  buf += line('=', W);

  // ═══ PERÍODO ═══
  buf += `Data:     ${date}\n`;
  buf += `Período:  ${startTime} às ${endTime}\n`;
  buf += line('-', W);

  // ═══ ENTREGADOR ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'ENTREGADOR' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += ESC_POS.ALIGN_CENTER + doubleWidth(settlement.driverName.toUpperCase()) + ESC_POS.ALIGN_LEFT;
  buf += `ID: ${settlement.driverId.slice(0, 8)}\n`;
  buf += line('-', W);

  // ═══ RESUMO ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'RESUMO DAS ENTREGAS' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += line('-', W);
  buf += rowBold('TOTAL DE ENTREGAS:', String(settlement.totalOrders), W);
  buf += line('-', W);

  // ═══ DETALHAMENTO FINANCEIRO ═══
  buf += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + 'DETALHAMENTO FINANCEIRO' + '\n' + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT;
  buf += line('-', W);
  buf += row('Dinheiro (Mão)', formatCurrencyBRL(settlement.cash), W);
  buf += row('Cartão (Machine)', formatCurrencyBRL(settlement.card), W);
  buf += row('PIX (Transferência)', formatCurrencyBRL(settlement.pix), W);
  buf += row('Taxas de Entrega', `- ${formatCurrencyBRL(settlement.deliveryFees)}`, W);
  buf += line('-', W);

  // ═══ TOTAIS ═══
  buf += line('=', W);
  buf += rowBold('TOTAL A RECEBER:', formatCurrencyBRL(settlement.totalToPay), W);
  buf += rowBold('LÍQUIDO LOJA:', formatCurrencyBRL(settlement.storeNet), W);
  if (settlement.totalOrders > 0) {
    buf += ESC_POS.ALIGN_CENTER + `(${formatCurrencyBRL(settlement.storeNet / settlement.totalOrders)}/ent)` + ESC_POS.ALIGN_LEFT;
  }
  buf += line('=', W);

  // ═══ ASSINATURAS ═══
  buf += '\nASSINATURA DO ENTREGADOR:\n\n';
  buf += '_________________________________________\n\n';
  buf += 'ASSINATURA DO CAIXA:\n\n';
  buf += '_________________________________________\n\n';

  buf += line('-', W);
  buf += ESC_POS.ALIGN_CENTER + `Emitido em: ${formatSP(new Date(), 'dd/MM/yyyy HH:mm')}` + ESC_POS.ALIGN_LEFT;
  buf += ESC_POS.ALIGN_CENTER + 'KICARDÁPIO - Sistema de Gestão' + ESC_POS.ALIGN_LEFT;

  buf += ESC_POS.FEED_LINES(5) + ESC_POS.CUT_PAPER;

  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSÃO PARA BASE64
// ═══════════════════════════════════════════════════════════════════════════

export function escPosToBase64(escPosString: string): string {
  const bytes = new Uint8Array(escPosString.length);
  for (let i = 0; i < escPosString.length; i++) {
    bytes[i] = escPosString.charCodeAt(i) & 0xff;
  }
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}