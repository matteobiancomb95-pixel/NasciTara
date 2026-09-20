import { useMemo, useRef, useState } from 'react';

import type { AnalysisResult } from '../lib/analysis';
import {
  buildProjection,
  pointAt,
  EXTRAPOLATION_FROM_WEEKS,
  metricValue,
  PROJECTION_MAX_WEEKS,
  referenceBand,
  type Metric,
  type ProjectionPoint,
} from '../lib/projection';
import { estimateLength } from '../lib/fetalLength';
import { formatGA } from '../lib/gestationalAge';
import { formatDecimal, localeOf, type Lang } from '../i18n';
import { useNasciTara } from '../state/NasciTaraStore';

const C = { w: 860, h: 420, l: 62, r: 58, t: 22, b: 46 };

interface Props {
  analysis: AnalysisResult;
  metric: Metric;
  /** Settimana scelta dal filtro: viene marcata sull'asse. */
  selectedWeek: number;
}

/**
 * La curva di crescita.
 *
 * Codifica senza dipendere dal colore: la banda di riferimento porta la
 * propria etichetta scritta dentro, la proiezione si distingue per tratteggio
 * e non per tinta, le ecografie sono punti pieni. L'unica apparizione satura
 * della schermata e' il punto sulla settimana scelta.
 */
