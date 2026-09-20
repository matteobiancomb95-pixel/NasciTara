import type { ReactNode } from 'react';

import type { NumField } from '../state/NasciTaraStore';

/**
 * Campi di NasciTara.
 *
 * Anatomia fissa: etichetta parlata -> qualificatore -> box. Il qualificatore
 * traduce il termine tecnico ed e' il livello di testo piu' importante del
 * prodotto: e' quello che rende il referto leggibile a due genitori.
 *
 * L'input e' un nodo React stabile con valore controllato: il fuoco non si
 * perde mai durante la digitazione.
 */

interface BaseProps {
  label: string;
  /** Traduce l'etichetta o dice come si chiama sul referto. */
  hint?: ReactNode;
  /** Messaggio sotto il campo: stato, atteso, errore. */
  footnote?: ReactNode;
  unit?: string;
  ariaLabel?: string;
}

interface NumberFieldProps extends BaseProps {
  value: NumField;
  onChange: (value: NumField) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export function NumberField({
  label,
  hint,
  footnote,
  unit,
  ariaLabel,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}: NumberFieldProps) {
  return (
    <label className={`field${unit ? ' field--unit' : ''}`}>
      <span className="field__label">{/peso|weight|altezza|height|età|age/i.test(label) ? <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={/altezza|height/i.test(label) ? 'M8 3h8v18H8zM8 7h4M8 11h3M8 15h4' : /età|age/i.test(label) ? 'M4 6h16v15H4zM8 3v6M16 3v6M4 11h16' : 'M5 8h14l2 13H3zM9 8V5a3 3 0 016 0v3'} /></svg> : null}{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <span className="field__box">
        <input
          type="number"
          inputMode="decimal"
          value={value === '' ? '' : String(value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit ? <span className="field__unit">{unit}</span> : null}
      </span>
      {footnote ? <span className="field__hint">{footnote}</span> : null}
    </label>
  );
}

interface DateFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  max?: string;
}

export function DateField({ label, hint, footnote, ariaLabel, value, onChange, max }: DateFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{/peso|weight|altezza|height|età|age/i.test(label) ? <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={/altezza|height/i.test(label) ? 'M8 3h8v18H8zM8 7h4M8 11h3M8 15h4' : /età|age/i.test(label) ? 'M4 6h16v15H4zM8 3v6M16 3v6M4 11h16' : 'M5 8h14l2 13H3zM9 8V5a3 3 0 016 0v3'} /></svg> : null}{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <span className="field__box">
        <input
          type="date"
          value={value}
          max={max}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {footnote ? <span className="field__hint">{footnote}</span> : null}
    </label>
  );
}

interface EmailFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function EmailField({ label, hint, value, onChange, placeholder, error }: EmailFieldProps) {
  return (
    <label className="field">
      <span className="field__label">{/peso|weight|altezza|height|età|age/i.test(label) ? <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={/altezza|height/i.test(label) ? 'M8 3h8v18H8zM8 7h4M8 11h3M8 15h4' : /età|age/i.test(label) ? 'M4 6h16v15H4zM8 3v6M16 3v6M4 11h16' : 'M5 8h14l2 13H3zM9 8V5a3 3 0 016 0v3'} /></svg> : null}{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <span className="field__box">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export function Checkbox({ checked, onChange, children }: CheckboxProps) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__text">{children}</span>
    </label>
  );
}
