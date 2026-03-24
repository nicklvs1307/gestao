export function formatCurrency(value: number): string {
  return `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0;
}
