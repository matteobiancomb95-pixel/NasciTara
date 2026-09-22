# NasciTara 0.5 — importazione foto, beta

Una foto JPG, PNG o WebP alla volta, massimo 12 MB e 24 megapixel. Per PDF/HEIC l'utente può usare uno screenshot ritagliato delle misure. Lettura nel browser con Tesseract.js: non è un LLM, non richiede chiavi AI né invia immagini a servizi esterni. Il lettore e il modello OCR vengono scaricati dallo stesso sito solo al primo caricamento di una foto; può essere lento su telefoni meno potenti.

Riconosce HC/CC, AC/CA, FL/LF, BPD/DBP e nomi completi in italiano/inglese, quando numero e unità mm/cm sono espliciti e adiacenti. Converte cm in mm; lascia vuoti campi assenti, discordanti o fuori intervallo. La data si propone solo se etichettata data esame/visita/ecografia (o exam/scan date). Non interpreta diagnosi e non ricava l'età gestazionale dalle età biometriche stampate: la gravidanza rimane da compilare nel modulo precedente.

La schermata di verifica mostra la foto, i valori modificabili e i frammenti pertinenti riconosciuti. Conferma obbligatoria prima dell'importazione. Servono una data valida non successiva al riferimento e almeno una misura; una visita parziale rimane esclusa dal calcolo fino al completamento. I valori preesistenti non vengono sovrascritti. Nessuna modifica a Hadlock-4, percentile o lunghezza.

Foto e testo OCR sono temporanei in memoria; rimossi dall'interfaccia e rilasciati su conferma, annullamento, cambio pagina o chiusura. Nessun salvataggio del referto su Supabase, analytics, localStorage o cache OCR. I valori confermati restano nello stato dell'app fino al ricaricamento.

Monitoraggio opt-in: import_started, import_confirmed, import_error, senza nome del file, foto, testo o misure. Il rilascio dell'app viene riportato nei report amministrativi. La migrazione 0006 accetta anche gli eventi della precedente 0.4 ancora aperta nei browser.

Limiti: immagini sfocate, ruotate, manoscritti, tabelle con unità separate o referti con più feti/date possono richiedere inserimento manuale. Verificata su referto sintetico con lettura reale nel browser; non dichiarata una percentuale di accuratezza o validazione clinica. Prossima valutazione: campione anonimizzato di referti reali e formati differenti.

Verifiche: 65 test superati, build riuscita, conversione reale OCR su immagine sintetica e prova browser di conferma/annullamento/formato non supportato. Nessun errore JavaScript o overflow nei risultati a 390 px. Audit delle dipendenze di produzione: zero vulnerabilità rilevate.
