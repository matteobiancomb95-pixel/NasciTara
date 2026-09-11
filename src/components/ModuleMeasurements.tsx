import { DateField, NumberField } from './Field';
import { ModuleCard } from './ModuleCard';
import { IconScan } from './icons';
import type { ModuleStatus } from './StatusBadge';
import { useNasciTara } from '../state/NasciTaraStore';
import { expectedMm, isMeasurePlausible, type MeasureKey } from '../lib/biometry';
import { formatGA, gaAtDate } from '../lib/gestationalAge';
import { analyseUltrasound } from '../lib/analysis';

type ScanNumField = 'hcMm' | 'acMm' | 'flMm' | 'bpdMm';

const MEASURES: Array<{ key: MeasureKey; field: ScanNumField; label: string; full: string }> = [
  { key: 'HC', field: 'hcMm', label: 'HC', full: 'Circonferenza cranica' },
  { key: 'AC', field: 'acMm', label: 'AC', full: 'Circonferenza addominale' },
  { key: 'FL', field: 'flMm', label: 'FL', full: 'Lunghezza femore' },
  { key: 'BPD', field: 'bpdMm', label: 'BPD', full: 'Diametro biparietale' },
];

/** Modulo 2 — Misurazioni ecografiche. */
export function ModuleMeasurements({ hiddenOnMobile }: { hiddenOnMobile?: boolean }) {
  const { state, dispatch, ga, gaValid, completeScans } = useNasciTara();
  const total = state.scans.length;

  const status: ModuleStatus =
    completeScans === 0 ? 'waiting' : completeScans === total ? 'complete' : 'partial';

  const summary =
    completeScans === 0
      ? 'Serve almeno un’ecografia con data e tutte e quattro le misure.'
      : `${completeScans} di ${total} ${total === 1 ? 'ecografia completa' : 'ecografie complete'}${
          completeScans < total ? ' — le incomplete verranno ignorate.' : '.'
        }`;

  return (
    <ModuleCard
      id="modulo-misure"
      title="Misurazioni ecografiche"
      subtitle={summary}
      icon={<IconScan />}
      status={status}
      hiddenOnMobile={hiddenOnMobile}
    >
      <div className="scan-list">
        {state.scans.map((scan, index) => {
          const scanGa = gaValid ? gaAtDate(scan.date, state.referenceDate, ga) : NaN;
          const result = gaValid
            ? analyseUltrasound(
                {
                  id: scan.id,
                  date: scan.date,
                  hcMm: scan.hcMm === '' ? null : Number(scan.hcMm),
                  acMm: scan.acMm === '' ? null : Number(scan.acMm),
                  flMm: scan.flMm === '' ? null : Number(scan.flMm),
                  bpdMm: scan.bpdMm === '' ? null : Number(scan.bpdMm),
                },
                state.referenceDate,
                ga,
              )
            : null;

          return (
            <article className="scan" key={scan.id}>
              <header className="scan__head">
                <span className="scan__name">Eco {index + 1}</span>
                <span className={`scan__ga${Number.isFinite(scanGa) ? '' : ' scan__ga--missing'}`}>
                  {Number.isFinite(scanGa) ? `${formatGA(scanGa)} sett` : 'data mancante'}
                </span>
                {state.scans.length > 1 ? (
                  <button
                    type="button"
                    className="scan__remove"
                    onClick={() => dispatch({ type: 'removeScan', id: scan.id })}
                    aria-label={`Rimuovi ecografia ${index + 1}`}
                  >
                    Rimuovi
                  </button>
                ) : null}
              </header>

              <div className="scan__body">
                <DateField
                  label="Data dell’esame"
                  value={scan.date}
                  max={state.referenceDate}
                  fullWidth
                  onChange={(v) => dispatch({ type: 'setScan', id: scan.id, field: 'date', value: v })}
                />

                {MEASURES.map((m) => {
                  const raw = scan[m.field];
                  const expected = Number.isFinite(scanGa) ? expectedMm(m.key, scanGa) : NaN;
                  const implausible =
                    raw !== '' && Number.isFinite(expected) && !isMeasurePlausible(m.key, Number(raw), scanGa);
                  return (
                    <NumberField
                      key={m.key}
                      label={m.label}
                      note={m.full}
                      ariaLabel={`${m.full}, ecografia ${index + 1}, in millimetri`}
                      unit="mm"
                      min={1}
                      max={500}
                      value={raw}
                      onChange={(v) =>
                        dispatch({ type: 'setScan', id: scan.id, field: m.field, value: v })
                      }
                      hint={
                        Number.isFinite(expected)
                          ? `atteso ~${Math.round(expected)} mm${implausible ? ' — controlla' : ''}`
                          : ''
                      }
                      hintWarn={implausible}
                    />
                  );
                })}
              </div>

              <footer className="scan__efw">
                {result ? (
                  <>
                    <span>EFW</span>
                    <strong>{Math.round(result.efw).toLocaleString('it-IT')} g</strong>
                    <span>· p{Math.round(result.pct)}</span>
                    {result.efwWho !== null ? (
                      <span>· WHO {Math.round(result.efwWho).toLocaleString('it-IT')} g</span>
                    ) : (
                      <span>· WHO non applicabile prima della 22ª</span>
                    )}
                  </>
                ) : (
                  <span>Compila data e quattro misure per calcolare l’EFW</span>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn--dashed"
        onClick={() => dispatch({ type: 'addScan' })}
        disabled={state.scans.length >= 12}
      >
        + Aggiungi ecografia
      </button>
    </ModuleCard>
  );
}
