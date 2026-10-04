import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { demoState, NasciTaraProvider, useNasciTara, type NasciTaraState } from '../state/NasciTaraStore';
import { mergeScreenings, screeningRevision, storeArchive, syncDecision, rememberSynced } from '../lib/screeningStorage';

/**
 * Due dispositivi, un database: un finto Supabase in memoria con la stessa semantica che usa l'app
 * (select filtrata, update condizionato sulla revisione, insert con chiave unica).
 */
type Row = { id: string; owner_id: string; payload: NasciTaraState; revision: string; created_at: string; updated_at: string };
const db = new Map<string, Row>();
const USER = { id: 'u1', email: 'mamma@example.test', email_confirmed_at: '2026-09-01', user_metadata: {}, app_metadata: {} };
let beforeUpdate: (() => void) | null = null;

class Query {
  private filters: Array<[string, unknown]> = [];
  private op: 'select' | 'update' | 'insert' = 'select';
  private body: Partial<Row> = {};
  private single = false;
  constructor(private table: string) {}
  select() { return this; }
  order() { return this; }
  limit() { return this; }
  eq(k: string, v: unknown) { this.filters.push([k, v]); return this; }
  update(b: Partial<Row>) { this.op = 'update'; this.body = b; return this; }
  insert(b: Partial<Row>) { this.op = 'insert'; this.body = b; return this; }
  maybeSingle() { this.single = true; return this; }
  private match = (r: Row) => this.filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v);
  then(resolve: (v: { data: unknown; error: unknown }) => void) {
    if (this.table !== 'screenings') return resolve({ data: [], error: null });
    const now = new Date().toISOString();
    if (this.op === 'insert') {
      if (db.has(this.body.id!)) return resolve({ data: null, error: { code: '23505' } });
      db.set(this.body.id!, { created_at: now, ...this.body, updated_at: now } as Row);
      return resolve({ data: [{ id: this.body.id }], error: null });
    }
    if (this.op === 'update') {
      beforeUpdate?.();
      beforeUpdate = null;
      const hit = [...db.values()].filter(this.match);
      for (const r of hit) db.set(r.id, { ...r, ...this.body, updated_at: now });
      return resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
    }
    const rows = [...db.values()].filter(this.match).map((r) => structuredClone(r));
    return resolve({ data: this.single ? rows[0] ?? null : rows, error: null });
  }
}
vi.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: (t: string) => new Query(t),
    auth: {
      getSession: async () => ({ data: { session: { user: USER } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    functions: { invoke: async () => ({ data: null, error: null }) },
  },
}));

import { AccountProvider } from '../state/AccountContext';

const ID = '57ee99e2-0000-4000-8000-000000000000';
const base = { ...demoState(), lang: 'it' as const, email: USER.email, emailConsent: true, completed: true };
const seven: NasciTaraState = { ...base, scans: [...base.scans, { ...base.scans[2], id: 'eco-7', date: '2026-10-02', hcMm: 305, acMm: 292, flMm: 63, bpdMm: 85 }] };
const six: NasciTaraState = { ...base, gaDays: 0 };
let seen: NasciTaraState | null = null;
function Probe() {
  seen = useNasciTara().state;
  return null;
}
const device = (local: NasciTaraState) => {
  storeArchive({ version: 1, activeId: ID, records: [{ id: ID, createdAt: '2026-09-20', updatedAt: '2026-09-20', state: local }] });
  return render(<NasciTaraProvider><AccountProvider><Probe /></AccountProvider></NasciTaraProvider>);
};
const put = async (state: NasciTaraState) => db.set(ID, { id: ID, owner_id: USER.id, payload: state, revision: await screeningRevision(state), created_at: '2026-09-20', updated_at: '2026-10-04' });

beforeEach(() => {
  db.clear();
  localStorage.clear();
  seen = null;
});
afterEach(cleanup);

describe('decisione di sincronizzazione', () => {
  it('scarica se è cambiato solo online, unisce se sono cambiati entrambi, salva se è cambiato solo qui', () => {
    expect(syncDecision('a', 'a', null)).toBe('same');
    expect(syncDecision('a', 'b', 'a')).toBe('pull');
    expect(syncDecision('c', 'a', 'a')).toBe('push');
    expect(syncDecision('c', 'b', 'a')).toBe('merge');
    expect(syncDecision('c', 'b', null)).toBe('merge');
  });
  it('unione: nessuna ecografia persa, dati di gravidanza dalla versione più aggiornata, corredino al massimo', () => {
    const remote = { ...six, corredino: { washes: 3 as const, bought: { '56|Tutine': 2 } } };
    const local = { ...seven, corredino: { washes: 3 as const, bought: { '56|Tutine': 1, 'A|Bavaglini': 3 } } };
    const m = mergeScreenings(remote, local);
    expect(m.scans.map((s) => s.id)).toEqual(seven.scans.map((s) => s.id));
    expect(m.gaDays).toBe(seven.gaDays);
    expect(m.corredino?.bought).toEqual({ '56|Tutine': 2, 'A|Bavaglini': 3 });
    expect(mergeScreenings(seven, six).scans).toHaveLength(seven.scans.length);
  });
});

describe('due dispositivi (bug 0.9.3)', () => {
  it('il telefono con una copia vecchia scarica il percorso online invece di sovrascriverlo', async () => {
    await put(seven);
    device(six);
    await waitFor(() => expect(seen?.scans).toHaveLength(seven.scans.length));
    await new Promise((r) => setTimeout(r, 900));
    expect(db.get(ID)!.payload.scans).toHaveLength(seven.scans.length);
  });

  it('il desktop con l’ecografia in più la riporta online dopo che il telefono l’aveva cancellata', async () => {
    await put(six); // la versione sovrascritta dal telefono
    device(seven);
    await waitFor(() => expect(db.get(ID)!.payload.scans).toHaveLength(seven.scans.length), { timeout: 3000 });
    expect(seen?.scans).toHaveLength(seven.scans.length);
  });

  it('se un altro dispositivo salva un attimo prima, le due versioni si uniscono', async () => {
    await put(six);
    rememberSynced(ID, db.get(ID)!.revision);
    const other = { ...six, scans: [...six.scans, { ...six.scans[0], id: 'eco-altro', date: '2026-09-25', hcMm: 290, acMm: 270, flMm: 58, bpdMm: 80 }] };
    const otherRev = await screeningRevision(other);
    beforeUpdate = () => db.set(ID, { ...db.get(ID)!, payload: other, revision: otherRev });
    device(seven);
    await waitFor(() => {
      const ids = db.get(ID)!.payload.scans.map((s) => s.id);
      expect(ids).toContain('eco-7');
      expect(ids).toContain('eco-altro');
    }, { timeout: 4000 });
  });
});
