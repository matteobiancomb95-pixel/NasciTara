import { useMemo, useState } from 'react';
import { useNasciTara, type ScanState, type Washes } from '../state/NasciTaraStore';
import { buildCorredino, corredinoText, type Corredino, type Group } from '../lib/corredino';
import { exportCorredinoPdf } from '../lib/corredinoPdf';
import { estimatedDueDate, formatGA, toISO, todayUTC } from '../lib/gestationalAge';
import { localeOf } from '../i18n';
import { Segmented, Sheet, grams } from '../ui/kit';
import { DresserIcon, Fetus, GarmentGlyph, ShareIcon } from '../ui/art';
import { ScanEditor, MEASURES } from './ScanEditor';
import { useScanRows } from './Journey';

const BAR = ['#ffa0ae', '#ff395c', '#c81e45', '#333333'];

/** Home (M08 / D05): a che punto e', il bebè oggi e alla nascita, il corredino. */
export function HomeTab({ firstName, onCorredino }: { firstName: string; onCorredino: () => void }) {
  const { analysis, state, dispatch, ga, gaValid, lang } = useNasciTara();
  const it = lang === 'it';
  const rows = useScanRows();
  const { c } = useCorredino();
  const [adding, setAdding] = useState(false);
  const loc = localeOf(lang);
  const g = (v: number) => grams(v, lang);
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const week = gaValid ? Math.floor(ga) : null;
  const daysLeft = due ? Math.max(0, Math.round((due.getTime() - todayUTC().getTime()) / 864e5)) : null;
  const trimester = week === null ? '' : week < 14 ? '1°' : week < 28 ? '2°' : '3°';
  const dueShort = due?.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }) ?? '—';
  const boy = state.babySex === 'male';
  const sexLabel = state.babySex === 'female' ? (it ? 'È una femmina' : 'It’s a girl') : boy ? (it ? 'È un maschio' : 'It’s a boy') : it ? 'Maschio o femmina?' : 'Boy or girl?';
  const nextSex = state.babySex === 'female' ? 'male' : 'female';
  const dated = rows.filter((r) => r.scan.date);
  const last = dated[dated.length - 1];
  const lastShort = last ? new Date(last.scan.date + 'T12:00:00Z').toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  const term = analysis ? g(Math.round(analysis.term.efw / 10) * 10) : '—';
  const save = (scan: ScanState) => {
    dispatch({ type: 'saveScan', scan });
    setAdding(false);
  };
  const tile = (label: string, value: string, extra?: string) => (
    <div className="nt-home__tile"><div className="nt-eyebrow">{label}</div><div className="nt-home__value">{value}{extra ? <small> {extra}</small> : null}</div></div>
  );
  return (
    <main className="nt-wrap nt-main nt-home">
      <div className="nt-home__grid">
        <section className="nt-home__hero">
          <div className="nt-spread nt-start">
            <div>
              <h1 className="nt-home__hello">{it ? `Ciao${firstName ? ' ' + firstName : ''}` : `Hi${firstName ? ' ' + firstName : ''}`}</h1>
              {week !== null ? (
                <p className="nt-sub">
                  {it ? `${week}ª settimana · mancano ${daysLeft} giorni` : `Week ${week} · ${daysLeft} days to go`}
                  <span className="nt-desk-inline">{it ? ' al parto' : ''}</span>
                </p>
              ) : null}
            </div>
            <button type="button" className="nt-sex" onClick={() => dispatch({ type: 'setBabySex', value: nextSex })} title={it ? 'Cambia' : 'Change'}>{sexLabel}</button>
          </div>
          <div className="nt-home__stage">
            <Fetus size={420} boy={boy} label={it ? 'Il tuo bebè nel pancione' : 'Your baby in the womb'} />
            {analysis ? (
              <>
                <div className="nt-home__badge nt-home__badge--tl nt-mob"><div className="nt-eyebrow">{it ? 'Oggi' : 'Today'}</div><b>{g(analysis.now.efw)} g</b></div>
                <div className="nt-home__badge nt-home__badge--br nt-mob"><div className="nt-eyebrow">{it ? 'Lunghezza' : 'Length'}</div><b>~{Math.round(analysis.lengthNow.cm)} cm</b></div>
              </>
            ) : null}
          </div>
          {analysis ? (
            <div className="nt-home__today nt-desk">
              <div className="nt-home__tile nt-home__tile--white"><div className="nt-eyebrow">{it ? 'Peso oggi' : 'Weight today'}</div><div className="nt-home__value nt-brandtext">{g(analysis.now.efw)} g</div></div>
              <div className="nt-home__tile nt-home__tile--white"><div className="nt-eyebrow">{it ? 'Lunghezza oggi' : 'Length today'}</div><div className="nt-home__value">~{Math.round(analysis.lengthNow.cm)} cm</div></div>
              <div className="nt-home__tile nt-home__tile--white"><div className="nt-eyebrow">Percentile</div><div className="nt-home__value">{Math.round(analysis.now.pct)}°</div></div>
            </div>
          ) : null}
        </section>
        <section className="nt-stack">
          {week !== null ? (
            <div className="nt-card nt-trimester">
              <div className="nt-spread"><span className="nt-eyebrow">{it ? `${trimester} trimestre` : `${trimester} trimester`}</span><span className="nt-trimester__count"><b>{week}</b>/40 {it ? 'sett.' : 'wk'}</span></div>
              <div className="nt-meter nt-meter--lg"><i style={{ width: `${Math.min(100, Math.round((week / 40) * 100))}%` }} /></div>
              <div className="nt-trimester__legend"><span>{it ? '1° trim.' : '1st tri.'}</span><span>{it ? '2° trim.' : '2nd tri.'}</span><span>{it ? '3° trim.' : '3rd tri.'}</span><span>{it ? 'Parto' : 'Due'} {dueShort}</span></div>
            </div>
          ) : null}
          <div className="nt-home__tiles">
            {tile(it ? 'Alla nascita' : 'At birth', `~${term} g`)}
            {tile(it ? 'Lunghezza' : 'Length', analysis ? `~${Math.round(analysis.lengthTerm.cm)} cm` : '—')}
            <span className="nt-mob-contents">{tile('Percentile', analysis ? `${Math.round(analysis.now.pct)}°` : '—')}</span>
            <span className="nt-desk-contents">{tile(it ? 'Parto previsto' : 'Due date', dueShort)}</span>
            {tile(it ? 'Ecografie' : 'Scans', String(rows.length), lastShort ? (it ? `· ultima ${lastShort}` : `· last ${lastShort}`) : undefined)}
          </div>
          {c ? (
            <button type="button" className="nt-home__cor" onClick={onCorredino}>
              <span className="nt-home__dresser"><DresserIcon size={46} /></span>
              <span className="nt-row__body">
                <span className="nt-eyebrow">Corredino AI</span>
                <span className="nt-home__cortitle">{it ? `${c.have}/${c.total} capi pronti` : `${c.have}/${c.total} items ready`}</span>
                <span className="nt-meter nt-meter--white"><i style={{ width: `${Math.round((c.have / Math.max(c.total, 1)) * 100)}%` }} /></span>
                <span className="nt-row__meta nt-desk">{it ? 'Taglie' : 'Sizes'} {c.sizes.join(' · ')} · {c.seasonHeadline}</span>
              </span>
              <span className="nt-home__go" aria-hidden="true"><span className="nt-mob">→</span><span className="nt-desk nt-btn nt-btn--sm">{it ? 'Continua' : 'Continue'}</span></span>
            </button>
          ) : null}
          <button type="button" className="nt-row nt-home__new" onClick={() => setAdding(true)}>
            <span className="nt-badge nt-badge--lg">+</span>
            <span className="nt-row__body"><span className="nt-row__title">{it ? 'Nuova ecografia?' : 'New scan?'}</span><span className="nt-row__meta">{it ? 'Aggiungila per aggiornare stima e corredino' : 'Add it to update the estimate and layette'}</span></span>
          </button>
        </section>
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} labelClose={it ? 'Chiudi' : 'Close'} title={it ? `Ecografia ${rows.length + 1}` : `Scan ${rows.length + 1}`} subtitle={it ? 'Nuova ecografia' : 'New scan'}>
        <ScanEditor key={adding ? 'new' : 'none'} compact number={rows.length + 1} onSave={save} />
      </Sheet>
    </main>
  );
}

