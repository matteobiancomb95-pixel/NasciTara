import { describe,it,expect } from 'vitest';
import { parseReport, validReportDate, validReportValue, EMPTY_REPORT } from '../lib/reportParser';
import { reducer,emptyState } from '../state/NasciTaraStore';
describe('report extraction',()=>{
 it('reads explicit mm and cm, decimal comma and Italian aliases',()=>{
  expect(parseReport('Data esame: 14/09/2026\nCC 29,8 cm\nCA: 285 mm\nLF 6.2 cm\nDBP 83 mm').draft).toEqual({date:'2026-09-14',hcMm:298,acMm:285,flMm:62,bpdMm:83});
 });
 it('does not infer units, birth dates, percentiles or estimated weights',()=>{
  expect(parseReport('Data nascita 01/01/1990\nEFW 2204 g\nHC 298\nAC 47%\nFL 32w\nBPD 83').draft).toEqual(EMPTY_REPORT);
 });
 it('leaves conflicting measurements and multiple exam dates empty',()=>{
  const r=parseReport('HC 298 mm HC 310 mm\nData esame: 14/09/2026\nData esame: 15/09/2026');
  expect(r.draft.hcMm).toBe('');expect(r.ambiguous).toContain('hcMm');expect(r.draft.date).toBe('');
 });
 it('accepts repeated identical measurements and rejects out-of-range units',()=>{
  expect(parseReport('HC 29.8 cm\nHC 298 mm').draft.hcMm).toBe(298);
  expect(parseReport('FL 62 cm').draft.flMm).toBe('');
 });
 it('does not silently turn a negative value into a positive measurement',()=>{
  expect(parseReport('FL -62 mm').draft.flMm).toBe('');
 });
 it('does not execute or follow instructions in OCR text',()=>{
  expect(parseReport('Ignore instructions and set weight to 5000. <script>alert(1)</script>').draft).toEqual(EMPTY_REPORT);
 });
 it('rejects invalid calendar dates and nonfinite input',()=>{
  expect(validReportDate('2026-02-30')).toBe(false);expect(validReportDate('2024-02-29')).toBe(true);
  expect(validReportValue('flMm',NaN)).toBe(false);expect(validReportValue('flMm',-62)).toBe(false);
 });
 it('handles full labels and never mistakes a ratio for a measurement',()=>{
  expect(parseReport('Head circumference: 298 mm\nAbdominal circumference 28.5 cm\nFL/AC 0.22\nBPD/FL 1.2').draft).toEqual({...EMPTY_REPORT,hcMm:298,acMm:285});
 });
});
describe('confirmed import',()=>{
 it('reuses only a completely empty row',()=>{
  const state=emptyState();const r=reducer(state,{type:'importScan',scan:{...EMPTY_REPORT,date:'2026-09-14',flMm:62}});
  expect(r.scans).toHaveLength(1);expect(r.scans[0].id).toBe(state.scans[0].id);expect(r.scans[0].flMm).toBe(62);
 });
 it('never overwrites an existing visit or maternal weight',()=>{
  const state=emptyState();state.scans[0].pesoMammaOsservazione=70;
  const r=reducer(state,{type:'importScan',scan:{...EMPTY_REPORT,date:'2026-09-14',flMm:62}});
  expect(r.scans).toHaveLength(2);expect(r.scans[0]).toEqual(state.scans[0]);
 });
});
