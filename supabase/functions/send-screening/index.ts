import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const allowedOrigins = new Set([
  "https://nascitara.vercel.app",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://nascitara.vercel.app",
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
  const response = (status: string, code = 200) =>
    new Response(JSON.stringify({ status }), { status: code, headers });
  if (origin && !allowedOrigins.has(origin)) return response("forbidden", 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return response("method_not_allowed", 405);
  try {
    const bearer = req.headers.get("authorization") ?? "";
    if (!bearer.startsWith("Bearer ")) return response("unauthorized", 401);
    const url = Deno.env.get("SUPABASE_URL")!,
      anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(url, anon, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user?.email || !user.email_confirmed_at)
      return response("unauthorized", 401);
    const key = Deno.env.get("BREVO_API_KEY"),
      sender = Deno.env.get("BREVO_SENDER_EMAIL");
    if (!key || !sender) return response("not_configured", 503);
    // Bound the body before parsing. PDFs and reports are never logged or stored here.
    const reader = req.body?.getReader();
    if (!reader) return response("invalid", 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 2000000) {
        await reader.cancel();
        return response("too_large", 413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    const body = JSON.parse(new TextDecoder().decode(buffer));
    if (
      !/^[0-9a-f-]{36}$/i.test(body.screeningId ?? "") ||
      !/^[0-9a-f]{64}$/.test(body.revision ?? "") ||
      typeof body.pdf !== "string" ||
      body.pdf.length > 1800000 ||
      !/^JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(body.pdf)
    )
      return response("invalid", 400);
    const { data: screening, error } = await client
      .from("screenings")
      .select("revision,payload")
      .eq("id", body.screeningId)
      .eq("owner_id", user.id)
      .single();
    if (error || !screening) return response("not_found", 404);
    if (
      screening.revision !== body.revision ||
      screening.payload.page !== "dashboard" ||
      screening.payload.emailConsent !== true ||
      screening.payload.email.trim().toLowerCase() !== user.email.toLowerCase()
    )
      return response("stale", 409);
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: reservation, error: reserveError } = await admin.rpc(
      "reserve_screening_delivery",
      {
        p_owner: user.id,
        p_screening: body.screeningId,
        p_revision: body.revision,
      },
    );
    if (reserveError) return response("unavailable", 503);
    if (reservation.status !== "reserved") return response(reservation.status);
    let result: Response;
    try {
      const it = screening.payload.lang !== "en";
      result = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          sender: { name: "NasciTara", email: sender },
          to: [{ email: user.email }],
          subject: it ? "Il tuo risultato NasciTara" : "Your NasciTara result",
          textContent: it
            ? "In allegato trovi il risultato che hai richiesto su NasciTara. Puoi riprendere lo screening da I miei screening. Le stime non sostituiscono la valutazione del ginecologo."
            : "Attached is the result you requested on NasciTara. Resume it in My screenings. Estimates do not replace your clinician’s assessment.",
          attachment: [{ content: body.pdf, name: "NasciTara.pdf" }],
        }),
      });
    } catch {
      await admin
        .from("screening_deliveries")
        .update({ status: "unknown" })
        .eq("id", reservation.id);
      return response("unknown");
    }
    let providerId: string | undefined;
    try {
      providerId = (await result.json()).messageId;
    } catch {
      /* Unknown acceptance must not cause another send. */
    }
    const status = result.ok
      ? "accepted"
      : result.status >= 500
        ? "unknown"
        : "failed";
    const { error: updateError } = await admin
      .from("screening_deliveries")
      .update({
        status,
        provider_id:
          typeof providerId === "string" ? providerId.slice(0, 250) : null,
      })
      .eq("id", reservation.id);
    return response(updateError ? "unknown" : status);
  } catch {
    return response("unavailable", 503);
  }
});
