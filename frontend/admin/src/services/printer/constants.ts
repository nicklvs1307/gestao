// CONSTANTES ESC/POS
export const ESC = '\x1b';
export const GS = '\x1d';

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

export const PAYMENT_METHOD_MAP: Record<string, string> = {
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

export const PAYMENT_METHOD_CLOSURE_MAP: Record<string, string> = {
  ...PAYMENT_METHOD_MAP,
};
