import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import type { SavedScreening } from '../lib/screeningStorage';
import { belongsToEmail } from '../lib/screeningStorage';
import { localeOf } from '../i18n';
import { Sheet } from '../ui/kit';
import { useFeedback } from '../ui/feedback';

/** Storico degli screening (Area riservata): aprire, eliminare, ricominciare il percorso. */
export function ScreeningHistory({ open, onClose, onJourney }: { open: boolean; onClose: () => void; onJourney: () => void }) {
  const { screenings, screeningId, openScreening, newScreening, deleteScreening, storageError, lang } = useNasciTara();
  const account = useAccount();
  const { confirm } = useFeedback();
  const it = lang === 'it';
  const records = new Map<string, SavedScreening>();
  for (const r of [...account.cloud, ...screenings]) {
    if (!belongsToEmail(r.state, account.user?.email)) continue;
    const previous = records.get(r.id);
    if (!previous || r.updatedAt > previous.updatedAt) records.set(r.id, r);
  }
  const list = [...records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const remove = async (record: SavedScreening) => {
    if (!(await confirm({ title: it ? 'Eliminare questo screening dallo storico?' : 'Delete this screening?', confirm: it ? 'Elimina' : 'Delete', cancel: it ? 'Annulla' : 'Cancel', danger: true }))) return;
    if (account.cloud.some((r) => r.id === record.id) && !(await account.remove(record.id))) return;
    deleteScreening(record.id);
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <Sheet open={open} onClose={onClose} title={it ? 'I miei screening' : 'My screenings'} subtitle={`${list.length}`} labelClose={it ? 'Chiudi' : 'Close'}>
      {account.status ? <p className="nt-note" role="status">{account.status}</p> : null}
      {storageError ? <p className="nt-error" role="alert">{it ? 'Salvataggio sul dispositivo non riuscito.' : 'Unable to save on this device.'}</p> : null}
      <div className="nt-rows">
        {list.map((r) => {
          const current = r.id === screeningId;
          const inCloud = account.cloud.some((c) => c.id === r.id);
          const scans = r.state.scans.filter((s) => s.date).length;
          return (
            <div key={r.id} className="nt-row nt-history">
              <span className={`nt-badge${current ? ' nt-badge--on' : ''}`}>{scans}</span>
              <div className="nt-row__body">
                <div className="nt-row__title">{it ? 'Screening del ' : 'Screening from '}{date(r.createdAt)}</div>
                <div className="nt-row__meta">
                  {scans} {it ? (scans === 1 ? 'ecografia' : 'ecografie') : scans === 1 ? 'scan' : 'scans'} · {r.state.gaWeeks || '—'}+{r.state.gaDays || 0} {it ? 'sett.' : 'wk'} · {inCloud ? (it ? 'nel tuo account' : 'in your account') : it ? 'su questo dispositivo' : 'on this device'}
                </div>
              </div>
              {current ? <span className="nt-chip nt-chip--on">{it ? 'Aperto' : 'Open'}</span> : <button type="button" className="nt-link" onClick={() => { openScreening(r); onClose(); }}>{it ? 'Apri' : 'Open'}</button>}
              <button type="button" className="nt-link nt-muted-link" aria-label={it ? 'Elimina screening' : 'Delete screening'} onClick={() => void remove(r)}>✕</button>
            </div>
          );
        })}
        {!list.length ? <p className="nt-note">{it ? 'Nessuno screening salvato.' : 'No saved screenings.'}</p> : null}
      </div>
      <div className="nt-grid2">
        <button type="button" className="nt-btn nt-btn--soft" onClick={() => { onJourney(); onClose(); }}>{it ? 'Rivedi il percorso' : 'Review the journey'}</button>
        <button type="button" className="nt-btn nt-btn--soft" onClick={() => { newScreening(); onClose(); }}>{it ? '+ Nuovo screening' : '+ New screening'}</button>
      </div>
    </Sheet>
  );
}
