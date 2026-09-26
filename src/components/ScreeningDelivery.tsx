import { useEffect, useState } from "react";
import { useAccount } from "../state/AccountContext";
import { useNasciTara } from "../state/NasciTaraStore";
import { supabase } from "../lib/supabaseClient";
import { resultPdfBase64 } from "../lib/exportPdf";
import { screeningRevision } from "../lib/screeningStorage";
export function ScreeningDelivery() {
  const { user, savedRevision, status: saveStatus } = useAccount();
  const { analysis, state, screeningId } = useNasciTara();
  const [status, setStatus] = useState("waiting");
  useEffect(() => {
    setStatus("waiting");
    if (
      !analysis ||
      !state.emailConsent ||
      !user?.email_confirmed_at ||
      user.email?.toLowerCase() !== state.email.trim().toLowerCase() ||
      !savedRevision.startsWith(screeningId + ":")
    )
      return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const revision = await screeningRevision(state);
        if (cancelled || savedRevision !== screeningId + ":" + revision) return;
        setStatus("sending");
        const pdf = await resultPdfBase64({
          analysis,
          lang: state.lang,
          now: new Date(),
        });
        if (cancelled) return;
        const result = await supabase!.functions.invoke("send-screening", {
          body: { screeningId, revision, pdf },
        });
        if (cancelled) return;
        let delivery = result.data?.status;
        if (result.error) {
          try {
            delivery = (await result.error.context?.json())?.status;
          } catch {
            /* Generic network failure. */
          }
        }
        setStatus(delivery ?? "unavailable");
      })().catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [analysis, state, screeningId, savedRevision, user]);
  if (!analysis || !state.emailConsent || !supabase) return null;
  const it = state.lang === "it";
  const verified =
    user?.email_confirmed_at &&
    user.email?.toLowerCase() === state.email.trim().toLowerCase();
  const messages: Record<string, [string, string]> = {
    waiting: [
      "Salvataggio dello screening prima dell’invio…",
      "Saving the screening before sending…",
    ],
    sending: ["Invio del PDF in corso…", "Sending your PDF…"],
    accepted: [
      "PDF affidato al servizio email. Controlla la posta e la cartella spam.",
      "PDF accepted by the email service. Check your inbox and spam folder.",
    ],
    processing: [
      "L’invio di questo risultato è già in elaborazione.",
      "This result is already being processed.",
    ],
    not_configured: [
      "L’invio email non è ancora attivo. Puoi scaricare il PDF qui sotto.",
      "Email sending is not active yet. You can download the PDF below.",
    ],
    limited: [
      "Limite di invii raggiunto. Il PDF resta disponibile per il download.",
      "Sending limit reached. The PDF is still available to download.",
    ],
    unknown: [
      "Non possiamo confermare l’invio. Controlla la posta oppure scarica il PDF; non invieremo un duplicato.",
      "We cannot confirm sending. Check your inbox or download the PDF; we will not send a duplicate.",
    ],
  };
  return (
    <section
      className="delivery-status"
      aria-label={it ? "Risultato via email" : "Result by email"}
    >
      <h2 className="h2">
        {it
          ? "Il risultato, anche nella tua email"
          : "Your result, also by email"}
      </h2>
      {!verified ? (
        <>
          <p>
            {it
              ? "Verifica l’indirizzo inserito per ricevere automaticamente il PDF e ritrovare gli screening anche su altri dispositivi."
              : "Verify your email to receive the PDF automatically and access your screenings on other devices."}
          </p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => window.dispatchEvent(new Event("nascitara:profile"))}
          >
            {it ? "Accedi e ricevi il PDF" : "Sign in and receive the PDF"}
          </button>
        </>
      ) : (
        <p role="status">
          {status === "waiting" && saveStatus.includes("non riuscito")
            ? saveStatus
            : (messages[status] ?? [
                "Invio non riuscito. Puoi scaricare il PDF qui sotto.",
                "Sending failed. You can download the PDF below.",
              ])[it ? 0 : 1]}
        </p>
      )}
    </section>
  );
}
