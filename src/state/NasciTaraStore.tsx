import {
  loadArchive,
  storeArchive,
  type SavedScreening,
} from "../lib/screeningStorage";
import type { ReportDraft } from "../lib/reportParser";
import {
  createContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import {
  analysePregnancy,
  type AnalysisResult,
  type UltrasoundInput,
} from "../lib/analysis";
import {
  addDays,
  isGaValid,
  toDecimalWeeks,
  toISO,
  todayUTC,
} from "../lib/gestationalAge";
import { translate, type Key, type Lang } from "../i18n";

/**
 * Stato globale NasciTara.
 *
 * La navigazione e' sequenziale: quattro schermate dentro la stessa finestra,
 * ognuna raggiungibile solo dopo la precedente. Header e footer restano fissi.
 */

export type Page = "landing" | "pregnancy" | "measurements" | "dashboard";

export const PAGE_ORDER: Page[] = [
  "landing",
  "pregnancy",
  "measurements",
  "dashboard",
];

export type NumField = number | "";

export interface ParentsState {
  motherObservationWeightKg: NumField;
  /** Peso medio della mamma PRIMA della gravidanza, non quello attuale. */
  motherWeightKg: NumField;
  motherHeightCm: NumField;
  motherAgeYears: NumField;
  fatherWeightKg: NumField;
  fatherHeightCm: NumField;
  fatherAgeYears: NumField;
}

export interface ScanState {
  pesoMammaOsservazione: NumField;
  id: string;
  date: string;
  hcMm: NumField;
  acMm: NumField;
  flMm: NumField;
  bpdMm: NumField;
}

export interface NasciTaraState {
  lang: Lang;
  page: Page;
  /** Schermata piu' avanzata raggiunta: consente di tornare indietro liberamente. */
  reached: Page;
  babySex: "male" | "female" | "";
  email: string;
  emailConsent: boolean;
  gaWeeks: NumField;
  gaDays: NumField;
  referenceDate: string;
  parents: ParentsState;
  scans: ScanState[];
}

export type Action =
  | { type: "restore"; state: NasciTaraState }
  | { type: "importScan"; scan: ReportDraft }
  | { type: "setBabySex"; value: "male" | "female" | "" }
  | { type: "setLang"; value: Lang }
  | { type: "goTo"; page: Page }
  | { type: "setEmail"; value: string }
  | { type: "setConsent"; value: boolean }
  | { type: "setGa"; field: "gaWeeks" | "gaDays"; value: NumField }
  | { type: "setReferenceDate"; value: string }
  | { type: "setParent"; field: keyof ParentsState; value: NumField }
  | {
      type: "setScan";
      id: string;
      field: keyof Omit<ScanState, "id">;
      value: NumField | string;
    }
  | { type: "addScan" }
  | { type: "removeScan"; id: string }
  | { type: "loadDemo" }
  | { type: "reset" };

function newScanId(): string {
  return crypto.randomUUID();
}

function emptyScan(date = ""): ScanState {
  return {
    id: newScanId(),
    date,
    pesoMammaOsservazione: "",
    hcMm: "",
    acMm: "",
    flMm: "",
    bpdMm: "",
  };
}

export const EMPTY_PARENTS: ParentsState = {
  motherObservationWeightKg: "",
  motherWeightKg: "",
  motherHeightCm: "",
  motherAgeYears: "",
  fatherWeightKg: "",
  fatherHeightCm: "",
  fatherAgeYears: "",
};

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "it";
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "it";
}

/** Un nuovo screening parte vuoto; il provider ripristina le bozze salvate. */
export function emptyState(): NasciTaraState {
  return {
    lang: detectLang(),
    page: "landing",
    reached: "landing",
    babySex: "",
    email: "",
    emailConsent: false,
    gaWeeks: "",
    gaDays: "",
    referenceDate: toISO(todayUTC()),
    parents: { ...EMPTY_PARENTS },
    scans: [emptyScan()],
  };
}

