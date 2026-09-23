import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { useNasciTara } from "./NasciTaraStore";
import {
  validSavedState,
  screeningRevision,
  type SavedScreening,
} from "../lib/screeningStorage";
interface Account {
  user: User | null;
  cloud: SavedScreening[];
  status: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
  savedRevision: string;
}
const Context = createContext<Account | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, screeningId } = useNasciTara();
  const [user, setUser] = useState<User | null>(null),
    [cloud, setCloud] = useState<SavedScreening[]>([]);
  const [status, setStatus] = useState(""),
    [savedRevision, setSavedRevision] = useState("");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const userId = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const apply = (u: User | null) => {
      if (!alive) return;
      userId.current = u?.id ?? null;
      setUser(u);
      setCloud([]);
      setSavedRevision("");
    };
    void supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session?.user ?? null),
    );
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from("screenings")
      .select("id,payload,created_at,updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (userId.current !== user.id) return;
    if (error) {
      setStatus(
        "Storico online non disponibile. I dati su questo dispositivo restano accessibili.",
      );
      return;
    }
    setCloud(
      (data ?? [])
        .filter((r) => validSavedState(r.payload))
        .map((r) => ({
          id: r.id,
          state: r.payload,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
    );
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    setSavedRevision("");
    if (
      !supabase ||
      !user?.email_confirmed_at ||
      !state.emailConsent ||
      user.email?.toLowerCase() !== state.email.trim().toLowerCase()
    )
      return;
    let cancelled = false;
    const client = supabase;
    const owner = user.id;
    const timer = setTimeout(() => {
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (cancelled || userId.current !== owner) return;
          setStatus("Salvataggio nello storico…");
          const revision = await screeningRevision(state);
          if (cancelled) return;
          const { error } = await client
            .from("screenings")
            .upsert({
              id: screeningId,
              owner_id: owner,
              payload: state,
              revision,
              updated_at: new Date().toISOString(),
            });
          if (cancelled || userId.current !== owner) return;
          if (error) {
            setStatus(
              "Salvataggio online non riuscito. La copia su questo dispositivo è disponibile.",
            );
            return;
          }
          setSavedRevision(screeningId + ":" + revision);
          setStatus("Screening salvato nel tuo account.");
          void refresh();
        })
        .catch(() => {
          if (!cancelled) setStatus("Salvataggio online non riuscito.");
        });
    }, 650);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, screeningId, user, refresh]);
  const signOut = async () => {
    await queue.current.catch(() => {});
    await supabase?.auth.signOut({ scope: "local" });
    setUser(null);
    setCloud([]);
    setSavedRevision("");
    setStatus("");
  };
  const remove = async (id: string) => {
    if (!supabase || !user) return false;
    await queue.current.catch(() => {});
    const { error } = await supabase
      .from("screenings")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);
    if (error) {
      setStatus("Eliminazione online non riuscita. Riprova.");
      return false;
    }
    setCloud((records) => records.filter((r) => r.id !== id));
    return true;
  };
  return (
    <Context.Provider
      value={{ user, cloud, status, refresh, signOut, remove, savedRevision }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("AccountProvider missing");
  return value;
}
