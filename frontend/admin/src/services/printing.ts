import jsPDF from 'jspdf';
import type { Order, OrderItem } from '../types';
import { format } from 'date-fns';

const AGENT_URL = 'http://localhost:4676';

const getAgentUrl = () => {
    // Se o site estiver em HTTPS, o agente local também deve ser acessado de forma segura
    // ou o navegador bloqueará por Mixed Content. 
    // Por enquanto, o agente é HTTP localhost, o que o Chrome permite.
    return AGENT_URL;
};

export interface PrinterConfig {
  // Agora suportamos múltiplas impressoras por setor
  cashierPrinters: string[]; 
  kitchenPrinters: { id: string, name: string, printer: string }[];
  barPrinters: { id: string, name: string, printer: string }[];
  
  // Mapeamento: Nome da Categoria -> ID da Impressora de Produção (Ex: "k1", "k2", "b1")
  categoryMapping: Record<string, string>;
}

export interface ReceiptSettings {
    showLogo: boolean;
    showAddress: boolean;
    fontSize: 'small' | 'medium' | 'large';
    headerText: string;
    footerText: string;
}

export const checkAgentStatus = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${getAgentUrl()}/status`);
    return res.ok;
  } catch {
    return false;
  }
};

export const getPrinters = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${getAgentUrl()}/printers`);
    const data = await res.json();
    // No Windows, o pdf-to-printer pode retornar um array de strings diretamente
    // ou um array de objetos dependendo da versão/plataforma.
    // Vamos garantir que lidamos com ambos.
    if (Array.isArray(data)) {
        return data.map((p: any) => typeof p === 'string' ? p : (p.name || p.printer || ''));
    }
    return [];
  } catch (e) {
    console.error('Erro ao buscar impressoras', e);
    return [];
  }
};

const getBase64Image = async (url: string): Promise<string | null> => {
  if (!url) return null;
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const response = await fetch(fullUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove o prefixo do data URI se o jsPDF reclamar, mas geralmente ele aceita
        resolve(result); 
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Falha ao carregar logo para impressão:", e);
    return null;
  }
};

