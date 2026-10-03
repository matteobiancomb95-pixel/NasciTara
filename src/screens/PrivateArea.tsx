import { useState, type ReactNode } from 'react';
import { useNasciTara, type NumField } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import { useMamma } from '../state/MammaStore';
import { estimatedDueDate, parseISO, toISO, todayUTC } from '../lib/gestationalAge';
import { belongsToEmail } from '../lib/screeningStorage';
import { localeOf } from '../i18n';
import { Check, NumberInput, Segmented, Sheet, TextInput, WeekStepper } from '../ui/kit';
import { ScreeningHistory } from './ScreeningHistory';
import { useFeedback } from '../ui/feedback';

type Edit = 'name' | 'email' | 'password' | 'body' | 'sex' | 'week' | 'due' | 'delete' | 'history' | null;

/** Area riservata (M19 / D11): i tuoi dati, i dati del bebe, privacy e uscita. */
export function PrivateArea({ onBack, onPrivacy, onScans, onJourney }: { onBack: () => void; onPrivacy: () => void; onScans: () => void; onJourney: () => void }) {
  const { state, dispatch, ga, gaValid, lang, screenings, forgetDevice } = useNasciTara();
  const account = useAccount();
  const { user, profile } = account;
  const mamma = useMamma();
  const it = lang === 'it';
  const loc = localeOf(lang);
  const [edit, setEdit] = useState<Edit>(null);
  const { toast } = useFeedback();
  const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const initial = (profile?.firstName || user?.email || '·').trim()[0]?.toUpperCase();
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const week = gaValid ? Math.floor(ga) : null;
  const scans = state.scans.filter((s) => s.date).length;
  const google = user?.app_metadata?.provider === 'google';
  const p = state.parents;
  const body = [p.motherHeightCm !== '' ? `${p.motherHeightCm} cm` : '', p.motherWeightKg !== '' ? `${p.motherWeightKg} kg` : ''].filter(Boolean).join(' · ') || (it ? 'Non indicati' : 'Not set');
  const sex = state.babySex === 'female' ? (it ? 'Femmina' : 'Girl') : state.babySex === 'male' ? (it ? 'Maschio' : 'Boy') : it ? 'Non lo sappiamo ancora' : 'Not known yet';

  const setGa = (weeks: number, days: number) => {
    dispatch({ type: 'setProfileGa', weeks, days, referenceDate: toISO(todayUTC()) });
    void account.updateProfile({ ga_weeks: weeks, ga_reference: toISO(todayUTC()) });
  };
  const exportData = () => {
    const mine = screenings.filter((r) => belongsToEmail(r.state, user?.email));
    const data = {
      exported_at: new Date().toISOString(),
      app: 'NasciTara',
      account: { email: user?.email, first_name: profile?.firstName, last_name: profile?.lastName, ga_weeks: profile?.gaWeeks, consent: profile?.consent, created_at: user?.created_at },
      current_screening: state,
      screenings: [...account.cloud, ...mine.filter((r) => !account.cloud.some((c) => c.id === r.id))],
      visits: mamma.visits,
      supplements: mamma.supplements,
      notes: mamma.notes,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `NasciTara-dati-${toISO(todayUTC())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const row = (label: string, value: ReactNode, action: string, onClick: () => void) => (
    <div className="nt-prow">
      <div className="nt-grow"><div className="nt-prow__label">{label}</div><div className="nt-prow__value">{value}</div></div>
      <button type="button" className="nt-link" onClick={onClick}>{action}</button>
    </div>
  );
  const link = (label: string, onClick: () => void, danger = false) => (
    <button type="button" className={`nt-prow nt-prow--link${danger ? ' is-danger' : ''}`} onClick={onClick}>
      <span className="nt-grow nt-prow__value">{label}</span><span className="nt-link">→</span>
    </button>
  );
  const mod = it ? 'Modifica' : 'Edit';
  return (
    <div className="nt-screen nt-private">
      <header className="nt-top">
        <div className="nt-editor-head">
          <button type="button" className="nt-round" aria-label={it ? 'Indietro' : 'Back'} onClick={onBack}>←</button>
          <h1 className="nt-h3">{it ? 'Area riservata' : 'Private area'}</h1>
        </div>
        <button type="button" className="nt-btn nt-btn--soft nt-btn--sm nt-desk" onClick={() => void account.signOut()}>{it ? 'Esci dall’account' : 'Sign out'}</button>
      </header>
      <main className="nt-wrap nt-main">
        <div className="nt-me">
          <span className="nt-avatar nt-avatar--xl" aria-hidden="true">{initial}</span>
          <div><div className="nt-me__name">{full || (it ? 'Il tuo account' : 'Your account')}</div><div className="nt-note">{user?.email}</div></div>
        </div>
        <div className="nt-private__grid">
          <section className="nt-stack6">
            <h2 className="nt-eyebrow">{it ? 'I tuoi dati' : 'Your details'}</h2>
            <div className="nt-card nt-plist">
              {row(it ? 'Nome e cognome' : 'Name', full || '—', mod, () => setEdit('name'))}
              {row('Email', user?.email ?? '—', mod, () => setEdit('email'))}
              {row('Password', google ? (it ? 'Accesso con Google' : 'Google sign-in') : '••••••••', google ? (it ? 'Imposta' : 'Set') : mod, () => setEdit('password'))}
              {row(it ? 'Altezza e peso pre-gravidanza' : 'Height and pre-pregnancy weight', body, mod, () => setEdit('body'))}
            </div>
          </section>
          <section className="nt-stack6">
            <h2 className="nt-eyebrow">{it ? 'I dati del tuo bebe' : 'Your baby'}</h2>
            <div className="nt-card nt-plist">
              {row(it ? 'Sesso' : 'Sex', sex, mod, () => setEdit('sex'))}
              {row(it ? 'Settimana di gravidanza' : 'Week of pregnancy', week !== null ? (it ? `${week}ª settimana` : `Week ${week}`) : '—', mod, () => setEdit('week'))}
              {row(it ? 'Parto previsto' : 'Due date', due ? due.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—', mod, () => setEdit('due'))}
              {row(it ? 'Ecografie salvate' : 'Saved scans', String(scans), it ? 'Vedi' : 'View', onScans)}
              {row(it ? 'Storico screening' : 'Screening history', it ? 'Apri, ricomincia o elimina' : 'Open, restart or delete', it ? 'Apri' : 'Open', () => setEdit('history'))}
            </div>
          </section>
          <section className="nt-stack6">
            <h2 className="nt-eyebrow">{it ? 'Preferenze' : 'Preferences'}</h2>
            <div className="nt-card nt-plist">
              <div className="nt-prow">
                <div className="nt-grow"><div className="nt-prow__label">{it ? 'Lingua' : 'Language'}</div></div>
                <Segmented label={it ? 'Lingua' : 'Language'} size="sm" value={state.lang} options={[['it', 'Italiano'], ['en', 'English']]} onChange={(v) => dispatch({ type: 'setLang', value: v })} />
              </div>
            </div>
          </section>
          <section className="nt-stack6">
            <h2 className="nt-eyebrow">Privacy</h2>
            <div className="nt-card nt-plist">
              {link('Privacy policy', onPrivacy)}
              {link(it ? 'Scarica i tuoi dati' : 'Download your data', exportData)}
              {link(it ? 'Elimina account' : 'Delete account', () => setEdit('delete'), true)}
            </div>
            <button type="button" className="nt-btn nt-btn--block nt-mob" onClick={() => void account.signOut()}>{it ? 'Esci dall’account' : 'Sign out'}</button>
            <button type="button" className="nt-link nt-center" onClick={() => void account.signOut().then(forgetDevice)}>{it ? 'Esci e dimentica questo dispositivo' : 'Sign out and forget this device'}</button>
          </section>
        </div>
      </main>
      <EditSheets edit={edit} close={() => setEdit(null)} done={(m) => { setEdit(null); if (m) toast(m); }} setGa={setGa} onJourney={onJourney} />
    </div>
  );
}

function EditSheets({ edit, close, done, setGa, onJourney }: { edit: Edit; close: () => void; done: (msg: string) => void; setGa: (w: number, d: number) => void; onJourney: () => void }) {
  const { state, dispatch, ga, gaValid, lang, forgetDevice } = useNasciTara();
  const account = useAccount();
  const { call } = useMamma();
  const it = lang === 'it';
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [h, setH] = useState<NumField>(state.parents.motherHeightCm);
  const [w, setW] = useState<NumField>(state.parents.motherWeightKg);
  const [weeks, setWeeks] = useState(gaValid ? Math.floor(ga) : 20);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<Edit>(null);
  // Valori iniziali a ogni apertura.
  if (edit !== opened) {
    setOpened(edit);
    setError('');
    setOk(false);
    setA(edit === 'name' ? account.profile?.firstName ?? '' : edit === 'email' ? account.user?.email ?? '' : edit === 'due' ? toISO(estimatedDueDate(state.referenceDate, ga) ?? todayUTC()) : '');
    setB(edit === 'name' ? account.profile?.lastName ?? '' : '');
    setH(state.parents.motherHeightCm);
    setW(state.parents.motherWeightKg);
    setWeeks(gaValid ? Math.floor(ga) : 20);
  }
  const run = async (fn: () => Promise<{ ok: boolean; error?: string } | boolean>, msg: string) => {
    setBusy(true);
    setError('');
    const r = await fn();
    setBusy(false);
    if (r === true || (typeof r === 'object' && r.ok)) done(msg);
    else setError(typeof r === 'object' && 'error' in r && r.error ? r.error : it ? 'Non è stato possibile salvare. Riprova.' : 'Could not save. Try again.');
  };
  const sheet = (title: string, children: ReactNode, subtitle?: string) => (
    <Sheet open labelClose={it ? 'Chiudi' : 'Close'} onClose={close} title={title} subtitle={subtitle}>
      {children}
      {error ? <p className="nt-error" role="alert">{error}</p> : null}
    </Sheet>
  );
  const save = (label: string, disabled: boolean, onClick: () => void) => <button aria-busy={busy} type="button" className="nt-btn nt-btn--block" disabled={disabled || busy} onClick={onClick}>{label}</button>;
  const S = it ? 'Salva' : 'Save';
  switch (edit) {
    case 'name':
      return sheet(it ? 'Nome e cognome' : 'Name', <>
        <TextInput label={it ? 'Nome' : 'First name'} value={a} maxLength={60} autoComplete="given-name" onChange={setA} />
        <TextInput label={it ? 'Cognome' : 'Last name'} value={b} maxLength={60} autoComplete="family-name" onChange={setB} />
        {save(S, !a.trim(), () => void run(() => account.updateProfile({ first_name: a.trim(), last_name: b.trim() }), it ? 'Nome aggiornato.' : 'Name updated.'))}
      </>);
    case 'email':
      return sheet('Email', <>
        <TextInput label={it ? 'Nuovo indirizzo' : 'New address'} type="email" value={a} autoComplete="email" onChange={setA} />
        <p className="nt-note">{it ? 'Ti mandiamo un link di conferma al nuovo indirizzo: il cambio vale da quando lo apri.' : 'We send a confirmation link to the new address: the change applies once you open it.'}</p>
        {save(S, !/^\S+@\S+\.\S+$/.test(a) || a.trim() === account.user?.email, () => void run(() => account.updateEmail(a), it ? 'Controlla la posta del nuovo indirizzo per confermare.' : 'Check the new inbox to confirm.'))}
      </>);
    case 'password':
      return sheet('Password', <>
        <TextInput label={it ? 'Nuova password' : 'New password'} type="password" value={a} autoComplete="new-password" hint={it ? 'Almeno 8 caratteri.' : 'At least 8 characters.'} onChange={setA} />
        {save(S, a.length < 8, () => void run(() => account.updatePassword(a), it ? 'Password aggiornata.' : 'Password updated.'))}
      </>);
    case 'body':
      return sheet(it ? 'Altezza e peso' : 'Height and weight', <>
        <div className="nt-grid2">
          <NumberInput label={it ? 'Altezza' : 'Height'} unit="cm" min={130} max={210} value={h} onChange={setH} />
          <NumberInput label={it ? 'Peso pre-gravidanza' : 'Pre-pregnancy weight'} unit="kg" min={35} max={200} step={0.5} value={w} onChange={setW} />
        </div>
        <p className="nt-note">{it ? 'Servono a leggere meglio la curva personalizzata. Restano nel tuo screening.' : 'They help read the personalised curve. They stay in your screening.'}</p>
        {save(S, false, () => { dispatch({ type: 'setParent', field: 'motherHeightCm', value: h }); dispatch({ type: 'setParent', field: 'motherWeightKg', value: w }); done(it ? 'Dati aggiornati.' : 'Details updated.'); })}
      </>);
    case 'sex':
      return sheet(it ? 'Sesso del bebe' : 'Baby’s sex', <>
        <Segmented label={it ? 'Sesso' : 'Sex'} value={state.babySex || 'unknown'} options={[['female', it ? 'Femmina' : 'Girl'], ['male', it ? 'Maschio' : 'Boy'], ['unknown', it ? 'Non so' : 'Not known']]}
          onChange={(v) => { dispatch({ type: 'setBabySex', value: v === 'unknown' ? '' : v }); done(it ? 'Aggiornato.' : 'Updated.'); }} />
      </>);
    case 'week':
      return sheet(it ? 'Settimana di gravidanza' : 'Week of pregnancy', <>
        <WeekStepper value={weeks} onChange={setWeeks} lang={lang} />
        <p className="nt-note">{it ? 'Aggiorna stima, corredino e data del parto da oggi.' : 'Updates estimate, layette and due date from today.'}</p>
        {save(S, false, () => { setGa(weeks, 0); done(it ? 'Settimana aggiornata.' : 'Week updated.'); })}
      </>);
    case 'due': {
      const d = parseISO(a);
      const total = d ? 280 - Math.round((d.getTime() - todayUTC().getTime()) / 864e5) : NaN;
      const valid = Number.isFinite(total) && total >= 12 * 7 && total <= 42 * 7 + 6;
      return sheet(it ? 'Parto previsto' : 'Due date', <>
        <TextInput label={it ? 'Data presunta del parto' : 'Estimated due date'} type="date" value={a} onChange={setA} hint={valid ? (it ? `Corrisponde a ${Math.floor(total / 7)}+${total % 7} settimane oggi.` : `That is ${Math.floor(total / 7)}+${total % 7} weeks today.`) : it ? 'Scegli una data tra 12 e 42 settimane.' : 'Pick a date between 12 and 42 weeks.'} />
        {save(S, !valid, () => { setGa(Math.floor(total / 7), total % 7); done(it ? 'Data del parto aggiornata.' : 'Due date updated.'); })}
      </>);
    }
    case 'delete':
      return sheet(it ? 'Elimina account' : 'Delete account', <>
        <p className="nt-body">{it ? 'Cancelliamo per sempre account, screening, visite, integratori, note e promemoria. Non si può annullare: se vuoi, prima scarica i tuoi dati.' : 'We permanently delete your account, screenings, visits, supplements, notes and reminders. This cannot be undone: download your data first if you wish.'}</p>
        <Check checked={ok} onChange={setOk}>{it ? 'Ho capito, voglio eliminare il mio account.' : 'I understand, delete my account.'}</Check>
        <button aria-busy={busy} type="button" className="nt-btn nt-btn--block nt-btn--danger" disabled={!ok || busy} onClick={() => void run(async () => {
          const r = await call('delete-account', { confirm: 'ELIMINA' });
          if (r.status !== 'ok') return false;
          await account.signOut();
          forgetDevice();
          return true;
        }, '')}>{busy ? (it ? 'Eliminazione…' : 'Deleting…') : it ? 'Elimina per sempre' : 'Delete forever'}</button>
      </>);
    case 'history':
      return <ScreeningHistory open onClose={close} onJourney={onJourney} />;
    default:
      return null;
  }
}