/** Gravidanza di esempio, per provare l'app senza avere un referto sottomano. */
export function demoState(): NasciTaraState {
  const today = todayUTC();
  return {
    ...emptyState(),
    page: "dashboard",
    reached: "dashboard",
    gaWeeks: 33,
    gaDays: 2,
    referenceDate: toISO(today),
    parents: {
      motherObservationWeightKg: "",
      motherWeightKg: 64,
      motherHeightCm: 167,
      motherAgeYears: 34,
      fatherWeightKg: 78,
      fatherHeightCm: 181,
      fatherAgeYears: 36,
    },
    scans: [
      {
        ...emptyScan(toISO(addDays(today, -89))),
        hcMm: 176,
        acMm: 152,
        flMm: 31,
        bpdMm: 47,
      },
      {
        ...emptyScan(toISO(addDays(today, -37))),
        hcMm: 262,
        acMm: 243,
        flMm: 53,
        bpdMm: 72,
      },
      {
        ...emptyScan(toISO(addDays(today, -6))),
        hcMm: 298,
        acMm: 285,
        flMm: 62,
        bpdMm: 83,
      },
    ],
  };
}

function furthest(a: Page, b: Page): Page {
  return PAGE_ORDER.indexOf(a) >= PAGE_ORDER.indexOf(b) ? a : b;
}

export function reducer(state: NasciTaraState, action: Action): NasciTaraState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "importScan": {
      const imported = { ...emptyScan(), ...action.scan };
      const blank = state.scans.findIndex(
        (s) =>
          !s.date &&
          s.hcMm === "" &&
          s.acMm === "" &&
          s.flMm === "" &&
          s.bpdMm === "" &&
          s.pesoMammaOsservazione === "",
      );
      const scans =
        blank >= 0
          ? state.scans.map((s, i) =>
              i === blank ? { ...imported, id: s.id } : s,
            )
          : [...state.scans, imported];
      return { ...state, scans };
    }
    case "setBabySex":
      return { ...state, babySex: action.value };
    case "setLang":
      return { ...state, lang: action.value };
    case "goTo":
      return {
        ...state,
        page: action.page,
        reached: furthest(state.reached, action.page),
      };
    case "setEmail":
      return { ...state, email: action.value };
    case "setConsent":
      return { ...state, emailConsent: action.value };
    case "setGa":
      return { ...state, [action.field]: action.value };
    case "setReferenceDate":
      return { ...state, referenceDate: action.value };
    case "setParent":
      return {
        ...state,
        parents: { ...state.parents, [action.field]: action.value },
      };
    case "setScan":
      return {
        ...state,
        scans: state.scans.map((s) =>
          s.id === action.id ? { ...s, [action.field]: action.value } : s,
        ),
      };
    case "addScan":
      return {
        ...state,
        scans: [...state.scans, emptyScan(state.referenceDate)],
      };
    case "removeScan": {
      const scans = state.scans.filter((s) => s.id !== action.id);
      return { ...state, scans: scans.length > 0 ? scans : [emptyScan()] };
    }
    case "loadDemo":
      return { ...demoState(), lang: state.lang };
    case "reset":
      return { ...emptyState(), lang: state.lang };
    default:
      return state;
  }
}

function n(v: NumField): number | null {
  return v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
}

export interface StoreValue {
  state: NasciTaraState;
  screeningId: string;
  screenings: SavedScreening[];
  storageError: boolean;
  openScreening: (record: SavedScreening) => void;
  newScreening: () => void;
  deleteScreening: (id: string) => void;
  forgetDevice: () => void;
  dispatch: Dispatch<Action>;
  analysis: AnalysisResult | null;
  ga: number;
  gaValid: boolean;
  completeScans: number;
  /** Traduce una chiave nella lingua corrente. */
  t: (key: Key, vars?: Record<string, string | number>) => string;
  lang: Lang;
}

const StoreContext = createContext<StoreValue | null>(null);

