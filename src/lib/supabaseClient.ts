import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase.
 *
 * L'autenticazione non e' ancora implementata: per ora esiste solo lo schema
 * in `/supabase/migrations`. Il client resta `null` se le variabili non sono
 * configurate, cosi' l'app funziona anche senza backend.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
