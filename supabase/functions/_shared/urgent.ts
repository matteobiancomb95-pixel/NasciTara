/**
 * Parole che in gravidanza chiedono aiuto subito, prima di qualsiasi risposta AI.
 * Volutamente larghe: un falso allarme costa un avviso in piu', un'urgenza persa no.
 */
const MEDICAL = [
  /sanguin|emorragi|perdit\w* di sangue|perdo sangue|bleed/,
  /rottura delle acque|acque rott|rotto le acque|perd\w* (di )?liquid|waters? (have )?broke/,
  /non (lo |la )?sento (pi[uù] )?muover|non si muove (pi[uù])?|movimenti (ridotti|diminuiti|assenti)|no (fetal|baby) movement/,
  /dolore (forte|fortissimo|intenso|insopportabile)|severe pain/,
  /contrazioni (forti|regolari|ogni)|contractions/,
  /febbre (alta|a 3[89])|high fever/,
  /svenut|svenimento|convulsion|fainted|seizure/,
  /vista (offuscata|annebbiata|sfocata)|vedo (sfocato|annebbiato)|blurred vision/,
  /mal di testa (forte|fortissimo|intenso)|severe headache/,
  /non riesco a respirare|fatico a respirare|can'?t breathe/,
];
const CRISIS = [
  /suicid|farla finita|togliermi la vita|uccidermi|ammazzarmi|farmi del male|non voglio pi[uù] vivere|kill myself|end my life|self[- ]harm/,
];

export type Urgency = "none" | "medical" | "crisis";

export function urgencyOf(text: string): Urgency {
  const t = text.toLowerCase();
  if (CRISIS.some((r) => r.test(t))) return "crisis";
  if (MEDICAL.some((r) => r.test(t))) return "medical";
  return "none";
}
