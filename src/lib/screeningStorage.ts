import type { NasciTaraState } from "../state/NasciTaraStore";
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
        [x.hcMm, x.acMm, x.flMm, x.bpdMm, x.pesoMammaOsservazione].every(num),
    )
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
