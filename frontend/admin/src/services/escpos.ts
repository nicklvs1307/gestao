import type { Order, OrderItem } from '../types';
import { formatSP } from '@/lib/timezone';

// ─── COMANDOS ESC/POS BÁSICOS ─────────────────────────────────────────
const ESC = '\x1b';
const GS = '\x1d';

const Cmd = {
  INIT:          ESC + '@',           // Inicializar impressora
  BOLD_ON:       ESC + 'E' + '\x01',  // Negrito ligado
  BOLD_OFF:      ESC + 'E' + '\x00',  // Negrito desligado
  ALIGN_LEFT:    ESC + 'a' + '\x00',  // Alinhar à esquerda
  ALIGN_CENTER:  ESC + 'a' + '\x01',  // Centralizar
  ALIGN_RIGHT:    ESC + 'a' + '\x02',  // Alinhar à direita
  FONT_NORMAL:   ESC + '!' + '\x00',  // Fonte normal
  FONT_DOUBLE_H: ESC + '!' + '\x10',  // Altura dupla
  FONT_DOUBLE_W: ESC + '!' + '\x20',  // Largura dupla
  FONT_DOUBLE:   ESC + '!' + '\x30',  // Altura + largura dupla
  UNDERLINE_ON:  ESC + '-' + '\x01',  // Sublinhado ligado
  UNDERLINE_OFF: ESC + '-' + '\x00',  // Sublinhado desligado
  FEED_LINES:    (n: number) => ESC + 'd' + String.fromCharCode(n), // Avançar N linhas
  CUT_PAPER:     GS  + 'V' + '\x00',  // Corte total (sem feed extra)
  CUT_PAPER_PARTIAL: GS + 'V' + '\x01', // Corte parcial (sem feed extra)
  LINE_48:       '------------------------------------------------',
  LINE_32:       '--------------------------------',
};

// ─── HELPERS ──────────────────────────────────────────────────────────
function text(text: string): string {
  return text;
}

function line(char: string = '-', width: number = 42): string {
  return char.repeat(width) + '\n';
}

function center(text: string): string {
  return Cmd.ALIGN_CENTER + text + '\n' + Cmd.ALIGN_LEFT;
}

function bold(text: string): string {
  return Cmd.BOLD_ON + text + Cmd.BOLD_OFF;
}

function doubleSize(text: string): string {
  return Cmd.FONT_DOUBLE + text + Cmd.FONT_NORMAL;
}

// ─── GERADOR DE CUPOM ESC/POS ─────────────────────────────────────────
interface EscPosSettings {
  showLogo?: boolean;
  showAddress?: boolean;
  headerText?: string;
  footerText?: string;
  paperFeed?: number; // Linhas para avançar antes do corte (default: 3)
  useInit?: boolean; // Usar comando INIT (default: false)
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

  // Inicializar (opcional - desabilitado por padrão para evitar problemas com algumas impressoras)
  const shouldUseInit = settings.useInit ?? false;
  if (shouldUseInit) {
    buf += Cmd.INIT;
  }
  buf += Cmd.ALIGN_LEFT;
  buf += Cmd.FONT_NORMAL;

  const WIDTH = 42; // Largura padrão para impressoras de 80mm

  // ── CABEÇALHO (apenas para via caixa/cliente) ──
  if (!isProduction) {
    buf += Cmd.ALIGN_CENTER;
    buf += Cmd.FONT_DOUBLE;
    buf += text((restaurantInfo.name || 'KICARDÁPIO').toUpperCase()) + '\n';
    buf += Cmd.FONT_NORMAL;

    if ((restaurantInfo as RestaurantInfo).cnpj) {
      buf += text(`CNPJ: ${(restaurantInfo as RestaurantInfo).cnpj}`) + '\n';
    }
    if (settings.showAddress && (restaurantInfo as RestaurantInfo).address) {
      buf += text(String((restaurantInfo as RestaurantInfo).address).substring(0, WIDTH * 2)) + '\n';
    }
    if ((restaurantInfo as RestaurantInfo).phone) {
      buf += text(`TEL: ${(restaurantInfo as RestaurantInfo).phone}`) + '\n';
    }

    buf += Cmd.ALIGN_LEFT;
    buf += line('-', WIDTH);

    if (settings.headerText) {
      buf += Cmd.ALIGN_CENTER;
      buf += Cmd.BOLD_ON;
      buf += text(settings.headerText.toUpperCase().substring(0, WIDTH)) + '\n';
      buf += Cmd.BOLD_OFF;
      buf += Cmd.ALIGN_LEFT;
      buf += line('-', WIDTH);
    }
  }

  // ── TIPO DE PEDIDO ──
  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';

