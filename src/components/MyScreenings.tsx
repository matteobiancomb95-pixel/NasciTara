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
  const closeButton = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const it = state.lang === "it";
  function show() {
    setEmail(state.email);
    dialog.current?.showModal();
    // Open at the top with focus on the close button, not scrolled down to the first field.
    closeButton.current?.focus();
    if (dialog.current) dialog.current.scrollTop = 0;
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
  const close = () => dialog.current?.close();
  const list = [...records.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return (
    <div className="profile-bar">
      <button
        className="profile-button"
        type="button"
        onClick={show}
        aria-label={it ? "Area riservata: i miei screening" : "Private area: my screenings"}
        title={it ? "Area riservata" : "Private area"}
      >
        <PersonIcon />
      </button>
      {storageError && (
        <span className="profile-bar__alert" role="alert">
          {it
            ? "Salvataggio sul dispositivo non riuscito."
            : "Unable to save on this device."}
        </span>
      )}
      <dialog
        ref={dialog}
        className="screening-dialog"
        aria-labelledby="screening-title"
        // A click on the backdrop lands on the dialog itself: the content fills it edge to edge.
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="sd">
          <header className="sd__hero">
            <span className="sd__avatar" aria-hidden="true">
              <PersonIcon />
            </span>
            <div className="sd__heading">
              <h2 id="screening-title">
                {it ? "I miei screening" : "My screenings"}
              </h2>
              <p>
                {account.user
                  ? account.user.email
                  : it
                    ? "Salva i tuoi screening e ritrovali quando vuoi"
                    : "Save your screenings and find them anytime"}
              </p>
            </div>
            <button
              ref={closeButton}
              type="button"
              className="sd__close"
              onClick={close}
              aria-label={it ? "Chiudi" : "Close"}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="sd__body">
            {account.user ? (
              <section className="sd__card sd__account">
                <p className="sd__signed">
                  <span className="sd__dot" aria-hidden="true" />
                  {it ? "Accesso effettuato" : "Signed in"}
                </p>
                {account.status && <p role="status" className="sd__muted">{account.status}</p>}
                <button
                  type="button"
                  className="sd__link"
                  onClick={() => void account.refresh()}
                >
                  {it ? "Aggiorna storico" : "Refresh history"}
                </button>
              </section>
            ) : (
              <form
                className="sd__card sd__login"
                onSubmit={(e) => {
                  e.preventDefault();
                  void login();
                }}
              >
                <h3>{it ? "Accedi per salvarli online" : "Sign in to save them online"}</h3>
                <p className="sd__muted">
                  {it
                    ? "Le bozze restano su questo browser. Con un link via email le salvi anche nel tuo account e le ritrovi su altri dispositivi."
                    : "Drafts stay in this browser. With an email link you also save them to your account and find them on other devices."}
                </p>
                <label className="sd__field">
                  <span>{it ? "Email di accesso" : "Sign-in email"}</span>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder={it ? "nome@esempio.it" : "name@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button className="btn btn--block" disabled={busy || !supabase}>
                  {busy
                    ? it ? "Invio in corso…" : "Sending…"
                    : it ? "Ricevi link di accesso" : "Email me a sign-in link"}
                </button>
                <p className="fine">
                  {it
                    ? "Accedendo, richiedi il salvataggio online dello screening associato a questa email e l’invio del PDF al termine. Le foto non vengono salvate."
                    : "Signing in enables online storage for the screening associated with this email and automatic PDF sending on completion. Photos are not saved."}
                </p>
              </form>
            )}
            {message && <p role="status" className="sd__notice">{message}</p>}
            <section className="sd__history" aria-labelledby="screening-history">
              <div className="sd__section-head">
                <h3 id="screening-history">{it ? "Storico" : "History"}</h3>
                <span className="sd__count">{list.length}</span>
              </div>
              {list.length ? (
                <div className="sd__list">
                  {list.map((record) => {
                    const inCloud = account.cloud.some((r) => r.id === record.id);
                    return (
                      <article key={record.id} className="sd-item">
                        <div className="sd-item__top">
                          <div>
                            <h4>
                              {it ? "Screening del" : "Screening from"}{" "}
                              {new Date(record.createdAt).toLocaleDateString(
                                it ? "it-IT" : "en-GB",
                              )}
                            </h4>
                            <p>
                              {record.state.scans.length}{" "}
                              {record.state.scans.length === 1
                                ? it ? "ecografia inserita" : "scan entered"
                                : it ? "ecografie inserite" : "scans entered"}{" "}
                              ·{" "}
                              {record.state.gaWeeks || "—"}+{record.state.gaDays || 0}{" "}
                              {it ? "settimane" : "weeks"}
                            </p>
                          </div>
                          <span className={`sd-badge${inCloud ? " sd-badge--cloud" : ""}`}>
                            {inCloud
                              ? it ? "Nel tuo account" : "In your account"
                              : it ? "Su questo dispositivo" : "On this device"}
                          </span>
                        </div>
                        <div className="sd-item__actions">
                          <button
                            className="sd-btn sd-btn--primary"
                            type="button"
                            onClick={() => {
                              openScreening(record);
                              close();
                            }}
                          >
                            {it ? "Riprendi" : "Resume"}
                          </button>
                          <button
                            className="sd-btn"
                            type="button"
                            onClick={() => {
                              openScreening({
                                ...record,
                                state: { ...record.state, page: "measurements" },
                              });
                              close();
                            }}
                          >
                            {it ? "Aggiungi / modifica ecografia" : "Add / edit scan"}
                          </button>
                          <button
                            className="sd-btn sd-btn--danger"
                            type="button"
                            onClick={() => void remove(record)}
                          >
                            {it ? "Elimina" : "Delete"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="sd__empty">
                  <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 3h7l5 5v13H7z" />
                    <path d="M14 3v5h5M10 13h6M10 17h4" />
                  </svg>
                  <p>{it ? "Non hai ancora screening salvati." : "No saved screenings yet."}</p>
                </div>
              )}
            </section>
            <button
              className="btn btn--block sd__new"
              type="button"
              onClick={() => {
                newScreening();
                close();
              }}
            >
              <span aria-hidden="true">＋</span>
              {it ? "Nuovo screening" : "New screening"}
            </button>
          </div>
          <footer className="sd__foot">
            <p className="fine">
              {it
                ? "Dispositivo condiviso? Esci e rimuovi le copie locali quando hai finito. Lo storico online resta nel tuo account."
                : "Shared device? Sign out and remove local copies when finished. Online history remains in your account."}
            </p>
            <button
              type="button"
              className="sd__link"
              onClick={() => {
                void account.signOut().then(() => {
                  forgetDevice();
                  close();
                });
              }}
            >
              {it
                ? "Esci e dimentica questo dispositivo"
                : "Sign out and forget this device"}
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
/** White person on the brand circle; the circle itself comes from the button styles. */
function PersonIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="7.6" r="4.3" />
      <path d="M3.6 20.3c.8-4.4 4.3-7 8.4-7s7.6 2.6 8.4 7c.1.6-.3 1.2-1 1.2H4.6c-.7 0-1.1-.6-1-1.2z" />
    </svg>
  );
}
