import { DoctorContacts } from '../components/DoctorContacts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import { useMamma, type FnResult } from '../state/MammaStore';
import { formatGA } from '../lib/gestationalAge';
import {
  NOTE_TAGS, SLOTS, eventsOn, isoDate, monthGrid, romeToday, shortDate, takesOn, upcoming, visitReminder, romeInstant,
  type NoteTag, type Slot, type Supplement, type Visit,
} from '../lib/mamma';
import { readLeafletImage } from '../lib/readLeafletImage';
import { dailyFor, searchSupport, sourceLogo, type SupportItem } from '../lib/support';
import { Field, ReminderBox, Segmented, Sheet, TextInput } from '../ui/kit';
import { Icon, IconBubble, type IconName } from '../ui/icons';

type L = 'it' | 'en';
const useLang = () => {
  const { lang } = useNasciTara();
  return { lang, it: lang === 'it' };
};
function useWeek(): number | null {
  const { ga, gaValid } = useNasciTara();
  return gaValid ? Math.floor(ga) : null;
}

/** Le funzioni AI rispondono solo con l'account (servono le funzioni server). */
function AiGate({ children }: { children: React.ReactNode }) {
  const { it } = useLang();
  const { online } = useMamma();
  if (!online) return <p className="nt-note">{it ? 'Disponibile con il tuo account.' : 'Available with your account.'}</p>;
  return <>{children}</>;
}

function aiError(r: FnResult, it: boolean): string {
  switch (r.status) {
    case 'limited': return it ? 'Hai raggiunto il limite di oggi. Riprova domani.' : 'You reached today’s limit. Try again tomorrow.';
    case 'not_configured': return it ? 'L’AI non è ancora attiva su questo ambiente.' : 'AI is not enabled on this environment yet.';
    case 'offline': return it ? 'Disponibile con il tuo account.' : 'Available with your account.';
    default: return it ? 'L’AI non risponde in questo momento. Riprova tra poco.' : 'The AI is not answering right now. Try again shortly.';
  }
}

/* ============================ appuntamenti ============================ */

