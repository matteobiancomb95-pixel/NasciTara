/**
 * Composizione: da input grezzi ai risultati NasciTara.
 *
 * Questo modulo NON contiene formule proprie. Orchestra i moduli `efwHadlock`, `efwWho`,
 * `percentilesHadlock1991`, `trajectory`, `customCurveGardosiLite` e `fetalLength` come il
 * prototipo `curva-di-matilde.html`, con le protezioni della 0.8 (`robustness`):
 * misure impossibili o incoerenti escluse, ecografie doppie fuse, traiettorie robuste,
 * lunghezza dal femore di tutte le ecografie. Con dati coerenti il peso e' identico al prototipo.
 */

import { buildNasciTaraModel, nasciTaraParentsFromLegacy, legacyParentsFromNasciTara, type NasciTaraParentsInput, type NasciTaraModel } from './nasciTara';
import { hadlock2, hadlock3, hadlock4 } from './efwHadlock';
import { whoEfwOrNull } from './efwWho';
import { percentileFromZ, refMean, zFromEfw } from './percentilesHadlock1991';
import { estimateAt, type Estimate, type TrajectoryPoint } from './trajectory';
import { customCurve, type CustomCurve, type ParentsInput } from './customCurveGardosiLite';
import { estimateLength, femurLengthAt, type LengthEstimate } from './fetalLength';
import { femurObservation } from './femurPercentiles';
import { checkScan, type ScanQc } from './robustness';
import { gaAtDate, toDecimalWeeks, TERM_GA_WEEKS } from './gestationalAge';

export interface UltrasoundInput {
  pesoMammaOsservazione?: number | null;
  id: string;
  /** Data dell'esame. Ignorata se `ga` e' fornita direttamente. */
  date?: string | null;
  /** Epoca in settimane decimali. Ha precedenza sulla data. */
  ga?: number | null;
  hcMm?: number | null;
  acMm?: number | null;
  flMm?: number | null;
  bpdMm?: number | null;
}

export interface PregnancyInput {
  gaWeeks: number;
  gaDays: number;
  referenceDate?: string | null;
  parents?: ParentsInput;
  nasciTaraParents?: NasciTaraParentsInput;
  ultrasounds: UltrasoundInput[];
}

export interface UltrasoundResult {
  id: string;
  ga: number;
  /** Peso stimato con Hadlock a 4 parametri, in grammi. */
  efw: number;
  /** Hadlock HC+AC+FL. */
  efwHc: number;
  /** Hadlock BPD+AC+FL. */
  efwBpd: number;
  /** WHO — `null` sotto la 22a settimana. */
  efwWho: number | null;
  z: number;
  pct: number;
  bpdMm: number;
  hcMm: number;
  acMm: number;
  flMm: number;
  /** Controllo di qualita': misure escluse e formula usata (0.8). */
  qc: ScanQc;
  /** Z del femore sul riferimento Chitty & Altman, se il femore e' utilizzabile. */
  femurZ: number | null;
}

