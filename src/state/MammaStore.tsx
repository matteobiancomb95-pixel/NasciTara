import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Note, Supplement, Visit } from '../lib/mamma';
import { useAccount } from './AccountContext';

/**
 * Dati di "La mamma": nel database con l'account (servono ai promemoria via email),
 * in memoria nell'esempio e nell'anteprima senza Supabase.
 */
type Table = 'visits' | 'supplements' | 'notes';
type Rows = { visits: Visit[]; supplements: Supplement[]; notes: Note[] };
export type FnResult = { status: string } & Record<string, unknown>;

interface Mamma extends Rows {
  online: boolean;
  error: string;
  add: <T extends Table>(table: T, row: Omit<Rows[T][number], 'id' | (T extends 'notes' ? 'created_at' : never)>) => Promise<boolean>;
  remove: (table: Table, id: string) => Promise<boolean>;
  /** Funzioni server (AI, La tua voce, eliminazione account). */
  call: (name: 'ai' | 'submit-feedback' | 'delete-account', body: Record<string, unknown>) => Promise<FnResult>;
}

const Context = createContext<Mamma | null>(null);
const EMPTY: Rows = { visits: [], supplements: [], notes: [] };
const ORDER: Record<Table, { column: string; ascending: boolean }> = {
  visits: { column: 'visit_date', ascending: true },
  supplements: { column: 'created_at', ascending: true },
  notes: { column: 'created_at', ascending: false },
};

export function MammaProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount();
  const online = Boolean(supabase && user);
  const [rows, setRows] = useState<Rows>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(EMPTY);
    setError('');
    if (!supabase || !user) return;
    let alive = true;
    const client = supabase;
    void Promise.all((['visits', 'supplements', 'notes'] as Table[]).map((t) => client.from(t).select('*').order(ORDER[t].column, { ascending: ORDER[t].ascending }).limit(500)))
      .then(([v, s, n]) => {
        if (!alive) return;
        if (v.error || s.error || n.error) setError('load');
        setRows({
          visits: ((v.data ?? []) as Visit[]).map((r) => ({ ...r, visit_time: r.visit_time.slice(0, 5) })),
          supplements: (s.data ?? []) as Supplement[],
          notes: (n.data ?? []) as Note[],
        });
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const add: Mamma['add'] = useCallback(async (table, row) => {
    setError('');
    if (!supabase || !user) {
      const local = { ...row, id: crypto.randomUUID(), ...(table === 'notes' ? { created_at: new Date().toISOString() } : {}) };
      setRows((r) => ({ ...r, [table]: table === 'notes' ? [local, ...r[table]] : [...r[table], local] }));
      return true;
    }
    const { data, error: e } = await supabase.from(table).insert(row as Record<string, unknown>).select('*').single();
    if (e || !data) {
      setError(e?.message.includes('limit_reached') ? 'limit' : 'save');
      return false;
    }
    const saved = table === 'visits' ? { ...data, visit_time: String(data.visit_time).slice(0, 5) } : data;
    setRows((r) => ({ ...r, [table]: table === 'notes' ? [saved, ...r[table]] : [...r[table], saved] }));
    return true;
  }, [user]);

  const remove: Mamma['remove'] = useCallback(async (table, id) => {
    if (supabase && user) {
      const { error: e } = await supabase.from(table).delete().eq('id', id);
      if (e) {
        setError('save');
        return false;
      }
    }
    setRows((r) => ({ ...r, [table]: (r[table] as Array<{ id: string }>).filter((x) => x.id !== id) }));
    return true;
  }, [user]);

  const call: Mamma['call'] = useCallback(async (name, body) => {
    if (!supabase || !user) return { status: 'offline' };
    const { data, error: e } = await supabase.functions.invoke(name, { body });
    if (data && typeof data.status === 'string') return data as FnResult;
    // Le risposte 4xx/5xx arrivano come errore, con il corpo JSON nel contesto.
    const ctx = (e as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json().catch(() => null);
      if (parsed && typeof parsed.status === 'string') return parsed as FnResult;
    }
    return { status: 'unavailable' };
  }, [user]);

  return <Context.Provider value={{ ...rows, online, error, add, remove, call }}>{children}</Context.Provider>;
}

export function useMamma(): Mamma {
  const value = useContext(Context);
  if (!value) throw new Error('MammaProvider missing');
  return value;
}
