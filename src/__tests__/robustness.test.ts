import { describe, expect, it } from 'vitest';
import { analysePregnancy, type UltrasoundInput } from '../lib/analysis';
import { BIO_CV, expectedMm, type MeasureKey } from '../lib/biometry';
import { checkScan } from '../lib/robustness';
import { fitTrajectory, SIG_Z } from '../lib/trajectory';
import { buildProjection } from '../lib/projection';

/** Ecografia coerente: ogni misura a `s` deviazioni standard dall'atteso per l'epoca. */
const scan = (id: string, ga: number, s: Partial<Record<MeasureKey, number>> = {}): UltrasoundInput => {
  const mm = (k: MeasureKey) => Math.round(expectedMm(k, ga) * (1 + (s[k] ?? 0) * BIO_CV[k]) * 10) / 10;
  return { id, ga, bpdMm: mm('BPD'), hcMm: mm('HC'), acMm: mm('AC'), flMm: mm('FL') };
};
const run = (ultrasounds: UltrasoundInput[]) => analysePregnancy({ gaWeeks: 34, gaDays: 0, ultrasounds })!;
const clean = [scan('a', 20), scan('b', 24), scan('c', 28), scan('d', 32)];
const base = run(clean);
const off = (x: number, y: number) => Math.abs(x / y - 1);

describe('controllo delle misure di una ecografia', () => {
  it('misure coerenti: Hadlock a 4 parametri, nulla escluso', () => {
    expect(base.points.map((p) => p.qc.formula)).toEqual(['hadlock4', 'hadlock4', 'hadlock4', 'hadlock4']);
    expect(base.excludedFromWeight).toHaveLength(0);
  });

  it('BPD con cifre invertite (38 invece di 83): si stima senza BPD, il peso non si sposta', () => {
    const typo = { ...clean[3], bpdMm: 38 };
    const r = run([...clean.slice(0, 3), typo]);
    expect(r.points[3].qc).toMatchObject({ formula: 'hadlock3', excluded: [{ key: 'BPD', reason: 'impossible' }] });
    expect(off(r.now.efw, base.now.efw)).toBeLessThan(0.02);
  });

  it('HC incoerente con le altre misure (-20 %): si stima senza HC', () => {
    const typo = { ...clean[3], hcMm: Math.round(clean[3].hcMm! * 0.8) };
    const r = run([...clean.slice(0, 3), typo]);
    expect(r.points[3].qc).toMatchObject({ formula: 'hadlock2', excluded: [{ key: 'HC', reason: 'inconsistent' }] });
    expect(off(r.now.efw, base.now.efw)).toBeLessThan(0.03);
  });

  it('AC in centimetri invece che in millimetri: l’ecografia non entra nel peso', () => {
    const unit = { ...clean[3], acMm: clean[3].acMm! / 10 };
    const r = run([...clean.slice(0, 3), unit]);
    expect(r.excludedFromWeight.map((p) => p.id)).toEqual(['d']);
    expect(off(r.now.efw, base.now.efw)).toBeLessThan(0.03);
  });

  it('un addome davvero piccolo (bebe piccolo) non viene “corretto”', () => {
    const small = [scan('a', 24, { AC: -3.5 }), scan('b', 28, { AC: -3.5 }), scan('c', 32, { AC: -3.5 })];
    const r = run(small);
    expect(r.points.every((p) => p.qc.excluded.length === 0)).toBe(true);
    expect(r.now.pct).toBeLessThan(10);
  });

  it('femore sbagliato nell’ultima ecografia: la lunghezza si regge sulle altre', () => {
    const typo = { ...clean[3], flMm: 26 };
    const r = run([...clean.slice(0, 3), typo]);
    expect(r.points[3].qc.femurUsable).toBe(false);
    expect(Math.abs(r.lengthNow.cm - base.lengthNow.cm)).toBeLessThan(1);
    expect(Math.abs(r.lengthTerm.cm - base.lengthTerm.cm)).toBeLessThan(1);
  });

  it('scarta solo cio’ che serve: due misure sbagliate escludono l’ecografia', () => {
    const qc = checkScan(32, { BPD: 38, HC: 150, AC: 285, FL: 62 }, true);
    expect(qc.weightUsable).toBe(false);
  });
});

describe('traiettoria robusta', () => {
  it('una ecografia anomala pesa molto meno che con la retta semplice', () => {
    const pts = [20, 24, 26, 28, 32].map((ga) => ({ ga, z: 0 }));
    pts.splice(3, 0, { ga: 30, z: 3 });
    const robust = fitTrajectory(pts, 34)!.z;
    // Retta ai minimi quadrati semplice, come prima della 0.9.3.
    const n = pts.length, mx = pts.reduce((a, p) => a + p.ga, 0) / n, my = pts.reduce((a, p) => a + p.z, 0) / n;
    const b = pts.reduce((a, p) => a + (p.ga - mx) * (p.z - my), 0) / pts.reduce((a, p) => a + (p.ga - mx) ** 2, 0);
    const naive = my + b * (34 - mx);
    expect(Math.abs(robust)).toBeLessThan(Math.abs(naive) / 2);
    expect(Math.abs(robust)).toBeLessThan(0.35);
  });

  it('due ecografie rumorose non fanno esplodere la proiezione a termine', () => {
    const fit = fitTrajectory([{ ga: 20, z: -1 }, { ga: 24, z: 1 }], 40)!;
    const atLast = fitTrajectory([{ ga: 20, z: -1 }, { ga: 24, z: 1 }], 24)!;
    expect(fit.z - atLast.z).toBeLessThanOrEqual(1 + 1e-9);
    expect(Math.abs(fit.slope)).toBeLessThanOrEqual(0.2);
  });

  it('una serie coerente resta identica alla retta di prima (pesi tutti 1)', () => {
    const pts = [{ ga: 20, z: 0.1 }, { ga: 26, z: -0.2 }, { ga: 31, z: 0.15 }];
    expect(fitTrajectory(pts, 32)!.se).toBeGreaterThanOrEqual(SIG_Z / Math.sqrt(3));
  });

  it('la stessa ecografia inserita due volte conta una volta sola', () => {
    const once = run(clean);
    const twice = run([...clean, { ...clean[3], id: 'd2' }]);
    expect(twice.now.efw).toBeCloseTo(once.now.efw, 6);
    expect(twice.lengthNow.cm).toBeCloseTo(once.lengthNow.cm, 6);
  });
});

describe('lunghezza dal femore', () => {
  it('cresce in modo continuo lungo tutta la proiezione', () => {
    const series = buildProjection(base, 0.5);
    for (let i = 1; i < series.length; i++) expect(series[i].lengthCm).toBeGreaterThan(series[i - 1].lengthCm);
    expect(base.lengthTerm.cm).toBeGreaterThan(47);
    expect(base.lengthTerm.cm).toBeLessThan(53);
  });
});
