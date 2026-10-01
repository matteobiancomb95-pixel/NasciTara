import { authUser, cors, readJson, str } from "../_shared/http.ts";

/**
 * La tua voce -> Google Sheet (non pubblico) tramite account di servizio.
 * Colonne: timestamp · utente (pseudonimo) · tipo · voto · descrizione · ricontatto · email (solo se si') · versione · piattaforma.
 * Segreti: GOOGLE_SERVICE_ACCOUNT_JSON, FEEDBACK_SHEET_ID, facoltativo FEEDBACK_SHEET_RANGE (default "A:I").
 */
Deno.serve(async (req: Request) => {
  const { json, early } = cors(req);
  if (early) return early;
  try {
    const auth = await authUser(req);
    if (!auth) return json({ status: "unauthorized" }, 401);
    const { user, admin } = auth;
    const body = await readJson(req, 12_000);
    const kind = body?.kind === "idea" ? "idea" : body?.kind === "review" ? "review" : null;
    const text = str(body?.text, 2000);
    const stars = Number(body?.stars);
    if (!body || !kind || text.length < 3 || (kind === "review" && !(stars >= 1 && stars <= 5))) return json({ status: "bad_request" }, 400);
    const account = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON"), sheet = Deno.env.get("FEEDBACK_SHEET_ID");
    if (!account || !sheet) return json({ status: "not_configured" }, 503);
    const { data: allowed, error } = await admin.rpc("reserve_feedback", { p_owner: user.id });
    if (error) return json({ status: "unavailable" }, 503);
    if (!allowed) return json({ status: "limited" }, 429);
    const contact = body.contact === true;
    const row = [
      new Date().toISOString(),
      await pseudonym(user.id),
      kind === "review" ? "recensione" : "nuova funzionalità",
      kind === "review" ? Math.round(stars) : "",
      text,
      contact ? "sì" : "no",
      contact ? user.email ?? "" : "",
      str(body.version, 16),
      body.platform === "desktop" ? "desktop" : "mobile",
    ];
    const token = await googleToken(JSON.parse(account));
    const range = encodeURIComponent(Deno.env.get("FEEDBACK_SHEET_RANGE") || "A:I");
    const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!result.ok) {
      console.error("sheets", result.status, (await result.text()).slice(0, 300));
      return json({ status: "unavailable" }, 503);
    }
    return json({ status: "ok" });
  } catch (e) {
    console.error("feedback", e);
    return json({ status: "unavailable" }, 503);
  }
});

/** Lo stesso utente ha sempre lo stesso codice, ma dal codice non si risale all'account. */
async function pseudonym(id: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("feedback:" + id)));
  return "u_" + [...sig.slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token OAuth dell'account di servizio (JWT RS256), solo permesso sui fogli. */
async function googleToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (data: Uint8Array | string) => btoa(typeof data === "string" ? data : String.fromCharCode(...data)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claims}`)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${b64(sig)}` }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok || typeof data.access_token !== "string") throw new Error("google_auth " + res.status);
  return data.access_token;
}
