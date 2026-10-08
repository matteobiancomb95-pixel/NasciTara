/**
 * 1.0: chi scrive (mamma o papà) e la fase della famiglia, da campi chiusi: nessun testo libero dal client.
 * Dopo la nascita la settimana di gravidanza non c'è più: conta l'età del bebe.
 */
export function familyContext(body: Record<string, unknown>): { line: string; born: boolean; papa: boolean } {
  const papa = body.role === "papa";
  const phase = body.phase === "neo" || body.phase === "genitore" ? body.phase : "attesa";
  const weeks = body.ageWeeks == null ? NaN : Number(body.ageWeeks);
  const age = Number.isFinite(weeks) && weeks >= 0 ? Math.min(Math.round(weeks), 999) : null;
  const who = papa ? "il papà" : "la mamma";
  const stage = phase === "attesa"
    ? "in attesa del bebe"
    : `bebe già nato${age !== null ? (age < 13 ? ` da ${age} settimane` : ` da circa ${Math.round(age / 4.35)} mesi`) : ""}${phase === "neo" ? " (primi 3 mesi)" : ""}`;
  return { line: `Scrive ${who}, ${stage}.`, born: phase !== "attesa", papa };
}
