import { ReportImport } from '../components/ReportImport';
import { DateField, NumberField } from '../components/Field';
import { IconArrow, IconBack, IconPlus, IconTrash } from '../components/icons';
import { useNasciTara, type ScanState } from '../state/NasciTaraStore';
import { analyseUltrasound } from '../lib/analysis';
import { expectedMm, isMeasurePlausible, type MeasureKey } from '../lib/biometry';
import { formatGA, gaAtDate } from '../lib/gestationalAge';
import { localeOf, type Key } from '../i18n';

type ScanNumField = 'hcMm' | 'acMm' | 'flMm' | 'bpdMm';

/**
 * Le quattro misure, nell'ordine in cui contano davvero per il peso:
 * l'addome porta oltre meta' dell'informazione, il femore un quarto.
 */
const MEASURES: Array<{
  key: MeasureKey;
  field: ScanNumField;
  abbr: string;
  short: Key;
  full: Key;
}> = [
  { key: 'AC', field: 'acMm', abbr: 'AC', short: 'meas.acShort', full: 'meas.acFull' },
  { key: 'FL', field: 'flMm', abbr: 'FL', short: 'meas.flShort', full: 'meas.flFull' },
  { key: 'HC', field: 'hcMm', abbr: 'HC', short: 'meas.hcShort', full: 'meas.hcFull' },
  { key: 'BPD', field: 'bpdMm', abbr: 'BPD', short: 'meas.bpdShort', full: 'meas.bpdFull' },
];

/**
 * Schermata 3 — misure ecografiche.
 *
 * Si apre con UNA sola ecografia. Tre blocchi vuoti in apertura sono
 * esattamente cio' che fa sembrare la pagina un modulo clinico.
 *
 * Ogni ecografia e' una riga orizzontale allineata a sinistra: data e quattro
 * misure sulla stessa linea, come sul referto.
 */
export function MeasurementsPage() {
  const { state, dispatch, completeScans, t } = useNasciTara();
  const total = state.scans.length;
  const canContinue = completeScans >= 1;

  return (
    <div className="col col--wide stack--loose stack">
      <div>
        <button type="button" className="back" onClick={() => dispatch({ type: 'goTo', page: 'pregnancy' })}>
          <IconBack />
          {t('nav.back')}
        </button>
        <h1 className="h1">{t('meas.title')}</h1>
        <p className="lead">{t('meas.lead')}</p>
      </div>

      <ReportImport />
      <div className="stack stack--tight">
        {state.scans.map((scan, index) => (
          <ScanRow key={scan.id} scan={scan} index={index} canRemove={total > 1} />
        ))}
      </div>

      <button type="button" className="btn-ghost" onClick={() => dispatch({ type: 'addScan' })}>
        <IconPlus />
        {t('meas.add')}
      </button>

      <div>
        <button
          type="button"
          className="btn btn--block"
          disabled={!canContinue}
          onClick={() => dispatch({ type: 'goTo', page: 'dashboard' })}
        >
          {t('meas.cta')}
          <IconArrow />
        </button>
        <p className="btn-note">
          {!canContinue
            ? t('meas.needOne')
            : completeScans < total
              ? t('meas.ignored', { done: completeScans, total })
              : t('meas.ctaNote')}
        </p>
      </div>
    </div>
  );

}

function ScanRow({ scan, index, canRemove }: { scan: ScanState; index: number; canRemove: boolean }) {
    const { state, dispatch, ga, gaValid, t, lang } = useNasciTara();
    const scanGa = gaValid ? gaAtDate(scan.date, state.referenceDate, ga) : NaN;
    const hasGa = Number.isFinite(scanGa);

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

    const missing = MEASURES.filter((m) => scan[m.field] === '').length + (scan.date ? 0 : 1);

    return (
      <article className="scan">
        <header className="scan__head">
          <span className="scan__name">{t('meas.scan', { n: index + 1 })}</span>
          <span className="scan__ga">{hasGa ? t('meas.ga', { ga: formatGA(scanGa) }) : t('meas.noDate')}</span>
          {canRemove ? (
            <button
              type="button"
              className="scan__remove"
              onClick={() => dispatch({ type: 'removeScan', id: scan.id })}
              aria-label={`${t('meas.remove')} — ${t('meas.scan', { n: index + 1 })}`}
            >
              <IconTrash />
            </button>
          ) : null}
        </header>

        <div className="scan__scroll">
          <div className="scan__row">
            <DateField
              label={t('meas.date')}
              value={scan.date}
              max={state.referenceDate}
              ariaLabel={`${t('meas.date')} — ${t('meas.scan', { n: index + 1 })}`}
              onChange={(v) => dispatch({ type: 'setScan', id: scan.id, field: 'date', value: v })}
            />

            {MEASURES.map((m) => {
              const raw = scan[m.field];
              const expected = hasGa ? expectedMm(m.key, scanGa) : NaN;
              const odd =
                raw !== '' && Number.isFinite(expected) && !isMeasurePlausible(m.key, Number(raw), scanGa);
              return (
                <NumberField
                  key={m.key}
                  label={`${m.abbr} - ${t(m.full)}`}
                  ariaLabel={`${t(m.full)} (${m.abbr}) — ${t('meas.scan', { n: index + 1 })}`}
                  unit={t('unit.mm')}
                  min={1}
                  max={500}
                  value={raw}
                  onChange={(v) => dispatch({ type: 'setScan', id: scan.id, field: m.field, value: v })}
                  footnote={
                    Number.isFinite(expected)
                      ? odd
                        ? t('meas.check', { value: Math.round(expected) })
                        : t('meas.expected', { value: Math.round(expected) })
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="scan__maternal">
          <NumberField
            label={lang === 'it' ? 'Peso mamma il giorno della visita' : 'Mother’s weight on the scan date'}
            hint={lang === 'it' ? 'Facoltativo · usato solo nel livello NasciTara' : 'Optional · NasciTara layer only'}
            unit="kg" min={1} max={300} step={0.1} value={scan.pesoMammaOsservazione}
            onChange={value => dispatch({ type: 'setScan', id: scan.id, field: 'pesoMammaOsservazione', value })}
          />
        </div>
        <div className="scan__foot">
          {result ? (
            <>
              {t('meas.fromThis', { value: '' })}
              <strong>
                {Math.round(result.efw).toLocaleString(localeOf(lang))} {t('unit.g')}
              </strong>
            </>
          ) : missing === 1 ? (
            t('meas.missingOne')
          ) : (
            t('meas.missingMany', { n: missing })
          )}
        </div>
      </article>
    );
  }
