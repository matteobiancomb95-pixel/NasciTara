# Supabase CLI senza Portachiavi

La CLI salva il proprio accesso nel Portachiavi di macOS. Ogni nuova versione scaricata da `npx`
viene vista come un programma diverso e macOS chiede la password del Mac.

Per evitarlo:

1. La CLI è fissata nel progetto (`devDependencies`: `supabase@2.119.0`), quindi `npx supabase` usa sempre lo stesso binario.
2. L'accesso arriva da un token personale in un file locale, mai nel Portachiavi:
   - crea un token su https://supabase.com/dashboard/account/tokens (nome: `nascitara-cli`);
   - crea il file `.env.supabase.local` nella cartella del progetto con una sola riga:
     `SUPABASE_ACCESS_TOKEN=sbp_...`
   - il file è escluso da git (`.env*` in `.gitignore`). Non va condiviso né incollato in chat.
3. I comandi caricano il token prima della CLI, per esempio:
   `set -a && . ./.env.supabase.local && set +a && npx supabase functions deploy ai --project-ref wgvsclworxvtuepxbmmg --use-api`

Per revocare l'accesso basta eliminare il token dalla dashboard.
