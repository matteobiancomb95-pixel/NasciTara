import { useMemo, useState } from 'react';
import { PAGE_ORDER, useNasciTara, type Page, type ScanState } from '../state/NasciTaraStore';
import { analyseUltrasound } from '../lib/analysis';
import { estimatedDueDate, formatGA, gaAtDate, MAX_GA_WEEKS, MIN_GA_WEEKS, toISO, todayUTC } from '../lib/gestationalAge';
import { buildCorredino } from '../lib/corredino';
import { HangerIcon } from '../ui/art';
import { exportResultPdf } from '../lib/exportPdf';
import { trackUsage } from '../lib/usageTracking';
import { localeOf } from '../i18n';
import { Logo, NumberInput, DateInput, Segmented, Sheet, grams } from '../ui/kit';
import { ScanEditor, MEASURES } from './ScanEditor';
import { ResultsDetails } from './ResultsDetails';

const FULL = { it: ['Inizio', 'Gravidanza', 'Ecografie', 'Risultati'], en: ['Start', 'Pregnancy', 'Scans', 'Results'] };
const SHORT = { it: ['Inizio', 'Gravid.', 'Ecogr.', 'Risultati'], en: ['Start', 'Pregn.', 'Scans', 'Results'] };

/** Il percorso: quattro tab, ciascuna raggiungibile dopo la precedente. */
export function Journey({ onExit, onFinish }: { onExit: () => void; onFinish: (target?: 'home' | 'corredino') => void }) {
  const { state, dispatch, lang } = useNasciTara();
  const it = lang === 'it';
  const current = PAGE_ORDER.indexOf(state.page);
  const reached = PAGE_ORDER.indexOf(state.reached);
  const goTo = (page: Page) => dispatch({ type: 'goTo', page });
  const steps = (short: boolean) => (
    <nav className="nt-steps" aria-label={it ? 'Percorso' : 'Journey'}>
      {PAGE_ORDER.map((page, n) => {
        const done = n < current;
        const label = done ? `✓ ${(short ? SHORT : FULL)[lang][n]}` : `${n + 1} ${FULL[lang][n]}`;
        return (
          <button key={page} type="button" className={done ? 'is-done' : undefined} aria-current={n === current ? 'step' : undefined} disabled={n > reached} onClick={() => goTo(page)}>
            {label}
          </button>
        );
      })}
    </nav>
  );
  return (
    <div className="nt-screen nt-journey">
      <header className="nt-top">
        <Logo />
        <span className="nt-desk">{steps(false)}</span>
        <div className="nt-top__side">
          <button type="button" className="nt-exit" onClick={onExit}>{it ? 'Esci' : 'Exit'}</button>
        </div>
      </header>
      <div className="nt-wrap nt-mob nt-steps-wrap">{steps(true)}</div>
      {state.page === 'landing' ? <StartTab onNext={() => goTo('pregnancy')} /> : null}
      {state.page === 'pregnancy' ? <PregnancyTab onBack={() => goTo('landing')} onNext={() => goTo('measurements')} /> : null}
      {state.page === 'measurements' ? <ScansTab onBack={() => goTo('pregnancy')} onNext={() => goTo('dashboard')} /> : null}
      {state.page === 'dashboard' ? <ResultsTab onFinish={onFinish} /> : null}
    </div>
  );
}

function StartTab({ onNext }: { onNext: () => void }) {
  const { lang } = useNasciTara();
  const it = lang === 'it';
  const howto = it
    ? [['Raccontaci la gravidanza', 'Settimana, sesso e, se vuoi, qualche dato dei genitori.'], ['Aggiungi le ecografie', 'Una alla volta, ognuna col suo referto.'], ['Scopri la stima', 'Peso e lunghezza, oggi e alla nascita.']]
    : [['Tell us about the pregnancy', 'Week, sex and, if you like, some parents’ details.'], ['Add your scans', 'One at a time, each with its report.'], ['See the estimate', 'Weight and length, today and at birth.']];
  return (
    <>
      <main className="nt-wrap nt-main nt-narrow">
        <h1 className="nt-title">{it ? 'Prima di cominciare' : 'Before you start'}</h1>
        <div className="nt-card nt-card--pink nt-stack6">
          <div className="nt-eyebrow">{it ? 'Tieni a portata di mano' : 'Keep at hand'}</div>
          <div className="nt-h3">{it ? 'I referti delle tue ecografie' : 'Your scan reports'}</div>
          <p className="nt-body">{it ? 'Basta una foto: leggiamo noi BPD, HC, AC e FL (anche DBP, CC, CA e LF). Puoi anche inserirli a mano.' : 'A photo is enough: we read BPD, HC, AC and FL. You can also type them in.'}</p>
        </div>
        <ol className="nt-card nt-howto">
          {howto.map(([t, d], i) => (
            <li key={t}>
              <span>{i + 1}</span>
              <div>
                <div className="nt-row__title">{t}</div>
                <div className="nt-row__meta">{d}</div>
              </div>
            </li>
          ))}
        </ol>
        <p className="nt-note">{it ? 'La stima usa la formula di Hadlock e non sostituisce il parere del tuo ginecologo.' : 'The estimate uses the Hadlock formula and does not replace your gynaecologist’s advice.'}</p>
        <div className="nt-actions">
          <button type="button" className="nt-btn nt-btn--block" onClick={onNext}>{it ? 'Avanti' : 'Next'}</button>
        </div>
      </main>
    </>
  );
}

