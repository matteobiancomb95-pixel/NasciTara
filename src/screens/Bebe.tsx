import { GrowthChart } from '../components/GrowthChart';
import { PercentileSummary } from '../components/PercentileSummary';
import { useMemo, useState } from 'react';
import { useNasciTara, type ScanState, type Washes } from '../state/NasciTaraStore';
import { useMamma } from '../state/MammaStore';
import { useFamily } from '../state/AccountContext';
import { ageLabel, neoUntil, PHASE_NAME } from '../lib/family';
import { BirthSheet } from '../components/BirthSheet';
import { buildCorredino, corredinoText, type Corredino, type Group, type Season } from '../lib/corredino';
import { exportCorredinoPdf } from '../lib/corredinoPdf';
import { estimatedDueDate, formatGA, todayUTC } from '../lib/gestationalAge';
import { romeToday, shortDate, upcoming } from '../lib/mamma';
import { localeOf } from '../i18n';
import { Segmented, Sheet, grams } from '../ui/kit';
import { Fetus, GarmentGlyph, ShareIcon } from '../ui/art';
import { Icon, IconBubble, type IconName } from '../ui/icons';
import { ScanEditor, MEASURES } from './ScanEditor';
import { useScanRows } from './Journey';
import { useFeedback } from '../ui/feedback';

type Go = (tab: 'baby' | 'corredino' | 'calendario') => void;

/** "Peso più o meno quanto…": confronto giocoso dal peso stimato, non un dato clinico. */
const COMPARE: Array<[number, string, string]> = [
  [120, 'un limone', 'a lemon'], [250, 'un’arancia', 'an orange'], [450, 'un pompelmo', 'a grapefruit'],
  [700, 'un cavolfiore', 'a cauliflower'], [1000, 'un ananas piccolo', 'a small pineapple'], [1500, 'un cavolo cappuccio', 'a cabbage'],
  [2200, 'una zucca', 'a pumpkin'], [2900, 'un melone', 'a melon'], [Infinity, 'un’anguria piccola', 'a small watermelon'],
];
const compareOf = (g: number, it: boolean) => {
  const row = COMPARE.find(([max]) => g <= max)!;
  return it ? row[1] : row[2];
};

/* ============================ riepilogo ============================ */

/** Riepilogo (M08 / D05): il bebe da toccare, il percorso, scorciatoie con icone. */
export function HomeTab({ firstName, onGo }: { firstName: string; onGo: Go }) {
  const { born } = useFamily();
  return born ? <BornHome firstName={firstName} onGo={onGo} /> : <ExpectingHome firstName={firstName} onGo={onGo} />;
}

