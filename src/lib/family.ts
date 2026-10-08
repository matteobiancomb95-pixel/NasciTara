import { parseISO, toISO, todayUTC } from './gestationalAge';

/**
 * 1.0: chi usa NasciTara (mamma o papà) e in che fase è la famiglia.
 * La fase non si salva: si calcola dalla data di nascita, così i passaggi
 * in attesa → neo → già genitore avvengono da soli col calendario.
 */
export type Role = 'mamma' | 'papa';
export type Phase = 'attesa' | 'neo' | 'genitore';

/** Neogenitore nei primi 3 mesi di vita del bebe. */
export const NEO_MONTHS = 3;
/** Data di nascita accettata: al massimo 18 anni fa. */
const MAX_AGE_YEARS = 18;

export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + months, day = d.getUTCDate();
  // 30 novembre + 3 mesi = 28/29 febbraio, non 2 marzo.
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return toISO(new Date(Date.UTC(y, m, Math.min(day, last))));
}

/** Data in cui il neogenitore diventa "già genitore". */
export function neoUntil(birthDate: string): string {
  return addMonths(birthDate, NEO_MONTHS);
}

export function validBirthDate(value: unknown, today = toISO(todayUTC())): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !parseISO(value)) return null;
  return value <= today && value >= addMonths(today, -12 * MAX_AGE_YEARS) ? value : null;
}

export function phaseOf(birthDate: string | null | undefined, today = toISO(todayUTC())): Phase {
  const born = validBirthDate(birthDate, today);
  if (!born) return 'attesa';
  return today < neoUntil(born) ? 'neo' : 'genitore';
}

/** Intervallo di date di nascita coerente con la fase scelta in registrazione. */
export function birthRange(phase: Exclude<Phase, 'attesa'>, today = toISO(todayUTC())): { min: string; max: string } {
  const lastNeo = addMonths(today, -NEO_MONTHS);
  if (phase === 'neo') return { min: toISO(new Date(parseISO(lastNeo)!.getTime() + 864e5)), max: today };
  return { min: addMonths(today, -12 * MAX_AGE_YEARS), max: lastNeo };
}

export function ageOf(birthDate: string, today = toISO(todayUTC())): { days: number; weeks: number; months: number; years: number } {
  const b = parseISO(birthDate)!, t = parseISO(today)!;
  const days = Math.max(0, Math.round((t.getTime() - b.getTime()) / 864e5));
  let months = (t.getUTCFullYear() - b.getUTCFullYear()) * 12 + t.getUTCMonth() - b.getUTCMonth();
  if (addMonths(birthDate, months) > today) months -= 1;
  months = Math.max(0, months);
  return { days, weeks: Math.floor(days / 7), months, years: Math.floor(months / 12) };
}

/** "12 giorni", "5 settimane", "4 mesi", "2 anni e 3 mesi". */
export function ageLabel(birthDate: string, lang: 'it' | 'en', today = toISO(todayUTC())): string {
  const { days, weeks, months, years } = ageOf(birthDate, today);
  const it = lang === 'it';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (days < 14) return it ? plural(days, 'giorno', 'giorni') : plural(days, 'day', 'days');
  if (months < 3) return it ? plural(weeks, 'settimana', 'settimane') : plural(weeks, 'week', 'weeks');
  if (years < 2) return it ? plural(months, 'mese', 'mesi') : plural(months, 'month', 'months');
  const rest = months - years * 12;
  const y = it ? plural(years, 'anno', 'anni') : plural(years, 'year', 'years');
  return rest ? `${y} ${it ? 'e' : 'and'} ${it ? plural(rest, 'mese', 'mesi') : plural(rest, 'month', 'months')}` : y;
}

export const ROLE_SECTION = { mamma: { it: 'La mamma', en: 'Mum' }, papa: { it: 'Il papà', en: 'Dad' } } as const;
export const PHASE_NAME = {
  attesa: { it: 'In attesa', en: 'Expecting' },
  neo: { it: 'Neogenitore', en: 'New parent' },
  genitore: { it: 'Già genitore', en: 'Parent' },
} as const;
