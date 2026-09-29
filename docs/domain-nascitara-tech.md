# Dominio nascitara.tech

Configurazione preparata il 29 settembre 2026.

## Progetto

- Hosting: progetto Vercel `nascitara`, team `matteo-bianco`.
- Dominio principale previsto: `https://nascitara.tech`.
- Alias aggiunto allo stesso progetto: `https://www.nascitara.tech`.
- Indirizzo precedente mantenuto: `https://nascitara.vercel.app`.
- Supabase produzione: `wgvsclworxvtuepxbmmg`; ambiente di test invariato.

## DNS Register.it

Vercel ha restituito questi record con `domains verify`:

| Tipo | Nome | Valore |
| --- | --- | --- |
| A | @ | 216.198.79.1 |
| A | @ | 64.29.17.1 |
| CNAME | www | 2f34eae66e983757.vercel-dns-017.com. |

Sostituire il record A principale `195.110.124.133` e il CNAME www precedentemente diretto a `nascitara.tech`. Conservare nameserver Register.it, record MX, TXT e gli altri record non relativi al sito. Stato alla preparazione: modifica DNS ancora da effettuare nel pannello Register.it.

## Accesso e PDF

I due nuovi URL sono dichiarati in `auth.additional_redirect_urls`; la funzione `send-screening` accetta entrambi gli Origin. Il frontend usa l’origine corrente per i link di conferma, recupero password e OAuth.

Durante la propagazione `auth.site_url` resta sul vecchio sito funzionante. Dopo verifica DNS e HTTPS di entrambi gli indirizzi:

1. Portare `auth.site_url` a `https://nascitara.tech` e aggiornare il dominio nel footer dei quattro template in `supabase/templates`.
2. Applicare solo queste modifiche a Supabase produzione, preservando SMTP, restrizioni password e configurazioni remote non dichiarate.
3. Verificare i ritorni di autenticazione e CORS di `send-screening` dal nuovo dominio.
4. Conservare i ritorni autorizzati del vecchio sito per le email già inviate.

Non forzare il reindirizzamento del vecchio sito durante la migrazione: le bozze salvate solo nel browser appartengono al vecchio dominio; lo storico sincronizzato all’account si ritrova accedendo sul nuovo dominio. Nessun dato del database viene spostato o cancellato.