export function GrowthChart({ analysis, metric, selectedWeek }: Props) {
  const { t, lang, state } = useNasciTara();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<ProjectionPoint | null>(null);

  const geom = useMemo(() => {
    const series = buildProjection(analysis, 0.25, PROJECTION_MAX_WEEKS);
    const gaMin = Math.max(12, Math.floor(analysis.points[0].ga) - 1);
    const gaMax = PROJECTION_MAX_WEEKS;

    let vMax = 0;
    for (let g = gaMin; g <= gaMax; g += 0.5) {
      vMax = Math.max(vMax, referenceBand(g, metric).p90);
    }
    for (const p of series) vMax = Math.max(vMax, metricValue(p, metric));
    vMax *= 1.08;

    const X = (g: number) => C.l + ((g - gaMin) / (gaMax - gaMin)) * (C.w - C.l - C.r);
    const Y = (v: number) => C.h - C.b - (v / vMax) * (C.h - C.t - C.b);

    const steps: number[] = [];
    for (let g = gaMin; g <= gaMax + 1e-9; g += 0.25) steps.push(Math.min(g, gaMax));

    const bandPath = () => {
      const up = steps
        .map((g, i) => `${i ? 'L' : 'M'}${X(g).toFixed(1)} ${Y(referenceBand(g, metric).p90).toFixed(1)}`)
        .join(' ');
      const down = steps
        .slice()
        .reverse()
        .map((g) => `L${X(g).toFixed(1)} ${Y(referenceBand(g, metric).p10).toFixed(1)}`)
        .join(' ');
      return `${up} ${down} Z`;
    };

    const medianPath = steps
      .map((g, i) => `${i ? 'L' : 'M'}${X(g).toFixed(1)} ${Y(referenceBand(g, metric).p50).toFixed(1)}`)
      .join(' ');

    const lastGa = analysis.points[analysis.points.length - 1].ga;
    const toPath = (pts: ProjectionPoint[]) =>
      pts
        .map((p, i) => `${i ? 'L' : 'M'}${X(p.ga).toFixed(1)} ${Y(metricValue(p, metric)).toFixed(1)}`)
        .join(' ');

    const solid = toPath(series.filter((p) => p.ga <= lastGa + 1e-9));
    const dashed = toPath(series.filter((p) => p.ga >= lastGa - 1e-9));

    const tickStep = metric === 'weight' ? 1000 : 10;
    const yTicks: number[] = [];
    for (let v = tickStep; v <= vMax; v += tickStep) yTicks.push(v);
    const xTicks: number[] = [];
    for (let g = Math.ceil(gaMin / 3) * 3; g <= gaMax; g += 3) xTicks.push(g);

    // Punti osservati: il peso viene dalle quattro misure, la lunghezza dal femore.
    const observed = analysis.points.map((p) => ({
      ga: p.ga,
      value:
        metric === 'weight'
          ? p.efw
          : estimateLength({ lastFlMm: p.flMm, lastGa: p.ga, targetGa: p.ga, z: p.z }).cm,
    }));

    return { series, gaMin, gaMax, X, Y, bandPath: bandPath(), medianPath, solid, dashed, yTicks, xTicks, observed, vMax };
  }, [analysis, metric]);

  const { X, Y } = geom;
  // Il valore esatto all'epoca scelta, non il campione piu' vicino: altrimenti
  // il grafico mostrerebbe un numero leggermente diverso da quello in evidenza.
  const selected = pointAt(analysis, selectedWeek) ?? geom.series[geom.series.length - 1];
  const shown = hover ?? selected;

  function onMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * C.w;
    const ga = geom.gaMin + ((px - C.l) / (C.w - C.l - C.r)) * (geom.gaMax - geom.gaMin);
    const nearest = geom.series.reduce((best, p) =>
      Math.abs(p.ga - ga) < Math.abs(best.ga - ga) ? p : best,
    );
    setHover(nearest);
  }

  const fmt = (v: number, m: Metric) => formatMetric(v, m, lang);
  const extraX = X(EXTRAPOLATION_FROM_WEEKS);

  return (
    <figure className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${C.w} ${C.h}`}
        role="img"
        aria-label={`${t('dash.chartTitle', { metric: metric === 'weight' ? t('dash.weight') : t('dash.length') })}. ${t('dash.tooltipWeek', { ga: formatGA(shown.ga) })}: ${fmt(metricValue(shown, metric), metric)}.`}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {/* zona di estrapolazione: oltre la 42a settimana non c'e' piu' un riferimento */}
        <rect
          x={extraX}
          y={C.t}
          width={C.w - C.r - extraX}
          height={C.h - C.t - C.b}
          fill="var(--hairline)"
          opacity="0.08"
        />
        <text
          x={extraX + 8}
          y={C.t + 14}
          fill="var(--ink-2)"
          fontSize="12"
          fontFamily="var(--font)"
        >
          {t('dash.extrapolation')}
        </text>

        {/* banda di riferimento, con l'etichetta scritta dentro */}
        <path d={geom.bandPath} fill="var(--fill)" />
        <text
          x={X(geom.gaMin + (geom.gaMax - geom.gaMin) * 0.52)}
          y={Y(referenceBand(geom.gaMin + (geom.gaMax - geom.gaMin) * 0.52, metric).p90) - 8}
          fill="var(--ink-2)"
          fontSize="12"
          fontFamily="var(--font)"
          textAnchor="middle"
        >
          {t('dash.chartSub')}
        </text>

        {/* griglia */}
        {geom.yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={C.l} y1={Y(v)} x2={C.w - C.r} y2={Y(v)} stroke="var(--grid)" strokeWidth="1" />
            <text x={C.l - 10} y={Y(v) + 4} textAnchor="end" fill="var(--ink-2)" fontSize="12" fontFamily="var(--font)">
              {metric === 'weight' ? (v / 1000).toFixed(0) : v}
            </text>
          </g>
        ))}
        <text x={C.l - 10} y={C.t + 2} textAnchor="end" fill="var(--ink-2)" fontSize="12" fontFamily="var(--font)">
          {metric === 'weight' ? t('unit.kg') : t('unit.cm')}
        </text>

        {geom.xTicks.map((g) => (
          <text
            key={`x${g}`}
            x={X(g)}
            y={C.h - C.b + 20}
            textAnchor="middle"
            fill="var(--ink-2)"
            fontSize="12"
            fontFamily="var(--font)"
          >
            {g}
          </text>
        ))}
        <text
          x={(C.l + C.w - C.r) / 2}
          y={C.h - 8}
          textAnchor="middle"
          fill="var(--ink-2)"
          fontSize="12"
          fontFamily="var(--font)"
        >
          {t('dash.axisWeeks')}
        </text>

        <line x1={C.l} y1={C.h - C.b} x2={C.w - C.r} y2={C.h - C.b} stroke="var(--grid)" strokeWidth="1" />

        {/* mediana di riferimento */}
        <path d={geom.medianPath} fill="none" stroke="var(--hairline)" strokeWidth="1.5" opacity="0.55" />

        {/* la curva del bambino: continua sull'osservato, tratteggiata sulla proiezione */}
        <path d={geom.dashed} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
        <path d={geom.solid} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />

        {/* le ecografie eseguite */}
        {geom.observed.map((o) => (
          <circle
            key={o.ga}
            cx={X(o.ga)}
            cy={Y(o.value)}
            r="5.5"
            fill="var(--ink)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}

        {/* crocevia della settimana mostrata */}
        <line
          x1={X(shown.ga)}
          y1={C.t}
          x2={X(shown.ga)}
          y2={C.h - C.b}
          stroke="var(--ink)"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity="0.45"
        />
        {/* unica apparizione satura della schermata */}
        <circle
          cx={X(shown.ga)}
          cy={Y(metricValue(shown, metric))}
          r="7"
          fill="var(--brand)"
          stroke="var(--surface)"
          strokeWidth="2.5"
        />

        <rect
          x={C.l}
          y={C.t}
          width={C.w - C.l - C.r}
          height={C.h - C.t - C.b}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
        />
      </svg>

      <div className="chart__readout">
        <strong>{t('dash.tooltipWeek', { ga: formatGA(shown.ga) })}</strong>
        {' · '}
        {t('dash.weight')} {formatMetric(shown.efw, 'weight', lang)}
        {' · '}
        {t('dash.length')} {formatMetric(shown.lengthCm, 'length', lang)}
        {shown.isExtrapolated ? ` · ${t('dash.extrapolation')}` : ''}
      </div>

      <figcaption className="chart__legend">
        <span>
          <i className="chart__swatch chart__swatch--dot" style={{ background: 'var(--ink)' }} />
          {t('dash.legendScans')}
        </span>
        <span>
          <i className="chart__swatch" style={{ background: 'var(--ink)' }} />
          {lang === 'it' ? (state.babySex === 'female' ? 'La curva della tua bambina' : state.babySex === 'male' ? 'La curva del tuo bambino' : 'La curva del tuo bebè') : t('dash.legendCurve')}
        </span>
        <span>
          <i
            className="chart__swatch"
            style={{
              background: 'repeating-linear-gradient(90deg, var(--ink) 0 6px, transparent 6px 11px)',
            }}
          />
          {t('dash.legendProjection')}
        </span>
      </figcaption>
    </figure>
  );
}

export function formatMetric(value: number, metric: Metric, lang: Lang): string {
  if (metric === 'weight') {
    return `${Math.round(value).toLocaleString(localeOf(lang))} g`;
  }
  return `${formatDecimal(value, 1, lang)} cm`;
}