function ExpectingHome({ firstName, onGo }: { firstName: string; onGo: Go }) {
  const { analysis, state, dispatch, ga, gaValid, lang } = useNasciTara();
  const { role } = useFamily();
  const [birth, setBirth] = useState(false);
  const { visits } = useMamma();
  const it = lang === 'it';
  const rows = useScanRows();
  const { c } = useCorredino();
  const [adding, setAdding] = useState(false);
  const [talk, setTalk] = useState(0);
  const loc = localeOf(lang);
  const g = (v: number) => grams(v, lang);
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const week = gaValid ? Math.floor(ga) : null;
  const daysLeft = due ? Math.max(0, Math.round((due.getTime() - todayUTC().getTime()) / 864e5)) : null;
  const dueShort = due?.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }) ?? '—';
  const dueMonth = due?.toLocaleDateString(loc, { month: 'long', timeZone: 'UTC' }) ?? '';
  const boy = state.babySex === 'male';
  const sexLabel = state.babySex === 'female' ? (it ? 'È una femmina' : 'It’s a girl') : boy ? (it ? 'È un maschio' : 'It’s a boy') : it ? 'Maschio o femmina?' : 'Boy or girl?';
  const nextSex = state.babySex === 'female' ? 'male' : 'female';
  const dated = rows.filter((r) => r.scan.date);
  const last = dated[dated.length - 1];
  const next = upcoming(visits, romeToday(), 1)[0];
  const pct = week === null ? 0 : Math.min(100, Math.max(2, ((ga - 4) / 36) * 100));
  const lines = analysis
    ? [
        it ? `Ciao ${role === 'papa' ? 'papà' : 'mamma'}! Oggi peso più o meno quanto ${compareOf(analysis.now.efw, it)}.` : `Hi ${role === 'papa' ? 'dad' : 'mum'}! Today I weigh about as much as ${compareOf(analysis.now.efw, it)}.`,
        daysLeft !== null ? (it ? `Ancora ${daysLeft} giorni e ci vediamo, a ${dueMonth}!` : `${daysLeft} more days and we meet, in ${dueMonth}!`) : '',
        it ? `Mi hai già guardato in ${rows.length} ${rows.length === 1 ? 'ecografia' : 'ecografie'}. Sorridevo!` : `You’ve seen me in ${rows.length} scans. I was smiling!`,
      ].filter(Boolean)
    : [it ? `Ciao ${role === 'papa' ? 'papà' : 'mamma'}! Aggiungi un’ecografia e ti racconto come cresco.` : `Hi ${role === 'papa' ? 'dad' : 'mum'}! Add a scan and I’ll tell you how I’m growing.`];
  const save = (scan: ScanState) => {
    dispatch({ type: 'saveScan', scan });
    setAdding(false);
  };
  const tile = (icon: IconName, label: string, value: string, onClick: () => void) => (
    <button type="button" className="nt-qtile nt-pop" onClick={onClick}>
      <IconBubble name={icon} size={40} />
      <span className="nt-qtile__label">{label}</span>
      <span className="nt-qtile__value">{value}</span>
    </button>
  );
  return (
    <main className="nt-wrap nt-main nt-home">
      <div className="nt-home__grid">
        <section className="nt-home__hero">
          <div className="nt-spread nt-start">
            <div>
              <h1 className="nt-home__hello">{it ? `Ciao${firstName ? ' ' + firstName : ''}` : `Hi${firstName ? ' ' + firstName : ''}`}</h1>
              {week !== null ? <p className="nt-sub">{it ? `${week}ª settimana · mancano ${daysLeft} giorni` : `Week ${week} · ${daysLeft} days to go`}</p> : null}
            </div>
            <button type="button" className="nt-sex nt-pop" onClick={() => dispatch({ type: 'setBabySex', value: nextSex })} title={it ? 'Cambia' : 'Change'}>{sexLabel}</button>
          </div>
          <button type="button" className="nt-home__stage" onClick={() => setTalk((t) => t + 1)} aria-label={it ? 'Tocca il bebe' : 'Tap the baby'}>
            <span className="nt-say" key={talk} role="status">{lines[talk % lines.length]}</span>
            <Fetus size={420} boy={boy} label={it ? 'Il tuo bebe nel pancione' : 'Your baby in the womb'} />
            {analysis ? (
              <>
                <span className="nt-home__badge nt-home__badge--tl"><Icon name="scale" size={18} /><span><small>{it ? 'Oggi' : 'Today'}</small><b>{g(analysis.now.efw)} g</b></span></span>
                <span className="nt-home__badge nt-home__badge--br"><Icon name="ruler" size={18} /><span><small>{it ? 'Lungo' : 'Length'}</small><b>~{Math.round(analysis.lengthNow.cm)} cm</b></span></span>
              </>
            ) : null}
            <span className="nt-home__tap">{it ? 'Toccami' : 'Tap me'}</span>
          </button>
        </section>
        <section className="nt-stack">
          {week === null || week >= 36 ? (
            <button type="button" className="nt-row nt-linkcard nt-linkcard--born nt-pop" onClick={() => setBirth(true)}>
              <IconBubble name="baby" tone="brand" />
              <span className="nt-row__body">
                <span className="nt-row__title">{it ? 'È nato?' : 'Is the baby here?'}</span>
                <span className="nt-row__meta">{it ? 'Indica la data di nascita: NasciTara passa ai primi mesi.' : 'Add the date of birth: NasciTara moves on to the first months.'}</span>
              </span>
              <Icon name="chevron" className="nt-chev" />
            </button>
          ) : null}
          {week !== null ? (
            <div className="nt-card nt-journey">
              <div className="nt-spread">
                <span className="nt-journey__title"><IconBubble name="heart" size={36} />{it ? 'Il tuo percorso' : 'Your journey'}</span>
                <span className="nt-chip nt-chip--soft"><Icon name="calendar" size={14} /> {it ? 'Parto' : 'Due'} {dueShort}</span>
              </div>
              <div className="nt-journey__track" aria-label={it ? `Settimana ${week} di 40` : `Week ${week} of 40`}>
                <i style={{ width: `${pct}%` }} />
                <span className="nt-journey__dot" style={{ left: `${pct}%` }}><Icon name="baby" size={16} /></span>
                <em style={{ left: '25%' }} /><em style={{ left: '62.5%' }} />
              </div>
              <div className="nt-journey__legend"><span>{it ? '1° trim.' : '1st tri.'}</span><span>{it ? '2° trim.' : '2nd tri.'}</span><span>{it ? '3° trim.' : '3rd tri.'}</span></div>
            </div>
          ) : null}
          <div className="nt-qtiles">
            {tile('gift', it ? 'Alla nascita' : 'At birth', analysis ? `~${g(Math.round(analysis.term.efw / 10) * 10)} g` : '—', () => onGo('baby'))}
            {tile('ruler', it ? 'Lungo alla nascita' : 'Length at birth', analysis ? `~${Math.round(analysis.lengthTerm.cm)} cm` : '—', () => onGo('baby'))}
            {tile('scan', it ? 'Ecografie' : 'Scans', last ? `${rows.length} · ${shortDate(last.scan.date, lang)}` : String(rows.length), () => onGo('baby'))}
            {tile('chart', it ? 'Percentile del peso' : 'Weight percentile', analysis ? `${Math.round(analysis.now.pct)}° pc` : '—', () => onGo('baby'))}
          </div>
          {analysis && <PercentileSummary analysis={analysis} lang={lang} />}
          <button type="button" className="nt-row nt-linkcard nt-pop" onClick={() => onGo('calendario')}>
            <IconBubble name="stethoscope" />
            <span className="nt-row__body">
              <span className="nt-eyebrow">{it ? 'Prossimo appuntamento' : 'Next appointment'}</span>
              <span className="nt-row__title">{next ? `${next.kind} · ${shortDate(next.visit_date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}, ${next.visit_time}` : it ? 'Aggiungi la prossima visita' : 'Add your next visit'}</span>
            </span>
            <Icon name="chevron" className="nt-chev" />
          </button>
          {c ? (
            <button type="button" className="nt-home__cor nt-pop" onClick={() => onGo('corredino')}>
              <Ring value={c.have} total={c.total} />
              <span className="nt-row__body">
                <span className="nt-eyebrow">Corredino AI</span>
                <span className="nt-home__cortitle">{it ? `${c.have} di ${c.total} capi pronti` : `${c.have} of ${c.total} items ready`}</span>
                <span className="nt-row__meta">{it ? 'Taglie' : 'Sizes'} {c.sizes.join(' · ')} · {c.seasonHeadline}</span>
              </span>
              <Icon name="chevron" className="nt-chev" />
            </button>
          ) : null}
          <button type="button" className="nt-row nt-linkcard nt-linkcard--dashed nt-pop" onClick={() => setAdding(true)}>
            <IconBubble name="camera" tone="brand" />
            <span className="nt-row__body"><span className="nt-row__title">{it ? 'Nuova ecografia?' : 'New scan?'}</span><span className="nt-row__meta">{it ? 'Fotografa il referto: aggiorniamo stima e corredino' : 'Snap the report: we update estimate and layette'}</span></span>
            <Icon name="plus" className="nt-chev" />
          </button>
        </section>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} labelClose={it ? 'Chiudi' : 'Close'} title={it ? `Ecografia ${rows.length + 1}` : `Scan ${rows.length + 1}`} subtitle={it ? 'Nuova ecografia' : 'New scan'}>
        <ScanEditor key={adding ? 'new' : 'none'} compact number={rows.length + 1} onSave={save} />
      </Sheet>
      <BirthSheet open={birth} onClose={() => setBirth(false)} />
    </main>
  );
}

