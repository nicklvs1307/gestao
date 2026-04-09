import { ESC_POS, PAPER_WIDTH } from './constants';

/**
 * Remove acentos e caracteres especiais que quebram a impressão em ESC/POS.
 * Substitui "ç" por "c", "ã" por "a", etc.
 */
export function removeAccents(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/º/g, '.')
    .replace(/ª/g, '.');
}

export function line(char: string = '-', width: number = PAPER_WIDTH): string {
  return char.repeat(width) + '\n';
}

export function alignCenter(text: string): string {
  return ESC_POS.ALIGN_CENTER + text + '\n' + ESC_POS.ALIGN_LEFT;
}

export function alignRight(text: string): string {
  return ESC_POS.ALIGN_RIGHT + text + '\n' + ESC_POS.ALIGN_LEFT;
}

export function bold(text: string): string {
  // 0x01 = Bold simples (tamanho médio entre normal e tallBold)
  return ESC_POS.BOLD_ON + text + ESC_POS.BOLD_OFF;
}

export function bigBold(text: string): string {
  // 0x10 = Double Height (altura dupla sem bold) - maior que bold, menor que tallBold
  return ESC_POS.FONT_MEDIUM + text + ESC_POS.FONT_NORMAL;
}

export function doubleWidth(text: string): string {
  return ESC_POS.FONT_DOUBLE_W + text + ESC_POS.FONT_NORMAL;
}

export function double(text: string): string {
  return ESC_POS.FONT_DOUBLE + text + ESC_POS.FONT_NORMAL;
}

export function doubleWidth(text: string): string {
  return ESC_POS.FONT_DOUBLE_W + text + ESC_POS.FONT_NORMAL;
}

export function mediumBold(text: string): string {
  // 0x08 = Bold simples (menor que tallBold)
  return ESC_POS.FONT_BOLD + text + ESC_POS.FONT_NORMAL;
}

export function tallBold(text: string): string {
  // 0x18 = 16 (Double Height) + 8 (Bold)
  return ESC_POS.FONT_BOLD_MED + text + ESC_POS.FONT_NORMAL;
}

/**
 * Aplica texto grande (double height/width), quebrando a linha
 * na metade dos caracteres permitidos (pois a fonte ocupa o dobro de espaço).
 */
export function doubleWrapped(text: string, width: number = PAPER_WIDTH): string {
  const halfWidth = Math.floor(width / 2);
  const wrapped = wrapText(text, halfWidth).split('\n').filter(Boolean);
  return wrapped.map(l => ESC_POS.FONT_DOUBLE + ESC_POS.BOLD_ON + l.trim() + ESC_POS.BOLD_OFF + ESC_POS.FONT_NORMAL).join('\n') + '\n';
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function formatCurrencyBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  return phone;
}

/**
 * Cria uma linha dividida em colunas (ex: "Label          Valor")
 * @param label Texto da esquerda
 * @param value Texto da direita
 * @param width Largura total (default PAPER_WIDTH)
 * @param valueWidth Largura da coluna da direita (padrão 14 para valores em Reais)
 */
export function row(label: string, value: string, width: number = PAPER_WIDTH, valueWidth: number = 14): string {
  const labelWidth = width - valueWidth;
  let truncatedLabel = label;
  
  if (label.length > labelWidth) {
    truncatedLabel = label.substring(0, labelWidth - 1) + ' ';
  }
  
  return `${truncatedLabel.padEnd(labelWidth)}${value}\n`;
}

export function rowBold(label: string, value: string, width: number = PAPER_WIDTH, valueWidth: number = 14): string {
  return bold(row(label, value, width, valueWidth));
}

/**
 * Quebra de linha inteligente para textos longos (ex: nomes de produtos longos)
 * Retorna múltiplas linhas se o texto exceder a largura permitida, garantindo que não corte no meio da palavra se possível.
 */
export function wrapText(text: string, width: number = PAPER_WIDTH): string {
  if (text.length <= width) return text + '\n';
  
  const words = text.split(' ');
  let result = '';
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > width) {
      if (currentLine) {
        result += currentLine.trim() + '\n';
        currentLine = word + ' ';
      } else {
        // Palavra maior que a largura total (improvável, mas possível)
        result += word.substring(0, width) + '\n';
        currentLine = word.substring(width) + ' ';
      }
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    result += currentLine.trim() + '\n';
  }
  
  return result;
}

/**
 * Cria uma linha de item de pedido inteligente, fazendo wrap da descrição
 * e mantendo o valor alinhado à direita na última ou primeira linha.
 */
export function rowItemSmart(qty: string, description: string, value: string, width: number = PAPER_WIDTH): string {
  const valueColWidth = 12; // Ex: ' R$ 999,99'
  const qtyColWidth = 4;    // Ex: '99x '
  
  const descWidth = width - qtyColWidth - valueColWidth;
  
  // Se a descrição for menor que o espaço, imprime numa linha só
  if (description.length <= descWidth) {
    const qtyStr = qty.padEnd(qtyColWidth);
    const descStr = description.padEnd(descWidth);
    const valStr = value.padStart(valueColWidth);
    return `${qtyStr}${descStr}${valStr}\n`;
  }
  
  // Se for maior, quebra a descrição
  let result = '';
  const wrappedDesc = wrapText(description, descWidth).split('\n').filter(l => l.trim() !== '');
  
  for (let i = 0; i < wrappedDesc.length; i++) {
    const isFirstLine = i === 0;
    const isLastLine = i === wrappedDesc.length - 1;
    
    const qtyStr = isFirstLine ? qty.padEnd(qtyColWidth) : ' '.repeat(qtyColWidth);
    const descStr = wrappedDesc[i].padEnd(descWidth);
    const valStr = isLastLine ? value.padStart(valueColWidth) : ' '.repeat(valueColWidth);
    
    result += `${qtyStr}${descStr}${valStr}\n`;
  }
  
  return result;
}

export function escPosToBase64(escPosString: string): string {
  // Limpa caracteres especiais antes de gerar o buffer binário
  const cleanStr = removeAccents(escPosString);
  const bytes = new Uint8Array(cleanStr.length);
  for (let i = 0; i < cleanStr.length; i++) {
    // Força para a tabela ASCII básica
    bytes[i] = cleanStr.charCodeAt(i) & 0xff;
  }
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
