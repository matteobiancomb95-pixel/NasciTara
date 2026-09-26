import { useEffect, useId, useRef, type ReactNode } from 'react';
import markUrl from '../assets/brand/logo-mark-transparent.png';
import type { NumField } from '../state/NasciTaraStore';

/** Marchio + nome, come nel mockup: il nome e' testo Nunito 900 nel rosa di marca. */
export function Logo({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <img src={markUrl} alt="" width={30} height={30} />
      <span>NasciTara</span>
    </>
  );
  return onClick ? (
    <button type="button" className="nt-logo" onClick={onClick} aria-label="NasciTara">
      {content}
    </button>
  ) : (
    <span className="nt-logo">{content}</span>
  );
}

export function Field({ label, hint, children, id }: { label: ReactNode; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="nt-field">
      <label className="nt-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? <span className="nt-field__hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ label, hint, value, onChange, type = 'text', autoComplete, placeholder, action, required, maxLength }: {
  label: ReactNode; hint?: ReactNode; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string;
  placeholder?: string; action?: ReactNode; required?: boolean; maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <span className="nt-input">
        <input id={id} type={type} value={value} autoComplete={autoComplete} placeholder={placeholder} required={required} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
        {action}
      </span>
    </Field>
  );
}

export function NumberInput({ label, hint, value, onChange, unit, min, max, step = 1, placeholder = '—', ring, warn, ariaLabel }: {
  label: ReactNode; hint?: ReactNode; value: NumField; onChange: (v: NumField) => void; unit?: string; min?: number; max?: number;
  step?: number; placeholder?: string; ring?: boolean; warn?: boolean; ariaLabel?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <span className={`nt-input${ring ? ' nt-input--ring' : warn ? ' nt-input--warn' : ''}`}>
        <input id={id} type="number" inputMode="decimal" aria-label={ariaLabel} value={value === '' ? '' : String(value)} min={min} max={max} step={step} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        {unit ? <span className="nt-input__unit">{unit}</span> : null}
      </span>
    </Field>
  );
}

export function DateInput({ label, hint, value, onChange, max }: { label: ReactNode; hint?: ReactNode; value: string; onChange: (v: string) => void; max?: string }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <span className="nt-input">
        <input id={id} type="date" value={value} max={max} onChange={(e) => onChange(e.target.value)} />
      </span>
    </Field>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange, variant, size }: {
  label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void; variant?: 'brand'; size?: 'sm';
}) {
  return (
    <div className={`nt-seg${variant ? ' nt-seg--brand' : ''}${size ? ' nt-seg--sm' : ''}`} role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Settimana di gravidanza con i tasti − e +, come nella registrazione del mockup. */
export function WeekStepper({ value, onChange, min = 12, max = 42, lang }: { value: number; onChange: (v: number) => void; min?: number; max?: number; lang: 'it' | 'en' }) {
  const it = lang === 'it';
  return (
    <div className="nt-stepper">
      <output aria-live="polite">{it ? `${value}ª settimana` : `Week ${value}`}</output>
      <button type="button" aria-label={it ? 'Una settimana in meno' : 'One week less'} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <button type="button" aria-label={it ? 'Una settimana in più' : 'One week more'} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="nt-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

/** Foglio dal basso su telefono, finestra centrata su desktop. Chiude con Esc e toccando fuori. */
export function Sheet({ open, onClose, title, subtitle, children, labelClose }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; labelClose: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.scrollTop = 0;
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="nt-sheet" onClose={onClose} onCancel={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="nt-sheet__body">
        <span className="nt-sheet__grip nt-mob" aria-hidden="true" />
        <div className="nt-sheet__head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="nt-note">{subtitle}</p> : null}
          </div>
          <button type="button" className="nt-round nt-round--sm" aria-label={labelClose} onClick={onClose}>
            ✕
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  );
}

export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function Avatar({ name, onClick, label, withName }: { name: string; onClick: () => void; label: string; withName?: string }) {
  const initial = (name.trim()[0] ?? '·').toUpperCase();
  return withName ? (
    <button type="button" className="nt-user" onClick={onClick} aria-label={label}>
      <span className="nt-avatar" aria-hidden="true">{initial}</span>
      {withName}
    </button>
  ) : (
    <button type="button" className="nt-avatar" onClick={onClick} aria-label={label}>
      {initial}
    </button>
  );
}

/** Grammi con il separatore delle migliaia anche a 4 cifre (1.180), come nel mockup: Intl in italiano non lo mette. */
export function grams(value: number, lang: 'it' | 'en'): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'it' ? '.' : ',');
}
