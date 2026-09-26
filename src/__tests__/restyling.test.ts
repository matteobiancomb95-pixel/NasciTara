import { describe, it, expect } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { profileOf, authMessage } from '../state/AccountContext';
import { reducer, emptyState, emptyScan } from '../state/NasciTaraStore';
import { validSavedState } from '../lib/screeningStorage';
import { grams } from '../ui/kit';
import { dueFromWeek } from '../screens/AuthScreen';
import { toISO, todayUTC, addDays } from '../lib/gestationalAge';

const user = (m: Record<string, unknown>) => ({ id: 'u', email: 'a@b.it', user_metadata: m }) as unknown as User;

describe('account profile', () => {
  it('reads name, week and consent saved at sign-up', () => {
    expect(profileOf(user({ first_name: 'Giulia', last_name: 'Rossi', ga_weeks: 28, ga_reference: '2026-09-26', consent_version: '0.6' })))
      .toEqual({ firstName: 'Giulia', lastName: 'Rossi', gaWeeks: 28, gaReference: '2026-09-26', consent: true });
  });
  it('falls back to the Google name and asks week and consent later', () => {
    expect(profileOf(user({ full_name: 'Giulia Maria Rossi' }))).toEqual({ firstName: 'Giulia', lastName: 'Maria Rossi', gaWeeks: null, gaReference: null, consent: false });
    expect(profileOf(user({ given_name: 'Anna', family_name: 'Bianchi', ga_reference: 'ieri' })).gaReference).toBeNull();
  });
  it('turns Supabase errors into useful sentences', () => {
    expect(authMessage('Invalid login credentials', 'it')).toBe('Email o password non corrette.');
    expect(authMessage('User already registered', 'en')).toContain('already exists');
    expect(authMessage('whatever', 'it')).toContain('Riprova');
  });
});

describe('journey state', () => {
  it('saves a new scan into the empty first row, then appends', () => {
    const s0 = emptyState();
    const a = { ...emptyScan('2026-09-20'), hcMm: 275 as const, source: 'report' as const };
    const s1 = reducer(s0, { type: 'saveScan', scan: a });
    expect(s1.scans).toHaveLength(1);
    expect(s1.scans[0]).toMatchObject({ date: '2026-09-20', hcMm: 275, source: 'report' });
    const s2 = reducer(s1, { type: 'saveScan', scan: { ...emptyScan('2026-08-11'), acMm: 198 } });
    expect(s2.scans).toHaveLength(2);
    const s3 = reducer(s2, { type: 'saveScan', scan: { ...s2.scans[0], hcMm: 280 } });
    expect(s3.scans[0].hcMm).toBe(280);
  });
  it('completes the journey once and keeps the layette ticks', () => {
    let s = reducer(emptyState(), { type: 'complete' });
    expect(s).toMatchObject({ completed: true, page: 'dashboard', reached: 'dashboard' });
    s = reducer(s, { type: 'toggleGarment', key: '56:Tutine' });
    s = reducer(s, { type: 'setWashes', value: 2 });
    expect(s.corredino).toEqual({ washes: 2, checked: ['56:Tutine'] });
    s = reducer(s, { type: 'toggleGarment', key: '56:Tutine' });
    expect(s.corredino?.checked).toEqual([]);
    expect(validSavedState(s)).toBe(true);
  });
  it('rejects malformed new fields in saved screenings', () => {
    const s = emptyState();
    expect(validSavedState({ ...s, completed: 'yes' })).toBe(false);
    expect(validSavedState({ ...s, corredino: { washes: 5, checked: [] } })).toBe(false);
    expect(validSavedState({ ...s, scans: [{ ...emptyScan(), source: 'photo' }] })).toBe(false);
    expect(validSavedState({ ...s, scans: [{ ...emptyScan(), reportName: 'x'.repeat(121) }] })).toBe(false);
  });
});

describe('formatting', () => {
  it('groups thousands in grams like the mockup (1.180), also with four digits', () => {
    expect(grams(1180.4, 'it')).toBe('1.180');
    expect(grams(999, 'it')).toBe('999');
    expect(grams(3300, 'en')).toBe('3,300');
  });
  it('computes the due date from the declared week', () => {
    expect(toISO(dueFromWeek(28))).toBe(toISO(addDays(todayUTC(), 84)));
  });
});
