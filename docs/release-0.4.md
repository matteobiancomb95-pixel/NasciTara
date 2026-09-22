# NasciTara 0.4 — utilizzo e percorso

Il consenso facoltativo nella prima pagina avvia una sessione casuale, conservata solo in memoria. Nessun tracciamento viene inviato prima del consenso. La raccolta email precedente resta separata. L'indirizzo viene associato al percorso solo quando l'utente preme Inizia; è dichiarato, non verificato tramite login.

In Supabase → Table Editor:
- `usage_session_report`: email, primo/ultimo evento, ultima pagina, fase più avanzata, pagine effettivamente raggiunte, risultati e PDF. Nessun dato clinico.
- `usage_funnel`: sessioni che raggiungono ogni fase e sessioni inattive nella fase più avanzata.
- `email_signups`: indirizzi raccolti, anche senza consenso al monitoraggio.

`inactive_30m` indica assenza di eventi per 30 minuti, non un abbandono certo. Le schede visibili inviano un segnale ogni minuto. Ricaricare apre una nuova sessione; una persona può averne più di una. Visite prima del consenso e persone che non acconsentono non sono contate. Il tracciamento è best effort: connessione interrotta o blocchi del browser possono lasciare eventi mancanti. Un ritorno indietro aggiorna l'ultima pagina senza cancellare la fase più avanzata. Sessioni con risultati sono `completed` anche se in seguito si torna indietro.

Accesso ai report solo amministrativo. La RPC pubblica permette eventi enumerati su una sessione protetta da UUID segreto; non espone letture. Non è una verifica d'identità e non impedisce a un bot di creare sessioni fittizie. Non usare i conteggi come utenti verificati.

La raccolta si arresta deselezionando la casella, senza eliminare i dati già raccolti. Pulizia giornaliera automatica delle sessioni più vecchie di 90 giorni con pg_cron; le email nella precedente tabella email_signups non sono soggette a questa nuova scadenza.

Verifiche: 55 test, build TypeScript/Vite; prova SQL transazionale di isolamento fra sessioni, accesso anonimo limitato e registrazione dei risultati.
