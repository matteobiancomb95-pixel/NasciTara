/** Conservative parsing: only explicit measurement/unit pairs. Never infer a missing unit or date. */
export const REPORT_FIELDS = ['hcMm','acMm','flMm','bpdMm'] as const;
export type ReportField = typeof REPORT_FIELDS[number];
export type ReportDraft = Record<ReportField, number | ''> & { date: string };
export interface ParsedReport { draft: ReportDraft; sources: Record<ReportField,string>; ambiguous: ReportField[]; }
export const EMPTY_REPORT: ReportDraft = {date:'',hcMm:'',acMm:'',flMm:'',bpdMm:''};
const aliases: Record<ReportField,string> = {
 hcMm: 'HC|CC|circonferenza\\s+cranica|head\\s+circumference',
 acMm: 'AC|CA|circonferenza\\s+addominale|abdominal\\s+circumference',
 flMm: 'FL|LF|lunghezza\\s+(?:del\\s+)?femore|femur\\s+length',
 bpdMm: 'BPD|DBP|diametro\\s+biparietale|biparietal\\s+diameter',
};
export function validReportDate(value: string): boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');
 return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===value;
}
export function validReportValue(field: ReportField, value: number | ''): boolean {
 const ranges: Record<ReportField,[number,number]>={hcMm:[20,500],acMm:[20,500],flMm:[5,120],bpdMm:[10,150]};
 return value==='' || (Number.isFinite(value)&&value>=ranges[field][0]&&value<=ranges[field][1]);
}
export function parseReport(text: string): ParsedReport {
 const draft={...EMPTY_REPORT}; const sources={hcMm:'',acMm:'',flMm:'',bpdMm:''}; const ambiguous:ReportField[]=[];
 // Reject unbounded input and do not interpret document text as instructions.
 const content=text.slice(0,100000);
 for(const field of REPORT_FIELDS){
  // Accept line breaks, unit-before-value tables, optional measurement indexes, and cm OCR spacing.
  const label='\\b(?:'+aliases[field]+')(?:[ \\t]*[12](?=[ \\t:=]))?\\b';
  const numeric='(\\d{1,3}(?:[.,]\\d{1,2})?)';
  const unit='(m[ \\t]*m|c[ \\t]*m)';
  const gap='[ \\t\\r\\n]*';
  const patterns=[
   new RegExp(label+gap+'[:=]?'+gap+numeric+gap+unit+'\\b','gi'),
   new RegExp(label+gap+'\\('+unit+'\\)'+gap+'[:=]?'+gap+numeric+'\\b','gi'),
  ];
  const found: Array<{0:string;1:string;2:string}>=[];
  for(const m of content.matchAll(patterns[0]))found.push({0:m[0],1:m[1],2:m[2].replace(/\s/g,'')});
  for(const m of content.matchAll(patterns[1]))found.push({0:m[0],1:m[2],2:m[1].replace(/\s/g,'')});
  const values=[...new Set(found.map(m=>Math.round(Number(m[1].replace(',','.'))*(m[2].toLowerCase()==='cm'?10:1)*100)/100))];
  sources[field]=found.map(m=>m[0]).join(' · ');
  if(values.length===1 && validReportValue(field,values[0]))draft[field]=values[0];
  else if(values.length)ambiguous.push(field);
 }
 const dates=[...content.matchAll(/(?:data\s+(?:dell['’]\s*)?(?:esame|visita|ecografia)|exam\s+date|scan\s+date)\s*[:=]?\s*(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/gi)]
  .map(m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
 const unique=[...new Set(dates)];
 if(unique.length===1 && validReportDate(unique[0]))draft.date=unique[0];
 return {draft,sources,ambiguous};
}
