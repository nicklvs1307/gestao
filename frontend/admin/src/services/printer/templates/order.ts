import type { Order, OrderItem } from '../../types';
import { formatSP } from '@/lib/timezone';
import { ESC_POS, PAPER_WIDTH, PAYMENT_METHOD_MAP } from '../constants';
import { 
  alignCenter, 
  bold, 
  double, 
  tallBold,
  doubleWrapped,
  formatCurrency, 
  formatPhone, 
  line, 
  rowItemSmart, 
  wrapText 
} from '../utils';
import type { ReceiptSettings, RestaurantInfo } from '../types';

function buildHeader(info: RestaurantInfo | Record<string, unknown>, settings: ReceiptSettings, width: number = PAPER_WIDTH): string {
  let buf = '';
  buf += ESC_POS.ALIGN_LEFT + ESC_POS.FONT_NORMAL;
  
  if (settings.useInit) buf += ESC_POS.INIT;

  const infoCasted = info as RestaurantInfo;
  buf += alignCenter(double((infoCasted.name || 'KICARDÁPIO').toUpperCase()));

  if (infoCasted.cnpj) buf += alignCenter(`CNPJ: ${infoCasted.cnpj}`);
  
  if (infoCasted.address) {
    buf += alignCenter(wrapText(String(infoCasted.address), width).trim());
  }

  if (infoCasted.phone) buf += alignCenter(`TEL: ${formatPhone(infoCasted.phone)}`);

  buf += line('-', width);

  if (settings.headerText) {
    buf += alignCenter(bold(settings.headerText.toUpperCase().substring(0, width * 2)));
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

  return alignCenter(double(typeLabel));
}

function buildOrderInfo(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  buf += formatSP(order.createdAt, 'dd/MM/yyyy HH:mm') + '\n';
  if (order.user?.name) {
    buf += bold(`ATEND: ${order.user.name.toUpperCase()}`) + '\n';
  }
  buf += double(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`) + ESC_POS.FONT_NORMAL + '\n';
  return buf;
}

function buildCustomerInfo(order: Order, isProduction: boolean, width: number = PAPER_WIDTH): string {
  let buf = '';
  if (!order.deliveryOrder) return buf;

  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
  const isDeliveryOrderType = order.orderType === 'DELIVERY';

  buf += bold(`CLIENTE: ${(order.deliveryOrder.name || 'N/A').toUpperCase()}`) + '\n';

  // Na produção, só mostrar o telefone se não for pickup, e o bairro em vez do endereço completo
  if (isProduction) {
    if (!isPickup) {
      // Extrai o bairro (o que vem depois do hífen e antes da vírgula)
      const addressParts = (order.deliveryOrder.address || '').split('-');
      let bairro = addressParts.length > 1 ? addressParts[1].split(',')[0].trim() : order.deliveryOrder.address;
      
      buf += line('-', width);
      buf += ESC_POS.ALIGN_CENTER;
      buf += bold(`BAIRRO: ${bairro?.toUpperCase() || 'N/A'}`) + '\n';
      buf += ESC_POS.ALIGN_LEFT;
    }
  } else if (!isProduction || isDeliveryOrderType) {
    // Cupom do caixa
    buf += bold(`FONE: ${order.deliveryOrder.phone || 'N/A'}`) + '\n';
    
    // Endereço sem rótulo, grande e em negrito.
    if (!isPickup && order.deliveryOrder.address) {
      buf += line('-', width);
      buf += ESC_POS.ALIGN_CENTER;
      buf += tallBold(wrapText(order.deliveryOrder.address.toUpperCase(), width).trim()) + '\n';
      buf += ESC_POS.ALIGN_LEFT;
    }
  }

  return buf;
}

function buildItems(items: OrderItem[], isProduction: boolean, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  buf += bold(isProduction ? 'QTD  PRODUTO\n' : 'QTD  DESCRIÇÃO'.padEnd(width - 12) + 'VALOR\n');
  buf += line('-', width);

  (items || []).forEach(item => {
    const productName = item.product?.name || 'Produto';
    const qty = item.quantity || 1;

    if (isProduction) {
      // Produto grande na cozinha (altura dupla)
      buf += tallBold(wrapText(`${qty}x ${productName.toUpperCase()}`, width).trim()) + '\n';
    } else {
      // Produto em negrito no cupom
      const totalItem = ((item.priceAtTime || 0) * qty);
      buf += bold(rowItemSmart(`${qty}x`, productName.toUpperCase(), formatCurrency(totalItem), width));
    }

    // Sabores (Agrupados caso tenham groupName, senão padrão)
    if (item.flavorsJson) {
      try {
        const flavors = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
        if (Array.isArray(flavors) && flavors.length > 0) {
          const groupedFlavors = flavors.reduce((acc: Record<string, any[]>, f: any) => {
            const g = f.groupName || 'SABORES';
            if (!acc[g]) acc[g] = [];
            acc[g].push(f);
            return acc;
          }, {});

          Object.entries(groupedFlavors).forEach(([groupName, groupItems]) => {
            buf += tallBold(wrapText(`  ${groupName.toUpperCase()}:`, width).trim()) + '\n';
            (groupItems as any[]).forEach(f => {
              buf += tallBold(wrapText(`    > ${f.name.toUpperCase()}`, width).trim()) + '\n';
            });
          });
        }
      } catch { /* ignore */ }
    }

    // Tamanho
    if (item.sizeJson) {
      try {
        const size = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
        buf += tallBold(wrapText(`  TAMANHO: ${(size.name || '').toUpperCase()}`, width).trim()) + '\n';
      } catch { /* ignore */ }
    }

    // Adicionais (Agrupados por groupName)
    if (item.addonsJson) {
      try {
        const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
        if (Array.isArray(addons) && addons.length > 0) {
          const groupedAddons = addons.reduce((acc: Record<string, any[]>, a: any) => {
            const g = a.groupName || 'ADICIONAIS';
            if (!acc[g]) acc[g] = [];
            acc[g].push(a);
            return acc;
          }, {});

          Object.entries(groupedAddons).forEach(([groupName, groupItems]) => {
            buf += tallBold(wrapText(`  ${groupName.toUpperCase()}:`, width).trim()) + '\n';
            (groupItems as any[]).forEach(a => {
              const prefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
              buf += tallBold(wrapText(`    + ${prefix}${a.name.toUpperCase()}`, width).trim()) + '\n';
            });
          });
        }
      } catch { /* ignore */ }
    }

    // Observação do item (suporta tanto item.observations do BD quanto item.observation do carrinho)
    const obs = item.observations || (item as any).observation;
    if (obs) {
      buf += tallBold(wrapText(`  * OBS: ${obs.toUpperCase()} *`, width).trim()) + '\n';
    }

    buf += '\n'; // Espaçamento entre itens
  });

  return buf;
}

function buildObservations(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  const generalObs = (order as { notes?: string }).notes || order.deliveryOrder?.notes;
  
  if (generalObs) {
    buf += line('-', width);
    buf += alignCenter(double(bold('** OBSERVACOES **')));
    buf += tallBold(wrapText(generalObs.toUpperCase(), width).trim()) + '\n';
    buf += line('-', width);
  }
  
  return buf;
}

function buildTotals(order: Order, items: OrderItem[], width: number = PAPER_WIDTH): string {
  let buf = '';
  
  const totalQty = (items || []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  buf += bold(`QTD ITENS: ${totalQty}\n`);
  buf += line('-', width);

  const subtotal = order.total || 0;
  const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
  const discount = (order as { discount?: number }).discount || 0;
  const extraCharge = (order as { extraCharge?: number }).extraCharge || 0;
  const totalGeral = subtotal + deliveryFee - discount + extraCharge;

  buf += `SUBTOTAL`.padEnd(width - 14) + formatCurrency(subtotal) + '\n';
  if (deliveryFee > 0) buf += `TAXA ENTREGA`.padEnd(width - 14) + formatCurrency(deliveryFee) + '\n';
  if (discount > 0) buf += `DESCONTO (-)`.padEnd(width - 14) + formatCurrency(discount) + '\n';

  buf += line('=', width);
  buf += double(`TOTAL`.padEnd((width / 2) - 3) + formatCurrency(totalGeral)) + '\n';
  buf += line('=', width);

  return buf;
}

function buildPaymentInfo(order: Order, width: number = PAPER_WIDTH): string {
  let buf = '';
  buf += bold('PAGAMENTO:\n');

  if (order.payments && order.payments.length > 0) {
    order.payments.forEach((p: { method: string; amount: number }) => {
      const method = PAYMENT_METHOD_MAP[p.method] || p.method.toUpperCase();
      buf += `${method.padEnd(width - 14)}R$ ${p.amount.toFixed(2)}\n`;
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

function buildFooter(order: Order, settings: ReceiptSettings, isProduction: boolean, width: number = PAPER_WIDTH): string {
  let buf = '';
  
  if (isProduction) {
    buf += alignCenter(bold(wrapText('BOM TRABALHO!', width).trim()));
  } else if (settings.footerText) {
    buf += alignCenter(bold(wrapText(settings.footerText.toUpperCase(), width).trim()));
  }

  buf += alignCenter(`ID: ${order.id}\n${bold('KICARDÁPIO@')}`);

  const feedLines = settings.paperFeed ?? 3;
  buf += ESC_POS.FEED_LINES(feedLines);
  buf += ESC_POS.CUT_PAPER;

  return buf;
}

export function generateEscPosReceipt(
  order: Order,
  itemsToPrint: OrderItem[],
  title: string,
  settings: ReceiptSettings,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  isProduction: boolean = false
): string {
  const W = PAPER_WIDTH; // TODO: Obter de settings no futuro
  let buf = '';

  if (!isProduction) buf += buildHeader(restaurantInfo, settings, W);
  
  buf += buildOrderType(order, W);
  buf += buildOrderInfo(order, W);

  if (order.deliveryOrder) buf += buildCustomerInfo(order, isProduction, W);

  buf += line('-', W);

  if (title) {
    buf += alignCenter(bold(title.toUpperCase()));
    buf += line('-', W);
  }

  buf += buildItems(itemsToPrint, isProduction, W);
  buf += buildObservations(order, W);

  if (!isProduction) {
    buf += buildTotals(order, itemsToPrint, W);
    buf += buildPaymentInfo(order, W);
  } else {
    buf += alignCenter(bold('*** FIM DA PRODUÇÃO ***'));
  }

  buf += buildFooter(order, settings, isProduction, W);
  return buf;
}
