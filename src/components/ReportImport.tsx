import { useEffect, useRef, useState } from 'react';
import { Checkbox, DateField, NumberField } from './Field';
import { useNasciTara } from '../state/NasciTaraStore';
import { EMPTY_REPORT, REPORT_FIELDS, parseReport, validReportDate, validReportValue, type ParsedReport, type ReportDraft, type ReportField } from '../lib/reportParser';
import { readReportImage } from '../lib/readReportImage';
import { trackUsage } from '../lib/usageTracking';

const LABELS:Record<ReportField,[string,string]>={hcMm:['HC · Circonferenza cranica','HC · Head circumference'],acMm:['AC · Circonferenza addominale','AC · Abdominal circumference'],flMm:['FL · Lunghezza femore','FL · Femur length'],bpdMm:['BPD · Diametro biparietale','BPD · Biparietal diameter']};
export function ReportImport(){
 const {state,dispatch,lang}=useNasciTara();
 const it=lang==='it';
 const [recognizedText,setRecognizedText]=useState('');
 const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);
 const [preview,setPreview]=useState('');const [parsed,setParsed]=useState<ParsedReport|null>(null);
 const [draft,setDraft]=useState<ReportDraft>({...EMPTY_REPORT});const [confirmed,setConfirmed]=useState(false);
 const [error,setError]=useState('');const [done,setDone]=useState(false);
 const controller=useRef<AbortController|null>(null);const job=useRef(0);const url=useRef('');
 const cameraInput=useRef<HTMLInputElement>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 const clear=()=>{
  job.current++;controller.current?.abort();controller.current=null;
  if(url.current)URL.revokeObjectURL(url.current);url.current='';setPreview('');
  setRecognizedText('');setBusy(false);setParsed(null);setDraft({...EMPTY_REPORT});setConfirmed(false);setError('');
  if(fileInput.current)fileInput.current.value='';
  if(cameraInput.current)cameraInput.current.value='';
 };
 useEffect(()=>()=>{job.current++;controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current);},[]);
 async function read(file?:File){
  clear();setDone(false);if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){
   setError(it?'Scegli una foto JPG, PNG o WebP fino a 12 MB. Per HEIC o PDF usa uno screenshot della sezione delle misure.':'Choose JPG, PNG or WebP up to 12 MB. For HEIC or PDF use a screenshot of the measurements.');return;
  }
  const current=job.current;controller.current=new AbortController();
  url.current=URL.createObjectURL(file);setPreview(url.current);setBusy(true);setProgress(0);trackUsage('import_started');
  try{
   const text=await readReportImage(file,controller.current.signal,n=>{if(current===job.current)setProgress(n);});
   if(current!==job.current)return;
   setRecognizedText(text);const result=parseReport(text);setParsed(result);setDraft(result.draft);
  }catch{
   if(current!==job.current)return;
   setError(it?'Non riesco a leggere questa foto. Prova un ritaglio nitido, diritto e ben illuminato, oppure inserisci i dati a mano.':'Unable to read this photo. Try a clear, upright crop or enter the values manually.');trackUsage('import_error');
  }finally{if(current===job.current)setBusy(false);}
 }
 const dateValid=validReportDate(draft.date)&&draft.date<=state.referenceDate;
 const hasValues=REPORT_FIELDS.some(f=>draft[f]!=='');
 const valid=REPORT_FIELDS.every(f=>validReportValue(f,draft[f]));
 const apply=()=>{
  if(!confirmed||!dateValid||!hasValues||!valid||busy)return;
  dispatch({type:'importScan',scan:{...draft}});trackUsage('import_confirmed');clear();setDone(true);
 };
 return <section className="report-import stack" aria-label={it?'Importa referto':'Import report'}>
  <div><span className="fine">{it?'NUOVO · LETTURA FOTO · BETA':'NEW · PHOTO READING · BETA'}</span>
   <h2 className="h2">{it?'Parti dalla foto del referto':'Start with a photo of your report'}</h2>
   <p>{it?'La foto viene letta su questo dispositivo e non viene inviata né salvata sui nostri server. Usa un ritaglio della sezione con le misure, una visita per foto. Controlla ogni valore prima di confermare.':'Your photo is read on this device and is not uploaded or saved on our servers. Crop the measurements section, one visit per photo. Check every value before confirming.'}</p>
  </div>
  <div className="photo-actions">
    <button type="button" className="photo-button" disabled={busy} onClick={()=>fileInput.current?.click()}><span aria-hidden="true">＋</span>{it?'Scegli una foto':'Choose a photo'}</button>
    <button type="button" className="photo-button photo-button--camera" disabled={busy} onClick={()=>cameraInput.current?.click()}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h4l2-3h6l2 3h4v15H3z"/><circle cx="12" cy="13" r="4"/></svg>{it?'Scatta una foto':'Take a photo'}</button>
    <input hidden aria-label="Scegli foto referto" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void read(e.target.files?.[0])}/>
    <input hidden aria-label="Scatta foto referto" ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={e=>void read(e.target.files?.[0])}/>
  </div>
  <p className="fine">JPG, PNG, WebP · max 12 MB · {it?'Inquadra le sigle HC, AC, FL, BPD e i relativi valori. Se sono piccoli, ritaglia la foto prima di caricarla.':'Frame HC, AC, FL, BPD and their values. Crop small text before uploading.'}</p>
  {busy&&<div role="status"><p>{it?'Lettura in corso…':'Reading…'} {progress}%</p><progress max="100" value={progress} aria-label={it?'Lettura foto':'Reading photo'}/></div>}
  {error&&<p role="alert">{error}</p>}
  {preview&&<div className="report-review">
   <div><img src={preview} alt={it?'Foto del referto da confrontare con i valori':'Report photo to compare with the values'} className="report-photo"/></div>
   {parsed&&<div className="stack">
    {!REPORT_FIELDS.some(f=>parsed.draft[f]!=='')&&<p role="status">{it?'Nessuna misura riconosciuta. Prova un ritaglio più vicino dei numeri: l’immagine del bebè da sola non contiene le quattro misure necessarie. Puoi anche compilare i campi qui sotto.':'No measurements recognized. Try a closer crop of the numbers, or fill the fields below.'}</p>}
    <details><summary>{it?'Controlla il testo riconosciuto':'Review recognized text'}</summary><p>{it?'Il lettore non deduce valori o unità mancanti.':'Missing values or units are not inferred.'}</p><pre className="ocr-text">{recognizedText}</pre></details>
    <h3 className="h2">{it?'Verifica i dati letti':'Review extracted values'}</h3>
    <p className="note">{it?'I campi vuoti non sono stati riconosciuti con unità esplicite o contengono valori discordanti. Puoi correggere o completare tutto qui. La data deve essere quella della visita, non di nascita.':'Empty fields were not found with explicit units or contain conflicting values. Correct or complete them here. Use the exam date, not the date of birth.'}</p>
    <DateField label={it?'Data esame da confermare':'Exam date to confirm'} value={draft.date} max={state.referenceDate} onChange={date=>{setDraft(d=>({...d,date}));setConfirmed(false);}}/>
    {REPORT_FIELDS.map(field=><NumberField key={field} label={LABELS[field][it?0:1]} unit="mm" step={0.1} value={draft[field]}
      hint={parsed.sources[field]?(it?'Testo letto: ':'Extracted text: ')+parsed.sources[field]:undefined}
      footnote={!validReportValue(field,draft[field])?(it?'Controlla valore e unità.':'Check value and unit.'):undefined}
      onChange={value=>{setDraft(d=>({...d,[field]:value}));setConfirmed(false);}}/>)}
    <Checkbox checked={confirmed} onChange={setConfirmed}>{it?'Ho confrontato data, valori e unità con il referto.':'I checked the date, values and units against the report.'}</Checkbox>
    <button type="button" className="btn" disabled={!confirmed||!dateValid||!hasValues||!valid} onClick={apply}>{it?'Usa i dati verificati':'Use reviewed values'}</button>
    <p className="fine">{it?'Serve una data valida e almeno una misura. Le ecografie incomplete restano escluse dal calcolo. Una visita già compilata non viene sovrascritta.':'A valid date and at least one measurement are required. Incomplete scans stay excluded from calculations. Existing measurements are not overwritten.'}</p>
   </div>}
  </div>}
  {preview&&<button type="button" className="btn-ghost" onClick={clear}>{it?'Annulla e rimuovi foto':'Cancel and remove photo'}</button>}
  {done&&<p role="status">{it?'Dati aggiunti alle ecografie. Puoi caricare un’altra foto.':'Values added to your scans. You can load another photo.'}</p>}
 </section>;
}
