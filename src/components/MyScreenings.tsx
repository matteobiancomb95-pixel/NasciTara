import { useEffect, useRef, useState } from "react";
import { useNasciTara } from "../state/NasciTaraStore";
import { useAccount } from "../state/AccountContext";
import { supabase } from "../lib/supabaseClient";
import type { SavedScreening } from "../lib/screeningStorage";
export function MyScreenings() {
  const {
    state,
    screenings,
    openScreening,
    newScreening,
    deleteScreening,
    forgetDevice,
    storageError,
  } = useNasciTara();
  const account = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const it = state.lang === "it";
  function show() {
    setEmail(state.email);
    dialog.current?.showModal();
    void account.refresh();
  }
  useEffect(() => {
    const open = () => show();
    window.addEventListener("nascitara:profile", open);
    return () => window.removeEventListener("nascitara:profile", open);
  });
  const records = new Map<string, SavedScreening>();
  for (const r of [...account.cloud, ...screenings]) {
    const previous = records.get(r.id);
    if (!previous || r.updatedAt > previous.updatedAt) records.set(r.id, r);
  }
  async function login() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + "/" },
      });
      setMessage(
        error
          ? it
            ? "Invio non riuscito. Riprova tra poco; se persiste, il servizio email non è ancora configurato."
            : "Unable to send access link. Please try again later."
          : it
            ? "Controlla la tua email e apri il link di accesso. Tornerai qui con la tua sessione verificata."
            : "Check your email and open the sign-in link.",
      );
    } catch {
      setMessage(
        it
          ? "Connessione non disponibile. Riprova."
          : "Connection unavailable. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(record: SavedScreening) {
    if (
      !window.confirm(
        it
          ? "Eliminare questo screening dallo storico?"
          : "Delete this screening?",
      )
    )
      return;
    if (
      account.cloud.some((r) => r.id === record.id) &&
      !(await account.remove(record.id))
    )
      return;
    deleteScreening(record.id);
  }
  return (
    <div className="profile-bar">
      <button className="profile-button" type="button" onClick={show}>
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
        </svg>
        {it ? "I miei screening" : "My screenings"}
      </button>
      {storageError && (
        <span role="alert">
          {it
            ? "Salvataggio sul dispositivo non riuscito."
            : "Unable to save on this device."}
        </span>
      )}
      <dialog
        ref={dialog}
        className="screening-dialog"
        aria-labelledby="screening-title"
      >
        <div className="spread">
          <h2 id="screening-title" className="h2">
            {it ? "I miei screening" : "My screenings"}
          </h2>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => dialog.current?.close()}
            aria-label={it ? "Chiudi" : "Close"}
          >
            ✕
          </button>
        </div>
        <p>
          {it
            ? "Le bozze vengono salvate su questo browser. Accedi con un link email per salvare anche nel tuo account e ritrovarle su altri dispositivi."
            : "Drafts are saved in this browser. Sign in with an email link to save to your account and access them on other devices."}
        </p>
        {account.user ? (
          <div className="account-panel">
            <p>{account.user.email}</p>
            <p role="status">{account.status}</p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void account.refresh()}
            >
              {it ? "Aggiorna storico" : "Refresh history"}
            </button>
          </div>
        ) : (
          <form
            className="account-panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
          >
            <label>
              {it ? "Email di accesso" : "Sign-in email"}
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <p className="fine">
              {it
                ? "Accedendo, richiedi il salvataggio online dello screening associato a questa email e l’invio del PDF al termine. Le foto non vengono salvate."
                : "Signing in enables online storage for the screening associated with this email and automatic PDF sending on completion. Photos are not saved."}
            </p>
            <button className="btn" disabled={busy || !supabase}>
              {it ? "Ricevi link di accesso" : "Email me a sign-in link"}
            </button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        <div className="screening-list">
          {[...records.values()]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((record) => (
              <article key={record.id} className="screening-card">
                <h3>
                  {it ? "Screening del" : "Screening from"}{" "}
                  {new Date(record.createdAt).toLocaleDateString(
                    it ? "it-IT" : "en-GB",
                  )}
                </h3>
                <p>
                  {record.state.scans.length}{" "}
                  {it ? "ecografie inserite" : "scans entered"} ·{" "}
                  {record.state.gaWeeks || "—"}+{record.state.gaDays || 0}{" "}
                  {it ? "settimane" : "weeks"}
                </p>
                <small>
                  {account.cloud.some((r) => r.id === record.id)
                    ? it
                      ? "Nel tuo account"
                      : "In your account"
                    : it
                      ? "Su questo dispositivo"
                      : "On this device"}
                </small>
                <div className="photo-actions">
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => {
                      openScreening(record);
                      dialog.current?.close();
                    }}
                  >
                    {it ? "Riprendi" : "Resume"}
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => {
                      openScreening({
                        ...record,
                        state: { ...record.state, page: "measurements" },
                      });
                      dialog.current?.close();
                    }}
                  >
                    {it ? "Aggiungi / modifica ecografia" : "Add / edit scan"}
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => void remove(record)}
                  >
                    {it ? "Elimina" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          {!records.size && (
            <p>
              {it
                ? "Non hai ancora screening salvati."
                : "No saved screenings yet."}
            </p>
          )}
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => {
            newScreening();
            dialog.current?.close();
          }}
        >
          {it ? "Nuovo screening" : "New screening"}
        </button>
        <p className="fine">
          {it
            ? "Dispositivo condiviso? Esci e rimuovi le copie locali quando hai finito. Lo storico online resta nel tuo account."
            : "Shared device? Sign out and remove local copies when finished. Online history remains in your account."}
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            void account.signOut().then(() => {
              forgetDevice();
              dialog.current?.close();
            });
          }}
        >
          {it
            ? "Esci e dimentica questo dispositivo"
            : "Sign out and forget this device"}
        </button>
      </dialog>
    </div>
  );
}
