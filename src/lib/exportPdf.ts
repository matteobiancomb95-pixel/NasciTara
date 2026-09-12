/**
 * Esporta il risultato in PDF.
 *
 * Il grafico viene RIDISEGNATO con le primitive vettoriali di jsPDF invece di
 * serializzare l'SVG della pagina: l'SVG usa variabili CSS (var(--ink)) che
 * fuori dal documento non si risolvono, e finirebbero tutte in nero.
 *
 * jsPDF si risolve a runtime: dal bundle npm quando c'e' un bundler, dal
 * globale UMD quando la pagina e' servita come file singolo.
 */

import type { AnalysisResult } from './analysis';
import { buildProjection, EXTRAPOLATION_FROM_WEEKS, PROJECTION_MAX_WEEKS, referenceBand } from './projection';
import { formatGA } from './gestationalAge';
import { localeOf, translate, type Lang } from '../i18n';

const BRAND: [number, number, number] = [255, 57, 92];
const FILL: [number, number, number] = [255, 208, 215];
const INK: [number, number, number] = [51, 51, 51];
const MUTED: [number, number, number] = [142, 142, 142];

type JsPdfCtor = new (opts?: Record<string, unknown>) => JsPdfDoc;

interface JsPdfDoc {
  setFont(name: string, style?: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  setLineWidth(w: number): void;
  setLineDashPattern(pattern: number[], phase: number): void;
  text(text: string | string[], x: number, y: number, opts?: Record<string, unknown>): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  circle(x: number, y: number, r: number, style?: string): void;
  triangle(
    x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, style?: string,
  ): void;
  splitTextToSize(text: string, width: number): string[];
  save(filename: string): void;
}

async function resolveJsPdf(): Promise<JsPdfCtor> {
  const global = (window as unknown as { jspdf?: { jsPDF: JsPdfCtor }; jsPDF?: JsPdfCtor });
  if (global.jspdf?.jsPDF) return global.jspdf.jsPDF;
  if (global.jsPDF) return global.jsPDF;
  const mod = (await import('jspdf')) as unknown as { jsPDF: JsPdfCtor };
  if (!mod?.jsPDF) throw new Error('jsPDF non disponibile');
  return mod.jsPDF;
}

/** Nome file richiesto: yyyy_mm_dd. */
export function pdfFilename(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}_${p(now.getMonth() + 1)}_${p(now.getDate())}.pdf`;
}

export interface PdfInput {
  analysis: AnalysisResult;
  lang: Lang;
  /** Data di generazione: passata da fuori, cosi' la funzione resta pura da testare. */
  now: Date;
}

export async function exportResultPdf({ analysis, lang, now }: PdfInput): Promise<string> {
  const JsPDF = await resolveJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) =>
    translate(lang, k, v);
  const loc = localeOf(lang);

  const M = 18;
  const W = 210;
  let y = M;

  // ---------- intestazione ----------
  doc.setFillColor(...BRAND);
  doc.circle(M + 3, y + 1, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text('NasciTara', M + 9, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(now.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }), W - M, y + 3, {
    align: 'right',
  });
  y += 14;

  // ---------- numero principale ----------
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`${t('dash.estimatedWeight')} — ${formatGA(analysis.ga)} ${t('unit.weeks')}`, M, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...INK);
  doc.text(`${Math.round(analysis.now.efw).toLocaleString(loc)} g`, M, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    t('dash.range', {
      lo: `${Math.round(analysis.now.lo).toLocaleString(loc)} g`,
      hi: `${Math.round(analysis.now.hi).toLocaleString(loc)} g`,
    }),
    M,
    y,
  );
  y += 12;

  // ---------- riquadro dei valori ----------
  const cells: Array<[string, string]> = [
    [t('dash.percentile'), `${Math.round(analysis.now.pct)}`],
    [t('dash.estimatedLength'), `${analysis.lengthNow.cm.toFixed(1)} cm`],
    [t('dash.atBirth'), `${(analysis.term.efw / 1000).toFixed(2)} kg · ${analysis.lengthTerm.cm.toFixed(0)} cm`],
    [t('dash.custom'), `${Math.round(analysis.now.pctc)}`],
  ];
  const cellW = (W - 2 * M) / cells.length;
  doc.setFillColor(...FILL);
  doc.rect(M, y, W - 2 * M, 20, 'F');
  cells.forEach(([label, value], i) => {
    const cx = M + i * cellW + 4;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(label, cellW - 8), cx, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(value, cx, y + 16);
    doc.setFont('helvetica', 'normal');
  });
  y += 28;

  // ---------- grafico, ridisegnato a vettori ----------
  const cx0 = M;
  const cy0 = y;
  const cw = W - 2 * M;
  const chH = 62;
  const series = buildProjection(analysis, 0.5, PROJECTION_MAX_WEEKS);
  const gaMin = Math.floor(analysis.points[0].ga) - 1;
  const gaMax = PROJECTION_MAX_WEEKS;
  let vMax = 0;
  for (let g = gaMin; g <= gaMax; g += 0.5) vMax = Math.max(vMax, referenceBand(g, 'weight').p90);
  vMax *= 1.06;
  const PX = (g: number) => cx0 + ((g - gaMin) / (gaMax - gaMin)) * cw;
  const PY = (v: number) => cy0 + chH - (v / vMax) * chH;

  // zona di estrapolazione
  doc.setFillColor(236, 236, 236);
  doc.rect(PX(EXTRAPOLATION_FROM_WEEKS), cy0, cw - (PX(EXTRAPOLATION_FROM_WEEKS) - cx0), chH, 'F');

  // banda di riferimento
  doc.setFillColor(...FILL);
  for (let g = gaMin; g < gaMax; g += 0.5) {
    const band = referenceBand(g, 'weight');
    const next = referenceBand(Math.min(g + 0.5, gaMax), 'weight');
    const x1 = PX(g);
    const x2 = PX(Math.min(g + 0.5, gaMax));
    doc.triangle(x1, PY(band.p10), x2, PY(next.p10), x2, PY(next.p90), 'F');
    doc.triangle(x1, PY(band.p10), x2, PY(next.p90), x1, PY(band.p90), 'F');
  }

  // curva del bambino
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  const lastGa = analysis.points[analysis.points.length - 1].ga;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    doc.setLineDashPattern(b.ga > lastGa ? [1.2, 1.2] : [], 0);
    doc.line(PX(a.ga), PY(a.efw), PX(b.ga), PY(b.efw));
  }
  doc.setLineDashPattern([], 0);

  // ecografie eseguite
  doc.setFillColor(...INK);
  for (const p of analysis.points) doc.circle(PX(p.ga), PY(p.efw), 1.1, 'F');
  // settimana corrente
  doc.setFillColor(...BRAND);
  doc.circle(PX(analysis.ga), PY(analysis.now.efw), 1.6, 'F');

  // assi
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.2);
  doc.line(cx0, cy0 + chH, cx0 + cw, cy0 + chH);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  for (let g = Math.ceil(gaMin / 4) * 4; g <= gaMax; g += 4) {
    doc.text(String(g), PX(g), cy0 + chH + 4, { align: 'center' });
  }
  doc.text(t('dash.axisWeeks'), cx0 + cw / 2, cy0 + chH + 9, { align: 'center' });
  y = cy0 + chH + 16;

  // ---------- ecografie ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(t('meas.title'), M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const p of analysis.points) {
    doc.setTextColor(...INK);
    doc.text(
      `${formatGA(p.ga)} ${t('unit.weeks')}   AC ${p.acMm}   FL ${p.flMm}   HC ${p.hcMm}   BPD ${p.bpdMm}`,
      M,
      y,
    );
    doc.setTextColor(...MUTED);
    doc.text(`${Math.round(p.efw).toLocaleString(loc)} g · p${Math.round(p.pct)}`, W - M, y, {
      align: 'right',
    });
    y += 5.5;
  }
  y += 6;

  // ---------- note ----------
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const notes = [t('dash.extrapolationNote'), t('footer.disclaimer')];
  for (const n of notes) {
    const lines = doc.splitTextToSize(n, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 3.6 + 3;
  }

  const filename = pdfFilename(now);
  doc.save(filename);
  return filename;
}
