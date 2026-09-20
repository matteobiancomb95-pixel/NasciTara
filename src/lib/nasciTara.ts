/** NasciTara context layer. No changes to the standard fetal estimators.
 * Values are descriptive covariates, not fitted fetal-weight corrections.
 * No thresholds, diagnoses or growth-gain recommendations are inferred.
 */
import type { ParentsInput } from './customCurveGardosiLite';

export interface NasciTaraParentsInput {
  pesoPreGravidanzaMamma?: number | null;
  pesoMammaOsservazione?: number | null;
  altezzaMamma?: number | null;
  pesoPapa?: number | null;
  altezzaPapa?: number | null;
  etaMamma?: number | null;
  etaPapa?: number | null;
}
export interface MaternalObservationInput {
  id: string;
  ga: number;
  date?: string | null;
  pesoMammaOsservazione?: number | null;
}
export interface MaternalObservation {
  id: string;
  ga: number;
  date: string | null;
  pesoMammaOsservazione: number | null;
  deltaPesoMamma: number | null;
}
export interface NasciTaraModel {
  parents: Record<keyof NasciTaraParentsInput, number | null>;
  observations: MaternalObservation[];
  /** Difference at the reference date, only when both weights were supplied. */
  deltaPesoMamma: number | null;
  availableParentFields: (keyof NasciTaraParentsInput)[];
  bmiPreGravidanzaMamma: number | null;
  bmiPapa: number | null;
}
function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
export function deltaPesoMamma(pesoMammaOsservazione?: number | null, pesoPreGravidanzaMamma?: number | null): number | null {
  const current = positive(pesoMammaOsservazione);
  const baseline = positive(pesoPreGravidanzaMamma);
  return current === null || baseline === null ? null : current - baseline;
}
/** Compatibility with the original maternal/paternal inputs. */
export function nasciTaraParentsFromLegacy(parents: ParentsInput): NasciTaraParentsInput {
  return {
    pesoPreGravidanzaMamma: parents.motherWeightKg,
    altezzaMamma: parents.motherHeightCm,
    pesoPapa: parents.fatherWeightKg,
    altezzaPapa: parents.fatherHeightCm,
    etaMamma: parents.motherAgeYears,
    etaPapa: parents.fatherAgeYears,
  };
}
export function legacyParentsFromNasciTara(input: NasciTaraParentsInput): ParentsInput {
  return {
    motherWeightKg: positive(input.pesoPreGravidanzaMamma),
    motherHeightCm: positive(input.altezzaMamma),
    fatherWeightKg: positive(input.pesoPapa),
    fatherHeightCm: positive(input.altezzaPapa),
    motherAgeYears: positive(input.etaMamma),
    fatherAgeYears: positive(input.etaPapa),
  };
}
export function buildNasciTaraModel(input: NasciTaraParentsInput, observations: MaternalObservationInput[]): NasciTaraModel {
  const parents: NasciTaraModel['parents'] = {
    pesoPreGravidanzaMamma: positive(input.pesoPreGravidanzaMamma),
    pesoMammaOsservazione: positive(input.pesoMammaOsservazione),
    altezzaMamma: positive(input.altezzaMamma),
    pesoPapa: positive(input.pesoPapa),
    altezzaPapa: positive(input.altezzaPapa),
    etaMamma: positive(input.etaMamma),
    etaPapa: positive(input.etaPapa),
  };
  return {
    parents,
    observations: observations.filter(o => Number.isFinite(o.ga) && o.ga >= 12 && o.ga <= 43)
      .map(o => ({ id: o.id, ga: o.ga, date: o.date ?? null,
        pesoMammaOsservazione: positive(o.pesoMammaOsservazione),
        deltaPesoMamma: deltaPesoMamma(o.pesoMammaOsservazione, parents.pesoPreGravidanzaMamma),
      })).sort((a,b) => a.ga - b.ga),
    deltaPesoMamma: deltaPesoMamma(parents.pesoMammaOsservazione, parents.pesoPreGravidanzaMamma),
    availableParentFields: (Object.keys(parents) as (keyof NasciTaraParentsInput)[]).filter(k => parents[k] !== null),
    bmiPreGravidanzaMamma: parents.pesoPreGravidanzaMamma !== null && parents.altezzaMamma !== null
      ? parents.pesoPreGravidanzaMamma / (parents.altezzaMamma / 100) ** 2 : null,
    bmiPapa: parents.pesoPapa !== null && parents.altezzaPapa !== null
      ? parents.pesoPapa / (parents.altezzaPapa / 100) ** 2 : null,
  };
}
/** No extrapolation or interpolation of maternal weight; no future data leakage. */
export function maternalContextAt(model: NasciTaraModel, ga: number): MaternalObservation | null {
  return model.observations.filter(o => o.ga <= ga && o.pesoMammaOsservazione !== null).slice(-1)[0] ?? null;
}
