import { useEffect, useMemo, useRef, useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import { useMamma, type FnResult } from '../state/MammaStore';
import { formatGA } from '../lib/gestationalAge';
import {
  NOTE_TAGS, SLOTS, eventsOn, isoDate, monthGrid, romeToday, shortDate, upcoming, visitReminder,
  type NoteTag, type Slot, type Supplement, type Visit,
} from '../lib/mamma';
import { readLeafletImage } from '../lib/readLeafletImage';
import { dailyFor, searchSupport, type SupportItem } from '../lib/support';
import { Check, Field, ReminderBox, Segmented, Sheet, TextInput } from '../ui/kit';
import { SearchIcon } from '../ui/art';

type L = 'it' | 'en';
const useLang = () => {
  const { lang } = useNasciTara();
  return { lang, it: lang === 'it' };
};
function useWeek(): number | null {
  const { ga, gaValid } = useNasciTara();
  return gaValid ? Math.floor(ga) : null;
}

/* ============================ consenso AI ============================ */

/** Prima di usare l'AI: cosa inviamo, a chi, e un sì esplicito. */
function AiGate({ children, what }: { children: React.ReactNode; what: string }) {
  const { it } = useLang();
  const account = useAccount();
  const { online } = useMamma();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!online) return <p className="nt-note">{it ? 'Le funzioni AI sono disponibili con il tuo account.' : 'AI features are available with your account.'}</p>;
  if (account.profile?.aiConsentAt) return <>{children}</>;
  const accept = async () => {
    setBusy(true);
    await account.updateProfile({ ai_consent_at: new Date().toISOString() });
    setBusy(false);
  };
  return (
    <div className="nt-card nt-card--soft nt-stack6">
      <div className="nt-eyebrow">{it ? 'Prima di usare l’AI' : 'Before using AI'}</div>
      <p className="nt-body">
        {it
          ? <>Per {what} usiamo Claude, un’AI di Anthropic (Stati Uniti). Inviamo solo il testo necessario, mai nome o email, e non lo usano per addestrare i modelli. Le risposte sono informazioni, non diagnosi.</>
          : <>For {what} we use Claude, an AI by Anthropic (United States). We send only the text needed, never your name or email, and it is not used to train models. Answers are information, not a diagnosis.</>}
      </p>
      <Check checked={ok} onChange={setOk}>{it ? 'Acconsento all’uso dell’AI sui dati che inserisco. Posso ritirare il consenso da Area riservata.' : 'I agree to AI processing of the data I enter. I can withdraw consent in the private area.'}</Check>
      <button type="button" className="nt-btn nt-btn--sm" disabled={!ok || busy} onClick={() => void accept()}>{it ? 'Attiva l’AI' : 'Turn on AI'}</button>
    </div>
  );
}

function aiError(r: FnResult, it: boolean): string {
  switch (r.status) {
    case 'limited': return it ? 'Hai raggiunto il limite di oggi. Riprova domani.' : 'You reached today’s limit. Try again tomorrow.';
    case 'not_configured': return it ? 'L’AI non è ancora attiva su questo ambiente.' : 'AI is not enabled on this environment yet.';
    case 'consent_required': return it ? 'Serve il consenso all’AI.' : 'AI consent is required.';
    case 'offline': return it ? 'Disponibile con il tuo account.' : 'Available with your account.';
    default: return it ? 'L’AI non risponde in questo momento. Riprova tra poco.' : 'The AI is not answering right now. Try again shortly.';
  }
}

/* ============================ calendario ============================ */

