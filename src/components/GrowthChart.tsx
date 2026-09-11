import { useMemo } from 'react';

import { refAt, refMean, Z } from '../lib/percentilesHadlock1991';
import { estimateAt } from '../lib/trajectory';
import type { AnalysisResult } from '../lib/analysis';
import { TERM_GA_WEEKS } from '../lib/gestationalAge';

/**
 * Curva personalizzata NasciTara.
 *
 * Codifica: i centili di riferimento sono grigi e recessivi, la banda
 * 10o-90o e' un riempimento salvia. Le due serie che contano si distinguono
 * per FORMA prima che per colore — punti pieni per le ecografie eseguite,
 * linea per la traiettoria stimata, tratteggio per la proiezione — cosi'
 * l'identita' non dipende mai dal solo colore.
 */

const C = { w: 780, h: 420, l: 56, r: 48, t: 16, b: 40 };

export function GrowthChart({ analysis }: { analysis: AnalysisResult }) {
  const { points, now, term, ga } = analysis;

  const geom = useMemo(() => {
    const gaMin = Math.max(13, Math.min(points[0].ga, ga) - 1.5);
    const gaMax = 41;
    const wMax = refAt(41, Z.p97) * 1.04;
    const X = (g: number) => C.l + ((g - gaMin) / (gaMax - gaMin)) * (C.w - C.l - C.r);
    const Y = (w: number) => C.h - C.b - (w / wMax) * (C.h - C.t - C.b);

    const steps: number[] = [];
    for (let g = gaMin; g <= gaMax + 1e-9; g += 0.25) steps.push(Math.min(g, gaMax));

    const bandPath = (zLo: number, zHi: number) => {
      const up = steps.map((g, i) => `${i ? 'L' : 'M'}${X(g).toFixed(1)} ${Y(refAt(g, zHi)).toFixed(1)}`).join(' ');
      const dn = steps
        .slice()
        .reverse()
        .map((g) => `L${X(g).toFixed(1)} ${Y(refAt(g, zLo)).toFixed(1)}`)
        .join(' ');
      return `${up} ${dn} Z`;
    };
    const linePath = (z: number) =>
      steps.map((g, i) => `${i ? 'L' : 'M'}${X(g).toFixed(1)} ${Y(refAt(g, z)).toFixed(1)}`).join(' ');

    // traiettoria stimata: continua sull'arco osservato, tratteggiata oltre
    const traj = points.map((p) => ({ ga: p.ga, z: p.z }));
    const fitted: Array<[number, number]> = [];
    for (let g = points[0].ga; g <= gaMax + 1e-9; g += 0.25) {
      const gc = Math.min(g, gaMax);
      const e = estimateAt(traj, gc, 1);
      if (e) fitted.push([X(gc), Y(e.efw)]);
    }
    const lastGa = points[points.length - 1].ga;
    const pth = (arr: Array<[number, number]>) =>
      arr.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

    const yTicks: number[] = [];
    for (let w = 500; w <= wMax; w += 500) yTicks.push(w);
    const xTicks: number[] = [];
    for (let g = Math.ceil(gaMin / 2) * 2; g <= gaMax; g += 2) xTicks.push(g);

    return {
      gaMin,
      gaMax,
      X,
      Y,
      bandPath,
      linePath,
      solid: pth(fitted.filter((p) => p[0] <= X(lastGa) + 0.01)),
      dashed: pth(fitted.filter((p) => p[0] >= X(lastGa) - 0.01)),
      yTicks,
      xTicks,
    };
  }, [points, ga]);

  const { X, Y } = geom;
  const centiles: Array<[number, string]> = [
    [Z.p3, '3°'],
    [Z.p10, '10°'],
    [Z.p50, '50°'],
    [Z.p90, '90°'],
    [Z.p97, '97°'],
  ];

  return (
    <figure className="chart-figure">
      <div className="chart-figure__head">
        <div>
          <div className="chart-figure__title">Curva personalizzata NasciTara</div>
          <div className="module__sub">Centili di riferimento Hadlock 1991 · banda 10°–90° evidenziata</div>
        </div>
        <div className="legend">
          <span>
            <i className="dot" style={{ background: 'var(--color-terra)' }} />
            Ecografie eseguite
          </span>
          <span>
            <i style={{ background: 'var(--color-terra-ink)' }} />
            Traiettoria stimata
          </span>
          <span>
            <i
              style={{
                background:
                  'repeating-linear-gradient(90deg, var(--color-terra-ink) 0 5px, transparent 5px 9px)',
              }}
            />
            Proiezione a termine
          </span>
        </div>
      </div>

      <div className="chart-scroll">
        <svg
          className="growth"
          viewBox={`0 0 ${C.w} ${C.h}`}
          role="img"
          aria-label={`Curva di crescita: ${points.length} ecografie eseguite, traiettoria stimata e proiezione fino al termine. Peso stimato oggi ${Math.round(now.efw)} grammi, percentile ${Math.round(now.pct)}.`}
        >
          <path d={geom.bandPath(Z.p3, Z.p97)} fill="var(--color-primary)" opacity="0.09" />
          <path d={geom.bandPath(Z.p10, Z.p90)} fill="var(--color-primary)" opacity="0.18" />

          {geom.yTicks.map((w) => (
            <g key={`y${w}`}>
              <line x1={C.l} y1={Y(w)} x2={C.w - C.r} y2={Y(w)} stroke="var(--color-border-soft)" strokeWidth="1" />
              <text x={C.l - 9} y={Y(w) + 3.5} textAnchor="end" fill="var(--color-text-muted)" fontSize="10">
                {(w / 1000).toFixed(1)}
              </text>
            </g>
          ))}
          <text x={C.l - 9} y={C.t + 2} textAnchor="end" fill="var(--color-text-muted)" fontSize="9.5" letterSpacing="1">
            KG
          </text>

          {geom.xTicks.map((g) => (
            <g key={`x${g}`}>
              <line x1={X(g)} y1={C.t} x2={X(g)} y2={C.h - C.b} stroke="var(--color-border-soft)" strokeWidth="1" />
              <text x={X(g)} y={C.h - C.b + 16} textAnchor="middle" fill="var(--color-text-muted)" fontSize="10">
                {g}
              </text>
            </g>
          ))}
          <text
            x={(C.l + C.w - C.r) / 2}
            y={C.h - 6}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize="9.5"
            letterSpacing="1"
          >
            SETTIMANE DI GESTAZIONE
          </text>

          <line x1={C.l} y1={C.h - C.b} x2={C.w - C.r} y2={C.h - C.b} stroke="var(--color-border)" strokeWidth="1" />

          {centiles.map(([z, label]) => (
            <g key={label}>
              <path
                d={geom.linePath(z)}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={z === 0 ? 1.6 : 1}
                strokeDasharray={z === 0 ? undefined : '3 3'}
                opacity={z === 0 ? 0.85 : 0.6}
              />
              <text
                x={C.w - C.r + 6}
                y={Y(refAt(geom.gaMax, z)) + 3.5}
                fill="var(--color-text-muted)"
                fontSize="9.5"
              >
                {label}
              </text>
            </g>
          ))}

          {geom.dashed ? (
            <path
              d={geom.dashed}
              fill="none"
              stroke="var(--color-terra-ink)"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          ) : null}
          {geom.solid ? (
            <path d={geom.solid} fill="none" stroke="var(--color-terra-ink)" strokeWidth="2.5" strokeLinecap="round" />
          ) : null}

          {ga >= geom.gaMin && ga <= geom.gaMax ? (
            <g>
              <line
                x1={X(ga)}
                y1={C.t}
                x2={X(ga)}
                y2={C.h - C.b}
                stroke="var(--color-primary-btn)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text x={X(ga) + 5} y={C.t + 11} fill="var(--color-primary-btn)" fontSize="9.5" fontWeight="700" letterSpacing="0.8">
                OGGI
              </text>
            </g>
          ) : null}

          {/* ring bianco: separa il punto dalla banda sottostante */}
          {points.map((p) => (
            <circle
              key={p.id}
              cx={X(p.ga)}
              cy={Y(p.efw)}
              r="5.5"
              fill="var(--color-terra)"
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          ))}

          <circle
            cx={X(TERM_GA_WEEKS)}
            cy={Y(term.efw)}
            r="4"
            fill="var(--color-surface)"
            stroke="var(--color-terra-ink)"
            strokeWidth="2.5"
          />
          <text
            x={X(TERM_GA_WEEKS) - 8}
            y={Y(term.efw) - 11}
            textAnchor="end"
            fill="var(--color-terra-ink)"
            fontSize="11"
            fontWeight="700"
          >
            {(term.efw / 1000).toFixed(2)} kg
          </text>
        </svg>
      </div>
      <figcaption className="module__sub" style={{ padding: '0 16px 14px' }}>
        Mediana attesa oggi {Math.round(refMean(ga)).toLocaleString('it-IT')} g. La tabella qui sotto riporta
        gli stessi dati in forma numerica.
      </figcaption>
    </figure>
  );
}
