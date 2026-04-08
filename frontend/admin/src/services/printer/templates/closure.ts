import { formatSP } from '@/lib/timezone';
import { ESC_POS, PAPER_WIDTH, PAYMENT_METHOD_CLOSURE_MAP } from '../constants';
import { 
  alignCenter, 
  double, 
  doubleWidth, 
  formatCurrency, 
  formatPhone, 
  line, 
  row, 
  rowBold, 
  wrapText,
  bold
} from '../utils';
import type { CashierClosureData, RestaurantInfo } from '../types';

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
  buf += alignCenter(double((infoClosure.name || 'KICARDÁPIO').toUpperCase()));
  
  if (infoClosure.cnpj) buf += alignCenter(`CNPJ: ${infoClosure.cnpj}`);
  if (infoClosure.address) buf += alignCenter(wrapText(String(infoClosure.address), W).trim());
  if (infoClosure.phone) buf += alignCenter(`TEL: ${formatPhone(infoClosure.phone)}`);

  buf += line('=', W);
  buf += alignCenter(doubleWidth('FECHAMENTO DE CAIXA'));
  buf += line('=', W);

  // ═══ DADOS DA SESSÃO ═══
  buf += `Abertura:   ${formatSP(closure.openedAt as string, 'dd/MM/yyyy HH:mm')}\n`;
  buf += `Fechamento: ${formatSP(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
  buf += line('-', W);
  buf += rowBold('TOTAL DE PEDIDOS:', String(closure.totalOrders), W);
  buf += rowBold('TOTAL DE ITENS:', String(closure.totalItems), W);

  // ═══ PEDIDOS CANCELADOS ═══
  if (closure.canceledOrders && closure.canceledOrders.length > 0) {
    buf += line('=', W);
    buf += alignCenter(bold('PEDIDOS CANCELADOS'));
    buf += line('-', W);
    buf += rowBold('QTD CANCELADOS:', String(closure.canceledOrders.length), W);
    buf += rowBold('VALOR CANCELADO:', formatCurrency(closure.totalCanceledAmount || 0), W);
    buf += line('-', W);

    closure.canceledOrders.forEach(order => {
      const orderNum = order.dailyOrderNumber || order.id?.slice(-4) || '0000';
      const time = formatSP(order.canceledAt, 'HH:mm');
      buf += row(`#${orderNum} (${time})`, formatCurrency(order.total), W);
    });
    buf += line('=', W);
  }

  buf += line('-', W);

  // ═══ PRODUTOS VENDIDOS ═══
  if (closure.items && closure.items.length > 0) {
    buf += alignCenter(bold('PRODUTOS VENDIDOS'));
    buf += line('-', W);
    buf += bold('QTD  DESCRIÇÃO'.padEnd(W - 14) + 'VALOR\n');
    buf += line('-', W);

    const sortedItems = [...closure.items].sort((a, b) => b.qty - a.qty);
    sortedItems.forEach(item => {
      buf += rowBold(`${item.qty}x ${item.name.toUpperCase()}`, formatCurrency(item.total), W);
      if (item.addons) {
        Object.entries(item.addons).forEach(([addonName, addonData]) => {
          buf += row(`  [+] ${addonData.qty}x ${addonName}`, formatCurrency(addonData.total), W);
        });
      }
    });

    buf += line('-', W);
  }

  // ═══ RESUMO DE VENDAS ═══
  buf += alignCenter(bold('RESUMO DE VENDAS'));
  buf += line('-', W);

  Object.entries(closure.salesByMethod).forEach(([method, amount]) => {
    const label = PAYMENT_METHOD_CLOSURE_MAP[method] || method.toUpperCase();
    buf += row(label, formatCurrency(amount as number), W);
  });

  buf += line('-', W);
  buf += rowBold('TOTAL VENDAS:', formatCurrency(closure.totalSales), W);
  buf += line('-', W);

  // ═══ VALORES INFORMADOS ═══
  buf += alignCenter(bold('VALORES INFORMADOS'));
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
  buf += alignCenter(bold('SALDO FINAL'));
  buf += line('-', W);

  buf += row('Fundo Caixa Inicial', `+ ${formatCurrency(closure.initialAmount)}`, W);
  buf += row('Total de Vendas', `+ ${formatCurrency(closure.totalSales)}`, W);
  if (closure.adjustments.reforco > 0) {
    buf += row('Reforços (+)', `+ ${formatCurrency(closure.adjustments.reforco)}`, W);
  }
  if (closure.adjustments.sangria > 0) {
    buf += row('Sangrias (-)', `- ${formatCurrency(closure.adjustments.sangria)}`, W);
  }

  const expectedAmount = closure.initialAmount + closure.totalSales + closure.adjustments.reforco - closure.adjustments.sangria;

  buf += line('=', W);
  buf += rowBold('ESPERADO SISTEMA', formatCurrency(expectedAmount), W);
  buf += rowBold('INFORMADO POR VOCÊ', formatCurrency(totalInformed), W);
  buf += line('=', W);

  const difference = Math.round((totalInformed - expectedAmount) * 100) / 100;
  if (difference !== 0) {
    if (difference > 0) {
      buf += alignCenter(bold(`SOBRA: + ${formatCurrency(difference)}`));
    } else {
      buf += alignCenter(bold(`FALTA: - ${formatCurrency(Math.abs(difference))}`));
    }
  } else {
    buf += alignCenter(bold('CAIXA CONFERE - SEM INCONSISTÊNCIAS'));
  }
  buf += line('=', W);

  // ═══ OBSERVAÇÕES ═══
  if (closure.notes) {
    buf += bold('OBSERVAÇÕES:\n');
    buf += wrapText(closure.notes.toUpperCase(), W);
  }

  buf += '\nASSINATURA RESPONSÁVEL:\n\n';
  buf += line('_', W);
  buf += alignCenter(bold('KICARDÁPIO@'));

  buf += ESC_POS.FEED_LINES(5) + ESC_POS.CUT_PAPER;

  return buf;
}
