/**
 * Epoca gestazionale: conversioni, date, data presunta del parto.
 * Estratto dal prototipo `curva-di-matilde.html`.
 */

export const TERM_GA_WEEKS = 40;
export const TERM_DAYS = 280;
export const MIN_GA_WEEKS = 12;
export const MAX_GA_WEEKS = 42;

/** Settimane + giorni -> settimane decimali. */
export function toDecimalWeeks(weeks: number, days: number): number {
  return (Number(weeks) || 0) + (Number(days) || 0) / 7;
}

/** Settimane decimali -> "33+2". */
export function formatGA(ga: number): string {
  if (!Number.isFinite(ga)) return '—';
  let w = Math.floor(ga + 1e-9);
  let d = Math.round((ga - w) * 7);
  if (d === 7) {
    w += 1;
    d = 0;
  }
  return `${w}+${d}`;
}

/** "YYYY-MM-DD" -> Date in UTC, oppure null. */
export function parseISO(s: string | null | undefined): Date | null {
  const p = (s || '').split('-');
  if (p.length !== 3) return null;
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function todayUTC(): Date {
  const t = new Date();
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
}

/**
 * Epoca a una data passata, riportata indietro sulla scala fissata
 * dall'epoca di riferimento.
 */
export function gaAtDate(
  examDate: string | null | undefined,
  referenceDate: string | null | undefined,
  referenceGa: number,
): number {
  const d = parseISO(examDate);
  const ref = parseISO(referenceDate);
  if (!d || !ref) return NaN;
  const days = (ref.getTime() - d.getTime()) / 864e5;
  return referenceGa - days / 7;
}

/** Data presunta del parto a partire dall'epoca di riferimento. */
export function estimatedDueDate(referenceDate: string | null | undefined, referenceGa: number): Date | null {
  const ref = parseISO(referenceDate);
  if (!ref || !Number.isFinite(referenceGa)) return null;
  return addDays(ref, Math.round(TERM_DAYS - referenceGa * 7));
}

export function isGaValid(weeks: number, days: number): boolean {
  const w = Number(weeks);
  const d = Number(days);
  return (
    Number.isFinite(w) && w >= MIN_GA_WEEKS && w <= MAX_GA_WEEKS && Number.isFinite(d) && d >= 0 && d <= 6
  );
}
