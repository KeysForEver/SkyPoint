/**
 * Utilities for Date & Time in São Paulo Timezone (GMT-3 / America/Sao_Paulo)
 */

export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns current Date in São Paulo timezone
 */
export function getNowInSaoPaulo(): Date {
  // Return standard Date object, but we format with timezone when displaying
  return new Date();
}

/**
 * Formats a Date object or ISO string into a human-readable São Paulo time string
 * Example: "19/08/2026 15:30:45"
 */
export function formatSaoPauloDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Formats time only in São Paulo timezone (e.g. "08:30:15")
 */
export function formatSaoPauloTimeOnly(date: Date | string | number, includeSeconds = true): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--:--';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(d);
}

/**
 * Formats date only in São Paulo timezone (e.g. "19/08/2026")
 */
export function formatSaoPauloDateOnly(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--/--/----';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Returns YYYY-MM-DD date key in São Paulo timezone for indexing and query grouping
 */
export function getSaoPauloDateKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs YYYY-MM-DD
}

/**
 * Generates a mock crypto hash/receipt code for the punch record (NSS - Número Sequencial do Ponto)
 */
export function generatePunchReceiptHash(userId: string, timestamp: string): string {
  let hash = 0;
  const str = `${userId}-${timestamp}-${Math.random().toString(36).substring(2)}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit int
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKY-${hex}-${salt}`;
}

export function getPunchTypeLabel(type: string): string {
  switch (type) {
    case 'entry':
      return 'Entrada';
    case 'lunch_start':
      return 'Saída Intervalo';
    case 'lunch_end':
      return 'Retorno Intervalo';
    case 'exit':
      return 'Saída';
    case 'custom':
    default:
      return 'Ponto Especial';
  }
}

export function getPunchTypeBadgeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'entry':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'lunch_start':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'lunch_end':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'exit':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
  }
}
