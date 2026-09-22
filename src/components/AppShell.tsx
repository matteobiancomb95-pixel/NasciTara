import { UsageTracker } from './UsageTracker';
import { useEffect, useRef } from 'react';

import logoUrl from '../assets/brand/logo-mark.png';
import wordmarkUrl from '../assets/brand/wordmark.png';
import { IconInstagram } from './icons';
import { LandingPage } from '../pages/LandingPage';
import { PregnancyPage } from '../pages/PregnancyPage';
import { MeasurementsPage } from '../pages/MeasurementsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PAGE_ORDER, useNasciTara } from '../state/NasciTaraStore';

const INSTAGRAM_URL = 'https://www.instagram.com/nascitara?stkn=MWo4ZDJzcW45enYzcw%3D%3D&utm_source=qr';

/**
 * Guscio dell'applicazione.
 *
 * Header e footer restano fissi su tutte e quattro le schermate. L'unico
 * indicatore di avanzamento e' la barra alta 3px sul bordo inferiore
 * dell'header: non serve scrivere "passo 2 di 4".
 */
export function AppShell() {
  const { state, dispatch, t } = useNasciTara();
  const mainRef = useRef<HTMLElement>(null);

  const index = PAGE_ORDER.indexOf(state.page);
  const completedIndex = PAGE_ORDER.indexOf(state.reached);
  const progress = ((completedIndex + 1) / PAGE_ORDER.length) * 100;


  // Ogni cambio schermata riporta in cima: su mobile si resterebbe a meta' pagina.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
  }, [state.page]);

  return (
    <div className="shell">
      <UsageTracker />
      <header className="header">
        <div className="header__inner">
          <img className="header__logo" src={logoUrl} alt={t('app.name')} width={250} height={256} />
          <img className="header__wordmark" src={wordmarkUrl} alt={t('app.name')} width={640} height={110} />
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={completedIndex + 1}
          aria-valuemin={1}
          aria-valuemax={PAGE_ORDER.length}
          aria-label={t('nav.step', { n: index })}
        >
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <nav className="page-markers" aria-label="Pagine">
          {PAGE_ORDER.map((page, n) => <button key={page} type="button"
            disabled={n > PAGE_ORDER.indexOf(state.reached)}
            aria-current={state.page === page ? 'step' : undefined}
            onClick={() => dispatch({ type: 'goTo', page })}>
            <span>{n + 1}</span>{(state.lang === 'it' ? ['Inizio', 'Gravidanza', 'Ecografie', 'Risultati'] : ['Start', 'Pregnancy', 'Scans', 'Results'])[n]}
          </button>)}
        </nav>
      </header>

      <main
        className="main"
        ref={mainRef}
        tabIndex={-1}
        key={state.page}
      >
        <div className="page-enter">
          {state.page === 'landing' ? <LandingPage /> : null}
          {state.page === 'pregnancy' ? <PregnancyPage /> : null}
          {state.page === 'measurements' ? <MeasurementsPage /> : null}
          {state.page === 'dashboard' ? <DashboardPage /> : null}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__credits">
            <small>{t('footer.credits')}</small>
            <small>{t('footer.fiscalCode')}</small>
          </div>
          <small className="release">NasciTara v0.4</small>
          <div className="footer__social">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" aria-label={t('footer.instagram')}>
              <IconInstagram />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
