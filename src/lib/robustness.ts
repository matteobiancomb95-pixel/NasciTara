/**
 * Controllo di qualita' delle misure di un'ecografia, prima di stimare il peso.
 *
 * Un solo errore di battitura o una misura poco accurata spostava tutta la stima, perche' ogni ecografia
 * usava sempre Hadlock a 4 parametri. Qui ogni misura viene confrontata con l'atteso per l'epoca
 * (tabella BIO) e con le altre misure della stessa ecografia:
 *
 *  - valore impossibile (meno del 55 % o piu' del 160 % dell'atteso: cm al posto di mm, cifre perse)
 *    -> la misura non si usa;
 *  - BPD, HC o FL in disaccordo netto con le altre tre (oltre 4 deviazioni standard dalla loro mediana)
 *    -> la misura non si usa e il peso si calcola con la formula che non la richiede;
 *  - la circonferenza addominale (AC) non viene mai scartata per disaccordo: un addome piccolo rispetto
 *    alla testa e' proprio il segnale di un bebe piccolo, non un errore. Si scarta solo se impossibile.
 *
 * Con misure coerenti non cambia nulla: si usa Hadlock a 4 parametri come prima.
 */
import { BIO_CV, expectedMm, type MeasureKey } from './biometry';

export type Formula = 'hadlock4' | 'hadlock3' | 'hadlock2' | 'who';
export interface ScanQc {
  /** L'ecografia entra nella stima del peso. */
  weightUsable: boolean;
  /** Il femore entra nella stima della lunghezza. */
  femurUsable: boolean;
  formula: Formula;
  /** Misure non usate e perche'. */
  excluded: Array<{ key: MeasureKey; reason: 'impossible' | 'inconsistent' }>;
}

export const IMPOSSIBLE_LOW = 0.55;
export const IMPOSSIBLE_HIGH = 1.6;
export const INCONSISTENT_Z = 4;

/** Scarto standardizzato di una misura rispetto all'atteso per l'epoca. */
export function measureZ(key: MeasureKey, mm: number, ga: number): number {
  return (mm / expectedMm(key, ga) - 1) / BIO_CV[key];
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function checkScan(ga: number, mm: Record<MeasureKey, number>, whoAvailable: boolean): ScanQc {
  const keys: MeasureKey[] = ['BPD', 'HC', 'AC', 'FL'];
  const excluded: ScanQc['excluded'] = [];
  for (const k of keys) {
    const ratio = mm[k] / expectedMm(k, ga);
    if (!(ratio >= IMPOSSIBLE_LOW && ratio <= IMPOSSIBLE_HIGH)) excluded.push({ key: k, reason: 'impossible' });
  }
  const valid = keys.filter((k) => !excluded.some((e) => e.key === k));
  const z = Object.fromEntries(valid.map((k) => [k, measureZ(k, mm[k], ga)])) as Record<MeasureKey, number>;
  // Disaccordo: solo se restano almeno 3 misure valide per avere un confronto affidabile.
  if (valid.length >= 3) {
    const worst = valid
      .filter((k) => k !== 'AC')
      .map((k) => ({ k, gap: Math.abs(z[k] - median(valid.filter((o) => o !== k).map((o) => z[o]))) }))
      .sort((a, b) => b.gap - a.gap)[0];
    if (worst && worst.gap > INCONSISTENT_Z) excluded.push({ key: worst.k, reason: 'inconsistent' });
  }
  const out = new Set(excluded.map((e) => e.key));
  const femurUsable = !out.has('FL');
  if (out.size === 0) return { weightUsable: true, femurUsable, formula: 'hadlock4', excluded };
  if (out.has('AC') || out.size > 1) return { weightUsable: false, femurUsable, formula: 'hadlock4', excluded };
  if (out.has('BPD')) return { weightUsable: true, femurUsable, formula: 'hadlock3', excluded };
  if (out.has('HC')) return { weightUsable: true, femurUsable, formula: 'hadlock2', excluded };
  // Femore escluso: serve una formula senza femore (OMS su HC e AC, valida dalla 22a settimana).
  return { weightUsable: whoAvailable, femurUsable, formula: 'who', excluded };
}
