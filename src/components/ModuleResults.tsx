import { ModuleCard } from './ModuleCard';
import { GrowthChart } from './GrowthChart';
import { IconCurve } from './icons';
import type { ModuleStatus } from './StatusBadge';
import { useNasciTara } from '../state/NasciTaraStore';
import { sensitivity } from '../lib/biometry';
import { formatGA } from '../lib/gestationalAge';

function percentileLabel(p: number): { tone: string; text: string } {
  if (p < 3) return { tone: 'alert', text: 'sotto il 3° centile' };
  if (p < 10) return { tone: 'warn', text: 'tra 3° e 10° centile' };
  if (p > 97) return { tone: 'alert', text: 'sopra il 97° centile' };
  if (p > 90) return { tone: 'warn', text: 'tra 90° e 97° centile' };
  return { tone: 'ok', text: 'nella norma (10°–90°)' };
}

function ord(p: number): string {
  const r = Math.round(p);
  if (r < 1) return '<1';
  if (r > 99) return '>99';
  return String(r);
}

/** Modulo 3 — Risultati NasciTara. */
export function ModuleResults({ hiddenOnMobile }: { hiddenOnMobile?: boolean }) {
  const { analysis, gaValid } = useNasciTara();

  const status: ModuleStatus = !analysis ? 'waiting' : analysis.singleObservation ? 'partial' : 'complete';

  if (!analysis) {
    return (
      <ModuleCard
        id="modulo-risultati"
        title="Risultati NasciTara"
        subtitle="In attesa dei dati"
        icon={<IconCurve />}
        status={status}
        hiddenOnMobile={hiddenOnMobile}
      >
        <div className="notice">
          <strong>Non c’è ancora abbastanza per calcolare.</strong>{' '}
          {!gaValid
            ? 'Inserisci l’età gestazionale nel Modulo 1.'
            : 'Serve almeno un’ecografia con data e tutte e quattro le misure nel Modulo 2.'}
        </div>
      </ModuleCard>
    );
  }

  const { now, term, lengthNow, lengthTerm, points, custom, ga, singleObservation } = analysis;
  const last = points[points.length - 1];
  const pl = percentileLabel(now.pct);
  const sens = sensitivity(last.bpdMm, last.hcMm, last.acMm, last.flMm);
  const top = sens[0];

  const trend = singleObservation
    ? 'Su una sola ecografia. Aggiungine altre per avere una traiettoria.'
    : Math.abs(now.slope) < 0.012
      ? 'Crescita regolare: resta sullo stesso centile.'
      : `${now.slope > 0 ? 'In accelerazione' : 'In rallentamento'}: la traiettoria si sposta di ${
          now.slope > 0 ? '+' : ''
        }${now.slope.toFixed(2)} z a settimana.`;

  return (
    <ModuleCard
      id="modulo-risultati"
      title="Risultati NasciTara"
      subtitle={`${formatGA(ga)} settimane · ${points.length} ${points.length === 1 ? 'ecografia' : 'ecografie'}`}
      icon={<IconCurve />}
      status={status}
      hiddenOnMobile={hiddenOnMobile}
    >
      {singleObservation ? (
        <div className="notice">
          <strong>Su una sola ecografia.</strong> Aggiungine altre per avere una traiettoria: con un unico
          punto la stima è la fotografia di quel giorno, non un andamento.
        </div>
      ) : null}

      <div className="hero">
        <div>
          <div className="hero__value">
            {Math.round(now.efw).toLocaleString('it-IT')}
            <span>g</span>
          </div>
          <div className="hero__ci">
            intervallo 95 % {Math.round(now.lo).toLocaleString('it-IT')} –{' '}
            {Math.round(now.hi).toLocaleString('it-IT')} g
          </div>
        </div>
        <p className="hero__note">
          Su {points.length} {points.length === 1 ? 'ecografia' : 'ecografie'}, dalla {formatGA(points[0].ga)}{' '}
          alla {formatGA(last.ga)}. {trend}
        </p>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="tile__label">Percentile</div>
          <div className="tile__value">
            {ord(now.pct)}
            <small>°</small>
          </div>
          <div className="tile__sub">{pl.text}</div>
          <div className="gauge">
            <div className="gauge__track">
              <div className="gauge__band" />
              <div
                className="gauge__mark"
                style={{ left: `${Math.max(0, Math.min(100, now.pct))}%` }}
                role="img"
                aria-label={`Percentile ${ord(now.pct)}`}
              />
            </div>
            <div className="gauge__scale">
              <span>3°</span>
              <span>10°</span>
              <span>50°</span>
              <span>90°</span>
              <span>97°</span>
            </div>
          </div>
        </div>

        <div className="tile">
          <div className="tile__label">Lunghezza stimata</div>
          <div className="tile__value">
            {lengthNow.cm.toFixed(1)}
            <small>cm</small>
          </div>
          <div className="tile__sub">
            Cranio-calcagno, dal femore di {formatGA(last.ga)}. Circa {(lengthNow.cm - 2).toFixed(0)}–
            {(lengthNow.cm + 2).toFixed(0)} cm.
          </div>
        </div>

        <div className="tile">
          <div className="tile__label">Proiezione a 40+0</div>
          <div className="tile__value">
            {(term.efw / 1000).toFixed(2)}
            <small>kg</small>
          </div>
          <div className="tile__sub">
            {Math.round(term.lo).toLocaleString('it-IT')} – {Math.round(term.hi).toLocaleString('it-IT')} g ·
            p{ord(term.pct)}
            <br />
            Lunghezza ~{lengthTerm.cm.toFixed(0)} cm
          </div>
        </div>

        <div className="tile">
          <div className="tile__label">Curva personalizzata</div>
          <div className="tile__value">
            {ord(now.pctc)}
            <small>°</small>
          </div>
          <div className="tile__sub">
            Peso ottimale a termine {Math.round(custom.termOptimalWeight).toLocaleString('it-IT')} g.
            <br />
            Calcolata su: {custom.coverage}
            {custom.paternalGrams !== 0
              ? ` (papà ${custom.paternalGrams > 0 ? '+' : ''}${Math.round(custom.paternalGrams)} g)`
              : ''}
            .
          </div>
        </div>
      </div>

      <GrowthChart analysis={analysis} />

      <div className="table-wrap">
        <table>
          <caption className="module__sub" style={{ padding: '8px 12px', textAlign: 'left' }}>
            Ogni ecografia con le quattro formule a confronto
          </caption>
          <thead>
            <tr>
              <th>Eco</th>
              <th>EG</th>
              <th>BPD</th>
              <th>HC</th>
              <th>AC</th>
              <th>FL</th>
              <th>Hadlock 4</th>
              <th>HC+AC+FL</th>
              <th>BPD+AC+FL</th>
              <th>WHO</th>
              <th>z</th>
              <th>Perc.</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{formatGA(p.ga)}</td>
                <td>{p.bpdMm}</td>
                <td>{p.hcMm}</td>
                <td>{p.acMm}</td>
                <td>{p.flMm}</td>
                <td className="em">{Math.round(p.efw).toLocaleString('it-IT')} g</td>
                <td>{Math.round(p.efwHc).toLocaleString('it-IT')}</td>
                <td>{Math.round(p.efwBpd).toLocaleString('it-IT')}</td>
                <td>{p.efwWho === null ? '—' : Math.round(p.efwWho).toLocaleString('it-IT')}</td>
                <td>
                  {p.z >= 0 ? '+' : ''}
                  {p.z.toFixed(2)}
                </td>
                <td className="em">p{ord(p.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tile" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 className="tile__label" style={{ fontSize: 'var(--font-size-label)', textTransform: 'none', letterSpacing: 0 }}>
          Quale misura pesa di più
        </h3>
        <p className="module__sub" style={{ marginBottom: 'var(--space-4)', maxWidth: '66ch' }}>
          Contributo di ciascuna variabile, calcolato sull’ultima ecografia: la derivata del peso rispetto
          alla misura, moltiplicata per quanto quella misura varia realmente da feto a feto.
        </p>
        {sens.map((s, i) => (
          <div className="sens__row" key={s.key}>
            <span style={{ fontSize: 'var(--font-size-small)' }}>
              <strong>{s.key}</strong>{' '}
              {{ AC: 'addominale', FL: 'femore', HC: 'cranica', BPD: 'biparietale' }[s.key]}
            </span>
            <span className="sens__bar">
              <span
                className="sens__fill"
                style={{
                  width: `${s.share.toFixed(1)}%`,
                  background: i === 0 ? 'var(--color-terra)' : 'var(--color-border)',
                }}
              />
            </span>
            <span className="sens__value">{s.share.toFixed(0)}%</span>
          </div>
        ))}
        <p className="module__sub" style={{ marginTop: 'var(--space-3)', maxWidth: '70ch' }}>
          <strong>{top.key}</strong> domina. È lo stesso motivo per cui la formula WHO usa soltanto AC e HC e
          scarta femore e biparietale: l’addome porta quasi tutta l’informazione sul tessuto molle, cioè sul
          peso. Per millimetro il femore sposta di più, ma varia in un intervallo molto più stretto.
        </p>
      </div>

      <details className="tile">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Come viene calcolato</summary>
        <div className="module__sub" style={{ marginTop: 'var(--space-3)', lineHeight: 1.65 }}>
          <p>
            Ogni ecografia viene pesata con <strong>Hadlock a 4 parametri (1985)</strong> e convertita in uno
            scarto standardizzato <code>z = (EFW − mediana) / (0,13 · mediana)</code> rispetto alla curva
            Hadlock 1991. Sugli z si adatta una retta ai minimi quadrati: l’intercetta dice su quale centile
            viaggia, la pendenza se lo sta cambiando.
          </p>
          <p>
            La pendenza viene contratta con <code>t²/(1+t²)</code>: se non è distinguibile dal rumore di
            misura viene azzerata, così poche ecografie rumorose non producono una falsa accelerazione.
            L’intervallo al 95 % somma l’incertezza della traiettoria e l’errore sistematico della formula
            (≈ 5,5 %).
          </p>
          <p>
            La <strong>curva personalizzata</strong> è una rilettura semplificata del metodo Gardosi: peso
            ottimale a termine 3480 g corretto per altezza e peso della mamma e per il sesso femminile, più
            un contributo dell’altezza paterna. Non è il software GROW certificato — trattala come un secondo
            parere. L’età dei genitori è raccolta come contesto ma non entra nel calcolo del peso.
          </p>
          <p>
            La <strong>lunghezza</strong> è la stima meno solida: l’ecografia non la misura, la deduce dal
            femore. Consideralo un ordine di grandezza, ±2 cm.
          </p>
        </div>
      </details>
    </ModuleCard>
  );
}
