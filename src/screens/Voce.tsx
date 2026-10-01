import { useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { useMamma } from '../state/MammaStore';
import { Segmented, Toggle } from '../ui/kit';
import { APP_VERSION } from '../version';

/** La tua voce (M18 / D10): recensione o idea, scritta nel Google Sheet del team tramite il server. */
export function VoiceTab({ firstName }: { firstName: string }) {
  const { lang } = useNasciTara();
  const it = lang === 'it';
  const { call, online } = useMamma();
  const [kind, setKind] = useState<'review' | 'idea'>('review');
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [contact, setContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<'review' | 'idea' | null>(null);
  const [error, setError] = useState('');
  const valid = text.trim().length >= 3 && (kind === 'idea' || stars > 0);
  const send = async () => {
    setBusy(true);
    setError('');
    const r = await call('submit-feedback', { kind, stars: kind === 'review' ? stars : null, text: text.trim(), contact, version: APP_VERSION, platform: window.matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'mobile' });
    setBusy(false);
    if (r.status === 'ok') {
      setSent(kind);
      setText('');
      setStars(0);
      setContact(false);
      return;
    }
    setError(r.status === 'limited' ? (it ? 'Hai già scritto da poco: riprova tra un minuto.' : 'You just wrote to us: try again in a minute.')
      : r.status === 'offline' ? (it ? 'Per scriverci serve il tuo account.' : 'You need your account to write to us.')
      : it ? 'Invio non riuscito. Riprova tra poco.' : 'Could not send. Try again shortly.');
  };
  return (
    <main className="nt-wrap nt-main nt-voice">
      <div className="nt-voice__intro">
        <div className="nt-eyebrow nt-desk">{it ? 'La tua voce' : 'Your voice'}</div>
        <h1 className="nt-title"><span className="nt-mob">{it ? 'La tua voce' : 'Your voice'}</span><span className="nt-desk">{it ? 'Costruiamo NasciTara insieme.' : 'Let’s build NasciTara together.'}</span></h1>
        <p className="nt-lead">{it ? 'NasciTara è un progetto nato per aiutare tantissime mamme e coppie: raccontaci com’è andata, cosa miglioreresti o quale funzionalità ti manca.' : 'NasciTara was born to help many mums and couples: tell us how it went, what you would improve or what is missing.'}</p>
      </div>
      <div className="nt-voice__form">
        {sent ? (
          <div className="nt-card nt-card--tint nt-voice__done">
            <span className="nt-voice__tick" aria-hidden="true">✓</span>
            <div className="nt-h3">{it ? `Grazie${firstName ? ', ' + firstName : ''}!` : `Thank you${firstName ? ', ' + firstName : ''}!`}</div>
            <p className="nt-body">{it ? `La tua ${sent === 'review' ? 'recensione' : 'idea'} è arrivata al team NasciTara.` : `Your ${sent === 'review' ? 'review' : 'idea'} reached the NasciTara team.`}</p>
            <button type="button" className="nt-btn nt-btn--soft" onClick={() => setSent(null)}>{it ? 'Scrivine un’altra' : 'Write another'}</button>
          </div>
        ) : (
          <div className="nt-stack">
            <div className="nt-field">
              <span className="nt-field__label">{it ? 'Di cosa vuoi parlarci?' : 'What is it about?'}</span>
              <Segmented label={it ? 'Tipo' : 'Type'} variant="brand" value={kind} options={[['review', it ? 'Recensione' : 'Review'], ['idea', it ? 'Nuova funzionalità' : 'New feature']]} onChange={setKind} />
            </div>
            {kind === 'review' ? (
              <div className="nt-field">
                <span className="nt-field__label">{it ? 'Il tuo voto' : 'Your rating'}</span>
                <div className="nt-stars" role="radiogroup" aria-label={it ? 'Voto' : 'Rating'}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} / 5`} className={n <= stars ? 'is-on' : undefined} onClick={() => setStars(n)}>★</button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="nt-field">
              <label className="nt-field__label" htmlFor="nt-voice-text">{it ? 'Descrizione' : 'Description'}</label>
              <textarea id="nt-voice-text" className="nt-textarea nt-textarea--tall" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={kind === 'review' ? (it ? 'Cosa ti è piaciuto? Cosa miglioreresti?' : 'What did you like? What would you improve?') : it ? 'Che cosa vorresti poter fare con NasciTara, e in quale momento ti servirebbe?' : 'What would you like to do with NasciTara, and when would you need it?'} />
              <span className="nt-field__hint">{it ? 'Non scrivere dati sulla salute: qui raccogliamo opinioni e idee.' : 'Please don’t include health details: this is for opinions and ideas.'}</span>
            </div>
            <div className="nt-spread">
              <span className="nt-row__title">{it ? 'Potete ricontattarmi via email' : 'You may contact me by email'}</span>
              <Toggle checked={contact} onChange={setContact} label={it ? 'Ricontatto via email' : 'Contact by email'} />
            </div>
            {error ? <p className="nt-error" role="alert">{error}</p> : null}
            <button type="button" className="nt-btn nt-btn--block" disabled={!valid || busy || !online} onClick={() => void send()}>{busy ? (it ? 'Invio…' : 'Sending…') : it ? 'Invia' : 'Send'}</button>
            <p className="nt-note nt-center">{online ? (it ? 'Leggiamo ogni messaggio. Le idee più richieste entrano nei prossimi rilasci.' : 'We read every message. The most requested ideas make it into future releases.') : it ? 'Per scriverci serve il tuo account.' : 'You need your account to write to us.'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
