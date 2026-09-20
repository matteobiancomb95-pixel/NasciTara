# NasciTara — preparazione 0.2

L’interfaccia indica v0.1 e prossimo rilascio v0.2. Avvio a vuoto, email obbligatoria, navigazione con marcatori, sezioni genitori espandibili, campi rosa, schede ecografia stabili e download PDF locale.

## Verifiche

- TypeScript e build Vite completati.
- 47 test di regressione passano. Nessuna formula EFW o lunghezza modificata.
- Chrome: percorso email → gravidanza → misure → risultati; input multi-cifra senza perdita del focus, nodi data e misure conservati durante gli aggiornamenti, download effettivo del PDF, nessun errore JavaScript, nessun overflow pagina a 390px, ricaricamento a vuoto.
- Corretto il punto terminale del grafico, che prima si fermava a 44,82 anziché 45 settimane.
- Corretto un test preesistente: la dispersione effettiva delle quattro formule nel suo esempio è 7,003965%, non inferiore al 6%. I coefficienti restano invariati.

## Limiti ancora aperti

- Il sesso selezionato modifica titolo e legenda. Non modifica EFW né lunghezza: questi modelli non contengono una variabile sesso. Servono un modello e riferimenti validati prima di introdurre un effetto numerico. Non è stato inventato un coefficiente.
- La proiezione oltre la nascita non è una curva di crescita neonatale. La coda fino a 45 settimane resta indicata come estrapolazione matematica.
- Supabase non configurato in questo ambiente: la preview locale accetta l’email senza salvarla e lo dichiara. In produzione senza backend o con errore il flusso segnala il mancato salvataggio. Applicare la migrazione 0003 e configurare le variabili prima del rilascio.
- Non è stato pubblicato alcun deployment né inviato alcun dato reale.

La preview locale si avvia con `npm run dev -- --host 127.0.0.1`.
