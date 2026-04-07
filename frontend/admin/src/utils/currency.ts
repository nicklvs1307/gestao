import { round, parseCurrency as safeParse, formatBRL } from './money';

export function formatCurrency(value: number): string {
  return formatBRL(value);
}

export function parseCurrency(value: string): number {
  return safeParse(value);
}

export { round, safeParse, formatBRL };
