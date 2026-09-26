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
import { toISO, todayUTC } from "../lib/gestationalAge";
import {
  validSavedState,
  screeningRevision,
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
  signUp: (input: { firstName: string; lastName: string; email: string; password: string; gaWeeks: number; consent: boolean }) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  completeProfile: (input: { firstName?: string; lastName?: string; gaWeeks: number; consent: boolean }) => Promise<AuthResult>;
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
  const preview = !supabase && import.meta.env.DEV;
  const [ready, setReady] = useState(!supabase);
  const [recovering, setRecovering] = useState(false);
  const [user, setUser] = useState<User | null>(() => (preview ? loadPreviewUser() : null)),
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
    const data = { first_name: input.firstName.trim(), last_name: input.lastName.trim(), ga_weeks: input.gaWeeks, ga_reference: toISO(todayUTC()), consent_version: input.consent ? CONSENT_VERSION : null, consent_at: input.consent ? new Date().toISOString() : null };
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
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin } });
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
  const profile = user ? profileOf(user) : null;
  return (
    <Context.Provider
      value={{ preview, ready, user, profile, recovering, signUp, signIn, signInWithGoogle, resetPassword, updatePassword, completeProfile, cloud, status, refresh, signOut, remove, savedRevision }}
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

/** Messaggi di errore di Supabase Auth tradotti in frasi utili. */
export function authMessage(message: string | undefined, lang: "it" | "en"): string {
  const it = lang === "it";
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return it ? "Email o password non corrette." : "Wrong email or password.";
  if (m.includes("email not confirmed")) return it ? "Conferma prima l’indirizzo: apri il link che ti abbiamo inviato via email." : "Confirm your address first: open the link we emailed you.";
  if (m.includes("already registered") || m.includes("already been registered")) return it ? "Esiste già un account con questa email. Accedi o recupera la password." : "An account with this email already exists. Sign in or reset your password.";
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) return it ? "La password deve avere almeno 8 caratteri, con lettere e numeri." : "Use at least 8 characters with letters and numbers.";
  if (m.includes("rate limit") || m.includes("too many")) return it ? "Troppi tentativi. Riprova tra qualche minuto." : "Too many attempts. Try again in a few minutes.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return it ? "L’accesso con Google non è ancora attivo. Usa email e password." : "Google sign-in is not active yet. Use email and password.";
  if (m === "preview_google") return it ? "Anteprima locale: l’accesso con Google funziona solo online." : "Local preview: Google sign-in works only online.";
  if (m === "unavailable") return it ? "Servizio account non disponibile. Riprova più tardi." : "Account service unavailable. Please try again later.";
  return it ? "Qualcosa non ha funzionato. Riprova." : "Something went wrong. Please try again.";
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
