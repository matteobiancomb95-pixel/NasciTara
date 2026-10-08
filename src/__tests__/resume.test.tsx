import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { demoState, emptyState, NasciTaraProvider, type NasciTaraState } from '../state/NasciTaraStore';
import { hasProgress, pickResume, type SavedScreening } from '../lib/screeningStorage';

const EMAIL = 'mamma@example.test';
const rec = (id: string, updatedAt: string, state: NasciTaraState): SavedScreening => ({ id, createdAt: updatedAt, updatedAt, state });
const done = { ...demoState(), lang: 'it' as const, email: EMAIL, emailConsent: true, completed: true };
const empty = { ...emptyState(), lang: 'it' as const, email: EMAIL, emailConsent: true, gaWeeks: 33 as const, gaDays: 0 as const };

// Account simulato: utente gia' registrato, storico online letto, nessuna rete.
const account = { user: { id: 'u1', email: EMAIL, email_confirmed_at: 'x', user_metadata: {} }, profile: { firstName: 'Matteo', lastName: '', gaWeeks: 33, gaReference: null, consent: true }, ready: true, recovering: false, cloudReady: true, cloud: [] as SavedScreening[], status: '', authError: '', preview: false };
vi.mock('../lib/supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }));
vi.mock('../state/AccountContext', () => ({ useAccount: () => account, AccountProvider: ({ children }: { children: unknown }) => children, profileOf: () => account.profile, useFamily: () => ({ role: 'mamma', phase: 'attesa', birthDate: null, born: false }) }));

import { AppShell } from '../components/AppShell';
import { MammaProvider } from '../state/MammaStore';

afterEach(cleanup);

describe('scelta del percorso da riaprire', () => {
  it('uno screening vuoto non è un percorso', () => {
    expect(hasProgress(empty)).toBe(false);
    expect(hasProgress(done)).toBe(true);
    expect(hasProgress({ ...empty, scans: [{ ...demoState().scans[0] }] })).toBe(true);
  });
  it('preferisce il percorso completato più recente, ignora vuoti e altri account', () => {
    const records = [
      rec('vuoto-recente', '2026-10-04T00:24:00Z', empty),
      rec('completo', '2026-10-03T21:22:00Z', done),
      rec('altro-account', '2026-10-04T01:00:00Z', { ...done, email: 'altra@example.test' }),
    ];
    expect(pickResume(records, EMAIL)?.id).toBe('completo');
    expect(pickResume([records[0]], EMAIL)).toBeNull();
  });
});

describe('accesso da un dispositivo nuovo (bug 0.9.1)', () => {
  it('riapre il percorso salvato nell’account invece di ricominciare', async () => {
    account.cloud = [rec('vuoto', '2026-10-04T00:24:00Z', empty), rec('completo', '2026-10-03T21:22:00Z', done)];
    render(<NasciTaraProvider initial={{ ...emptyState(), lang: 'it' }}><MammaProvider><AppShell /></MammaProvider></NasciTaraProvider>);
    expect(await screen.findByRole('button', { name: 'Riepilogo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText(/conosciamo il tuo bebe/)).toBeNull();
  });
  it('senza percorsi salvati mostra il benvenuto', async () => {
    account.cloud = [rec('vuoto', '2026-10-04T00:24:00Z', empty)];
    render(<NasciTaraProvider initial={{ ...emptyState(), lang: 'it' }}><MammaProvider><AppShell /></MammaProvider></NasciTaraProvider>);
    expect(await screen.findByText(/conosciamo il tuo bebe/)).toBeInTheDocument();
  });
});
