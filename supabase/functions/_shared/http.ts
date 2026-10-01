import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = new Set([
  "https://nascitara.tech",
  "https://www.nascitara.tech",
  "https://nascitara.vercel.app",
  "https://nascitara-test.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export type Json = Record<string, unknown>;

/** Risposte JSON con CORS limitato ai domini di NasciTara. */
export function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://nascitara.tech",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
  const json = (body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers });
  let early: Response | null = null;
  if (origin && !ORIGINS.has(origin)) early = json({ status: "forbidden" }, 403);
  else if (req.method === "OPTIONS") early = new Response(null, { status: 204, headers });
  else if (req.method !== "POST") early = json({ status: "method_not_allowed" }, 405);
  return { json, early };
}

/** L'utente dal token della richiesta (verificato da Supabase) e un client di servizio. */
export async function authUser(req: Request): Promise<{ user: User; admin: SupabaseClient } | null> {
  const bearer = req.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) return null;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  return { user, admin };
}

/** Corpo JSON entro un limite di dimensione. */
export async function readJson(req: Request, maxBytes = 40_000): Promise<Json | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Json) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