/** Calendario (M13 / D08): visite e integratori, promemoria via email. */
export function CalendarTab() {
  const { lang, it } = useLang();
  const { visits, supplements, remove, error } = useMamma();
  const today = romeToday();
  const [ty, tm] = today.split('-').map(Number);
  const [month, setMonth] = useState({ y: ty, m: tm - 1 });
  const [day, setDay] = useState(today);
  const [sheet, setSheet] = useState<'visit' | 'supp' | null>(null);
  const loc = it ? 'it-IT' : 'en-GB';
  const cells = monthGrid(month.y, month.m);
  const monthLabel = new Date(Date.UTC(month.y, month.m, 15)).toLocaleDateString(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const wd = it ? ['L', 'M', 'M', 'G', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  const events = eventsOn(day, visits, supplements, lang);
  const perDay = eventsOn(today, [], supplements, lang).length;
  const next = upcoming(visits, today);
  const monthVisits = visits.filter((v) => v.visit_date.startsWith(isoDate(month.y, month.m, 1).slice(0, 7))).length;
  const dayTitle = (day === today ? (it ? 'Oggi · ' : 'Today · ') : '') + shortDate(day, lang, { weekday: 'short', day: 'numeric', month: 'long' });
  const tag = (k: 'visit' | 'ai' | 'doctor') => k === 'visit' ? (it ? 'Visita' : 'Visit') : k === 'ai' ? (it ? 'AI · foglietto' : 'AI · leaflet') : it ? 'Ginecologo' : 'Doctor';
  const del = (e: { kind: 'visit' | 'ai' | 'doctor'; id: string; title: string }) => {
    if (window.confirm(it ? `Eliminare “${e.title}” dal calendario? Si fermano anche i suoi promemoria.` : `Remove “${e.title}”? Its reminders stop too.`)) void remove(e.kind === 'visit' ? 'visits' : 'supplements', e.id);
  };
  const grid = (
    <div className="nt-card nt-cal">
      <div className="nt-spread">
        <button type="button" className="nt-round nt-round--sm" aria-label={it ? 'Mese precedente' : 'Previous month'} onClick={() => shift(-1)}>‹</button>
        <div className="nt-center">
          <div className="nt-cal__month">{monthLabel}</div>
          <div className="nt-note nt-desk">{it ? `${monthVisits} ${monthVisits === 1 ? 'visita' : 'visite'} · ${perDay} promemoria integratori al giorno` : `${monthVisits} visits · ${perDay} supplement reminders a day`}</div>
        </div>
        <button type="button" className="nt-round nt-round--sm" aria-label={it ? 'Mese successivo' : 'Next month'} onClick={() => shift(1)}>›</button>
      </div>
      <div className="nt-cal__grid" role="grid">
        {wd.map((w, i) => <div key={i} className="nt-cal__wd" aria-hidden="true">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = isoDate(month.y, month.m, d);
          const v = visits.find((x) => x.visit_date === iso);
          return (
            <button key={i} type="button" className={`nt-cal__day${iso === today ? ' is-today' : ''}${iso === day ? ' is-picked' : ''}`} aria-pressed={iso === day} aria-label={shortDate(iso, lang, { day: 'numeric', month: 'long' }) + (v ? ` · ${v.kind}` : '')} onClick={() => setDay(iso)}>
              <span>{d}</span>
              <i className={v ? 'is-on' : undefined} />
              {v ? <small className="nt-desk">{v.kind.split(' ')[0]} · {v.visit_time}</small> : null}
            </button>
          );
        })}
      </div>
      <div className="nt-cal__legend nt-mob"><span><i />{it ? 'Visita' : 'Visit'}</span><span>{it ? `Integratori: ${perDay} promemoria al giorno` : `Supplements: ${perDay} reminders a day`}</span></div>
    </div>
  );
  const side = (
    <div className="nt-stack">
      <h2 className="nt-h3">{dayTitle}</h2>
      <div className="nt-rows">
        {events.map((e, i) => (
          <div key={e.id + e.time + i} className="nt-row nt-ev">
            <span className="nt-ev__time">{e.time}</span>
            <span className="nt-row__body"><span className="nt-row__title">{e.title}</span>{e.sub ? <span className="nt-row__meta">{e.sub}</span> : null}</span>
            <span className={`nt-ev__tag nt-ev__tag--${e.kind}`}>{tag(e.kind)}</span>
            <button type="button" className="nt-link nt-muted-link" aria-label={it ? `Elimina ${e.title}` : `Delete ${e.title}`} onClick={() => del(e)}>✕</button>
          </div>
        ))}
        {!events.length ? <p className="nt-note">{it ? 'Niente in programma per questo giorno.' : 'Nothing planned for this day.'}</p> : null}
      </div>
      <h2 className="nt-h3">{it ? 'Prossime visite' : 'Upcoming visits'}</h2>
      <div className="nt-rows">
        {next.map((v) => {
          const r = visitReminder(v);
          return (
            <button key={v.id} type="button" className="nt-row nt-ev" onClick={() => { setDay(v.visit_date); const [y, m] = v.visit_date.split('-').map(Number); setMonth({ y, m: m - 1 }); }}>
              <span className="nt-ev__date"><small>{shortDate(v.visit_date, lang, { weekday: 'short' }).replace('.', '').toUpperCase()}</small><b>{Number(v.visit_date.slice(8))}</b></span>
              <span className="nt-row__body">
                <span className="nt-row__title">{v.kind} · {v.visit_time}</span>
                {v.place ? <span className="nt-row__meta">{v.place}</span> : null}
                {v.remind ? <span className="nt-ev__rem">{it ? `Email alle ${r.time} · 6 h prima` : `Email at ${r.time} · 6 h before`}</span> : null}
              </span>
            </button>
          );
        })}
        {!next.length ? <p className="nt-note">{it ? 'Nessuna visita in programma.' : 'No visits planned.'}</p> : null}
      </div>
      {error ? <p className="nt-error" role="alert">{error === 'limit' ? (it ? 'Hai raggiunto il numero massimo di elementi.' : 'You reached the maximum number of items.') : it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.'}</p> : null}
      <div className="nt-grid2">
        <button type="button" className="nt-btn" onClick={() => setSheet('visit')}>{it ? '+ Visita' : '+ Visit'}</button>
        <button type="button" className="nt-btn nt-btn--soft" onClick={() => setSheet('supp')}>{it ? '+ Integratore' : '+ Supplement'}</button>
      </div>
    </div>
  );
  return (
    <main className="nt-wrap nt-main nt-mamma">
      <div className="nt-mob">
        <h1 className="nt-title">{it ? 'Il tuo calendario' : 'Your calendar'}</h1>
        <p className="nt-sub">{it ? 'Visite e integratori, con promemoria via email' : 'Visits and supplements, with email reminders'}</p>
      </div>
      <div className="nt-cal__layout">
        {grid}
        {side}
      </div>
      <VisitSheet open={sheet === 'visit'} onClose={() => setSheet(null)} day={day < today ? today : day} />
      <SupplementSheet open={sheet === 'supp'} onClose={() => setSheet(null)} today={today} />
    </main>
  );
}

const VISIT_KINDS_IT = ['Visita ginecologica', 'Ecografia', 'Esami del sangue', 'Monitoraggio (tracciato)', 'Corso preparto', 'Visita ostetrica'];
const VISIT_KINDS_EN = ['Gynaecologist visit', 'Ultrasound scan', 'Blood tests', 'Fetal monitoring (CTG)', 'Antenatal class', 'Midwife visit'];

/** Nuova visita (M14). */
function VisitSheet({ open, onClose, day }: { open: boolean; onClose: () => void; day: string }) {
  const { lang, it } = useLang();
  const { user } = useAccount();
  const { add } = useMamma();
  const [v, setV] = useState({ kind: '', visit_date: day, visit_time: '10:30', place: '', notes: '', remind: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setV({ kind: it ? VISIT_KINDS_IT[0] : VISIT_KINDS_EN[0], visit_date: day, visit_time: '10:30', place: '', notes: '', remind: true });
  }, [open, day, it]);
  const r = visitReminder(v);
  const valid = v.kind.trim() && /^\d{4}-\d{2}-\d{2}$/.test(v.visit_date) && /^\d{2}:\d{2}$/.test(v.visit_time);
  const save = async () => {
    setBusy(true);
    const ok = await add('visits', { ...v, kind: v.kind.trim(), place: v.place.trim(), notes: v.notes.trim() } as Omit<Visit, 'id'>);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={it ? 'Nuova visita' : 'New visit'} subtitle={it ? 'La aggiungiamo al tuo calendario' : 'We add it to your calendar'} labelClose={it ? 'Chiudi' : 'Close'}>
      <TextInput label={it ? 'Tipo di visita' : 'Type of visit'} value={v.kind} maxLength={80} onChange={(kind) => setV({ ...v, kind })} />
      <div className="nt-chips">{(it ? VISIT_KINDS_IT : VISIT_KINDS_EN).map((k) => <button key={k} type="button" className={`nt-chip nt-chip--btn${v.kind === k ? ' nt-chip--on' : ''}`} onClick={() => setV({ ...v, kind: k })}>{k}</button>)}</div>
      <div className="nt-grid2">
        <TextInput label={it ? 'Data' : 'Date'} type="date" value={v.visit_date} onChange={(visit_date) => setV({ ...v, visit_date })} />
        <TextInput label={it ? 'Ora' : 'Time'} type="time" value={v.visit_time} onChange={(visit_time) => setV({ ...v, visit_time })} />
      </div>
      <TextInput label={it ? 'Dove' : 'Where'} value={v.place} maxLength={120} placeholder={it ? 'Studio, ospedale, consultorio…' : 'Practice, hospital…'} onChange={(place) => setV({ ...v, place })} />
      <TextInput label={it ? 'Note' : 'Notes'} value={v.notes} maxLength={500} placeholder={it ? 'Portare gli esami del sangue' : 'Bring blood test results'} onChange={(notes) => setV({ ...v, notes })} />
      <ReminderBox title={it ? 'Promemoria via email' : 'Email reminder'} when={(it ? '6 ore prima · ' : '6 hours before · ') + shortDate(r.date, lang, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + r.time}
        to={user?.email ? (it ? `a ${user.email}` : `to ${user.email}`) : ''} checked={v.remind} onChange={(remind) => setV({ ...v, remind })} label={it ? 'Promemoria via email' : 'Email reminder'} />
      <div className="nt-editor__actions">
        <button type="button" className="nt-btn nt-btn--soft" onClick={onClose}>{it ? 'Annulla' : 'Cancel'}</button>
        <button type="button" className="nt-btn nt-btn--block" disabled={!valid || busy} onClick={() => void save()}>{it ? 'Salva visita' : 'Save visit'}</button>
      </div>
    </Sheet>
  );
}

/** Nuovo integratore (M15): orari letti dal foglio illustrativo con l'AI, o scelti come dice il ginecologo. */
function SupplementSheet({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const { it } = useLang();
  const { user } = useAccount();
  const { add, call } = useMamma();
  const [mode, setMode] = useState<'ai' | 'doctor'>('ai');
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState<Slot[]>([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [remind, setRemind] = useState(true);
  const [quote, setQuote] = useState('');
  const [reading, setReading] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!open) return;
    setMode('ai'); setName(''); setDose(''); setTimes([]); setFrom(today); setTo(''); setRemind(true); setQuote(''); setMsg(''); setReading(null);
    return () => abort.current?.abort();
  }, [open, today]);
  const label: Record<Slot, string> = it ? { '08:00': 'Mattina', '12:00': 'Pranzo', '19:00': 'Cena', '22:00': 'Sera' } : { '08:00': 'Morning', '12:00': 'Lunch', '19:00': 'Dinner', '22:00': 'Evening' };
  const toggle = (t: Slot) => setTimes((x) => (x.includes(t) ? x.filter((y) => y !== t) : SLOTS.filter((s) => s === t || x.includes(s))));
  const readLeaflet = async (f: File) => {
    setMsg(''); setQuote(''); setReading(0);
    abort.current?.abort();
    const ctrl = (abort.current = new AbortController());
    try {
      const text = await readLeafletImage(f, ctrl.signal, setReading);
      setReading(100);
      const r = await call('ai', { mode: 'supplement', name, text, lang: it ? 'it' : 'en' });
      if (r.status === 'ok') {
        setQuote(String(r.quote ?? ''));
        setDose(String(r.dose ?? ''));
        setTimes((r.times as Slot[]) ?? []);
        if (!name && r.product) setName(String(r.product));
      } else if (r.status === 'not_found' || r.status === 'unreadable') {
        setMsg(it ? 'Non abbiamo trovato la posologia nella foto. Prova con una foto più vicina e dritta, o scegli gli orari a mano.' : 'We could not find the dosage. Try a closer, straighter photo, or pick the times yourself.');
      } else setMsg(aiError(r, it));
    } catch {
      if (!ctrl.signal.aborted) setMsg(it ? 'Non riusciamo a leggere questa foto. Usa JPG, PNG o HEIC.' : 'We cannot read this photo. Use JPG, PNG or HEIC.');
    } finally {
      setReading(null);
    }
  };
  const valid = name.trim() && times.length > 0 && from && (!to || to >= from);
  const save = async () => {
    setBusy(true);
    const ok = await add('supplements', { name: name.trim(), source: mode, dose: dose.trim(), times, start_date: from, end_date: to || null, leaflet_quote: mode === 'ai' ? quote : '', remind } as Omit<Supplement, 'id'>);
    setBusy(false);
    if (ok) onClose();
  };
  const slots = (
    <div className="nt-field">
      <span className="nt-field__label">{it ? 'Quando lo prendi?' : 'When do you take it?'} <em>{times.length} {it ? (times.length === 1 ? 'volta al giorno' : 'volte al giorno') : 'times a day'}</em></span>
      <div className="nt-slots">
        {SLOTS.map((t) => <button key={t} type="button" aria-pressed={times.includes(t)} onClick={() => toggle(t)}><span>{label[t]}</span><span>{t}</span></button>)}
      </div>
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title={it ? 'Nuovo integratore' : 'New supplement'} subtitle={it ? 'Ti ricordiamo quando prenderlo' : 'We remind you when to take it'} labelClose={it ? 'Chiudi' : 'Close'}>
      <TextInput label={it ? 'Nome dell’integratore' : 'Supplement name'} value={name} maxLength={80} placeholder={it ? 'Ferro + vitamina C' : 'Iron + vitamin C'} onChange={setName} />
      <Field label={it ? 'Come impostiamo l’assunzione?' : 'How do we set it up?'}>
        <Segmented label={it ? 'Modalità' : 'Mode'} variant="brand" value={mode} options={[['ai', it ? 'Suggerimento AI' : 'AI suggestion'], ['doctor', it ? 'Ginecologo' : 'Doctor']]} onChange={setMode} />
      </Field>
      {mode === 'ai' ? (
        <AiGate what={it ? 'leggere il foglio illustrativo' : 'reading the leaflet'}>
          <div className="nt-card nt-card--soft nt-stack6">
            {quote ? (
              <>
                <div className="nt-eyebrow">{it ? 'Letto dal foglio illustrativo' : 'Read from the leaflet'}</div>
                <p className="nt-quote">“{quote}”</p>
              </>
            ) : (
              <p className="nt-body">{it ? 'Fotografa la parte del foglio illustrativo con la posologia: leggiamo il testo sul tuo telefono e l’AI propone gli orari. La foto non viene salvata.' : 'Photograph the dosage section of the leaflet: we read the text on your phone and the AI suggests the times. The photo is not stored.'}</p>
            )}
            {reading !== null ? (
              <div className="nt-progress" aria-label={it ? 'Lettura in corso' : 'Reading'}><i style={{ width: `${reading}%` }} /></div>
            ) : (
              <button type="button" className="nt-btn nt-btn--sm nt-btn--white" onClick={() => file.current?.click()}>{quote ? (it ? 'Non è il tuo prodotto? Rifotografa' : 'Not your product? Retake') : it ? 'Fotografa il foglio illustrativo' : 'Photograph the leaflet'}</button>
            )}
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void readLeaflet(f); }} />
          </div>
          {msg ? <p className="nt-note" role="status">{msg}</p> : null}
        </AiGate>
      ) : null}
      {mode === 'doctor' || times.length > 0 ? slots : null}
      <TextInput label={<>{it ? 'Quanto' : 'Dose'} <em>{it ? 'facoltativo' : 'optional'}</em></>} value={dose} maxLength={60} placeholder={it ? '1 compressa' : '1 tablet'} onChange={setDose} />
      <div className="nt-grid2">
        <TextInput label={it ? 'Dal' : 'From'} type="date" value={from} onChange={setFrom} />
        <TextInput label={<>{it ? 'Al' : 'To'} <em>{it ? 'facoltativo' : 'optional'}</em></>} type="date" value={to} onChange={setTo} />
      </div>
      <ReminderBox title={it ? 'Promemoria via email' : 'Email reminder'} when={it ? 'All’orario di assunzione' : 'At each time you take it'}
        to={user?.email ? (it ? `a ${user.email}` : `to ${user.email}`) : ''} checked={remind} onChange={setRemind} label={it ? 'Promemoria via email' : 'Email reminder'} />
      <p className="nt-note">{it ? 'Il suggerimento AI legge il foglio illustrativo: vale sempre l’indicazione del tuo medico.' : 'The AI suggestion reads the leaflet: your doctor’s advice always comes first.'}</p>
      <button type="button" className="nt-btn nt-btn--block" disabled={!valid || busy} onClick={() => void save()}>{it ? 'Salva integratore' : 'Save supplement'}</button>
    </Sheet>
  );
}

/* ============================ notebook ============================ */

const TAG_NAME: Record<L, Record<NoteTag, string>> = {
  it: { movimenti: 'Movimenti', sintomi: 'Sintomi', umore: 'Umore', medico: 'Per il medico' },
  en: { movimenti: 'Movements', sintomi: 'Symptoms', umore: 'Mood', medico: 'For the doctor' },
};
type Insight = { title: string; body: string; question: string; urgent?: string; at: string; week: number | null };
const INSIGHT_KEY = 'nascitara.insight';

/** Notebook bebè (M16): note con settimana e tag, insight AI non diagnostici. */
export function NotebookTab({ onCalendar }: { onCalendar: () => void }) {
  const { lang, it } = useLang();
  const { ga, gaValid } = useNasciTara();
  const { user } = useAccount();
  const { notes, add, remove, call, error } = useMamma();
  const week = useWeek();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<NoteTag>('sintomi');
  const [busy, setBusy] = useState(false);
  const [insight, setInsight] = useState<Insight | null>(() => {
    try {
      const raw = localStorage.getItem(`${INSIGHT_KEY}.${user?.id ?? 'local'}`);
      return raw ? (JSON.parse(raw) as Insight) : null;
    } catch {
      return null;
    }
  });
  const [thinking, setThinking] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async () => {
    setBusy(true);
    const ok = await add('notes', { tag, body: text.trim(), ga_label: gaValid ? formatGA(ga) : '' });
    setBusy(false);
    if (ok) setText('');
  };
  const ask = async () => {
    setThinking(true);
    setMsg('');
    const r = await call('ai', {
      mode: 'insight', lang, week,
      notes: notes.slice(0, 30).map((n) => ({ date: n.created_at.slice(0, 10), ga: n.ga_label, tag: TAG_NAME.it[n.tag], text: n.body })),
    });
    setThinking(false);
    if (r.status !== 'ok') return setMsg(aiError(r, it));
    const next: Insight = { title: String(r.title), body: String(r.body), question: String(r.question ?? ''), urgent: String(r.urgent ?? 'none'), at: new Date().toISOString(), week };
    setInsight(next);
    try {
      localStorage.setItem(`${INSIGHT_KEY}.${user?.id ?? 'local'}`, JSON.stringify(next));
    } catch {
      /* Resta solo per questa visita. */
    }
  };
  const addQuestion = async () => {
    if (!insight?.question) return;
    if (await add('notes', { tag: 'medico', body: insight.question, ga_label: gaValid ? formatGA(ga) : '' })) setMsg(it ? 'Aggiunta alle note “Per il medico”.' : 'Added to “For the doctor” notes.');
  };
  return (
    <main className="nt-wrap nt-main nt-mamma nt-narrow">
      <div>
        <h1 className="nt-title">{it ? 'Notebook bebè' : 'Baby notebook'}</h1>
        <p className="nt-sub">{it ? 'Le tue note, lette insieme al tracker' : 'Your notes, read alongside the tracker'}</p>
      </div>
      <div className="nt-card nt-stack">
        <label className="nt-sr" htmlFor="nt-note-text">{it ? 'Nuova nota' : 'New note'}</label>
        <textarea id="nt-note-text" className="nt-textarea" rows={3} maxLength={1000} value={text} placeholder={it ? 'Scrivi una nota per oggi…' : 'Write a note for today…'} onChange={(e) => setText(e.target.value)} />
        <div className="nt-chips" role="group" aria-label={it ? 'Categoria' : 'Category'}>
          {NOTE_TAGS.map((t) => <button key={t} type="button" className={`nt-chip nt-chip--btn${tag === t ? ' nt-chip--on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(t)}>{TAG_NAME[lang][t]}</button>)}
        </div>
        <div className="nt-spread">
          <span className="nt-note">{gaValid ? `${formatGA(ga)} ${it ? 'sett.' : 'wk'}` : ''}</span>
          <button type="button" className="nt-btn nt-btn--sm" disabled={!text.trim() || busy} onClick={() => void save()}>{it ? 'Salva nota' : 'Save note'}</button>
        </div>
      </div>
      <div className="nt-card nt-card--pink nt-stack6 nt-insight">
        <span className="nt-bubble" style={{ right: -40, top: -40, width: 140, height: 140 }} />
        <div className="nt-eyebrow">{it ? `Insight AI${week ? ` · ${week}ª settimana` : ''}` : `AI insight${week ? ` · week ${week}` : ''}`}</div>
        <AiGate what={it ? 'leggere le tue note' : 'reading your notes'}>
          {insight ? (
            <>
              {insight.urgent && insight.urgent !== 'none' ? <UrgentBox kind={insight.urgent === 'crisis' ? 'crisis' : 'medical'} /> : null}
              <div className="nt-insight__title">{insight.title}</div>
              <p className="nt-body">{insight.body}</p>
              {insight.question ? <button type="button" className="nt-pill nt-pill--btn" onClick={() => void addQuestion()}>{it ? 'Aggiungi a “Per il medico” →' : 'Add to “For the doctor” →'}</button> : null}
            </>
          ) : (
            <p className="nt-body">{notes.length ? (it ? 'Leggiamo le tue note e ti proponiamo un suggerimento per questa settimana.' : 'We read your notes and suggest something for this week.') : it ? 'Scrivi qualche nota: poi l’AI le legge insieme e ti propone un suggerimento.' : 'Write a few notes: then the AI reads them together and suggests something.'}</p>
          )}
          <div className="nt-spread">
            <button type="button" className="nt-btn nt-btn--sm nt-btn--white" disabled={!notes.length || thinking} onClick={() => void ask()}>{thinking ? (it ? 'Sto leggendo…' : 'Reading…') : insight ? (it ? 'Aggiorna insight' : 'Refresh insight') : it ? 'Leggi le mie note' : 'Read my notes'}</button>
            {insight?.question ? <button type="button" className="nt-link" onClick={onCalendar}>{it ? 'Calendario →' : 'Calendar →'}</button> : null}
          </div>
          {msg ? <p className="nt-note" role="status">{msg}</p> : null}
        </AiGate>
      </div>
      <h2 className="nt-h3">{it ? 'Le tue note' : 'Your notes'}</h2>
      {error ? <p className="nt-error" role="alert">{it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.'}</p> : null}
      <div className="nt-rows">
        {notes.map((n) => (
          <div key={n.id} className="nt-card nt-notecard">
            <div className="nt-spread">
              <span className="nt-note">{shortDate(n.created_at, lang)}{n.ga_label ? ` · ${n.ga_label} ${it ? 'sett.' : 'wk'}` : ''}</span>
              <span className="nt-spread">
                <span className="nt-ev__tag nt-ev__tag--note">{TAG_NAME[lang][n.tag]}</span>
                <button type="button" className="nt-link nt-muted-link" aria-label={it ? 'Elimina nota' : 'Delete note'} onClick={() => { if (window.confirm(it ? 'Eliminare questa nota?' : 'Delete this note?')) void remove('notes', n.id); }}>✕</button>
              </span>
            </div>
            <p className="nt-body nt-prewrap">{n.body}</p>
          </div>
        ))}
        {!notes.length ? <p className="nt-note">{it ? 'Ancora nessuna nota.' : 'No notes yet.'}</p> : null}
      </div>
      <p className="nt-note">{it ? 'Gli insight non sono una diagnosi. Per sintomi nuovi o intensi contatta il tuo medico.' : 'Insights are not a diagnosis. For new or intense symptoms contact your doctor.'}</p>
    </main>
  );
}

/* ============================ supporto ============================ */

function UrgentBox({ kind }: { kind: 'medical' | 'crisis' }) {
  const { it } = useLang();
  return (
    <div className="nt-urgent" role="alert">
      <b>{kind === 'crisis' ? (it ? 'Non sei da sola' : 'You are not alone') : it ? 'Fallo valutare subito' : 'Get this checked now'}</b>
      <div className="nt-chips">
        <a className="nt-btn nt-btn--sm" href="tel:112">{it ? 'Chiama il 112' : 'Call 112'}</a>
        {kind === 'crisis' ? <a className="nt-btn nt-btn--sm nt-btn--white" href="tel:+390223272327">Telefono Amico</a> : null}
      </div>
    </div>
  );
}

type Msg = { role: 'user' | 'assistant'; content: string; sources?: Array<{ url: string; title: string }>; urgent?: string };

/** Supporto mamma (M17 / D09): contenuti del giorno da fonti ufficiali e assistente AI con fonti. */
export function SupportTab() {
  const { lang, it } = useLang();
  const { call } = useMamma();
  const week = useWeek() ?? 20;
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<'pregnancy' | 'feelings'>('pregnancy');
  const [chat, setChat] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const dayIndex = Math.floor(Date.now() / 864e5);
  const daily = useMemo(() => dailyFor(week, dayIndex), [week, dayIndex]);
  const found = searchSupport(query);
  const kindName = (k: SupportItem['kind']) => (it ? { formazione: 'Formazione', fisica: 'Attività fisica', ludica: 'Attività ludica', benessere: 'Benessere' } : { formazione: 'Learning', fisica: 'Exercise', ludica: 'Play', benessere: 'Wellbeing' })[k];
  const whoName = (w: SupportItem['who']) => (it ? { mamma: 'Mamma', papa: 'Papà', insieme: 'Insieme' } : { mamma: 'Mum', papa: 'Dad', insieme: 'Together' })[w];
  const suggestions = topic === 'pregnancy'
    ? (it ? ['Posso fare sport?', 'Cosa mettere in valigia?', 'Posso bere il caffè?'] : ['Can I exercise?', 'What to pack for hospital?', 'Can I drink coffee?'])
    : (it ? ['Sono spesso in ansia', 'Mi sento stanca e giù', 'Ho paura del parto'] : ['I often feel anxious', 'I feel tired and low', 'I’m scared of giving birth']);
  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...chat, { role: 'user', content: q }];
    setChat(next);
    setDraft('');
    setBusy(true);
    setMsg('');
    const r = await call('ai', { mode: 'assistant', topic, lang, week, messages: next.map(({ role, content }) => ({ role, content })) });
    setBusy(false);
    if (r.status !== 'ok') {
      setMsg(r.status === 'refused' ? (it ? 'Su questo non posso aiutarti: chiedi al tuo medico o al consultorio.' : 'I can’t help with this: ask your doctor.') : aiError(r, it));
      return;
    }
    setChat([...next, { role: 'assistant', content: String(r.answer), sources: (r.sources as Msg['sources']) ?? [], urgent: String(r.urgent ?? 'none') }]);
  };
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [chat, busy]);
  const item = (s: SupportItem) => (
    <a key={s.id} className="nt-supp" href={s.url} target="_blank" rel="noreferrer noopener">
      <span className="nt-supp__min">{s.minutes}'</span>
      <span className="nt-row__body">
        <span className="nt-eyebrow">{kindName(s.kind)}</span>
        <span className="nt-row__title">{it ? s.title : s.titleEn}</span>
        <span className="nt-row__meta">{s.source}{s.english && it ? ' · in inglese' : ''}</span>
      </span>
      <span className="nt-ev__tag nt-ev__tag--note">{whoName(s.who)}</span>
    </a>
  );
  const assistant = (
    <div className="nt-assist">
      <div className="nt-assist__head">
        <div className="nt-eyebrow">{it ? 'Assistente AI' : 'AI assistant'}</div>
        <Segmented label={it ? 'Argomento' : 'Topic'} size="sm" value={topic} options={[['pregnancy', it ? 'Gravidanza' : 'Pregnancy'], ['feelings', it ? 'Come ti senti' : 'How you feel']]} onChange={(t) => { setTopic(t); setChat([]); setMsg(''); }} />
      </div>
      <p className="nt-note">{topic === 'pregnancy'
        ? (it ? 'Risponde un’AI, non un’ostetrica: cerca sui siti di Ministero, ISS, EFSA, OMS e cita le fonti.' : 'An AI answers, not a midwife: it searches official health sites and cites them.')
        : (it ? 'Risponde un’AI, non una psicologa: ti ascolta, dà informazioni affidabili e ti indica a chi rivolgerti.' : 'An AI answers, not a psychologist: it listens, gives reliable information and tells you who to turn to.')}</p>
      <AiGate what={it ? 'rispondere alle tue domande' : 'answering your questions'}>
        <div className="nt-chat" ref={box} aria-live="polite">
          {chat.map((m, i) => (
            <div key={i} className={`nt-bubble-msg nt-bubble-msg--${m.role}`}>
              {m.urgent && m.urgent !== 'none' ? <UrgentBox kind={m.urgent === 'crisis' ? 'crisis' : 'medical'} /> : null}
              <p className="nt-prewrap">{m.content}</p>
              {m.sources?.length ? (
                <div className="nt-sources">{it ? 'Fonti: ' : 'Sources: '}{m.sources.map((s, k) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener">{k ? ', ' : ''}{s.title}</a>)}</div>
              ) : null}
            </div>
          ))}
          {busy ? <div className="nt-bubble-msg nt-bubble-msg--assistant nt-note">{it ? 'Sto cercando nelle fonti ufficiali…' : 'Searching official sources…'}</div> : null}
          {!chat.length && !busy ? <div className="nt-chips">{suggestions.map((s) => <button key={s} type="button" className="nt-chip nt-chip--btn" onClick={() => void send(s)}>{s}</button>)}</div> : null}
        </div>
        {msg ? <p className="nt-note" role="status">{msg}</p> : null}
        <form className="nt-ask" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <input value={draft} maxLength={1500} onChange={(e) => setDraft(e.target.value)} placeholder={it ? 'Chiedi all’assistente…' : 'Ask the assistant…'} aria-label={it ? 'Domanda' : 'Question'} />
          <button type="submit" aria-label={it ? 'Invia' : 'Send'} disabled={!draft.trim() || busy}>↑</button>
        </form>
      </AiGate>
    </div>
  );
  const people = (
    <div className="nt-stack6">
      <h2 className="nt-h3">{it ? 'Quando serve una persona' : 'When you need a person'}</h2>
      <div className="nt-grid2">
        <div className="nt-card nt-card--tint nt-stack4">
          <div className="nt-eyebrow">{it ? 'Clinico' : 'Clinical'}</div>
          <div className="nt-row__title">{it ? 'Ginecologo, ostetrica, consultorio' : 'Gynaecologist, midwife, clinic'}</div>
          <div className="nt-row__meta">{it ? 'Il consultorio familiare della tua ASL segue la gravidanza gratis.' : 'Your local family clinic (consultorio) follows pregnancy for free.'}</div>
          <button type="button" className="nt-link nt-link--sm" onClick={() => { setTopic('pregnancy'); setChat([]); }}>{it ? 'Prima chiedi all’AI →' : 'Ask the AI first →'}</button>
        </div>
        <div className="nt-card nt-card--tint nt-stack4">
          <div className="nt-eyebrow">{it ? 'Psicologico' : 'Emotional'}</div>
          <div className="nt-row__title">{it ? 'Come ti senti' : 'How you feel'}</div>
          <div className="nt-row__meta">{it ? 'Telefono Amico 02 2327 2327. Al consultorio c’è anche la psicologa.' : 'Telefono Amico 02 2327 2327. Clinics also have psychologists.'}</div>
          <button type="button" className="nt-link nt-link--sm" onClick={() => { setTopic('feelings'); setChat([]); }}>{it ? 'Parlane con l’AI →' : 'Talk to the AI →'}</button>
        </div>
      </div>
      <p className="nt-note">{it ? 'Per un’urgenza chiama il 112 o rivolgiti al pronto soccorso.' : 'In an emergency call 112 or go to the emergency department.'}</p>
    </div>
  );
  return (
    <main className="nt-wrap nt-main nt-mamma">
      <div className="nt-mob">
        <h1 className="nt-title">{it ? 'Supporto mamma' : 'Mum support'}</h1>
        <p className="nt-sub">{it ? `Ogni giorno, sulla tua ${week}ª settimana` : `Every day, for week ${week}`}</p>
      </div>
      <div className="nt-supp__layout">
        <div className="nt-stack">
          <div className="nt-input nt-search">
            <SearchIcon />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={it ? 'Cerca tra guide e articoli verificati' : 'Search verified guides'} aria-label={it ? 'Cerca' : 'Search'} />
          </div>
          {query.trim().length >= 2 ? (
            <div className="nt-card nt-stack6">
              <div className="nt-eyebrow">{it ? 'Risultati' : 'Results'}</div>
              {found.map(item)}
              {!found.length ? <p className="nt-note">{it ? 'Nessuna guida trovata. Prova a chiedere all’assistente.' : 'No guide found. Try asking the assistant.'}</p> : null}
            </div>
          ) : null}
          <div className="nt-card nt-stack6">
            <div className="nt-eyebrow">{it ? `Oggi per voi · ${week}ª settimana` : `Today for you · week ${week}`}</div>
            <p className="nt-note nt-desk">{it ? 'Formazione e benessere, per mamma e papà, da fonti ufficiali.' : 'Learning and wellbeing for mum and dad, from official sources.'}</p>
            {daily.map(item)}
          </div>
          <div className="nt-desk">{people}</div>
        </div>
        <div className="nt-stack">
          {assistant}
          <div className="nt-mob">{people}</div>
        </div>
      </div>
    </main>
  );
}
