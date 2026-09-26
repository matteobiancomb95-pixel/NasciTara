import { useMemo, useState } from 'react';
import { useNasciTara, type ScanState, type Washes } from '../state/NasciTaraStore';
import { buildCorredino, corredinoText, type Corredino } from '../lib/corredino';
import { exportCorredinoPdf } from '../lib/corredinoPdf';
import { estimatedDueDate, formatGA, toISO, todayUTC } from '../lib/gestationalAge';
import { localeOf } from '../i18n';
import { Avatar, Logo, Segmented, Sheet, grams } from '../ui/kit';
import { ScanEditor, MEASURES } from './ScanEditor';
import { useScanRows } from './Journey';

type Tab = 'baby' | 'corredino';
const BAR = ['#ffa0ae', '#ff395c', '#c81e45'];

/** Area riservata: dopo il percorso si atterra qui. */
export function Area({ firstName, fullName, onAccount }: { firstName: string; fullName: string; onAccount: () => void }) {
  const { lang } = useNasciTara();
  const it = lang === 'it';
  const [tab, setTab] = useState<Tab>('baby');
  const tabs = (
    <nav className="nt-steps nt-steps--area" aria-label={it ? 'Area riservata' : 'Private area'}>
      {(['baby', 'corredino'] as Tab[]).map((k) => (
        <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
          {k === 'baby' ? (it ? 'Il tuo bebè' : 'Your baby') : 'Corredino AI'}
        </button>
      ))}
    </nav>
  );
  const label = it ? 'Il tuo account' : 'Your account';
  return (
    <div className="nt-screen nt-area">
      <header className="nt-top">
        <Logo />
        <span className="nt-desk">{tabs}</span>
        <div className="nt-top__side">
          <span className="nt-mob"><Avatar name={firstName || fullName} onClick={onAccount} label={label} /></span>
          <span className="nt-desk"><Avatar name={firstName || fullName} onClick={onAccount} label={label} withName={fullName || firstName} /></span>
        </div>
      </header>
      <div className="nt-wrap nt-mob nt-steps-wrap">{tabs}</div>
      {tab === 'baby' ? <BabyTab /> : <CorredinoTab />}
    </div>
  );
}

