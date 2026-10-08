import { addDays, parseISO, todayUTC } from '../lib/gestationalAge';
import { birthRange, neoUntil, phaseOf, type Phase, type Role } from '../lib/family';
import { localeOf } from '../i18n';
import { Segmented, WeekStepper } from '../ui/kit';
import { useId } from 'react';

export interface FamilyValue {
  role: Role;
  phase: Phase;
  week: number;
  birthDate: string;
}

/** La data è coerente con la fase scelta (neo: ultimi 3 mesi; già genitore: prima). */
export function familyValid(v: FamilyValue): boolean {
  if (v.phase === 'attesa') return true;
  const { min, max } = birthRange(v.phase);
  return !!v.birthDate && v.birthDate >= min && v.birthDate <= max;
}

const fmt = (iso: string, lang: 'it' | 'en') => parseISO(iso)!.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Registrazione 1.0: chi sei, a che punto siete, e settimana oppure data di nascita. */
export function FamilyFields({ value, onChange, lang, showRole = true }: { value: FamilyValue; onChange: (v: FamilyValue) => void; lang: 'it' | 'en'; showRole?: boolean }) {
  const it = lang === 'it';
  const id = useId();
  const set = (patch: Partial<FamilyValue>) => onChange({ ...value, ...patch });
  const due = addDays(todayUTC(), (40 - value.week) * 7).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const range = value.phase === 'attesa' ? null : birthRange(value.phase);
  const outOfRange = !!value.birthDate && !!range && !familyValid(value);
  const actual = value.birthDate ? phaseOf(value.birthDate) : null;
  return (
    <>
      {showRole ? (
        <div className="nt-field">
          <span className="nt-field__label">{it ? 'Sei' : 'You are'}</span>
          <Segmented label={it ? 'Sei' : 'You are'} variant="brand" value={value.role} options={[['mamma', it ? 'La mamma' : 'Mum'], ['papa', it ? 'Il papà' : 'Dad']]} onChange={(role) => set({ role })} />
        </div>
      ) : null}
      <div className="nt-field">
        <span className="nt-field__label">{it ? 'A che punto siete?' : 'Where are you at?'}</span>
        <Segmented label={it ? 'Fase' : 'Stage'} value={value.phase}
          options={[['attesa', it ? 'In attesa' : 'Expecting'], ['neo', it ? 'Neonato' : 'Newborn'], ['genitore', it ? 'Già genitore' : 'Already a parent']]}
          onChange={(phase) => set({ phase })} />
        <span className="nt-field__hint">
          {value.phase === 'attesa' ? (it ? 'Il bebe è ancora nel pancione.' : 'The baby is still on the way.')
            : value.phase === 'neo' ? (it ? 'Il bebe ha al massimo 3 mesi.' : 'The baby is up to 3 months old.')
            : it ? 'Il bebe ha più di 3 mesi.' : 'The baby is over 3 months old.'}
        </span>
      </div>
      {value.phase === 'attesa' ? (
        <div className="nt-field">
          <span className="nt-field__label">{it ? 'Settimana di gravidanza' : 'Week of pregnancy'}</span>
          <WeekStepper value={value.week} onChange={(week) => set({ week })} lang={lang} />
          <span className="nt-field__hint">{it ? `Parto previsto intorno al ${due}` : `Due around ${due}`}</span>
        </div>
      ) : (
        <div className="nt-field">
          <label className="nt-field__label" htmlFor={id}>{it ? 'Data di nascita del bebe' : 'Baby’s date of birth'}</label>
          <span className="nt-input">
            <input id={id} type="date" value={value.birthDate} min={range!.min} max={range!.max} onChange={(e) => set({ birthDate: e.target.value })} aria-invalid={outOfRange || undefined} />
          </span>
          {outOfRange && actual && actual !== 'attesa' ? (
            <span className="nt-field__hint nt-field__hint--error" role="alert">
              {actual === 'neo'
                ? (it ? 'Con questa data il bebe ha meno di 3 mesi: scegli “Neonato”.' : 'With this date the baby is under 3 months: choose “Newborn”.')
                : (it ? 'Con questa data il bebe ha più di 3 mesi: scegli “Già genitore”.' : 'With this date the baby is over 3 months: choose “Already a parent”.')}
            </span>
          ) : value.phase === 'neo' && value.birthDate && !outOfRange ? (
            <span className="nt-field__hint">{it ? `Neogenitore fino al ${fmt(neoUntil(value.birthDate), lang)}, poi si passa da soli a “Già genitore”.` : `New parent until ${fmt(neoUntil(value.birthDate), lang)}, then you move to “Already a parent” automatically.`}</span>
          ) : null}
        </div>
      )}
    </>
  );
}
