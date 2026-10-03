import { describe, expect, it } from 'vitest';
import { eventsOn, romeInstant, monthGrid, romeToday, upcoming, visitReminder, type Supplement, type Visit } from '../lib/mamma';
import { dailyFor, searchSupport, SUPPORT } from '../lib/support';
import { urgencyOf } from '../../supabase/functions/_shared/urgent';

const visit = (d: string, t: string, kind = 'Visita ginecologica'): Visit => ({ id: d + t, kind, visit_date: d, visit_time: t, place: 'Studio', notes: '', remind: true });
const supp: Supplement = { id: 's1', name: 'Ferro + vitamina C', source: 'ai', dose: '1 compressa', times: ['19:00', '12:00'], start_date: '2026-10-01', end_date: '2026-12-31', leaflet_quote: '', remind: true };

describe('calendario', () => {
  it('ottobre 2026 parte di giovedì, settimana da lunedì', () => {
    const cells = monthGrid(2026, 9);
    expect(cells.slice(0, 4)).toEqual([null, null, null, 1]);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
  it('il promemoria della visita arriva 6 ore prima, anche il giorno prima', () => {
    expect(visitReminder({ visit_date: '2026-10-03', visit_time: '10:30' })).toEqual({ date: '2026-10-03', time: '04:30' });
    expect(visitReminder({ visit_date: '2026-10-03', visit_time: '05:00' })).toEqual({ date: '2026-10-02', time: '23:00' });
  });
  it('eventi del giorno in ordine di orario, integratori solo nel periodo', () => {
    const ev = eventsOn('2026-10-03', [visit('2026-10-03', '10:30')], [supp], 'it');
    expect(ev.map((e) => e.time)).toEqual(['10:30', '12:00', '19:00']);
    expect(ev[1].sub).toBe('1 compressa · a pranzo');
    expect(eventsOn('2027-01-01', [], [supp], 'it')).toHaveLength(0);
  });
  it('prossime visite da oggi, le più vicine prima', () => {
    const list = upcoming([visit('2026-10-24', '09:00'), visit('2026-09-30', '09:00'), visit('2026-10-03', '10:30')], '2026-10-01');
    expect(list.map((v) => v.visit_date)).toEqual(['2026-10-03', '2026-10-24']);
  });
  it('oggi è calcolato sul fuso di Roma', () => {
    expect(romeToday(new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
  });
});

describe('supporto', () => {
  it('quattro contenuti per la settimana, tutti adatti', () => {
    const items = dailyFor(30, 12);
    expect(items).toHaveLength(4);
    expect(new Set(items).size).toBe(4);
    for (const s of items) expect(30 >= s.from && 30 <= s.to).toBe(true);
    expect(dailyFor(30, 13)[0]).not.toBe(items[0]);
  });
  it('ogni link è https e la ricerca trova per titolo', () => {
    for (const s of SUPPORT) expect(s.url.startsWith('https://')).toBe(true);
    expect(searchSupport('caff').map((s) => s.id)).toContain('caffeina');
  });
});

describe('urgenze', () => {
  it('riconosce segnali medici e di crisi', () => {
    expect(urgencyOf('Ho delle perdite di sangue da stamattina')).toBe('medical');
    expect(urgencyOf('Non lo sento più muovere da ieri')).toBe('medical');
    expect(urgencyOf('A volte penso di farla finita')).toBe('crisis');
    expect(urgencyOf('Posso bere il caffè?')).toBe('none');
  });
});

describe('reminder timezone regressions', () => {
 it('reproduces the reported 4 October 03:59 appointment', () => { expect(visitReminder({visit_date:'2026-10-04',visit_time:'03:59'})).toEqual({date:'2026-10-03',time:'21:59'}); });
 it('subtracts six real hours across spring and autumn DST', () => {
  expect(visitReminder({visit_date:'2026-03-29',visit_time:'05:00'})).toEqual({date:'2026-03-28',time:'22:00'});
  expect(visitReminder({visit_date:'2026-10-25',visit_time:'05:00'})).toEqual({date:'2026-10-25',time:'00:00'});
 });
 it('rejects nonexistent dates and spring-clock times', () => {
  expect(romeInstant('2026-02-30','10:00')).toBeNull();expect(romeInstant('2026-03-29','02:30')).toBeNull();expect(romeInstant('2026-10-04','25:00')).toBeNull();
  expect(visitReminder({visit_date:'',visit_time:''})).toEqual({date:'',time:''});
 });
 it('chooses the same standard-time occurrence as PostgreSQL for autumn overlap', () => {expect(romeInstant('2026-10-25','02:30')?.toISOString()).toBe('2026-10-25T01:30:00.000Z');});
 it('has only Italian curated source pages', () => {for(const item of SUPPORT){expect(item.english).not.toBe(true);expect(item.url).not.toMatch(/nhs\.uk|who\.int|\/en\//);}});
});
