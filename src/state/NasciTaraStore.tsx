import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import { analysePregnancy, type AnalysisResult, type UltrasoundInput } from '../lib/analysis';
import { isGaValid, toDecimalWeeks, toISO, todayUTC, addDays } from '../lib/gestationalAge';

/**
 * Stato globale NasciTara.
 *
 * I tre moduli sono indipendenti e leggono/scrivono tutti da qui: non esiste
 * piu' il concetto di passo attivo o bloccato del prototipo a wizard. Ogni
 * modulo puo' essere compilato in qualsiasi momento e i risultati si
 * ricalcolano da soli.
 */

export type NumField = number | '';

export interface ParentsState {
  motherWeightKg: NumField;
  motherHeightCm: NumField;
  motherAgeYears: NumField;
  fatherWeightKg: NumField;
  fatherHeightCm: NumField;
  fatherAgeYears: NumField;
}

export interface ScanState {
  id: string;
  date: string;
  hcMm: NumField;
  acMm: NumField;
  flMm: NumField;
  bpdMm: NumField;
}

export interface NasciTaraState {
  gaWeeks: NumField;
  gaDays: NumField;
  referenceDate: string;
  parents: ParentsState;
  scans: ScanState[];
  /** True finche' i dati caricati sono quelli di esempio. */
  isDemo: boolean;
}

export type Action =
  | { type: 'setGa'; field: 'gaWeeks' | 'gaDays'; value: NumField }
  | { type: 'setReferenceDate'; value: string }
  | { type: 'setParent'; field: keyof ParentsState; value: NumField }
  | { type: 'setScan'; id: string; field: keyof Omit<ScanState, 'id'>; value: NumField | string }
  | { type: 'addScan' }
  | { type: 'removeScan'; id: string }
  | { type: 'loadDemo' }
  | { type: 'reset' };

let scanSeq = 0;
function newScanId(): string {
  scanSeq += 1;
  return `scan-${Date.now().toString(36)}-${scanSeq}`;
}

function emptyScan(date = ''): ScanState {
  return { id: newScanId(), date, hcMm: '', acMm: '', flMm: '', bpdMm: '' };
}

export const EMPTY_PARENTS: ParentsState = {
  motherWeightKg: '',
  motherHeightCm: '',
  motherAgeYears: '',
  fatherWeightKg: '',
  fatherHeightCm: '',
  fatherAgeYears: '',
};

export function emptyState(): NasciTaraState {
  return {
    gaWeeks: '',
    gaDays: '',
    referenceDate: toISO(todayUTC()),
    parents: { ...EMPTY_PARENTS },
    scans: [emptyScan()],
    isDemo: false,
  };
}

/** Gravidanza di esempio: la stessa del prototipo, 33+2 con tre ecografie. */
export function demoState(): NasciTaraState {
  const today = todayUTC();
  return {
    gaWeeks: 33,
    gaDays: 2,
    referenceDate: toISO(today),
    parents: {
      motherWeightKg: 64,
      motherHeightCm: 167,
      motherAgeYears: 34,
      fatherWeightKg: 78,
      fatherHeightCm: 181,
      fatherAgeYears: 36,
    },
    scans: [
      { ...emptyScan(toISO(addDays(today, -89))), hcMm: 176, acMm: 152, flMm: 31, bpdMm: 47 },
      { ...emptyScan(toISO(addDays(today, -37))), hcMm: 262, acMm: 243, flMm: 53, bpdMm: 72 },
      { ...emptyScan(toISO(addDays(today, -6))), hcMm: 298, acMm: 285, flMm: 62, bpdMm: 83 },
    ],
    isDemo: true,
  };
}

function reducer(state: NasciTaraState, action: Action): NasciTaraState {
  const touched = { ...state, isDemo: false };
  switch (action.type) {
    case 'setGa':
      return { ...touched, [action.field]: action.value };
    case 'setReferenceDate':
      return { ...touched, referenceDate: action.value };
    case 'setParent':
      return { ...touched, parents: { ...state.parents, [action.field]: action.value } };
    case 'setScan':
      return {
        ...touched,
        scans: state.scans.map((s) => (s.id === action.id ? { ...s, [action.field]: action.value } : s)),
      };
    case 'addScan':
      return { ...touched, scans: [...state.scans, emptyScan(state.referenceDate)] };
    case 'removeScan': {
      const scans = state.scans.filter((s) => s.id !== action.id);
      return { ...touched, scans: scans.length > 0 ? scans : [emptyScan()] };
    }
    case 'loadDemo':
      return demoState();
    case 'reset':
      return emptyState();
    default:
      return state;
  }
}

function n(v: NumField): number | null {
  return v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
}

export interface StoreValue {
  state: NasciTaraState;
  dispatch: Dispatch<Action>;
  /** Risultati, oppure `null` senza nemmeno un'ecografia completa. */
  analysis: AnalysisResult | null;
  /** Epoca di riferimento in settimane decimali. */
  ga: number;
  gaValid: boolean;
  /** Quante ecografie sono complete. */
  completeScans: number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function NasciTaraProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: NasciTaraState;
}) {
  const [state, dispatch] = useReducer(reducer, initial ?? emptyState());

  const value = useMemo<StoreValue>(() => {
    const gaValid = isGaValid(Number(state.gaWeeks), Number(state.gaDays || 0));
    const ga = toDecimalWeeks(Number(state.gaWeeks) || 0, Number(state.gaDays) || 0);

    const ultrasounds: UltrasoundInput[] = state.scans.map((s) => ({
      id: s.id,
      date: s.date || null,
      hcMm: n(s.hcMm),
      acMm: n(s.acMm),
      flMm: n(s.flMm),
      bpdMm: n(s.bpdMm),
    }));

    const analysis = gaValid
      ? analysePregnancy({
          gaWeeks: Number(state.gaWeeks),
          gaDays: Number(state.gaDays) || 0,
          referenceDate: state.referenceDate,
          parents: {
            motherHeightCm: n(state.parents.motherHeightCm),
            motherWeightKg: n(state.parents.motherWeightKg),
            motherAgeYears: n(state.parents.motherAgeYears),
            fatherHeightCm: n(state.parents.fatherHeightCm),
            fatherWeightKg: n(state.parents.fatherWeightKg),
            fatherAgeYears: n(state.parents.fatherAgeYears),
          },
          ultrasounds,
        })
      : null;

    return {
      state,
      dispatch,
      analysis,
      ga,
      gaValid,
      completeScans: analysis ? analysis.points.length : 0,
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useNasciTara(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useNasciTara va usato dentro <NasciTaraProvider>');
  return ctx;
}
