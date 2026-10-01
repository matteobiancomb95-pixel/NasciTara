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

/** Promemoria: nell'oggetto mai dati sulla salute, i dettagli solo nel testo. */
export function reminderMessage(r: { kind: string; lang: string; title: string; detail: string; at_local: string }) {
  const it = r.lang !== 'en';
  const detail = r.detail ? ` · ${r.detail}` : '';
  const footer = it
    ? '\n\nGestisci o spegni i promemoria su https://nascitara.tech/ in La mamma › Calendario. Vale sempre l’indicazione del tuo medico.'
    : '\n\nManage or turn off reminders at https://nascitara.tech/ under Mum › Calendar. Your doctor’s advice always comes first.';
  const text = r.kind === 'visit'
    ? (it ? `Tra 6 ore, il ${r.at_local}: ${r.title}${detail}.` : `In 6 hours, on ${r.at_local}: ${r.title}${detail}.`)
    : (it ? `Sono le ${r.at_local}: è il momento di ${r.title}${detail}.` : `It’s ${r.at_local}: time for ${r.title}${detail}.`);
  return { subject: it ? 'Il tuo promemoria NasciTara' : 'Your NasciTara reminder', textContent: text + footer };
}
