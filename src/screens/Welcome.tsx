import { useNasciTara } from '../state/NasciTaraStore';
import { estimatedDueDate } from '../lib/gestationalAge';
import { localeOf } from '../i18n';
import { Avatar, Logo } from '../ui/kit';

export function journeySteps(it: boolean) {
  return it
    ? [['Inizio', 'Come funziona'], ['Gravidanza', 'Qualche dato su di te'], ['Ecografie', 'Una foto per ogni referto'], ['Risultati', 'Peso, lunghezza e percentile']]
    : [['Start', 'How it works'], ['Pregnancy', 'A few details about you'], ['Scans', 'One photo per report'], ['Results', 'Weight, length and percentile']];
}

/** Atterraggio dopo l'accesso: saluto, settimana e i quattro passi del percorso. */
export function Welcome({ firstName, fullName, onStart, onAccount }: { firstName: string; fullName: string; onStart: () => void; onAccount: () => void }) {
  const { state, ga, gaValid, lang } = useNasciTara();
  const it = lang === 'it';
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const fmt = (opts: Intl.DateTimeFormatOptions) => (due ? due.toLocaleDateString(localeOf(lang), { ...opts, timeZone: 'UTC' }) : '');
  const week = gaValid ? Math.floor(ga) : null;
  const accountLabel = it ? 'Il tuo account' : 'Your account';
  return (
    <div className="nt-screen nt-screen--pink nt-welcome">
      <span className="nt-bubble nt-mob" style={{ right: -120, top: 120, width: 380, height: 380 }} />
      <span className="nt-bubble nt-desk" style={{ right: -160, top: -120, width: 720, height: 720, opacity: 0.5 }} />
      <header className="nt-top">
        <Logo />
        <div className="nt-top__side">
          <span className="nt-mob"><Avatar name={firstName || fullName} onClick={onAccount} label={accountLabel} /></span>
          <span className="nt-desk"><Avatar name={firstName || fullName} onClick={onAccount} label={accountLabel} withName={fullName || firstName} /></span>
        </div>
      </header>
      <div className="nt-wrap nt-welcome__grid">
        <div className="nt-welcome__intro">
          {week !== null ? (
            <span className="nt-pill" style={{ gap: 0 }}>
              {it ? `${week}ª settimana · parto ~` : `Week ${week} · due ~`}
              <span className="nt-mob">{fmt({ day: 'numeric', month: 'short' })}</span>
              <span className="nt-desk">{fmt({ day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </span>
          ) : null}
          <h1 className="nt-display">{it ? `Ciao${firstName ? ' ' + firstName : ''}, conosciamo il tuo bebe.` : `Hi${firstName ? ' ' + firstName : ''}, let’s meet your baby.`}</h1>
          <p className="nt-lead">{it ? 'Con le misure delle tue ecografie stimiamo peso e lunghezza, oggi e alla nascita.' : 'From your scan measurements we estimate weight and length, today and at birth.'}</p>
          <div className="nt-desk nt-welcome__cta">
            <button type="button" className="nt-btn nt-btn--xl" onClick={onStart}>{it ? 'Inizia' : 'Start'}</button>
            <span>{it ? 'Circa 3 minuti' : 'About 3 minutes'}</span>
          </div>
        </div>
        <ol className="nt-welcome__steps">
          {journeySteps(it).map(([title, text], i) => (
            <li key={title}>
              <span className="nt-badge nt-badge--round">{i + 1}</span>
              <div>
                <div className="nt-row__title">{title}</div>
                <div className="nt-row__meta">{text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="nt-actions nt-mob">
        <button type="button" className="nt-btn nt-btn--block nt-btn--lg" onClick={onStart}>{it ? 'Inizia' : 'Start'}</button>
      </div>
    </div>
  );
}
