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
  /** Impronta della versione online (solo per gli screening letti dal cloud). */
  revision?: string;
}

/**
 * Ultima versione online vista da questo dispositivo, per screening: serve a capire chi ha cambiato cosa.
 * Se la versione online non e' piu' quella vista, qualcun altro ha salvato nel frattempo.
 */
const SYNC_KEY = 'nascitara.sync.094';
export function syncedRevision(id: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(SYNC_KEY) ?? '{}') as Record<string, string>)[id] ?? null;
  } catch {
    return null;
  }
}
export function rememberSynced(id: string, revision: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(SYNC_KEY) ?? '{}') as Record<string, string>;
    all[id] = revision;
    localStorage.setItem(SYNC_KEY, JSON.stringify(all));
  } catch {
    /* Senza memoria locale si ricade sul confronto completo a ogni apertura. */
  }
}

export type SyncDecision = 'same' | 'pull' | 'merge' | 'push';
/** Cosa fare con uno screening che esiste sia qui sia online. */
export function syncDecision(localRev: string, remoteRev: string, lastSeen: string | null): SyncDecision {
  if (localRev === remoteRev) return 'same';
  const remoteChanged = lastSeen === null || remoteRev !== lastSeen;
  const localChanged = lastSeen === null || localRev !== lastSeen;
  if (remoteChanged && localChanged) return 'merge';
  return remoteChanged ? 'pull' : 'push';
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
    // 0.9.4: anche percorso completato e corredino, per accorgersi di ogni modifica fatta su un altro dispositivo.
    completed: state.completed ?? false,
    corredino: state.corredino ?? null,
  });
}

const latestScan = (s: NasciTaraState) => s.scans.map((x) => x.date).filter(Boolean).sort().pop() ?? '';
const blank = (x: NasciTaraState['scans'][number]) => !x.date && [x.hcMm, x.acMm, x.flMm, x.bpdMm].every((v) => v === '');

/**
 * Unisce due versioni dello stesso percorso (due dispositivi) senza perdere dati.
 * - Ecografie: unione per id; a parita' di id vince la versione piu' aggiornata. Copie identiche
 *   (stessa data e stesse misure con id diversi) restano una sola; ecografie vuote tolte se ce ne sono di piene.
 * - Dati di gravidanza, genitori, sesso: dalla versione con l'ecografia piu' recente (a parita', quella online),
 *   completando i campi vuoti con l'altra.
 * - Corredino: per ogni capo il numero piu' alto di pezzi gia' presi. Percorso completato se lo e' in una delle due.
 * Un'ecografia cancellata su un solo dispositivo puo' ricomparire: meglio che perderne una.
 */
export function mergeScreenings(remote: NasciTaraState, local: NasciTaraState): NasciTaraState {
  const [primary, other] = latestScan(local) > latestScan(remote) ? [local, remote] : [remote, local];
  const byId = new Map(other.scans.map((x) => [x.id, x]));
  for (const x of primary.scans) byId.set(x.id, x);
  const key = (x: NasciTaraState['scans'][number]) => [x.date, x.hcMm, x.acMm, x.flMm, x.bpdMm].join('|');
  const seen = new Set<string>();
  let scans = [...byId.values()].filter((x) => {
    if (blank(x)) return true;
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (scans.some((x) => !blank(x))) scans = scans.filter((x) => !blank(x));
  scans.sort((x, y) => (x.date || '9').localeCompare(y.date || '9'));
  const parents = { ...primary.parents };
  for (const k of Object.keys(parents) as Array<keyof typeof parents>) if (parents[k] === '') parents[k] = other.parents[k];
  const bought: Record<string, number> = { ...(other.corredino?.bought ?? {}) };
  for (const [k, v] of Object.entries(primary.corredino?.bought ?? {})) bought[k] = Math.max(v, bought[k] ?? 0);
  const corredino = primary.corredino || other.corredino ? { ...(other.corredino ?? { washes: 3 as const }), ...(primary.corredino ?? {}), bought } : undefined;
  return {
    ...primary,
    babySex: primary.babySex || other.babySex,
    parents,
    scans,
    completed: primary.completed || other.completed,
    ...(corredino ? { corredino } : {}),
  };
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
