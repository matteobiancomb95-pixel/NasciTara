# NasciTara 0.3

I sette dati dei genitori sono facoltativi. Il peso materno pre-gravidanza resta il riferimento costituzionale; il peso alla data di riferimento e quello di ogni visita sono separati. deltaPesoMamma è la differenza rispetto al peso pre-gravidanza, oppure null se manca un operando. Zero e differenze negative sono conservati.

Hadlock-4, FL → lunghezza e i coefficienti esistenti non sono modificati. Il nuovo contesto segue le osservazioni in ordine temporale e non anticipa pesi futuri. Non vengono inventati coefficienti di correzione per età, peso paterno o variazione materna. La curva Gardosi-lite preesistente resta sperimentale; i dati aggiuntivi descrivono il contesto, senza promettere maggiore accuratezza.

Su mobile le misure sono disposte in due colonne (una sui display più stretti), gli input hanno font di almeno 16 px e il footer non copre il contenuto. Versione mostrata: 0.3.

## Pubblicazione

GitHub: collegare il repository NasciTara esistente e caricare il progetto; il workflow esegue test e build. Nessuna credenziale deve essere inclusa nel repository.

Supabase è il backend, non ospita il frontend Vite. Applicare le migrazioni 0001–0004 in ordine solo se non già applicate. La 0004 blocca l’accesso pubblico alle tabelle cliniche: l’app non salva gravidanze/ecografie nel database. email_signups mantiene la policy di solo inserimento prevista dalle migrazioni precedenti. Configurare VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY con la chiave pubblica del progetto; mai service_role.

Vercel: progetto nascitara creato e configurato con vercel.json. Importare il repository e impostare le due variabili pubbliche Supabase prima della build. Senza backend configurato, la raccolta email in produzione non permette di proseguire.

Stato al 20 settembre 2026: versione 0.3 pubblicata su https://nascitara.vercel.app; codice nel repository GitHub privato; migrazioni 0001–0004 applicate su Supabase. Variabili pubbliche configurate negli ambienti production e preview. Deploy eseguito via CLI: il collegamento automatico GitHub → Vercel richiede ancora la Login Connection GitHub nelle impostazioni Vercel.

Repository configurato: https://github.com/matteobiancomb95-pixel/NasciTara.git
Supabase: https://wgvsclworxvtuepxbmmg.supabase.co
Dashboard: https://supabase.com/dashboard/project/wgvsclworxvtuepxbmmg
Verifiche locali: 51 test passati; TypeScript e build riusciti; percorso completo su Chrome mobile e risultati a 320, 390, 768 e 1280 px senza overflow a transizione conclusa o errori JavaScript. Nessuna verifica completa WCAG dichiarata.

Verifica produzione: percorso completo nel browser, raccolta email, risultati responsive e download PDF riusciti. Record sintetico di prova rimosso. RLS attivo su tutte e tre le tabelle. Workflow GitHub completato con successo. jsPDF aggiornato a 4.2.1; audit delle dipendenze di produzione: zero vulnerabilità rilevate.
