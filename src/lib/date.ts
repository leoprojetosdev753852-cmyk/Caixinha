/**
 * Diferença em dias entre duas datas (positiva se b > a).
 */
export function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Formata data em pt-BR (DD/MM/AAAA).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data ISO para input type="date".
 */
export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/**
 * Converte input date (YYYY-MM-DD) para Date no fuso local.
 */
export function fromInputDate(input: string): Date {
  const [y, m, d] = input.split('-').map(Number);
  return new Date(y, m - 1, d);
}