const generateReceiptPdf = (order: Order, itemsToPrint: OrderItem[], title: string, settings: ReceiptSettings, restaurantInfo: any, logoBase64: string | null, isProduction: boolean = false): string => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297]
  });

  const fontSizes = { small: 7, medium: 8, large: 10 };
  const baseSize = fontSizes[settings.fontSize] || 8;

  // Configurações de Margem (Ajustado para 10mm na esquerda)
  const leftMargin = 10; 
  const rightMargin = 74; 
  const maxContentWidth = 50; 

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseSize);
  
  let y = 12; // Margem maior no topo
  const lineHeight = baseSize * 0.5;
  const centerX = 40;

  // --- LOGO (Apenas na via do Caixa) ---
  if (!isProduction && settings.showLogo && logoBase64) {
      try {
          doc.addImage(logoBase64, 'PNG', 25, y, 30, 30);
          y += 32; 
      } catch (err) { console.error(err); }
  }

  // --- CABEÇALHO (LOJA - ALINHADO À ESQUERDA) ---
  if (!isProduction) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize + 2);
      doc.text(restaurantInfo.name?.toUpperCase() || 'NOME DA LOJA', leftMargin, y);
      y += lineHeight;
      
      doc.setFontSize(baseSize - 1);
      doc.setFont('helvetica', 'normal');
      doc.text(`CNPJ: ${restaurantInfo.cnpj || '00.000.000/0000-00'}`, leftMargin, y);
      y += lineHeight;

      if (restaurantInfo.address) {
          const addrLines = doc.splitTextToSize(restaurantInfo.address, 65);
          doc.text(addrLines, leftMargin, y);
          y += (addrLines.length * lineHeight);
      }
      if (restaurantInfo.phone) {
          doc.text(`TEL: ${restaurantInfo.phone}`, leftMargin, y);
          y += lineHeight;
      }
      
      y += 2;
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
  }

  // --- INFO PEDIDO (NOVO LAYOUT) ---
  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
  
  let typeLabel = '';
  if (order.orderType === 'TABLE') {
      typeLabel = `MESA ${order.tableNumber}`;
  } else {
      typeLabel = isPickup ? 'RETIRADA/BALCÃO' : 'ENTREGA';
  }

  // 1. TIPO DO PEDIDO (GRANDE E CENTRALIZADO) - Com espaço extra no topo
  y += 5; 
  doc.setFontSize(baseSize + 6); 
  doc.setFont('helvetica', 'bold');
  doc.text(typeLabel, centerX, y, { align: 'center' });
  y += lineHeight + 2;

  // 2. DATA (ALINHADA À DIREITA) E ATENDENTE (SE HOUVER)
  doc.setFontSize(baseSize);
  doc.setFont('helvetica', 'normal');
  const dateStr = format(new Date(order.createdAt), "dd/MM/yyyy HH:mm");
  doc.text(dateStr, rightMargin, y, { align: 'right' });
  
  if (order.user?.name) {
    doc.setFont('helvetica', 'bold');
    doc.text(`ATENDENTE: ${order.user.name.toUpperCase()}`, leftMargin, y);
  }
  y += lineHeight;

  // 3. NÚMERO DO PEDIDO
  doc.setFontSize(baseSize + 2);
  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`, leftMargin, y);
  y += lineHeight;

  // 4. DADOS DO CLIENTE (SE FOR DELIVERY)
  if (order.deliveryOrder) {
      doc.setFontSize(baseSize);
      doc.setFont('helvetica', 'bold');
      doc.text(`CLIENTE: ${order.deliveryOrder.name || 'N/A'}`, leftMargin, y);
      y += lineHeight;
      
      if (!isProduction) {
        doc.setFont('helvetica', 'normal');
        doc.text(`FONE: ${order.deliveryOrder.phone || 'N/A'}`, leftMargin, y);
        y += lineHeight;

        // ENDEREÇO (Apenas se for Entrega e estiver no Caixa)
        if (!isPickup) {
            const addr = order.deliveryOrder.address;
            if (addr && addr !== 'undefined' && addr.trim() !== '' && !addr.toLowerCase().includes('retirada')) {
                doc.setFont('helvetica', 'bold');
                const addrLines = doc.splitTextToSize(`ENDEREÇO: ${addr.toUpperCase()}`, 65);
                doc.text(addrLines, leftMargin, y);
                y += (addrLines.length * lineHeight);
            }
        }
      }
  }

  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  // --- ITENS ---
  doc.setFont('helvetica', 'bold');
  if (isProduction) {
      doc.text('QTD  PRODUTO', leftMargin, y); // Sem valor
  } else {
      doc.text('QTD  DESCRIÇÃO', leftMargin, y);
      doc.text('VALOR', rightMargin, y, { align: 'right' });
  }
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  let totalQty = 0;
  itemsToPrint.forEach(item => {
    totalQty += item.quantity;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 2); // Fonte MAIOR para itens
    
    const productText = `${item.quantity}x ${item.product.name.toUpperCase()}`;
    const productLines = doc.splitTextToSize(productText, maxContentWidth + (isProduction ? 15 : 0)); // Produção tem mais espaço pois nao tem preço
    
    doc.text(productLines, leftMargin, y);
    
    if (!isProduction) {
        const totalItem = (item.priceAtTime * item.quantity).toFixed(2);
        doc.text(totalItem, rightMargin, y, { align: 'right' });
    }
    
    y += (productLines.length * lineHeight);

    // DETALHES (SABORES, TAMANHO, ADICIONAIS) - Com recuo maior à direita
    doc.setFontSize(baseSize); 
    const detailMargin = leftMargin + 6; // Recuo para os complementos
    const detailWidth = maxContentWidth - 6;
    
    if (item.flavorsJson) {
        try {
            const flavors = JSON.parse(item.flavorsJson);
            flavors.forEach((f: any) => {
                doc.setFont('helvetica', 'bold');
                const line = `> SABOR: ${f.name.toUpperCase()}`;
                const lines = doc.splitTextToSize(line, detailWidth);
                doc.text(lines, detailMargin, y);
                y += (lines.length * lineHeight);
            });
        } catch {}
    }
    if (item.sizeJson) {
        try { 
            doc.setFont('helvetica', 'normal');
            doc.text(`> TAM: ${JSON.parse(item.sizeJson).name.toUpperCase()}`, detailMargin, y); 
            y += lineHeight; 
        } catch {}
    }
    if (item.addonsJson) {
        try { 
            const addons = JSON.parse(item.addonsJson);
            addons.forEach((a:any) => {
                doc.setFont('helvetica', 'bold');
                doc.text(`[+] ${a.name.toUpperCase()}`, detailMargin, y);
                y += lineHeight;
            });
        } catch {}
    }
    if (item.observations) {
        doc.setFont('helvetica', 'bold');
        const obsLines = doc.splitTextToSize(`(!) OBS: ${item.observations.toUpperCase()}`, detailWidth);
        doc.text(obsLines, detailMargin, y);
        y += (obsLines.length * lineHeight);
    }
    y += 4; // Espaço extra maior entre itens para não embolar
  });

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  // --- TOTAIS (Apenas Caixa) ---
  if (!isProduction) {
      doc.setFont('helvetica', 'bold');
      doc.text(`QTD ITENS: ${totalQty}`, leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      const subtotal = order.total;
      const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
      const totalGeral = subtotal + deliveryFee;

      doc.text(`TOTAL ITENS`, leftMargin, y);
      doc.text(`${subtotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;

      doc.text(`TAXA DE ENTREGA`, leftMargin, y);
      doc.text(`${deliveryFee.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += lineHeight;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize + 2);
      doc.text(`TOTAL`, leftMargin, y);
      doc.text(`${totalGeral.toFixed(2)}`, rightMargin, y, { align: 'right' });
      doc.setFontSize(baseSize);
      y += lineHeight;

      doc.setFont('helvetica', 'normal');
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      // --- PAGAMENTO ---
      doc.setFont('helvetica', 'bold');
      doc.text('PAGAMENTO:', leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      if (order.payments && order.payments.length > 0) {
          order.payments.forEach((p: any) => {
              const methodMap: any = { cash: 'DINHEIRO', credit_card: 'CARTÃO CRÉDITO', debit_card: 'CARTÃO DÉBITO', pix: 'PIX', meal_voucher: 'VALE REFEIÇÃO' };
              doc.text(`(${methodMap[p.method] || p.method.toUpperCase()})`, leftMargin, y);
              doc.text(`${p.amount.toFixed(2)}`, rightMargin, y, { align: 'right' });
              y += lineHeight;
          });
      } else if (order.deliveryOrder?.paymentMethod) {
          doc.text(`(${order.deliveryOrder.paymentMethod.toUpperCase()})`, leftMargin, y);
          y += lineHeight;
      }
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight * 2;
  } else {
     // Fim da comenda de produção
      doc.setFont('helvetica', 'bold');
      doc.text('*** FIM DA PRODUÇÃO ***', centerX, y, { align: 'center' });
      y += lineHeight * 2;
  }

  // --- RODAPÉ ---
  doc.text('============================================', centerX, y, { align: 'center' });
  y += lineHeight;
  doc.setFontSize(baseSize - 2);
  doc.text(`ID: ${order.id}`, leftMargin, y);
  y += lineHeight;
  
  if (!isProduction) {
    doc.setFont('helvetica', 'bold');
    doc.text('KICARDAPIO@', centerX, y, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

const generateCashierPdf = (summary: any, restaurantInfo: any, settings: ReceiptSettings): string => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
    const centerX = 40;
    const leftMargin = 10;
    const rightMargin = 74;
    let y = 12;
    const lineHeight = 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("FECHAMENTO DE CAIXA", centerX, y, { align: 'center' });
    y += lineHeight + 2;

    doc.setFontSize(10);
    doc.text(restaurantInfo.name?.toUpperCase() || 'NOME DA LOJA', leftMargin, y);
    y += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`ABERTURA: ${format(new Date(summary.openedAt), "dd/MM/yyyy HH:mm")}`, leftMargin, y);
    y += lineHeight;
    doc.text(`FECHAMENTO: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, leftMargin, y);
    y += lineHeight + 2;

    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text("RESUMO DE VENDAS", leftMargin, y);
    y += lineHeight;
    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    Object.entries(summary.salesByMethod || {}).forEach(([method, amount]: [string, any]) => {
        const methodMap: any = { cash: 'DINHEIRO', credit_card: 'CARTÃO CRÉDITO', debit_card: 'CARTÃO DÉBITO', pix: 'PIX', meal_voucher: 'VALE REFEIÇÃO', card: 'CARTÃO (PDV)' };
        doc.text(methodMap[method] || method.toUpperCase(), leftMargin, y);
        doc.text(`R$ ${amount.toFixed(2)}`, rightMargin, y, { align: 'right' });
        y += lineHeight;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL VENDIDO", leftMargin, y);
    doc.text(`R$ ${summary.totalSales.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight + 2;

    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    doc.text("SALDO FINAL", leftMargin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text("Fundo de Caixa (Inicial)", leftMargin, y);
    doc.text(`+ R$ ${summary.initialAmount.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const totalGeral = summary.totalSales + summary.initialAmount;
    doc.text("TOTAL EM CAIXA", leftMargin, y);
    doc.text(`R$ ${totalGeral.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight * 2;

    doc.setFontSize(8);
    doc.text("ASSINATURA RESPONSÁVEL:", leftMargin, y);
    y += 15;
    doc.text('____________________________________', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('KICARDAPIO@', centerX, y, { align: 'center' });

    return doc.output('datauristring').split(',')[1];
};

const generateTableClosurePdf = (tableNumber: number, items: any[], payments: any[], restaurantInfo: any, settings: ReceiptSettings): string => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
    const centerX = 40;
    const leftMargin = 10;
    const rightMargin = 74;
    let y = 12;
    const lineHeight = 5;

    // Cabeçalho Loja
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(restaurantInfo.name?.toUpperCase() || 'NOME DA LOJA', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (restaurantInfo.address) {
        const addrLines = doc.splitTextToSize(restaurantInfo.address, 60);
        doc.text(addrLines, centerX, y, { align: 'center' });
        y += (addrLines.length * lineHeight);
    }
    y += 2;

    // Título do Documento
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`EXTRATO MESA ${tableNumber}`, centerX, y, { align: 'center' });
    y += lineHeight + 2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATA: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, leftMargin, y);
    y += lineHeight;
    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Listagem Consolidada de Itens
    doc.setFont('helvetica', 'bold');
    doc.text('QTD  PRODUTO', leftMargin, y);
    doc.text('VALOR', rightMargin, y, { align: 'right' });
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    let subtotal = 0;
    items.forEach(item => {
        const itemTotal = item.priceAtTime * item.quantity;
        subtotal += itemTotal;

        doc.setFont('helvetica', 'bold');
        const productText = `${item.quantity}x ${item.product.name.toUpperCase()}`;
        const productLines = doc.splitTextToSize(productText, 45);
        doc.text(productLines, leftMargin, y);
        doc.text(itemTotal.toFixed(2), rightMargin, y, { align: 'right' });
        y += (productLines.length * lineHeight);

        // Detalhes (Sabores/Tamanhos)
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        if (item.sizeJson) {
            try { doc.text(`> TAM: ${JSON.parse(item.sizeJson).name}`, leftMargin + 5, y); y += 4; } catch(e){}
        }
        if (item.flavorsJson) {
            try {
                const flavors = JSON.parse(item.flavorsJson);
                flavors.forEach((f: any) => { doc.text(`> SABOR: ${f.name}`, leftMargin + 5, y); y += 4; });
            } catch(e){}
        }
        doc.setFontSize(8);
        y += 1;
    });

    y += 2;
    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Totais
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL CONSUMO', leftMargin, y);
    doc.text(`R$ ${subtotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += lineHeight + 2;

    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;

    // Pagamentos Detalhados
    doc.text('PAGAMENTOS REALIZADOS:', leftMargin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    
    payments.forEach(p => {
        const methodMap: any = { cash: 'DINHEIRO', card: 'CARTÃO', pix: 'PIX' };
        doc.text(`- ${methodMap[p.method] || p.method.toUpperCase()}`, leftMargin, y);
        doc.text(`R$ ${p.amount.toFixed(2)}`, rightMargin, y, { align: 'right' });
        y += lineHeight;
    });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('CONTA FINALIZADA', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text('OBRIGADO PELA PREFERÊNCIA!', centerX, y, { align: 'center' });
    y += lineHeight + 2;
    doc.text('KICARDAPIO@', centerX, y, { align: 'center' });

    return doc.output('datauristring').split(',')[1];
};

export const printTableCheckout = async (tableNumber: number, items: any[], payments: any[]) => {
    const status = await checkAgentStatus();
    if (!status) return alert("ERRO: Agente de impressão não encontrado!");

    const savedConfig = localStorage.getItem('printer_config');
    const config = savedConfig ? JSON.parse(savedConfig) : { cashierPrinters: [localStorage.getItem('cashier_printer_name') || ''] };
    const settings = JSON.parse(localStorage.getItem('receipt_settings') || '{}');
    
    const restaurantInfo = {
        name: localStorage.getItem('restaurant_name') || 'Minha Loja',
        address: localStorage.getItem('restaurant_address'),
        phone: localStorage.getItem('restaurant_phone')
    };

    const pdf = generateTableClosurePdf(tableNumber, items, payments, restaurantInfo, settings);
    
    if (config.cashierPrinters && config.cashierPrinters.length > 0) {
        for (const p of config.cashierPrinters) {
            await fetch(`${getAgentUrl()}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ printer: p, content: pdf })
            });
        }
    }
};

export const printCashierClosure = async (summary: any) => {
    const status = await checkAgentStatus();
    if (!status) return alert("ERRO: Agente de impressão não encontrado!");

    const savedConfig = localStorage.getItem('printer_config');
    const config = savedConfig ? JSON.parse(savedConfig) : { cashierPrinters: [localStorage.getItem('cashier_printer_name') || ''] };
    const settings = JSON.parse(localStorage.getItem('receipt_settings') || '{}');
    
    const restaurantInfo = {
        name: localStorage.getItem('restaurant_name') || 'Minha Loja'
    };

    const pdf = generateCashierPdf(summary, restaurantInfo, settings);
    
    if (config.cashierPrinters && config.cashierPrinters.length > 0) {
        for (const p of config.cashierPrinters) {
            await fetch(`${getAgentUrl()}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ printer: p, content: pdf })
            });
        }
    }
};

export const printOrder = async (order: Order, config: PrinterConfig, receiptSettings?: ReceiptSettings, restaurantInfo?: any) => {
  const status = await checkAgentStatus();
  if (!status) return alert("ERRO: Agente de impressão não encontrado!");

  const finalSettings = receiptSettings || JSON.parse(localStorage.getItem('receipt_settings') || '{}');
  const finalRestaurant = restaurantInfo || { name: localStorage.getItem('restaurant_name') };

  // Pré-carregar Logo se necessário (apenas para caixa)
  let logoBase64: string | null = null;
  if (finalSettings.showLogo && finalRestaurant.logoUrl) {
      logoBase64 = await getBase64Image(finalRestaurant.logoUrl);
  }

  const sendToAgent = async (printer: string, pdf: string) => {
      if (!printer) return;
      await fetch(`${getAgentUrl()}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printer, content: pdf })
      });
  };

  // 1. IMPRIMIR EM TODOS OS CAIXAS CONFIGURADOS
  // LÓGICA DE MESA: Só imprime no caixa se o pedido estiver FINALIZADO (Fechamento de conta)
  // LÓGICA DE DELIVERY: Imprime sempre no caixa
  const isTable = order.orderType === 'TABLE';
  const isCompleted = order.status === 'COMPLETED';
  
  const shouldPrintCashier = !isTable || (isTable && isCompleted);

  if (shouldPrintCashier && config.cashierPrinters && config.cashierPrinters.length > 0) {
      const pdf = generateReceiptPdf(order, order.items, isTable ? "EXTRATO DE CONTA" : "VIA CAIXA", finalSettings, finalRestaurant, logoBase64, false);
      for (const p of config.cashierPrinters) {
          await sendToAgent(p, pdf);
      }
  }

  // 2. AGRUPAR ITENS POR DESTINO DE PRODUÇÃO
  // LÓGICA DE MESA: Só imprime na produção se NÃO estiver finalizado (evita imprimir de novo no fechamento)
  const shouldPrintProduction = !isTable || (isTable && !isCompleted);

  if (shouldPrintProduction) {
      const productionGroups: Record<string, OrderItem[]> = {};

      order.items.forEach(item => {
          // Busca categoria tentando várias fontes (direta, via produto ou fallback Geral)
          const category = item.product?.category || (item as any).category;
          const categoryName = category?.name || "Geral";
          
          const destinationId = config.categoryMapping[categoryName] || config.categoryMapping[categoryName.trim()] || 'k1';
          
          console.log(`Debug Impressão: Item="${item.product?.name || item.productId}" | Categoria="${categoryName}" | Destino="${destinationId}"`);
          
          if (destinationId === 'none') return;

          if (!productionGroups[destinationId]) productionGroups[destinationId] = [];
          productionGroups[destinationId].push(item);
      });

      // 3. DISPARAR IMPRESSÕES DE PRODUÇÃO
      // Cozinhas (IDs geralmente começam com 'k')
      for (const k of config.kitchenPrinters) {
          const items = productionGroups[k.id];
          if (items && items.length > 0) {
              console.log(`Enviando ${items.length} itens para Cozinha: ${k.name} (${k.printer})`);
              const pdf = generateReceiptPdf(order, items, `VIA ${k.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
              await sendToAgent(k.printer, pdf);
          }
      }

      // Bares (IDs geralmente começam com 'b')
      for (const b of config.barPrinters) {
          const items = productionGroups[b.id];
          if (items && items.length > 0) {
              console.log(`Enviando ${items.length} itens para Bar: ${b.name} (${b.printer})`);
              const pdf = generateReceiptPdf(order, items, `VIA ${b.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
              await sendToAgent(b.printer, pdf);
          }
      }
  }
};