import { hasUsageConsent, setUsageConsent, trackUsage } from '../lib/usageTracking';
import { useState } from 'react';

import { Checkbox, EmailField } from '../components/Field';
import { IconArrow, IconJourney } from '../components/icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { saveEmailSignup } from '../lib/emailSignup';
import type { Lang } from '../i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Schermata 1 — atterraggio.
 *
 * Raccoglie SOLO l'indirizzo email. I dati della gravidanza e delle ecografie
 * non lasciano mai il dispositivo: il calcolo e' interamente sul client, e il
 * testo del consenso lo dice esplicitamente.
 */
export function LandingPage() {
  const { state, dispatch, t } = useNasciTara();
  const [tracking, setTracking] = useState(hasUsageConsent);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const emailFilled = state.email.trim().length > 0;
  const emailValid = EMAIL_RE.test(state.email.trim());
  const emailError = touched && !emailValid ? t('landing.emailInvalid') : undefined;
  const consentMissing = touched && emailFilled && !state.emailConsent;

  // Email valida e consenso alla raccolta sono obbligatori.
  const canStart = emailValid && state.emailConsent;

  async function start() {
    setTouched(true);
    if (!canStart) return;
    if (emailFilled && emailValid && state.emailConsent) {
      setSending(true);
      const outcome = await saveEmailSignup(state.email.trim(), state.lang);
      if (!outcome.saved && !(import.meta.env.DEV && outcome.reason === 'not-configured')) {
        setSaveError(true); setSending(false); return;
      }
      setSending(false);
    }
    trackUsage('identify', state.email);
    dispatch({ type: 'goTo', page: 'pregnancy' });
  }

  function setLang(lang: Lang) {
    dispatch({ type: 'setLang', value: lang });
  }

  return (
    <div className="col stack--loose stack">
      <div className="spread">
        <div className="lang" role="group" aria-label={t('lang.switch')}>
          <button type="button" aria-pressed={state.lang === 'it'} onClick={() => setLang('it')}>
            IT
          </button>
          <button type="button" aria-pressed={state.lang === 'en'} onClick={() => setLang('en')}>
            EN
          </button>
        </div>

      </div>

      <div>
        <h1 className="h1">{t('landing.title')}</h1>
        <p className="lead">{t('landing.lead')}</p>
      </div>

      <div className="steps">
        <div>
          <IconJourney kind={0} />
          <div className="steps__title">{t('landing.how1.title')}</div>
          <div className="steps__body">{t('landing.how1.body')}</div>
        </div>
        <div>
          <IconJourney kind={1} />
          <div className="steps__title">{t('landing.how2.title')}</div>
          <div className="steps__body">{t('landing.how2.body')}</div>
        </div>
        <div>
          <IconJourney kind={2} />
          <div className="steps__title">{t('landing.how3.title')}</div>
          <div className="steps__body">{t('landing.how3.body')}</div>
        </div>
      </div>

      <div className="stack stack--tight">
        {saveError ? <p role="alert">{state.lang === 'it' ? 'E-mail non salvata. Riprova tra poco.' : 'Email not saved. Please try again.'}</p> : null}
        {import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL ? <p className="fine">Preview locale: l’e-mail è obbligatoria ma non viene salvata finché Supabase non è configurato.</p> : null}
        <EmailField
          label={t('landing.emailLabel')}

          placeholder={t('landing.emailPlaceholder')}
          value={state.email}
          error={emailError}
          onChange={(v) => dispatch({ type: 'setEmail', value: v })}
        />

        <Checkbox
          checked={state.emailConsent}
          onChange={(v) => dispatch({ type: 'setConsent', value: v })}
        >
          {t('landing.gdpr')}
        </Checkbox>
        <Checkbox checked={tracking} onChange={value => { setTracking(value); setUsageConsent(value); }}>
          {state.lang === 'it'
            ? 'Facoltativo: acconsento a collegare la mia e-mail alle pagine raggiunte e alle azioni nell’app, per capire dove migliorare. Nessuna misura o foto viene raccolta. Posso disattivarlo tornando qui; i dati di utilizzo sono conservati per 90 giorni.'
            : 'Optional: I consent to linking my email to pages reached and actions in the app to help improve it. No measurements or photos are collected. I can turn this off by returning here; usage data is kept for 90 days.'}
        </Checkbox>
        {consentMissing ? <p className="field__error">{t('landing.gdprRequired')}</p> : null}
      </div>

      <div>
        <button type="button" className="btn btn--block" onClick={start} disabled={sending || !canStart}>
          {t('landing.start')}
          <IconArrow />
        </button>

      </div>


    </div>
  );
}
