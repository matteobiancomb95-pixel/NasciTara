import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { authUser, cors, readJson, str, type Json } from "../_shared/http.ts";
import { urgencyOf } from "../_shared/urgent.ts";
import {
  INSIGHT_SCHEMA, SOURCES, SUPPLEMENT_SCHEMA, SUPPLEMENT_SYSTEM, TIMES,
  assistantSystem, insightSystem, urgentReply,
} from "../_shared/prompts.ts";

/**
 * AI di NasciTara (Claude API). Tre usi, tutti dietro consenso esplicito e con un tetto giornaliero:
 * - supplement: posologia dal testo OCR del foglio illustrativo;
 * - insight: un suggerimento non diagnostico dalle note del Notebook;
 * - assistant: risposte con fonti ufficiali (gravidanza o "come ti senti").
 * Nessun nome o email viene inviato al modello.
 */
const MODEL = "claude-opus-5-5";
const LIMITS = { supplement: 10, insight: 6, assistant: 30 } as const;
type Mode = keyof typeof LIMITS;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY"), timeout: 120_000, maxRetries: 1 }));

Deno.serve(async (req: Request) => {
  const { json, early } = cors(req);
  if (early) return early;
  try {
    const auth = await authUser(req);
    if (!auth) return json({ status: "unauthorized" }, 401);
    const { user, admin } = auth;
    if (!user.user_metadata?.ai_consent_at) return json({ status: "consent_required" }, 403);
    if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ status: "not_configured" }, 503);
    const body = await readJson(req);
    const mode = body?.mode as Mode;
    if (!body || !(mode in LIMITS)) return json({ status: "bad_request" }, 400);
    const lang = body.lang === "en" ? "en" : "it";

    // Urgenze: risposta fissa, prima e senza AI.
    if (mode === "assistant") {
      const messages = chat(body.messages);
      if (!messages) return json({ status: "bad_request" }, 400);
      const urgency = urgencyOf(messages[messages.length - 1].content as string);
      if (urgency !== "none") return json({ status: "ok", answer: urgentReply(urgency, lang), sources: [], urgent: urgency });
    }

    const { data: allowed, error } = await admin.rpc("reserve_ai_call", { p_owner: user.id, p_mode: mode, p_limit: LIMITS[mode] });
    if (error) return json({ status: "unavailable" }, 503);
    if (!allowed) return json({ status: "limited" }, 429);

    if (mode === "supplement") return json(await supplement(body));
    if (mode === "insight") return json(await insight(body, lang));
    return json(await assistant(body, lang));
  } catch (e) {
    console.error("ai", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    if (e instanceof Anthropic.RateLimitError) return json({ status: "busy" }, 503);
    return json({ status: "unavailable" }, 503);
  }
});

/** Una chiamata con risposta JSON vincolata allo schema. */
async function structured(system: string, user: string, schema: Json, effort: "low" | "medium", maxTokens: number): Promise<Json | null> {
  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    output_config: { effort, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    return JSON.parse(text.text) as Json;
  } catch {
    return null;
  }
}

async function supplement(body: Json): Promise<Json> {
  const text = str(body.text, 8000);
  if (text.length < 20) return { status: "unreadable" };
  const name = str(body.name, 80);
  const out = await structured(SUPPLEMENT_SYSTEM, `Integratore: ${name || "non indicato"}\n\nTesto del foglio illustrativo:\n${text}`, SUPPLEMENT_SCHEMA, "low", 4000);
  if (!out || out.found !== true) return { status: "not_found" };
  const times = Array.isArray(out.times) ? TIMES.filter((t) => (out.times as unknown[]).includes(t)) : [];
  if (!times.length) return { status: "not_found" };
  return { status: "ok", product: str(out.product, 80), quote: str(out.quote, 200), dose: str(out.dose, 60), times };
}

async function insight(body: Json, lang: "it" | "en"): Promise<Json> {
  const notes = Array.isArray(body.notes) ? body.notes.slice(0, 40) : [];
  const lines = notes
    .map((n) => (n && typeof n === "object" ? (n as Json) : {}))
    .map((n) => `${str(n.date, 10)} · sett. ${str(n.ga, 8)} · ${str(n.tag, 20)}: ${str(n.text, 600)}`)
    .filter((l) => l.length > 20);
  if (!lines.length) return { status: "empty" };
  const week = Number(body.week);
  const recent = notes.slice(0, 5).map((n) => str((n as Json)?.text, 600)).join("\n");
  const urgency = urgencyOf(recent);
  const out = await structured(insightSystem(lang), `Settimana attuale: ${Number.isFinite(week) ? week : "non nota"}\n\nNote, dalla più recente:\n${lines.join("\n")}`, INSIGHT_SCHEMA, "medium", 6000);
  if (!out) return { status: "unavailable" };
  return { status: "ok", title: str(out.title, 120), body: str(out.body, 400), question: str(out.question, 160), urgent: urgency };
}

type Msg = { role: "user" | "assistant"; content: string };
function chat(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw)) return null;
  const messages = raw.slice(-12).map((m) => ({ role: (m as Json)?.role === "assistant" ? "assistant" : "user", content: str((m as Json)?.content, 1500) }) as Msg).filter((m) => m.content);
  while (messages.length && messages[0].role !== "user") messages.shift();
  return messages.length && messages[messages.length - 1].role === "user" ? messages : null;
}

async function assistant(body: Json, lang: "it" | "en"): Promise<Json> {
  const topic = body.topic === "feelings" ? "feelings" : "pregnancy";
  const week = Number(body.week);
  const messages: Anthropic.Beta.BetaMessageParam[] = chat(body.messages)!;
  // La settimana come contesto operativo, dopo la domanda: il prompt di sistema resta identico e in cache.
  if (Number.isFinite(week)) {
    const last = messages[messages.length - 1];
    last.content = `${last.content}\n\n(Settimana di gravidanza: ${Math.round(week)})`;
  }
  const request = {
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: [{ type: "text" as const, text: assistantSystem(lang, topic), cache_control: { type: "ephemeral" as const } }],
    output_config: { effort: "medium" as const },
    tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 3, allowed_domains: SOURCES }],
  };
  let response = await anthropic().beta.messages.create({ ...request, messages });
  // La ricerca web puo' mettere in pausa il turno: si riprende passando la risposta cosi' com'e'.
  for (let i = 0; i < 2 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await anthropic().beta.messages.create({ ...request, messages });
  }
  if (response.stop_reason === "refusal") return { status: "refused" };
  let answer = "";
  const sources = new Map<string, string>();
  for (const block of response.content) {
    if (block.type !== "text") continue;
    answer += block.text;
    for (const c of block.citations ?? []) {
      if (c.type === "web_search_result_location" && c.url && !sources.has(c.url)) sources.set(c.url, c.title ?? new URL(c.url).hostname);
    }
  }
  answer = answer.replace(/\n{3,}/g, "\n\n").trim();
  if (!answer) return { status: "unavailable" };
  return { status: "ok", answer, sources: [...sources].slice(0, 4).map(([url, title]) => ({ url, title })), urgent: "none" };
}
