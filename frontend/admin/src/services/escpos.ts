import type { Order, OrderItem } from '../types';
import { formatSP } from '@/lib/timezone';

// ─── COMANDOS ESC/POS BÁSICOS ─────────────────────────────────────────
const ESC = '\x1b';
const GS = '\x1d';

const Cmd = {
  INIT:          ESC + '@',
  BOLD_ON:       ESC + 'E' + '\x01',
  BOLD_OFF:      ESC + 'E' + '\x00',
  ALIGN_LEFT:    ESC + 'a' + '\x00',
  ALIGN_CENTER:  ESC + 'a' + '\x01',
  ALIGN_RIGHT:   ESC + 'a' + '\x02',
  FONT_NORMAL:   ESC + '!' + '\x00',
  FONT_SMALL:    ESC + '!' + '\x01',
  FONT_MEDIUM:   ESC + '!' + '\x11',
  FONT_BOLD:     ESC + '!' + '\x08',
  FONT_BOLD_MED: ESC + '!' + '\x18',
  FONT_DOUBLE_W: ESC + '!' + '\x20',
  FONT_DOUBLE:   ESC + '!' + '\x30',
  UNDERLINE_ON:  ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FEED_LINES:    (n: number) => ESC + 'd' + String.fromCharCode(n),
  CUT_PAPER:     GS + 'V' + '\x00',
  CUT_PARTIAL:   GS + 'V' + '\x01',
};

function line(char: string = '-', width: number = 42): string {
  return char.repeat(width) + '\n';
}

interface EscPosSettings {
  showLogo?: boolean;
  showAddress?: boolean;
  headerText?: string;
  footerText?: string;
  paperFeed?: number;
  useInit?: boolean;
}

interface RestaurantInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  cnpj?: string | null;
}

