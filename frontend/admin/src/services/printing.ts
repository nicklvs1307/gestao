import jsPDF from 'jspdf';
import type { Order, OrderItem } from '../types';
import { format } from 'date-fns';

const AGENT_URL = 'http://localhost:4676';

// Função auxiliar para fetch com timeout para não travar a interface
const fetchWithTimeout = async (url: string, options: any = {}, timeout = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

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
    itemSpacing?: number;
}

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

// --- GERADOR UNIFICADO DE PDF ---
const generateOrderReceiptPdf = (
    order: Order, 
    itemsToPrint: OrderItem[], 
    title: string, 
    settings: ReceiptSettings, 
    restaurantInfo: any, 
    logoBase64: string | null, 
    isProduction: boolean = false
): string => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297]
  });

  const fontSizes = { small: 8, medium: 9, large: 11 };
  const baseSize = fontSizes[settings.fontSize] || 9;

  const leftMargin = 7; 
  const rightMargin = 73; 
  const maxContentWidth = 55; 
  const centerX = 40;
  let y = 10; 
  const lineHeight = baseSize * 0.65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(baseSize);

  // 1. LOGO (Apenas Caixa/Cliente e se configurado)
  if (!isProduction && settings.showLogo && logoBase64) {
      try {
          doc.addImage(logoBase64, 'PNG', 25, y, 30, 30);
          y += 32; 
      } catch (err) { console.error("Erro ao inserir logo no PDF:", err); }
  }

  // 2. CABEÇALHO DA LOJA (Apenas Caixa/Cliente)
  if (!isProduction) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize + 2);
      doc.text(restaurantInfo.name?.toUpperCase() || 'KICARDÁPIO', centerX, y, { align: 'center' });
      y += lineHeight;
      
      doc.setFontSize(baseSize - 1);
      doc.setFont('helvetica', 'normal');
      if (restaurantInfo.cnpj) {
        doc.text(`CNPJ: ${restaurantInfo.cnpj}`, centerX, y, { align: 'center' });
        y += lineHeight;
      }

      if (restaurantInfo.address) {
          const addrLines = doc.splitTextToSize(restaurantInfo.address, 65);
          doc.text(addrLines, centerX, y, { align: 'center' });
          y += (addrLines.length * lineHeight);
      }
      if (restaurantInfo.phone) {
          doc.text(`TEL: ${restaurantInfo.phone}`, centerX, y, { align: 'center' });
          y += lineHeight;
      }
      
      y += 2;
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      if (settings.headerText) {
          const headerLines = doc.splitTextToSize(settings.headerText.toUpperCase(), 65);
          doc.setFont('helvetica', 'bold');
          doc.text(headerLines, centerX, y, { align: 'center' });
          y += (headerLines.length * lineHeight) + 2;
          doc.text('--------------------------------------------', centerX, y, { align: 'center' });
          y += lineHeight;
      }
  }

  // 3. TÍTULO E TIPO DE PEDIDO
  const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
  const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
  
  let typeLabel = '';
  if (order.orderType === 'TABLE') {
      typeLabel = `MESA ${order.tableNumber}`;
  } else {
      typeLabel = isPickup ? 'RETIRADA/BALCÃO' : 'ENTREGA';
  }

  y += 2; 
  doc.setFontSize(baseSize + 6); 
  doc.setFont('helvetica', 'bold');
  doc.text(typeLabel, centerX, y, { align: 'center' });
  y += lineHeight + 2;

  // 4. INFO DO PEDIDO (Data, Atendente, Número)
  doc.setFontSize(baseSize);
  doc.setFont('helvetica', 'normal');
  const dateStr = format(new Date(order.createdAt), "dd/MM/yyyy HH:mm");
  doc.text(dateStr, rightMargin, y, { align: 'right' });
  
  if (order.user?.name) {
    doc.setFont('helvetica', 'bold');
    doc.text(`ATEND: ${order.user.name.toUpperCase()}`, leftMargin, y);
  }
  y += lineHeight;

  doc.setFontSize(baseSize + 2);
  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO: #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}`, leftMargin, y);
  y += lineHeight;

  // 5. DADOS DO CLIENTE
  if (order.deliveryOrder) {
      doc.setFontSize(baseSize);
      doc.setFont('helvetica', 'bold');
      doc.text(`CLIENTE: ${order.deliveryOrder.name || 'N/A'}`, leftMargin, y);
      y += lineHeight;
      
      if (!isProduction) {
        doc.setFont('helvetica', 'normal');
        doc.text(`FONE: ${order.deliveryOrder.phone || 'N/A'}`, leftMargin, y);
        y += lineHeight;

        if (!isPickup && order.deliveryOrder.address) {
            doc.setFont('helvetica', 'bold');
            const addrLines = doc.splitTextToSize(`END: ${order.deliveryOrder.address.toUpperCase()}`, 65);
            doc.text(addrLines, leftMargin, y);
            y += (addrLines.length * lineHeight);
        }
      }
  }

  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  // 6. TÍTULO DA VIA (EX: VIA COZINHA, VIA BAR)
  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text('--------------------------------------------', centerX, y, { align: 'center' });
    y += lineHeight;
  }

  // 7. LISTAGEM DE ITENS
  doc.setFont('helvetica', 'bold');
  if (isProduction) {
      doc.text('QTD  PRODUTO', leftMargin, y);
  } else {
      doc.text('QTD  DESCRIÇÃO', leftMargin, y);
      doc.text('VALOR', rightMargin, y, { align: 'right' });
  }
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  let totalQty = 0;
  (itemsToPrint || []).forEach(item => {
    totalQty += item.quantity || 0;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(baseSize + 2); 
    
    const productName = item.product?.name || "Produto";
    const productText = `${item.quantity}x ${productName.toUpperCase()}`;
    const productLines = doc.splitTextToSize(productText, maxContentWidth + (isProduction ? 15 : 0));
    
    doc.text(productLines, leftMargin, y);
    
    if (!isProduction) {
        const totalItem = ((item.priceAtTime || 0) * (item.quantity || 0)).toFixed(2);
        doc.text(totalItem, rightMargin, y, { align: 'right' });
    }
    
    y += (productLines.length * lineHeight);

    // COMPLEMENTOS (SABORES, TAMANHO, ADICIONAIS, OBS)
    doc.setFontSize(baseSize - 1); 
    const detailMargin = leftMargin + 3;
    const detailWidth = 52;
    
    // Sabores
    if (item.flavorsJson) {
        try {
            const flavors = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
            if (Array.isArray(flavors)) {
                flavors.forEach((f: any) => {
                    doc.setFont('helvetica', 'bold');
                    const line = `> SABOR: ${f.name?.toUpperCase() || ''}`;
                    const lines = doc.splitTextToSize(line, detailWidth);
                    doc.text(lines, detailMargin, y);
                    y += (lines.length * lineHeight);
                });
            }
        } catch(e) {}
    }
    // Tamanho
    if (item.sizeJson) {
        try { 
            const size = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
            doc.setFont('helvetica', 'normal');
            doc.text(`> TAM: ${size.name?.toUpperCase() || ''}`, detailMargin, y); 
            y += lineHeight; 
        } catch(e) {}
    }
    // Adicionais / Complementos
    if (item.addonsJson) {
        try { 
            const addons = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
            if (Array.isArray(addons)) {
                addons.forEach((a:any) => {
                    doc.setFont('helvetica', 'bold');
                    const qtyPrefix = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
                    doc.text(`[+] ${qtyPrefix}${a.name?.toUpperCase() || ''}`, detailMargin, y);
                    y += lineHeight;
                });
            }
        } catch(e) {}
    }
    // Observações do Item
    if (item.observations) {
        doc.setFont('helvetica', 'bold');
        const obsLines = doc.splitTextToSize(`(!) OBS ITEM: ${item.observations.toUpperCase()}`, detailWidth);
        doc.text(obsLines, detailMargin, y);
        y += (obsLines.length * lineHeight);
    }
    y += (settings.itemSpacing || 2); 
  });

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.text('--------------------------------------------', centerX, y, { align: 'center' });
  y += lineHeight;

  // 7.5 OBSERVAÇÃO GERAL DO PEDIDO
  const generalObs = order.observations || (order as any).deliveryOrder?.observations || (order as any).notes;
  if (generalObs) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(baseSize + 1);
      const generalObsLines = doc.splitTextToSize(`OBS GERAL: ${generalObs.toUpperCase()}`, 65);
      doc.text(generalObsLines, leftMargin, y);
      y += (generalObsLines.length * lineHeight) + 2;
      doc.setFontSize(baseSize);
      doc.setFont('helvetica', 'normal');
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
  }

  // 8. TOTAIS E PAGAMENTO (Apenas Caixa)
  if (!isProduction) {
      doc.setFont('helvetica', 'bold');
      doc.text(`QTD ITENS: ${totalQty}`, leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      const subtotal = order.total || 0;
      const deliveryFee = order.deliveryOrder?.deliveryFee || 0;
      const discount = order.discount || 0;
      const extraCharge = order.extraCharge || 0;
      const totalGeral = subtotal + deliveryFee - discount + extraCharge;

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

      doc.setFontSize(baseSize + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL`, leftMargin, y);
      doc.text(`${totalGeral.toFixed(2)}`, rightMargin, y, { align: 'right' });
      doc.setFontSize(baseSize);
      y += lineHeight;

      doc.setFont('helvetica', 'normal');
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;

      // PAGAMENTOS
      doc.setFont('helvetica', 'bold');
      doc.text('PAGAMENTO:', leftMargin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      
      const methodMap: any = { cash: 'DINHEIRO', credit_card: 'CARTÃO CRÉDITO', debit_card: 'CARTÃO DÉBITO', pix: 'PIX', meal_voucher: 'VALE REFEIÇÃO', card: 'CARTÃO (PDV)' };

      if (order.payments && order.payments.length > 0) {
          order.payments.forEach((p: any) => {
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
      doc.text('--------------------------------------------', centerX, y, { align: 'center' });
      y += lineHeight;
  } else {
      doc.setFont('helvetica', 'bold');
      doc.text('*** FIM DA PRODUÇÃO ***', centerX, y, { align: 'center' });
      y += lineHeight;
  }

  // 9. RODAPÉ
  if (!isProduction && settings.footerText) {
      const footerLines = doc.splitTextToSize(settings.footerText.toUpperCase(), 65);
      doc.setFont('helvetica', 'bold');
      doc.text(footerLines, centerX, y, { align: 'center' });
      y += (footerLines.length * lineHeight) + 2;
  }

  doc.setFontSize(baseSize - 2);
  doc.text(`ID: ${order.id}`, leftMargin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('KICARDAPIO@', centerX, y, { align: 'center' });

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

export const printTableCheckout = async (tableNumber: number, items: any[], payments: any[], order?: Order) => {
    const status = await checkAgentStatus();
    if (!status) return alert("ERRO: Agente de impressão não encontrado!");

    const savedConfig = localStorage.getItem('printer_config');
    const config = savedConfig ? JSON.parse(savedConfig) : { cashierPrinters: [localStorage.getItem('cashier_printer_name') || ''] };
    const settings = JSON.parse(localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings') || '{}');
    
    const restaurantInfo = {
        name: localStorage.getItem('restaurant_name') || 'Minha Loja',
        address: localStorage.getItem('restaurant_address'),
        phone: localStorage.getItem('restaurant_phone'),
        cnpj: localStorage.getItem('restaurant_cnpj'),
        logoUrl: localStorage.getItem('restaurant_logo')
    };

    // Objeto mock de pedido caso não venha o real, para manter compatibilidade
    const dummyOrder: any = order || {
        id: 'CONTA-' + tableNumber,
        tableNumber: tableNumber,
        orderType: 'TABLE',
        status: 'COMPLETED',
        total: items.reduce((acc, i) => acc + ((i.priceAtTime || 0) * (i.quantity || 0)), 0),
        createdAt: new Date().toISOString(),
        items: items,
        payments: payments
    };

    const pdf = generateOrderReceiptPdf(dummyOrder, items, `EXTRATO MESA ${tableNumber}`, settings, restaurantInfo, null, false);
    
    if (config.cashierPrinters && config.cashierPrinters.length > 0) {
        for (const p of config.cashierPrinters) {
            await fetchWithTimeout(`${getAgentUrl()}/print`, {
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
    const settings = JSON.parse(localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings') || '{}');
    
    const restaurantInfo = {
        name: localStorage.getItem('restaurant_name') || 'Minha Loja',
        logoUrl: localStorage.getItem('restaurant_logo')
    };

    const pdf = generateCashierPdf(summary, restaurantInfo, settings);
    
    if (config.cashierPrinters && config.cashierPrinters.length > 0) {
        for (const p of config.cashierPrinters) {
            await fetchWithTimeout(`${getAgentUrl()}/print`, {
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

  if (!order || (!order.items || order.items.length === 0)) {
    console.error("Pedido sem itens para impressão:", order);
    return alert("AVISO: O pedido parece estar vazio ou não foi carregado corretamente para impressão.");
  }

  // Garantir que config tenha todas as propriedades necessárias
  const finalConfig: PrinterConfig = {
      cashierPrinters: config?.cashierPrinters || [],
      kitchenPrinters: config?.kitchenPrinters || [],
      barPrinters: config?.barPrinters || [],
      categoryMapping: config?.categoryMapping || {}
  };

  const finalSettings = (receiptSettings && Object.keys(receiptSettings).length > 0) 
      ? receiptSettings 
      : JSON.parse(localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings') || '{}');
  const finalRestaurant = restaurantInfo || { 
      name: localStorage.getItem('restaurant_name'),
      address: localStorage.getItem('restaurant_address'),
      phone: localStorage.getItem('restaurant_phone'),
      cnpj: localStorage.getItem('restaurant_cnpj'),
      logoUrl: localStorage.getItem('restaurant_logo')
  };

  // Pré-carregar Logo se necessário (apenas para caixa)
  let logoBase64: string | null = null;
  if (finalSettings.showLogo && finalRestaurant.logoUrl) {
      logoBase64 = await getBase64Image(finalRestaurant.logoUrl);
  }

  const sendToAgent = async (printer: string, pdf: string) => {
      if (!printer) return;
      await fetchWithTimeout(`${getAgentUrl()}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printer, content: pdf })
      });
  };

  // 1. IMPRIMIR NO CAIXA (Via do Cliente / Extrato)
  const isTable = order.orderType === 'TABLE';
  const isCompleted = order.status === 'COMPLETED';
  const shouldPrintCashier = !isTable || (isTable && isCompleted);

  if (shouldPrintCashier && finalConfig.cashierPrinters?.length > 0) {
      const pdf = generateOrderReceiptPdf(order, order.items, isTable ? "EXTRATO DE CONTA" : "VIA CAIXA", finalSettings, finalRestaurant, logoBase64, false);
      for (const p of finalConfig.cashierPrinters) {
          await sendToAgent(p, pdf);
      }
  }

  // 2. IMPRIMIR NA PRODUÇÃO (Cozinha/Bar)
  const shouldPrintProduction = !isTable || (isTable && !isCompleted);

  if (shouldPrintProduction) {
      const productionGroups: Record<string, OrderItem[]> = {};

      (order.items || []).forEach(item => {
          const product = item.product;
          let categoryName = "Geral";

          if (product?.categories && product.categories.length > 0) {
              categoryName = product.categories[0].name;
          } else if (product?.category?.name) {
              categoryName = product.category.name;
          } else if ((item as any).category?.name) {
              categoryName = (item as any).category.name;
          }
          
          const destinationId = finalConfig.categoryMapping[categoryName] || finalConfig.categoryMapping[categoryName.trim()] || 'k1';
          if (destinationId === 'none') return;

          if (!productionGroups[destinationId]) productionGroups[destinationId] = [];
          productionGroups[destinationId].push(item);
      });

      // Disparar para Cozinhas
      for (const k of finalConfig.kitchenPrinters) {
          const items = productionGroups[k.id];
          if (items && items.length > 0) {
              const pdf = generateOrderReceiptPdf(order, items, `VIA ${k.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
              await sendToAgent(k.printer, pdf);
          }
      }

      // Disparar para Bares
      for (const b of finalConfig.barPrinters) {
          const items = productionGroups[b.id];
          if (items && items.length > 0) {
              const pdf = generateOrderReceiptPdf(order, items, `VIA ${b.name.toUpperCase()}`, finalSettings, finalRestaurant, null, true);
              await sendToAgent(b.printer, pdf);
          }
      }
  }
};