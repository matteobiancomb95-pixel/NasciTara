/**
 * Iscrizione alla lista email.
 *
 * Manda a Supabase SOLO l'indirizzo e il consenso. I dati della gravidanza e
 * delle ecografie non passano mai di qui: vengono gestiti separatamente nello storico.
 *
 * Se Supabase non e' configurato la funzione non fallisce e non blocca il
 * flusso: l'utente deve poter usare l'app comunque.
 */

import { supabase } from './supabaseClient';
import type { Lang } from '../i18n';

export interface SignupOutcome {
  saved: boolean;
  reason?: 'not-configured' | 'duplicate' | 'error';
}

export async function saveEmailSignup(email: string, lang: Lang): Promise<SignupOutcome> {
  if (!supabase) return { saved: false, reason: 'not-configured' };
  try {
    const { error } = await supabase
      .from('email_signups')
      .insert({ email: email.toLowerCase(), consent: true, lang, source: 'landing', notice_version:'0.51' });
    if (error) {
      // 23505 = violazione di unicita': l'indirizzo e' gia' iscritto, va bene cosi'.
      if (error.code === '23505') return { saved: true, reason: 'duplicate' };
      return { saved: false, reason: 'error' };
    }
    return { saved: true };
  } catch {
    return { saved: false, reason: 'error' };
  }
}
