import { authUser, cors, readJson } from "../_shared/http.ts";
import { appendRow, pseudonym, sendMail } from './delivery.ts';
import { deliver, feedbackFields, parseFeedback } from './workflow.ts';

Deno.serve(async (req: Request) => {
  const { json, early } = cors(req);
  if (early) return early;
  try {
    const auth = await authUser(req);
    if (!auth) return json({ status: 'unauthorized' }, 401);
    const input = parseFeedback(await readJson(req, 12_000));
    if (!input) return json({ status: 'bad_request' }, 400);
    const { user, admin } = auth;
    const env = (name: string) => Deno.env.get(name);
    // Prepare before reserving: a local validation/crypto failure must not consume quota.
    const fields = feedbackFields(input, user, await pseudonym(user.id, env), new Date().toISOString());
    const { data: reservation, error } = await admin.rpc('reserve_feedback_attempt', { p_owner: user.id });
    if (error || !reservation) return json({ status: 'unavailable' }, 503);
    if (reservation.status === 'limited') return json({ status: 'limited', retry_after: reservation.retry_after }, 429);
    if (reservation.status !== 'ok' || !reservation.id) return json({ status: 'unavailable' }, 503);
    const result = await deliver(fields, {
      mail: f => sendMail(f, env), sheet: row => appendRow(row, env),
    }, async () => {
      const { error: releaseError } = await admin.rpc('release_feedback_attempt', { p_owner: user.id, p_attempt: reservation.id });
      if (releaseError) console.error('feedback_quota_release_failed');
    });
    if (result.mail !== 'ok' || result.sheet !== 'ok') console.error('feedback_delivery', { attempt: reservation.id, mail: result.mail, sheet: result.sheet });
    // Provider configuration belongs in server logs, never in the customer interface.
    return json({ status: result.status }, result.status === 'ok' ? 200 : 503);
  } catch {
    console.error('feedback_exception');
    return json({ status: 'unavailable' }, 503);
  }
});
