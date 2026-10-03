import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { deliverReminder, type DueReminder } from "../_shared/reminderDelivery.ts";

/**
 * Chiamata da pg_cron ogni minuto con l'header x-cron-secret (segreto REMINDERS_CRON_SECRET).
 * claim_due_reminders riserva ogni invio una sola volta: un secondo giro non duplica le email.
 */
Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("REMINDERS_CRON_SECRET");
  const given = req.headers.get("x-cron-secret") ?? "";
  if (req.method !== "POST" || !secret || !(await same(given, secret))) return new Response("forbidden", { status: 403 });
  const key = Deno.env.get("BREVO_API_KEY"), sender = Deno.env.get("BREVO_SENDER_EMAIL");
  if (!key || !sender) return new Response("not_configured", { status: 503 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("claim_due_reminders");
  if (error) {
    console.error("claim", error.message);
    return new Response("unavailable", { status: 503 });
  }
  const due = (data ?? []) as DueReminder[];
  // The database caps each batch at 5. Parallel 15-second sends stay under the cron request timeout.
  const outcomes = await Promise.all(due.map(async r => {
    const result = await deliverReminder(r, key, sender);
    const { error: saveError } = await admin.from("reminder_log").update({
      ...result,
      next_attempt_at: result.retryable ? new Date(Date.now() + 5 * 60000).toISOString() : null,
    }).match({ kind: r.kind, ref_id: r.ref_id, slot: r.slot, status: "processing" });
    if (saveError) console.error("reminder_result_not_saved", saveError.code);
    return { accepted: result.status === "accepted", saved: !saveError };
  }));
  return new Response(JSON.stringify({ due: due.length, sent: outcomes.filter(r => r.accepted).length, recorded: outcomes.filter(r => r.saved).length }), { headers: { "Content-Type": "application/json" } });
});

/** Confronto a tempo costante del segreto. */
async function same(a: string, b: string): Promise<boolean> {
  const h = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
