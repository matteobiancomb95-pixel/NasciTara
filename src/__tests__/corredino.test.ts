import { describe, it, expect } from 'vitest';
import { buildCorredino, cycleDays, garmentQty, seasonOf, sizesFor, corredinoText } from '../lib/corredino';

const due = (iso: string) => new Date(iso + 'T12:00:00Z');
const base = { birthLengthCm: 50, dueDate: due('2026-12-20'), washes: 3 as const, dryer: false, bought: {}, lang: 'it' as const };

describe('corredino', () => {
  it('uses days between washes: 7 ÷ washes, one more day without a dryer', () => {
    expect(cycleDays(3, false)).toBeCloseTo(3.33, 2);
    expect(cycleDays(3, true)).toBeCloseTo(2.33, 2);
    expect(cycleDays(4, true)).toBe(1.75);
  });
  it('counts changes per day × cycle days, + 1 spare on base garments only, never below the minimum, half for short sizes', () => {
    expect(garmentQty(2, 0, 7 / 3 + 1)).toBe(8);
    expect(garmentQty(0, 2, 3.33)).toBe(2);
    expect(garmentQty(2, 0, 7 / 3 + 1, 0.5)).toBe(4);
    expect(garmentQty(0, 1, 3.33, 0.5)).toBe(1);
    // No spare below one change a day: 0.6 × 3.33 = 2 pieces, not 3.
    expect(garmentQty(0.6, 2, 7 / 3 + 1)).toBe(2);
    expect(garmentQty(0.8, 0, 7 / 3 + 1)).toBe(3);
  });
  it('starts from the first size above birth length + 1 cm', () => {
    expect(sizesFor(49)).toEqual([50, 56, 62]);
    expect(sizesFor(50)).toEqual([56, 62, 68]);
    expect(sizesFor(56)).toEqual([62, 68, 74]);
    expect(sizesFor(60)).toEqual([62, 68, 74]);
  });
  it('maps months to seasons', () => {
    expect([11, 0, 1].map(seasonOf)).toEqual(['winter', 'winter', 'winter']);
    expect([2, 4, 5, 7, 8, 10].map(seasonOf)).toEqual(['spring', 'spring', 'summer', 'summer', 'autumn', 'autumn']);
  });
  it('follows expected growth: weeks of use per size, reduced stock beyond the first 3 months', () => {
    const c = buildCorredino(base);
    expect(c.sizes).toEqual([56, 62, 68]);
    expect(c.columns.map((g) => g.infoSub)).toEqual(['51–56 cm · ~7 sett. d’uso', '57–62 cm · ~6 sett. d’uso', '63–68 cm · scorta ridotta']);
    expect(c.columns[0].infoTop).toBe('SETT. 0–7 · INVERNO');
    expect(c.columns[2].infoTop).toBe('DALLA 14ª SETT. · PRIMAVERA');
    expect(c.columns[0].items[0]).toMatchObject({ name: 'Body manica lunga', qty: 5 });
    expect(c.columns[2].items[0].qty).toBe(3);
    expect(c.seasonHeadline).toBe('Inverno → Primavera');
  });
  it('needs fewer pieces with more washes or a dryer', () => {
    const t = (w: 2 | 3 | 4, dryer: boolean) => buildCorredino({ ...base, washes: w, dryer }).total;
    expect(t(2, false)).toBeGreaterThan(t(3, false));
    expect(t(3, false)).toBeGreaterThan(t(3, true));
    expect(t(4, true)).toBeLessThan(t(3, true));
  });
  it('stays light: about 60 pieces for 3 washes a week without dryer, never above 75', () => {
    const totals = (['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15'] as const).map((d) => buildCorredino({ ...base, dueDate: due(d) }).total);
    for (const t of totals) expect(t).toBeLessThanOrEqual(75);
    expect(Math.max(...totals)).toBeGreaterThanOrEqual(40);
    expect(buildCorredino({ ...base, washes: 2 }).total).toBeLessThanOrEqual(90);
  });
  it('adds one-size accessories for the birth season', () => {
    const winter = buildCorredino(base).accessories;
    const summer = buildCorredino({ ...base, dueDate: due('2026-07-01') }).accessories;
    expect(winter.items.map((i) => i.name)).toContain('Cuffiette');
    expect(winter.items.find((i) => i.name === 'Cuffiette')?.qty).toBe(2);
    expect(summer.items.map((i) => i.name)).toContain('Cappellini');
  });
  it('tracks pieces already bought with language-independent keys, capped at the quantity', () => {
    const bought = { '56|Body manica lunga': 5, '56|Tutine': 99, 'A|Bavaglini': 2 };
    const it = buildCorredino({ ...base, bought });
    const en = buildCorredino({ ...base, bought, lang: 'en' });
    expect(it.columns[0].items[0].have).toBe(5);
    expect(it.columns[0].items[1].have).toBe(it.columns[0].items[1].qty);
    expect(en.columns[0].items[0]).toMatchObject({ name: 'Long-sleeve bodysuits', have: 5 });
    expect(it.have).toBe(5 + it.columns[0].items[1].qty + 2);
    expect(corredinoText(en, 'en')).toContain('5/5 Long-sleeve bodysuits');
  });
});
