import { describe, expect, it } from 'vitest';

/** Rapporto di contrasto WCAG 2.x tra due colori esadecimali. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('contrasto dei colori (WCAG AA, testo normale ≥ 4,5:1)', () => {
  it('testo bianco sui fondi rosa che portano testo', () => {
    expect(contrast('#ffffff', '#d1173f')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', '#b3123a')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', '#8f1230')).toBeGreaterThanOrEqual(4.5);
  });
  it('testi colorati e secondari su bianco e sulle tinte', () => {
    for (const bg of ['#ffffff', '#fff7f8', '#fff0f3']) {
      expect(contrast('#d1173f', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#b01a3e', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#6e6e6e', bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#333333', bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast('#b01a3e', '#ffd0d7')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#333333', '#ffd0d7')).toBeGreaterThanOrEqual(4.5);
  });
  it('il rosa di marca resta per grafica e icone (≥ 3:1)', () => {
    expect(contrast('#ff395c', '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrast('#ffffff', '#333333')).toBeGreaterThanOrEqual(4.5);
  });
});