export function NasciTaraProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: NasciTaraState;
}) {
  const [archive] = useState(() =>
    initial
      ? { version: 1 as const, activeId: null, records: [] }
      : loadArchive(),
  );
  const resumed = archive.records.find((r) => r.id === archive.activeId);
  const [screeningId, setScreeningId] = useState(
    resumed?.id ?? crypto.randomUUID(),
  );
  const [screenings, setScreenings] = useState<SavedScreening[]>(
    archive.records,
  );
  const [storageError, setStorageError] = useState(false);
  const [state, dispatch] = useReducer(
    reducer,
    initial ?? resumed?.state ?? emptyState(),
  );
  const recordsRef = useRef(screenings);
  const persist = useCallback(
    (records: SavedScreening[], activeId: string | null) => {
      try {
        storeArchive({ version: 1, activeId, records });
        setStorageError(false);
      } catch {
        setStorageError(true);
        return false;
      }
      recordsRef.current = records;
      setScreenings(records);
      return true;
    },
    [],
  );
  const openScreening = useCallback((record: SavedScreening) => {
    setScreeningId(record.id);
    dispatch({ type: "restore", state: record.state });
  }, []);
  const newScreening = useCallback(() => {
    persist(recordsRef.current, null);
    setScreeningId(crypto.randomUUID());
    dispatch({ type: "reset" });
  }, [persist]);
  const deleteScreening = useCallback(
    (id: string) => {
      const next = recordsRef.current.filter((r) => r.id !== id);
      if (
        persist(next, id === screeningId ? null : screeningId) &&
        id === screeningId
      ) {
        setScreeningId(crypto.randomUUID());
        dispatch({ type: "reset" });
      }
    },
    [screeningId, persist],
  );
  const forgetDevice = useCallback(() => {
    if (persist([], null)) {
      setScreeningId(crypto.randomUUID());
      dispatch({ type: "reset" });
    }
  }, [persist]);
  useEffect(() => {
    if (initial || !state.emailConsent) return;
    const records = recordsRef.current;
    const previous = records.find((r) => r.id === screeningId);
    if (!previous && records.length >= 50) {
      setStorageError(true);
      return;
    }
    const record = {
      id: screeningId,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state,
    };
    persist(
      [record, ...records.filter((r) => r.id !== screeningId)],
      screeningId,
    );
  }, [state, screeningId, initial, persist]);

  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) =>
      translate(state.lang, key, vars),
    [state.lang],
  );

  const value = useMemo<StoreValue>(() => {
    const gaValid = isGaValid(Number(state.gaWeeks), Number(state.gaDays || 0));
    const ga = toDecimalWeeks(
      Number(state.gaWeeks) || 0,
      Number(state.gaDays) || 0,
    );

    const ultrasounds: UltrasoundInput[] = state.scans.map((s) => ({
      id: s.id,
      pesoMammaOsservazione: n(s.pesoMammaOsservazione),
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
          nasciTaraParents: {
            pesoPreGravidanzaMamma: n(state.parents.motherWeightKg),
            pesoMammaOsservazione: n(state.parents.motherObservationWeightKg),
            altezzaMamma: n(state.parents.motherHeightCm),
            pesoPapa: n(state.parents.fatherWeightKg),
            altezzaPapa: n(state.parents.fatherHeightCm),
            etaMamma: n(state.parents.motherAgeYears),
            etaPapa: n(state.parents.fatherAgeYears),
          },
          ultrasounds,
        })
      : null;

    return {
      state,
      screeningId,
      screenings,
      storageError,
      openScreening,
      newScreening,
      deleteScreening,
      forgetDevice,
      dispatch,
      analysis,
      ga,
      gaValid,
      completeScans: analysis ? analysis.points.length : 0,
      t,
      lang: state.lang,
    };
  }, [
    state,
    t,
    screeningId,
    screenings,
    storageError,
    openScreening,
    newScreening,
    deleteScreening,
    forgetDevice,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useNasciTara(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useNasciTara va usato dentro <NasciTaraProvider>");
  return ctx;
}
