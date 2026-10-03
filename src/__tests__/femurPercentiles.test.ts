import { describe, it, expect } from 'vitest';
import { femurReference, femurObservation, summarizeFemur, percentileLabel } from '../lib/femurPercentiles';
describe('femur reference and descriptive series', () => {
  it('matches published Chitty/Altman rounded median and SD at 20 weeks', () => { const r = femurReference(20)!; expect(r.mean).toBeCloseTo(32.1, 1); expect(r.sd).toBeCloseTo(2.2, 1); });
  it('normal percentiles at mean and mean +/-1.28155 SD', () => { for (const ga of [12,20,28,33,40,42]) { const r = femurReference(ga)!; expect(femurObservation(ga,r.mean)!.pct).toBeCloseTo(50,4); expect(femurObservation(ga,r.mean+1.2815515655*r.sd)!.pct).toBeCloseTo(90,3); expect(femurObservation(ga,r.mean-1.2815515655*r.sd)!.pct).toBeCloseTo(10,3); } });
  it('uses every observation, not just the last or a mean of percentiles', () => { const make = (ga:number,z:number) => ({ga,flMm:femurReference(ga)!.mean+z*femurReference(ga)!.sd}); const scans=[make(20,-2),make(28,0),make(33,2)]; const r=summarizeFemur(scans)!; expect(r.points).toHaveLength(3);expect(r.pct).toBeCloseTo(50,4);expect(summarizeFemur(scans.slice(1))!.pct).toBeCloseTo(84.1345,3);expect(summarizeFemur([...scans].reverse())!.pct).toBeCloseTo(r.pct,5); });
  it('excludes invalid and outside-range scans without extrapolating a clinical percentile', () => { expect(summarizeFemur([{ga:45,flMm:75}])).toBeNull(); expect(femurReference(NaN)).toBeNull(); expect(femurObservation(30,NaN)).toBeNull(); expect(femurObservation(30,0)).toBeNull(); const r=summarizeFemur([{ga:20,flMm:32},{ga:45,flMm:75}])!;expect(r.excluded).toBe(1);expect(r.points).toHaveLength(1); });
  it('keeps extreme percentiles readable',()=>{expect(percentileLabel(.001,'it')).toBe('<1°');expect(percentileLabel(99.99,'it')).toBe('>99°');});
});
