import { formatSP } from '@/lib/timezone';
import { ESC_POS, PAPER_WIDTH } from '../constants';
import { 
  alignCenter, 
  double, 
  doubleWidth, 
  formatCurrencyBRL, 
  line, 
  row, 
  rowBold, 
  wrapText,
  bold
} from '../utils';
import type { DriverSettlementData, RestaurantInfo } from '../types';

export function generateDriverSettlementReceipt(
  settlement: DriverSettlementData,
  startDate: string,
  startTime: string,
  endTime: string,
  restaurantInfo: RestaurantInfo | Record<string, unknown>,
  endDate?: string
): string {
  const W = PAPER_WIDTH;
  const periodEndDate = endDate || startDate;
  let buf = '';

  // ═══ CABEÇALHO ═══
  buf += ESC_POS.ALIGN_LEFT + ESC_POS.FONT_NORMAL;
  const infoDriver = restaurantInfo as RestaurantInfo;
  buf += alignCenter(double((infoDriver.name || 'KICARDÁPIO').toUpperCase()));
  
  if (infoDriver.cnpj) buf += alignCenter(`CNPJ: ${infoDriver.cnpj}`);
  if (infoDriver.address) buf += alignCenter(wrapText(String(infoDriver.address)), W).trim();

  buf += line('=', W);
  buf += alignCenter(doubleWidth('COMPROVANTE ACERTO'));
  buf += line('=', W);

  // ═══ PERÍODO ═══
  buf += `Data Início: ${startDate}\n`;
  buf += `Data Fim:   ${periodEndDate}\n`;
  buf += `Período:    ${startTime} às ${endTime}\n`;
  buf += line('-', W);

  // ═══ ENTREGADOR ═══
  buf += alignCenter(bold('ENTREGADOR'));
  buf += alignCenter(doubleWidth(settlement.driverName.toUpperCase()));
  buf += `ID: ${settlement.driverId.slice(0, 8)}\n`;
  buf += line('-', W);

  // ═══ RESUMO ═══
  buf += alignCenter(bold('RESUMO DAS ENTREGAS'));
  buf += line('-', W);
  buf += rowBold('TOTAL DE ENTREGAS:', String(settlement.totalOrders), W);
  buf += line('-', W);

  // ═══ DETALHAMENTO FINANCEIRO ═══
  buf += alignCenter(bold('DETALHAMENTO FINANCEIRO'));
  buf += line('-', W);
  buf += row('Dinheiro (Mao)', formatCurrencyBRL(settlement.cash), W);
  buf += row('Cartao Debito', formatCurrencyBRL(settlement.cardDebit), W);
  buf += row('Cartao Credito', formatCurrencyBRL(settlement.cardCredit), W);
  buf += row('PIX (Transf)', formatCurrencyBRL(settlement.pix), W);
  buf += row('Pago Online', formatCurrencyBRL(settlement.onlinePaid), W);
  buf += line('-', W);
  buf += rowBold('Total Entregador:', formatCurrencyBRL(settlement.driverCashReceives + settlement.driverCardReceives), W);
  buf += rowBold('Taxas de Entrega:', `- ${formatCurrencyBRL(settlement.deliveryFees)}`, W);
  buf += line('=', W);

  // ═══ TOTAIS ═══
  buf += rowBold('TOTAL A RECEBER:', formatCurrencyBRL(settlement.totalToPay), W);
  buf += rowBold('LIQUIDO LOJA:', formatCurrencyBRL(settlement.storeNet), W);
  buf += rowBold('PAGO ONLINE (iFood):', formatCurrencyBRL(settlement.storeOnlinePaid), W);
  buf += rowBold('PIX LOJA:', formatCurrencyBRL(settlement.storePix), W);
  if (settlement.totalOrders > 0) {
    buf += alignCenter(`(${formatCurrencyBRL(settlement.storeNet / settlement.totalOrders)}/ent)`);
  }
  buf += line('=', W);

  // ═══ ASSINATURAS ═══
  buf += '\nASSINATURA DO ENTREGADOR:\n\n';
  buf += line('_', W);
  buf += '\nASSINATURA DO CAIXA:\n\n';
  buf += line('_', W);

  buf += alignCenter(`Emitido em: ${formatSP(new Date(), 'dd/MM/yyyy HH:mm')}`);
  buf += alignCenter('KICARDÁPIO - Sistema de Gestão');

  buf += ESC_POS.FEED_LINES(5) + ESC_POS.CUT_PAPER;

  return buf;
}
