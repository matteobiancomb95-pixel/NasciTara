import { useNasciTara } from '../state/NasciTaraStore';
import { useAccount } from '../state/AccountContext';
import type { SavedScreening } from '../lib/screeningStorage';
import { belongsToEmail } from '../lib/screeningStorage';
import { localeOf } from '../i18n';
import { Segmented, Sheet } from '../ui/kit';

/** Menu dell'avatar: profilo, lingua, storico degli screening, uscita. */
export function AccountMenu({ open, onClose, onJourney, name }: { open: boolean; onClose: () => void; onJourney: () => void; name: string }) {
  const { state, dispatch, screenings, screeningId, openScreening, newScreening, deleteScreening, forgetDevice, storageError, lang } = useNasciTara();
  const account = useAccount();
  const it = lang === 'it';
  const records = new Map<string, SavedScreening>();
  for (const r of [...account.cloud, ...screenings]) {
    if (!belongsToEmail(r.state, account.user?.email)) continue;
    const previous = records.get(r.id);
    if (!previous || r.updatedAt > previous.updatedAt) records.set(r.id, r);
  }
  const list = [...records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const remove = async (record: SavedScreening) => {
    if (!window.confirm(it ? 'Eliminare questo screening dallo storico?' : 'Delete this screening?')) return;
    if (account.cloud.some((r) => r.id === record.id) && !(await account.remove(record.id))) return;
    deleteScreening(record.id);
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <Sheet open={open} onClose={onClose} title={name || (it ? 'Il tuo account' : 'Your account')} subtitle={account.user?.email} labelClose={it ? 'Chiudi' : 'Close'}>
      <div className="nt-field">
        <span className="nt-field__label">{it ? 'Lingua' : 'Language'}</span>
        <Segmented label={it ? 'Lingua' : 'Language'} value={state.lang} options={[['it', 'Italiano'], ['en', 'English']]} onChange={(v) => dispatch({ type: 'setLang', value: v })} />
      </div>
      <div className="nt-spread">
        <h3 className="nt-h3">{it ? 'I miei screening' : 'My screenings'}</h3>
        <span className="nt-note">{list.length}</span>
      </div>
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
      <button type="button" className="nt-btn nt-btn--block" onClick={() => void account.signOut().then(onClose)}>{it ? 'Esci' : 'Sign out'}</button>
      <p className="nt-note">{it ? 'Dispositivo condiviso? Esci e rimuovi le copie locali. Lo storico online resta nel tuo account.' : 'Shared device? Sign out and remove local copies. Online history stays in your account.'}</p>
      <button type="button" className="nt-link" onClick={() => void account.signOut().then(() => { forgetDevice(); onClose(); })}>{it ? 'Esci e dimentica questo dispositivo' : 'Sign out and forget this device'}</button>
    </Sheet>
  );
}
