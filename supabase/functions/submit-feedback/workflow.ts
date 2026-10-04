import type { Fields } from './delivery.ts';
export type Input = { kind: 'review' | 'idea'; text: string; stars: number | null; contact: boolean; version: string; platform: string };
export function parseFeedback(body: Record<string, unknown> | null): Input | null {
  if (!body || !['review', 'idea'].includes(String(body.kind)) || typeof body.text !== 'string') return null;
  const text = body.text.trim();
  if (text.length < 3 || text.length > 2000) return null;
  if (body.kind === 'review' && (typeof body.stars !== 'number' || !Number.isInteger(body.stars) || body.stars < 1 || body.stars > 5)) return null;
  if (body.contact !== undefined && typeof body.contact !== 'boolean') return null;
  return { kind: body.kind as Input['kind'], text, stars: body.kind === 'review' ? body.stars as number : null,
    contact: body.contact === true, version: typeof body.version === 'string' ? body.version.trim().slice(0,16) : '',
    platform: body.platform === 'desktop' ? 'desktop' : 'mobile' };
}
export function feedbackFields(input: Input, user: { email?: string }, who: string, at: string): Fields {
  return { at, who, type: input.kind === 'review' ? 'recensione' : 'nuova funzionalità', stars: input.stars ?? '', text: input.text,
    contact: input.contact ? 'sì' : 'no', email: user.email ?? '', version: input.version, platform: input.platform };
}
/** Only definite rejections release the quota. A timeout can follow a successful external write. */
export function definitelyRejected(result: string): boolean {
  return result === 'not_configured' || /^google_(json_|private_key_|token_4)/.test(result)
    || /^brevo_4\d\d$/.test(result) || /^sheet_4\d\d(?:_|$)/.test(result);
}
export async function deliver(fields: Fields, channels: { mail: (f: Fields) => Promise<string>; sheet: (r: unknown[]) => Promise<string> }, release: () => Promise<void>) {
  const outcomes = await Promise.allSettled([channels.mail(fields), channels.sheet(Object.values(fields))]);
  const [mail, sheet] = outcomes.map(r => r.status === 'fulfilled' ? r.value : 'unknown');
  if (mail === 'ok' || sheet === 'ok') return { status: 'ok', mail, sheet };
  if (definitelyRejected(mail) && definitelyRejected(sheet)) await release();
  return { status: 'unavailable', mail, sheet };
}
