import { DateField, NumberField } from '../components/Field';
import { IconArrow, IconBack } from '../components/icons';
import { useNasciTara } from '../state/NasciTaraStore';
import { estimatedDueDate, MAX_GA_WEEKS, MIN_GA_WEEKS } from '../lib/gestationalAge';
import { motherBmi } from '../lib/customCurveGardosiLite';
import { localeOf } from '../i18n';

/**
 * Schermata 2 — gravidanza e genitori.
 *
 * Due blocchi con statuto visivo diverso: cio' che serve davvero sta su fondo
 * bianco, cio' che e' facoltativo dentro una campitura rosa. La campitura dice
 * "questa parte puoi saltarla" meglio di un "(opzionale)" fra parentesi.
 */
export function PregnancyPage() {
  const { state, dispatch, ga, gaValid, t, lang } = useNasciTara();
  const p = state.parents;

  const due = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const bmi = motherBmi({
    motherHeightCm: p.motherHeightCm === '' ? null : Number(p.motherHeightCm),
    motherWeightKg: p.motherWeightKg === '' ? null : Number(p.motherWeightKg),
  });

  return (
    <div className="col stack--loose stack">
      <div>
        <button type="button" className="back" onClick={() => dispatch({ type: 'goTo', page: 'landing' })}>
          <IconBack />
          {t('nav.back')}
        </button>
        <h1 className="h1">{t('preg.title')}</h1>
        <p className="lead">{t('preg.lead')}</p>
      </div>

      <section className="stack stack--tight">
        <h2 className="h2">{t('preg.section.pregnancy')}</h2>
        <p className="note">{t('preg.section.pregnancyHint')}</p>

        <div className="grid-2">
          <NumberField
            label={t('preg.gaWeeks')}
            unit={t('unit.weeks')}
            min={MIN_GA_WEEKS}
            max={MAX_GA_WEEKS}
            value={state.gaWeeks}
            onChange={(v) => dispatch({ type: 'setGa', field: 'gaWeeks', value: v })}
            footnote={gaValid ? undefined : t('preg.gaHint')}
          />
          <NumberField
            label={t('preg.gaDays')}
            unit={t('unit.days')}
            min={0}
            max={6}
            value={state.gaDays}
            onChange={(v) => dispatch({ type: 'setGa', field: 'gaDays', value: v })}
          />
        </div>

        <DateField
          label={t('preg.refDate')}
          hint={t('preg.refDateHint')}
          value={state.referenceDate}
          onChange={(v) => dispatch({ type: 'setReferenceDate', value: v })}
          footnote={
            due
              ? t('preg.dueDate', {
                  date: due.toLocaleDateString(localeOf(lang), {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  }),
                })
              : undefined
          }
        />
      </section>

      <section className="block stack stack--tight">
        <h2 className="h2">{t('preg.section.parents')}</h2>
        <p className="note" style={{ color: 'var(--ink-on-fill)' }}>
          {t('preg.section.parentsHint')}
        </p>

        <div className="grid-2">
          <NumberField
            label={t('preg.motherWeight')}
            hint={t('preg.motherWeightHint')}
            unit={t('unit.kg')}
            step={0.5}
            min={35}
            max={200}
            value={p.motherWeightKg}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherWeightKg', value: v })}
            footnote={
              bmi !== null
                ? bmi >= 30
                  ? t('preg.bmiHigh', { value: bmi.toFixed(1) })
                  : t('preg.bmi', { value: bmi.toFixed(1) })
                : undefined
            }
          />
          <NumberField
            label={t('preg.motherHeight')}
            unit={t('unit.cm')}
            min={130}
            max={210}
            value={p.motherHeightCm}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherHeightCm', value: v })}
          />
          <NumberField
            label={t('preg.motherAge')}
            unit={t('unit.years')}
            min={14}
            max={60}
            value={p.motherAgeYears}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherAgeYears', value: v })}
          />
          <NumberField
            label={t('preg.fatherWeight')}
            unit={t('unit.kg')}
            step={0.5}
            min={35}
            max={220}
            value={p.fatherWeightKg}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherWeightKg', value: v })}
          />
          <NumberField
            label={t('preg.fatherHeight')}
            unit={t('unit.cm')}
            min={130}
            max={230}
            value={p.fatherHeightCm}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherHeightCm', value: v })}
          />
          <NumberField
            label={t('preg.fatherAge')}
            unit={t('unit.years')}
            min={14}
            max={80}
            value={p.fatherAgeYears}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherAgeYears', value: v })}
          />
        </div>

        <p className="fine" style={{ color: 'var(--ink-on-fill)' }}>
          {t('preg.ageNote')}
        </p>
      </section>

      <div>
        <button
          type="button"
          className="btn btn--block"
          disabled={!gaValid}
          onClick={() => dispatch({ type: 'goTo', page: 'measurements' })}
        >
          {t('preg.continue')}
          <IconArrow />
        </button>
        <p className="btn-note">{gaValid ? t('preg.continueNote') : t('preg.needGa')}</p>
      </div>
    </div>
  );
}
