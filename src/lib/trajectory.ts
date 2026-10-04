/**
 * Da n osservazioni a una traiettoria di crescita.
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`. Coefficienti,
 * contrazione della pendenza e composizione dell'incertezza sono invariati.
 *
 * Il metodo: ogni ecografia diventa uno scarto standardizzato z rispetto alla
 * mediana attesa per la sua epoca; sugli z si adatta una retta ai minimi
 * quadrati. L'intercetta dice su quale centile viaggia il feto, la pendenza se
 * lo sta cambiando. La pendenza viene contratta con t^2/(1+t^2): se non e'
 * distinguibile dal rumore di misura viene azzerata, cosi' poche ecografie
 * rumorose non producono una falsa accelerazione.
 */

import { CV, refMean, percentileFromZ } from './percentilesHadlock1991';

/** Rumore di una singola stima ecografica (7,5 % del peso) riportato sulla scala z. */
export const SIG_Z = 0.075 / CV;

export interface TrajectoryPoint {
  /** Settimane di gestazione, decimali. */
  ga: number;
  /** Scarto standardizzato del peso stimato a quell'epoca. */
  z: number;
}

export interface TrajectoryFit {
  /** Scarto standardizzato proiettato all'epoca richiesta. */
  z: number;
  /** Pendenza gia' contratta, in z per settimana. */
  slope: number;
  /** Errore standard dell'intercetta. */
  se: number;
  /** Fattore di contrazione applicato alla pendenza, fra 0 e 1. */
  shrink: number;
}

/** Oltre questa pendenza (in deviazioni standard a settimana) il cambio di centile non e' fisiologico. */
export const MAX_SLOPE = 0.2;
/** Fuori dalle ecografie la retta non puo' spostare lo z di piu' di cosi': niente proiezioni esplosive. */
export const MAX_EXTRAPOLATION_Z = 1;
/** Soglia di Huber: residui fino a 1,5 volte il rumore pesano per intero. */
const HUBER_K = 1.5;

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/**
 * Retta ai minimi quadrati pesati sugli z, robusta (0.8):
 *  - con 3 o piu' ecografie i pesi di Huber riducono l'influenza di un punto anomalo (IRLS);
 *    se tutti i residui stanno entro 1,5 volte il rumore, i pesi restano 1 e il risultato e' quello di prima;
 *  - la pendenza viene contratta come prima e poi limitata a +/-0,2 z a settimana;
 *  - prima della prima ecografia e dopo l'ultima, la proiezione si sposta al massimo di 1 z.
 * `noise` e' il rumore di misura sulla scala z (peso: SIG_Z; femore: circa 0,6).
 */
export function fitTrajectory(pts: TrajectoryPoint[], target: number, noise = SIG_Z): TrajectoryFit | null {
  const n = pts.length;
  if (n === 0) return null;
  if (n === 1) return { z: pts[0].z, slope: 0, se: noise, shrink: 0 };
  const xs = pts.map((p) => p.ga - target);
  const ys = pts.map((p) => p.z);
  let w = pts.map(() => 1);
  const wfit = () => {
    const W = w.reduce((a, b) => a + b, 0);
    const mx = w.reduce((a, wi, i) => a + wi * xs[i], 0) / W;
    const my = w.reduce((a, wi, i) => a + wi * ys[i], 0) / W;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += w[i] * (xs[i] - mx) * (xs[i] - mx);
      sxy += w[i] * (xs[i] - mx) * (ys[i] - my);
    }
    return { W, mx, my, sxx, b: sxx > 1e-9 ? sxy / sxx : 0 };
  };
  let f = wfit();
  if (f.sxx <= 1e-9) {
    return { z: f.my, slope: 0, se: Math.max(noise / Math.sqrt(n), noise * 0.5), shrink: 0 };
  }
  if (n >= 3) {
    for (let iter = 0; iter < 20; iter++) {
      const a0 = f.my - f.b * f.mx;
      const r = xs.map((x, i) => ys[i] - (a0 + f.b * x));
      const scale = Math.max(noise, 1.4826 * median(r.map(Math.abs)));
      const next = r.map((ri) => (Math.abs(ri) <= HUBER_K * scale ? 1 : (HUBER_K * scale) / Math.abs(ri)));
      const moved = next.some((v, i) => Math.abs(v - w[i]) > 1e-6);
      w = next;
      f = wfit();
      if (!moved) break;
    }
  }
  const { W, mx, my, sxx } = f;
  let b = f.b;
  let sig2: number;
  if (n > 2) {
    let rss = 0;
    const a0 = my - b * mx;
    for (let i = 0; i < n; i++) {
      const r = ys[i] - (a0 + b * xs[i]);
      rss += w[i] * r * r;
    }
    sig2 = Math.max(rss / Math.max(W - 2, 0.5), noise * noise * 0.25);
  } else {
    sig2 = noise * noise;
  }
  const seb = Math.sqrt(sig2 / sxx);
  const t = seb > 0 ? Math.abs(b / seb) : 0;
  const shrink = (t * t) / (1 + t * t); // una pendenza indistinguibile dal rumore viene azzerata
  b = Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, b * shrink));
  let a = my - b * mx;
  // xs sono relativi al target: se il target sta fuori dall'intervallo osservato, limita la parte estrapolata.
  const edge = Math.max(...xs) < 0 ? Math.max(...xs) : Math.min(...xs) > 0 ? Math.min(...xs) : null;
  if (edge !== null) {
    const zEdge = a + b * edge;
    a = zEdge + Math.max(-MAX_EXTRAPOLATION_Z, Math.min(MAX_EXTRAPOLATION_Z, a - zEdge));
  }
  const se = Math.max(Math.sqrt(sig2 * (1 / W + (mx * mx) / sxx)), noise / Math.sqrt(W));
  return { z: a, slope: b, se, shrink };
}

export interface Estimate {
  ga: number;
  /** Peso stimato in grammi. */
  efw: number;
  /** Estremo inferiore dell'intervallo al 95 %. */
  lo: number;
  /** Estremo superiore dell'intervallo al 95 %. */
  hi: number;
  z: number;
  slope: number;
  se: number;
  /** Percentile sulla curva di popolazione. */
  pct: number;
  /** Scarto standardizzato sulla curva personalizzata. */
  zc: number;
  /** Percentile sulla curva personalizzata. */
  pctc: number;
}

/**
 * Stima completa a una data epoca.
 *
 * `custScale` e' il rapporto fra il peso ottimale a termine personalizzato e la
 * mediana di popolazione a 40 settimane; passa 1 per disattivare la
 * personalizzazione.
 */
export function estimateAt(pts: TrajectoryPoint[], ga: number, custScale: number): Estimate | null {
  const fit = fitTrajectory(pts, ga);
  if (!fit) return null;
  const m = refMean(ga);
  let efw = m * (1 + fit.z * CV);
  if (efw < 40) efw = 40;
  const half = 1.96 * fit.se * CV * m; // incertezza della traiettoria
  const sys = 1.96 * 0.055 * efw; // errore sistematico della formula
  const tot = Math.sqrt(half * half + sys * sys);
  const mc = m * custScale;
  return {
    ga,
    efw,
    lo: Math.max(30, efw - tot),
    hi: efw + tot,
    z: fit.z,
    slope: fit.slope,
    se: fit.se,
    pct: percentileFromZ(fit.z),
    zc: (efw - mc) / (CV * mc),
    pctc: percentileFromZ((efw - mc) / (CV * mc)),
  };
}
