import { DateField, NumberField } from './Field';
import { ModuleCard } from './ModuleCard';
import { IconBelly } from './icons';
import type { ModuleStatus } from './StatusBadge';
import { useNasciTara } from '../state/NasciTaraStore';
import { estimatedDueDate, formatGA, MAX_GA_WEEKS, MIN_GA_WEEKS } from '../lib/gestationalAge';
import { motherBmi } from '../lib/customCurveGardosiLite';

/**
 * Modulo 1 — Gravidanza & Genitori.
 *
 * Due blocchi: "Gravidanza" e' obbligatorio, "Dati costituzionali" e'
 * interamente facoltativo e non blocca mai gli altri moduli.
 */
export function ModulePregnancyAndParents({ hiddenOnMobile }: { hiddenOnMobile?: boolean }) {
  const { state, dispatch, ga, gaValid } = useNasciTara();
  const p = state.parents;

  const filledParents = Object.values(p).filter((v) => v !== '').length;
  const status: ModuleStatus = !gaValid ? 'waiting' : filledParents === 6 ? 'complete' : 'partial';

  const edd = gaValid ? estimatedDueDate(state.referenceDate, ga) : null;
  const bmi = motherBmi({
    motherHeightCm: p.motherHeightCm === '' ? null : Number(p.motherHeightCm),
    motherWeightKg: p.motherWeightKg === '' ? null : Number(p.motherWeightKg),
  });

  return (
    <ModuleCard
      id="modulo-gravidanza"
      title="Gravidanza & Genitori"
      subtitle={
        gaValid
          ? `${formatGA(ga)} settimane${edd ? ` · termine ${edd.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}` : ''}`
          : 'Inserisci l’epoca per iniziare'
      }
      icon={<IconBelly />}
      status={status}
      hiddenOnMobile={hiddenOnMobile}
    >
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Gravidanza</legend>
        <p className="fieldset__hint">
          L’epoca di oggi fissa il riferimento: la data di ogni ecografia viene riportata indietro su questa
          scala.
        </p>
        <div className="grid">
          <div className="field">
            <span className="field__label">Età gestazionale</span>
            <div className="grid grid--pair">
              <NumberField
                label=""
                ariaLabel="Settimane di gestazione"
                unit="sett"
                value={state.gaWeeks}
                min={MIN_GA_WEEKS}
                max={MAX_GA_WEEKS}
                onChange={(v) => dispatch({ type: 'setGa', field: 'gaWeeks', value: v })}
              />
              <NumberField
                label=""
                ariaLabel="Giorni di gestazione"
                unit="gg"
                value={state.gaDays}
                min={0}
                max={6}
                onChange={(v) => dispatch({ type: 'setGa', field: 'gaDays', value: v })}
              />
            </div>
            <span className={`field__hint${!gaValid ? ' field__hint--warn' : ''}`}>
              {gaValid ? `${formatGA(ga)} settimane` : `Settimane fra ${MIN_GA_WEEKS} e ${MAX_GA_WEEKS}`}
            </span>
          </div>

          <DateField
            label="Data di riferimento"
            value={state.referenceDate}
            onChange={(v) => dispatch({ type: 'setReferenceDate', value: v })}
            hint={
              edd
                ? `Termine il ${edd.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', timeZone: 'UTC' })}`
                : 'Data a cui vale l’epoca'
            }
          />
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Dati costituzionali (mamma e papà)</legend>
        <p className="fieldset__hint">
          Tutti facoltativi. Servono solo alla curva personalizzata: se mancano, peso stimato e percentile di
          popolazione restano identici. L’età viene raccolta come contesto ma non entra nel calcolo del peso.
        </p>
        <div className="grid">
          <NumberField
            label="Peso mamma"
            note="facoltativo"
            unit="kg"
            step={0.5}
            min={35}
            max={200}
            value={p.motherWeightKg}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherWeightKg', value: v })}
            hint={bmi !== null ? `BMI ${bmi.toFixed(1)}${bmi >= 30 ? ' — misure meno precise' : ''}` : ''}
            hintWarn={bmi !== null && bmi >= 30}
          />
          <NumberField
            label="Altezza mamma"
            note="facoltativo"
            unit="cm"
            min={130}
            max={210}
            value={p.motherHeightCm}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherHeightCm', value: v })}
          />
          <NumberField
            label="Età mamma"
            note="facoltativo"
            unit="anni"
            min={14}
            max={60}
            value={p.motherAgeYears}
            onChange={(v) => dispatch({ type: 'setParent', field: 'motherAgeYears', value: v })}
          />
          <NumberField
            label="Peso papà"
            note="facoltativo"
            unit="kg"
            step={0.5}
            min={35}
            max={220}
            value={p.fatherWeightKg}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherWeightKg', value: v })}
          />
          <NumberField
            label="Altezza papà"
            note="facoltativo"
            unit="cm"
            min={130}
            max={230}
            value={p.fatherHeightCm}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherHeightCm', value: v })}
            hint="Entra nella curva personalizzata"
          />
          <NumberField
            label="Età papà"
            note="facoltativo"
            unit="anni"
            min={14}
            max={80}
            value={p.fatherAgeYears}
            onChange={(v) => dispatch({ type: 'setParent', field: 'fatherAgeYears', value: v })}
          />
        </div>
      </fieldset>
    </ModuleCard>
  );
}
