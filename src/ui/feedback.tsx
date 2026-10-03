import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';

/**
 * Riscontro immediato per ogni azione: notifiche brevi (toast) e conferme in stile app.
 * Le notifiche stanno sopra il contenuto (nessun salto di layout) e sono annunciate ai lettori di schermo.
 */
type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; text: string; leaving?: boolean }
interface ConfirmOptions { title: string; body?: string; confirm: string; cancel: string; danger?: boolean }
interface Feedback {
  toast: (text: string, kind?: Kind) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<Feedback>({ toast: () => {}, confirm: async (o) => window.confirm(o.title) });
const LEAVE_MS = 180;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), LEAVE_MS);
  }, []);
  const toast = useCallback((text: string, kind: Kind = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
  }, [dismiss]);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setAsk({ ...o, resolve })), []);
  const answer = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="nt-toasts" role="region" aria-label="Notifiche">
        {toasts.map((t) => (
          <div key={t.id} className={`nt-toast nt-toast--${t.kind}${t.leaving ? ' is-leaving' : ''}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <Icon name={t.kind === 'error' ? 'info' : t.kind === 'success' ? 'check' : 'bell'} size={18} />
            <span>{t.text}</span>
            <button type="button" className="nt-toast__x" aria-label="Chiudi notifica" onClick={() => dismiss(t.id)}>✕</button>
          </div>
        ))}
      </div>
      {ask ? <ConfirmDialog {...ask} onAnswer={answer} /> : null}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, body, confirm, cancel, danger, onAnswer }: ConfirmOptions & { onAnswer: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="nt-confirm" aria-labelledby="nt-confirm-title" onCancel={(e) => { e.preventDefault(); onAnswer(false); }}>
      <h2 id="nt-confirm-title">{title}</h2>
      {body ? <p className="nt-body">{body}</p> : null}
      <div className="nt-confirm__actions">
        <button type="button" className="nt-btn nt-btn--soft" onClick={() => onAnswer(false)}>{cancel}</button>
        <button type="button" className={`nt-btn${danger ? ' nt-btn--alert' : ''}`} autoFocus onClick={() => onAnswer(true)}>{confirm}</button>
      </div>
    </dialog>
  );
}

export const useFeedback = () => useContext(Ctx);
