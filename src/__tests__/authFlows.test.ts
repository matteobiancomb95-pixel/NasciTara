import { describe, it, expect, vi } from 'vitest';
import { authMessage, callbackError, checkGoogleProvider } from '../lib/authFeedback';
import { mailOutcome, welcomeMessage } from '../../supabase/functions/_shared/mail';

describe('authentication failures', () => {
  it('explains SMTP failures rather than asking the user to change a valid password', () => {
    expect(authMessage('Error sending confirmation email', 'it')).toContain('servizio email');
    expect(authMessage('Error sending recovery email', 'en')).toContain('email service');
    expect(authMessage('email not confirmed', 'it')).toContain('Conferma prima');
  });
  it('maps expired and cancelled callback errors without reflecting provider text', () => {
    expect(callbackError('https://nascitara.tech/#error=access_denied&error_code=otp_expired&error_description=secret')).toBe('otp_expired');
    expect(callbackError('https://nascitara.tech/?error=access_denied')).toBe('access_denied');
    expect(callbackError('https://nascitara.tech/#access_token=secret')).toBeUndefined();
    expect(callbackError('https://nascitara.tech/?error=malicious-text')).toBe('oauth_callback_error');
    expect(authMessage('otp_expired','it')).toContain('scaduto');
  });
  it('blocks Google locally when the provider is not configured', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({external:{google:false}})));
    await expect(checkGoogleProvider('https://project.supabase.co','public-key',fetcher)).rejects.toThrow('provider is not enabled');
  });
  it('allows the OAuth flow only when Google is enabled', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({external:{google:true}})));
    await expect(checkGoogleProvider('https://project.supabase.co','public-key',fetcher)).resolves.toBeUndefined();
    expect(fetcher.mock.calls[0][0]).toBe('https://project.supabase.co/auth/v1/settings');
  });
  it('does not navigate when settings are unavailable or malformed', async () => {
    for (const response of [new Response('error',{status:503}),new Response('{}')]) {
      await expect(checkGoogleProvider('https://project.supabase.co','public-key',vi.fn().mockResolvedValue(response))).rejects.toThrow();
    }
  });
  it('keeps concurrent provider checks bounded and consistent', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({external:{google:false}})));
    const results = await Promise.allSettled(Array.from({length:20},()=>checkGoogleProvider('https://project.supabase.co','public-key',fetcher)));
    expect(results.every(r=>r.status==='rejected')).toBe(true);
  });
});
describe('transactional email outcomes', () => {
  it('requires a provider message ID before reporting acceptance', () => {
    expect(mailOutcome(201,'<id@brevo>')).toBe('accepted');
    expect(mailOutcome(201,undefined)).toBe('unknown');
    expect(mailOutcome(200,'')).toBe('unknown');
    expect(mailOutcome(503,'id')).toBe('unknown');
    expect(mailOutcome(401,undefined)).toBe('failed');
  });
  it('welcome confirms the account and references the explicit PDF action', () => {
    expect(welcomeMessage('it').textContent).toContain('registrazione è completata');
    expect(welcomeMessage('it').textContent).toContain('https://nascitara.tech/');
    expect(welcomeMessage('en').textContent).toContain('download your estimate as a PDF');
  });
});
