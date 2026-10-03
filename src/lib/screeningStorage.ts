import type { NasciTaraState } from "../state/NasciTaraStore";
/** Local archives can contain multiple accounts; never relabel another account's screening. */
export function belongsToEmail(state: Pick<NasciTaraState, 'email'>, email: string | undefined): boolean {
  return !!email && !!state.email.trim() && state.email.trim().toLowerCase() === email.trim().toLowerCase();
}
/** Uno screening "vero": percorso completato o almeno un'ecografia con data e una misura. */
export function hasProgress(state: Pick<NasciTaraState, 'completed' | 'scans'>): boolean {
  return state.completed === true || state.scans.some((s) => s.date !== '' && [s.hcMm, s.acMm, s.flMm, s.bpdMm].some((v) => v !== ''));
}

/** Lo screening da riaprire su un nuovo dispositivo: il piu' recente completato, altrimenti il piu' recente con dati. */
export function pickResume(records: SavedScreening[], email: string | undefined): SavedScreening | null {
  const mine = records.filter((r) => belongsToEmail(r.state, email) && hasProgress(r.state)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return mine.find((r) => r.state.completed) ?? mine[0] ?? null;
}

export interface SavedScreening {
  id: string;
  createdAt: string;
  updatedAt: string;
  state: NasciTaraState;
}
export const SCREENING_STORAGE_KEY = "nascitara.screenings.051";
export interface ScreeningArchive {
  version: 1;
  activeId: string | null;
  records: SavedScreening[];
}
export function validSavedState(s: unknown): s is NasciTaraState {
  if (!s || typeof s !== "object") return false;
  const v = s as NasciTaraState;
  const num = (x: unknown) =>
    x === "" || (typeof x === "number" && Number.isFinite(x));
  return (
    ["it", "en"].includes(v.lang) &&
    ["landing", "pregnancy", "measurements", "dashboard"].includes(v.page) &&
    ["landing", "pregnancy", "measurements", "dashboard"].includes(v.reached) &&
    typeof v.email === "string" &&
    v.email.length <= 254 &&
    typeof v.emailConsent === "boolean" &&
    typeof v.referenceDate === "string" &&
    v.referenceDate.length <= 10 &&
    num(v.gaWeeks) &&
    num(v.gaDays) &&
    ["", "male", "female"].includes(v.babySex) &&
    !!v.parents &&
    [
      "motherObservationWeightKg",
      "motherWeightKg",
      "motherHeightCm",
      "motherAgeYears",
      "fatherWeightKg",
      "fatherHeightCm",
      "fatherAgeYears",
    ].every((k) => num(v.parents[k as keyof typeof v.parents])) &&
    Array.isArray(v.scans) &&
    v.scans.length > 0 &&
    v.scans.length <= 100 &&
    v.scans.every(
      (x) =>
        !!x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.date === "string" &&
        x.date.length <= 10 &&
        [x.hcMm, x.acMm, x.flMm, x.bpdMm, x.pesoMammaOsservazione].every(num) &&
        (x.source === undefined || ["report", "manual"].includes(x.source)) &&
        (x.reportName === undefined ||
          (typeof x.reportName === "string" && x.reportName.length <= 120)),
    ) &&
    (v.completed === undefined || typeof v.completed === "boolean") &&
    (v.corredino === undefined ||
      (!!v.corredino &&
        [2, 3, 4].includes(v.corredino.washes) &&
        (v.corredino.dryer === undefined || typeof v.corredino.dryer === "boolean") &&
        (v.corredino.bought === undefined ||
          (typeof v.corredino.bought === "object" &&
            !Array.isArray(v.corredino.bought) &&
            Object.keys(v.corredino.bought).length <= 200 &&
            Object.entries(v.corredino.bought).every(([k, n]) => k.length <= 80 && Number.isInteger(n) && n >= 0 && n <= 99))) &&
        (v.corredino.checked === undefined ||
          (Array.isArray(v.corredino.checked) &&
            v.corredino.checked.length <= 200 &&
            v.corredino.checked.every((k) => typeof k === "string" && k.length <= 80)))))
  );
}
export function parseArchive(raw: string | null): ScreeningArchive {
  const empty: ScreeningArchive = { version: 1, activeId: null, records: [] };
  if (!raw) return empty;
  try {
    const d = JSON.parse(raw);
    if (d.version !== 1 || !Array.isArray(d.records) || d.records.length > 50)
      return empty;
    const records = d.records.filter(
      (r: SavedScreening) =>
        r &&
        typeof r === "object" &&
        typeof r.id === "string" &&
        /^[0-9a-f-]{36}$/i.test(r.id) &&
        typeof r.createdAt === "string" &&
        typeof r.updatedAt === "string" &&
        validSavedState(r.state),
    );
    return {
      version: 1,
      activeId: typeof d.activeId === "string" ? d.activeId : null,
      records,
    };
  } catch {
    return empty;
  }
}
export function loadArchive(): ScreeningArchive {
  try {
    return parseArchive(localStorage.getItem(SCREENING_STORAGE_KEY));
  } catch {
    return parseArchive(null);
  }
}
export function storeArchive(archive: ScreeningArchive): void {
  localStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(archive));
}
export function screeningContent(state: NasciTaraState): string {
  return JSON.stringify({
    gaWeeks: state.gaWeeks,
    gaDays: state.gaDays,
    referenceDate: state.referenceDate,
    babySex: state.babySex,
    parents: state.parents,
    scans: state.scans,
    lang: state.lang,
  });
}

export async function screeningRevision(
  state: NasciTaraState,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(screeningContent(state)),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
