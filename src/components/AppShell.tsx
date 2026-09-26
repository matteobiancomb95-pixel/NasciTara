import { useEffect, useState } from 'react';
import { UsageTracker } from './UsageTracker';
import { IconInstagram } from './icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import { setUsageConsent } from '../lib/usageTracking';
import { parseISO, toISO, todayUTC } from '../lib/gestationalAge';
import { AuthScreen } from '../screens/AuthScreen';
import { Welcome } from '../screens/Welcome';
import { Journey } from '../screens/Journey';
import { Area } from '../screens/Area';
import { AccountMenu } from '../screens/AccountMenu';
import { belongsToEmail } from '../lib/screeningStorage';

const INSTAGRAM_URL = 'https://www.instagram.com/nascitara?stkn=MWo4ZDJzcW45enYzcw%3D%3D&utm_source=qr';
type View = 'welcome' | 'journey' | 'area';

/**
 * Flusso NasciTara 0.6: account -> benvenuto -> percorso in quattro tab -> area riservata.
 * Il percorso si completa una volta; dopo si atterra nell'area riservata.
 * `#demo` apre un esempio senza account, mai salvato.
 */
export function AppShell({ demo = false }: { demo?: boolean }) {
  const { state, dispatch, newScreening, lang } = useNasciTara();
  const account = useAccount();
  const { user, profile } = account;
  const it = lang === 'it';
  const [view, setView] = useState<View>(() => (demo ? 'journey' : state.completed ? 'area' : 'welcome'));
  const [menu, setMenu] = useState(false);

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

  // A different screening (opened from history or new) decides its own landing screen.
  useEffect(() => {
    if (!demo) setView(state.completed ? 'area' : 'welcome');
  }, [state.completed, demo]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view, state.page]);

  const exit = () => {
    if (demo) return void (window.location.hash = '');
    if (window.confirm(it ? 'Vuoi uscire? Le tue misure restano salvate.' : 'Sign out? Your measurements stay saved.')) void account.signOut();
  };

  let screen;
  if (!demo && !account.ready) screen = <div className="nt-screen nt-splash" aria-busy="true" />;
  else if (!demo && account.recovering) screen = <AuthScreen key="recover" initialMode="recover" />;
  else if (!demo && !user) screen = <AuthScreen key="auth" />;
  else if (!demo && user && state.email && !belongsToEmail(state, user.email)) screen = <div className="nt-screen nt-splash" aria-busy="true" />;
  else if (!demo && profile && (!profile.consent || (profile.gaWeeks === null && state.gaWeeks === ''))) screen = <AuthScreen key="complete" initialMode="complete" />;
  else {
    const first = profile?.firstName || (demo ? 'Giulia' : '');
    const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || first;
    screen =
      view === 'welcome' ? (
        <Welcome firstName={first} fullName={full} onAccount={() => setMenu(true)} onStart={() => setView('journey')} />
      ) : view === 'area' ? (
        <Area firstName={first} fullName={full} onAccount={() => setMenu(true)} />
      ) : (
        <Journey onExit={exit} onFinish={() => { dispatch({ type: 'complete' }); setView('area'); }} />
      );
    screen = (
      <>
        {screen}
        {!demo ? <AccountMenu open={menu} onClose={() => setMenu(false)} onJourney={() => { dispatch({ type: 'goTo', page: 'landing' }); setView('journey'); }} name={full} /> : null}
      </>
    );
  }

  return (
    <div className="nt-app">
      <UsageTracker />
      {screen}
      <footer className="nt-foot">
        <span>{it ? 'Un progetto di Matteo Bianco' : 'A project by Matteo Bianco'} · CF BNCMTT95B02F027P</span>
        <span>NasciTara v0.6{demo ? (it ? ' · esempio' : ' · demo') : ''}</span>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" aria-label="Instagram"><IconInstagram /></a>
      </footer>
    </div>
  );
}
