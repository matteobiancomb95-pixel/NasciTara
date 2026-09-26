# Ambiente di test

Separato dalla produzione: nessun dato reale viene letto o scritto.

| | Produzione | Test |
|---|---|---|
| Sito | https://nascitara.vercel.app | https://nascitara-test.vercel.app (+ ogni anteprima Vercel) |
| Supabase | `wgvsclworxvtuepxbmmg` "NasciTara" | `wtjuqelxwabobmxzgbgh` "NasciTara Test" (eu-west-1, piano gratuito) |
| Registrazione | conferma via email | attiva subito, nessuna email |
| Invio PDF via email | attivo | non attivo (nessuna chiave Brevo; la funzione accetta solo il dominio di produzione) |
| Google | da configurare | non attivo |

La barra blu "Ambiente di test" in alto e il titolo "NasciTara · TEST" compaiono solo qui (`VITE_APP_ENV=test`).

## Come si usa
- **Online**: https://nascitara-test.vercel.app. Dopo un nuovo deploy di anteprima (`npx vercel deploy`),
  riallineare l'indirizzo fisso: `npx vercel alias set <url-anteprima> nascitara-test.vercel.app`.
  Tutte le anteprime Vercel usano il database di test (variabili d'ambiente *Preview*).
- **In locale**: `npm run dev:test` legge `.env.test.local` (mai in Git) e usa il database di test.
  `npm run dev` senza variabili resta l'anteprima con account finto.
- **Account di prova**: Giulia Prova, 28 settimane, consenso dato. Email e password sono in `.env.test.local`
  (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`). Se ne possono creare altri liberamente dalla registrazione.

## Manutenzione
- Stesse migrazioni della produzione (0001–0007). Per una nuova migrazione, applicarla prima qui:
  `npx supabase db push --db-url "postgresql://postgres.wtjuqelxwabobmxzgbgh:$SUPABASE_TEST_DB_PASSWORD@$SUPABASE_TEST_DB_HOST:5432/postgres"`
  (variabili in `.env.test.local`). Il progetto collegato alla CLI resta quello di produzione.
- Funzione email: `npx supabase functions deploy send-screening --project-ref wtjuqelxwabobmxzgbgh`.
- I progetti Supabase gratuiti si mettono in pausa dopo 7 giorni senza uso: si riattivano dalla dashboard.
- Per azzerare i dati di prova: Supabase → progetto "NasciTara Test" → Authentication → Users (elimina gli utenti)
  e Table Editor → `screenings`.
