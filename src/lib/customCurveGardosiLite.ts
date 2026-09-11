/**
 * Curva personalizzata NasciTara — rilettura semplificata del metodo Gardosi.
 *
 * NUCLEO VALIDATO (invariato dal prototipo `curva-di-matilde.html`):
 *   peso ottimale a termine = 3480 g
 *     + 9,0 g per cm di altezza materna oltre 163 cm
 *     + 8,5 g per kg di peso materno oltre 64 kg, con termine quadratico -0,08
 *     - 65 g per il sesso femminile
 *
 * ESTENSIONE NasciTara (NON fa parte di Gardosi, NON e' coperta dai test di
 * regressione): contributo dell'altezza paterna. In letteratura l'effetto
 * paterno sul peso alla nascita e' reale ma circa meta' di quello materno;
 * qui si usa un coefficiente conservativo di 4,0 g/cm rispetto a 176 cm.
 * L'estensione vale 0 quando i dati paterni mancano, quindi con i soli dati
 * materni il risultato coincide esattamente con quello del prototipo.
 *
 * ETA' DEI GENITORI: raccolte ma deliberatamente NON usate nel calcolo del
 * peso. L'evidenza e' debole e non lineare; inventare un coefficiente
 * peggiorerebbe una stima clinica. Restano disponibili come contesto.
 */

/** Peso ottimale a termine di riferimento, in grammi. */
export const GARDOSI_LITE_BASE = 3480;
/** Altezza materna di riferimento, in centimetri. */
export const MOTHER_REF_HEIGHT_CM = 163;
/** Peso materno di riferimento, in chilogrammi. */
export const MOTHER_REF_WEIGHT_KG = 64;
/** Altezza paterna di riferimento, in centimetri (estensione NasciTara). */
export const FATHER_REF_HEIGHT_CM = 176;
/** Grammi per centimetro di altezza paterna (estensione NasciTara). */
export const FATHER_HEIGHT_G_PER_CM = 4.0;
/** Correzione per feto femmina, in grammi. */
export const FEMALE_SEX_ADJUSTMENT = -65;

export interface ParentsInput {
  motherHeightCm?: number | null;
  motherWeightKg?: number | null;
  motherAgeYears?: number | null;
  fatherHeightCm?: number | null;
  fatherWeightKg?: number | null;
  fatherAgeYears?: number | null;
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Nucleo validato: identico alla funzione `customTerm(hCm, wKg)` del prototipo.
 * Non modificare — `efwRegression.test.ts` verifica che il valore non cambi.
 */
export function termOptimalWeightMaternal(heightCm: number | null, weightKg: number | null): number {
  let TOW = GARDOSI_LITE_BASE;
  if (heightCm !== null && Number.isFinite(heightCm)) {
    TOW += 9.0 * (heightCm - MOTHER_REF_HEIGHT_CM);
  }
  if (weightKg !== null && Number.isFinite(weightKg)) {
    const d = weightKg - MOTHER_REF_WEIGHT_KG;
    TOW += 8.5 * d - 0.08 * d * d;
  }
  TOW += FEMALE_SEX_ADJUSTMENT;
  return TOW;
}

/** Estensione NasciTara: contributo paterno in grammi. Vale 0 senza dati. */
export function parentalExtensionGrams(parents: ParentsInput): number {
  const fh = num(parents.fatherHeightCm);
  if (fh === null) return 0;
  return FATHER_HEIGHT_G_PER_CM * (fh - FATHER_REF_HEIGHT_CM);
}

export interface CustomCurve {
  /** Peso ottimale a termine in grammi, nucleo + estensione. */
  termOptimalWeight: number;
  /** Quota dovuta ai soli dati materni. */
  maternalGrams: number;
  /** Quota dovuta all'estensione paterna. */
  paternalGrams: number;
  usedMother: boolean;
  usedFather: boolean;
  /** Etichetta da mostrare: dice su quali dati si regge la personalizzazione. */
  coverage: 'nessun dato' | 'solo mamma' | 'solo papa' | 'mamma e papa';
}

export function customCurve(parents: ParentsInput): CustomCurve {
  const mh = num(parents.motherHeightCm);
  const mw = num(parents.motherWeightKg);
  const fh = num(parents.fatherHeightCm);

  const maternalGrams = termOptimalWeightMaternal(mh, mw);
  const paternalGrams = parentalExtensionGrams(parents);

  const usedMother = mh !== null || mw !== null;
  const usedFather = fh !== null;
  const coverage: CustomCurve['coverage'] =
    usedMother && usedFather
      ? 'mamma e papa'
      : usedMother
        ? 'solo mamma'
        : usedFather
          ? 'solo papa'
          : 'nessun dato';

  return {
    termOptimalWeight: maternalGrams + paternalGrams,
    maternalGrams,
    paternalGrams,
    usedMother,
    usedFather,
    coverage,
  };
}

/** BMI materno — serve solo come contesto: sopra 30 le misure ecografiche sono meno precise. */
export function motherBmi(parents: ParentsInput): number | null {
  const h = num(parents.motherHeightCm);
  const w = num(parents.motherWeightKg);
  if (h === null || w === null) return null;
  return w / Math.pow(h / 100, 2);
}

/** Altezza media dei genitori — solo contesto costituzionale, non entra nel peso. */
export function midParentalHeightCm(parents: ParentsInput): number | null {
  const mh = num(parents.motherHeightCm);
  const fh = num(parents.fatherHeightCm);
  if (mh === null || fh === null) return null;
  return (mh + fh) / 2;
}
