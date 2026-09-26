# NasciTara 0.6 — restyling da Claude Design

Implementazione del progetto Claude Design "Corredino AI mockups" → `NasciTara App.dc.html`
(https://claude.ai/design/p/0be347cd-4326-4bd7-a9c6-f6dff3e7deb5): 12 schermate mobile (M01–M11) e 6 desktop (D01–D06).

## Flusso
Account (registrazione con password o Google · accesso · recupero password) → benvenuto → percorso in 4 tab
(Inizio, Gravidanza, Ecografie, Risultati) → area riservata (Il tuo bebè, Corredino AI).
Il percorso si completa una volta (`completed` nello screening); dopo si atterra nell'area riservata.
`#demo` apre un esempio senza account, mai salvato.

## Scelte rispetto al mockup
- Dati della gravidanza invariati (decisione del 27/09/2026): niente "gemellare" e "primo figlio"; restano sesso,
  dati facoltativi dei genitori e curva personalizzata. La settimana si dichiara in registrazione e avanza col calendario.
- Solo Google tra i login social: Apple e Facebook non sono configurati e non compaiono.
- Referto: la foto è letta sul dispositivo e **non viene salvata**; lo screening ricorda solo origine e nome file.
  Per questo "Vedi referto" non c'è; "Sostituisci foto" rilegge una nuova immagine.
- Formati accettati: JPG, PNG, WebP (il mockup cita PDF: per un PDF serve uno screenshot).
- Corredino AI: regole deterministiche delle Specifiche (taglie dalla lunghezza alla nascita, stagione per mese,
  quantità per lavatrici a settimana). Spunte salvate nello screening. Lista condivisibile e scaricabile in PDF.
- Grigio secondario #8e8e8e usato per bordi e segnaposto; il testo secondario usa #767676 (contrasto AA).

## Configurazione Supabase (prima del deploy)
1. **Authentication → Sign In / Providers → Email**: attivo, con *Confirm email* attivo.
   Password: almeno 8 caratteri (l'app chiede anche un numero).
2. **Authentication → URL Configuration**: Site URL `https://nascitara.vercel.app`; Redirect URLs
   `https://nascitara.vercel.app/`, `https://nascitara-*-matteo-bianco.vercel.app/**` (anteprime), `http://localhost:5173/`, `http://127.0.0.1:5173/`.
   Se c'è ancora `https://nascitara.app/` (aggiunto per errore), va rimosso: il dominio non è in uso.
3. **Authentication → Emails → Templates**: tradurre in italiano *Confirm signup* e *Reset password*
   (il link resta `{{ .ConfirmationURL }}`). SMTP Brevo già configurato per l'invio.
4. **Google**:
   - Google Cloud Console → APIs & Services → OAuth consent screen (esterno, nome NasciTara, dominio nascitara.vercel.app).
   - Credentials → Create OAuth client ID → *Web application*; Authorized redirect URI:
     `https://wgvsclworxvtuepxbmmg.supabase.co/auth/v1/callback`.
   - Supabase → Authentication → Sign In / Providers → Google: incollare Client ID e Client secret, abilitare.
   Finché Google non è abilitato, il pulsante mostra "L'accesso con Google non è ancora attivo".
5. Nessuna migrazione nuova: nome, cognome, settimana e consenso stanno in `auth.users.raw_user_meta_data`
   (`first_name`, `last_name`, `ga_weeks`, `ga_reference`, `consent_version` = `0.6`, `consent_at`).
   Gli utenti registrati prima (link email) accedono con "Password dimenticata?" e confermano settimana e consenso una volta.

## Anteprima locale
Senza `VITE_SUPABASE_URL` l'app in sviluppo usa un account finto, solo nella scheda del browser (banner giallo).
