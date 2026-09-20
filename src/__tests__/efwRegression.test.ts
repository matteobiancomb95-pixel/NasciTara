import { describe, expect, it } from 'vitest';

import { analysePregnancy } from '../lib/analysis';
import { hadlock2, hadlock3, hadlock4 } from '../lib/efwHadlock';
import { isWhoApplicable, whoEfw } from '../lib/efwWho';
import { CV, refAt, refMean, Z } from '../lib/percentilesHadlock1991';
import { fitTrajectory } from '../lib/trajectory';
import { customCurve, termOptimalWeightMaternal } from '../lib/customCurveGardosiLite';
import { sensitivity } from '../lib/biometry';
import {
  buildProjection,
  EXTRAPOLATION_FROM_WEEKS,
  isExtrapolated,
  pointAt,
  PROJECTION_MAX_WEEKS,
  selectableWeeks,
} from '../lib/projection';

/**
 * Test di regressione del refactor.
 *
 * Il prototipo `curva-di-matilde.html` e' la fonte di verita'. Questi test
 * bloccano i valori che produceva, cosi' qualunque modifica futura ai moduli
 * di `src/lib` che cambi la logica numerica fallisce subito.
 */

/** Caso di riferimento: 33+2 settimane, tre ecografie, mamma 167 cm / 64 kg. */
const GA = 33 + 2 / 7;

const REFERENCE_CASE = {
  gaWeeks: 33,
  gaDays: 2,
  parents: { motherHeightCm: 167, motherWeightKg: 64 },
  ultrasounds: [
    { id: 'eco-1', ga: GA - 89 / 7, bpdMm: 47, hcMm: 176, acMm: 152, flMm: 31 },
    { id: 'eco-2', ga: GA - 37 / 7, bpdMm: 72, hcMm: 262, acMm: 243, flMm: 53 },
    { id: 'eco-3', ga: GA - 6 / 7, bpdMm: 83, hcMm: 298, acMm: 285, flMm: 62 },
  ],
};

describe('caso di riferimento — parita con il prototipo', () => {
  const r = analysePregnancy(REFERENCE_CASE);

  it('produce un risultato', () => {
    expect(r).not.toBeNull();
  });

  it('peso stimato 2204 g', () => {
    expect(r!.now.efw).toBeCloseTo(2204.18, 1);
    expect(Math.round(r!.now.efw)).toBe(2204);
  });

  it('percentile 47', () => {
    expect(r!.now.pct).toBeCloseTo(47.36, 1);
    expect(Math.round(r!.now.pct)).toBe(47);
  });

  it('lunghezza 41,5 cm', () => {
    expect(r!.lengthNow.cm).toBeCloseTo(41.49, 1);
    expect(r!.lengthNow.cm.toFixed(1)).toBe('41.5');
  });

  it('proiezione a termine 3,70 kg', () => {
    expect(r!.term.efw / 1000).toBeCloseTo(3.702, 2);
    expect((r!.term.efw / 1000).toFixed(2)).toBe('3.70');
  });

  it('intervallo al 95 % 1874 – 2534 g', () => {
    expect(Math.round(r!.now.lo)).toBe(1874);
    expect(Math.round(r!.now.hi)).toBe(2534);
  });

  it('percentile sulla curva personalizzata 62', () => {
    expect(Math.round(r!.now.pctc)).toBe(62);
  });

  it('scarti standardizzati delle tre ecografie', () => {
    expect(r!.points.map((p) => Number(p.z.toFixed(3)))).toEqual([-0.816, 0.116, -0.18]);
  });

  it('tre ecografie complete, quindi traiettoria e non singola osservazione', () => {
    expect(r!.points).toHaveLength(3);
    expect(r!.singleObservation).toBe(false);
    expect(r!.now.slope).toBeCloseTo(0.0361, 3);
  });
});

