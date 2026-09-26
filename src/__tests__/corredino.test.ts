import { describe, it, expect } from 'vitest';
import { buildCorredino, seasonOf, sizesFor, corredinoText } from '../lib/corredino';

const due = (iso: string) => new Date(iso + 'T12:00:00Z');

describe('corredino', () => {
  it('picks sizes from the estimated birth length', () => {
    expect(sizesFor(49.6)).toEqual([50, 56, 62]);
    expect(sizesFor(52)).toEqual([56, 62, 68]);
  });
  it('maps months to seasons', () => {
    expect([11, 0, 1].map(seasonOf)).toEqual(['winter', 'winter', 'winter']);
    expect([2, 4, 5, 7, 8, 10].map(seasonOf)).toEqual(['spring', 'spring', 'summer', 'summer', 'autumn', 'autumn']);
  });
  it('dresses each size for the month it will be worn, starting at the due date', () => {
    const c = buildCorredino({ birthLengthCm: 50, dueDate: due('2026-11-18'), washes: 3, checked: [], lang: 'it' });
    expect(c.columns.map((x) => [x.size, x.monthName, x.season])).toEqual([[50, 'Novembre', 'autumn'], [56, 'Dicembre', 'winter'], [62, 'Gennaio', 'winter']]);
    expect(c.seasonHeadline).toBe('Autunno → Inverno');
    expect(c.columns[1].items.some((i) => i.name === 'Sacco nanna')).toBe(true);
  });
  it('scales quantities with washes and needs fewer pieces in the first month', () => {
    const at = (washes: 2 | 3 | 4) => buildCorredino({ birthLengthCm: 50, dueDate: due('2026-07-01'), washes, checked: [], lang: 'it' });
    expect(at(3).columns[1].items[0].qty).toBe(5);
    expect(at(3).columns[0].items[0].qty).toBe(4); // 5 * 0.7 = 3.5 -> 4
    expect(at(2).total).toBeGreaterThan(at(3).total);
    expect(at(4).total).toBeLessThan(at(3).total);
    expect(Math.min(...at(4).columns.flatMap((c) => c.items.map((i) => i.qty)))).toBeGreaterThanOrEqual(1);
  });
  it('counts checked garments with language-independent keys', () => {
    const it = buildCorredino({ birthLengthCm: 50, dueDate: due('2026-07-01'), washes: 3, checked: ['56:Pagliaccetti'], lang: 'it' });
    const en = buildCorredino({ birthLengthCm: 50, dueDate: due('2026-07-01'), washes: 3, checked: ['56:Pagliaccetti'], lang: 'en' });
    expect(it.columns[1].done).toBe(5);
    expect(en.columns[1].items[0]).toMatchObject({ name: 'Rompers', done: true });
    expect(corredinoText(en, 'en')).toContain('✓ 5 × Rompers');
  });
});
