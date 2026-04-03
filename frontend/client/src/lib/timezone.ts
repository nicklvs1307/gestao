import { format, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const TZ_SP = 'America/Sao_Paulo';

export function toSaoPaulo(date: Date | string | number): Date {
  return toZonedTime(date, TZ_SP);
}

export function formatSP(
  date: Date | string | number,
  fmt: string
): string {
  return format(toZonedTime(date, TZ_SP), fmt, { locale: ptBR });
}

export function nowSP(): Date {
  return toZonedTime(new Date(), TZ_SP);
}

export function getElapsedMinutes(createdAt: string | Date | number): number {
  const created = toZonedTime(createdAt, TZ_SP);
  const now = toZonedTime(new Date(), TZ_SP);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function getElapsedHours(createdAt: string | Date | number): number {
  return Math.floor(getElapsedMinutes(createdAt) / 60);
}

export function getElapsedDays(createdAt: string | Date | number): number {
  return Math.floor(getElapsedMinutes(createdAt) / (60 * 24));
}

export function formatElapsed(createdAt: string | Date | number): string {
  const days = getElapsedDays(createdAt);
  const hours = getElapsedHours(createdAt) % 24;
  const mins = getElapsedMinutes(createdAt) % 60;

  let str = '';
  if (days > 0) str += `${days}d `;
  if (hours > 0 || days > 0) str += `${hours}h`;
  str += `${mins}m`;
  return str.trim();
}
