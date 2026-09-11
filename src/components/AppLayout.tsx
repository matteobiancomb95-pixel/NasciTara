import { useState } from 'react';

import logoUrl from '../assets/logo-nascitara.svg';
import { ModulePregnancyAndParents } from './ModulePregnancyAndParents';
import { ModuleMeasurements } from './ModuleMeasurements';
import { ModuleResults } from './ModuleResults';
import { useNasciTara } from '../state/NasciTaraStore';
import { formatGA } from '../lib/gestationalAge';

type TabId = 'gravidanza' | 'misure' | 'risultati';

const TABS: Array<{ id: TabId; label: string; short: string }> = [
  { id: 'gravidanza', label: 'Gravidanza & Genitori', short: 'Gravidanza' },
  { id: 'misure', label: 'Misurazioni ecografiche', short: 'Misure' },
  { id: 'risultati', label: 'Risultati NasciTara', short: 'Risultati' },
];

/**
 * Tre moduli indipendenti.
 *
 * Su desktop stanno tutti sullo stesso schermo, uno sotto l'altro. Sotto gli
 * 860 px diventano tre schede: i moduli non attivi vengono nascosti ma restano
 * montati, quindi lo stato e il fuoco non si perdono passando da una all'altra.
 */
export function AppLayout() {
  const [tab, setTab] = useState<TabId>('gravidanza');
  const { analysis, state, dispatch, gaValid, ga, completeScans } = useNasciTara();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <img className="app-logo" src={logoUrl} alt="NasciTara" width={208} height={48} />

          <div className="readout" aria-live="polite">
            <div>
              <div className="readout__label">Peso stimato</div>
              <div className="readout__value">
                {analysis ? (
                  <>
                    {Math.round(analysis.now.efw).toLocaleString('it-IT')}
                    <span> g</span>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="readout__meta">
              {gaValid ? `${formatGA(ga)} sett` : 'epoca da inserire'}
              <br />
              {completeScans} {completeScans === 1 ? 'ecografia' : 'ecografie'}
            </div>
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Moduli">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'true' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.short}
          </button>
        ))}
      </nav>

      <main className="modules">
        {state.isDemo ? (
          <div className="notice" style={{ marginBottom: 0 }}>
            <strong>Dati di esempio.</strong> I valori caricati sono una gravidanza realistica, non i tuoi.{' '}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => dispatch({ type: 'reset' })}
            >
              Svuota tutto
            </button>
          </div>
        ) : null}

        <ModulePregnancyAndParents hiddenOnMobile={tab !== 'gravidanza'} />
        <ModuleMeasurements hiddenOnMobile={tab !== 'misure'} />
        <ModuleResults hiddenOnMobile={tab !== 'risultati'} />
      </main>

      <footer className="app-footer">
        NasciTara è uno strumento personale di calcolo, non un dispositivo medico. Le stime ecografiche del
        peso hanno un errore intrinseco di circa ±10 % anche in mani esperte: il valore che conta resta quello
        del referto del ginecologo.
      </footer>
    </div>
  );
}
