import { useState } from 'react';
import { useAccount } from '../state/AccountContext';
import { useNasciTara } from '../state/NasciTaraStore';
import { addMonths, phaseOf } from '../lib/family';
import { toISO, todayUTC } from '../lib/gestationalAge';
import { useFeedback } from '../ui/feedback';
import { DateInput, Sheet } from '../ui/kit';

/** "È nato!": la data di nascita fa passare la famiglia da in attesa a neogenitore (o già genitore). */
export function BirthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, state } = useNasciTara();
  const account = useAccount();
  const { toast } = useFeedback();
  const it = lang === 'it';
  const today = toISO(todayUTC());
  const editing = !!account.profile?.birthDate;
  const [date, setDate] = useState(account.profile?.birthDate ?? today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const min = addMonths(today, -12 * 18);
  const valid = !!date && date <= today && date >= min;
  const save = async () => {
    setBusy(true);
    setError('');
    const r = await account.updateProfile({ birth_date: date });
    setBusy(false);
    if (!r.ok) return setError(r.error || (it ? 'Non è stato possibile salvare. Riprova.' : 'Could not save. Try again.'));
    onClose();
    toast(!editing && phaseOf(date) === 'neo' ? (it ? (state.babySex === 'female' ? 'Benvenuta al mondo, piccola! Congratulazioni.' : state.babySex === 'male' ? 'Benvenuto al mondo, piccolo! Congratulazioni.' : 'Benvenuto al mondo, bebe! Congratulazioni.') : 'Welcome to the world, little one! Congratulations.') : it ? 'Data di nascita salvata.' : 'Date of birth saved.');
  };
  return (
    <Sheet open={open} onClose={onClose} labelClose={it ? 'Chiudi' : 'Close'} title={editing ? (it ? 'Data di nascita' : 'Date of birth') : it ? 'È nato!' : 'The baby is here!'} subtitle={editing ? (it ? 'La fase si aggiorna da sola in base alla data.' : 'The stage updates itself from the date.') : it ? 'Da oggi NasciTara vi accompagna nei primi mesi.' : 'From today NasciTara is with you in the first months.'}>
      <DateInput label={it ? 'Data di nascita' : 'Date of birth'} value={date} max={today} onChange={setDate}
        hint={it ? 'Nei primi 3 mesi siete neogenitori, poi si passa da soli a “Già genitore”. Ecografie e corredino restano nel tuo account.' : 'For the first 3 months you are new parents, then you move to “Already a parent” automatically. Scans and layette stay in your account.'} />
      {error ? <p className="nt-error" role="alert">{error}</p> : null}
      <button aria-busy={busy} type="button" className="nt-btn nt-btn--block" disabled={!valid || busy} onClick={() => void save()}>{it ? 'Salva la data di nascita' : 'Save the date of birth'}</button>
    </Sheet>
  );
}
