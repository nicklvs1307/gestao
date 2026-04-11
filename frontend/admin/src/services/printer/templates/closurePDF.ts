import { jsPDF } from 'jspdf';
import { formatSP } from '@/lib/timezone';
import type { CashierClosureData, RestaurantInfo } from '../types';
import { PAYMENT_METHOD_CLOSURE_MAP } from '../constants';

export function generateCashierClosurePDF(
  closure: CashierClosureData,
  restaurantInfo: RestaurantInfo | Record<string, unknown>
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const info = restaurantInfo as RestaurantInfo;
  
  let y = 15;

  const setFont = (size: number, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
  };

  const addLine = (yPos: number) => {
    doc.setDrawColor(200);
    doc.line(10, yPos, 200, yPos);
  };

  const addCenteredText = (text: string, yPos: number, size = 10, bold = false) => {
    setFont(size, bold);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (210 - textWidth) / 2, yPos);
  };

  // ═══ CABEÇALHO ═══
  addCenteredText((info.name || 'KICARDÁPIO').toUpperCase(), y, 16, true);
  y += 7;
  
  if (info.cnpj) {
    addCenteredText(`CNPJ: ${info.cnpj}`, y, 8);
    y += 5;
  }
  if (info.address) {
    addCenteredText(String(info.address), y, 8);
    y += 5;
  }
  if (info.phone) {
    addCenteredText(`TEL: ${info.phone}`, y, 8);
    y += 5;
  }

  y += 3;
  addLine(y);
  y += 5;

  addCenteredText('FECHAMENTO DE CAIXA', y, 14, true);
  y += 8;

  addLine(y);
  y += 5;

  // ═══ DADOS DA SESSÃO ═══
  setFont(10, true);
  doc.text('DATA E HORA', 10, y);
  doc.text('OPERADOR', 100, y);
  y += 6;
  
  setFont(10);
  const dateStr = formatSP(closure.openedAt, 'dd/MM/yyyy HH:mm');
  doc.text(dateStr, 10, y);
  doc.text('Sistema', 100, y);
  y += 8;

  addLine(y);
  y += 5;

  // ═══ RESUMO DE VENDAS ═══
  addCenteredText('RESUMO DE VENDAS', y, 12, true);
  y += 7;

  addLine(y);
  y += 5;

  Object.entries(closure.salesByMethod).forEach(([method, amount]) => {
    const label = PAYMENT_METHOD_CLOSURE_MAP[method] || method.toUpperCase();
    setFont(10, true);
    doc.text(label, 10, y);
    setFont(10);
    const amountStr = `R$ ${Number(amount).toFixed(2).replace('.', ',')}`;
    doc.text(amountStr, 200, y);
    y += 6;
  });

  y += 2;
  addLine(y);
  y += 5;

  const totalLabel = 'TOTAL DE VENDAS';
  setFont(12, true);
  doc.text(totalLabel, 10, y);
  const totalStr = `R$ ${closure.totalSales.toFixed(2).replace('.', ',')}`;
  const totalWidth = doc.getTextWidth(totalStr);
  doc.text(totalStr, 200 - totalWidth, y);
  y += 10;

  addLine(y);
  y += 5;

  // ═══ SALDO FINAL ═══
  addCenteredText('SALDO FINAL', y, 12, true);
  y += 7;

  addLine(y);
  y += 5;

  setFont(10);
  doc.text('Fundo de Caixa Inicial', 10, y);
  doc.text(`R$ ${closure.initialAmount.toFixed(2).replace('.', ',')}`, 200, y);
  y += 6;

  doc.text('Total de Vendas', 10, y);
  doc.text(`R$ ${closure.totalSales.toFixed(2).replace('.', ',')}`, 200, y);
  y += 6;

  if (closure.adjustments.reforco > 0) {
    doc.text('Reforços (+)', 10, y);
    doc.text(`R$ ${closure.adjustments.reforco.toFixed(2).replace('.', ',')}`, 200, y);
    y += 6;
  }

  if (closure.adjustments.sangria > 0) {
    doc.text('Sangrias (-)', 10, y);
    doc.text(`R$ ${closure.adjustments.sangria.toFixed(2).replace('.', ',')}`, 200, y);
    y += 6;
  }

  const expectedAmount = closure.initialAmount + closure.totalSales + closure.adjustments.reforco - closure.adjustments.sangria;

  y += 3;
  addLine(y);
  y += 5;

  setFont(12, true);
  doc.text('ESPERADO SISTEMA', 10, y);
  doc.text(`R$ ${expectedAmount.toFixed(2).replace('.', ',')}`, 200, y);
  y += 8;

  if (closure.closingDetails) {
    const totalInformado = Object.values(closure.closingDetails)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    
    doc.text('INFORMADO POR VOCÊ', 10, y);
    doc.text(`R$ ${totalInformado.toFixed(2).replace('.', ',')}`, 200, y);
    y += 8;

    const difference = totalInformado - expectedAmount;
    
    addLine(y);
    y += 5;

    if (difference !== 0) {
      const diffLabel = difference > 0 
        ? `SOBRA: R$ ${difference.toFixed(2).replace('.', ',')}` 
        : `FALTA: R$ ${Math.abs(difference).toFixed(2).replace('.', ',')}`;
      addCenteredText(diffLabel, y, 14, true);
    } else {
      addCenteredText('CAIXA CONFERE', y, 14, true);
    }
    y += 10;
  } else {
    addLine(y);
    y += 5;
  }

  // ═══ PEDIDOS CANCELADOS ═══
  if (closure.canceledOrders && closure.canceledOrders.length > 0) {
    addCenteredText('PEDIDOS CANCELADOS', y, 12, true);
    y += 7;

    addLine(y);
    y += 5;

    setFont(10);
    doc.text(`Quantidade: ${closure.canceledOrders.length}`, 10, y);
    doc.text(`Valor: R$ ${(closure.totalCanceledAmount || 0).toFixed(2).replace('.', ',')}`, 200, y);
    y += 10;
  }

  // ═══ PRODUTOS VENDIDOS ═══
  if (closure.items && closure.items.length > 0 && y < 250) {
    addLine(y);
    y += 5;
    addCenteredText('PRODUTOS VENDIDOS', y, 12, true);
    y += 7;
    addLine(y);
    y += 5;

    const sortedItems = [...closure.items].sort((a, b) => b.qty - a.qty);
    sortedItems.slice(0, 15).forEach(item => {
      if (y > 280) return;
      setFont(9);
      doc.text(`${item.qty}x ${item.name}`, 10, y);
      const itemTotal = `R$ ${item.total.toFixed(2).replace('.', ',')}`;
      doc.text(itemTotal, 200, y);
      y += 5;
    });
  }

  // ═══ RODAPÉ ═══
  if (y < 270) {
    y = 270;
  }
  
  addLine(y);
  y += 7;

  addCenteredText('KICARDÁPIO - Sistema de Gestão', y, 8);
  y += 5;

  const now = formatSP(new Date().toISOString(), 'dd/MM/yyyy HH:mm');
  addCenteredText(`Impresso em: ${now}`, y, 8);

  return doc;
}

export function downloadCashierClosurePDF(
  closure: CashierClosureData,
  restaurantInfo: RestaurantInfo | Record<string, unknown>
) {
  const doc = generateCashierClosurePDF(closure, restaurantInfo);
  const dateStr = formatSP(closure.openedAt, 'yyyy-MM-dd-HHmm');
  doc.save(`fechamento-caixa-${dateStr}.pdf`);
}