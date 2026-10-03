import type { AnalysisResult } from '../lib/analysis';
import { FEMUR_REFERENCE_URL, percentileLabel, summarizeFemur } from '../lib/femurPercentiles';
import { formatGA } from '../lib/gestationalAge';
import { IconBubble } from '../ui/icons';
export function PercentileSummary({ analysis, lang }: { analysis: AnalysisResult; lang: 'it' | 'en' }) {
  const it = lang === 'it';
  const femur = summarizeFemur(analysis.points);
  return <section className="nt-card nt-percentiles" aria-label={it ? 'I percentili' : 'Percentiles'}>
    <h2 className="nt-h3"><IconBubble name="chart" size={36} /> {it ? 'I percentili, con contesto' : 'Percentiles in context'}</h2>
    <div className="nt-grid2">
      <div><span className="nt-eyebrow">{it ? 'Peso stimato' : 'Estimated weight'}</span><strong className="nt-percentiles__value">{percentileLabel(analysis.now.pct, lang)}</strong><p className="nt-note">{it ? 'Stima alla settimana attuale, dalla serie ecografica.' : 'Estimate at the current week, from the scan series.'}</p></div>
      <div><span className="nt-eyebrow">{it ? 'Percentile del femore' : 'Femur percentile'}</span><strong className="nt-percentiles__value">{femur ? percentileLabel(femur.pct, lang) : '—'}</strong><p className="nt-note">{femur ? (it ? `Sintesi descrittiva di ${femur.points.length} misurazioni. Non è il percentile della lunghezza totale né una stima clinica di oggi.` : `Descriptive summary of ${femur.points.length} measurements. Not a total-body-length percentile or a clinical estimate for today.`) : (it ? 'Riferimento disponibile tra 12 e 42 settimane.' : 'Reference available from 12 to 42 weeks.')}</p></div>
    </div>
    <details><summary>{it ? 'Come si legge un percentile?' : 'How do I read a percentile?'}</summary><p className="nt-note">{it ? 'Il 50° percentile è la mediana: alla stessa età gestazionale, circa metà delle misure di riferimento è più piccola e metà più grande. Il 10° non significa “10% di crescita” o un voto sulla salute. Peso e femore hanno riferimenti diversi; il ginecologo interpreta le misure e i loro cambiamenti insieme al referto.' : 'The 50th percentile is the median: at the same gestational age, about half the reference measurements are smaller and half larger. The 10th is not “10% growth” or a health score. Weight and femur have different references; your clinician interprets measurements and changes with the full report.'}</p>
    <p className="nt-note">{it ? 'Per il femore confrontiamo ogni misura con la sua settimana, facciamo la media degli scarti standardizzati (z-score) e la riportiamo sulla scala dei percentili. Ogni ecografia valida pesa allo stesso modo. È una sintesi sperimentale, non una valutazione della velocità di crescita; consulta anche i singoli valori qui sotto.' : 'For the femur we standardize each measurement for its week, average the z-scores and convert back to a percentile scale. Each valid scan has equal weight. This experimental summary does not assess growth velocity; review each measurement below.'}</p>
    {femur && <><ul className="nt-femur-list">{femur.points.map((p, i) => <li key={i}><span>{formatGA(p.ga)} {it ? 'sett.' : 'wk'}</span><span>{p.flMm.toLocaleString(it ? 'it-IT' : 'en-GB')} mm</span><b>{percentileLabel(p.pct, lang)}</b></li>)}</ul>{femur.excluded > 0 && <p className="nt-note">{it ? `${femur.excluded} misure escluse: fuori dall’intervallo del riferimento o non valide.` : `${femur.excluded} measurements excluded: outside the reference range or invalid.`}</p>}</>}
    <a className="nt-link nt-link--sm" href={FEMUR_REFERENCE_URL} target="_blank" rel="noreferrer">{it ? 'Riferimento tecnico: Chitty e Altman (2002, in inglese)' : 'Technical reference: Chitty and Altman (2002)'}</a></details>
  </section>;
}
