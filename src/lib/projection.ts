/**
 * Serie di proiezione per il grafico e per il filtro per settimana.
 *
 * Non contiene formule proprie: chiama `estimateAt` e `estimateLength` esattamente
 * come fa `analysis.ts`, solo a epoche arbitrarie invece che a due epoche fisse.
 *
 * ============================ AVVERTENZA ============================
 * La proiezione arriva a 45 settimane perche' il prodotto lo richiede, ma
 * oltre la 42a settimana i numeri non hanno piu' dati dietro:
 *
 *  - la curva di Hadlock 1991 e' stata adattata su dati fra la 20a e la 40a
 *    settimana. exp(0.578 + 0.332*EG - 0.00354*EG^2) continua a salire fino a
 *    circa la 47a settimana, ma e' il polinomio che prosegue, non la biologia;
 *  - dopo la nascita la crescita cambia regime e segue curve completamente
 *    diverse (standard di crescita infantile OMS), non la curva intrauterina.
 *
 * Per questo `isExtrapolated` marca ogni punto oltre la soglia e l'interfaccia
 * deve mostrarlo come zona di estrapolazione, mai come previsione.
 * ====================================================================
 */

import { maternalContextAt, type MaternalObservation } from './nasciTara';
import { estimateAt, type Estimate } from './trajectory';
import { estimateLength, refLength } from './fetalLength';
import { refAt, refMean, Z } from './percentilesHadlock1991';
import type { AnalysisResult } from './analysis';

/** Ultima settimana mostrata sul grafico. */
export const PROJECTION_MAX_WEEKS = 45;
/** Da qui in poi il riferimento e' estrapolato: nessun dato dietro. */
export const EXTRAPOLATION_FROM_WEEKS = 42;
/** Nascita a termine: la proiezione "alla nascita" resta ancorata qui. */
export const TERM_WEEKS = 40;

export type Metric = 'weight' | 'length';

export interface ProjectionPoint {
  maternalContext: MaternalObservation | null;
  ga: number;
  /** Peso stimato in grammi. */
  efw: number;
  lo: number;
  hi: number;
  /** Lunghezza stimata in centimetri. */
  lengthCm: number;
  /** Percentile di peso sulla curva di popolazione. */
  pct: number;
  /** Mediana di riferimento: peso in grammi. */
  refWeight: number;
  /** Mediana di riferimento: lunghezza in centimetri. */
  refLengthCm: number;
  /** Oltre la 42a settimana: prolungamento matematico, non previsione. */
  isExtrapolated: boolean;
}

export function isExtrapolated(ga: number): boolean {
  return ga > EXTRAPOLATION_FROM_WEEKS;
}

/** Stima completa a un'epoca qualsiasi, peso e lunghezza insieme. */
export function pointAt(analysis: AnalysisResult, ga: number): ProjectionPoint | null {
  const est: Estimate | null = estimateAt(analysis.trajectory, ga, analysis.customScale);
  if (!est) return null;
  const len = estimateLength({
    lastFlMm: analysis.lastScan.flMm,
    lastGa: analysis.lastScan.ga,
    targetGa: ga,
    z: est.z,
  });
  return {
    ga,
    efw: est.efw,
    maternalContext: maternalContextAt(analysis.nasciTara, ga),
    lo: est.lo,
    hi: est.hi,
    lengthCm: len.cm,
    pct: est.pct,
    refWeight: refMean(ga),
    refLengthCm: refLength(ga),
    isExtrapolated: isExtrapolated(ga),
  };
}

/** Serie campionata per disegnare la curva. */
export function buildProjection(
  analysis: AnalysisResult,
  step = 0.25,
  maxWeeks = PROJECTION_MAX_WEEKS,
): ProjectionPoint[] {
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('step must be positive');
  const from = analysis.points[0].ga;
  const out: ProjectionPoint[] = [];
  for (let ga = from; ga <= maxWeeks + 1e-9; ga += step) {
    const p = pointAt(analysis, Math.min(ga, maxWeeks));
    if (p) out.push(p);
  }
  if (from <= maxWeeks && (!out.length || out[out.length - 1].ga < maxWeeks)) {
    const endpoint = pointAt(analysis, maxWeeks);
    if (endpoint) out.push(endpoint);
  }
  return out;
}

/** Settimane intere selezionabili dal filtro: dalla prima ecografia alla 45a. */
export function selectableWeeks(analysis: AnalysisResult, maxWeeks = PROJECTION_MAX_WEEKS): number[] {
  const first = Math.ceil(analysis.points[0].ga);
  const weeks: number[] = [];
  for (let w = first; w <= maxWeeks; w++) weeks.push(w);
  return weeks;
}

/** Banda di riferimento per la metrica scelta, usata per disegnare le fasce. */
export function referenceBand(ga: number, metric: Metric): { p10: number; p50: number; p90: number } {
  if (metric === 'weight') {
    return { p10: refAt(ga, Z.p10), p50: refMean(ga), p90: refAt(ga, Z.p90) };
  }
  // La lunghezza non ha una tabella di centili propria: la dispersione osservata
  // della lunghezza alla nascita e' circa il 4 % della media, molto piu' stretta
  // di quella del peso. Le fasce sono quindi indicative, non centili pubblicati.
  const m = refLength(ga);
  return { p10: m * (1 - 1.28155 * 0.04), p50: m, p90: m * (1 + 1.28155 * 0.04) };
}

export function metricValue(p: ProjectionPoint, metric: Metric): number {
  return metric === 'weight' ? p.efw : p.lengthCm;
}

export function metricReference(p: ProjectionPoint, metric: Metric): number {
  return metric === 'weight' ? p.refWeight : p.refLengthCm;
}