export function generateEscPosReceipt(
  order: Order,
  itemsToPrint: OrderItem[],
  title: string,
  settings: EscPosSettings,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  isProduction: boolean = false
): string {
  let buf = '';

  const shouldUseInit = settings.useInit ?? false;
  if (shouldUseInit) buf += Cmd.INIT;
  buf += Cmd.ALIGN_LEFT + Cmd.FONT_NORMAL;

  const W = 42;

  // ═══════════ CABEÇALHO ═══════════
  if (!isProduction) {
    buf += Cmd.ALIGN_CENTER + Cmd.FONT_DOUBLE;
    buf += (restaurantInfo.name || 'KICARDÁPIO').toUpperCase() + '\n';
    buf += Cmd.FONT_NORMAL;

    if ((restaurantInfo as RestaurantInfo).cnpj) {
      buf += `CNPJ: ${(restaurantInfo as RestaurantInfo).cnpj}\n`;
    }

    // Endereço sempre visível se existir
    const addr = (restaurantInfo as RestaurantInfo).address;
    if (addr) {
      const addrStr = String(addr);
      if (addrStr.length <= W) {
        buf += addrStr + '\n';
      } else {
        // Quebra em 2 linhas se necessário
        const mid = Math.floor(W / 2);
        let breakPoint = addrStr.lastIndexOf(' ', mid);
        if (breakPoint < 10) breakPoint = mid;
        buf += addrStr.substring(0, breakPoint) + '\n';
        buf += addrStr.substring(breakPoint + 1, W * 2) + '\n';
      }
    }

    if ((restaurantInfo as RestaurantInfo).phone) {
      buf += `TEL: ${(restaurantInfo as RestaurantInfo).phone}\n`;
    }

    buf += Cmd.ALIGN_LEFT + line('-', W);

    if (settings.headerText) {
      buf += Cmd.ALIGN_CENTER + Cmd.BOLD_ON;
      buf += settings.headerText.toUpperCase().substring(0, W) + '\n';
      buf += Cmd.BOLD_OFF + Cmd.ALIGN_LEFT;
      buf += line('-', W);
    }
  }

  // ═══════════ TIPO DE PEDIDO ═══════════
  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
  let typeLabel = order.orderType === 'TABLE' ? `MESA ${order.tableNumber}` : (isPickup ? 'RETIRADA / BALCÃO' : 'ENTREGA');

  buf += Cmd.ALIGN_CENTER + Cmd.FONT_DOUBLE;
  buf += typeLabel + '\n';
  buf += Cmd.FONT_NORMAL + Cmd.ALIGN_LEFT;

  // ═══════════ INFO DO PEDIDO ═══════════
  const dateStr = formatSP(order.createdAt, 'dd/MM/yyyy HH:mm');
  buf += dateStr + '\n';

  if (order.user?.name) {
    buf += Cmd.BOLD_ON + `ATEND: ${order.user.name.toUpperCase()}\n` + Cmd.BOLD_OFF;
  }

  buf += Cmd.FONT_DOUBLE;
  buf += `PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}\n`;
  buf += Cmd.FONT_NORMAL;

  // ═══════════ DADOS DO CLIENTE ═══════════
  if (order.deliveryOrder) {
    buf += Cmd.BOLD_ON + `CLIENTE: ${(order.deliveryOrder.name || 'N/A').toUpperCase()}\n` + Cmd.BOLD_OFF;

    if (!isProduction) {
      buf += `FONE: ${order.deliveryOrder.phone || 'N/A'}\n`;

      if (!isPickup && order.deliveryOrder.address) {
        buf += Cmd.BOLD_ON + `END: ${order.deliveryOrder.address.toUpperCase()}\n` + Cmd.BOLD_OFF;
      }
    }
  }

  buf += line('-', W);

  // ═══════════ TÍTULO DA VIA ═══════════
  if (title) {
    buf += Cmd.ALIGN_CENTER + Cmd.BOLD_ON + title.toUpperCase() + '\n' + Cmd.BOLD_OFF + Cmd.ALIGN_LEFT;
    buf += line('-', W);
  }

  // ═══════════ ITENS ═══════════
  buf += Cmd.BOLD_ON;
  if (isProduction) {
    buf += 'QTD  PRODUTO\n';
  } else {
    buf += 'QTD  DESCRIÇÃO'.padEnd(28) + 'VALOR\n';
  }
  buf += Cmd.BOLD_OFF;
  buf += line('-', W);

  (itemsToPrint || []).forEach(item => {
    const productName = item.product?.name || 'Produto';
    const qty = item.quantity || 1;

    if (isProduction) {
      buf += Cmd.BOLD_ON + `${qty}x ${productName.toUpperCase()}\n` + Cmd.BOLD_OFF;
    } else {
      const totalItem = ((item.priceAtTime || 0) * qty).toFixed(2);
      buf += Cmd.BOLD_ON + `${qty}x ${productName.toUpperCase()}`.padEnd(28) + `R$ ${totalItem}\n` + Cmd.BOLD_OFF;
    }

    // Sabores - NEGRITO
    if (item.flavorsJson) {
      try {
        const flavors = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
        if (Array.isArray(flavors)) {
          flavors.forEach((f: { name: string }) => {
            buf += Cmd.BOLD_ON + `  SABOR: ${(f.name || '').toUpperCase()}\n` + Cmd.BOLD_OFF;
          });
        }
      } catch { /* empty */ }
    }

    // Tamanho - NEGRITO
    if (item.sizeJson) {
      try {
        const size = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
        buf += Cmd.BOLD_ON + `  TAMANHO: ${(size.name || '').toUpperCase()}\n` + Cmd.BOLD_OFF;
      } catch { /* empty */ }
    }

    // Adicionais - NEGRITO DESTACADO
    if (item.addonsJson) {
      try {
        const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
        if (Array.isArray(addons)) {
          addons.forEach((a: { name: string; quantity?: number }) => {
            const prefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
            buf += Cmd.BOLD_ON + `  + ${prefix}${(a.name || '').toUpperCase()}\n` + Cmd.BOLD_OFF;
          });
        }
      } catch { /* empty */ }
    }

    // Observação do item - NEGRITO + SUBLINHADO
    if (item.observations) {
      buf += Cmd.BOLD_ON + Cmd.UNDERLINE_ON;
      buf += `  OBS: ${item.observations.toUpperCase()}\n`;
      buf += Cmd.UNDERLINE_OFF + Cmd.BOLD_OFF;
    }

    buf += '\n';
  });

  buf += line('-', W);

  // ═══════════ OBSERVAÇÃO GERAL ═══════════
  const generalObs = (order as { notes?: string }).notes || order.deliveryOrder?.notes;
  if (generalObs) {
    buf += Cmd.BOLD_ON + Cmd.UNDERLINE_ON;
    buf += `OBS GERAL: ${generalObs.toUpperCase()}\n`;
    buf += Cmd.UNDERLINE_OFF + Cmd.BOLD_OFF;
    buf += line('-', W);
  }

  // ═══════════ TOTAIS E PAGAMENTO ═══════════
  if (!isProduction) {
    const totalQty = (itemsToPrint || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
    buf += Cmd.BOLD_ON + `QTD ITENS: ${totalQty}\n` + Cmd.BOLD_OFF;
    buf += line('-', W);

    const subtotal = order.total || 0;
    const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
    const discount = (order as { discount?: number }).discount || 0;
    const extraCharge = (order as { extraCharge?: number }).extraCharge || 0;
    const totalGeral = subtotal + deliveryFee - discount + extraCharge;

    buf += `SUBTOTAL`.padEnd(28) + `R$ ${subtotal.toFixed(2)}\n`;
    if (deliveryFee > 0) buf += `TAXA ENTREGA`.padEnd(28) + `R$ ${deliveryFee.toFixed(2)}\n`;
    if (discount > 0) buf += `DESCONTO (-)`.padEnd(28) + `R$ ${discount.toFixed(2)}\n`;

    buf += line('=', W);
    buf += Cmd.FONT_DOUBLE;
    buf += `TOTAL`.padEnd(28) + `R$ ${totalGeral.toFixed(2)}\n`;
    buf += Cmd.FONT_NORMAL;
    buf += line('=', W);

    // Pagamento
    buf += Cmd.BOLD_ON + 'PAGAMENTO:\n' + Cmd.BOLD_OFF;

    const methodMap: Record<string, string> = {
      cash: 'DINHEIRO', credit_card: 'CARTÃO CRÉDITO', debit_card: 'CARTÃO DÉBITO',
      pix: 'PIX', meal_voucher: 'VALE REFEIÇÃO', card: 'CARTÃO (PDV)',
    };

    if (order.payments && order.payments.length > 0) {
      order.payments.forEach((p: { method: string; amount: number }) => {
        const method = methodMap[p.method] || p.method.toUpperCase();
        buf += `${method.padEnd(28)}R$ ${p.amount.toFixed(2)}\n`;
      });
    } else if (order.deliveryOrder?.paymentMethod) {
      const method = methodMap[order.deliveryOrder.paymentMethod] || order.deliveryOrder.paymentMethod.toUpperCase();
      buf += `${method}\n`;
    } else {
      buf += 'A PAGAR NO CAIXA\n';
    }

    buf += line('-', W);
  } else {
    buf += Cmd.ALIGN_CENTER + Cmd.BOLD_ON + '*** FIM DA PRODUÇÃO ***\n' + Cmd.BOLD_OFF + Cmd.ALIGN_LEFT;
  }

  // ═══════════ RODAPÉ ═══════════
  if (!isProduction && settings.footerText) {
    buf += Cmd.ALIGN_CENTER + Cmd.BOLD_ON;
    buf += settings.footerText.toUpperCase().substring(0, W * 2) + '\n';
    buf += Cmd.BOLD_OFF + Cmd.ALIGN_LEFT;
  }

  buf += Cmd.ALIGN_CENTER;
  buf += `ID: ${order.id}\n`;
  buf += Cmd.BOLD_ON + 'KICARDÁPIO@\n' + Cmd.BOLD_OFF;
  buf += Cmd.ALIGN_LEFT;

  const feedLines = settings.paperFeed ?? 3;
  buf += Cmd.FEED_LINES(feedLines);
  buf += Cmd.CUT_PAPER;

  return buf;
}

// ─── CONVERSÃO PARA BASE64 ───────────────────────────────────────────
export function escPosToBase64(escPosString: string): string {
  const bytes = new Uint8Array(escPosString.length);
  for (let i = 0; i < escPosString.length; i++) {
    bytes[i] = escPosString.charCodeAt(i) & 0xff;
  }
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