/** I tuoi appuntamenti (M13 / D08): calendario compatto, agenda del giorno, prossime visite. */
export function CalendarTab() {
  const { lang, it } = useLang();
  const { visits, supplements, remove, error } = useMamma();
  const { user } = useAccount();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
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
  const goToday = () => { setMonth({ y: ty, m: tm - 1 }); setDay(today); };
  const events = eventsOn(day, visits, supplements, lang);
  const next = upcoming(visits.filter(v => (romeInstant(v.visit_date, v.visit_time)?.getTime() ?? 0) >= Date.now()), today);
  const history = visits.filter(v => (romeInstant(v.visit_date, v.visit_time)?.getTime() ?? Infinity) < Date.now()).sort((a,b) => (b.visit_date+b.visit_time).localeCompare(a.visit_date+a.visit_time));
  const dayTitle = day === today ? (it ? 'Oggi' : 'Today') : shortDate(day, lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const tag = (k: 'visit' | 'ai' | 'doctor') => k === 'visit' ? (it ? 'Visita' : 'Visit') : k === 'ai' ? (it ? 'Dal foglietto' : 'From leaflet') : it ? 'Dal medico' : 'From doctor';
  const del = (e: { kind: 'visit' | 'ai' | 'doctor'; id: string; title: string }) => {
    if (window.confirm(it ? `Eliminare “${e.title}”? Si fermano anche i suoi promemoria.` : `Remove “${e.title}”? Its reminders stop too.`)) void remove(e.kind === 'visit' ? 'visits' : 'supplements', e.id);
  };
  return (
    <main className="nt-wrap nt-main nt-mamma">
      <div className="nt-pagehead">
        <IconBubble name="calendar" tone="brand" size={48} />
        <div>
          <h1 className="nt-title">{it ? 'I tuoi appuntamenti' : 'Your appointments'}</h1>
          <p className="nt-sub">{it ? 'Visite e integratori, con promemoria via email' : 'Visits and supplements, with email reminders'}</p>
        </div>
      </div>
      <div className="nt-cal__layout">
        <div className="nt-card nt-cal">
          <div className="nt-cal__bar">
            <button type="button" className="nt-cal__nav" aria-label={it ? 'Mese precedente' : 'Previous month'} onClick={() => shift(-1)}><Icon name="chevron" size={18} className="nt-flip" /></button>
            <span className="nt-cal__month">{monthLabel}</span>
            <button type="button" className="nt-cal__nav" aria-label={it ? 'Mese successivo' : 'Next month'} onClick={() => shift(1)}><Icon name="chevron" size={18} /></button>
          </div>
          <div className="nt-cal__grid">
            {wd.map((w, i) => <div key={i} className="nt-cal__wd" aria-hidden="true">{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDate(month.y, month.m, d);
              const v = visits.some((x) => x.visit_date === iso);
              const s = supplements.some((x) => takesOn(x, iso));
              return (
                <button key={i} type="button" className={`nt-cal__day${iso === today ? ' is-today' : ''}${iso === day ? ' is-picked' : ''}`} aria-pressed={iso === day}
                  aria-label={shortDate(iso, lang, { day: 'numeric', month: 'long' }) + (v ? (it ? ', visita' : ', visit') : '')} onClick={() => setDay(iso)}>
                  <span>{d}</span>
                  <span className="nt-cal__dots">{v ? <i className="is-visit" /> : null}{s ? <i className="is-supp" /> : null}</span>
                </button>
              );
            })}
          </div>
          <div className="nt-cal__foot">
            <span className="nt-cal__legend"><i className="is-visit" />{it ? 'Visita' : 'Visit'}<i className="is-supp" />{it ? 'Integratori' : 'Supplements'}</span>
            {day !== today || month.m !== tm - 1 ? <button type="button" className="nt-link nt-link--sm" onClick={goToday}>{it ? 'Torna a oggi' : 'Back to today'}</button> : null}
          </div>
        </div>
        <div className="nt-stack">
          <div className="nt-card nt-agenda">
            <div className="nt-spread">
              <h2 className="nt-h3 nt-cap">{dayTitle}</h2>
              <span className="nt-chip nt-chip--soft">{events.length} {it ? (events.length === 1 ? 'impegno' : 'impegni') : 'items'}</span>
            </div>
            <div className="nt-timeline">
              {events.map((e, i) => (
                <div key={e.id + e.time + i} className={`nt-tl nt-tl--${e.kind}`}>
                  <span className="nt-tl__time">{e.time}</span>
                  <IconBubble name={e.kind === 'visit' ? 'stethoscope' : 'pill'} tone={e.kind === 'visit' ? 'brand' : 'tint'} size={38} />
                  <span className="nt-row__body">{e.kind === 'visit' ? <button className="nt-link" type="button" onClick={() => setSelectedVisit(visits.find(v => v.id === e.id) ?? null)}>{e.title}</button> : <span className="nt-row__title">{e.title}</span>}<span className="nt-row__meta">{[e.sub, tag(e.kind)].filter(Boolean).join(' · ')}</span></span>
                  <button type="button" className="nt-iconbtn" aria-label={it ? `Elimina ${e.title}` : `Delete ${e.title}`} onClick={() => del(e)}><Icon name="trash" size={18} /></button>
                </div>
              ))}
              {!events.length ? <p className="nt-empty"><Icon name="sparkle" size={18} />{it ? 'Giornata libera. Goditela!' : 'A free day. Enjoy it!'}</p> : null}
            </div>
          </div>
          <div className="nt-grid2">
            <button type="button" className="nt-btn nt-pop" onClick={() => setSheet('visit')}><Icon name="stethoscope" size={20} />{it ? 'Visita' : 'Visit'}</button>
            <button type="button" className="nt-btn nt-btn--soft nt-pop" onClick={() => setSheet('supp')}><Icon name="pill" size={20} />{it ? 'Integratore' : 'Supplement'}</button>
          </div>
          <h2 className="nt-h3">{it ? 'Prossime visite' : 'Upcoming visits'}</h2>
          <div className="nt-rows">
            {next.map((v) => {
              const r = visitReminder(v);
              return (
                <button key={v.id} type="button" className="nt-row nt-linkcard nt-pop" onClick={() => { setSelectedVisit(v); setDay(v.visit_date); const [y, m] = v.visit_date.split('-').map(Number); setMonth({ y, m: m - 1 }); }}>
                  <span className="nt-ev__date"><small>{shortDate(v.visit_date, lang, { month: 'short' }).replace('.', '').toUpperCase()}</small><b>{Number(v.visit_date.slice(8))}</b></span>
                  <span className="nt-row__body">
                    <span className="nt-row__title">{v.kind}</span>
                    <span className="nt-row__meta">{shortDate(v.visit_date, lang, { weekday: 'long' })} · {v.visit_time}{v.place ? ` · ${v.place}` : ''}</span>
                    {v.remind ? <span className="nt-ev__rem"><Icon name="bell" size={13} /> {it ? `Invio previsto ${shortDate(r.date, lang)} alle ${r.time} · ${user?.email ?? '—'} · ora italiana` : `Scheduled ${shortDate(r.date, lang)} at ${r.time} · ${user?.email ?? '—'} · Rome time`}</span> : null}
                  </span>
                  <Icon name="chevron" className="nt-chev" />
                </button>
              );
            })}
            {!next.length ? <p className="nt-empty"><Icon name="calendar" size={18} />{it ? 'Nessuna visita in programma.' : 'No visits planned.'}</p> : null}
          </div>
          <details className="nt-card nt-history"><summary>{it ? 'Visite precedenti' : 'Previous visits'} · {history.length}</summary>
            <p className="nt-note">{it ? 'Appuntamenti con data trascorsa, non conferma di visita effettuata.' : 'Past appointments, not confirmation of attendance.'}</p>
            {history.map(v => <button key={v.id} type="button" className="nt-row nt-linkcard" onClick={() => setSelectedVisit(v)}><IconBubble name="stethoscope" size={36} /><span className="nt-row__body"><b>{v.kind}</b><span className="nt-row__meta">{shortDate(v.visit_date, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · {v.visit_time.slice(0,5)}</span></span><Icon name="chevron" /></button>)}
            {!history.length && <p className="nt-note">{it ? 'Qui ritroverai i tuoi appuntamenti passati.' : 'Your past appointments will appear here.'}</p>}
          </details>
          {error ? <p className="nt-error" role="alert">{error === 'limit' ? (it ? 'Hai raggiunto il numero massimo di elementi.' : 'You reached the maximum number of items.') : it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.'}</p> : null}
        </div>
      </div>
      <Sheet open={!!selectedVisit} onClose={() => setSelectedVisit(null)} title={selectedVisit?.kind ?? ''} subtitle={it ? 'Riepilogo visita' : 'Visit details'} labelClose={it ? 'Chiudi' : 'Close'}>
        {selectedVisit && <>
          <p className="nt-body"><Icon name="calendar" /> {shortDate(selectedVisit.visit_date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {selectedVisit.visit_time.slice(0,5)} ({it ? 'ora italiana' : 'Rome time'})</p>
          {selectedVisit.place && <p className="nt-body">{selectedVisit.place}</p>}
          <div className="nt-card nt-card--pink"><h3 className="nt-h3">{it ? 'Promemoria' : 'Reminder'}</h3><p className="nt-note">{selectedVisit.remind ? (it ? `Invio previsto il ${shortDate(visitReminder(selectedVisit).date, lang, { day: 'numeric', month: 'long', year: 'numeric' })} alle ${visitReminder(selectedVisit).time}, a ${user?.email ?? '—'} (ora italiana). L’orario indica la programmazione, non la consegna nella casella.` : `Scheduled on ${shortDate(visitReminder(selectedVisit).date, lang)} at ${visitReminder(selectedVisit).time}, to ${user?.email ?? '—'} (Rome time). Scheduled time is not proof of inbox delivery.`) : (it ? 'Promemoria disattivato.' : 'Reminder off.')}</p></div>
          <h3 className="nt-h3">{it ? 'Da ricordare per la visita' : 'Notes for your visit'}</h3><p className="nt-prewrap">{selectedVisit.notes || (it ? 'Nessuna nota aggiunta.' : 'No notes added.')}</p>
          <h3 className="nt-h3">{it ? 'Appuntamenti precedenti dello stesso tipo' : 'Previous appointments of this type'}</h3>
          {visits.filter(v => v.kind.toLocaleLowerCase().trim() === selectedVisit.kind.toLocaleLowerCase().trim() && v.visit_date+v.visit_time < selectedVisit.visit_date+selectedVisit.visit_time).sort((a,b) => (b.visit_date+b.visit_time).localeCompare(a.visit_date+a.visit_time)).map(v => <div className="nt-card" key={v.id}><b>{shortDate(v.visit_date, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · {v.visit_time.slice(0,5)}</b><p className="nt-note nt-prewrap">{[v.place, v.notes].filter(Boolean).join(' · ') || (it ? 'Nessuna nota.' : 'No notes.')}</p></div>)}
          {!visits.some(v => v.kind.toLocaleLowerCase().trim() === selectedVisit.kind.toLocaleLowerCase().trim() && v.visit_date+v.visit_time < selectedVisit.visit_date+selectedVisit.visit_time) && <p className="nt-note">{it ? 'Non ci sono appuntamenti precedenti di questo tipo.' : 'No previous appointments of this type.'}</p>}
        </>}
      </Sheet>
      <VisitSheet open={sheet === 'visit'} onClose={() => setSheet(null)} day={day < today ? today : day} />
      <SupplementSheet open={sheet === 'supp'} onClose={() => setSheet(null)} today={today} />
    </main>
  );
}

const VISIT_KINDS_IT = ['Visita ginecologica', 'Ecografia', 'Esami del sangue', 'Monitoraggio (tracciato)', 'Corso preparto', 'Visita ostetrica', 'Translucenza nucale', 'Test combinato', 'Ecografia morfologica', 'Ecografia di accrescimento', 'Test del DNA fetale (NIPT)', 'Curva glicemica', 'Tampone vagino-rettale', 'Consulenza anestesiologica'];
const VISIT_KINDS_EN = ['Gynaecologist visit', 'Ultrasound scan', 'Blood tests', 'Fetal monitoring (CTG)', 'Antenatal class', 'Midwife visit', 'Nuchal translucency', 'Combined screening', 'Anomaly scan', 'Growth scan', 'NIPT', 'Glucose tolerance test', 'Vaginal-rectal swab', 'Anaesthetic consultation'];

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
  const valid = !!v.kind.trim() && !!romeInstant(v.visit_date, v.visit_time);
  const save = async () => {
    setBusy(true);
    const ok = await add('visits', { ...v, kind: v.kind.trim(), place: v.place.trim(), notes: v.notes.trim() } as Omit<Visit, 'id'>);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={it ? 'Nuova visita' : 'New visit'} subtitle={it ? 'La aggiungiamo al tuo calendario' : 'We add it to your calendar'} labelClose={it ? 'Chiudi' : 'Close'}>
      <TextInput label={it ? 'Tipo di visita' : 'Type of visit'} value={v.kind} maxLength={80} onChange={(kind) => setV({ ...v, kind })} />
      <p className="nt-note">{it ? 'Scegli una tipologia o scrivine una. Esami e tempi vanno concordati con il professionista che ti segue.' : 'Choose a type or enter your own. Agree tests and timing with your clinician.'}</p>
      <div className="nt-chips nt-visit-kinds">{(it ? VISIT_KINDS_IT : VISIT_KINDS_EN).map((k) => <button key={k} type="button" className={`nt-chip nt-chip--btn${v.kind === k ? ' nt-chip--on' : ''}`} onClick={() => setV({ ...v, kind: k })}>{k}</button>)}</div>
      <div className="nt-grid2">
        <TextInput label={it ? 'Data' : 'Date'} type="date" value={v.visit_date} onChange={(visit_date) => setV({ ...v, visit_date })} />
        <TextInput label={it ? 'Ora' : 'Time'} type="time" value={v.visit_time} onChange={(visit_time) => setV({ ...v, visit_time })} />
      </div>
      <TextInput label={it ? 'Dove' : 'Where'} value={v.place} maxLength={120} placeholder={it ? 'Studio, ospedale, consultorio…' : 'Practice, hospital…'} onChange={(place) => setV({ ...v, place })} />
      <TextInput label={it ? 'Note' : 'Notes'} value={v.notes} maxLength={500} placeholder={it ? 'Portare gli esami del sangue' : 'Bring blood test results'} onChange={(notes) => setV({ ...v, notes })} />
      <ReminderBox title={it ? 'Promemoria via email' : 'Email reminder'} when={(it ? '6 ore prima · ' : '6 hours before · ') + shortDate(r.date, lang, { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + r.time}
        to={user?.email ? (it ? `a ${user.email}` : `to ${user.email}`) : ''} checked={v.remind} onChange={(remind) => setV({ ...v, remind })} label={it ? 'Promemoria via email' : 'Email reminder'} />
      {v.visit_date && v.visit_time && !romeInstant(v.visit_date, v.visit_time) && <p className="nt-error" role="alert">{it ? 'Controlla data e ora: questo orario non esiste nel fuso italiano.' : 'Check date and time: this time does not exist in the Rome timezone.'}</p>}
      {valid && v.remind && (romeInstant(v.visit_date, v.visit_time)?.getTime() ?? 0) - 6*3600000 < Date.now() && <p className="nt-note">{it ? 'Mancano meno di 6 ore oppure la visita è già trascorsa: il preavviso completo non è possibile. Non fare affidamento sul promemoria per questa visita.' : 'Less than 6 hours remain or the appointment is past: the full notice is not possible. Do not rely on the reminder for this visit.'}</p>}
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
        <AiGate>
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
const TAG_ICON: Record<NoteTag, IconName> = { movimenti: 'footprints', sintomi: 'heart', umore: 'mood', medico: 'stethoscope' };
type Insight = { title: string; body: string; question: string; urgent?: string; at: string; week: number | null };
const INSIGHT_KEY = 'nascitara.insight';

/** Notebook bebe (M16): note con settimana e tag, filtri, insight AI non diagnostici. */
export function NotebookTab({ onCalendar }: { onCalendar: () => void }) {
  const { lang, it } = useLang();
  const { ga, gaValid } = useNasciTara();
  const { user } = useAccount();
  const { notes, add, remove, call, error } = useMamma();
  const week = useWeek();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<NoteTag>('sintomi');
  const [filter, setFilter] = useState<NoteTag | 'all'>('all');
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
  const shown = filter === 'all' ? notes : notes.filter((n) => n.tag === filter);
  const count = (t: NoteTag) => notes.filter((n) => n.tag === t).length;
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
      <div className="nt-pagehead">
        <IconBubble name="note" tone="brand" size={48} />
        <div>
          <h1 className="nt-title">{it ? 'Notebook bebe' : 'Baby notebook'}</h1>
          <p className="nt-sub">{it ? 'Le tue note, lette insieme al tracker' : 'Your notes, read alongside the tracker'}</p>
        </div>
      </div>
      <div className="nt-card nt-composer">
        <label className="nt-sr" htmlFor="nt-note-text">{it ? 'Nuova nota' : 'New note'}</label>
        <textarea id="nt-note-text" className="nt-textarea" rows={3} maxLength={1000} value={text} placeholder={it ? 'Come va oggi? Scrivi una nota…' : 'How is today? Write a note…'} onChange={(e) => setText(e.target.value)} />
        <div className="nt-tagpick" role="group" aria-label={it ? 'Categoria' : 'Category'}>
          {NOTE_TAGS.map((t) => (
            <button key={t} type="button" className={`nt-tagbtn nt-tagbtn--${t}`} aria-pressed={tag === t} onClick={() => setTag(t)}>
              <Icon name={TAG_ICON[t]} size={18} />{TAG_NAME[lang][t]}
            </button>
          ))}
        </div>
        <div className="nt-spread">
          <span className="nt-chip nt-chip--soft">{gaValid ? `${formatGA(ga)} ${it ? 'sett.' : 'wk'}` : ''}</span>
          <button type="button" className="nt-btn nt-btn--sm nt-pop" disabled={!text.trim() || busy} onClick={() => void save()}><Icon name="check" size={18} />{it ? 'Salva nota' : 'Save note'}</button>
        </div>
      </div>
      <div className="nt-card nt-insight">
        <span className="nt-bubble" style={{ right: -40, top: -40, width: 140, height: 140 }} />
        <div className="nt-insight__head"><IconBubble name="sparkle" tone="white" size={40} /><div className="nt-eyebrow">{it ? `Insight AI${week ? ` · ${week}ª settimana` : ''}` : `AI insight${week ? ` · week ${week}` : ''}`}</div></div>
        <AiGate>
          {insight ? (
            <>
              {insight.urgent && insight.urgent !== 'none' ? <UrgentBox kind={insight.urgent === 'crisis' ? 'crisis' : 'medical'} /> : null}
              <div className="nt-insight__title">{insight.title}</div>
              <p className="nt-body">{insight.body}</p>
              {insight.question ? <button type="button" className="nt-pill nt-pill--btn nt-pop" onClick={() => void addQuestion()}><Icon name="stethoscope" size={16} />{it ? 'Aggiungi a “Per il medico”' : 'Add to “For the doctor”'}</button> : null}
            </>
          ) : (
            <p className="nt-body">{notes.length ? (it ? 'Leggo le tue note e ti propongo un suggerimento per questa settimana.' : 'I read your notes and suggest something for this week.') : it ? 'Scrivi qualche nota: poi le leggo insieme e ti propongo un suggerimento.' : 'Write a few notes: then I read them together and suggest something.'}</p>
          )}
          <div className="nt-spread">
            <button type="button" className="nt-btn nt-btn--sm nt-btn--white nt-pop" disabled={!notes.length || thinking} onClick={() => void ask()}><Icon name="sparkle" size={18} />{thinking ? (it ? 'Sto leggendo…' : 'Reading…') : insight ? (it ? 'Aggiorna' : 'Refresh') : it ? 'Leggi le mie note' : 'Read my notes'}</button>
            {insight?.question ? <button type="button" className="nt-link nt-link--sm" onClick={onCalendar}>{it ? 'Appuntamenti →' : 'Appointments →'}</button> : null}
          </div>
          {msg ? <p className="nt-note" role="status">{msg}</p> : null}
        </AiGate>
      </div>
      <div className="nt-spread">
        <h2 className="nt-h3">{it ? 'Le tue note' : 'Your notes'}</h2>
        <span className="nt-note">{notes.length}</span>
      </div>
      {notes.length ? (
        <div className="nt-filters" role="group" aria-label={it ? 'Filtra' : 'Filter'}>
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{it ? 'Tutte' : 'All'}</button>
          {NOTE_TAGS.filter((t) => count(t)).map((t) => <button key={t} type="button" aria-pressed={filter === t} onClick={() => setFilter(t)}><Icon name={TAG_ICON[t]} size={15} />{TAG_NAME[lang][t]} <em>{count(t)}</em></button>)}
        </div>
      ) : null}
      {error ? <p className="nt-error" role="alert">{it ? 'Salvataggio non riuscito. Riprova.' : 'Could not save. Try again.'}</p> : null}
      <div className="nt-notes">
        {shown.map((n) => (
          <article key={n.id} className={`nt-notecard nt-notecard--${n.tag}`}>
            <span className="nt-notecard__icon"><Icon name={TAG_ICON[n.tag]} size={18} /></span>
            <div className="nt-grow">
              <div className="nt-spread">
                <span className="nt-note">{shortDate(n.created_at, lang, { weekday: 'short', day: 'numeric', month: 'short' })}{n.ga_label ? ` · ${n.ga_label} ${it ? 'sett.' : 'wk'}` : ''}</span>
                <button type="button" className="nt-iconbtn" aria-label={it ? 'Elimina nota' : 'Delete note'} onClick={() => { if (window.confirm(it ? 'Eliminare questa nota?' : 'Delete this note?')) void remove('notes', n.id); }}><Icon name="trash" size={16} /></button>
              </div>
              <p className="nt-body nt-prewrap">{n.body}</p>
            </div>
          </article>
        ))}
        {!notes.length ? <p className="nt-empty"><Icon name="note" size={18} />{it ? 'La prima nota è la più bella: comincia da oggi.' : 'The first note is the best: start today.'}</p> : null}
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
const READ_KEY = 'nascitara.letture';

/** Supporto mamma (M17 / D09): letture del giorno da fonti ufficiali, assistente AI con fonti. */
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
  const today = romeToday();
  const dayIndex = Math.floor(Date.now() / 864e5);
  const daily = useMemo(() => dailyFor(week, dayIndex), [week, dayIndex]);
  const found = searchSupport(query);
  const [read, setRead] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) ?? '{}');
      return saved.day === today && Array.isArray(saved.ids) ? saved.ids : [];
    } catch {
      return [];
    }
  });
  const markRead = (id: string) => {
    const ids = read.includes(id) ? read : [...read, id];
    setRead(ids);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify({ day: today, ids }));
    } catch {
      /* Solo per questa visita. */
    }
  };
  const done = daily.filter((d) => read.includes(d.id)).length;
  const kindName = (k: SupportItem['kind']) => (it ? { formazione: 'Da sapere', fisica: 'Movimento', ludica: 'Da fare insieme', benessere: 'Benessere' } : { formazione: 'Good to know', fisica: 'Movement', ludica: 'Do together', benessere: 'Wellbeing' })[k];
  const whoName = (w: SupportItem['who']) => (it ? { mamma: 'Per la mamma', papa: 'Per il papà', insieme: 'Per tutti e due' } : { mamma: 'For mum', papa: 'For dad', insieme: 'For both' })[w];
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
  const card = (s: SupportItem) => {
    const isRead = read.includes(s.id);
    return (
      <article key={s.id} className={`nt-read nt-read--${s.kind}${isRead ? ' is-read' : ''}`}>
        <div className="nt-read__top">
          <span className="nt-read__icon nt-source-logo"><img src={sourceLogo(s.url)} alt={s.source} width="36" height="36" loading="lazy" /></span>
          <span className="nt-read__kind">{kindName(s.kind)}</span>
          {isRead ? <span className="nt-read__done"><Icon name="check" size={14} />{it ? 'Letto' : 'Read'}</span> : null}
        </div>
        <h3 className="nt-read__title">{it ? s.title : s.titleEn}</h3>
        <div className="nt-read__meta">
          <span><Icon name="clock" size={14} />{it ? `${s.minutes} min di lettura` : `${s.minutes} min read`}</span>
          <span><Icon name="users" size={14} />{whoName(s.who)}</span>
        </div>
        <div className="nt-read__foot">
          <span className="nt-read__src">{s.source}{s.english && it ? ' · in inglese' : ''}</span>
          <a className="nt-btn nt-btn--sm" href={s.url} target="_blank" rel="noreferrer noopener" onClick={() => markRead(s.id)}>{it ? 'Leggi' : 'Read'}<Icon name="arrow" size={16} /></a>
        </div>
      </article>
    );
  };
  const assistant = (
    <div className="nt-assist">
      <div className="nt-assist__head">
        <span className="nt-journey__title"><IconBubble name="sparkle" tone="brand" size={36} />{it ? 'Assistente AI' : 'AI assistant'}</span>
        <Segmented label={it ? 'Argomento' : 'Topic'} size="sm" value={topic} options={[['pregnancy', it ? 'Gravidanza' : 'Pregnancy'], ['feelings', it ? 'Come ti senti' : 'How you feel']]} onChange={(t) => { setTopic(t); setChat([]); setMsg(''); }} />
      </div>
      <p className="nt-note">{topic === 'pregnancy'
        ? (it ? 'Risponde un’AI, non un’ostetrica: cerca su Ministero, ISS, EFSA, OMS e cita le fonti.' : 'An AI answers, not a midwife: it searches official health sites and cites them.')
        : (it ? 'Risponde un’AI, non una psicologa: ti ascolta e ti dice a chi rivolgerti.' : 'An AI answers, not a psychologist: it listens and tells you who to turn to.')}</p>
      <AiGate>
        <div className="nt-chat" ref={box} aria-live="polite">
          {chat.map((m, i) => (
            <div key={i} className={`nt-bubble-msg nt-bubble-msg--${m.role}`}>
              {m.urgent && m.urgent !== 'none' ? <UrgentBox kind={m.urgent === 'crisis' ? 'crisis' : 'medical'} /> : null}
              <p className="nt-prewrap">{m.content}</p>
              {m.sources?.length ? (
                <div className="nt-sources"><Icon name="book" size={13} />{m.sources.map((s, k) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener">{k ? ', ' : ' '}{s.title}</a>)}</div>
              ) : null}
            </div>
          ))}
          {busy ? <div className="nt-bubble-msg nt-bubble-msg--assistant nt-typing" aria-label={it ? 'Sto cercando nelle fonti ufficiali' : 'Searching official sources'}><i /><i /><i /></div> : null}
          {!chat.length && !busy ? <div className="nt-chips">{suggestions.map((s) => <button key={s} type="button" className="nt-chip nt-chip--btn nt-pop" onClick={() => void send(s)}>{s}</button>)}</div> : null}
        </div>
        {msg ? <p className="nt-note" role="status">{msg}</p> : null}
        <form className="nt-ask" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <input value={draft} maxLength={1500} onChange={(e) => setDraft(e.target.value)} placeholder={it ? 'Chiedi all’assistente…' : 'Ask the assistant…'} aria-label={it ? 'Domanda' : 'Question'} />
          <button type="submit" aria-label={it ? 'Invia' : 'Send'} disabled={!draft.trim() || busy}><Icon name="arrow" size={18} /></button>
        </form>
      </AiGate>
    </div>
  );
  const people = (
    <div className="nt-stack6">
      <h2 className="nt-h3">{it ? 'Quando serve una persona' : 'When you need a person'}</h2>
      <div className="nt-grid2">
        <DoctorContacts />
        <a className="nt-card nt-person nt-pop" href="tel:+390223272327">
          <IconBubble name="phone" />
          <span className="nt-row__title">Telefono Amico</span>
          <span className="nt-row__meta">{it ? '02 2327 2327, ogni giorno dalle 9 alle 24.' : '02 2327 2327, daily 9am to midnight.'}</span>
        </a>
      </div>
      <a className="nt-sos" href="tel:112"><Icon name="phone" size={18} />{it ? 'Per un’urgenza chiama il 112' : 'In an emergency call 112'}</a>
    </div>
  );
  return (
    <main className="nt-wrap nt-main nt-mamma">
      <div className="nt-pagehead">
        <IconBubble name="heart" tone="brand" size={48} />
        <div>
          <h1 className="nt-title">{it ? 'Supporto mamma' : 'Mum support'}</h1>
          <p className="nt-sub">{it ? `Ogni giorno, sulla tua ${week}ª settimana` : `Every day, for week ${week}`}</p>
        </div>
      </div>
      <div className="nt-supp__layout">
        <div className="nt-stack">
          <div className="nt-input nt-search">
            <Icon name="search" size={20} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={it ? 'Cerca tra guide e articoli verificati' : 'Search verified guides'} aria-label={it ? 'Cerca' : 'Search'} />
          </div>
          {query.trim().length >= 2 ? (
            <div className="nt-reads nt-reads--list">
              {found.map(card)}
              {!found.length ? <p className="nt-empty"><Icon name="search" size={18} />{it ? 'Nessuna guida trovata. Prova a chiedere all’assistente.' : 'No guide found. Try asking the assistant.'}</p> : null}
            </div>
          ) : (
            <section className="nt-stack6">
              <div className="nt-spread">
                <h2 className="nt-h3">{it ? 'Oggi per voi' : 'Today for you'}</h2>
                <span className="nt-progressdots" aria-label={it ? `${done} di ${daily.length} letti` : `${done} of ${daily.length} read`}>
                  {daily.map((d) => <i key={d.id} className={read.includes(d.id) ? 'is-on' : undefined} />)}
                  <b>{done}/{daily.length}</b>
                </span>
              </div>
              <p className="nt-note">{done === daily.length && daily.length ? (it ? 'Tutto letto per oggi. Domani ve ne aspettano altri!' : 'All read for today. More tomorrow!') : it ? 'Quattro letture brevi da fonti ufficiali, scelte per la tua settimana.' : 'Four short reads from official sources, picked for your week.'}</p>
              <div className="nt-reads">{daily.map(card)}</div>
            </section>
          )}
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
