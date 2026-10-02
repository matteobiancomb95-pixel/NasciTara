import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNasciTara, emptyScan, type ScanState } from '../state/NasciTaraStore';
import { prepareReportFile } from '../lib/reportImageFile';
import { readReportImage } from '../lib/readReportImage';
import { parseReport, validReportDate, type ParsedReport, type ReportField } from '../lib/reportParser';
import { analyseUltrasound } from '../lib/analysis';
import { expectedMm, isMeasurePlausible, type MeasureKey } from '../lib/biometry';
import { formatGA, gaAtDate, toISO, todayUTC } from '../lib/gestationalAge';
import { trackUsage } from '../lib/usageTracking';
import { Check, DateInput, NumberInput, grams } from '../ui/kit';

export const MEASURES: Array<{ key: MeasureKey; field: ReportField; it: string; en: string }> = [
  { key: 'BPD', field: 'bpdMm', it: 'diam. biparietale', en: 'biparietal diam.' },
  { key: 'HC', field: 'hcMm', it: 'circ. cranica', en: 'head circ.' },
  { key: 'AC', field: 'acMm', it: 'circ. addome', en: 'abdominal circ.' },
  { key: 'FL', field: 'flMm', it: 'femore', en: 'femur' },
];

const ERRORS: Record<string, [string, string]> = {
  'file-size': ['La foto supera 12 MB. Esporta una copia più leggera o ritaglia le misure.', 'The image exceeds 12 MB. Export a smaller copy or crop the measurements.'],
  'file-read': ['Il file non è accessibile. Scaricalo prima sul dispositivo, poi selezionalo di nuovo.', 'The file is not accessible. Download it to your device first, then select it again.'],
  'file-format': ['Serve una foto JPG, PNG o WebP. Per un PDF fai uno screenshot della sezione con le misure.', 'Use a JPG, PNG or WebP photo. For a PDF, take a screenshot of the measurements.'],
  'image-decode': ['Il browser non riesce ad aprire questa immagine. Prova a esportarla di nuovo come JPG o PNG.', 'The browser cannot open this image. Try exporting it again as JPG or PNG.'],
  'too-large': ['La foto supera 24 megapixel. Ritaglia la sola sezione delle misure.', 'The image exceeds 24 megapixels. Crop the measurements section.'],
};

/**
 * Una ecografia con il suo referto: foto letta sul dispositivo (mai salvata) oppure
 * misure a mano. Le misure lette vanno sempre confrontate con il referto prima del salvataggio.
 */
