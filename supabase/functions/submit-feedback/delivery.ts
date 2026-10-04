export type Env = (name: string) => string | undefined;

export type Fields = { at: string; who: string; type: string; stars: number | string; text: string; contact: string; email: string; version: string; platform: string };

export async function sendMail(f: Fields, env: Env, fetcher: typeof fetch = fetch): Promise<string> {
  const key = env("BREVO_API_KEY"), sender = env("BREVO_SENDER_EMAIL");
  const to = env("FEEDBACK_EMAIL") || sender;
  if (!key || !sender || !to) return "not_configured";
  try {
    const lines = [
      `Tipo: ${f.type}${f.stars ? ` · voto ${f.stars}/5` : ""}`,
      `Utente: ${f.who} · ${f.platform} · v${f.version}`,
      `Email: ${f.email || "—"} · ricontatto: ${f.contact}`,
      "",
      f.text,
    ];
    const res = await fetcher("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        sender: { name: "NasciTara · La tua voce", email: sender },
        to: [{ email: to }],
        ...(f.email && f.contact === 'sì' ? { replyTo: { email: f.email } } : {}),
        subject: `La tua voce · ${f.type}${f.stars ? ` · ${f.stars}/5` : ""}`,
        textContent: lines.join("\n"),
      }),
    });
    if (!res.ok) return `brevo_${res.status}`;
    const data = await res.json().catch(() => ({}));
    return typeof data.messageId === "string" && data.messageId ? "ok" : "brevo_unknown";
  } catch {
    return "brevo_unreachable";
  }
}

export async function appendRow(row: unknown[], env: Env, fetcher: typeof fetch = fetch): Promise<string> {
  const raw = env("GOOGLE_SERVICE_ACCOUNT_JSON"), sheet = env("FEEDBACK_SHEET_ID");
  if (!raw || !sheet) return "not_configured";
  let account: { client_email?: string; private_key?: string };
  try {
    account = parseAccount(raw);
  } catch {
    return "google_json_invalid";
  }
  if (!account.client_email || !account.private_key) return "google_json_incomplete";
  let token: string;
  try {
    token = await googleToken(account.client_email, account.private_key, fetcher);
  } catch (e) {
    return e instanceof Error && e.message.startsWith("google_") ? e.message : "google_auth_failed";
  }
  // Accetta sia l'ID sia l'URL completo del foglio.
  const id = sheet.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? sheet.trim();
  const range = encodeURIComponent(env("FEEDBACK_SHEET_RANGE") || "A:I");
  try {
    const res = await fetcher(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return data?.updates?.updatedRows === 1 ? "ok" : "sheet_unknown";
    }
    const detail = await res.json().catch(() => ({}));
    const reason = detail?.error?.details?.find?.((d: { reason?: string }) => d.reason)?.reason ?? detail?.error?.status ?? "";
    return `sheet_${res.status}${reason ? "_" + reason : ""}`;
  } catch {
    return "sheet_unreachable";
  }
}

/** Il JSON puo' arrivare incollato con virgolette in piu' o in base64. */
export function parseAccount(raw: string) {
  let text = raw.trim();
  if (!text.startsWith("{") && !text.startsWith('"')) text = atob(text);
  let value = JSON.parse(text);
  if (typeof value === "string") value = JSON.parse(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("google_json_invalid");
  if (typeof value.private_key === "string") value.private_key = value.private_key.replace(/\\n/g, "\n");
  return value;
}

/** Lo stesso utente ha sempre lo stesso codice, ma dal codice non si risale all'account. */
export async function pseudonym(id: string, env: Env): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("SUPABASE_SERVICE_ROLE_KEY")!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("feedback:" + id)));
  return "u_" + [...sig.slice(0, 6)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token OAuth dell'account di servizio (JWT RS256), solo permesso sui fogli. */
export async function googleToken(clientEmail: string, privateKey: string, fetcher: typeof fetch = fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (data: Uint8Array | string) => btoa(typeof data === "string" ? data : String.fromCharCode(...data)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600 }));
  let key: CryptoKey;
  try {
    const pem = privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  } catch {
    throw new Error("google_private_key_invalid");
  }
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claims}`)));
  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${b64(sig)}` }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== "string") throw new Error(`google_token_${res.status}_${String(data.error ?? "").slice(0, 40)}`);
  return data.access_token;
}
