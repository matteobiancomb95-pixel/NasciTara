import { useMemo, useState } from 'react';

import { ParentsContext } from '../components/ParentsContext';
import { GrowthChart } from '../components/GrowthChart';
import { IconBack, IconDownload } from '../components/icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { sensitivity } from '../lib/biometry';
import { formatGA } from '../lib/gestationalAge';
import { pointAt, selectableWeeks, type Metric } from '../lib/projection';
import { exportResultPdf } from '../lib/exportPdf';
import { coverageKey, formatDecimal, localeOf } from '../i18n';

/**
 * Schermata 4 — dashboard.
 *
 * Niente tabelle: un dato, un blocco, una frase. Tutto il gergo (Hadlock,
 * intervallo di confidenza, peso relativo delle misure) vive dentro un unico
 * blocco richiudibile in fondo.
 */
export function DashboardPage() {
  const { analysis, state, dispatch, t, lang } = useNasciTara();
  const [metric, setMetric] = useState<Metric>('weight');
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'error'>('idle');

  const weeks = useMemo(() => (analysis ? selectableWeeks(analysis) : []), [analysis]);
  /**
   * `null` significa "oggi": la dashboard si apre sull'epoca esatta (33+2),
   * non sulla settimana intera piu' vicina, altrimenti il numero in evidenza
   * non coinciderebbe con quello calcolato per oggi. Appena l'utente muove il
   * cursore si passa alle settimane intere.
   */
  const [week, setWeek] = useState<number | null>(null);
  const selectedGa = week ?? (analysis ? analysis.ga : 0);
  const sliderWeek = Math.round(selectedGa);

  if (!analysis) {
    return (
      <div className="col stack">
        <h1 className="h1">{t('dash.emptyTitle')}</h1>
        <p className="lead">{t('dash.emptyBody')}</p>
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'goTo', page: 'measurements' })}
        >
          {t('dash.emptyCta')}
        </button>
      </div>
    );
  }

  const at = pointAt(analysis, selectedGa);
  if (!at) return null;

  const loc = localeOf(lang);
  const sens = sensitivity(
    analysis.lastScan.bpdMm,
    analysis.lastScan.hcMm,
    analysis.lastScan.acMm,
    analysis.lastScan.flMm,
  );
  const isToday = week === null;

  const trend = analysis.singleObservation
    ? t('dash.basedOnOne')
    : Math.abs(analysis.now.slope) < 0.012
      ? t('dash.trendFlat')
      : analysis.now.slope > 0
        ? t('dash.trendUp')
        : t('dash.trendDown');

  async function download() {
    setPdfState('working');
    try {
      await exportResultPdf({ analysis: analysis!, lang, now: new Date() });
      setPdfState('idle');
    } catch {
      setPdfState('error');
    }
  }

  return (
    <div className="col col--wide stack--loose stack">
      <div>
        <button
          type="button"
          className="back"
          onClick={() => dispatch({ type: 'goTo', page: 'measurements' })}
        >
          <IconBack />
          {t('dash.editScans')}
        </button>
        <h1 className="h1">{lang === 'it' ? (state.babySex === 'female' ? 'La tua bambina' : state.babySex === 'male' ? 'Il tuo bambino' : 'Il tuo bebè') : t('dash.title')}</h1>
        <p className="lead">
          {analysis.singleObservation
            ? t('dash.basedOnOne')
            : `${t('dash.basedOn', {
                n: analysis.points.length,
                from: formatGA(analysis.points[0].ga),
                to: formatGA(analysis.lastScan.ga),
              })} ${trend}`}
        </p>
      </div>

      {/* ---- filtri: settimana e metrica ---- */}
      <div className="controls">
        <div className="control week-slider">
          <label className="control__label" htmlFor="week-filter">
            {t('dash.atWeek')}
          </label>
          <input
            id="week-filter"
            type="range"
            min={weeks[0]}
            max={weeks[weeks.length - 1]}
            step={1}
            value={sliderWeek}
            onChange={(e) => setWeek(Number(e.target.value))}
          />
          <span className="week-slider__value">
            {isToday ? formatGA(analysis.ga) : sliderWeek}
            {isToday ? ` · ${t('dash.today')}` : ''}
          </span>
        </div>

        <div className="control">
          <span className="control__label">{t('dash.showCurveFor')}</span>
          <div className="segmented" role="group">
            <button type="button" aria-pressed={metric === 'weight'} onClick={() => setMetric('weight')}>
              {t('dash.weight')}
            </button>
            <button type="button" aria-pressed={metric === 'length'} onClick={() => setMetric('length')}>
              {t('dash.length')}
            </button>
          </div>
        </div>
      </div>

      {/* ---- il numero, senza contenitore ---- */}
      <div>
        <div className="hero-number">
          {metric === 'weight'
            ? Math.round(at.efw).toLocaleString(loc)
            : formatDecimal(at.lengthCm, 1, lang)}
          <span>{metric === 'weight' ? t('unit.g') : t('unit.cm')}</span>
        </div>
        <p className="hero-range">
          {metric === 'weight'
            ? t('dash.range', {
                lo: `${Math.round(at.lo).toLocaleString(loc)} g`,
                hi: `${Math.round(at.hi).toLocaleString(loc)} g`,
              })
            : t('dash.lengthHint', {
                lo: (at.lengthCm - 2).toFixed(0),
                hi: (at.lengthCm + 2).toFixed(0),
              })}
        </p>
        {at.isExtrapolated ? <p className="caution">{t('dash.extrapolationNote')}</p> : null}
      </div>

      {/* ---- il percentile come frase, mai come numero isolato ---- */}
      <div className="block">
        <p className="sentence">
          {t('dash.percentileBefore', { ga: sliderWeek })} <strong>{Math.round(at.pct)}</strong>{' '}
          {t('dash.percentileAfter')}
        </p>
      </div>

      <GrowthChart analysis={analysis} metric={metric} selectedWeek={selectedGa} />

      {/* ---- proiezione alla nascita e curva personalizzata ---- */}
      <div className="grid-2">
        <div className="stack stack--tight">
          <h2 className="h2">{t('dash.atBirth')}</h2>
          <p className="sentence">
            <strong>{formatDecimal(analysis.term.efw / 1000, 2, lang)}</strong> {t('unit.kg')} ·{' '}
            {Math.round(analysis.lengthTerm.cm)} {t('unit.cm')}
          </p>
          <p className="note">
            {t('dash.range', {
              lo: `${Math.round(analysis.term.lo).toLocaleString(loc)} g`,
              hi: `${Math.round(analysis.term.hi).toLocaleString(loc)} g`,
            })}
          </p>
        </div>
        <div className="stack stack--tight">
          <h2 className="h2">{t('dash.custom')}</h2>
          <p className="sentence">
            <strong>{Math.round(analysis.now.pctc)}</strong>
            {t('dash.customUnit')}
          </p>
          <p className="note">
            {t('dash.customHint', {
              value: Math.round(analysis.custom.termOptimalWeight).toLocaleString(loc),
              coverage: t(coverageKey(analysis.custom.coverage)),
            })}
          </p>
        </div>
      </div>

      <ParentsContext analysis={analysis} selectedGa={selectedGa} />

      {/* ---- tutto il gergo, in un solo blocco richiudibile ---- */}
      <details className="disclosure">
        <summary>{t('dash.details')}</summary>
        <div className="disclosure__body">
          <p>{t('dash.detailsSub')}</p>

          <h3>{t('dash.weights')}</h3>
          <p>{t('dash.weightsLead')}</p>
          <div className="weights">
            {sens.map((s, i) => (
              <div className="weights__row" key={s.key}>
                <span>
                  {s.key} ·{' '}
                  {t(
                    s.key === 'AC'
                      ? 'meas.acShort'
                      : s.key === 'FL'
                        ? 'meas.flShort'
                        : s.key === 'HC'
                          ? 'meas.hcShort'
                          : 'meas.bpdShort',
                  )}
                </span>
                <span className="weights__track">
                  <span
                    className={`weights__bar${i === 0 ? ' weights__bar--lead' : ''}`}
                    style={{ width: `${s.share.toFixed(1)}%` }}
                  />
                </span>
                <span className="weights__value">{s.share.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <p>{t('dash.weightsFoot', { key: sens[0].key })}</p>

          <h3>{t('dash.method')}</h3>
          <p>
            Ogni ecografia viene pesata con Hadlock a 4 parametri (1985) e convertita in uno scarto
            standardizzato rispetto alla curva di riferimento Hadlock 1991. Sugli scarti si adatta una retta:
            l’intercetta dice su quale percentile viaggia il bambino, la pendenza se lo sta cambiando. La
            pendenza viene contratta con t²/(1+t²), così poche ecografie rumorose non producono una falsa
            accelerazione.
          </p>
          <p>
            L’intervallo somma l’incertezza della traiettoria e l’errore sistematico della formula (circa
            5,5 %). La lunghezza è la stima meno solida: l’ecografia non la misura, la deduce dal femore.
          </p>
          <p>{t('dash.extrapolationNote')}</p>
        </div>
      </details>

      <div>
        <button type="button" className="btn btn--block" onClick={download} disabled={pdfState === 'working'}>
          <IconDownload />
          {pdfState === 'working' ? t('dash.downloading') : t('dash.download')}
        </button>
        <p className="btn-note">
          {pdfState === 'error' ? t('dash.pdfError') : t('footer.disclaimer')}
        </p>
      </div>

      <button type="button" className="btn-text" onClick={() => dispatch({ type: 'reset' })}>
        {t('dash.restart')}
      </button>
    </div>
  );
}
