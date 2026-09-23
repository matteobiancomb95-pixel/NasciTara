# 0.51 — importazione immagini e risultati

- Data ecografia accanto alla conferma OCR: messaggio specifico per data assente, invalida o successiva al riferimento; il pulsante porta al campo da correggere. Nessuna data inventata.
- Verifica del formato tramite firma PNG/JPEG/WebP, non solo MIME o estensione. Copia stabile del file prima di azzerare l'input. Apertura tramite immagine HTML se createImageBitmap fallisce.
- Errori distinti per dimensioni, formato reale, file non accessibile e decodifica. Anteprima non lasciata interrotta in caso di errore di decodifica.
- Profilo e navigazione sullo stesso asse verticale; percorso unico scorrevole con indicatore animato e navigazione alle pagine raggiunte.
- Ombre condivise su card, ecografie, dati genitori e risultati.
- Risultati con icone, schede riepilogo, proiezione e grafico in un riquadro dedicato. Grafico scorrevole su telefono, selezione persistente al tocco, comandi Oggi/40 settimane. Nessuna modifica alle formule.

Verifiche: 89 test e build superati; importazione mobile con data assente poi corretta; apertura del PNG allegato dall'utente; percorso alternativo di decodifica provato nel browser reale; allineamento header a 390/1280 px; nessun overflow della pagina; selezione metrica/settimana e download PDF funzionanti. Il PNG allegato è uno screenshot dell'app: la causa precisa del precedente errore sul diverso file del PC non è riproducibile senza quel file originale.