describe('curva di riferimento Hadlock 1991', () => {
  /** Tabella pubblicata: [EG, 3o, 10o, 50o, 90o, 97o] in grammi. */
  const PUBLISHED: Array<[number, number, number, number, number, number]> = [
    [20, 249, 275, 331, 387, 412],
    [24, 506, 556, 670, 784, 834],
    [28, 915, 1005, 1210, 1415, 1505],
    [32, 1477, 1622, 1953, 2284, 2429],
    [36, 2128, 2337, 2813, 3289, 3499],
    [40, 2736, 3005, 3619, 4233, 4502],
  ];

  it.each(PUBLISHED)('EG %i riproduce i centili entro lo 0,8 %%', (ga, p3, p10, p50, p90, p97) => {
    const within = (got: number, want: number, tol: number) =>
      expect(Math.abs(got - want) / want).toBeLessThan(tol);
    within(refMean(ga), p50, 0.003); // la mediana entro lo 0,3 %
    within(refAt(ga, Z.p3), p3, 0.008);
    within(refAt(ga, Z.p10), p10, 0.008);
    within(refAt(ga, Z.p90), p90, 0.008);
    within(refAt(ga, Z.p97), p97, 0.008);
  });

  it('il coefficiente di variazione resta 0,13', () => {
    expect(CV).toBe(0.13);
  });
});

describe('formule EFW', () => {
  // BPD 85, HC 305, AC 290, FL 64 mm a 33 settimane
  const b = 8.5;
  const h = 30.5;
  const a = 29.0;
  const f = 6.4;

  it('Hadlock a 4 parametri', () => {
    expect(Math.round(hadlock4(b, h, a, f))).toBe(2148);
  });
  it('Hadlock HC+AC+FL', () => {
    expect(Math.round(hadlock3(h, a, f))).toBe(2132);
  });
  it('Hadlock BPD+AC+FL', () => {
    expect(Math.round(hadlock2(b, a, f))).toBe(2171);
  });
  it('WHO log-cubico', () => {
    expect(Math.round(whoEfw(h, a))).toBe(2029);
  });
  it('dispersione tra le quattro formule invariata rispetto al prototipo', () => {
    const all = [hadlock4(b, h, a, f), hadlock3(h, a, f), hadlock2(b, a, f), whoEfw(h, a)];
    const spread = (Math.max(...all) - Math.min(...all)) / Math.min(...all);
    expect(spread).toBeCloseTo(0.07003965069774955, 12);
  });
});

describe('limite di validita della formula WHO', () => {
  it('non e applicabile prima della 22a settimana', () => {
    expect(isWhoApplicable(20)).toBe(false);
    expect(isWhoApplicable(22)).toBe(true);
  });

  it('sotto la 22a settimana il valore WHO viene omesso, non mostrato sbagliato', () => {
    const r = analysePregnancy(REFERENCE_CASE)!;
    expect(r.points[0].ga).toBeLessThan(22);
    expect(r.points[0].efwWho).toBeNull();
    expect(r.points[1].efwWho).not.toBeNull();
  });

  it('a 20 settimane sovrastimerebbe di oltre il 30 %', () => {
    // 17,6 cm di cranica e 15,2 cm di addominale: valori attesi a 20 settimane
    expect(whoEfw(17.6, 15.2) / refMean(20)).toBeGreaterThan(1.3);
  });
});

describe('contrazione della pendenza t^2/(1+t^2)', () => {
  it('una pendenza netta sopravvive alla contrazione', () => {
    const pts = [
      { ga: 24, z: -1.0 },
      { ga: 28, z: -0.3 },
      { ga: 32, z: 0.4 },
      { ga: 36, z: 1.1 },
    ];
    const fit = fitTrajectory(pts, 36)!;
    expect(fit.shrink).toBeGreaterThan(0.9);
    expect(fit.slope).toBeGreaterThan(0.15);
  });

  it('una serie piatta e rumorosa non genera accelerazioni spurie', () => {
    const pts = [
      { ga: 24, z: 0.2 },
      { ga: 28, z: -0.2 },
      { ga: 32, z: 0.2 },
      { ga: 36, z: -0.2 },
    ];
    const fit = fitTrajectory(pts, 36)!;
    expect(Math.abs(fit.slope)).toBeLessThan(0.02);
  });

  it('una sola osservazione non produce pendenza', () => {
    const fit = fitTrajectory([{ ga: 32, z: 0.5 }], 33)!;
    expect(fit.slope).toBe(0);
    expect(fit.z).toBe(0.5);
  });
});

