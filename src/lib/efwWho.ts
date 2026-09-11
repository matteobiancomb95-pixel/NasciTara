/**
 * Peso fetale stimato secondo il modello WHO (Kiserud et al. 2017),
 * log-cubico sulla circonferenza addominale con termine lineare sulla cranica.
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`. Coefficienti invariati.
 *
 * Misure in CENTIMETRI, risultato in GRAMMI.
 *
 * LIMITE DI VALIDITA': sotto la 22a settimana l'equazione sovrastima nettamente
 * (+30 % a 20 settimane, +98 % a 16) perche' il termine cubico degenera con
 * circonferenze addominali piccole. Usa `isWhoApplicable` prima di mostrarla.
 */

export const WHO_MIN_GA_WEEKS = 22;

export function whoEfw(hc: number, ac: number): number {
  const a = ac / 100;
  return Math.exp(
    5.08482 - 54.06633 * Math.pow(a, 3) - 95.80076 * Math.pow(a, 3) * Math.log(a) + 3.13637 * (hc / 100),
  );
}

/** La formula WHO va mostrata solo dalla 22a settimana in poi. */
export function isWhoApplicable(gaWeeks: number): boolean {
  return gaWeeks >= WHO_MIN_GA_WEEKS;
}

/** Restituisce `null` fuori dal campo di validita', invece di un numero sbagliato. */
export function whoEfwOrNull(hc: number, ac: number, gaWeeks: number): number | null {
  return isWhoApplicable(gaWeeks) ? whoEfw(hc, ac) : null;
}