function BabyTab() {
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

function useCorredino(): { c: Corredino | null; basis: string; dueShort: string } {
  const { analysis, state, ga, gaValid, lang } = useNasciTara();
  return useMemo(() => {
    if (!analysis || !gaValid) return { c: null, basis: '', dueShort: '' };
    const due = estimatedDueDate(state.referenceDate, ga) ?? new Date();
    const c = buildCorredino({ birthLengthCm: analysis.lengthTerm.cm, dueDate: due, washes: state.corredino?.washes ?? 3, checked: state.corredino?.checked ?? [], lang });
    const loc = localeOf(lang);
    return {
      c,
      basis: `~${Math.round(analysis.lengthTerm.cm)} cm · ~${grams(Math.round(analysis.term.efw / 10) * 10, lang)} g`,
      dueShort: due.toLocaleDateString(loc, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    };
  }, [analysis, state.referenceDate, state.corredino, ga, gaValid, lang]);
}

function CorredinoTab() {
  const { state, dispatch, lang } = useNasciTara();
  const it = lang === 'it';
  const { c, basis, dueShort } = useCorredino();
  const [size, setSize] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  if (!c) {
    return (
      <main className="nt-wrap nt-main nt-narrow">
        <div className="nt-card nt-card--pink"><div className="nt-eyebrow">Corredino AI</div><p className="nt-body">{it ? 'Si sblocca con la prima stima: aggiungi un’ecografia completa.' : 'It unlocks with your first estimate: add a complete scan.'}</p></div>
      </main>
    );
  }
  const washes = state.corredino?.washes ?? 3;
  const toggle = (key: string) => dispatch({ type: 'toggleGarment', key });
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
      <div className="nt-cor-total"><span>{c.total}</span> {it ? 'capi' : 'items'}</div>
      <div className="nt-bar3" aria-hidden="true">{c.columns.map((col, i) => <i key={col.size} style={{ flex: col.total, background: BAR[i] }} />)}</div>
      <div className="nt-cor-wash">
        <span>{it ? 'Lavatrici a settimana' : 'Washes per week'}</span>
        <Segmented label={it ? 'Lavatrici a settimana' : 'Washes per week'} size="sm" value={String(washes) as '2' | '3' | '4'} options={[['2', '2'], ['3', '3'], ['4', '4+']]} onChange={(v) => dispatch({ type: 'setWashes', value: Number(v) as Washes })} />
      </div>
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
  const list = (col: Corredino['columns'][number]) => (
    <div className="nt-rows">
      {col.items.map((item) => (
        <button key={item.key} type="button" className={`nt-garment${item.done ? ' is-done' : ''}`} aria-pressed={item.done} onClick={() => toggle(item.key)}>
          <span className="nt-badge nt-badge--lg">×{item.qty}</span>
          <span className="nt-row__body"><span className="nt-row__title">{item.name}</span><span className="nt-row__meta">{item.material}</span></span>
          <span className="nt-tick" aria-hidden="true">{item.done ? '✓' : ''}</span>
        </button>
      ))}
    </div>
  );
  const month = (i: number) => (it ? `${i + 1}° mese` : `Month ${i + 1}`);
  const active = c.columns.find((col) => col.size === size);
  return (
    <main className="nt-wrap nt-main nt-cor">
      <div className="nt-mob nt-stack">
        {active ? (
          <>
            <div className="nt-editor-head">
              <button type="button" className="nt-round nt-round--sm" aria-label={it ? 'Indietro' : 'Back'} onClick={() => setSize(null)}>←</button>
              <h1 className="nt-h3 nt-grow">{it ? 'Taglia' : 'Size'} {active.size}</h1>
              <button type="button" className="nt-link" onClick={() => void share()}>{it ? 'Condividi' : 'Share'}</button>
            </div>
            <Segmented label={it ? 'Taglia' : 'Size'} variant="brand" value={String(active.size)} options={c.columns.map((col) => [String(col.size), `Tg ${col.size}`] as [string, string])} onChange={(v) => setSize(Number(v))} />
            <div className="nt-spread nt-end">
              <div><div className="nt-eyebrow">{month(active.index)} · {active.seasonLabel}</div><div className="nt-row__meta nt-bigger">{active.range} · {active.monthName}</div></div>
              <div className="nt-count"><b>{active.done}</b>/{active.total}</div>
            </div>
            <div className="nt-meter"><i style={{ width: `${Math.round((active.done / active.total) * 100)}%` }} /></div>
            {list(active)}
          </>
        ) : (
          <>
            {summary}
            {season}
            <div className="nt-rows">
              {c.columns.map((col) => (
                <button key={col.size} type="button" className="nt-row" onClick={() => setSize(col.size)}>
                  <span className="nt-badge nt-badge--lg">{col.size}</span>
                  <span className="nt-row__body"><span className="nt-row__title">{month(col.index)} · {col.monthName}</span><span className="nt-row__meta">{col.seasonLabel} · {col.range}</span></span>
                  <span className="nt-row__title">{col.done ? `${col.done}/` : ''}{col.total} →</span>
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
          {season}
          <p className="nt-card nt-card--tint nt-body">{it ? <>Basato su <b>{basis}</b>. Si aggiorna quando aggiungi un’ecografia.</> : <>Based on <b>{basis}</b>. It updates when you add a scan.</>}</p>
          <button type="button" className="nt-btn nt-btn--block" onClick={() => void exportCorredinoPdf(c, lang, basis)}>{it ? 'Scarica lista PDF' : 'Download PDF list'}</button>
          <button type="button" className="nt-link nt-center" onClick={() => void share()}>{it ? 'Condividi la lista' : 'Share the list'}</button>
          {msg ? <p className="nt-ok" role="status">{msg}</p> : null}
        </aside>
        <div className="nt-cor__cols">
          {c.columns.map((col) => (
            <section key={col.size} className="nt-cor__col">
              <div className="nt-spread nt-start">
                <div><div className="nt-eyebrow">{month(col.index)} · {col.seasonLabel}</div><div className="nt-cor__size">{it ? 'Taglia' : 'Size'} {col.size}</div><div className="nt-row__meta">{col.range} · {col.monthName}</div></div>
                <div className="nt-count"><b>{col.done}</b>/{col.total}</div>
              </div>
              <div className="nt-meter nt-meter--pink"><i style={{ width: `${Math.round((col.done / col.total) * 100)}%` }} /></div>
              {list(col)}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
