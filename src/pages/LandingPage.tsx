import { useState } from 'react';

import { Checkbox, EmailField } from '../components/Field';
import { IconArrow } from '../components/icons';
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
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const emailFilled = state.email.trim().length > 0;
  const emailValid = EMAIL_RE.test(state.email.trim());
  const emailError = touched && emailFilled && !emailValid ? t('landing.emailInvalid') : undefined;
  const consentMissing = touched && emailFilled && !state.emailConsent;

  // L'email e' facoltativa: chi non la lascia prosegue comunque.
  const canStart = !emailFilled || (emailValid && state.emailConsent);

  async function start() {
    setTouched(true);
    if (!canStart) return;
    if (emailFilled && emailValid && state.emailConsent) {
      setSending(true);
      await saveEmailSignup(state.email.trim(), state.lang);
      setSending(false);
    }
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
        <button type="button" className="btn-text" onClick={() => dispatch({ type: 'loadDemo' })}>
          {t('landing.demo')}
        </button>
      </div>

      <div>
        <h1 className="h1">{t('landing.title')}</h1>
        <p className="lead">{t('landing.lead')}</p>
      </div>

      <div className="steps">
        <div>
          <div className="steps__title">{t('landing.how1.title')}</div>
          <div className="steps__body">{t('landing.how1.body')}</div>
        </div>
        <div>
          <div className="steps__title">{t('landing.how2.title')}</div>
          <div className="steps__body">{t('landing.how2.body')}</div>
        </div>
        <div>
          <div className="steps__title">{t('landing.how3.title')}</div>
          <div className="steps__body">{t('landing.how3.body')}</div>
        </div>
      </div>

      <div className="stack stack--tight">
        <EmailField
          label={t('landing.emailLabel')}
          hint={t('landing.emailHelp')}
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
        {consentMissing ? <p className="field__error">{t('landing.gdprRequired')}</p> : null}
      </div>

      <div>
        <button type="button" className="btn btn--block" onClick={start} disabled={sending}>
          {t('landing.start')}
          <IconArrow />
        </button>
        <p className="btn-note">{emailFilled ? t('landing.startNote') : t('landing.skip')}</p>
      </div>

      <p className="fine">{t('footer.disclaimer')}</p>
    </div>
  );
}