export function ScanEditor({ initial, number, onSave, onDelete, compact }: {
  initial?: ScanState; number: number; onSave: (scan: ScanState) => void; onDelete?: () => void; compact?: boolean;
}) {
  const { state, ga, gaValid, lang } = useNasciTara();
  const today = toISO(todayUTC());
  const it = lang === 'it';
  const [draft, setDraft] = useState<ScanState>(() => initial ?? emptyScan());
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [over, setOver] = useState(false);
  const job = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const url = useRef('');
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    job.current++;
    controller.current?.abort();
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  const set = <K extends keyof ScanState>(k: K, v: ScanState[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setConfirmed(false);
  };

  async function read(file?: File) {
    job.current++;
    controller.current?.abort();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = '';
    setPreview('');
    setParsed(null);
    setError('');
    setConfirmed(false);
    if (!file) return;
    const current = job.current;
    controller.current = new AbortController();
    setBusy(true);
    setProgress(0);
    trackUsage('import_started');
    try {
      const prepared = await prepareReportFile(file);
      if (current !== job.current) return;
      url.current = URL.createObjectURL(prepared);
      setPreview(url.current);
      const recognized = await readReportImage(prepared, controller.current.signal, (n) => current === job.current && setProgress(n));
      if (current !== job.current) return;
      const result = parseReport(recognized);
      setText(recognized);
      setParsed(result);
      // Only recognised values replace what is in the form; a value typed by hand is never cleared.
      setDraft((d) => {
        const next: ScanState = { ...d, source: 'report', reportName: file.name.slice(0, 120) };
        for (const m of MEASURES) if (result.draft[m.field] !== '') next[m.field] = result.draft[m.field];
        if (result.draft.date && result.draft.date <= today) next.date = result.draft.date;
        return next;
      });
    } catch (cause) {
      if (current !== job.current) return;
      const code = cause instanceof Error ? cause.message : '';
      setError((ERRORS[code] ?? ['Lettura non riuscita. Riprova oppure inserisci i valori a mano.', 'Reading failed. Try again or enter the values manually.'])[it ? 0 : 1]);
      trackUsage('import_error');
    } finally {
      if (current === job.current) setBusy(false);
      if (camera.current) camera.current.value = '';
      if (gallery.current) gallery.current.value = '';
    }
  }

  const scanGa = gaValid ? gaAtDate(draft.date, state.referenceDate, ga) : NaN;
  const hasGa = Number.isFinite(scanGa);
  const measured = MEASURES.filter((m) => draft[m.field] !== '').length;
  const fromReport = parsed !== null;
  const dateOk = validReportDate(draft.date) && draft.date <= today;
  const canSave = dateOk && measured > 0 && !busy && (!fromReport || confirmed);
  const toInput = (s: ScanState) => ({
    id: s.id, date: s.date,
    hcMm: s.hcMm === '' ? null : Number(s.hcMm), acMm: s.acMm === '' ? null : Number(s.acMm),
    flMm: s.flMm === '' ? null : Number(s.flMm), bpdMm: s.bpdMm === '' ? null : Number(s.bpdMm),
  });
  const now = gaValid ? analyseUltrasound(toInput(draft), state.referenceDate, ga) : null;
  const before = initial && gaValid ? analyseUltrasound(toInput(initial), state.referenceDate, ga) : null;
  const g = (v: number) => grams(v, lang);

  const note = (field: ReportField) => {
    if (!parsed) return undefined;
    if (parsed.ambiguous.includes(field)) return it ? 'Valori discordanti sul referto: inseriscilo a mano.' : 'Conflicting values: enter it manually.';
    if (parsed.others[field].length && draft[field] === parsed.draft[field]) return (it ? 'Sulla riga c’è anche ' : 'The line also shows ') + parsed.others[field].join(', ');
    return undefined;
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void read(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={`nt-editor${compact ? ' nt-editor--compact' : ''}`}>
      <section className="nt-editor__report">
        {!compact ? <div className="nt-eyebrow nt-desk">{it ? `Ecografia ${number} · referto` : `Scan ${number} · report`}</div> : null}
        {preview || busy ? (
          <div className="nt-file">
            {preview ? <img className="nt-file__thumb" src={preview} alt={it ? 'Foto del referto' : 'Report photo'} /> : <span className="nt-file__thumb">{it ? 'referto' : 'report'}</span>}
            <div className="nt-row__body">
              <div className="nt-row__title">{draft.reportName ?? (it ? 'Foto del referto' : 'Report photo')}</div>
              {busy ? (
                <>
                  <div className="nt-row__meta">{it ? 'Lettura sul dispositivo…' : 'Reading on this device…'} {progress}%</div>
                  <div className="nt-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }} /></div>
                </>
              ) : (
                <div className="nt-row__meta nt-brandtext">{measured ? (it ? `✓ ${measured} misure lette` : `✓ ${measured} values read`) : it ? 'Nessuna misura riconosciuta' : 'No values recognised'}</div>
              )}
              <button type="button" className="nt-link nt-small" onClick={() => gallery.current?.click()} disabled={busy}>{it ? 'Sostituisci foto' : 'Replace photo'}</button>
            </div>
          </div>
        ) : (
          <div className={`nt-drop${over ? ' is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <span className="nt-drop__plus" aria-hidden="true">+</span>
            <h3>
              <span className="nt-mob">{it ? (compact ? 'Aggiungi foto del referto' : 'Fotografa il referto') : 'Photograph the report'}</span>
              <span className="nt-desk">{it ? 'Trascina qui la foto del referto' : 'Drop the report photo here'}</span>
            </h3>
            <p>{compact ? (it ? 'Verifichiamo le misure inserite a mano.' : 'We check the values entered by hand.') : it ? 'Leggiamo misure e data di questa ecografia. JPG, PNG o WebP.' : 'We read the values and date of this scan. JPG, PNG or WebP.'}</p>
            <div className="nt-drop__actions">
              <button type="button" className="nt-btn nt-btn--sm nt-mob" onClick={() => camera.current?.click()}>{it ? 'Scatta foto' : 'Take photo'}</button>
              <button type="button" className="nt-btn nt-btn--sm nt-btn--white nt-mob" onClick={() => gallery.current?.click()}>{it ? 'Galleria' : 'Gallery'}</button>
              <button type="button" className="nt-btn nt-btn--sm nt-desk" onClick={() => gallery.current?.click()}>{it ? 'Scegli file' : 'Choose file'}</button>
            </div>
          </div>
        )}
        <input hidden ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" aria-label={it ? 'Scegli foto referto' : 'Choose report photo'} onChange={(e) => void read(e.target.files?.[0])} />
        <input hidden ref={camera} type="file" accept="image/*" capture="environment" aria-label={it ? 'Scatta foto referto' : 'Take report photo'} onChange={(e) => void read(e.target.files?.[0])} />
        {error ? <p className="nt-error" role="alert">{error}</p> : null}
        {parsed && parsed.inferred.length ? (
          <p className="nt-note">{it ? 'Sul referto le misure non hanno l’unità: l’abbiamo dedotta dal valore (per esempio 7,7 cm → 77 mm).' : 'The report shows no units: we inferred them from the values (e.g. 7.7 cm → 77 mm).'}</p>
        ) : null}
        {text ? (
          <details className="nt-details">
            <summary>{it ? 'Testo letto dalla foto' : 'Text read from the photo'}</summary>
            <pre className="nt-ocr">{text}</pre>
          </details>
        ) : null}
      </section>

      <section className="nt-editor__form">
        <div className="nt-divider">{fromReport ? (it ? 'controlla i valori' : 'check the values') : it ? 'oppure inserisci a mano' : 'or enter by hand'}</div>
        <div className="nt-grid2">
          <DateInput label={it ? 'Data' : 'Date'} value={draft.date} max={today} onChange={(v) => set('date', v)} />
          <div className="nt-field">
            <span className="nt-field__label">{it ? 'Settimana' : 'Week'}</span>
            <span className="nt-input"><output className="nt-input__out">{hasGa ? `${formatGA(scanGa)} ${it ? 'sett.' : 'wk'}` : '—'}</output></span>
          </div>
          {MEASURES.map((m) => {
            const raw = draft[m.field];
            const expected = hasGa ? expectedMm(m.key, scanGa) : NaN;
            const odd = raw !== '' && Number.isFinite(expected) && !isMeasurePlausible(m.key, Number(raw), scanGa);
            const changed = !!initial && raw !== initial[m.field];
            const hint = note(m.field) ?? (Number.isFinite(expected) ? (odd ? (it ? `Controlla: atteso ~${Math.round(expected)}` : `Check: expected ~${Math.round(expected)}`) : undefined) : undefined);
            return (
              <NumberInput key={m.key} label={<>{m.key} <em>{it ? m.it : m.en}</em></>} unit="mm" min={1} max={500} step={0.1} value={raw}
                ring={changed} warn={odd} hint={hint} onChange={(v) => set(m.field, v)} />
            );
          })}
        </div>
        <details className="nt-details">
          <summary>{it ? 'Peso della mamma quel giorno (facoltativo)' : 'Mother’s weight that day (optional)'}</summary>
          <NumberInput label={it ? 'Peso mamma' : 'Mother’s weight'} unit="kg" min={1} max={300} step={0.1} value={draft.pesoMammaOsservazione} onChange={(v) => set('pesoMammaOsservazione', v)} />
        </details>
        {now ? (
          <p className="nt-estimate" role="status">
            {it ? 'Stima aggiornata: ' : 'Updated estimate: '}
            <b>{before && Math.round(before.efw) !== Math.round(now.efw) ? `${g(before.efw)} → ${g(now.efw)} g` : `${g(now.efw)} g`}</b> · {Math.round(now.pct)}° {it ? 'percentile' : 'percentile'}
          </p>
        ) : null}
        {!compact ? <p className="nt-note nt-desk-note">{it ? 'Trovi BPD, HC, AC e FL nella sezione “Biometria fetale” del referto (in italiano anche DBP, CC, CA, LF).' : 'You find BPD, HC, AC and FL in the “Fetal biometry” section of the report.'}</p> : null}
        {fromReport ? (
          <Check checked={confirmed} onChange={setConfirmed}>{it ? 'Ho confrontato data e valori con il referto.' : 'I checked the date and values against the report.'}</Check>
        ) : null}
        <div className="nt-editor__actions">
          {onDelete ? <button type="button" className="nt-btn nt-btn--danger" onClick={onDelete}>{it ? 'Elimina' : 'Delete'}</button> : null}
          <button type="button" className="nt-btn nt-btn--block" disabled={!canSave}
            onClick={() => {
              if (fromReport) trackUsage('import_confirmed');
              onSave({ ...draft, source: draft.source ?? 'manual' });
            }}>
            {initial ? (it ? 'Salva modifiche' : 'Save changes') : it ? 'Salva ecografia' : 'Save scan'}
          </button>
        </div>
        {!canSave && !busy ? (
          <p className="nt-note nt-center">
            {!dateOk ? (it ? 'Serve la data dell’ecografia.' : 'The scan date is required.') : measured === 0 ? (it ? 'Serve almeno una misura.' : 'At least one value is required.') : fromReport && !confirmed ? (it ? 'Conferma di aver controllato i valori.' : 'Confirm you checked the values.') : ''}
          </p>
        ) : null}
      </section>
    </div>
  );
}
