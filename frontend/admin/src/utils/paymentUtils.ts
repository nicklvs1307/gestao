import { PAYMENT_METHOD_MAP } from '@/services/printer/constants';

export interface PaymentMethod {
  id: string;
  name: string;
  type?: string;
}

const PAYMENT_METHOD_FALLBACK_MAP: Record<string, string> = {
  ...PAYMENT_METHOD_MAP,
  outro: 'OUTROS',
  outros: 'OUTROS',
  other: 'OUTROS',
  others: 'OUTROS',
  credit: 'CARTÃO CRÉDITO',
  debit: 'CARTÃO DÉBITO',
  credito: 'CARTÃO CRÉDITO',
  debito: 'CARTÃO DÉBITO',
  vale: 'VALE REFEIÇÃO',
  ticket: 'VALE REFEIÇÃO',
};

function looksLikeCuid(value: string): boolean {
  if (!value || value.length < 20) return false;
  return /^[a-z0-9]+$/.test(value.toLowerCase());
}

export function resolvePaymentLabel(value: string | null | undefined, paymentMethods?: PaymentMethod[]): string {
  if (!value) return 'PENDENTE';

  const normalized = value.toLowerCase().trim();

  if (paymentMethods && paymentMethods.length > 0) {
    const byId = paymentMethods.find(m => m.id.toLowerCase() === normalized);
    if (byId) {
      return byId.name.toUpperCase();
    }

    const byName = paymentMethods.find(m => m.name.toLowerCase() === normalized);
    if (byName) {
      return byName.name.toUpperCase();
    }

    const byType = paymentMethods.find(m => m.type?.toLowerCase() === normalized);
    if (byType) {
      return byType.name.toUpperCase();
    }

    const containsMatch = paymentMethods.find(m => 
      m.name.toLowerCase().includes(normalized) ||
      m.type?.toLowerCase().includes(normalized)
    );
    if (containsMatch) {
      return containsMatch.name.toUpperCase();
    }
  }

  if (looksLikeCuid(value)) {
    return 'OUTROS';
  }

  const mapped = PAYMENT_METHOD_FALLBACK_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function normalizePaymentMethodKey(value: string | null | undefined): string {
  if (!value) return 'outro';

  const normalized = value.toLowerCase().trim();

  if (normalized === 'cash' || normalized === 'dinheiro') return 'dinheiro';
  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('credit') || normalized.includes('credito')) return 'credito';
  if (normalized.includes('debit') || normalized.includes('debito')) return 'debito';
  if (normalized.includes('vale') || normalized.includes('ticket') || normalized.includes('refeição')) return 'vale';

  return normalized;
}