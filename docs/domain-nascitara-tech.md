# Dominio nascitara.tech

DNS e HTTPS verificati il 29 settembre 2026.

## Progetto

- Hosting: progetto Vercel `nascitara`, team `matteo-bianco`.
- Dominio principale: `https://nascitara.tech`.
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

Sostituire il record A principale `195.110.124.133` e il CNAME www precedentemente diretto a `nascitara.tech`. Conservare nameserver Register.it, record MX, TXT e gli altri record non relativi al sito. Record salvati su Register.it e verificati tramite i nameserver autoritativi. Vercel conferma entrambi i domini come configurati correttamente. Certificato HTTPS emesso per entrambi; richieste HTTPS con verifica del certificato hanno restituito HTTP 200 e la pagina NasciTara.

## Accesso e PDF

I due nuovi URL sono dichiarati in `auth.additional_redirect_urls`; la funzione `send-screening` accetta entrambi gli Origin. Il frontend usa l’origine corrente per i link di conferma, recupero password e OAuth.

`auth.site_url` è configurato su `https://nascitara.tech`; i quattro template in `supabase/templates` riportano lo stesso dominio nel footer. Applicare esclusivamente questi campi alla produzione, senza modificare SMTP, restrizioni password o altre impostazioni remote.

I ritorni autorizzati del vecchio sito restano abilitati per le email già inviate. Verificati i preflight CORS del servizio PDF: HTTP 204 con l’Origin corretto per entrambi i nuovi domini. Queste verifiche non inviano email né creano screening.

Non forzare il reindirizzamento del vecchio sito durante la migrazione: le bozze salvate solo nel browser appartengono al vecchio dominio; lo storico sincronizzato all’account si ritrova accedendo sul nuovo dominio. Nessun dato del database viene spostato o cancellato.
