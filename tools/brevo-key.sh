#!/bin/sh
# Aggiorna BREVO_API_KEY nei Secrets del progetto Supabase di produzione, verificandola prima con Brevo.
# La chiave si incolla nascosta e non viene mai stampata. Serve .env.supabase.local (sh tools/supabase-token.sh).
set -eu
cd "$(dirname "$0")/.."
REF=wgvsclworxvtuepxbmmg
[ -s .env.supabase.local ] || { echo "Prima esegui: sh tools/supabase-token.sh"; exit 1; }
set -a; . ./.env.supabase.local; set +a

printf "Incolla la chiave API di Brevo (inizia con xkeysib-, non viene mostrata) e premi Invio: "
stty -echo; read -r KEY; stty echo; echo
case "$KEY" in
  xkeysib-*) ;;
  xsmtpsib-*) echo "Questa è una chiave SMTP. Serve una chiave API: Brevo › SMTP e API › Chiavi API › Genera nuova chiave."; exit 1 ;;
  *) echo "Non sembra una chiave API di Brevo (deve iniziare con xkeysib-). Nessuna modifica."; exit 1 ;;
esac

CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -H "api-key: $KEY" -H 'accept: application/json' https://api.brevo.com/v3/account)
if [ "$CODE" != "200" ]; then
  echo "Brevo ha rifiutato la chiave (HTTP $CODE). Controlla che sia attiva e, se usi IP autorizzati, che siano disattivati per le chiavi API. Nessuna modifica."
  exit 1
fi

PATH=/usr/local/bin:$PATH npx supabase secrets set "BREVO_API_KEY=$KEY" --project-ref "$REF" >/dev/null
echo "Fatto: chiave verificata con Brevo e salvata in Supabase (progetto NasciTara)."
