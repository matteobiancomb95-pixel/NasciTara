import { setUsageConsent, trackUsage } from '../lib/usageTracking';
import { useState } from 'react';

import { Checkbox, EmailField } from '../components/Field';
import { IconArrow, IconJourney } from '../components/icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { saveEmailSignup } from '../lib/emailSignup';
import type { Lang } from '../i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LandingPage() {
  const { state, dispatch, t } = useNasciTara();
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
          onChange={(v) => {setUsageConsent(v);dispatch({ type: 'setConsent', value: v });}}
        >
          {state.lang==='it'?<>Acconsento alla raccolta della mia email <strong>e delle mie attività all’interno di NasciTara</strong>, per conteggiare gli utenti e migliorare il servizio. Non verrà usata per marketing diretto. <strong>Al termine riceverò il PDF all’indirizzo email indicato, dopo averlo verificato tramite il link di accesso.</strong></>:<>I consent to collecting my email <strong>and my activity within NasciTara</strong> to count users and improve the service. It will not be used for direct marketing. <strong>On completion, the PDF will be emailed to me after I verify my address using the sign-in link.</strong></>}
        </Checkbox>
        <p className="fine">{state.lang==='it'?'Le attività sono conservate per 90 giorni, senza foto né misure nei dati di utilizzo. Gli screening restano su questo dispositivo; dopo l’accesso vengono salvati anche nel tuo account. Puoi eliminarli da “I miei screening”.':'Activity is retained for 90 days, without photos or measurements in usage data. Screenings are stored on this device and, after sign-in, in your account. You can delete them in “My screenings”.'}</p>
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
