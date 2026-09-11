/**
 * Peso fetale stimato (EFW) secondo Hadlock 1985.
 *
 * ESTRATTO VERBATIM dal prototipo `curva-di-matilde.html`.
 * Coefficienti, ordine dei termini e nomi dei parametri sono invariati:
 * qualunque modifica qui invalida `src/__tests__/efwRegression.test.ts`.
 *
 * Tutte le misure sono in CENTIMETRI. Il risultato e' in GRAMMI.
 * Per convertire dai millimetri del referto: `mm / 10`.
 */

/** Hadlock a 4 parametri — BPD + HC + AC + FL. E' la formula principale. */
export function hadlock4(bpd: number, hc: number, ac: number, fl: number): number {
  return Math.pow(
    10,
    1.3596 - 0.00386 * ac * fl + 0.0064 * hc + 0.00061 * bpd * ac + 0.0424 * ac + 0.174 * fl,
  );
}

/** Hadlock a 3 parametri — HC + AC + FL (senza biparietale). */
export function hadlock3(hc: number, ac: number, fl: number): number {
  return Math.pow(10, 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl);
}

/** Hadlock a 3 parametri — BPD + AC + FL (senza circonferenza cranica). */
export function hadlock2(bpd: number, ac: number, fl: number): number {
  return Math.pow(10, 1.335 - 0.0034 * ac * fl + 0.0316 * bpd + 0.0457 * ac + 0.1623 * fl);
}

/** Comodita': le quattro misure in millimetri, come compaiono sul referto. */
export function hadlock4FromMm(bpdMm: number, hcMm: number, acMm: number, flMm: number): number {
  return hadlock4(bpdMm / 10, hcMm / 10, acMm / 10, flMm / 10);
}
