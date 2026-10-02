import { useMemo, useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { GrowthChart } from '../components/GrowthChart';
import { ParentsContext } from '../components/ParentsContext';
import { sensitivity } from '../lib/biometry';
import { formatGA } from '../lib/gestationalAge';
import { pointAt, selectableWeeks, type Metric } from '../lib/projection';
import { coverageKey, formatDecimal, localeOf } from '../i18n';
import { Segmented, grams } from '../ui/kit';

/**
 * Curva di crescita e tutto il dettaglio tecnico, fuori dalla vista principale:
 * la schermata dei risultati resta quella del mockup, chi vuole approfondire apre qui.
 */
export function ResultsDetails() {
  const { analysis, t, lang } = useNasciTara();
  const it = lang === 'it';
  const [metric, setMetric] = useState<Metric>('weight');
  const [week, setWeek] = useState<number | null>(null);
  const weeks = useMemo(() => (analysis ? selectableWeeks(analysis) : []), [analysis]);
  if (!analysis) return null;
  const selectedGa = week ?? analysis.ga;
  const at = pointAt(analysis, selectedGa);
  if (!at) return null;
  const loc = localeOf(lang);
  const sens = sensitivity(analysis.lastScan.bpdMm, analysis.lastScan.hcMm, analysis.lastScan.acMm, analysis.lastScan.flMm);
  return (
    <div className="nt-stack">
      <section className="nt-card nt-growth">
        <div className="nt-spread">
          <div className="nt-eyebrow">{it ? 'Curva di crescita' : 'Growth curve'}</div>
          <Segmented label={it ? 'Mostra' : 'Show'} size="sm" value={metric} options={[['weight', it ? 'Peso' : 'Weight'], ['length', it ? 'Lunghezza' : 'Length']]} onChange={setMetric} />
        </div>
        <div className="nt-growth__now">
          <span className="nt-mid">{metric === 'weight' ? grams(at.efw, lang) : formatDecimal(at.lengthCm, 1, lang)}<small> {metric === 'weight' ? 'g' : 'cm'}</small></span>
          <span className="nt-note">
            {week === null ? (it ? 'oggi' : 'today') : `${formatGA(selectedGa)} ${it ? 'sett.' : 'wk'}`} · {Math.round(at.pct)}° percentile
            {metric === 'weight' ? ` · ${grams(at.lo, lang)}–${grams(at.hi, lang)} g` : ''}
          </span>
        </div>
        <label className="nt-slider">
          <span className="nt-field__label">{it ? 'Settimana' : 'Week'}</span>
          <input type="range" min={weeks[0]} max={weeks[weeks.length - 1]} step={1} value={Math.round(selectedGa)} onChange={(e) => setWeek(Number(e.target.value))} />
          <button type="button" className="nt-link" onClick={() => setWeek(null)} disabled={week === null}>{it ? 'Oggi' : 'Today'}</button>
        </label>
        {at.isExtrapolated ? <p className="nt-note">{t('dash.extrapolationNote')}</p> : null}
        <GrowthChart analysis={analysis} metric={metric} selectedWeek={selectedGa} />
      </section>
      <details className="nt-details-block">
        <summary>{it ? 'Come calcoliamo la stima' : 'How we estimate'}</summary>
        <div className="disclosure__body">
          <h3>{t('dash.custom')}</h3>
          <p>
            <b>{Math.round(analysis.now.pctc)}{t('dash.customUnit')}</b>.{' '}
            {t('dash.customHint', { value: Math.round(analysis.custom.termOptimalWeight).toLocaleString(loc), coverage: t(coverageKey(analysis.custom.coverage)) })}
          </p>
          <ParentsContext analysis={analysis} selectedGa={selectedGa} />
          <h3>{t('dash.weights')}</h3>
          <p>{t('dash.weightsLead')}</p>
          <div className="weights">
            {sens.map((s, i) => (
              <div className="weights__row" key={s.key}>
                <span>{s.key}</span>
                <span className="weights__track"><span className={`weights__bar${i === 0 ? ' weights__bar--lead' : ''}`} style={{ width: `${s.share.toFixed(1)}%` }} /></span>
                <span className="weights__value">{s.share.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <p>{t('dash.weightsFoot', { key: sens[0].key })}</p>
          <h3>{t('dash.method')}</h3>
          <p>{it
            ? 'Ogni ecografia viene pesata con Hadlock a 4 parametri (1985) e confrontata con la curva di riferimento Hadlock 1991. Sugli scarti si adatta una retta: l’intercetta dice su quale percentile viaggia il bebe, la pendenza se lo sta cambiando, contratta perché poche ecografie rumorose non producano una falsa accelerazione.'
            : 'Each scan is weighed with 4-parameter Hadlock (1985) and compared with the Hadlock 1991 reference. A line is fitted to the deviations: the intercept gives the percentile, the slope whether it is changing, shrunk so a few noisy scans do not fake an acceleration.'}</p>
          <p>{it
            ? 'L’intervallo somma l’incertezza della traiettoria e l’errore della formula (circa 5,5 %). La lunghezza è la stima meno solida: l’ecografia non la misura, la deduce dal femore.'
            : 'The range adds trajectory uncertainty and formula error (about 5.5%). Length is the least solid estimate: it is inferred from the femur.'}</p>
          <p>{t('footer.disclaimer')}</p>
        </div>
      </details>
    </div>
  );
}
