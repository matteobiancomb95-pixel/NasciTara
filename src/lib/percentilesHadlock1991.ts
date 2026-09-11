/**
 * Curva di riferimento di crescita fetale — Hadlock 1991.
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`. Coefficienti invariati.
 *
 * La mediana attesa a una data epoca e' `exp(0.578 + 0.332*EG - 0.00354*EG^2)`,
 * con coefficiente di variazione costante 0,13. Questa coppia riproduce la
 * tabella pubblicata (3o, 10o, 50o, 90o, 97o centile) entro lo 0,3 % fra la
 * 20a e la 40a settimana — verificato in `src/__tests__/efwRegression.test.ts`.
 */

/** Coefficiente di variazione del peso a epoca fissa. */
export const CV = 0.13;

/** Peso mediano atteso in grammi alla settimana `ga` (decimale). */
export function refMean(ga: number): number {
  return Math.exp(0.578 + 0.332 * ga - 0.00354 * ga * ga);
}

/** Peso in grammi allo scarto standardizzato `z` alla settimana `ga`. */
export function refAt(ga: number, z: number): number {
  return refMean(ga) * (1 + z * CV);
}

/** Scarti standardizzati dei centili di riferimento. */
export const Z = {
  p3: -1.88079,
  p10: -1.28155,
  p50: 0,
  p90: 1.28155,
  p97: 1.88079,
} as const;

/** Approssimazione di Abramowitz & Stegun 7.1.26 — errore massimo 1,5e-7. */
export function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return s * y;
}

/** Funzione di ripartizione della normale standard. */
export function phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Scarto standardizzato di un peso osservato rispetto alla curva. */
export function zFromEfw(efw: number, ga: number): number {
  const m = refMean(ga);
  return (efw - m) / (CV * m);
}

/** Percentile (0-100) corrispondente a uno scarto standardizzato. */
export function percentileFromZ(z: number): number {
  return 100 * phi(z);
}
