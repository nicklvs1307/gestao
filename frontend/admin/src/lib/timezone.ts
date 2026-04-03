import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const TZ_SP = 'America/Sao_Paulo';

/**
 * Converte uma data (ISO string, Date, ou timestamp) para o timezone de São Paulo
 */
export function toSaoPaulo(date: Date | string | number): Date {
  return toZonedTime(date, TZ_SP);
}

/**
 * Formata uma data no timezone de São Paulo
 */
export function formatSP(
  date: Date | string | number,
  fmt: string
): string {
  return format(toZonedTime(date, TZ_SP), fmt, { locale: ptBR });
}

/**
 * Retorna a data/hora atual no timezone de São Paulo como Date
 */
export function nowSP(): Date {
  return toZonedTime(new Date(), TZ_SP);
}

/**
 * Calcula minutos decorridos entre createdAt (ISO string do servidor) e agora,
 * ambos interpretados no timezone de São Paulo.
 */
export function getElapsedMinutes(createdAt: string | Date | number): number {
  const created = toZonedTime(createdAt, TZ_SP);
  const now = toZonedTime(new Date(), TZ_SP);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/**
 * Calcula horas decorridas
 */
export function getElapsedHours(createdAt: string | Date | number): number {
  return Math.floor(getElapsedMinutes(createdAt) / 60);
}

/**
 * Calcula dias decorridos
 */
export function getElapsedDays(createdAt: string | Date | number): number {
  return Math.floor(getElapsedMinutes(createdAt) / (60 * 24));
}

/**
 * Retorna string formatada de tempo decorrido (ex: "1d 2h 35m", "45m", "2h 10m")
 */
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