/** Riepilogo dopo la nascita (1.0-a): età, fase e cosa arriva nei prossimi rilasci. */
function BornHome({ firstName, onGo }: { firstName: string; onGo: Go }) {
  const { state, dispatch, lang, completeScans } = useNasciTara();
  const { phase, birthDate } = useFamily();
  const { visits } = useMamma();
  const { c } = useCorredino();
  const it = lang === 'it';
  const loc = localeOf(lang);
  const date = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const age = birthDate ? ageLabel(birthDate, lang) : '';
  const next = upcoming(visits, romeToday(), 1)[0];
  const boy = state.babySex === 'male';
  const sexLabel = state.babySex === 'female' ? (it ? 'È una femmina' : 'It’s a girl') : boy ? (it ? 'È un maschio' : 'It’s a boy') : it ? 'Maschio o femmina?' : 'Boy or girl?';
  const nextSex = state.babySex === 'female' ? 'male' : 'female';
  const soon: Array<[IconName, string, string]> = it
    ? [['stethoscope', 'Libretto sanitario', 'Vaccini, bilanci di salute e crescita, con i promemoria.'], ['heart', 'Gestione bebe', 'Poppate, pannolini e sonno, fino ai 12 mesi.'], ['sparkle', 'Apprendimento guidato', 'Giochi e attività per lo sviluppo, da fonti pediatriche.']]
    : [['stethoscope', 'Health record', 'Vaccines, check-ups and growth, with reminders.'], ['heart', 'Baby care', 'Feeds, nappies and sleep, up to 12 months.'], ['sparkle', 'Guided learning', 'Play and activities for development, from paediatric sources.']];
  return (
    <main className="nt-wrap nt-main nt-home nt-home--born">
      <div className="nt-home__grid">
        <section className="nt-home__hero">
          <div className="nt-spread nt-start">
            <div>
              <h1 className="nt-home__hello">{it ? `Ciao${firstName ? ' ' + firstName : ''}` : `Hi${firstName ? ' ' + firstName : ''}`}</h1>
              {birthDate ? <p className="nt-sub">{it ? `Il tuo bebe ha ${age}` : `Your baby is ${age} old`}</p> : null}
            </div>
            <button type="button" className="nt-sex nt-pop" onClick={() => dispatch({ type: 'setBabySex', value: nextSex })} title={it ? 'Cambia' : 'Change'}>{sexLabel}</button>
          </div>
          <div className="nt-card nt-card--pink nt-born">
            <span className="nt-tag">{PHASE_NAME[phase][lang]}</span>
            {birthDate ? <div className="nt-mid">{it ? `Nato il ${date(birthDate)}` : `Born on ${date(birthDate)}`}</div> : null}
            {phase === 'neo' && birthDate ? <p className="nt-note">{it ? `Neogenitori fino al ${date(neoUntil(birthDate))}: poi NasciTara passa da sola a “Già genitore”.` : `New parents until ${date(neoUntil(birthDate))}: then NasciTara moves to “Already a parent” on its own.`}</p> : null}
          </div>
        </section>
        <section className="nt-stack">
          <button type="button" className="nt-row nt-linkcard nt-pop" onClick={() => onGo('calendario')}>
            <IconBubble name="stethoscope" />
            <span className="nt-row__body">
              <span className="nt-eyebrow">{it ? 'Prossimo appuntamento' : 'Next appointment'}</span>
              <span className="nt-row__title">{next ? `${next.kind} · ${shortDate(next.visit_date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}, ${next.visit_time}` : it ? 'Aggiungi la prossima visita' : 'Add your next visit'}</span>
            </span>
            <Icon name="chevron" className="nt-chev" />
          </button>
          {c && phase === 'neo' ? (
            <button type="button" className="nt-home__cor nt-pop" onClick={() => onGo('corredino')}>
              <Ring value={c.have} total={c.total} />
              <span className="nt-row__body">
                <span className="nt-eyebrow">Corredino AI</span>
                <span className="nt-home__cortitle">{it ? `${c.have} di ${c.total} capi pronti` : `${c.have} of ${c.total} items ready`}</span>
                <span className="nt-row__meta">{it ? 'Taglie' : 'Sizes'} {c.sizes.join(' · ')} · {c.seasonHeadline}</span>
              </span>
              <Icon name="chevron" className="nt-chev" />
            </button>
          ) : null}
          {completeScans > 0 ? (
            <button type="button" className="nt-row nt-linkcard nt-pop" onClick={() => onGo('baby')}>
              <IconBubble name="scan" />
              <span className="nt-row__body"><span className="nt-row__title">{it ? 'Le ecografie della gravidanza' : 'Your pregnancy scans'}</span><span className="nt-row__meta">{it ? 'Restano qui, da riguardare quando vuoi.' : 'They stay here to look back on.'}</span></span>
              <Icon name="chevron" className="nt-chev" />
            </button>
          ) : null}
          <div className="nt-card nt-stack6">
            <div className="nt-eyebrow">{it ? 'In arrivo su NasciTara' : 'Coming to NasciTara'}</div>
            {soon.map(([icon, title, body]) => (
              <div key={title} className="nt-row nt-row--plain">
                <IconBubble name={icon} size={36} />
                <span className="nt-row__body"><span className="nt-row__title">{title}</span><span className="nt-row__meta">{body}</span></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/** Anello di avanzamento (capi pronti). */
function Ring({ value, total, size = 64 }: { value: number; total: number; size?: number }) {
  const r = 26, len = 2 * Math.PI * r, p = total ? Math.min(1, value / total) : 0;
  return (
    <span className="nt-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#fff" strokeWidth="8" />
        {p > 0 ? <circle cx="32" cy="32" r={r} fill="none" stroke="#ff395c" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${len * p} ${len}`} transform="rotate(-90 32 32)" /> : null}
      </svg>
      <b>{Math.round(p * 100)}%</b>
    </span>
  );
}

/* ============================ crescita ============================ */

/** Crescita (M09 / D06): stima di oggi, barre da toccare, ecografie chiuse che si aprono al tocco. */
export function BabyTab() {
  const { analysis, state, dispatch, ga, gaValid, lang } = useNasciTara();
  const it = lang === 'it';
  const rows = useScanRows();
  const [edit, setEdit] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { toast, confirm } = useFeedback();
  const [metric, setMetric] = useState<'weight' | 'length'>('weight');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const g = (v: number) => grams(v, lang);
  const editing = rows.find((r) => r.scan.id === edit);
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const term = analysis?.term.efw ?? 0;
  const save = (scan: ScanState) => {
    dispatch({ type: 'saveScan', scan });
    setEdit(null);
  };
  const scanNumber = editing ? rows.indexOf(editing) + 1 : rows.length + 1;
  const fromReport = rows.filter((r) => r.scan.source === 'report').length;
  const first = rows.find((r) => Number.isFinite(r.ga));
  const lastRow = rows[rows.length - 1];
  return (
    <main className="nt-wrap nt-main nt-baby">
      <div className="nt-baby__grid">
        <div className="nt-stack">
          {analysis ? (
            <div className="nt-card nt-card--pink nt-today">
              <span className="nt-bubble" style={{ right: -40, top: -40, width: 150, height: 150 }} />
              <div className="nt-eyebrow">{it ? 'Oggi pesa circa' : 'Today about'}</div>
              <div className="nt-today__num">{g(analysis.now.efw)}<small> g</small></div>
              <div className="nt-chips">
                <span className="nt-chip nt-chip--white"><Icon name="ruler" size={15} /> ~{Math.round(analysis.lengthNow.cm)} cm</span>
                <span className="nt-chip nt-chip--white"><Icon name="calendar" size={15} /> {formatGA(analysis.ga)} {it ? 'sett.' : 'wk'}</span>
                <span className="nt-chip nt-chip--white"><Icon name="gift" size={15} /> {it ? 'nascita' : 'birth'} ~{g(Math.round(term / 10) * 10)} g</span>
              </div>
              {due ? <p className="nt-note nt-today__due">{it ? 'Lunghezza stimata dal femore. Parto previsto il ' : 'Length estimated from the femur. Due on '}{due.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', timeZone: 'UTC' })}.</p> : null}
            </div>
          ) : (
            <div className="nt-card nt-card--pink">
              <div className="nt-eyebrow">{it ? 'Stima non disponibile' : 'No estimate yet'}</div>
              <p className="nt-body">{it ? 'Serve almeno un’ecografia con data e tutte e 4 le misure.' : 'At least one scan with date and all 4 values is needed.'}</p>
            </div>
          )}
          {analysis ? (
            <section className="nt-card nt-growth-card">
              <h2 className="nt-h3">{it ? 'La crescita, fino a 45 settimane' : 'Growth through week 45'}</h2>
              <Segmented label={it ? 'Misura del grafico' : 'Chart measurement'} value={metric} options={[["weight", it ? 'Peso' : 'Weight'], ["length", it ? 'Lunghezza stimata' : 'Estimated length']]} onChange={setMetric} />
              <GrowthChart analysis={analysis} metric={metric} selectedWeek={selectedWeek ?? analysis.ga} />
              <label className="nt-week-selector">{it ? 'Esplora la settimana' : 'Explore week'} · {formatGA(selectedWeek ?? analysis.ga)}
                <input type="range" min={Math.max(12, Math.floor(analysis.points[0].ga))} max="45" step="0.142857142857" value={selectedWeek ?? analysis.ga} onChange={e => setSelectedWeek(Number(e.target.value))} />
              </label>
              <p className="nt-note">{it ? 'Punti: le tue ecografie. Linea tratteggiata: proiezione. Oltre 42 settimane è un’estrapolazione matematica, non una previsione clinica né una curva di crescita dopo la nascita.' : 'Dots: your scans. Dashed line: projection. Beyond 42 weeks this is a mathematical extrapolation, not a clinical forecast or a postnatal growth chart.'}</p>
            </section>
          ) : null}
        </div>
        <section className="nt-stack">
          <div className="nt-card nt-recap">
            <IconBubble name="scan" tone="brand" />
            <div className="nt-grow">
              <div className="nt-row__title">{rows.length} {it ? (rows.length === 1 ? 'ecografia' : 'ecografie') : rows.length === 1 ? 'scan' : 'scans'}</div>
              <div className="nt-row__meta">
                {first && lastRow && rows.length > 1 ? (it ? `dalla ${Math.floor(first.ga)}ª alla ${Math.floor(lastRow.ga)}ª settimana` : `from week ${Math.floor(first.ga)} to ${Math.floor(lastRow.ga)}`) : ''}
                {fromReport ? ` · ${fromReport} ${it ? 'dal referto' : 'from report'}` : ''}
              </div>
            </div>
            <button type="button" className="nt-btn nt-btn--sm" onClick={() => setEdit('new')}><Icon name="plus" size={18} />{it ? 'Aggiungi' : 'Add'}</button>
          </div>
          <div className="nt-rows">
            {[...rows].reverse().map((r) => {
              const i = rows.indexOf(r);
              const isOpen = open === r.scan.id;
              return (
                <div key={r.scan.id} className={`nt-acc${isOpen ? ' is-open' : ''}`}>
                  <button type="button" className="nt-acc__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.scan.id)}>
                    <span className="nt-badge">{i + 1}</span>
                    <span className="nt-row__body"><span className="nt-row__title">{it ? 'Ecografia' : 'Scan'} {i + 1}</span><span className="nt-row__meta">{r.label}</span></span>
                    {r.result && r.result.qc.weightUsable ? <span className="nt-acc__w">{g(r.result.efw)} g</span> : r.result ? <span className="nt-acc__w nt-acc__w--warn"><Icon name="info" size={16} /></span> : null}
                    <Icon name="chevron" className="nt-acc__chev" />
                  </button>
                  {isOpen ? (
                    <div className="nt-acc__body">
                      <div className="nt-measures nt-measures--4">
                        {MEASURES.map((m) => {
                          const out = r.result?.qc.excluded.find((e) => e.key === m.key);
                          return <div key={m.key} className={`nt-measure${out ? ' is-excluded' : ''}`}><b>{m.key}</b><span>{r.scan[m.field] === '' ? '—' : r.scan[m.field]}</span><small>{out ? (it ? 'esclusa' : 'excluded') : it ? m.it : m.en}</small></div>;
                        })}
                      </div>
                      {r.result && r.result.qc.excluded.length ? (
                        <p className="nt-qc" role="note">
                          <Icon name="info" size={16} />
                          {!r.result.qc.weightUsable
                            ? (it ? 'Questa ecografia non entra nella stima del peso: alcune misure sono fuori scala. Controlla i valori sul referto.' : 'This scan is left out of the weight estimate: some values are out of range. Check them against the report.')
                            : (it ? `${r.result.qc.excluded.map((e) => e.key).join(', ')} non torna con le altre misure: per il peso usiamo le altre. Controlla il valore sul referto.` : `${r.result.qc.excluded.map((e) => e.key).join(', ')} doesn’t match the other values: we estimate weight without it. Check it against the report.`)}
                        </p>
                      ) : null}
                      <div className="nt-spread">
                        <span className="nt-note"><Icon name={r.scan.source === 'report' ? 'camera' : 'note'} size={14} /> {r.src}</span>
                        <button type="button" className="nt-btn nt-btn--soft nt-btn--sm" onClick={() => setEdit(r.scan.id)}>{it ? 'Modifica' : 'Edit'}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!rows.length ? <p className="nt-note">{it ? 'Nessuna ecografia ancora.' : 'No scans yet.'}</p> : null}
          </div>
        </section>
      </div>
      <Sheet open={edit !== null} onClose={() => setEdit(null)} labelClose={it ? 'Chiudi' : 'Close'}
        title={it ? `Ecografia ${scanNumber}` : `Scan ${scanNumber}`}
        subtitle={editing ? editing.label : it ? 'Nuova ecografia' : 'New scan'}>
        <ScanEditor key={edit ?? 'none'} compact initial={editing?.scan} number={scanNumber} onSave={save}
          onDelete={editing ? () => void (async () => { if (await confirm({ title: it ? 'Eliminare questa ecografia?' : 'Delete this scan?', body: it ? 'Stima e corredino si aggiornano subito.' : 'Estimate and layette update right away.', confirm: it ? 'Elimina' : 'Delete', cancel: it ? 'Annulla' : 'Cancel', danger: true })) { dispatch({ type: 'removeScan', id: editing.scan.id }); setEdit(null); toast(it ? 'Ecografia eliminata.' : 'Scan deleted.'); } })() : undefined} />
      </Sheet>
    </main>
  );
}

/* ============================ corredino ============================ */

/** Lunghezza media alla nascita (OMS, 50° percentile) quando dopo la nascita manca una stima. */
const BIRTH_LENGTH_CM = 50;

export function useCorredino(): { c: Corredino | null; basis: string; dueShort: string } {
  const { analysis, state, ga, gaValid, lang } = useNasciTara();
  const { birthDate } = useFamily();
  return useMemo(() => {
    if (birthDate) {
      // After the birth the season comes from the real date; length from the last estimate or the average.
      const born = new Date(birthDate + 'T00:00:00Z');
      const len = analysis?.lengthTerm.cm ?? BIRTH_LENGTH_CM;
      const c = buildCorredino({ birthLengthCm: len, dueDate: born, washes: state.corredino?.washes ?? 3, dryer: state.corredino?.dryer ?? false, bought: state.corredino?.bought ?? {}, lang });
      const loc = localeOf(lang);
      return { c, basis: lang === 'it' ? `Nato il ${born.toLocaleDateString(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' })} · ~${Math.round(len)} cm` : `Born ${born.toLocaleDateString(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' })} · ~${Math.round(len)} cm`, dueShort: born.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }) };
    }
    if (!analysis || !gaValid) return { c: null, basis: '', dueShort: '' };
    const due = estimatedDueDate(state.referenceDate, ga) ?? new Date();
    const c = buildCorredino({
      birthLengthCm: analysis.lengthTerm.cm, dueDate: due, washes: state.corredino?.washes ?? 3,
      dryer: state.corredino?.dryer ?? false, bought: state.corredino?.bought ?? {}, lang,
    });
    const loc = localeOf(lang);
    return {
      c,
      basis: `~${Math.round(analysis.lengthTerm.cm)} cm · ~${grams(Math.round(analysis.term.efw / 10) * 10, lang)} g`,
      dueShort: due.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    };
  }, [analysis, state.referenceDate, state.corredino, ga, gaValid, lang, birthDate]);
}

const SEASON_ICON: Record<Season, IconName> = { winter: 'snow', spring: 'flower', summer: 'sun', autumn: 'leaf' };

/** Corredino AI (M11 / M12 / D07): quanti capi, perche', e quanti ne hai gia'. */
export function CorredinoTab() {
  const { state, dispatch, lang } = useNasciTara();
  const { born } = useFamily();
  const it = lang === 'it';
  const { c, basis, dueShort } = useCorredino();
  const [open, setOpen] = useState<string | null>(null);
  const { toast } = useFeedback();
  if (!c) {
    return (
      <main className="nt-wrap nt-main nt-narrow">
        <div className="nt-card nt-card--pink"><div className="nt-eyebrow">Corredino AI</div><p className="nt-body">{it ? 'Si sblocca con la prima stima: aggiungi un’ecografia completa.' : 'It unlocks with your first estimate: add a complete scan.'}</p></div>
      </main>
    );
  }
  const washes = state.corredino?.washes ?? 3;
  const dryer = state.corredino?.dryer ?? false;
  const groups = [...c.columns, c.accessories];
  const pct = (a: number, b: number) => `${Math.round((a / Math.max(b, 1)) * 100)}%`;
  const days = String(Math.round(c.cycleDays * 10) / 10).replace('.', it ? ',' : '.');
  const setHave = (key: string, value: number) => dispatch({ type: 'setBought', key, value });
  const share = async () => {
    const text = corredinoText(c, lang);
    try {
      if (navigator.share) await navigator.share({ title: it ? 'Corredino NasciTara' : 'NasciTara layette', text });
      else {
        await navigator.clipboard.writeText(text);
        toast(it ? 'Lista copiata negli appunti.' : 'List copied to the clipboard.');
      }
    } catch {
      /* Share sheet closed. */
    }
  };
  const summary = (
    <div className="nt-card nt-cor-sum">
      <div className="nt-cor-head">
        <Ring value={c.have} total={c.total} size={84} />
        <div className="nt-grow">
          <div className="nt-eyebrow">{it ? 'Primi 3 mesi' : 'First 3 months'}</div>
          <div className="nt-cor-head__title">{it ? `${c.have} di ${c.total} capi pronti` : `${c.have} of ${c.total} items ready`}</div>
          <div className="nt-row__meta">{basis}</div>
        </div>
      </div>
      <div className="nt-cor-wash">
        <span><Icon name="washer" size={18} />{it ? 'Lavatrici a settimana' : 'Washes per week'}</span>
        <Segmented label={it ? 'Lavatrici a settimana' : 'Washes per week'} size="sm" value={String(washes) as '2' | '3' | '4'} options={[['2', '2'], ['3', '3'], ['4', '4+']]} onChange={(v) => dispatch({ type: 'setWashes', value: Number(v) as Washes })} />
      </div>
      <div className="nt-cor-wash">
        <span><Icon name="dryer" size={18} />{it ? 'Asciugatrice' : 'Dryer'}</span>
        <Segmented label={it ? 'Asciugatrice' : 'Dryer'} size="sm" value={dryer ? 'yes' : 'no'} options={[['yes', it ? 'Sì' : 'Yes'], ['no', 'No']]} onChange={(v) => dispatch({ type: 'setDryer', value: v === 'yes' })} />
      </div>
      <details className="nt-how">
        <summary><Icon name="info" size={16} />{it ? 'Come calcoliamo' : 'How we count'}</summary>
        <p className="nt-body">{it ? `Cambi al giorno × ${days} giorni tra un lavaggio e l’altro, + 1 di scorta sui capi base. Taglie sulla crescita attesa: ~1 cm a settimana. Una taglia usata meno di 3 settimane riceve metà scorta.` : `Changes per day × ${days} days between washes, + 1 spare on everyday basics. Sizes follow expected growth (~1 cm a week); a size worn under 3 weeks gets half the stock.`}</p>
      </details>
    </div>
  );
  const seasonCard = (
    <div className="nt-card nt-card--pink nt-season">
      <IconBubble name={SEASON_ICON[c.columns[0]?.season ?? 'autumn']} tone="white" />
      <div className="nt-grow nt-stack6">
        <div className="nt-spread"><span className="nt-eyebrow">{it ? 'Stagione' : 'Season'}</span><span className="nt-small">{born ? (it ? 'Nato il' : 'Born') : it ? 'Parto' : 'Due'} {born ? '' : '~'}{dueShort}</span></div>
        <div className="nt-h3">{c.seasonHeadline}</div>
        <p className="nt-body">{c.advice}</p>
        <div className="nt-chips">{c.materials.map((m) => <span key={m} className="nt-chip">{m}</span>)}</div>
      </div>
    </div>
  );
  const counter = (item: Group['items'][number]) => (
    <div className="nt-counter" role="group" aria-label={item.name}>
      <button type="button" aria-label={it ? `Un ${item.name} in meno` : `One less ${item.name}`} disabled={item.have <= 0} onClick={() => setHave(item.key, item.have - 1)}>−</button>
      <output><b className={item.have >= item.qty ? 'nt-brandtext' : undefined}>{item.have}</b><span>/{item.qty}</span></output>
      <button type="button" className="is-plus" aria-label={it ? `Un ${item.name} in più` : `One more ${item.name}`} disabled={item.have >= item.qty} onClick={() => setHave(item.key, item.have + 1)}>+</button>
    </div>
  );
  const items = (g: Group) => (
    <div className="nt-rows">
      {g.items.map((item) => (
        <div key={item.key} className={`nt-garment${item.have >= item.qty ? ' is-done' : ''}`}>
          <span className="nt-garment__icon">{item.have >= item.qty ? <span className="nt-garment__ok"><Icon name="check" size={14} /></span> : null}<GarmentGlyph icon={item.icon} /></span>
          <span className="nt-row__body"><span className="nt-row__title">{item.name}</span><span className="nt-row__meta">{item.material}</span></span>
          {counter(item)}
        </div>
      ))}
    </div>
  );
  const groupCard = (g: Group) => (
    <button key={g.id} type="button" className="nt-gcard nt-pop" onClick={() => setOpen(g.id)}>
      <span className="nt-gcard__size">{g.tile}</span>
      <span className="nt-row__body">
        <span className="nt-row__title">{g.rowTitle}</span>
        <span className="nt-gcard__icons">{g.items.slice(0, 4).map((i) => <span key={i.key}><GarmentGlyph icon={i.icon} /></span>)}</span>
        <span className="nt-meter nt-meter--pink"><i style={{ width: pct(g.have, g.total) }} /></span>
      </span>
      {g.have >= g.total ? <IconBubble name="check" tone="brand" size={32} /> : <Icon name="chevron" className="nt-chev" />}
    </button>
  );
  const active = groups.find((g) => g.id === open);
  return (
    <main className="nt-wrap nt-main nt-cor">
      <div className="nt-mob nt-stack">
        {active ? (
          <>
            <div className="nt-editor-head">
              <button type="button" className="nt-round" aria-label={it ? 'Indietro' : 'Back'} onClick={() => setOpen(null)}>←</button>
              <h1 className="nt-h3 nt-grow">{active.title}</h1>
              <button type="button" className="nt-round" aria-label={it ? 'Condividi la lista' : 'Share the list'} onClick={() => void share()}><ShareIcon /></button>
            </div>
            <Segmented label={it ? 'Gruppo' : 'Group'} variant="brand" size="sm" value={active.id} options={groups.map((g) => [g.id, g.tab] as [string, string])} onChange={setOpen} />
            <div className="nt-card nt-recap">
              <IconBubble name={active.season ? SEASON_ICON[active.season] : 'hanger'} />
              <div className="nt-grow"><div className="nt-eyebrow">{active.infoTop}</div><div className="nt-row__meta">{active.infoSub}</div></div>
              <Ring value={active.have} total={active.total} size={52} />
            </div>
            <p className="nt-note">{it ? 'Usa + e − per segnare quanti pezzi hai già.' : 'Use + and − to track how many you already have.'}</p>
            {items(active)}
          </>
        ) : (
          <>
            {summary}
            {seasonCard}
            <div className="nt-rows">{groups.map(groupCard)}</div>
            <button type="button" className="nt-btn nt-btn--soft nt-btn--block" onClick={() => void exportCorredinoPdf(c, lang, basis)}>{it ? 'Scarica lista PDF' : 'Download PDF list'}</button>
          </>
        )}
      </div>
      <div className="nt-desk nt-cor__grid">
        <aside className="nt-stack">
          {summary}
          {seasonCard}
          <div className="nt-cor__actions">
            <button type="button" className="nt-btn nt-btn--block" onClick={() => void exportCorredinoPdf(c, lang, basis)}>{it ? 'Scarica lista PDF' : 'Download PDF list'}</button>
            <button type="button" className="nt-round" aria-label={it ? 'Condividi la lista' : 'Share the list'} onClick={() => void share()}><ShareIcon /></button>
          </div>
        </aside>
        <div className="nt-stack">
          <div className="nt-cor__cols">
            {c.columns.map((col) => (
              <section key={col.id} className="nt-cor__col">
                <div className="nt-spread nt-start">
                  <div className="nt-grow"><div className="nt-eyebrow"><Icon name={col.season ? SEASON_ICON[col.season] : 'hanger'} size={14} /> {col.infoTop}</div><div className="nt-cor__size">{col.title}</div><div className="nt-row__meta">{col.infoSub}</div></div>
                  <Ring value={col.have} total={col.total} size={52} />
                </div>
                {items(col)}
              </section>
            ))}
          </div>
          <section className="nt-cor__col nt-cor__acc">
            <div className="nt-spread nt-end">
              <div><div className="nt-eyebrow">{c.accessories.infoTop}</div><div className="nt-cor__size">{c.accessories.title}</div></div>
              <Ring value={c.accessories.have} total={c.accessories.total} size={52} />
            </div>
            {items(c.accessories)}
          </section>
        </div>
      </div>
    </main>
  );
}
