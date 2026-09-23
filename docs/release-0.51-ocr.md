# NasciTara 0.51 — correzione OCR e area riservata

## Comportamento
- Legge HC/CC, AC/CA, FL/LF e BPD/DBP, anche seguiti dalla descrizione italiana tra parentesi.
- Ricostruisce le righe dalle coordinate delle parole: le colonne delle etichette e dei valori restano associate.
- Uniforma ombre e contrasto prima della lettura, con tentativi aggiuntivi se mancano misure.
- Se l'unità manca, propone una conversione mm/cm entro intervalli di plausibilità euristici; la segnala per verifica. Questo controllo di importazione non è una validazione clinica e non modifica le formule Hadlock o FL→lunghezza.
- Mantiene vuote le misure discordanti, anche quando il conflitto emerge in un tentativo OCR successivo. Mostra numeri aggiuntivi sulla riga come possibili note da controllare.
- La foto non viene caricata sui server. Data, misure e unità richiedono conferma prima dell'importazione; visite già compilate non vengono sovrascritte.
- Consenso senza grassetto; testi e riquadri rivisti; icona profilo circolare allineata sotto il logo; area riservata ridisegnata e pannello dal basso su mobile.

## Verifiche
- 86 test automatici, compresi regressioni numeriche, unità esplicite spezzate, percentili, rapporti, unità non supportate e conflitti fra tentativi OCR.
- Build TypeScript + Vite completata.
- Foto fornita dall'utente provata nell'app: HC/CC 275, AC/CA 229, FL/LF 45, BPD/DBP 77 mm. Le conversioni senza unità e le annotazioni restano soggette a verifica umana.
- Test browser a 375 e 1280 px: asse logo/profilo coincidente, nessun overflow orizzontale, focus conservato durante la digitazione, dialogo chiudibile con Escape.
- Il campo fotocamera usa la stessa procedura OCR del caricamento: provato con il file reale. L'apertura della fotocamera nativa richiede una prova su telefono fisico.
- Foto di prova rimossa da public/ e dist/. Il prebuild blocca file estranei agli asset OCR autorizzati. Nessun referto personale incluso nel repository o nella pubblicazione.

## Dominio pubblico
L’endpoint email accetta anche l’origine https://nascitara.app. L’URL di ritorno dello stesso dominio viene aggiunto alla lista Supabase preservando gli indirizzi già configurati.