describe('curva personalizzata', () => {
  it('il nucleo materno resta identico al prototipo', () => {
    expect(termOptimalWeightMaternal(167, 64)).toBeCloseTo(3451.0, 6);
    expect(termOptimalWeightMaternal(null, null)).toBe(3480 - 65);
  });

  it('senza dati paterni l estensione vale esattamente zero', () => {
    const only = customCurve({ motherHeightCm: 167, motherWeightKg: 64 });
    expect(only.paternalGrams).toBe(0);
    expect(only.termOptimalWeight).toBe(termOptimalWeightMaternal(167, 64));
    expect(only.coverage).toBe('solo mamma');
  });

  it('l eta dei genitori non entra nel calcolo del peso', () => {
    const senza = customCurve({ motherHeightCm: 167, motherWeightKg: 64 });
    const con = customCurve({
      motherHeightCm: 167,
      motherWeightKg: 64,
      motherAgeYears: 38,
      fatherAgeYears: 44,
    });
    expect(con.termOptimalWeight).toBe(senza.termOptimalWeight);
  });

  it('i dati paterni spostano il peso ottimale e cambiano la copertura', () => {
    const con = customCurve({ motherHeightCm: 167, motherWeightKg: 64, fatherHeightCm: 186 });
    expect(con.coverage).toBe('mamma e papa');
    expect(con.paternalGrams).toBeCloseTo(40, 6);
  });

  it('senza alcun dato la curva funziona comunque', () => {
    const vuota = customCurve({});
    expect(vuota.coverage).toBe('nessun dato');
    expect(Number.isFinite(vuota.termOptimalWeight)).toBe(true);
  });

  it('i dati dei genitori non toccano peso stimato ne percentile di popolazione', () => {
    const base = analysePregnancy(REFERENCE_CASE)!;
    const conPapa = analysePregnancy({
      ...REFERENCE_CASE,
      parents: { ...REFERENCE_CASE.parents, fatherHeightCm: 186, fatherWeightKg: 82 },
    })!;
    expect(conPapa.now.efw).toBe(base.now.efw);
    expect(conPapa.now.pct).toBe(base.now.pct);
    expect(conPapa.now.pctc).not.toBe(base.now.pctc); // cambia solo la curva personalizzata
  });
});

describe('ecografie incomplete e osservazione singola', () => {
  it('le ecografie incomplete vengono ignorate', () => {
    const r = analysePregnancy({
      ...REFERENCE_CASE,
      ultrasounds: [
        ...REFERENCE_CASE.ultrasounds,
        { id: 'incompleta', ga: 33, bpdMm: 84, hcMm: null, acMm: 288, flMm: 63 },
      ],
    })!;
    expect(r.points).toHaveLength(3);
    expect(r.totalUltrasounds).toBe(4);
    expect(r.now.efw).toBeCloseTo(2204.18, 1);
  });

  it('senza nessuna ecografia completa restituisce null', () => {
    expect(
      analysePregnancy({
        gaWeeks: 33,
        gaDays: 2,
        ultrasounds: [{ id: 'x', ga: 33, bpdMm: 84, hcMm: null, acMm: null, flMm: null }],
      }),
    ).toBeNull();
  });

  it('una sola ecografia viene segnalata come tale', () => {
    const r = analysePregnancy({
      ...REFERENCE_CASE,
      ultrasounds: [REFERENCE_CASE.ultrasounds[2]],
    })!;
    expect(r.singleObservation).toBe(true);
    expect(r.now.slope).toBe(0);
  });
});

