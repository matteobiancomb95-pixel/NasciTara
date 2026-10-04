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
import { femurReference } from './femurPercentiles';
import { fitTrajectory, type TrajectoryPoint } from './trajectory';

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

/** Rumore di misura del femore sulla scala z (circa 1,5–2 mm su una deviazione standard di ~3 mm). */
export const FEMUR_NOISE_Z = 0.6;

/**
 * Lunghezza dal femore di TUTTE le ecografie (0.8, robusta):
 *  1. ogni femore diventa uno z sul riferimento Chitty & Altman (2002) per la sua epoca;
 *  2. sugli z si adatta la stessa retta robusta del peso (un femore anomalo pesa meno, pendenza contratta e limitata);
 *  3. il femore atteso all'epoca richiesta (media + z × deviazione standard) diventa lunghezza con il rapporto
 *     femore/lunghezza per epoca. Oltre la 42a settimana (fine del riferimento) si prosegue con la crescita attesa.
 * Con una sola ecografia, all'epoca dell'esame, coincide con il calcolo precedente (femore / rapporto).
 */
export function femurLengthAt(femur: TrajectoryPoint[], targetGa: number): LengthEstimate | null {
  const t = Math.min(42, Math.max(12, targetGa));
  const fit = fitTrajectory(femur, t, FEMUR_NOISE_Z);
  const ref = femurReference(t);
  if (!fit || !ref) return null;
  const fl = Math.max(1, ref.mean + fit.z * ref.sd);
  let cm = fl / 10 / flRatio(t);
  if (targetGa > 42) cm *= refLength(targetGa) / refLength(42);
  return { cm, fromFemurCm: cm, fromReferenceCm: refLength(targetGa) };
}
