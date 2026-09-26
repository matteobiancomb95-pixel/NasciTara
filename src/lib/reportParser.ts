/**
 * Conservative parsing of measurement/value pairs.
 * Explicit mm/cm units always win. A missing unit (common on Italian reports: "BPD (Diametro biparietale): 7,7")
 * is inferred only when exactly one of mm/cm is plausible for that field between 12 and 43 weeks, the value sits on
 * the same line as its label, and cross-measurement ratios agree. Inferred values are always flagged for review.
 */
export const REPORT_FIELDS = ['hcMm','acMm','flMm','bpdMm'] as const;
export type ReportField = typeof REPORT_FIELDS[number];
export type ReportDraft = Record<ReportField, number | ''> & { date: string };
export interface ParsedReport {
 draft: ReportDraft; sources: Record<ReportField,string>; ambiguous: ReportField[];
 /** Filled from a value printed without unit. */
 inferred: ReportField[];
 /** Other numbers on the same line after the accepted value (e.g. handwritten notes). */
 others: Record<ReportField,string[]>;
}
export const EMPTY_REPORT: ReportDraft = {date:'',hcMm:'',acMm:'',flMm:'',bpdMm:''};
/** Case-insensitive letters without the i flag, so acronyms stay case-sensitive ("ca" = circa is not AC). */
const ci=(words:string)=>words.split(' ').map(w=>[...w].map(c=>/[a-z]/.test(c)?`[${c}${c.toUpperCase()}]`:c).join('')).join('\\s+');
const acronyms: Record<ReportField,string> = {hcMm:'HC|CC',acMm:'AC|CA',flMm:'FL|LF',bpdMm:'BPD|DBP'};
const names: Record<ReportField,string[]> = {
 hcMm:['circonferenza cranica','circonferenza cefalica','head circumference'],
 acMm:['circonferenza addominale','abdominal circumference'],
 flMm:['lunghezza femore','lunghezza del femore','lunghezza femorale','femur length'],
 bpdMm:['diametro biparietale','biparietal diameter'],
};
/** Plausible mm between 12 and 43 weeks. Each upper bound is below 10x its lower bound, so mm and cm never both fit. */
const inferRanges: Record<ReportField,[number,number]> = {hcMm:[60,420],acMm:[45,440],flMm:[9,85],bpdMm:[15,115]};
/** Generous physiological ratios: a value read in the wrong unit is off by 10x and fails them. */
const ratios: Array<[ReportField,ReportField,number,number]> = [['flMm','bpdMm',0.25,1.2],['hcMm','acMm',0.7,1.6],['hcMm','bpdMm',2.5,4.8],['flMm','acMm',0.1,0.35]];
const anyLabel=new RegExp('(?<![A-Za-z/])(?:'+Object.values(acronyms).join('|')+')(?![A-Za-z/])|'+Object.values(names).flat().map(ci).join('|'));
export function validReportDate(value: string): boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;
}
export function validReportValue(field: ReportField, value: number | ''): boolean {
 const ranges: Record<ReportField,[number,number]>={hcMm:[20,500],acMm:[20,500],flMm:[5,120],bpdMm:[10,150]};
 return value==='' || (Number.isFinite(value)&&value>=ranges[field][0]&&value<=ranges[field][1]);
}
/** Unitless value to mm, or null when mm and cm are both implausible. */
function inferMm(field: ReportField, value: number): number | null {
 const [lo,hi]=inferRanges[field];const asMm=value>=lo&&value<=hi, asCm=value*10>=lo&&value*10<=hi;
 return asMm?value:asCm?Math.round(value*1000)/100:null;
}
/** Numbers after an accepted value up to the next measurement label, skipping percentiles, weeks and indexes. */
function trailingNumbers(rest: string): string[] {
 // Weeks+days ("30+2") are gestational age, not a second value.
 const line=rest.split('\n')[0].replace(/(?<![\d.,])\d{1,2}[ \t]*\+[ \t]*\d(?!\d)/g,' ');const next=line.search(anyLabel);
 const tail=next<0?line:line.slice(0,next);
 return [...tail.matchAll(/(?<![A-Za-z\d.,/])\d{1,3}(?:[.,]\d{1,2})?(?![\d.,/])/g)]
  .filter(m=>!/^\s*(?:[%°]|(?:w|wk|wks|weeks?|sett\w*|gg|days?)(?![A-Za-z]))/i.test(tail.slice((m.index??0)+m[0].length)))
  .map(m=>m[0]);
}
export function parseReport(text: string): ParsedReport {
 const draft={...EMPTY_REPORT}; const sources={hcMm:'',acMm:'',flMm:'',bpdMm:''}; const ambiguous:ReportField[]=[]; const inferred:ReportField[]=[];
 const others:Record<ReportField,string[]>={hcMm:[],acMm:[],flMm:[],bpdMm:[]};
 // Reject unbounded input and do not interpret document text as instructions.
 const content=text.slice(0,100000);
 for(const field of REPORT_FIELDS){
  // Acronym with optional index (FL1), or full name; an optional description in brackets may follow: "BPD (Diametro biparietale):".
  const label='(?:(?<![A-Za-z/])(?:'+acronyms[field]+')(?:[ \\t]*[12](?=[ \\t:=]))?(?![A-Za-z/\\d])|'+names[field].map(ci).join('|')+')';
  const description='(?:[ \\t]*\\((?![ \\t]*[cCmM][ \\t]*[mM][ \\t]*\\))[^()\\n\\d]{0,40}\\))?[ \\t]*\\)?';
  const numeric='(\\d{1,3}(?:[.,]\\d{1,2})?)';
  const unit='([mM][ \\t]*[mM]|[cC][ \\t]*[mM])';
  const gap='[ \\t\\r\\n]*', sameLine='[ \\t]*';
  // Italian gestational age after a whole number: weeks+days ("29+5", "29 + 5") or a weeks range ("30-31 sett").
  const weeksDays='(?<=(?<![\\d.,])\\d{1,2})(?:[ \\t]*\\+[ \\t]*\\d|[ \\t]*[\\-–][ \\t]*\\d{1,2}[ \\t]*(?:[wW]|[wW][kK][sS]?|[sS][eE][tT]{1,2}\\w*|[wW][eE][eE][kK][sS]?)(?![A-Za-z]))';
  const patterns:Array<[RegExp,number,number]>=[
   [new RegExp(label+description+gap+'[:=]?'+gap+numeric+gap+unit+'(?![A-Za-z])','g'),1,2],
   [new RegExp(label+gap+'\\('+unit+'\\)'+gap+'[:=]?'+gap+numeric+'(?![\\d.,/]|[ \\t]*[%°/]|'+weeksDays+')','g'),2,1],
   // No unit: same line only, and never a percentile, weeks, days, grams, date or longer number.
   // Other letters are tolerated: handwritten notes after the value are often read as "X50" or "NEN".
   [new RegExp(label+description+sameLine+'[:=]?'+sameLine+numeric+'(?![\\d]|[.,]\\d|'+weeksDays+'|[ \\t]*(?:%|[°/]|(?:[wWsSgGdD]|[mMcCdD][mM]|[kK][gG]|[gG][rR]|[wW][kK][sS]?|[sS][eE][tT]{1,2}\\w*|[wW][eE][eE][kK][sS]?|[gG][gG]|[mM][lL]|[iI][nN](?:[cC][hH](?:[eE][sS])?)?)(?![A-Za-z])))','g'),1,0],
  ];
  const found:Array<{text:string;mm:number|null;inferred:boolean;rest:string}>=[];
  const explicitSpans:Array<[number,number]>=[];
  for(const [re,v,u] of patterns)for(const m of content.matchAll(re)){
   const start=m.index??0;
   if(/percentil|centil|pctl|z[- ]?score|ratio|rapporto/i.test(m[0]))continue;
   if(!u&&explicitSpans.some(([a,b])=>start>=a&&start<b))continue;
   if(u)explicitSpans.push([start,start+m[0].length]);
   const value=Number(m[v].replace(',','.'));
   const end=(m.index??0)+m[0].length;
   found.push(u?{text:m[0],mm:Math.round(value*(m[u].replace(/\s/g,'').toLowerCase()==='cm'?10:1)*100)/100,inferred:false,rest:content.slice(end)}
    :{text:m[0],mm:inferMm(field,value),inferred:true,rest:content.slice(end)});
  }
  sources[field]=found.map(m=>m.text.replace(/\s+/g,' ').trim()).join(' · ');
  const values=[...new Set(found.map(m=>m.mm))];
  if(values.length===1 && values[0]!==null && validReportValue(field,values[0])){
   draft[field]=values[0];
   if(found.every(m=>m.inferred))inferred.push(field);
   others[field]=[...new Set(found.flatMap(m=>trailingNumbers(m.rest)))];
  }else if(values.length)ambiguous.push(field);
 }
 // A value read in the wrong unit breaks biometric proportions: keep it for manual entry instead.
 for(const [a,b,lo,hi] of ratios){
  const x=draft[a],y=draft[b];
  if(x===''||y===''||(!inferred.includes(a)&&!inferred.includes(b)))continue;
  if(x/y<lo||x/y>hi)for(const f of [a,b])if(inferred.includes(f)){draft[f]='';others[f]=[];inferred.splice(inferred.indexOf(f),1);if(!ambiguous.includes(f))ambiguous.push(f);}
 }
 const dates=[...content.matchAll(/(?:data\s+(?:dell['’]\s*)?(?:esame|visita|ecografia)|exam\s+date|scan\s+date)\s*[:=]?\s*(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/gi)]
  .map(m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
 const unique=[...new Set(dates)];
 if(unique.length===1 && validReportDate(unique[0]))draft.date=unique[0];
 return {draft,sources,ambiguous,inferred,others};
}
export interface OcrWord { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }
/**
 * Rebuild visual rows from OCR word boxes, so a label and the value printed far to its right stay on one line
 * even when OCR emits the label column and the value column as separate blocks.
 */
export function rowsFromWords(words: OcrWord[]): string {
 const rows:Array<{center:number;height:number;words:OcrWord[]}>=[];
 const center=(w:OcrWord)=>(w.bbox.y0+w.bbox.y1)/2, height=(w:OcrWord)=>Math.max(1,w.bbox.y1-w.bbox.y0);
 for(const w of words.filter(w=>w.text.trim()).sort((a,b)=>center(a)-center(b))){
  // Tolerate slight page tilt: same row when centres differ by less than half the smaller text height.
  let best:(typeof rows)[number]|undefined;
  for(const r of rows){const d=Math.abs(r.center-center(w));if(d<Math.min(r.height,height(w))*0.5&&(!best||d<Math.abs(best.center-center(w))))best=r;}
  if(best){best.words.push(w);best.center=best.words.reduce((s,x)=>s+center(x),0)/best.words.length;best.height=best.words.reduce((s,x)=>s+height(x),0)/best.words.length;}
  else rows.push({center:center(w),height:height(w),words:[w]});
 }
 return rows.sort((a,b)=>a.center-b.center).map(r=>r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0).map(w=>w.text.trim()).join(' ')).join('\n');
}
