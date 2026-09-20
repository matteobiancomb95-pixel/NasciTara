import { describe, expect, it } from 'vitest';
import { buildNasciTaraModel, deltaPesoMamma, maternalContextAt } from '../lib/nasciTara';
import { analysePregnancy } from '../lib/analysis';
import { pointAt } from '../lib/projection';

describe('NasciTara parent context', () => {
  it('preserves missing, unchanged and decreasing weights', () => {
    expect(deltaPesoMamma(70, null)).toBeNull();
    expect(deltaPesoMamma(undefined, 60)).toBeNull();
    expect(deltaPesoMamma(NaN, 60)).toBeNull();
    expect(deltaPesoMamma(60, 60)).toBe(0);
    expect(deltaPesoMamma(58, 60)).toBe(-2);
    expect(deltaPesoMamma(70, 60)).toBe(10);
  });
  it('associates each measurement with its date without using future weight', () => {
    const m = buildNasciTaraModel({pesoPreGravidanzaMamma:60}, [
      {id:'later',ga:32,pesoMammaOsservazione:70},
      {id:'early',ga:24,pesoMammaOsservazione:64},
      {id:'missing',ga:28},
    ]);
    expect(m.observations.map(o=>o.deltaPesoMamma)).toEqual([4,null,10]);
    expect(maternalContextAt(m,23)).toBeNull();
    expect(maternalContextAt(m,30)?.id).toBe('early');
    expect(maternalContextAt(m,32)?.deltaPesoMamma).toBe(10);
  });
  it('keeps standard results identical with all seven optional inputs', () => {
    const input = {gaWeeks:33,gaDays:2,ultrasounds:[
      {id:'a',ga:28,bpdMm:72,hcMm:262,acMm:243,flMm:53},
      {id:'b',ga:32,bpdMm:83,hcMm:298,acMm:285,flMm:62},
    ]};
    const base = analysePregnancy(input)!;
    const enriched = analysePregnancy({...input, nasciTaraParents:{
      pesoPreGravidanzaMamma:64,pesoMammaOsservazione:73,altezzaMamma:167,
      pesoPapa:82,altezzaPapa:186,etaMamma:34,etaPapa:38,
    },ultrasounds:input.ultrasounds.map((u,i)=>({...u,pesoMammaOsservazione:68+i*3}))})!;
    expect(enriched.points).toEqual(base.points);
    expect(enriched.now.efw).toBe(base.now.efw);
    expect(enriched.now.pct).toBe(base.now.pct);
    expect(enriched.term.efw).toBe(base.term.efw);
    expect(enriched.lengthNow).toEqual(base.lengthNow);
    expect(enriched.lengthTerm).toEqual(base.lengthTerm);
    expect(enriched.nasciTara.availableParentFields).toHaveLength(7);
    expect(enriched.nasciTara.deltaPesoMamma).toBe(9);
    expect(pointAt(enriched,32)?.maternalContext?.deltaPesoMamma).toBe(7);
    expect(pointAt(enriched,40)?.efw).toBe(pointAt(base,40)?.efw);
  });
  it('works without any parent data', () => {
    const m=buildNasciTaraModel({},[]);
    expect(m.availableParentFields).toEqual([]);
    expect(m.deltaPesoMamma).toBeNull();
    expect(m.bmiPapa).toBeNull();
  });
});
