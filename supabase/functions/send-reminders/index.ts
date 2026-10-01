import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { mailOutcome, reminderMessage } from "../_shared/mail.ts";

/**
 * Chiamata da pg_cron ogni 5 minuti con l'header x-cron-secret (segreto REMINDERS_CRON_SECRET).
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
  const due = (data ?? []) as Array<{ kind: string; ref_id: string; slot: string; email: string; lang: string; title: string; detail: string; at_local: string }>;
  let sent = 0;
  for (const r of due) {
    let status: "accepted" | "failed" | "unknown" = "unknown";
    let providerId: string | null = null;
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ sender: { name: "NasciTara", email: sender }, to: [{ email: r.email }], ...reminderMessage(r) }),
      });
      const body = await res.json().catch(() => ({}));
      providerId = typeof body.messageId === "string" ? body.messageId.slice(0, 250) : null;
      status = mailOutcome(res.status, providerId);
    } catch {
      /* Esito sconosciuto: non si ritenta, per non mandare doppioni. */
    }
    if (status === "accepted") sent++;
    await admin.from("reminder_log").update({ status, provider_id: providerId }).match({ kind: r.kind, ref_id: r.ref_id, slot: r.slot });
  }
  return new Response(JSON.stringify({ due: due.length, sent }), { headers: { "Content-Type": "application/json" } });
});

/** Confronto a tempo costante del segreto. */
async function same(a: string, b: string): Promise<boolean> {
  const h = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
