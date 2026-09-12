import { useEffect, useRef } from 'react';

import logoUrl from '../assets/brand/logo-mark.png';
import wordmarkUrl from '../assets/brand/wordmark.png';
import { IconInstagram, IconLinkedIn } from './icons';
import { LandingPage } from '../pages/LandingPage';
import { PregnancyPage } from '../pages/PregnancyPage';
import { MeasurementsPage } from '../pages/MeasurementsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PAGE_ORDER, useNasciTara } from '../state/NasciTaraStore';
import { estimatedDueDate, formatGA } from '../lib/gestationalAge';
import { localeOf } from '../i18n';

const INSTAGRAM_URL = 'https://www.instagram.com/';
const LINKEDIN_URL = 'https://www.linkedin.com/in/matteo-bianco/';

/**
 * Guscio dell'applicazione.
 *
 * Header e footer restano fissi su tutte e quattro le schermate. L'unico
 * indicatore di avanzamento e' la barra alta 3px sul bordo inferiore
 * dell'header: non serve scrivere "passo 2 di 4".
 */
export function AppShell() {
  const { state, ga, gaValid, completeScans, t, lang } = useNasciTara();
  const mainRef = useRef<HTMLElement>(null);

  const index = PAGE_ORDER.indexOf(state.page);
  const progress = ((index + 1) / PAGE_ORDER.length) * 100;
  const showSummary = state.page !== 'landing';

  // Ogni cambio schermata riporta in cima: su mobile si resterebbe a meta' pagina.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
  }, [state.page]);

  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const summaryParts: string[] = [];
  if (gaValid) summaryParts.push(t('summary.weeks', { ga: formatGA(ga) }));
  if (completeScans > 0) {
    summaryParts.push(completeScans === 1 ? t('summary.scanOne') : t('summary.scans', { n: completeScans }));
  }
  if (due) {
    summaryParts.push(
      t('summary.due', {
        date: due.toLocaleDateString(localeOf(lang), {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }),
      }),
    );
  }

  return (
    <div className="shell">
      <header className="header">
        <div className="header__inner">
          <img className="header__logo" src={logoUrl} alt={t('app.name')} width={250} height={256} />
          <img className="header__wordmark" src={wordmarkUrl} alt={t('app.name')} width={640} height={110} />
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={PAGE_ORDER.length}
          aria-label={t('nav.step', { n: index })}
        >
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {showSummary ? (
        <div className="summary">
          <div className="summary__inner">
            {summaryParts.length > 0 ? (
              summaryParts.map((part, i) => (
                <span key={part}>
                  {i > 0 ? <span className="summary__sep"> · </span> : null}
                  {part}
                </span>
              ))
            ) : (
              <span className="summary__sep">{t('summary.empty')}</span>
            )}
          </div>
        </div>
      ) : null}

      <main
        className={`main${showSummary ? ' main--with-summary' : ''}`}
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
          <div className="footer__social">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" aria-label={t('footer.instagram')}>
              <IconInstagram />
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer noopener" aria-label={t('footer.linkedin')}>
              <IconLinkedIn />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