export interface AnalysisResult {
  nasciTara: NasciTaraModel;
  /** Epoca di riferimento in settimane decimali. */
  ga: number;
  /** Ecografie complete, ordinate per epoca. */
  points: UltrasoundResult[];
  /** Quante ecografie sono state fornite in tutto. */
  totalUltrasounds: number;
  /** Stima all'epoca corrente. */
  now: Estimate;
  /** Proiezione a 40+0. */
  term: Estimate;
  lengthNow: LengthEstimate;
  lengthTerm: LengthEstimate;
  custom: CustomCurve;
  /** Rapporto fra curva personalizzata e mediana di popolazione a termine. */
  customScale: number;
  /** True quando c'e' una sola ecografia utile: nessuna traiettoria. */
  singleObservation: boolean;
  /** Punti della traiettoria, per ricalcolare la stima a un'epoca qualsiasi. */
  trajectory: TrajectoryPoint[];
  /** L'ecografia piu' recente fra quelle complete: ancora della stima di lunghezza. */
  lastScan: UltrasoundResult;
  /** Ecografie con femore utilizzabile, ordinate per epoca. */
  femurPoints: UltrasoundResult[];
  /** Traiettoria degli z del femore: base della lunghezza a qualsiasi epoca. */
  femurTrajectory: TrajectoryPoint[];
  /** Ecografie complete escluse dal peso perche' con misure impossibili o incoerenti. */
  excludedFromWeight: UltrasoundResult[];
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/** Una singola ecografia -> risultati, oppure `null` se incompleta o fuori epoca. */
export function analyseUltrasound(
  u: UltrasoundInput,
  referenceDate: string | null | undefined,
  referenceGa: number,
): UltrasoundResult | null {
  const ga = isFiniteNum(u.ga) ? u.ga : gaAtDate(u.date, referenceDate, referenceGa);
  if (!Number.isFinite(ga) || ga < 12 || ga > 43) return null;
  if (!isFiniteNum(u.bpdMm) || !isFiniteNum(u.hcMm) || !isFiniteNum(u.acMm) || !isFiniteNum(u.flMm)) {
    return null;
  }
  const b = u.bpdMm / 10;
  const h = u.hcMm / 10;
  const a = u.acMm / 10;
  const f = u.flMm / 10;
  const who = whoEfwOrNull(h, a, ga);
  const qc = checkScan(ga, { BPD: u.bpdMm, HC: u.hcMm, AC: u.acMm, FL: u.flMm }, who !== null);
  // Con una misura incoerente si usa la formula che non la richiede; altrimenti Hadlock a 4 parametri.
  const efw = qc.formula === 'hadlock3' ? hadlock3(h, a, f) : qc.formula === 'hadlock2' ? hadlock2(b, a, f) : qc.formula === 'who' && who !== null ? who : hadlock4(b, h, a, f);
  const z = zFromEfw(efw, ga);
  const femur = qc.femurUsable ? femurObservation(ga, u.flMm) : null;
  return {
    id: u.id,
    ga,
    efw,
    efwHc: hadlock3(h, a, f),
    efwBpd: hadlock2(b, a, f),
    efwWho: who,
    z,
    pct: percentileFromZ(z),
    bpdMm: u.bpdMm,
    hcMm: u.hcMm,
    acMm: u.acMm,
    flMm: u.flMm,
    qc,
    femurZ: femur ? femur.z : null,
  };
}

/** Ecografie dello stesso giorno (inserite due volte) contano come una sola: media degli z. */
function dedupe(pts: TrajectoryPoint[]): TrajectoryPoint[] {
  const byDay = new Map<number, TrajectoryPoint[]>();
  for (const p of pts) {
    const day = Math.round(p.ga * 7);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  return [...byDay.values()]
    .map((g) => ({ ga: g.reduce((a, p) => a + p.ga, 0) / g.length, z: g.reduce((a, p) => a + p.z, 0) / g.length }))
    .sort((x, y) => x.ga - y.ga);
}

/** Analisi completa. Restituisce `null` se non c'e' almeno un'ecografia utile. */
export function analysePregnancy(input: PregnancyInput): AnalysisResult | null {
  const ga = toDecimalWeeks(input.gaWeeks, input.gaDays);
  const complete = input.ultrasounds
    .map((u) => analyseUltrasound(u, input.referenceDate, ga))
    .filter((r): r is UltrasoundResult => r !== null)
    .sort((x, y) => x.ga - y.ga);
  const points = complete.filter((p) => p.qc.weightUsable);
  const femurPoints = complete.filter((p) => p.femurZ !== null);

  if (points.length === 0) return null;

  const parents = { ...nasciTaraParentsFromLegacy(input.parents ?? {}), ...input.nasciTaraParents };
  const observations = input.ultrasounds.map(u => ({
    id: u.id, date: u.date,
    ga: isFiniteNum(u.ga) ? u.ga : gaAtDate(u.date, input.referenceDate, ga),
    pesoMammaOsservazione: u.pesoMammaOsservazione,
  }));
  if (parents.pesoMammaOsservazione != null) observations.push({
    id: 'reference', ga, date: input.referenceDate,
    pesoMammaOsservazione: parents.pesoMammaOsservazione,
  });
  const nasciTara = buildNasciTaraModel(parents, observations);
  const custom = customCurve(legacyParentsFromNasciTara(parents));
  const customScale = custom.termOptimalWeight / refMean(TERM_GA_WEEKS);

  const traj: TrajectoryPoint[] = dedupe(points.map((p) => ({ ga: p.ga, z: p.z })));
  const femurTrajectory = dedupe(femurPoints.map((p) => ({ ga: p.ga, z: p.femurZ as number })));
  const now = estimateAt(traj, ga, customScale);
  const term = estimateAt(traj, TERM_GA_WEEKS, customScale);
  if (!now || !term) return null;

  const last = points[points.length - 1];
  // Lunghezza dal femore di tutte le ecografie; se nessun femore e' utilizzabile, come prima dall'ultima ecografia.
  const lengthNow = femurLengthAt(femurTrajectory, ga) ?? estimateLength({ lastFlMm: last.flMm, lastGa: last.ga, targetGa: ga, z: now.z });
  const lengthTerm = femurLengthAt(femurTrajectory, TERM_GA_WEEKS) ?? estimateLength({ lastFlMm: last.flMm, lastGa: last.ga, targetGa: TERM_GA_WEEKS, z: term.z });

  return {
    ga,
    points,
    totalUltrasounds: input.ultrasounds.length,
    nasciTara,
    now,
    term,
    lengthNow,
    lengthTerm,
    custom,
    customScale,
    singleObservation: traj.length === 1,
    trajectory: traj,
    lastScan: last,
    femurPoints,
    femurTrajectory,
    excludedFromWeight: complete.filter((p) => !p.qc.weightUsable),
  };
}
