/**
 * Lunghezza totale stimata del nascituro (cranio-calcagno).
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`. Rapporti e pesi
 * della media invariati.
 *
 * E' la stima MENO SOLIDA delle tre: l'ecografia non misura la lunghezza
 * totale, la deduce dal femore. Consideralo un ordine di grandezza, +/- 2 cm.
 */

import { interp } from './biometry';

/** Rapporto fra lunghezza del femore e lunghezza cranio-calcagno, per epoca. */
export const FL_RATIO: Array<[number, number]> = [
  [20, 0.129],
  [24, 0.144],
  [28, 0.152],
  [32, 0.154],
  [36, 0.153],
  [40, 0.15],
];

export function flRatio(ga: number): number {
  return interp(FL_RATIO, Math.max(20, Math.min(40, ga)));
}

/** Lunghezza cranio-calcagno attesa in centimetri alla settimana `ga`. */
export function refLength(ga: number): number {
  return 1.22 * ga + 1.2;
}

export interface LengthInput {
  /** Femore dell'ultima ecografia utile, in millimetri. */
  lastFlMm: number;
  /** Epoca a cui quel femore e' stato misurato. */
  lastGa: number;
  /** Epoca a cui si vuole la stima. */
  targetGa: number;
  /** Scarto standardizzato del peso: non entra piu' nella lunghezza (0.8), resta per compatibilita'. */
  z?: number;
}

export interface LengthEstimate {
  /** Stima finale in centimetri. */
  cm: number;
  /** Ramo basato sul femore misurato. */
  fromFemurCm: number;
  /** Ramo basato sulla lunghezza attesa per l'epoca, corretta per la corporatura. */
  fromReferenceCm: number;
}

/**
 * Lunghezza dal femore (0.8): il femore misurato da' la lunghezza all'epoca dell'ecografia
 * (femore / rapporto per epoca), poi si proietta in proporzione alla crescita attesa.
 * Un bebe' con femore corto resta proporzionalmente corto anche alla nascita.
 * `fromReferenceCm` resta solo come confronto con la lunghezza tipica per l'epoca.
 */
export function estimateLength(input: LengthInput): LengthEstimate {
  const atScan = input.lastFlMm / 10 / flRatio(input.lastGa);
  const fromFemurCm = atScan * (refLength(input.targetGa) / refLength(input.lastGa));
  return { cm: fromFemurCm, fromFemurCm, fromReferenceCm: refLength(input.targetGa) };
}