export function BabyTab() {
  const { analysis, state, dispatch, ga, gaValid, lang } = useNasciTara();
  const it = lang === 'it';
  const rows = useScanRows();
  const [edit, setEdit] = useState<string | null>(null);
  const loc = localeOf(lang);
  const g = (v: number) => grams(v, lang);
  const editing = rows.find((r) => r.scan.id === edit);
  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  // The estimate is computed at the reference date: it says "today" only when it really is today.
  const ref = new Date(state.referenceDate + 'T12:00:00Z');
  const isToday = state.referenceDate === toISO(todayUTC());
  const today = ref.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const todayLong = ref.toLocaleDateString(loc, { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const complete = rows.filter((r) => r.result);
  const term = analysis?.term.efw ?? 0;
  const bars = analysis
    ? [...complete.map((r) => ({ w: g(r.result!.efw), l: `${Math.floor(r.ga)} ${it ? 'sett.' : 'wk'}`, h: r.result!.efw / term, ghost: false })), { w: `~${g(Math.round(term / 10) * 10)}`, l: it ? 'nascita' : 'birth', h: 1, ghost: true }]
    : [];
  const save = (scan: ScanState) => {
    dispatch({ type: 'saveScan', scan });
    setEdit(null);
  };
  const scanNumber = editing ? rows.indexOf(editing) + 1 : rows.length + 1;
  return (
    <main className="nt-wrap nt-main nt-baby">
      <div className="nt-baby__grid">
        <div className="nt-stack">
          {analysis ? (
            <div className="nt-card nt-card--pink nt-latest">
              <span className="nt-bubble" style={{ right: -40, top: -40, width: 150, height: 150 }} />
              <div className="nt-latest__main">
                <div className="nt-eyebrow">{isToday ? (it ? 'Stima di oggi · ' : 'Today’s estimate · ') : it ? 'Stima al ' : 'Estimate on '}<span className="nt-mob">{today}</span><span className="nt-desk">{todayLong}</span></div>
                <div className="nt-latest__num">{g(analysis.now.efw)}<small> g</small><span className="nt-mob nt-latest__pc">{Math.round(analysis.now.pct)}° pc</span></div>
                <div className="nt-desk nt-latest__line"><b>{Math.round(analysis.now.pct)}°</b> percentile · {formatGA(analysis.ga)} {it ? 'settimane' : 'weeks'}</div>
                <div className="nt-mob nt-chips">
                  <span className="nt-pill nt-pill--sm">{formatGA(analysis.ga)} {it ? 'sett.' : 'wk'}</span>
                  <span className="nt-pill nt-pill--sm">{it ? 'Nascita' : 'Birth'} ~{g(Math.round(term / 10) * 10)} g · {Math.round(analysis.lengthTerm.cm)} cm</span>
                </div>
              </div>
              <div className="nt-desk nt-latest__boxes">
                <div><b className="nt-eyebrow">{it ? 'Nascita' : 'Birth'}</b><span>~{g(Math.round(term / 10) * 10)} g</span></div>
                <div><b className="nt-eyebrow">{it ? 'Lunghezza' : 'Length'}</b><span>~{Math.round(analysis.lengthTerm.cm)} cm</span></div>
                <div><b className="nt-eyebrow">{it ? 'Parto' : 'Due'}</b><span>{due?.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span></div>
              </div>
            </div>
          ) : (
            <div className="nt-card nt-card--pink">
              <div className="nt-eyebrow">{it ? 'Stima non disponibile' : 'No estimate yet'}</div>
              <p className="nt-body">{it ? 'Serve almeno un’ecografia con data e tutte e 4 le misure.' : 'At least one scan with date and all 4 values is needed.'}</p>
            </div>
          )}
          {analysis ? (
            <div className="nt-card nt-growthbars">
              <div className="nt-spread"><div className="nt-eyebrow">{it ? 'Crescita stimata' : 'Estimated growth'}</div><span className="nt-note nt-desk">{it ? 'peso in grammi' : 'weight in grams'}</span></div>
              <div className="nt-bars">
                {bars.map((b, i) => (
                  <div key={i}>
                    <b>{b.w}</b>
                    <i className={b.ghost ? 'is-ghost' : undefined} style={{ height: `${Math.max(6, b.h * 100)}%` }} />
                    <span>{b.l}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <section className="nt-stack">
          <div className="nt-spread">
            <h2 className="nt-h3">{it ? 'Misurazioni' : 'Measurements'}</h2>
            <button type="button" className="nt-link nt-mob" onClick={() => setEdit('new')}>{it ? '+ Aggiungi' : '+ Add'}</button>
            <span className="nt-note nt-desk">{rows.length} {it ? (rows.length === 1 ? 'ecografia' : 'ecografie') : rows.length === 1 ? 'scan' : 'scans'}</span>
          </div>
          <div className="nt-rows">
            {rows.map((r, i) => (
              <div key={r.scan.id} className="nt-mcard">
                <div className="nt-mcard__head">
                  <span className="nt-badge">{i + 1}</span>
                  <div className="nt-row__body">
                    <div className="nt-row__title">{r.label}</div>
                    <div className="nt-row__meta">
                      <span className="nt-mob">{r.result ? `${g(r.result.efw)} g · ` : ''}</span>
                      {r.src}
                    </div>
                  </div>
                  {r.result ? <span className="nt-mcard__w nt-desk">{g(r.result.efw)} g</span> : null}
                  <button type="button" className="nt-link nt-mob" onClick={() => setEdit(r.scan.id)}>{it ? 'Modifica' : 'Edit'}</button>
                </div>
                <div className="nt-measures nt-measures--4 nt-desk">
                  {MEASURES.map((m) => <div key={m.key} className="nt-measure"><b>{m.key}</b><span>{r.scan[m.field] === '' ? '—' : r.scan[m.field]}</span></div>)}
                </div>
                <div className="nt-mcard__actions nt-desk">
                  <button type="button" className="nt-link" onClick={() => setEdit(r.scan.id)}>{it ? 'Modifica' : 'Edit'}</button>
                  {r.scan.source !== 'report' ? <button type="button" className="nt-link" onClick={() => setEdit(r.scan.id)}>{it ? '+ Aggiungi referto' : '+ Add report'}</button> : null}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="nt-btn nt-btn--block nt-desk" onClick={() => setEdit('new')}>{it ? '+ Aggiungi ecografia' : '+ Add scan'}</button>
        </section>
      </div>
      <Sheet open={edit !== null} onClose={() => setEdit(null)} labelClose={it ? 'Chiudi' : 'Close'}
        title={it ? `Ecografia ${scanNumber}` : `Scan ${scanNumber}`}
        subtitle={editing ? editing.label : it ? 'Nuova ecografia' : 'New scan'}>
        <ScanEditor key={edit ?? 'none'} compact initial={editing?.scan} number={scanNumber} onSave={save}
          onDelete={editing ? () => { if (window.confirm(it ? 'Eliminare questa ecografia?' : 'Delete this scan?')) { dispatch({ type: 'removeScan', id: editing.scan.id }); setEdit(null); } } : undefined} />
      </Sheet>
    </main>
  );
}

export function useCorredino(): { c: Corredino | null; basis: string; dueShort: string } {
  const { analysis, state, ga, gaValid, lang } = useNasciTara();
  return useMemo(() => {
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
  }, [analysis, state.referenceDate, state.corredino, ga, gaValid, lang]);
}

/** Corredino AI (M11 / M12 / D07): quanti capi, perche', e quanti ne hai gia'. */
export function CorredinoTab() {
  const { analysis, state, dispatch, lang } = useNasciTara();
  const it = lang === 'it';
  const { c, basis, dueShort } = useCorredino();
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  if (!c || !analysis) {
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
        setMsg(it ? 'Lista copiata negli appunti.' : 'List copied to the clipboard.');
      }
    } catch {
      /* Share sheet closed. */
    }
  };
  const summary = (
    <div className="nt-card nt-cor-sum">
      <div className="nt-spread"><span className="nt-eyebrow">{it ? 'Capi · 0–3 mesi' : 'Items · 0–3 months'}</span><span className="nt-note nt-mob">{basis}</span></div>
      <div className="nt-cor-total"><span>{c.total}</span> <em className="nt-mob-inline">{it ? 'capi' : 'items'}</em><small>{c.have} {it ? 'già presi' : 'already got'}</small></div>
      <div className="nt-bar3" aria-hidden="true">{groups.map((g, i) => <i key={g.id} style={{ flex: g.total, background: BAR[i] }} />)}</div>
      <div className="nt-cor-wash">
        <span>{it ? 'Lavatrici a settimana' : 'Washes per week'}</span>
        <Segmented label={it ? 'Lavatrici a settimana' : 'Washes per week'} size="sm" value={String(washes) as '2' | '3' | '4'} options={[['2', '2'], ['3', '3'], ['4', '4+']]} onChange={(v) => dispatch({ type: 'setWashes', value: Number(v) as Washes })} />
      </div>
      <div className="nt-cor-wash">
        <span>{it ? 'Asciugatrice' : 'Dryer'}</span>
        <Segmented label={it ? 'Asciugatrice' : 'Dryer'} size="sm" value={dryer ? 'yes' : 'no'} options={[['yes', it ? 'Sì' : 'Yes'], ['no', 'No']]} onChange={(v) => dispatch({ type: 'setDryer', value: v === 'yes' })} />
      </div>
    </div>
  );
  const how = (
    <div className="nt-card nt-card--tint nt-stack4">
      <div className="nt-eyebrow">{it ? 'Come calcoliamo' : 'How we count'}</div>
      <p className="nt-body">{it ? <>Cambi al giorno × <b>{days} giorni</b> tra un lavaggio e l’altro, + 1 di scorta sui capi base.</> : <>Changes per day × <b>{days} days</b> between washes, + 1 spare on everyday basics.</>}</p>
      <p className="nt-note">{it ? `Taglie sulla crescita attesa: ~1 cm a settimana da ${Math.round(analysis.lengthTerm.cm)} cm. Una taglia usata meno di 3 settimane riceve metà scorta.` : `Sizes follow expected growth: ~1 cm a week from ${Math.round(analysis.lengthTerm.cm)} cm. A size worn under 3 weeks gets half the stock.`}</p>
    </div>
  );
  const season = (
    <div className="nt-card nt-card--pink nt-stack6">
      <div className="nt-spread"><span className="nt-eyebrow">{it ? 'Stagione' : 'Season'}</span><span className="nt-small">{it ? 'Parto' : 'Due'} ~{dueShort}</span></div>
      <div className="nt-h3">{c.seasonHeadline}</div>
      <p className="nt-body">{c.advice}</p>
      <div className="nt-chips">{c.materials.map((m) => <span key={m} className="nt-chip">{m}</span>)}</div>
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
          <span className="nt-garment__icon"><GarmentGlyph icon={item.icon} /></span>
          <span className="nt-row__body"><span className="nt-row__title">{item.name}</span><span className="nt-row__meta">{item.material}</span></span>
          {counter(item)}
        </div>
      ))}
    </div>
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
            <div className="nt-spread nt-end">
              <div className="nt-grow"><div className="nt-eyebrow">{active.infoTop}</div><div className="nt-row__meta nt-bigger">{active.infoSub}</div></div>
              <div className="nt-count"><b>{active.have}</b>/{active.total}</div>
            </div>
            <div className="nt-meter"><i style={{ width: pct(active.have, active.total) }} /></div>
            <p className="nt-note">{it ? 'Usa + e − per segnare quanti pezzi hai già.' : 'Use + and − to track how many you already have.'}</p>
            {items(active)}
          </>
        ) : (
          <>
            {summary}
            {how}
            {season}
            <div className="nt-rows">
              {groups.map((g) => (
                <button key={g.id} type="button" className="nt-row" onClick={() => setOpen(g.id)}>
                  <span className="nt-badge nt-badge--lg">{g.tile}</span>
                  <span className="nt-row__body"><span className="nt-row__title">{g.rowTitle}</span><span className="nt-row__meta">{g.rowSub}</span></span>
                  <span className="nt-row__title nt-nowrap"><span className="nt-brandtext">{g.have}</span>/{g.total} →</span>
                </button>
              ))}
            </div>
            <button type="button" className="nt-btn nt-btn--soft nt-btn--block" onClick={() => void exportCorredinoPdf(c, lang, basis)}>{it ? 'Scarica lista PDF' : 'Download PDF list'}</button>
          </>
        )}
        {msg ? <p className="nt-ok" role="status">{msg}</p> : null}
      </div>
      <div className="nt-desk nt-cor__grid">
        <aside className="nt-stack">
          {summary}
          {how}
          {season}
          <div className="nt-cor__actions">
            <button type="button" className="nt-btn nt-btn--block" onClick={() => void exportCorredinoPdf(c, lang, basis)}>{it ? 'Scarica lista PDF' : 'Download PDF list'}</button>
            <button type="button" className="nt-round" aria-label={it ? 'Condividi la lista' : 'Share the list'} onClick={() => void share()}><ShareIcon /></button>
          </div>
          {msg ? <p className="nt-ok" role="status">{msg}</p> : null}
        </aside>
        <div className="nt-stack">
          <div className="nt-cor__cols">
            {c.columns.map((col) => (
              <section key={col.id} className="nt-cor__col">
                <div className="nt-spread nt-start">
                  <div className="nt-grow"><div className="nt-eyebrow">{col.infoTop}</div><div className="nt-cor__size">{col.title}</div><div className="nt-row__meta">{col.infoSub}</div></div>
                  <div className="nt-count"><b>{col.have}</b>/{col.total}</div>
                </div>
                <div className="nt-meter nt-meter--pink"><i style={{ width: pct(col.have, col.total) }} /></div>
                {items(col)}
              </section>
            ))}
          </div>
          <section className="nt-cor__col nt-cor__acc">
            <div className="nt-spread nt-end">
              <div><div className="nt-eyebrow">{c.accessories.infoTop}</div><div className="nt-cor__size">{c.accessories.title}</div></div>
              <div className="nt-count"><b>{c.accessories.have}</b>/{c.accessories.total}</div>
            </div>
            <div className="nt-meter nt-meter--pink"><i style={{ width: pct(c.accessories.have, c.accessories.total) }} /></div>
            {items(c.accessories)}
          </section>
        </div>
      </div>
    </main>
  );
}
