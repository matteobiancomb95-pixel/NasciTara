import { useState, type FormEvent, type ReactNode } from 'react';
import markUrl from '../assets/brand/logo-mark-transparent.png';
import { useAccount } from '../state/AccountContext';
import { useNasciTara } from '../state/NasciTaraStore';
import { addDays, toISO, todayUTC } from '../lib/gestationalAge';
import { localeOf } from '../i18n';
import { Check, GoogleIcon, Logo, Segmented, TextInput, WeekStepper } from '../ui/kit';

export type AuthMode = 'register' | 'login' | 'forgot' | 'sent' | 'recover' | 'complete';

/** Data presunta del parto dalla settimana dichiarata: oggi + (40 − settimana) × 7 giorni. */
export function dueFromWeek(week: number): Date {
  return addDays(todayUTC(), (40 - week) * 7);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongEnough = (p: string) => p.length >= 8 && /\d/.test(p) && /[a-z]/i.test(p);

export function AuthScreen({ initialMode = 'register' }: { initialMode?: AuthMode }) {
  const account = useAccount();
  const { state, dispatch } = useNasciTara();
  const lang = state.lang;
  const it = lang === 'it';
  const [mode, setMode] = useState<AuthMode>(account.recovering ? 'recover' : account.user ? 'complete' : initialMode);
  const [firstName, setFirstName] = useState(account.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(account.profile?.lastName ?? '');
  const [email, setEmail] = useState(state.email);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [week, setWeek] = useState<number>(Number(state.gaWeeks) || account.profile?.gaWeeks || 28);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const go = (m: AuthMode) => {
    setMode(m);
    setError('');
    setInfo('');
  };
  const due = dueFromWeek(week).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  async function run(task: () => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean } | void>) {
    setBusy(true);
    setError('');
    try {
      const r = await task();
      if (r && !r.ok) setError(r.error ?? '');
      return r;
    } catch {
      setError(it ? 'Connessione non riuscita. Controlla la rete e riprova.' : 'Connection failed. Check your network and try again.');
    } finally {
      setBusy(false);
    }
  }

  const register = (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !EMAIL.test(email.trim())) return setError(it ? 'Inserisci nome ed email validi.' : 'Enter a valid name and email.');
    if (!strongEnough(password)) return setError(it ? 'La password deve avere almeno 8 caratteri e un numero.' : 'Use at least 8 characters and a number.');
    if (!consent) return setError(it ? 'Per continuare serve il consenso al trattamento dei dati.' : 'Consent to data processing is required to continue.');
    void run(async () => {
      const r = await account.signUp({ firstName, lastName, email, password, gaWeeks: week, consent });
      if (r.ok) {
        dispatch({ type: 'setProfileGa', weeks: week, days: 0, referenceDate: toISO(todayUTC()) });
        if (r.needsConfirmation) go('sent');
      }
      return r;
    });
  };
  const login = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim()) || !password) return setError(it ? 'Inserisci email e password.' : 'Enter email and password.');
    void run(() => account.signIn(email, password));
  };
  const forgot = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setError(it ? 'Inserisci l’email del tuo account.' : 'Enter your account email.');
    void run(async () => {
      const r = await account.resetPassword(email);
      if (r.ok) setInfo(it ? 'Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password.' : 'If the address is registered, you will receive a link to choose a new password.');
      return r;
    });
  };
  const recover = (e: FormEvent) => {
    e.preventDefault();
    if (!strongEnough(password)) return setError(it ? 'La password deve avere almeno 8 caratteri e un numero.' : 'Use at least 8 characters and a number.');
    void run(() => account.updatePassword(password));
  };
  const complete = (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return setError(it ? 'Come ti chiami?' : 'What is your name?');
    if (!consent) return setError(it ? 'Per continuare serve il consenso al trattamento dei dati.' : 'Consent to data processing is required to continue.');
    void run(async () => {
      const r = await account.completeProfile({ firstName, lastName, gaWeeks: week, consent });
      if (r.ok) dispatch({ type: 'setProfileGa', weeks: week, days: 0, referenceDate: toISO(todayUTC()) });
      return r;
    });
  };

  const google = (label: string) => (
    <button type="button" className="nt-btn nt-btn--social nt-btn--block" disabled={busy} onClick={() => void run(() => account.signInWithGoogle())}>
      <GoogleIcon />
      {label}
    </button>
  );
  const passwordInput = (autoComplete: string, label: string, hint?: string, extra?: ReactNode) => (
    <TextInput label={label} hint={hint} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={password} onChange={setPassword}
      action={extra ?? <button type="button" className="nt-input__action" onClick={() => setShow((v) => !v)}>{show ? (it ? 'Nascondi' : 'Hide') : (it ? 'Mostra' : 'Show')}</button>} />
  );
  const weekField = (
    <div className="nt-field">
      <span className="nt-field__label">{it ? 'Settimana di gravidanza' : 'Week of pregnancy'}</span>
      <WeekStepper value={week} onChange={setWeek} lang={lang} />
      <span className="nt-field__hint">{it ? `Parto previsto intorno al ${due}` : `Due around ${due}`}</span>
    </div>
  );
  const consentField = (
    <div className="stack--consent">
      <Check checked={consent} onChange={setConsent}>
        {it ? 'Accetto l’informativa privacy e il trattamento dei dati sanitari' : 'I accept the privacy notice and the processing of health data'}
      </Check>
      <details className="nt-details">
        <summary>{it ? 'Cosa accetto' : 'What I accept'}</summary>
        <p className="nt-note">
          {it
            ? 'NasciTara conserva nel tuo account email, nome, settimana di gravidanza, dati facoltativi dei genitori e misure delle ecografie, per calcolare le stime e ritrovarle su altri dispositivi. Registriamo anche le fasi completate per contare gli utenti e migliorare il servizio (90 giorni). Al termine ricevi il PDF via email. Le foto dei referti vengono lette sul dispositivo e non vengono mai salvate. Nessun marketing. Puoi eliminare i dati dall’area riservata.'
            : 'NasciTara stores your email, name, week of pregnancy, optional parents’ details and scan measurements in your account to compute estimates and sync devices. We also record completed steps to count users and improve the service (90 days). You receive the PDF by email. Report photos are read on the device and never saved. No marketing. You can delete your data in the private area.'}
        </p>
      </details>
    </div>
  );

  let form: ReactNode;
  if (mode === 'register')
    form = (
      <form className="nt-auth__form" onSubmit={register} noValidate>
        <div>
          <h1 className="nt-title">{it ? 'Crea il tuo account' : 'Create your account'}</h1>
          <p className="nt-sub">{it ? 'Hai già un account? ' : 'Already have an account? '}<button type="button" className="nt-link" onClick={() => go('login')}>{it ? 'Accedi' : 'Sign in'}</button></p>
        </div>
        {google('Google')}
        <div className="nt-divider">{it ? 'oppure con email' : 'or with email'}</div>
        <div className="nt-grid2">
          <TextInput label={it ? 'Nome' : 'First name'} autoComplete="given-name" value={firstName} onChange={setFirstName} maxLength={60} />
          <TextInput label={it ? 'Cognome' : 'Last name'} autoComplete="family-name" value={lastName} onChange={setLastName} maxLength={60} />
        </div>
        {weekField}
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} maxLength={254} />
        {passwordInput('new-password', 'Password', it ? 'Almeno 8 caratteri e un numero' : 'At least 8 characters and a number')}
        {consentField}
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        <button className="nt-btn nt-btn--block" disabled={busy}>{busy ? '…' : it ? 'Crea account' : 'Create account'}</button>
      </form>
    );
  else if (mode === 'login')
    form = (
      <form className="nt-auth__form" onSubmit={login} noValidate>
        <div className="nt-auth__hero nt-mob" aria-hidden="true">
          <span className="nt-bubble" style={{ right: -50, top: -50, width: 200, height: 200 }} />
          <span className="nt-bubble" style={{ left: -30, bottom: -60, width: 160, height: 160, background: '#fff', opacity: 0.5 }} />
          <img src={markUrl} alt="" width={130} height={130} />
        </div>
        <div>
          <h1 className="nt-title">{it ? 'Bentornata' : 'Welcome back'}</h1>
          <p className="nt-sub">{it ? 'Accedi per ritrovare le tue misurazioni.' : 'Sign in to find your measurements.'}</p>
        </div>
        {google(it ? 'Continua con Google' : 'Continue with Google')}
        <div className="nt-divider">{it ? 'oppure' : 'or'}</div>
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} maxLength={254} />
        {passwordInput('current-password', 'Password', undefined, <button type="button" className="nt-input__action" onClick={() => go('forgot')}>{it ? 'Password dimenticata?' : 'Forgot password?'}</button>)}
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        <button className="nt-btn nt-btn--block" disabled={busy}>{busy ? '…' : it ? 'Accedi' : 'Sign in'}</button>
        <p className="nt-sub nt-center">{it ? 'Nuova qui? ' : 'New here? '}<button type="button" className="nt-link" onClick={() => go('register')}>{it ? 'Crea un account' : 'Create an account'}</button></p>
      </form>
    );
  else if (mode === 'forgot')
    form = (
      <form className="nt-auth__form" onSubmit={forgot} noValidate>
        <div>
          <h1 className="nt-title">{it ? 'Recupera la password' : 'Reset your password'}</h1>
          <p className="nt-sub">{it ? 'Ti inviamo un link per sceglierne una nuova.' : 'We will email you a link to choose a new one.'}</p>
        </div>
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} maxLength={254} />
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        {info ? <p className="nt-ok" role="status">{info}</p> : null}
        <button className="nt-btn nt-btn--block" disabled={busy}>{it ? 'Invia il link' : 'Send the link'}</button>
        <p className="nt-sub nt-center"><button type="button" className="nt-link" onClick={() => go('login')}>{it ? 'Torna ad Accedi' : 'Back to sign in'}</button></p>
      </form>
    );
  else if (mode === 'sent')
    form = (
      <div className="nt-auth__form">
        <div>
          <h1 className="nt-title">{it ? 'Controlla la tua email' : 'Check your email'}</h1>
          <p className="nt-sub">{it ? `Abbiamo inviato un link a ${email.trim()}. Aprilo per attivare l’account: tornerai qui già dentro.` : `We sent a link to ${email.trim()}. Open it to activate your account and come back signed in.`}</p>
        </div>
        <p className="nt-note">{it ? 'Non lo trovi? Guarda nello spam, oppure accedi se lo hai già confermato.' : 'Can’t find it? Check spam, or sign in if you already confirmed.'}</p>
        <button type="button" className="nt-btn nt-btn--block" onClick={() => go('login')}>{it ? 'Vai ad Accedi' : 'Go to sign in'}</button>
      </div>
    );
  else if (mode === 'recover')
    form = (
      <form className="nt-auth__form" onSubmit={recover} noValidate>
        <div>
          <h1 className="nt-title">{it ? 'Nuova password' : 'New password'}</h1>
          <p className="nt-sub">{it ? 'Scegli la password per i prossimi accessi.' : 'Choose the password for your next sign-ins.'}</p>
        </div>
        {passwordInput('new-password', 'Password', it ? 'Almeno 8 caratteri e un numero' : 'At least 8 characters and a number')}
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        <button className="nt-btn nt-btn--block" disabled={busy}>{it ? 'Salva password' : 'Save password'}</button>
      </form>
    );
  else
    form = (
      <form className="nt-auth__form" onSubmit={complete} noValidate>
        <div>
          <h1 className="nt-title">{it ? `Ciao${firstName ? ' ' + firstName : ''}, un’ultima cosa` : `Hi${firstName ? ' ' + firstName : ''}, one last thing`}</h1>
          <p className="nt-sub">{it ? 'A che settimana sei? Il resto lo chiediamo strada facendo.' : 'Which week are you in? We ask the rest along the way.'}</p>
        </div>
        <div className="nt-grid2">
          <TextInput label={it ? 'Nome' : 'First name'} autoComplete="given-name" value={firstName} onChange={setFirstName} maxLength={60} />
          <TextInput label={it ? 'Cognome' : 'Last name'} autoComplete="family-name" value={lastName} onChange={setLastName} maxLength={60} />
        </div>
        {weekField}
        {consentField}
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        <button className="nt-btn nt-btn--block" disabled={busy}>{it ? 'Continua' : 'Continue'}</button>
        <p className="nt-sub nt-center"><button type="button" className="nt-link" onClick={() => void account.signOut()}>{it ? 'Esci' : 'Sign out'}</button></p>
      </form>
    );

  return (
    <div className="nt-auth">
      <aside className="nt-auth__side nt-desk" aria-hidden="true">
        <span className="nt-bubble" style={{ right: -160, top: 180, width: 560, height: 560 }} />
        <Logo />
        <div className="nt-auth__claim">
          <img src={markUrl} alt="" width={150} height={150} />
          <p className="nt-auth__headline">{it ? 'Quanto pesa oggi. Cosa indosserà domani.' : 'What they weigh today. What they will wear tomorrow.'}</p>
          <p className="nt-lead">{it ? 'Stima di peso e lunghezza dalle tue ecografie, e un corredino pronto in taglia.' : 'Weight and length estimates from your scans, and a layette ready in size.'}</p>
        </div>
      </aside>
      <main className="nt-auth__main">
        <div className="nt-auth__top">
          {mode === 'login' ? <span /> : <Logo />}
          <Segmented label={it ? 'Lingua' : 'Language'} size="sm" value={lang} options={[['it', 'IT'], ['en', 'EN']]} onChange={(v) => dispatch({ type: 'setLang', value: v })} />
        </div>
        {account.preview ? <p className="nt-note nt-preview">{it ? 'Anteprima locale: Supabase non è configurato, l’account resta solo in questa scheda.' : 'Local preview: Supabase is not configured; the account lives in this tab only.'}</p> : null}
        {form}
      </main>
    </div>
  );
}
