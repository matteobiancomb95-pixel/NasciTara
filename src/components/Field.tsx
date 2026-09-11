import type { NumField } from '../state/NasciTaraStore';

interface NumberFieldProps {
  label: string;
  /** Testo piccolo accanto all'etichetta, per esempio "facoltativo". */
  note?: string;
  unit?: string;
  value: NumField;
  onChange: (value: NumField) => void;
  hint?: string;
  hintWarn?: boolean;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  fullWidth?: boolean;
}

/**
 * Campo numerico controllato.
 *
 * L'input e' un nodo React stabile: a differenza del prototipo, che
 * ricostruiva l'intera lista a ogni battuta, qui React riconcilia e il
 * fuoco non si perde mai.
 */
export function NumberField({
  label,
  note,
  unit,
  value,
  onChange,
  hint,
  hintWarn,
  min,
  max,
  step = 1,
  ariaLabel,
  fullWidth,
}: NumberFieldProps) {
  return (
    <label className={`field${unit ? ' field--unit' : ''}${fullWidth ? ' field--full' : ''}`}>
      <span className="field__label">
        {label} {note ? <small>{note}</small> : null}
      </span>
      <span className="field__control">
        <input
          type="number"
          inputMode="decimal"
          value={value === '' ? '' : String(value)}
          min={min}
          max={max}
          step={step}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit ? <span className="field__unit">{unit}</span> : null}
      </span>
      <span className={`field__hint${hintWarn ? ' field__hint--warn' : ''}`}>{hint ?? ''}</span>
    </label>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function DateField({ label, value, onChange, max, hint, fullWidth }: DateFieldProps) {
  return (
    <label className={`field${fullWidth ? ' field--full' : ''}`}>
      <span className="field__label">{label}</span>
      <span className="field__control">
        <input type="date" value={value} max={max} onChange={(e) => onChange(e.target.value)} />
      </span>
      <span className="field__hint">{hint ?? ''}</span>
    </label>
  );
}
