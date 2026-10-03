/**
 * La mamma (0.7): visite, integratori e note. Date e ore sono locali (Europe/Rome), come le inserisce la mamma.
 * Qui solo logica pura: calendario del mese, eventi di un giorno, orario del promemoria.
 */

export const SLOTS = ['08:00', '12:00', '19:00', '22:00'] as const;
export type Slot = (typeof SLOTS)[number];
export type NoteTag = 'movimenti' | 'sintomi' | 'umore' | 'medico';
export const NOTE_TAGS: NoteTag[] = ['movimenti', 'sintomi', 'umore', 'medico'];

export interface Visit {
  id: string;
  kind: string;
  visit_date: string; // YYYY-MM-DD
  visit_time: string; // HH:MM
  place: string;
  notes: string;
  remind: boolean;
}

export interface Supplement {
  id: string;
  name: string;
  source: 'ai' | 'doctor';
  dose: string;
  times: Slot[];
  start_date: string;
  end_date: string | null;
  leaflet_quote: string;
  remind: boolean;
}

export interface Note {
  id: string;
  tag: NoteTag;
  body: string;
  ga_label: string;
  created_at: string;
}

export interface DayEvent {
  time: string;
  title: string;
  sub: string;
  kind: 'visit' | 'ai' | 'doctor';
  id: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Oggi a Roma, come YYYY-MM-DD: il calendario non deve cambiare giorno con il fuso del telefono. */
export function romeToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Celle del mese, settimana da lunedì: null fuori dal mese. Sempre multipli di 7. */
export function monthGrid(year: number, month: number): Array<number | null> {
  const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function takesOn(s: Supplement, date: string): boolean {
  return date >= s.start_date && (!s.end_date || date <= s.end_date);
}

/** Visite e assunzioni di un giorno, in ordine di orario. */
export function eventsOn(date: string, visits: Visit[], supplements: Supplement[], lang: 'it' | 'en'): DayEvent[] {
  const it = lang === 'it';
  const moment: Record<Slot, string> = it
    ? { '08:00': 'al mattino', '12:00': 'a pranzo', '19:00': 'a cena', '22:00': 'la sera' }
    : { '08:00': 'in the morning', '12:00': 'at lunch', '19:00': 'at dinner', '22:00': 'in the evening' };
  const out: DayEvent[] = [];
  for (const v of visits) if (v.visit_date === date) out.push({ id: v.id, time: v.visit_time.slice(0, 5), title: v.kind, sub: v.place, kind: 'visit' });
  for (const s of supplements) {
    if (!takesOn(s, date)) continue;
    for (const t of s.times) out.push({ id: s.id, time: t, title: s.name, sub: [s.dose, moment[t]].filter(Boolean).join(' · '), kind: s.source });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** Resolve a Rome wall-clock time independently of the device timezone.
 * On autumn overlap choose standard time, consistent with PostgreSQL AT TIME ZONE.
 * Nonexistent spring times and invalid calendar dates are rejected.
 */
export function romeInstant(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:00)?$/.test(time)) return null;
  const base = Date.parse(`${date}T${time.slice(0, 5)}:00Z`);
  if (!Number.isFinite(base)) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (const offset of [1, 2]) {
    const candidate = new Date(base - offset * 3600000);
    const p = Object.fromEntries(formatter.formatToParts(candidate).map(x => [x.type, x.value]));
    if (`${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time.slice(0, 5)) return candidate;
  }
  return null;
}
/** Six elapsed hours, including across daylight-saving transitions. */
export function visitReminder(v: Pick<Visit, 'visit_date' | 'visit_time'>): { date: string; time: string } {
  const instant = romeInstant(v.visit_date, v.visit_time);
  if (!instant) return { date: '', time: '' };
  const t = new Date(instant.getTime() - 6 * 3600000);
  return { date: romeToday(t), time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t) };
}

/** Le prossime visite da oggi (compreso), le piu' vicine prima. */
export function upcoming(visits: Visit[], today: string, limit = 3): Visit[] {
  return visits
    .filter((v) => v.visit_date >= today)
    .sort((a, b) => (a.visit_date + a.visit_time).localeCompare(b.visit_date + b.visit_time))
    .slice(0, limit);
}

export function shortDate(iso: string, lang: 'it' | 'en', opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  if (!iso) return '—';
  return new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { ...opts, timeZone: 'UTC' });
}