  let typeLabel = '';
  if (order.orderType === 'TABLE') {
    typeLabel = `MESA ${order.tableNumber}`;
  } else {
    typeLabel = isPickup ? 'RETIRADA / BALCÃO' : 'ENTREGA';
  }

  buf += Cmd.ALIGN_CENTER;
  buf += Cmd.FONT_DOUBLE;
  buf += text(typeLabel) + '\n';
  buf += Cmd.FONT_NORMAL;
  buf += Cmd.ALIGN_LEFT;

  // ── INFO DO PEDIDO ──
  const dateStr = formatSP(order.createdAt, 'dd/MM/yyyy HH:mm');
  buf += text(dateStr) + '\n';

  if (order.user?.name) {
    buf += Cmd.BOLD_ON;
    buf += text(`ATEND: ${order.user.name.toUpperCase()}`) + '\n';
    buf += Cmd.BOLD_OFF;
  }

  buf += Cmd.FONT_DOUBLE;
  buf += text(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`) + '\n';
  buf += Cmd.FONT_NORMAL;

  // ── DADOS DO CLIENTE ──
  if (order.deliveryOrder) {
    buf += Cmd.BOLD_ON;
    buf += text(`CLIENTE: ${(order.deliveryOrder.name || 'N/A').toUpperCase()}`) + '\n';
    buf += Cmd.BOLD_OFF;

    if (!isProduction) {
      buf += text(`FONE: ${order.deliveryOrder.phone || 'N/A'}`) + '\n';

      if (!isPickup && order.deliveryOrder.address) {
        buf += Cmd.BOLD_ON;
        buf += text(`END: ${order.deliveryOrder.address.toUpperCase()}`) + '\n';
        buf += Cmd.BOLD_OFF;
      }
    }
  }

  buf += line('-', WIDTH);

  // ── TÍTULO DA VIA ──
  if (title) {
    buf += Cmd.ALIGN_CENTER;
    buf += Cmd.BOLD_ON;
    buf += text(title.toUpperCase()) + '\n';
    buf += Cmd.BOLD_OFF;
    buf += Cmd.ALIGN_LEFT;
    buf += line('-', WIDTH);
  }

  // ── ITENS ──
  buf += Cmd.BOLD_ON;
  if (isProduction) {
    buf += text('QTD  PRODUTO\n');
  } else {
    buf += text('QTD  DESCRIÇÃO                VALOR\n');
  }
  buf += Cmd.BOLD_OFF;
  buf += line('-', WIDTH);

  (itemsToPrint || []).forEach(item => {
    const productName = item.product?.name || 'Produto';
    const qty = item.quantity || 1;

    if (isProduction) {
      buf += Cmd.BOLD_ON;
      buf += text(`${qty}x ${productName.toUpperCase()}\n`);
      buf += Cmd.BOLD_OFF;
    } else {
      const totalItem = ((item.priceAtTime || 0) * qty).toFixed(2);
      const namePart = `${qty}x ${productName.toUpperCase()}`;
      const paddedName = namePart.substring(0, 28).padEnd(28);
      buf += Cmd.BOLD_ON;
      buf += text(`${paddedName}R$ ${totalItem}\n`);
      buf += Cmd.BOLD_OFF;
    }

    // Sabores
    if (item.flavorsJson) {
      try {
        const flavors = typeof item.flavorsJson === 'string'
          ? JSON.parse(item.flavorsJson)
          : item.flavorsJson;
        if (Array.isArray(flavors)) {
          flavors.forEach((f: { name: string }) => {
            buf += text(`  > SABOR: ${(f.name || '').toUpperCase()}\n`);
          });
        }
      } catch { /* ignore */ }
    }

    // Tamanho
    if (item.sizeJson) {
      try {
        const size = typeof item.sizeJson === 'string'
          ? JSON.parse(item.sizeJson)
          : item.sizeJson;
        buf += text(`  > TAM: ${(size.name || '').toUpperCase()}\n`);
      } catch { /* ignore */ }
    }

    // Adicionais
    if (item.addonsJson) {
      try {
        const addons = typeof item.addonsJson === 'string'
          ? JSON.parse(item.addonsJson)
          : item.addonsJson;
        if (Array.isArray(addons)) {
          addons.forEach((a: { name: string; quantity?: number }) => {
            const prefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
            buf += Cmd.BOLD_ON;
            buf += text(`  [+] ${prefix}${(a.name || '').toUpperCase()}\n`);
            buf += Cmd.BOLD_OFF;
          });
        }
      } catch { /* ignore */ }
    }

    // Observação do item
    if (item.observations) {
      buf += Cmd.UNDERLINE_ON;
      buf += text(`  (!) OBS: ${item.observations.toUpperCase()}\n`);
      buf += Cmd.UNDERLINE_OFF;
    }

    buf += '\n'; // Espaço entre itens
  });

  buf += line('-', WIDTH);

  // ── OBSERVAÇÃO GERAL ──
  const generalObs = (order as { notes?: string }).notes ||
    order.deliveryOrder?.notes;
  if (generalObs) {
    buf += Cmd.BOLD_ON;
    buf += text(`OBS GERAL: ${generalObs.toUpperCase()}\n`);
    buf += Cmd.BOLD_OFF;
    buf += line('-', WIDTH);
  }

  // ── TOTAIS E PAGAMENTO (apenas via caixa) ──
  if (!isProduction) {
    const totalQty = (itemsToPrint || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
    buf += text(`QTD ITENS: ${totalQty}\n`);
    buf += line('-', WIDTH);

    const subtotal = order.total || 0;
    const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
    const discount = (order as { discount?: number }).discount || 0;
    const extraCharge = (order as { extraCharge?: number }).extraCharge || 0;
    const totalGeral = subtotal + deliveryFee - discount + extraCharge;

    buf += text(`SUBTOTAL`.padEnd(30) + `R$ ${subtotal.toFixed(2)}\n`);

    if (deliveryFee > 0) {
      buf += text(`TAXA ENTREGA`.padEnd(30) + `R$ ${deliveryFee.toFixed(2)}\n`);
    }
    if (discount > 0) {
      buf += text(`DESCONTO (-)`.padEnd(30) + `R$ ${discount.toFixed(2)}\n`);
    }

    buf += line('-', WIDTH);
    buf += Cmd.FONT_DOUBLE;
    buf += text(`TOTAL`.padEnd(30) + `R$ ${totalGeral.toFixed(2)}\n`);
    buf += Cmd.FONT_NORMAL;
    buf += line('-', WIDTH);

    // Pagamento
    buf += Cmd.BOLD_ON;
    buf += text('PAGAMENTO:\n');
    buf += Cmd.BOLD_OFF;

    const methodMap: Record<string, string> = {
      cash: 'DINHEIRO',
      credit_card: 'CARTÃO CRÉDITO',
      debit_card: 'CARTÃO DÉBITO',
      pix: 'PIX',
      meal_voucher: 'VALE REFEIÇÃO',
      card: 'CARTÃO (PDV)',
    };

    if (order.payments && order.payments.length > 0) {
      order.payments.forEach((p: { method: string; amount: number }) => {
        const method = methodMap[p.method] || p.method.toUpperCase();
        buf += text(`${method.padEnd(30)}R$ ${p.amount.toFixed(2)}\n`);
      });
    } else if (order.deliveryOrder?.paymentMethod) {
      const method = methodMap[order.deliveryOrder.paymentMethod] || order.deliveryOrder.paymentMethod.toUpperCase();
      buf += text(`${method}\n`);
    } else {
      buf += text('A PAGAR NO CAIXA\n');
    }

    buf += line('-', WIDTH);
  } else {
    buf += Cmd.ALIGN_CENTER;
    buf += Cmd.BOLD_ON;
    buf += text('*** FIM DA PRODUÇÃO ***\n');
    buf += Cmd.BOLD_OFF;
    buf += Cmd.ALIGN_LEFT;
  }

  // ── RODAPÉ ──
  if (!isProduction && settings.footerText) {
    buf += Cmd.ALIGN_CENTER;
    buf += Cmd.BOLD_ON;
    buf += text(settings.footerText.toUpperCase().substring(0, WIDTH * 2)) + '\n';
    buf += Cmd.BOLD_OFF;
    buf += Cmd.ALIGN_LEFT;
  }

  buf += Cmd.ALIGN_CENTER;
  buf += text(`ID: ${order.id}\n`);
  buf += Cmd.BOLD_ON;
  buf += text('KICARDÁPIO@\n');
  buf += Cmd.BOLD_OFF;
  buf += Cmd.ALIGN_LEFT;

  // Avançar papel e cortar
  const feedLines = settings.paperFeed ?? 3;
  buf += Cmd.FEED_LINES(feedLines);
  buf += Cmd.CUT_PAPER;

  return buf;
}

// ─── CONVERSÃO PARA BASE64 (envio via HTTP) ───────────────────────────
export function escPosToBase64(escPosString: string): string {
  // Converte string para bytes (suporta acentos via latin1)
  const bytes = new Uint8Array(escPosString.length);
  for (let i = 0; i < escPosString.length; i++) {
    bytes[i] = escPosString.charCodeAt(i) & 0xff;
  }
  // Converte bytes para base64
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