function PregnancyTab({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { state, dispatch, ga, gaValid, lang } = useNasciTara();
  const it = lang === 'it';
  const [editing, setEditing] = useState(false);
  const p = state.parents;
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const parent = (field: keyof typeof p) => (v: number | '') => dispatch({ type: 'setParent', field, value: v });
  return (
    <main className="nt-wrap nt-main nt-narrow">
      <h1 className="nt-title">{it ? 'La tua gravidanza' : 'Your pregnancy'}</h1>
      <div className="nt-card nt-card--tint nt-profile">
        <div className="nt-row__body">
          <div className="nt-eyebrow">{it ? 'Dal tuo profilo' : 'From your profile'}</div>
          <div className="nt-profile__value">
            {gaValid
              ? `${Number(state.gaDays) ? `${formatGA(ga)} ${it ? 'sett.' : 'wk'}` : it ? `${Math.floor(ga)}ª settimana` : `Week ${Math.floor(ga)}`} · ${it ? 'parto' : 'due'} ~${due?.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
              : it ? 'Settimana da indicare' : 'Week to set'}
          </div>
        </div>
        <button type="button" className="nt-link" onClick={() => setEditing(true)}>{it ? 'Modifica' : 'Edit'}</button>
      </div>
      <div className="nt-field">
        <span className="nt-field__label">{it ? 'Sesso del bebe' : 'Baby’s sex'}</span>
        <Segmented label={it ? 'Sesso del bebe' : 'Baby’s sex'} value={state.babySex || 'unknown'}
          options={[['female', it ? 'Femmina' : 'Girl'], ['male', it ? 'Maschio' : 'Boy'], ['unknown', it ? 'Non so' : 'Not sure']]}
          onChange={(v) => dispatch({ type: 'setBabySex', value: v === 'unknown' ? '' : v })} />
      </div>
      <div className="nt-grid2">
        <NumberInput label={it ? 'Tua altezza' : 'Your height'} unit="cm" min={130} max={210} value={p.motherHeightCm} onChange={parent('motherHeightCm')} />
        <NumberInput label={it ? 'Peso pre-gravidanza' : 'Pre-pregnancy weight'} unit="kg" min={35} max={200} step={0.5} value={p.motherWeightKg} onChange={parent('motherWeightKg')} />
      </div>
      <details className="nt-details-block">
        <summary>{it ? 'Altri dati facoltativi' : 'More optional details'}</summary>
        <p className="nt-note">{it ? 'Servono alla curva personalizzata: più dati dai, più la curva somiglia a voi.' : 'They feed the customised curve: the more you add, the closer it is to you.'}</p>
        <div className="nt-grid2 nt-gap-top">
          <NumberInput label={it ? 'Tua età' : 'Your age'} unit={it ? 'anni' : 'yrs'} min={14} max={60} value={p.motherAgeYears} onChange={parent('motherAgeYears')} />
          <NumberInput label={it ? 'Peso oggi' : 'Weight today'} unit="kg" min={1} max={300} step={0.1} value={p.motherObservationWeightKg} onChange={parent('motherObservationWeightKg')} />
          <NumberInput label={it ? 'Altezza papà' : 'Father’s height'} unit="cm" min={130} max={230} value={p.fatherHeightCm} onChange={parent('fatherHeightCm')} />
          <NumberInput label={it ? 'Peso papà' : 'Father’s weight'} unit="kg" min={35} max={220} step={0.5} value={p.fatherWeightKg} onChange={parent('fatherWeightKg')} />
          <NumberInput label={it ? 'Età papà' : 'Father’s age'} unit={it ? 'anni' : 'yrs'} min={14} max={80} value={p.fatherAgeYears} onChange={parent('fatherAgeYears')} />
        </div>
      </details>
      <p className="nt-note">{it ? 'Il sesso non cambia il calcolo del peso: la stima usa solo le misure ecografiche.' : 'Sex does not change the weight calculation: the estimate uses scan measurements only.'}</p>
      <div className="nt-actions">
        <button type="button" className="nt-round" aria-label={it ? 'Indietro' : 'Back'} onClick={onBack}>←</button>
        <button type="button" className="nt-btn nt-btn--block" disabled={!gaValid} onClick={onNext}>{it ? 'Avanti' : 'Next'}</button>
      </div>
      <Sheet open={editing} onClose={() => setEditing(false)} title={it ? 'Epoca di gravidanza' : 'Gestational age'} subtitle={it ? 'Come sul referto più recente o secondo il ginecologo.' : 'As on your latest report or per your gynaecologist.'} labelClose={it ? 'Chiudi' : 'Close'}>
        <div className="nt-grid2">
          <NumberInput label={it ? 'Settimane' : 'Weeks'} unit={it ? 'sett' : 'wk'} min={MIN_GA_WEEKS} max={MAX_GA_WEEKS} value={state.gaWeeks} onChange={(v) => dispatch({ type: 'setGa', field: 'gaWeeks', value: v })} />
          <NumberInput label={it ? 'Giorni' : 'Days'} unit={it ? 'gg' : 'd'} min={0} max={6} value={state.gaDays} onChange={(v) => dispatch({ type: 'setGa', field: 'gaDays', value: v })} />
        </div>
        <DateInput label={it ? 'Alla data del' : 'On the date'} hint={it ? 'Di solito oggi. Le date delle ecografie vengono riportate su questa scala.' : 'Usually today. Scan dates are placed on this scale.'} value={state.referenceDate} max={toISO(todayUTC())} onChange={(v) => dispatch({ type: 'setReferenceDate', value: v })} />
        {!gaValid ? <p className="nt-error">{it ? `Indica un’epoca tra ${MIN_GA_WEEKS} e ${MAX_GA_WEEKS} settimane.` : `Enter an age between ${MIN_GA_WEEKS} and ${MAX_GA_WEEKS} weeks.`}</p> : null}
        <button type="button" className="nt-btn nt-btn--block" disabled={!gaValid} onClick={() => setEditing(false)}>{it ? 'Fatto' : 'Done'}</button>
      </Sheet>
    </main>
  );
}

export function scanLabel(scan: ScanState, stateRef: string, ga: number, gaValid: boolean, lang: 'it' | 'en'): string {
  const it = lang === 'it';
  const g = gaValid ? gaAtDate(scan.date, stateRef, ga) : NaN;
  const d = scan.date ? new Date(scan.date + 'T12:00:00Z').toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  if (!scan.date) return it ? 'Data da inserire' : 'Date missing';
  return Number.isFinite(g) ? `${formatGA(g)} ${it ? 'sett.' : 'wk'} · ${d}` : d;
}

export function useScanRows() {
  const { state, ga, gaValid, lang } = useNasciTara();
  return useMemo(() => {
    const it = lang === 'it';
    return state.scans
      .filter((s) => !(s.date === '' && MEASURES.every((m) => s[m.field] === '') && s.pesoMammaOsservazione === ''))
      .map((scan) => {
        const measured = MEASURES.filter((m) => scan[m.field] !== '').length;
        const r = gaValid ? analyseUltrasound({ id: scan.id, date: scan.date, hcMm: scan.hcMm === '' ? null : Number(scan.hcMm), acMm: scan.acMm === '' ? null : Number(scan.acMm), flMm: scan.flMm === '' ? null : Number(scan.flMm), bpdMm: scan.bpdMm === '' ? null : Number(scan.bpdMm) }, state.referenceDate, ga) : null;
        const src = scan.source === 'report' ? (it ? 'Da referto' : 'From report') : it ? 'Inserita a mano' : 'Entered by hand';
        return { scan, measured, result: r, label: scanLabel(scan, state.referenceDate, ga, gaValid, lang), src, ga: gaValid ? gaAtDate(scan.date, state.referenceDate, ga) : NaN };
      })
      .sort((a, b) => (a.scan.date || '9').localeCompare(b.scan.date || '9'));
  }, [state.scans, state.referenceDate, ga, gaValid, lang]);
}

function ScansTab({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { dispatch, completeScans, lang } = useNasciTara();
  const it = lang === 'it';
  const rows = useScanRows();
  const [open, setOpen] = useState<string | null>(rows.length ? rows[rows.length - 1].scan.id : null);
  /** Ecografia nell'editor: id esistente, 'new', o nessuna (su telefono si torna all'elenco). */
  // Desktop keeps the editor always visible, ready for a new scan (D03); on a phone the list comes first (M06).
  const desktop = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;
  const [editing, setEditing] = useState<string | null>(rows.length && !desktop ? null : 'new');
  // A fresh editor after each save, even when the key stays 'new'.
  const [round, setRound] = useState(0);
  const editingRow = rows.find((r) => r.scan.id === editing);
  const number = editingRow ? rows.indexOf(editingRow) + 1 : rows.length + 1;
  const save = (scan: ScanState) => {
    dispatch({ type: 'saveScan', scan });
    setOpen(scan.id);
    setRound((n) => n + 1);
    setEditing(desktop ? 'new' : null);
  };
  const remove = (id: string) => {
    dispatch({ type: 'removeScan', id });
    setRound((n) => n + 1);
    setEditing(desktop ? 'new' : null);
  };
  const g = (v: number) => grams(v, lang);
  const list = (
    <div className="nt-rows">
      {rows.map((r, i) => {
        const isOpen = open === r.scan.id;
        const meta = `${r.src}${r.result ? ` · ${g(r.result.efw)} g` : ` · ${r.measured} ${it ? 'misure' : 'values'}`}`;
        return (
          <div key={r.scan.id} className={isOpen ? 'nt-card--soft nt-scan is-open' : 'nt-scan'}>
            <button type="button" className={isOpen ? 'nt-scan__head' : 'nt-row'} aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : r.scan.id); if (window.matchMedia('(min-width: 1024px)').matches) setEditing(r.scan.id); }}>
              <span className={`nt-badge${isOpen || editing === r.scan.id ? ' nt-badge--on' : ''}`}>{i + 1}</span>
              <span className="nt-row__body">
                <span className="nt-row__title">{r.label}</span>
                <span className="nt-row__meta">{isOpen && r.scan.source === 'report' ? (it ? 'Misure lette dal referto' : 'Values read from the report') : meta}</span>
              </span>
              <span className="nt-chev" aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
            </button>
            {isOpen ? (
              <div className="nt-scan__body">
                {r.scan.source === 'report' ? (
                  <div className="nt-file">
                    <span className="nt-file__thumb">{it ? 'referto' : 'report'}</span>
                    <div className="nt-row__body">
                      <div className="nt-row__title">{r.scan.reportName ?? (it ? 'Referto' : 'Report')}</div>
                      <div className="nt-row__meta nt-brandtext">✓ {r.measured} {it ? 'misure lette' : 'values read'}</div>
                      <div className="nt-row__meta">{it ? 'La foto non viene salvata.' : 'The photo is not saved.'}</div>
                    </div>
                  </div>
                ) : null}
                <div className="nt-measures">
                  {MEASURES.map((m) => (
                    <div key={m.key} className="nt-measure"><b>{m.key}</b><span>{r.scan[m.field] === '' ? '—' : r.scan[m.field]}<small> mm</small></span></div>
                  ))}
                </div>
                <div className="nt-scan__actions">
                  <button type="button" className="nt-link" onClick={() => setEditing(r.scan.id)}>{it ? 'Modifica' : 'Edit'}</button>
                  {r.result ? <span className="nt-note">{g(r.result.efw)} g · {Math.round(r.result.pct)}° {it ? 'percentile' : 'percentile'}</span> : <span className="nt-note">{it ? 'Servono tutte e 4 le misure per la stima.' : 'All 4 values are needed for the estimate.'}</span>}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {editing === 'new' && rows.length ? (
        <div className="nt-row nt-row--active nt-desk">
          <span className="nt-badge nt-badge--on">{rows.length + 1}</span>
          <span className="nt-row__body"><span className="nt-row__title">{it ? 'Nuova ecografia' : 'New scan'}</span><span className="nt-row__meta">{it ? 'In compilazione' : 'In progress'}</span></span>
        </div>
      ) : null}
      <button type="button" className="nt-dashed" onClick={() => { setEditing('new'); setOpen(null); }}>{it ? '+ Aggiungi ecografia' : '+ Add scan'}</button>
    </div>
  );
  const editor = editing ? (
    <ScanEditor key={`${editing}:${round}`} initial={editingRow?.scan} number={number} onSave={save} onDelete={editingRow ? () => remove(editingRow.scan.id) : undefined} />
  ) : null;
  const nav = (
    <div className="nt-actions">
      <button type="button" className="nt-round" aria-label={it ? 'Indietro' : 'Back'} onClick={onBack}>←</button>
      <button type="button" className="nt-btn nt-btn--block" disabled={completeScans < 1} onClick={onNext}>{it ? 'Calcola stima' : 'Get estimate'}</button>
    </div>
  );
  return (
    <main className="nt-wrap nt-main nt-scans">
      {/* Un solo editor: su telefono elenco oppure editor (M06 / M06b), su desktop affiancati (D03). */}
      <div className={`nt-scans__grid${editing ? ' is-editing' : ''}`}>
        <aside className="nt-scans__list nt-stack">
          <div className="nt-spread"><h1 className="nt-title">{it ? 'Le tue ecografie' : 'Your scans'}</h1><span className="nt-note nt-mob">{rows.length}</span></div>
          <p className="nt-sub nt-desk">{it ? 'Ogni ecografia ha il suo referto.' : 'Each scan has its own report.'}</p>
          {list}
          <div className="nt-scans__nav">{nav}</div>
          {completeScans < 1 ? <p className="nt-note nt-center">{it ? 'Serve almeno un’ecografia con data e 4 misure.' : 'At least one scan with date and 4 values is needed.'}</p> : null}
        </aside>
        <section className="nt-scans__panel">
          {editing ? (
            <>
              <div className="nt-editor-head nt-mob">
                <button type="button" className="nt-round nt-round--sm" aria-label={it ? 'Torna all’elenco' : 'Back to list'} onClick={() => setEditing(null)}>←</button>
                <h1 className="nt-h3">{it ? `Ecografia ${number}` : `Scan ${number}`}</h1>
              </div>
              {editor}
            </>
          ) : (
            <div className="nt-empty-panel"><p className="nt-lead">{it ? 'Scegli un’ecografia dall’elenco o aggiungine una nuova.' : 'Pick a scan from the list or add a new one.'}</p></div>
          )}
        </section>
      </div>
    </main>
  );
}

function ResultsTab({ onFinish }: { onFinish: (target?: 'home' | 'corredino') => void }) {
  const { analysis, state, lang, dispatch } = useNasciTara();
  const it = lang === 'it';
  const [pdf, setPdf] = useState<'idle' | 'working' | 'error'>('idle');
  if (!analysis) {
    return (
      <main className="nt-wrap nt-main nt-narrow">
        <h1 className="nt-title">{it ? 'Manca ancora un’ecografia completa' : 'A complete scan is still missing'}</h1>
        <p className="nt-lead">{it ? 'Servono data e le 4 misure di almeno un’ecografia.' : 'The date and 4 values of at least one scan are needed.'}</p>
        <button type="button" className="nt-btn" onClick={() => dispatch({ type: 'goTo', page: 'measurements' })}>{it ? 'Torna alle ecografie' : 'Back to scans'}</button>
      </main>
    );
  }
  const now = analysis.now;
  const cor = buildCorredino({
    birthLengthCm: analysis.lengthTerm.cm, dueDate: estimatedDueDate(state.referenceDate, analysis.ga) ?? new Date(),
    washes: state.corredino?.washes ?? 3, dryer: state.corredino?.dryer ?? false, bought: state.corredino?.bought ?? {}, lang,
  });
  const sizes = cor.sizes.join(' · ');
  const explore = (
    <button type="button" className="nt-btn nt-btn--block" onClick={() => onFinish('corredino')}>
      <HangerIcon />
      {it ? 'Esplora il suo primo guardaroba' : 'Explore their first wardrobe'}
    </button>
  );
  const download = async () => {
    setPdf('working');
    try {
      await exportResultPdf({ analysis, lang, now: new Date() });
      trackUsage('pdf_download');
      setPdf('idle');
    } catch {
      trackUsage('pdf_error');
      setPdf('error');
    }
  };
  const babyTitle = it ? (state.babySex === 'female' ? 'Ecco la tua bambina' : state.babySex === 'male' ? 'Ecco il tuo bambino' : 'Ecco il tuo bebe') : 'Meet your baby';
  const pct = Math.max(1, Math.min(99, now.pct));
  return (
    <main className="nt-wrap nt-main nt-results">
      <h1 className="nt-title">{babyTitle} <small>· {formatGA(analysis.ga)}<span className="nt-desk-inline">{it ? ' settimane' : ' weeks'}</span></small></h1>
      <div className="nt-results__grid">
        <div className="nt-stack">
          <div className="nt-card nt-hero-card">
            <div className="nt-eyebrow">{it ? 'Peso stimato oggi' : 'Estimated weight today'}</div>
            <div className="nt-big">{grams(now.efw, lang)}<small> g</small></div>
            <div className="nt-pct" aria-hidden="true"><span style={{ left: `${pct}%` }} /></div>
            <div className="nt-pct-legend"><span>10°</span><b><i>{Math.round(now.pct)}°</i> percentile<span className="nt-desk-inline"> · {now.pct < 10 ? (it ? 'sotto la media' : 'below average') : now.pct > 90 ? (it ? 'sopra la media' : 'above average') : it ? 'nella norma' : 'within normal range'}</span></b><span>90°</span></div>
          </div>
          <div className="nt-grid2 nt-results__pair">
            <div className="nt-card nt-card--tint"><div className="nt-eyebrow">{it ? 'Peso alla nascita' : 'Weight at birth'}</div><div className="nt-mid">~{grams(Math.round(analysis.term.efw / 10) * 10, lang)}<small> g</small></div></div>
            <div className="nt-card nt-card--tint"><div className="nt-eyebrow">{it ? 'Lunghezza alla nascita' : 'Length at birth'}</div><div className="nt-mid">~{Math.round(analysis.lengthTerm.cm)}<small> cm</small></div></div>
          </div>
        </div>
        <div className="nt-card nt-card--pink nt-unlock">
          <span className="nt-bubble nt-desk" style={{ right: -90, top: -90, width: 320, height: 320, opacity: 0.5 }} />
          <div className="nt-unlock__tag nt-desk"><span className="nt-tag">{it ? 'Sbloccato' : 'Unlocked'}</span><span className="nt-eyebrow">Corredino AI</span></div>
          <div className="nt-eyebrow nt-mob">{it ? 'Corredino AI · Sbloccato' : 'Corredino AI · Unlocked'}</div>
          <div className="nt-unlock__title">
            <span className="nt-mob">{it ? `Il suo guardaroba in taglia ${sizes}` : `Their wardrobe in sizes ${sizes}`}</span>
            <span className="nt-desk">{it ? 'Il suo primo guardaroba, già in taglia.' : 'Their first wardrobe, already sized.'}</span>
          </div>
          <p className="nt-body nt-desk">{it ? 'Taglie, quantità e tessuti per i primi 3 mesi, sulla stagione del parto.' : 'Sizes, quantities and fabrics for the first 3 months, based on the birth season.'}</p>
          <div className="nt-desk nt-unlock__sizes">
            {cor.columns.map((col) => (
              <div key={col.id} className="nt-card nt-card--white"><div className="nt-eyebrow">{col.infoTop.split(' · ')[0]}</div><div className="nt-mid">{col.tab}</div><div className="nt-row__meta">{col.seasonLabel}</div></div>
            ))}
          </div>
          <div className="nt-desk">{explore}</div>
        </div>
      </div>
      <ResultsDetails />
      <div className="nt-actions nt-actions--stack nt-mob">
        {explore}
        <button type="button" className="nt-link" onClick={() => onFinish('home')}>{it ? 'Vai alla tua area' : 'Go to your area'}</button>
        <button type="button" className="nt-link" onClick={() => void download()} disabled={pdf === 'working'}>{pdf === 'working' ? (it ? 'Preparo il PDF…' : 'Preparing PDF…') : it ? 'Scarica il risultato in PDF' : 'Download the result as PDF'}</button>
      </div>
      <div className="nt-desk nt-center">
        <button type="button" className="nt-link" onClick={() => void download()} disabled={pdf === 'working'}>{pdf === 'working' ? (it ? 'Preparo il PDF…' : 'Preparing PDF…') : it ? 'Scarica il risultato in PDF' : 'Download the result as PDF'}</button>
      </div>
      {pdf === 'error' ? <p className="nt-error" role="alert">{it ? 'PDF non generato. Riprova.' : 'PDF not generated. Try again.'}</p> : null}
    </main>
  );
}
