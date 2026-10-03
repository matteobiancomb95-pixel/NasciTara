import { percentileFromZ } from './percentilesHadlock1991';

/** Chitty & Altman, BJOG 2002;109:919–929, appendix (mm, exact weeks).
 * Cross-sectional reference, 12–42 weeks. Not a fetal growth-velocity standard.
 * https://isuog.org/static/uploaded/50d5e03c-79f9-48be-aef57c6151da963b.pdf
 */
export const FEMUR_REFERENCE_URL = 'https://isuog.org/static/uploaded/50d5e03c-79f9-48be-aef57c6151da963b.pdf';
export function femurReference(ga: number) {
  if (!Number.isFinite(ga) || ga < 12 || ga > 42) return null;
  return { mean: 3.4162 * ga - 0.0004791 * ga ** 3 - 32.425, sd: 0.058328 * ga + 1.0605 };
}
export function femurObservation(ga: number, flMm: number) {
  const ref = femurReference(ga);
  if (!ref || !Number.isFinite(flMm) || flMm <= 0) return null;
  const z = (flMm - ref.mean) / ref.sd;
  return { ga, flMm, z, pct: percentileFromZ(z) };
}
/** Descriptive longitudinal index: equal-weight mean of standardized measurements,
 * then normal CDF. NOT a mean of percentiles, current-size prediction, or validated
 * clinical longitudinal percentile. No weight-specific noise coefficients reused.
 * Keep each actual measurement visible so a change is never hidden by the summary.
 */
export function summarizeFemur(scans: readonly { ga: number; flMm: number }[]) {
  const points = scans.map(s => femurObservation(s.ga, s.flMm)).filter((p): p is NonNullable<typeof p> => p !== null).sort((a, b) => a.ga - b.ga);
  if (!points.length) return null;
  const z = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  return { points, z, pct: percentileFromZ(z), excluded: scans.length - points.length };
}
export const percentileLabel = (pct: number, lang: 'it' | 'en') => pct < 1 ? '<1°' : pct > 99 ? '>99°' : `${pct.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { maximumFractionDigits: 1 })}°`;
