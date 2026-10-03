import { mailOutcome, reminderMessage } from './mail.ts';
export interface DueReminder { kind: string; ref_id: string; slot: string; email: string; lang: string; title: string; detail: string; at_local: string; }
/** Retry only an explicit temporary rejection. A timeout/5xx might follow acceptance. */
export function reminderRetryable(status: number): boolean { return [401, 403, 408, 429].includes(status); }
export async function deliverReminder(r: DueReminder, key: string, sender: string, request: typeof fetch = fetch) {
  try {
    const res = await request('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ sender: { name: 'NasciTara', email: sender }, to: [{ email: r.email }], ...reminderMessage(r) }),
    });
    const body = await res.json().catch(() => ({}));
    const id = typeof body.messageId === 'string' ? body.messageId.slice(0, 250) : null;
    const status = mailOutcome(res.status, id);
    // Il motivo indicato da Brevo (chiave non valida, IP non autorizzato...) senza segreti ne' destinatari.
    const reason = typeof body.code === 'string' ? body.code : '';
    const detail = typeof body.message === 'string' ? body.message.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 120) : '';
    return { status, provider_id: id, retryable: status === 'failed' && reminderRetryable(res.status), last_error: status === 'accepted' ? null : [`brevo_${res.status}`, reason, detail].filter(Boolean).join(' · ') };
  } catch { return { status: 'unknown' as const, provider_id: null, retryable: false, last_error: 'network_unknown' }; }
}
