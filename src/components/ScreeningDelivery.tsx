import { useEffect, useRef, useState } from "react";
import { useAccount } from "../state/AccountContext";
import { useNasciTara } from "../state/NasciTaraStore";
import { supabase } from "../lib/supabaseClient";
import { resultPdfBase64 } from "../lib/exportPdf";
import { screeningRevision } from "../lib/screeningStorage";

/** Delivery is an explicit action, never a side effect of opening results. */
export function ScreeningDelivery() {
  const { user, savedRevision, status: saveStatus } = useAccount();
  const { analysis, state, screeningId } = useNasciTara();
  const [status, setStatus] = useState("idle");
  const inFlight = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setStatus("idle");
    return () => { generation.current++; };
  }, [screeningId, savedRevision, user?.id]);
  if (!analysis || !state.emailConsent || !supabase) return null;
  const it = state.lang === "it";
  const verified = !!user?.email_confirmed_at && user.email?.toLowerCase() === state.email.trim().toLowerCase();
  const saved = savedRevision.startsWith(screeningId + ":");
  const locked = ["sending", "accepted", "processing", "unknown", "limited", "failed"].includes(status);
  async function send() {
    if (inFlight.current || !verified || !saved || !analysis || !supabase) return;
    inFlight.current = true;
    const version = generation.current;
    const update = (s: string) => { if (version === generation.current) setStatus(s); };
    update("sending");
    let submitted = false;
    try {
      const revision = await screeningRevision(state);
      if (savedRevision !== screeningId + ":" + revision) { update("stale"); return; }
      const pdf = await resultPdfBase64({ analysis, lang: state.lang, now: new Date() });
      if (version !== generation.current) return;
      submitted = true;
      const result = await supabase.functions.invoke("send-screening", { body: { screeningId, revision, pdf } });
      let delivery = result.data?.status;
      if (result.error) {
        try { delivery = (await result.error.context?.json())?.status; } catch { /* Network outcome uncertain. */ }
      }
      update(delivery ?? (result.error ? "unknown" : "unavailable"));
    } catch {
      update(submitted ? "unknown" : "unavailable");
    } finally { inFlight.current = false; }
  }
  const messages: Record<string, [string, string]> = {
    idle: ["Ti invieremo il PDF solo quando premi il pulsante.", "We will email the PDF only when you press the button."],
    sending: ["Invio del PDF in corso…", "Sending your PDF…"],
    accepted: ["PDF affidato al servizio email. Controlla la posta e lo spam.", "PDF accepted by the email service. Check your inbox and spam."],
    processing: ["Questo risultato è già in elaborazione.", "This result is already being processed."],
    not_configured: ["Invio email non disponibile. Puoi scaricare il PDF.", "Email sending is unavailable. You can download the PDF."],
    limited: ["Limite di invii raggiunto. Il PDF resta disponibile per il download.", "Sending limit reached. The PDF is still available to download."],
    unknown: ["Non possiamo confermare l’invio. Controlla la posta o scarica il PDF; non invieremo un duplicato.", "We cannot confirm sending. Check your inbox or download the PDF; we will not send a duplicate."],
    failed: ["Il servizio email ha rifiutato l’invio. Puoi scaricare il PDF.", "The email service rejected the request. You can download the PDF."],
    stale: ["Le misure sono cambiate. Attendi il salvataggio e riprova.", "Measurements changed. Wait for saving and try again."],
    unavailable: ["Invio non riuscito. Riprova oppure scarica il PDF.", "Sending failed. Try again or download the PDF."],
  };
  return (
    <section className="nt-card nt-stack" aria-label={it ? "Risultato via email" : "Result by email"}>
      <h2 className="nt-h3">{it ? "La tua stima, anche via email" : "Your estimate, also by email"}</h2>
      <p className="nt-body">{verified ? user?.email : (it ? "Accedi con un indirizzo verificato per ricevere il PDF." : "Sign in with a verified email to receive the PDF.")}</p>
      <p className="nt-note" role="status">{!saved && verified
        ? (saveStatus || (it ? "Salvataggio dello screening…" : "Saving your screening…"))
        : (messages[status] ?? messages.unavailable)[it ? 0 : 1]}</p>
      <button type="button" className="nt-btn" disabled={!verified || !saved || locked} onClick={() => void send()}>
        {status === "sending" ? (it ? "Invio in corso…" : "Sending…") : status === "accepted" ? (it ? "Invio richiesto" : "Email requested") : (it ? "Manda la stima all’email" : "Email my estimate")}
      </button>
    </section>
  );
}
