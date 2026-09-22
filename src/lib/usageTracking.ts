import { supabase } from './supabaseClient';
export type UsageStep = 'landing' | 'pregnancy' | 'measurements' | 'dashboard';
export type UsageAction = UsageStep | 'start' | 'identify' | 'heartbeat' | 'pdf_download' | 'pdf_error' | 'import_started' | 'import_confirmed' | 'import_error';
let session: { id: string; secret: string } | null = null;
let queue: Promise<void> = Promise.resolve();
let enabled = false;
let identifiedEmail: string | null = null;
/** Only explicit product events are accepted. No arbitrary payload or medical data. */
export function trackUsage(action: UsageAction, email?: string): void {
  if (!enabled || !session || !supabase) return;
  if (action === 'identify') {
    const nextEmail = email?.trim().toLowerCase() ?? null;
    if (identifiedEmail && nextEmail !== identifiedEmail) {
      session = { id: crypto.randomUUID(), secret: crypto.randomUUID() };
      trackUsage('start');
    }
    identifiedEmail = nextEmail;
  }
  const current = session;
  const client = supabase;
  queue = queue.then(async () => {
    if (!enabled || current !== session) return;
    const { error } = await client.rpc('record_usage', {
      p_id: current.id, p_secret: current.secret, p_action: action, p_release: '0.5',
      p_email: action === 'identify' ? email?.trim().toLowerCase() ?? null : null,
    });
    if (error) throw new Error('Usage collection unavailable');
  }).catch(() => { /* Best effort: never block the calculator or log personal data. */ });
}
export function setUsageConsent(value: boolean): void {
  if (value === enabled) return;
  enabled = value;
  identifiedEmail = null;
  session = value ? { id: crypto.randomUUID(), secret: crypto.randomUUID() } : null;
  if (value) trackUsage('start');
}
export function hasUsageConsent(): boolean { return enabled; }
