/**
 * Biometria fetale attesa e sensibilita' della stima alle singole misure.
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`. Tabelle e
 * coefficienti di variazione invariati.
 */

import { hadlock4 } from './efwHadlock';

export type MeasureKey = 'BPD' | 'HC' | 'AC' | 'FL';

/** Valori attesi (50o centile) in millimetri, per settimana di gestazione. */
export const BIO: Record<MeasureKey, Array<[number, number]>> = {
  BPD: [[16, 35], [20, 47], [24, 60], [28, 72], [32, 83], [36, 90], [40, 96]],
  HC: [[16, 125], [20, 176], [24, 224], [28, 265], [32, 297], [36, 322], [40, 344]],
  AC: [[16, 105], [20, 152], [24, 199], [28, 243], [32, 285], [36, 322], [40, 355]],
  FL: [[16, 22], [20, 33], [24, 44], [28, 54], [32, 62], [36, 69], [40, 75]],
};

/**
 * Dispersione di popolazione di ciascuna misura, come frazione del valore atteso.
 * Serve a pesare la sensibilita': non basta che una misura muova molto il
 * risultato, deve anche variare abbastanza da feto a feto.
 */
export const BIO_CV: Record<MeasureKey, number> = { BPD: 0.043, HC: 0.037, AC: 0.06, FL: 0.052 };

/** Interpolazione lineare su una tabella `[x, y]` ordinata per x. */
export function interp(tab: Array<[number, number]>, ga: number): number {
  if (ga <= tab[0][0]) return tab[0][1] * (ga / tab[0][0]);
  if (ga >= tab[tab.length - 1][0]) return tab[tab.length - 1][1];
  for (let i = 0; i < tab.length - 1; i++) {
    if (ga >= tab[i][0] && ga <= tab[i + 1][0]) {
      const t = (ga - tab[i][0]) / (tab[i + 1][0] - tab[i][0]);
      return tab[i][1] + t * (tab[i + 1][1] - tab[i][1]);
    }
  }
  return tab[tab.length - 1][1];
}

/** Millimetri attesi per una misura a una data epoca. */
export function expectedMm(key: MeasureKey, ga: number): number {
  return interp(BIO[key], ga);
}

/** Una misura fuori da questa forbice e' quasi sempre un errore di digitazione. */
export function isMeasurePlausible(key: MeasureKey, valueMm: number, ga: number): boolean {
  const exp = expectedMm(key, ga);
  if (!Number.isFinite(exp)) return true;
  return valueMm >= exp * 0.65 && valueMm <= exp * 1.4;
}

export interface SensitivityRow {
  key: MeasureKey;
  /** Derivata di ln(EFW) rispetto alla misura, per centimetro. */
  dLnPerCm: number;
  /** Variazione percentuale dell'EFW per un millimetro in piu'. */
  percentPerMm: number;
  /** Elasticita' standardizzata: derivata x dispersione reale della misura. */
  standardised: number;
  /** Quota percentuale sul totale delle quattro. */
  share: number;
}

/**
 * Quanto pesa ciascuna misura sulla stima, valutato sulle misure realmente
 * inserite. Il metodo e' quello del prototipo: derivata numerica di ln(EFW)
 * moltiplicata per la dispersione di popolazione della misura.
 *
 * Misure in MILLIMETRI.
 */
export function sensitivity(bpdMm: number, hcMm: number, acMm: number, flMm: number): SensitivityRow[] {
  const b = bpdMm / 10;
  const h = hcMm / 10;
  const a = acMm / 10;
  const f = flMm / 10;
  const base = Math.log(hadlock4(b, h, a, f));
  const d = 0.01; // 0,1 mm

  const raw: Array<{ key: MeasureKey; dLnPerCm: number; value: number }> = [
    { key: 'AC', dLnPerCm: (Math.log(hadlock4(b, h, a + d, f)) - base) / d, value: a },
    { key: 'FL', dLnPerCm: (Math.log(hadlock4(b, h, a, f + d)) - base) / d, value: f },
    { key: 'HC', dLnPerCm: (Math.log(hadlock4(b, h + d, a, f)) - base) / d, value: h },
    { key: 'BPD', dLnPerCm: (Math.log(hadlock4(b + d, h, a, f)) - base) / d, value: b },
  ];

  const withStd = raw.map((r) => ({
    ...r,
    standardised: Math.abs(r.dLnPerCm) * BIO_CV[r.key] * r.value,
  }));
  const total = withStd.reduce((s, r) => s + r.standardised, 0);

  return withStd
    .map((r) => ({
      key: r.key,
      dLnPerCm: r.dLnPerCm,
      percentPerMm: (r.dLnPerCm / 10) * 100,
      standardised: r.standardised,
      share: total > 0 ? (100 * r.standardised) / total : 0,
    }))
    .sort((x, y) => y.standardised - x.standardised);
}
