/** Messaggi di errore di Supabase Auth tradotti in frasi utili. */
export function authMessage(message: string | undefined, lang: "it" | "en"): string {
  const it = lang === "it";
  const m = (message ?? "").toLowerCase();
  if (m.includes("error sending") || m.includes("smtp") || m.includes("email_send_failed")) return it ? "Non siamo riusciti a inviare l’email di conferma. Il servizio email è temporaneamente indisponibile: riprova più tardi." : "We could not send the confirmation email. The email service is temporarily unavailable; try again later.";
  if (m === "otp_expired") return it ? "Il link è scaduto o è già stato utilizzato. Richiedi una nuova email di conferma o recupero password." : "This link has expired or was already used. Request a new confirmation or password reset email.";
  if (m === "access_denied") return it ? "Accesso annullato. Puoi riprovare con Google oppure usare email e password." : "Sign-in cancelled. Try Google again or use email and password.";
  if (m === "oauth_callback_error") return it ? "Non siamo riusciti a completare l’accesso. Riprova o usa email e password." : "We could not complete sign-in. Try again or use email and password.";
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout")) return it ? "Connessione non riuscita. Controlla la rete e riprova." : "Connection failed. Check your network and try again.";
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


/** OAuth errors are mapped to safe text; provider descriptions can contain untrusted content. */
export function callbackError(href: string): string | undefined {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('error_code') || hash.get('error_code') || url.searchParams.get('error') || hash.get('error');
  if (!code) return undefined;
  return code === 'otp_expired' ? 'otp_expired' : code === 'access_denied' ? 'access_denied' : 'oauth_callback_error';
}

export async function checkGoogleProvider(url: string, publicKey: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(url + '/auth/v1/settings', {
    headers: { apikey: publicKey }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('unavailable');
  const settings = await response.json();
  if (settings.external?.google !== true) throw new Error('provider is not enabled');
}
