/** A 2xx without a message id is not proof of provider acceptance. */
export function mailOutcome(status: number, messageId: unknown): 'accepted' | 'failed' | 'unknown' {
  if (status >= 200 && status < 300) return typeof messageId === 'string' && messageId.length > 0 ? 'accepted' : 'unknown';
  return status >= 500 ? 'unknown' : 'failed';
}
export function welcomeMessage(lang: unknown) {
  const it = lang !== 'en';
  return {
    subject: it ? 'Il tuo account NasciTara è attivo' : 'Your NasciTara account is ready',
    textContent: it
      ? 'Benvenuto su NasciTara! La registrazione è completata e il tuo indirizzo email è verificato. Puoi accedere al tuo account, aggiungere le ecografie e ritrovare le tue stime su https://nascitara.tech/. Dalla pagina dei risultati puoi scaricare la stima in PDF. Questa è una comunicazione di servizio, non una newsletter.'
      : 'Welcome to NasciTara! Registration is complete and your email address is verified. Sign in, add scans and find your estimates at https://nascitara.tech/. From the results page you can download your estimate as a PDF. This is a service message, not a newsletter.',
  };
}
