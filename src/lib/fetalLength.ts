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
  /** Scarto standardizzato del peso all'epoca richiesta. */
  z: number;
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
 * Media pesata 60/40 fra il ramo femorale (misura scheletrica diretta) e il
 * riferimento per epoca corretto dallo scarto di peso.
 */
export function estimateLength(input: LengthInput): LengthEstimate {
  const fromFemurCm = input.lastFlMm / 10 / flRatio(input.lastGa) + 1.22 * (input.targetGa - input.lastGa);
  const fromReferenceCm = refLength(input.targetGa) * (1 + 0.7 * input.z * 0.04);
  return {
    cm: 0.6 * fromFemurCm + 0.4 * fromReferenceCm,
    fromFemurCm,
    fromReferenceCm,
  };
}
