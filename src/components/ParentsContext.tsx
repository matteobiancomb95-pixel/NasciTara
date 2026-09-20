import type { AnalysisResult } from '../lib/analysis';
import { maternalContextAt, type NasciTaraParentsInput } from '../lib/nasciTara';
import { formatGA } from '../lib/gestationalAge';
import { useNasciTara } from '../state/NasciTaraStore';

export function ParentsContext({analysis, selectedGa}: {analysis: AnalysisResult; selectedGa: number}) {
  const {lang} = useNasciTara();
  const it = lang === 'it';
  const model = analysis.nasciTara;
  const current = maternalContextAt(model, selectedGa);
  const values = model.observations.filter(o => o.pesoMammaOsservazione !== null);
  const fmt = (v: number) => v.toLocaleString(it ? 'it-IT' : 'en-GB', {maximumFractionDigits: 1});
  const signed = (v: number) => `${v > 0 ? '+' : ''}${fmt(v)} kg`;
  const fields: [keyof NasciTaraParentsInput, string, string][] = [
    ['pesoPreGravidanzaMamma', it ? 'Peso mamma pre-gravidanza' : 'Mother’s pre-pregnancy weight', 'kg'],
    ['pesoMammaOsservazione', it ? 'Peso mamma alla data di riferimento' : 'Mother’s reference-date weight', 'kg'],
    ['altezzaMamma', it ? 'Altezza mamma' : 'Mother’s height', 'cm'],
    ['pesoPapa', it ? 'Peso papà' : 'Father’s weight', 'kg'],
    ['altezzaPapa', it ? 'Altezza papà' : 'Father’s height', 'cm'],
    ['etaMamma', it ? 'Età mamma' : 'Mother’s age', it ? 'anni' : 'years'],
    ['etaPapa', it ? 'Età papà' : 'Father’s age', it ? 'anni' : 'years'],
  ];
  return <section className="parents-context stack stack--tight" aria-labelledby="parents-context-title">
    <h2 id="parents-context-title" className="h2">{it ? 'NasciTara · costituzione e andamento' : 'NasciTara · parental context and changes'}</h2>
    <p className="note">{it ? 'Peso e lunghezza standard derivano dalle ecografie. Qui i dati disponibili aiutano a leggere la curva personalizzata: peso paterno, età e variazione di peso materno non aggiungono correzioni al peso o alla lunghezza del bebè.' : 'Standard weight and length come from scans. Available parent data provide context for the personalized curve; paternal weight, ages and maternal weight change do not alter fetal weight or length.'}</p>
    <dl className="parent-values">{fields.filter(([key]) => model.parents[key] !== null).map(([key,label,unit]) => <div key={key}><dt>{label}</dt><dd>{fmt(model.parents[key]!)} {unit}</dd></div>)}</dl>
    {!model.availableParentFields.length && !values.length ? <p>{it ? 'Dati costituzionali non inseriti. Le stime standard restano disponibili.' : 'No parental details supplied. Standard estimates are still available.'}</p> : null}
    <p className="delta-highlight">{it ? 'Variazione di peso mamma' : 'Maternal weight change'}: <strong>{current?.deltaPesoMamma != null ? signed(current.deltaPesoMamma) : (it ? 'non disponibile' : 'not available')}</strong>
      {current ? ` · ${it ? 'ultima misura disponibile a' : 'last recorded at'} ${formatGA(current.ga)} ${it ? 'settimane' : 'weeks'}` : ''}
    </p>
    <p className="fine">{it ? 'Differenza rispetto al peso pre-gravidanza, non una valutazione clinica. I valori mancanti non sono stimati. La settimana selezionata usa solo misure già osservate a quella data.' : 'Difference from pre-pregnancy weight, not a clinical assessment. Missing values are not estimated. The selected week uses only measurements already recorded at that time.'}</p>
    {values.length ? <ul className="maternal-history" aria-label={it ? 'Storico peso mamma' : 'Maternal weight history'}>{values.map((o,i) => <li key={`${o.id}-${i}`}>
      <span>{formatGA(o.ga)} {it ? 'sett' : 'weeks'}</span><strong>{fmt(o.pesoMammaOsservazione!)} kg</strong><span>Δ {o.deltaPesoMamma !== null ? signed(o.deltaPesoMamma) : '—'}</span>
    </li>)}</ul> : null}
  </section>;
}
