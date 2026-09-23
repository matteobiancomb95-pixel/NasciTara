import { describe, it, expect, vi, afterEach } from "vitest";
import { emptyState, reducer } from "../state/NasciTaraStore";
import {
  parseArchive,
  validSavedState,
  screeningRevision,
  storeArchive,
  loadArchive,
} from "../lib/screeningStorage";
describe("screening persistence", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("round-trips a saved draft and active screening", () => {
    const state = emptyState();
    state.emailConsent = true;
    state.email = "example@example.com";
    state.page = "measurements";
    const id = crypto.randomUUID();
    const archive = {
      version: 1 as const,
      activeId: id,
      records: [
        { id, state, createdAt: "2026-09-23", updatedAt: "2026-09-23" },
      ],
    };
    let raw: string | null = null;
    vi.stubGlobal("localStorage", {
      setItem: (_key: string, value: string) => {
        raw = value;
      },
      getItem: () => raw,
    });
    storeArchive(archive);
    expect(loadArchive()).toEqual(archive);
  });
  it("handles broken storage and rejects corrupt or nonfinite clinical state", () => {
    expect(parseArchive("{bad").records).toEqual([]);
    expect(parseArchive("null").records).toEqual([]);
    expect(validSavedState({ ...emptyState(), scans: [null] })).toBe(false);
    expect(validSavedState({ ...emptyState(), gaWeeks: NaN })).toBe(false);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("quota");
      },
    });
    expect(loadArchive().records).toEqual([]);
    expect(() =>
      storeArchive({ version: 1, activeId: null, records: [] }),
    ).toThrow("quota");
  });
  it("new scans never reuse identifiers after restoring another session", () => {
    const prior = emptyState();
    const restored = reducer(emptyState(), { type: "restore", state: prior });
    const updated = reducer(restored, { type: "addScan" });
    expect(new Set(updated.scans.map((s) => s.id)).size).toBe(2);
  });
  it("deduplicates a result across navigation but changes revision for clinical edits", async () => {
    const state = emptyState();
    const revision = await screeningRevision(state);
    expect(
      await screeningRevision({
        ...state,
        page: "dashboard",
        reached: "dashboard",
      }),
    ).toBe(revision);
    expect(await screeningRevision({ ...state, gaWeeks: 33 })).not.toBe(
      revision,
    );
  });
});
