import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authMessage, callbackError, checkGoogleProvider } from "../lib/authFeedback";
export { authMessage } from "../lib/authFeedback";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { useNasciTara } from "./NasciTaraStore";
import { toISO, todayUTC } from "../lib/gestationalAge";
import {
  validSavedState,
  screeningRevision,
  hasProgress,
  mergeScreenings,
  rememberSynced,
  syncDecision,
  syncedRevision,
  type SavedScreening,
} from "../lib/screeningStorage";
/** Versione del consenso mostrato in registrazione (privacy e dati sanitari). */
export const CONSENT_VERSION = "0.6";

export interface Profile {
  firstName: string;
  lastName: string;
  /** Settimana dichiarata in registrazione e giorno in cui e' stata dichiarata. */
  gaWeeks: number | null;
  gaReference: string | null;
  consent: boolean;
}

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

interface Account {
  /** Supabase non configurato: in sviluppo si prova il percorso con un account locale finto. */
  preview: boolean;
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  /** L'utente ha aperto il link di recupero: deve scegliere una nuova password. */
  recovering: boolean;
  authError: string;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  signUp: (input: { firstName: string; lastName: string; email: string; password: string; gaWeeks: number; consent: boolean }) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  completeProfile: (input: { firstName?: string; lastName?: string; gaWeeks: number; consent: boolean }) => Promise<AuthResult>;
  /** Area riservata: nome, email (con conferma), settimana e consenso AI. */
  updateProfile: (data: Record<string, unknown>) => Promise<AuthResult>;
  updateEmail: (email: string) => Promise<AuthResult>;
  cloud: SavedScreening[];
  /** Lo storico online di questo utente e' stato letto (anche se vuoto o non disponibile). */
  cloudReady: boolean;
  status: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
  savedRevision: string;
}
const Context = createContext<Account | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, screeningId, dispatch } = useNasciTara();
  const preview = !supabase && import.meta.env.DEV;
  const [ready, setReady] = useState(!supabase);
  const [authError] = useState(() => {
    const code = callbackError(window.location.href);
    return code ? authMessage(code, state.lang) : "";
  });
  const welcomed = useRef(new Set<string>());
  const [recovering, setRecovering] = useState(false);
  const [user, setUser] = useState<User | null>(() => (preview ? loadPreviewUser() : null)),
    [cloud, setCloud] = useState<SavedScreening[]>([]);
  const [cloudFor, setCloudFor] = useState<string | null>(null);
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
      .then(({ data }) => apply(data.session?.user ?? null))
      .finally(() => alive && setReady(true));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      // The same user refreshing a token must not wipe the loaded history.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (alive) setUser(session?.user ?? null);
        return;
      }
      apply(session?.user ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from("screenings")
      .select("id,payload,created_at,updated_at,revision")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (userId.current !== user.id) return;
    setCloudFor(user.id);
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
          revision: r.revision,
        })),
    );
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // Tornando sull'app (altra scheda, telefono sbloccato) si rilegge lo storico e si riconcilia di nuovo.
  useEffect(() => {
    if (!supabase || !user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh().then(() => setReconciled(null));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, refresh]);
  // Prima di salvare online, ogni screening si riconcilia con la versione nel cloud (0.9.4):
  // se e' cambiata solo online si scarica, se sono cambiate entrambe si uniscono. Mai sovrascrivere alla cieca.
  const [reconciled, setReconciled] = useState<string | null>(null);
  const reconciling = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase || !user || cloudFor !== user.id) return;
    if (reconciled === screeningId || reconciling.current === screeningId) return;
    const id = screeningId;
    reconciling.current = id;
    const remote = cloud.find((r) => r.id === id);
    void (async () => {
      if (remote?.revision) {
        const decision = syncDecision(await screeningRevision(state), remote.revision, syncedRevision(id));
        if (reconciling.current !== id) return;
        if (decision === 'pull') dispatch({ type: "restore", state: remote.state });
        if (decision === 'merge') dispatch({ type: "restore", state: mergeScreenings(remote.state, state) });
        // La base del prossimo salvataggio e' la versione online appena vista.
        rememberSynced(id, remote.revision);
      }
      reconciling.current = null;
      setReconciled(id);
    })();
  }, [user, cloudFor, cloud, screeningId, state, reconciled, dispatch]);
  useEffect(() => {
    setSavedRevision("");
    if (reconciled !== screeningId) return;
    if (
      !supabase ||
      !user?.email_confirmed_at ||
      !state.emailConsent ||
      // Uno screening vuoto (dispositivo nuovo, percorso appena aperto) non va nello storico online.
      !hasProgress(state) ||
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
          const base = syncedRevision(screeningId);
          if (base === revision) {
            setSavedRevision(screeningId + ":" + revision);
            return;
          }
          const row = { payload: state, revision, updated_at: new Date().toISOString() };
          // Salvataggio a condizione: riesce solo se online c'e' ancora la versione che questo dispositivo ha visto.
          const { data: saved, error } = base
            ? await client.from("screenings").update(row).eq("id", screeningId).eq("owner_id", owner).eq("revision", base).select("id")
            : await client.from("screenings").insert({ id: screeningId, owner_id: owner, ...row }).select("id");
          if (cancelled || userId.current !== owner) return;
          const conflict = (!error && base && (saved ?? []).length === 0) || error?.code === "23505";
          if (conflict) {
            // Un altro dispositivo ha salvato nel frattempo: si legge la sua versione e si uniscono le due.
            const { data: current } = await client.from("screenings").select("payload,revision").eq("id", screeningId).eq("owner_id", owner).maybeSingle();
            if (cancelled || !current || !validSavedState(current.payload)) return;
            rememberSynced(screeningId, current.revision);
            dispatch({ type: "restore", state: mergeScreenings(current.payload, state) });
            setStatus("Aggiornato con le modifiche fatte su un altro dispositivo.");
            return;
          }
          if (error) {
            setStatus(
              "Salvataggio online non riuscito. La copia su questo dispositivo è disponibile.",
            );
            return;
          }
          rememberSynced(screeningId, revision);
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
  }, [state, screeningId, user, refresh, reconciled, dispatch]);
  // Run outside onAuthStateChange: awaiting Supabase calls inside that callback can deadlock.
  useEffect(() => {
    if (!supabase || !user?.email_confirmed_at || user.user_metadata?.welcome_requested !== true || welcomed.current.has(user.id)) return;
    welcomed.current.add(user.id);
    void supabase.functions.invoke("send-welcome").catch(() => {});
  }, [user]);
  const signOut = async () => {
    await queue.current.catch(() => {});
    await supabase?.auth.signOut({ scope: "local" });
    if (preview) storePreviewUser(null);
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
  const origin = window.location.origin + "/";
  const fail = (e: { message?: string } | null | undefined): AuthResult => ({ ok: false, error: authMessage(e?.message, state.lang) });
  const signUp: Account["signUp"] = async (input) => {
    const data = { welcome_requested: true, lang: state.lang, first_name: input.firstName.trim(), last_name: input.lastName.trim(), ga_weeks: input.gaWeeks, ga_reference: toISO(todayUTC()), consent_version: input.consent ? CONSENT_VERSION : null, consent_at: input.consent ? new Date().toISOString() : null };
    if (!supabase) {
      if (!preview) return fail({ message: "unavailable" });
      setUser(storePreviewUser(input.email.trim(), data));
      return { ok: true };
    }
    const { data: result, error } = await supabase.auth.signUp({ email: input.email.trim(), password: input.password, options: { emailRedirectTo: origin, data } });
    if (error) return fail(error);
    // Without a session the address must be confirmed first (Supabase "Confirm email").
    return { ok: true, needsConfirmation: !result.session };
  };
  const signIn: Account["signIn"] = async (email, password) => {
    if (!supabase) {
      if (!preview) return fail({ message: "unavailable" });
      setUser(storePreviewUser(email.trim(), { first_name: email.split("@")[0], consent_version: CONSENT_VERSION }));
      return { ok: true };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? fail(error) : { ok: true };
  };
  const signInWithGoogle: Account["signInWithGoogle"] = async () => {
    if (!supabase) return fail({ message: preview ? "preview_google" : "unavailable" });
    try {
      await checkGoogleProvider(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    } catch (e) {
      return fail(e instanceof Error ? e : { message: "unavailable" });
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin } });
    return error ? fail(error) : { ok: true };
  };
  const resendConfirmation: Account["resendConfirmation"] = async (email) => {
    if (!supabase) return fail({ message: "unavailable" });
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: origin } });
    return error ? fail(error) : { ok: true };
  };
  const resetPassword: Account["resetPassword"] = async (email) => {
    if (!supabase) return fail({ message: "unavailable" });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin });
    return error ? fail(error) : { ok: true };
  };
  const updatePassword: Account["updatePassword"] = async (password) => {
    if (!supabase) return fail({ message: "unavailable" });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return fail(error);
    setRecovering(false);
    return { ok: true };
  };
  const completeProfile: Account["completeProfile"] = async (input) => {
    const data: Record<string, unknown> = { ga_weeks: input.gaWeeks, ga_reference: toISO(todayUTC()), consent_version: input.consent ? CONSENT_VERSION : null, consent_at: input.consent ? new Date().toISOString() : null };
    if (!user?.user_metadata?.consent_version) { data.welcome_requested = true; data.lang = state.lang; }
    if (input.firstName !== undefined) data.first_name = input.firstName.trim();
    if (input.lastName !== undefined) data.last_name = input.lastName.trim();
    if (!supabase) {
      if (!preview || !user) return fail({ message: "unavailable" });
      setUser(storePreviewUser(user.email ?? "", { ...user.user_metadata, ...data }));
      return { ok: true };
    }
    const { data: result, error } = await supabase.auth.updateUser({ data });
    if (error) return fail(error);
    setUser(result.user);
    return { ok: true };
  };
  const updateProfile: Account["updateProfile"] = async (data) => {
    if (!supabase) {
      if (!preview || !user) return fail({ message: "unavailable" });
      setUser(storePreviewUser(user.email ?? "", { ...user.user_metadata, ...data }));
      return { ok: true };
    }
    const { data: result, error } = await supabase.auth.updateUser({ data });
    if (error) return fail(error);
    setUser(result.user);
    return { ok: true };
  };
  const updateEmail: Account["updateEmail"] = async (email) => {
    if (!supabase) return fail({ message: "unavailable" });
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: origin });
    return error ? fail(error) : { ok: true, needsConfirmation: true };
  };
  const profile = user ? profileOf(user) : null;
  return (
    <Context.Provider
      value={{ preview, ready, user, profile, recovering, authError, resendConfirmation, signUp, signIn, signInWithGoogle, resetPassword, updatePassword, completeProfile, updateProfile, updateEmail, cloud, cloudReady: !!user && cloudFor === user.id, status, refresh, signOut, remove, savedRevision }}
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

/** Nome e settimana arrivano dalla registrazione o, con Google, dal suo profilo. */
export function profileOf(user: User): Profile {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const full = str(m.full_name) || str(m.name);
  const weeks = typeof m.ga_weeks === "number" && Number.isFinite(m.ga_weeks) ? m.ga_weeks : null;
  return {
    firstName: str(m.first_name) || str(m.given_name) || full.split(" ")[0] || "",
    lastName: str(m.last_name) || str(m.family_name) || full.split(" ").slice(1).join(" "),
    gaWeeks: weeks,
    gaReference: typeof m.ga_reference === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.ga_reference) ? m.ga_reference : null,
    consent: typeof m.consent_version === "string" && m.consent_version.length > 0,
  };
}

const PREVIEW_KEY = "nascitara.preview-user";
/** Solo in sviluppo senza Supabase: un utente finto nella sessione del browser. */
function loadPreviewUser(): User | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function storePreviewUser(email: string | null, metadata: Record<string, unknown> = {}): User | null {
  const user = email ? ({ id: "00000000-0000-4000-8000-000000000000", email, email_confirmed_at: new Date().toISOString(), user_metadata: metadata, app_metadata: {}, aud: "preview", created_at: new Date().toISOString() } as unknown as User) : null;
  try {
    if (user) sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* The preview simply does not survive a reload. */
  }
  return user;
}