describe('sensibilita alle singole misure', () => {
  const s = sensitivity(83, 298, 285, 62);

  it('la circonferenza addominale domina', () => {
    expect(s[0].key).toBe('AC');
    expect(s[0].share).toBeGreaterThan(50);
  });

  it('ordine dei contributi: AC, FL, HC, BPD', () => {
    expect(s.map((x) => x.key)).toEqual(['AC', 'FL', 'HC', 'BPD']);
  });

  it('per millimetro il femore sposta piu di tutti', () => {
    const fl = s.find((x) => x.key === 'FL')!;
    const ac = s.find((x) => x.key === 'AC')!;
    expect(fl.percentPerMm).toBeGreaterThan(ac.percentPerMm);
  });

  it('le quote sommano a 100', () => {
    expect(s.reduce((t, x) => t + x.share, 0)).toBeCloseTo(100, 6);
  });
});


describe('proiezione fino alla 45a settimana', () => {
  const r = analysePregnancy(REFERENCE_CASE)!;

  it('il punto calcolato a oggi coincide con la stima principale', () => {
    // La dashboard e il grafico leggono da qui: se divergessero, la stessa
    // schermata mostrerebbe due numeri diversi per lo stesso istante.
    const now = pointAt(r, r.ga)!;
    expect(now.efw).toBeCloseTo(r.now.efw, 6);
    expect(now.lengthCm).toBeCloseTo(r.lengthNow.cm, 6);
    expect(now.pct).toBeCloseTo(r.now.pct, 6);
  });

  it('a 40 settimane coincide con la proiezione a termine', () => {
    const term = pointAt(r, 40)!;
    expect(term.efw).toBeCloseTo(r.term.efw, 6);
    expect(term.lengthCm).toBeCloseTo(r.lengthTerm.cm, 6);
  });

  it('la serie arriva alla 45a settimana', () => {
    const series = buildProjection(r);
    expect(series[series.length - 1].ga).toBeCloseTo(PROJECTION_MAX_WEEKS, 6);
    expect(selectableWeeks(r).slice(-1)[0]).toBe(45);
  });

  it('oltre la 42a i punti sono marcati come estrapolati', () => {
    expect(isExtrapolated(40)).toBe(false);
    expect(isExtrapolated(EXTRAPOLATION_FROM_WEEKS)).toBe(false);
    expect(isExtrapolated(43)).toBe(true);
    expect(pointAt(r, 45)!.isExtrapolated).toBe(true);
    expect(pointAt(r, 40)!.isExtrapolated).toBe(false);
  });

  it('peso e lunghezza continuano a crescere in modo monotono', () => {
    const series = buildProjection(r, 1);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].efw).toBeGreaterThan(series[i - 1].efw);
      expect(series[i].lengthCm).toBeGreaterThan(series[i - 1].lengthCm);
    }
  });

  it('i valori a 45 settimane restano in un ordine di grandezza plausibile', () => {
    const p = pointAt(r, 45)!;
    expect(p.efw).toBeGreaterThan(4000);
    expect(p.efw).toBeLessThan(5000);
    expect(p.lengthCm).toBeGreaterThan(52);
    expect(p.lengthCm).toBeLessThan(60);
  });
});

describe('nome del file PDF', () => {
  it('usa il formato yyyy_mm_dd', async () => {
    const { pdfFilename } = await import('../lib/exportPdf');
    // Date locale, non UTC: pdfFilename legge l'ora locale, e con Date.UTC il
    // test fallirebbe in ogni fuso a ovest di Greenwich.
    expect(pdfFilename(new Date(2026, 8, 7))).toBe('2026_09_07.pdf');
    expect(pdfFilename(new Date(2026, 11, 25))).toBe('2026_12_25.pdf');
  });
});
