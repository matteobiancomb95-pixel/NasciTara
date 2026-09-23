import { prepareReportFile } from '../lib/reportImageFile';
import { useEffect, useRef, useState } from 'react';
import { Checkbox, DateField, NumberField } from './Field';
import { useNasciTara } from '../state/NasciTaraStore';
import { EMPTY_REPORT, REPORT_FIELDS, parseReport, validReportDate, validReportValue, type ParsedReport, type ReportDraft, type ReportField } from '../lib/reportParser';
import { readReportImage } from '../lib/readReportImage';
import { trackUsage } from '../lib/usageTracking';

const LABELS:Record<ReportField,[string,string]>={hcMm:['HC / CC · Circonferenza cranica','HC · Head circumference'],acMm:['AC / CA · Circonferenza addominale','AC · Abdominal circumference'],flMm:['FL / LF · Lunghezza femore','FL · Femur length'],bpdMm:['BPD / DBP · Diametro biparietale','BPD · Biparietal diameter']};
export function ReportImport(){
 const {state,dispatch,lang}=useNasciTara();
 const it=lang==='it';
 const [recognizedText,setRecognizedText]=useState('');
 const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);
 const [preview,setPreview]=useState('');const [parsed,setParsed]=useState<ParsedReport|null>(null);
 const [draft,setDraft]=useState<ReportDraft>({...EMPTY_REPORT});const [confirmed,setConfirmed]=useState(false);
 const [error,setError]=useState('');const dateArea=useRef<HTMLDivElement>(null);const [done,setDone]=useState(false);
 const controller=useRef<AbortController|null>(null);const job=useRef(0);const url=useRef('');
 const cameraInput=useRef<HTMLInputElement>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 const clear=(resetInputs=true)=>{
  job.current++;controller.current?.abort();controller.current=null;
  if(url.current)URL.revokeObjectURL(url.current);url.current='';setPreview('');
  setRecognizedText('');setBusy(false);setParsed(null);setDraft({...EMPTY_REPORT});setConfirmed(false);setError('');
  if(resetInputs&&fileInput.current)fileInput.current.value='';
  if(resetInputs&&cameraInput.current)cameraInput.current.value='';
 };
 useEffect(()=>()=>{job.current++;controller.current?.abort();if(url.current)URL.revokeObjectURL(url.current);},[]);
 async function read(file?:File){
  clear(false);setDone(false);if(!file)return;
  const current=job.current;controller.current=new AbortController();setBusy(true);setProgress(0);trackUsage('import_started');
  try{
   const prepared=await prepareReportFile(file);
   if(current!==job.current)return;
   url.current=URL.createObjectURL(prepared);setPreview(url.current);
   const text=await readReportImage(prepared,controller.current!.signal,n=>{if(current===job.current)setProgress(n);});
   if(current!==job.current)return;
   setRecognizedText(text);const result=parseReport(text);setParsed(result);setDraft(result.draft);
  }catch(cause){
   if(current!==job.current)return;
   const code=cause instanceof Error?cause.message:'';
   if(code==='image-decode'){if(url.current)URL.revokeObjectURL(url.current);url.current='';setPreview('');}
   const messages:Record<string,[string,string]>={
    'file-size':['La foto supera 12 MB. Esporta una copia più leggera o ritaglia le misure.','The image exceeds 12 MB. Export a smaller copy or crop the measurements.'],
    'file-read':['Il file non è accessibile. Scaricalo prima sul computer, poi selezionalo di nuovo.','The file is not accessible. Download it to your computer first, then select it again.'],
    'file-format':['Il contenuto non è un PNG, JPG o WebP valido, anche se il nome termina con .png. Esporta una nuova copia o uno screenshot.','The file content is not a valid PNG, JPG or WebP. Export a new copy or screenshot.'],
    'image-decode':['Il browser non riesce ad aprire questa immagine. Prova a esportarla di nuovo come PNG o JPG.','The browser cannot open this image. Try exporting it again as PNG or JPG.'],
    'too-large':['La foto supera 24 megapixel. Ritaglia la sola sezione delle misure.','The image exceeds 24 megapixels. Crop the measurements section.'],
   };
   setError((messages[code]??['Lettura non riuscita. Controlla la connessione e riprova, oppure inserisci i valori a mano.','Reading failed. Check your connection and try again, or enter the values manually.'])[it?0:1]);trackUsage('import_error');
  }finally{if(current===job.current){setBusy(false);if(fileInput.current)fileInput.current.value='';if(cameraInput.current)cameraInput.current.value='';}}
 }
 // Everything the reader had to decide is spelled out next to the field, so the review is informed.
 const notes=(field:ReportField)=>{
  if(!parsed)return undefined;
  const list:string[]=[];
  if(!validReportValue(field,draft[field]))list.push(it?'Controlla valore e unità.':'Check value and unit.');
  if(parsed.ambiguous.includes(field))list.push(it?'Letti valori discordanti o non plausibili: inserisci il valore a mano.':'Conflicting or implausible values: enter the value manually.');
  if(parsed.others[field].length&&draft[field]===parsed.draft[field])list.push((it?'Sulla stessa riga c’è anche ':'The same line also shows ')+parsed.others[field].join(', ')+(it?' (forse una nota a mano): controlla quale valore usare.':' (maybe a handwritten note): check which value to use.'));
  return list.length?list.join(' '):undefined;
 };
 const dateValid=validReportDate(draft.date)&&draft.date<=state.referenceDate;
 const hasValues=REPORT_FIELDS.some(f=>draft[f]!=='');
 const valid=REPORT_FIELDS.every(f=>validReportValue(f,draft[f]));
 const apply=()=>{
  if(busy)return;
  if(!dateValid){dateArea.current?.scrollIntoView({block:'center',behavior:'smooth'});dateArea.current?.querySelector('input')?.focus({preventScroll:true});return;}
  if(!confirmed||!hasValues||!valid)return;
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
  <p className="fine">JPG, PNG, WebP · max 12 MB · {it?'Inquadra le sigle (HC o CC, AC o CA, FL o LF, BPD o DBP) con i relativi valori, con la pagina dritta e senza riflessi.':'Frame HC, AC, FL, BPD and their values, with the page straight and without glare.'}</p>
  {busy&&<div role="status"><p>{it?'Lettura in corso…':'Reading…'} {progress}%</p><progress max="100" value={progress} aria-label={it?'Lettura foto':'Reading photo'}/></div>}
  {error&&<p role="alert">{error}</p>}
  {preview&&<div className="report-review">
   <div><img src={preview} alt={it?'Foto del referto da confrontare con i valori':'Report photo to compare with the values'} className="report-photo"/></div>
   {parsed&&<div className="stack">
    {!REPORT_FIELDS.some(f=>parsed.draft[f]!=='')&&<p role="status">{it?'Nessuna misura riconosciuta. Prova un ritaglio più vicino dei numeri: l’immagine del bebè da sola non contiene le quattro misure necessarie. Puoi anche compilare i campi qui sotto.':'No measurements recognized. Try a closer crop of the numbers, or fill the fields below.'}</p>}
    <details><summary>{it?'Controlla il testo riconosciuto':'Review recognized text'}</summary><p>{it?'Il lettore non inventa misure. Se manca l’unità, propone una conversione in mm da verificare.':'The reader does not invent measurements. When a unit is missing, it proposes a conversion to mm for you to review.'}</p><pre className="ocr-text">{recognizedText}</pre></details>
    <h3 className="h2">{it?'Verifica i dati letti':'Review extracted values'}</h3>
    <p className="note">{it?'I campi vuoti non sono stati riconosciuti o contengono valori discordanti. Puoi correggere o completare tutto qui. La data deve essere quella della visita, non di nascita.':'Empty fields were not recognized or contain conflicting values. Correct or complete them here. Use the exam date, not the date of birth.'}</p>
    {parsed.inferred.length>0&&<p className="note report-inferred">{it?'Per alcune misure non è stata riconosciuta l’unità. NasciTara propone mm o cm in base al valore (per esempio 7,7 interpretato come cm → 77 mm). Verifica la conversione e le eventuali note a mano prima di confermare.':'Units were not recognized for some measurements. NasciTara proposes mm or cm based on the value (e.g. 7.7 interpreted as cm → 77 mm). Check the conversion and any handwritten notes before confirming.'}</p>}
    {REPORT_FIELDS.map(field=><NumberField key={field} label={LABELS[field][it?0:1]} unit="mm" step={0.1} value={draft[field]}
      hint={parsed.sources[field]?(it?'Testo letto: ':'Extracted text: ')+parsed.sources[field]:undefined}
      footnote={notes(field)}
      onChange={value=>{setDraft(d=>({...d,[field]:value}));setConfirmed(false);}}/>)}
    <div className="report-confirm" ref={dateArea}>
    <div className="report-confirm__title">{it?'Ultimo controllo prima di importare':'Final check before importing'}</div>
    <DateField label={it?'Data di questa ecografia':'Date of this scan'} value={draft.date} max={state.referenceDate} onChange={date=>{setDraft(d=>({...d,date}));setConfirmed(false);}}/>
    {!dateValid&&<p className="validation-hint" role="status">{!draft.date?(it?'Manca la data della visita: inseriscila qui per poter usare le misure.':'The exam date is missing: enter it here to use the measurements.'):!validReportDate(draft.date)?(it?'Inserisci una data valida.':'Enter a valid date.'):(it?'La visita è successiva alla data di riferimento della gravidanza ('+state.referenceDate+'). Controlla entrambe le date.':'This scan is later than the pregnancy reference date ('+state.referenceDate+'). Check both dates.')}</p>}
    <Checkbox checked={confirmed} onChange={setConfirmed}>{it?'Ho confrontato data, valori e unità con il referto.':'I checked the date, values and units against the report.'}</Checkbox>
    <button type="button" className="btn" disabled={!confirmed||!hasValues||!valid} onClick={apply}>{!dateValid?(it?'Completa la data della visita':'Enter the exam date'):(it?'Usa i dati verificati':'Use reviewed values')}</button>
    <p className="fine">{it?'Serve una data valida e almeno una misura. Le ecografie incomplete restano escluse dal calcolo. Una visita già compilata non viene sovrascritta.':'A valid date and at least one measurement are required. Incomplete scans stay excluded from calculations. Existing measurements are not overwritten.'}</p>
    </div>
   </div>}
  </div>}
  {preview&&<button type="button" className="btn-ghost" onClick={()=>clear()}>{it?'Annulla e rimuovi foto':'Cancel and remove photo'}</button>}
  {done&&<p role="status">{it?'Dati aggiunti alle ecografie. Puoi caricare un’altra foto.':'Values added to your scans. You can load another photo.'}</p>}
 </section>;
}
