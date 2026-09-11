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

export function fitTrajectory(pts: TrajectoryPoint[], target: number): TrajectoryFit | null {
  const n = pts.length;
  let i: number;
  if (n === 0) return null;
  if (n === 1) return { z: pts[0].z, slope: 0, se: SIG_Z, shrink: 0 };

  const xs: number[] = [];
  const ys: number[] = [];
  let mx = 0;
  let my = 0;
  for (i = 0; i < n; i++) {
    xs.push(pts[i].ga - target);
    ys.push(pts[i].z);
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;

  let sxx = 0;
  let sxy = 0;
  for (i = 0; i < n; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx <= 1e-9) {
    return { z: my, slope: 0, se: Math.max(SIG_Z / Math.sqrt(n), SIG_Z * 0.5), shrink: 0 };
  }

  let b = sxy / sxx;
  let sig2: number;
  if (n > 2) {
    let rss = 0;
    const a0 = my - b * mx;
    for (i = 0; i < n; i++) {
      const r = ys[i] - (a0 + b * xs[i]);
      rss += r * r;
    }
    sig2 = Math.max(rss / (n - 2), SIG_Z * SIG_Z * 0.25);
  } else {
    sig2 = SIG_Z * SIG_Z;
  }

  const seb = Math.sqrt(sig2 / sxx);
  const t = seb > 0 ? Math.abs(b / seb) : 0;
  const shrink = (t * t) / (1 + t * t); // una pendenza indistinguibile dal rumore viene azzerata
  b *= shrink;
  const a = my - b * mx;
  const se = Math.max(Math.sqrt(sig2 * (1 / n + (mx * mx) / sxx)), SIG_Z / Math.sqrt(n));
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
