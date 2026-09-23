import { describe,it,expect } from 'vitest';
import { parseReport, rowsFromWords, validReportDate, validReportValue, EMPTY_REPORT, type OcrWord } from '../lib/reportParser';
import { flattenBackground } from '../lib/ocrImage';
import { reducer,emptyState } from '../state/NasciTaraStore';
describe('report extraction',()=>{
 it('reads explicit mm and cm, decimal comma and Italian aliases',()=>{
  expect(parseReport('Data esame: 14/09/2026\nCC 29,8 cm\nCA: 285 mm\nLF 6.2 cm\nDBP 83 mm').draft).toEqual({date:'2026-09-14',hcMm:298,acMm:285,flMm:62,bpdMm:83});
 });
 it('reads multiline ultrasound overlays and units before values',()=>{
  expect(parseReport('HC\n298\nmm\nAC (mm): 285\nFL1 = 6.2 c m\nBPD\n83 mm').draft).toEqual({...EMPTY_REPORT,hcMm:298,acMm:285,flMm:62,bpdMm:83});
 });
 it('does not pair a missing value with another measurement label',()=>{
  expect(parseReport('HC\nAC 285 mm\nFL (cm) -6.2').draft).toEqual({...EMPTY_REPORT,acMm:285});
 });
 it('never reads birth dates, percentiles, gestational weeks or estimated weights as measurements',()=>{
  const r=parseReport('Data nascita 01/01/1990\nEFW 2204 g\nHC 298\nAC 47%\nFL 32w\nBPD 83');
  expect(r.draft).toEqual({...EMPTY_REPORT,hcMm:298,bpdMm:83});
  expect(r.inferred).toEqual(['hcMm','bpdMm']);
  expect(parseReport('AC 47 %\nFL 32 sett\nBPD 33 w\nHC 12/09').draft).toEqual(EMPTY_REPORT);
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
describe('adversarial report cases',()=>{
 it('uses explicit units even when OCR splits their letters or places them on the next line',()=>{
  for(const text of ['HC 30 m m','HC 30\nmm','HC (mm) 30']){
   expect(parseReport(text).draft.hcMm).toBe(30);expect(parseReport(text).inferred).toEqual([]);
  }
 });
 it('does not treat percentages followed by numbers, ratios or unsupported units as millimetres',()=>{
  for(const text of ['CA 47 % 50','HC (mm) 275/300','FL 45 in','BPD (percentile) 77'])expect(parseReport(text).draft).toEqual(EMPTY_REPORT);
 });
 it('warns about additional measurements even if they include units',()=>{
  expect(parseReport('FL 45 - 54 mm').others.flMm).toEqual(['54']);
 });
});
describe('Italian reports without units',()=>{
 // Rows rebuilt from OCR of a real phone photo (IMG_2990): printed values in cm without unit, handwritten notes after two of them.
 const photo='BPD (Diametro biparietale): 7,7\nFL (Lunghezza femore): 45 - 54\nCC (Circonferenza cranica): 27,5\nCA (Circonferenza addominale): 22,9 -%5.0\nN.B 1';
 it('reads descriptions in brackets and infers cm from plausibility, flagging every inferred value',()=>{
  const r=parseReport(photo);
  expect(r.draft).toEqual({...EMPTY_REPORT,bpdMm:77,flMm:45,hcMm:275,acMm:229});
  expect([...r.inferred].sort()).toEqual(['acMm','bpdMm','flMm','hcMm']);
 });
 it('reports other numbers on the same line, such as handwritten notes',()=>{
  const r=parseReport(photo);
  expect(r.others.flMm).toEqual(['54']);expect(r.others.acMm).toEqual(['5.0']);expect(r.others.bpdMm).toEqual([]);
 });
 it('reads the printed decimal comma and tolerates OCR noise after the value',()=>{
  expect(parseReport('FL (Lunghezza femore): 4,5 - 5,1\nCA (Circonferenza addominale): 22,9 X50').draft).toEqual({...EMPTY_REPORT,flMm:45,acMm:229});
  expect(parseReport('LF: 4,5\nDBP 7,7\nCC 27,5\nCA 22,9').draft).toEqual({...EMPTY_REPORT,flMm:45,bpdMm:77,hcMm:275,acMm:229});
 });
 it('does not pair a label with a unitless value on another line',()=>{
  expect(parseReport('CA (Circonferenza addominale):\n7,7\n45 - 54').draft).toEqual(EMPTY_REPORT);
 });
 it('keeps explicit units authoritative and marks only unitless values as inferred',()=>{
  const r=parseReport('BPD 7,7 cm\nFL 45');
  expect(r.draft).toEqual({...EMPTY_REPORT,bpdMm:77,flMm:45});expect(r.inferred).toEqual(['flMm']);
 });
 it('leaves implausible or unit-inconsistent values for manual entry',()=>{
  expect(parseReport('BPD 20\nFL 8').draft).toEqual(EMPTY_REPORT);
  expect(parseReport('BPD 20\nFL 8').ambiguous.sort()).toEqual(['bpdMm','flMm']);
  expect(parseReport('HC 5').draft.hcMm).toBe('');
 });
 it('keeps lowercase words such as "ca" (circa) and ratios out of measurements',()=>{
  expect(parseReport('peso ca 1500\ncc 30\nFL/AC 0,22').draft).toEqual(EMPTY_REPORT);
 });
});
describe('OCR layout',()=>{
 const word=(text:string,x0:number,y0:number,x1=x0+40,y1=y0+30):OcrWord=>({text,bbox:{x0,y0,x1,y1}});
 it('joins a label column and a value column emitted as separate blocks',()=>{
  const words=[word('BPD',10,100),word('(Diametro',60,102),word('biparietale):',160,101),word('FL',10,200),word('(Lunghezza',60,200),word('femore):',160,201),
   word('7,7',600,96),word('4,5',600,206),word('-',650,205),word('5,1',680,198,720,236)];
  expect(rowsFromWords(words)).toBe('BPD (Diametro biparietale): 7,7\nFL (Lunghezza femore): 4,5 - 5,1');
 });
 it('tolerates a slightly tilted page',()=>{
  expect(rowsFromWords([word('CA',10,300),word('addominale):',60,296),word('22,9',600,288)])).toBe('CA addominale): 22,9');
 });
 it('removes a shadow so dark text stays dark and paper turns white',()=>{
  const width=200,height=100,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const paper=120+x*0.6,text=x%50<4&&y>40&&y<60;const v=text?paper*0.45:paper;data.set([v,v,v,255],(y*width+x)*4);}
  flattenBackground({data,width,height});
  const at=(x:number,y:number)=>data[(y*width+x)*4];
  expect(at(10,10)).toBeGreaterThan(230);expect(at(190,10)).toBeGreaterThan(230);
  expect(at(1,50)).toBeLessThan(140);expect(at(151,50)).toBeLessThan(140);
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
