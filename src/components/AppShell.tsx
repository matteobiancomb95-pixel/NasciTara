import { useEffect, useRef, useState } from 'react';
import { UsageTracker } from './UsageTracker';
import { IconInstagram } from './icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount, useFamily } from '../state/AccountContext';
import { setUsageConsent } from '../lib/usageTracking';
import { parseISO, toISO, todayUTC } from '../lib/gestationalAge';
import { AuthScreen } from '../screens/AuthScreen';
import { Welcome } from '../screens/Welcome';
import { Journey } from '../screens/Journey';
import { Area, type AreaTab } from '../screens/Area';
import { PrivateArea } from '../screens/PrivateArea';
import { Privacy } from '../screens/Privacy';
import { belongsToEmail, hasProgress, pickResume } from '../lib/screeningStorage';
import { useFeedback } from '../ui/feedback';

const INSTAGRAM_URL = 'https://www.instagram.com/nascitara?stkn=MWo4ZDJzcW45enYzcw%3D%3D&utm_source=qr';
type View = 'welcome' | 'journey' | 'area' | 'account';

/**
 * Flusso NasciTara 0.7: account -> benvenuto -> percorso in quattro tab -> area (bebe, mamma, voce).
 * L'avatar apre l'Area riservata a tutto schermo; `#privacy` apre la privacy policy anche senza account.
 * Il percorso si completa una volta; dopo si atterra nell'area riservata.
 * `#demo` apre un esempio senza account, mai salvato.
 */
export function AppShell({ demo = false }: { demo?: boolean }) {
  const { state, dispatch, newScreening, openScreening, lang } = useNasciTara();
  const account = useAccount();
  const { confirm } = useFeedback();
  const { user, profile } = account;
  const { born } = useFamily();
  const it = lang === 'it';
  const [view, setView] = useState<View>(() => (demo ? 'journey' : state.completed || born ? 'area' : 'welcome'));
  const [privacy, setPrivacy] = useState(() => window.location.hash === '#privacy');
  const [back, setBack] = useState<View>('area');
  const [areaTab, setAreaTab] = useState<AreaTab>('home');

  // The account is the source of email, consent and the week declared at sign-up.
  useEffect(() => {
    if (!user || !profile) return;
    if (state.email && !belongsToEmail(state, user.email)) {
      newScreening();
      return;
    }
    if (user.email && state.email !== user.email) dispatch({ type: 'setEmail', value: user.email });
    if (profile.consent && !state.emailConsent) {
      setUsageConsent(true);
      dispatch({ type: 'setConsent', value: true });
    }
    if (state.gaWeeks === '' && profile.gaWeeks !== null) {
      // The declared week moves forward with the calendar since the day it was declared.
      const from = parseISO(profile.gaReference) ?? todayUTC();
      const elapsed = Math.max(0, Math.round((todayUTC().getTime() - from.getTime()) / 864e5));
      const total = Math.min(42 * 7 + 6, profile.gaWeeks * 7 + elapsed);
      dispatch({ type: 'setProfileGa', weeks: Math.floor(total / 7), days: total % 7, referenceDate: toISO(todayUTC()) });
    }
  }, [user, profile?.consent, profile?.gaWeeks, profile?.gaReference, state.email, state.emailConsent, state.gaWeeks, dispatch, newScreening]);

  // Nuovo dispositivo o dati locali cancellati: si riapre il percorso salvato nell'account, una volta per accesso.
  const resumed = useRef<string | null>(null);
  useEffect(() => {
    if (demo || !user || !account.cloudReady || resumed.current === user.id) return;
    resumed.current = user.id;
    if (hasProgress(state) && belongsToEmail(state, user.email)) return;
    const best = pickResume(account.cloud, user.email ?? undefined);
    if (best) openScreening(best);
  }, [demo, user, account.cloudReady, account.cloud, state, openScreening]);

  // A different screening (opened from history or new) decides its own landing screen.
  // After the birth there is no scan journey: the family lands in the area.
  useEffect(() => {
    if (!demo) setView((v) => (v === 'account' ? v : state.completed || born ? 'area' : 'welcome'));
  }, [state.completed, born, demo]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view, state.page, privacy]);

  useEffect(() => {
    const onHash = () => setPrivacy(window.location.hash === '#privacy');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const closePrivacy = () => {
    if (window.location.hash === '#privacy') history.replaceState(null, '', window.location.pathname + window.location.search);
    setPrivacy(false);
  };
  const openAccount = () => {
    setBack(view === 'account' ? 'area' : view);
    setView('account');
  };

  const exit = () => {
    if (demo) return void (window.location.hash = '');
    void confirm({ title: it ? 'Vuoi uscire?' : 'Sign out?', body: it ? 'Le tue misure restano salvate.' : 'Your measurements stay saved.', confirm: it ? 'Esci' : 'Sign out', cancel: it ? 'Resta' : 'Stay' }).then((ok) => { if (ok) void account.signOut(); });
  };

  // Test environment (Vercel previews, `npm run dev:test`): always say so, never mistake it for the real site.
  const testEnv = import.meta.env.VITE_APP_ENV === 'test';
  useEffect(() => {
    if (testEnv) document.title = 'NasciTara · TEST';
  }, [testEnv]);

  let screen;
  if (privacy) screen = <Privacy onBack={closePrivacy} />;
  else if (!demo && !account.ready) screen = <div className="nt-screen nt-splash" aria-busy="true" />;
  else if (!demo && account.recovering) screen = <AuthScreen key="recover" initialMode="recover" />;
  else if (!demo && !user) screen = <AuthScreen key="auth" />;
  else if (!demo && user && state.email && !belongsToEmail(state, user.email)) screen = <div className="nt-screen nt-splash" aria-busy="true" />;
  else if (!demo && profile && (!profile.consent || (!born && profile.gaWeeks === null && state.gaWeeks === ''))) screen = <AuthScreen key="complete" initialMode="complete" />;
  else {
    const first = profile?.firstName || (demo ? 'Giulia' : '');
    const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || first;
    screen =
      view === 'welcome' ? (
        <Welcome firstName={first} fullName={full} onAccount={openAccount} onStart={() => setView('journey')} />
      ) : view === 'account' && !demo ? (
        <PrivateArea onBack={() => setView(born ? 'area' : back)} onPrivacy={() => setPrivacy(true)}
          onScans={() => { setAreaTab('baby'); setView('area'); }}
          onJourney={() => { dispatch({ type: 'goTo', page: 'landing' }); setView('journey'); }} />
      ) : view === 'area' || view === 'account' ? (
        <Area tab={areaTab} onTab={setAreaTab} firstName={first} fullName={full} onAccount={demo ? () => undefined : openAccount} />
      ) : (
        <Journey onExit={exit} onFinish={(target = 'home') => { dispatch({ type: 'complete' }); setAreaTab(target); setView('area'); }} />
      );
  }

  return (
    <div className="nt-app">
      {testEnv ? <div className="nt-testbar" role="note">{it ? 'Ambiente di test · dati di prova, non reali' : 'Test environment · sample data only'}</div> : null}
      <UsageTracker />
      {screen}
      <footer className="nt-foot">
        <span>{it ? 'Un progetto di Matteo Bianco' : 'A project by Matteo Bianco'} · CF BNCMTT95B02F027P</span>
        <button type="button" className="nt-foot__link" onClick={() => setPrivacy(true)}>Privacy</button>
        {demo ? <span>{it ? 'Esempio' : 'Demo'}</span> : null}
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" aria-label="Instagram"><IconInstagram /></a>
      </footer>
    </div>
  );
}
