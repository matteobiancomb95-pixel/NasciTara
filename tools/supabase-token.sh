#!/bin/sh
# Salva il token della CLI di Supabase in .env.supabase.local (escluso da git), cosi' la CLI
# non chiede piu' la password del Mac. Il token non viene mai stampato.
#   sh tools/supabase-token.sh          copia l'accesso gia' salvato dalla CLI nel Portachiavi
#                                       (macOS chiede la password un'ultima volta)
#   sh tools/supabase-token.sh --paste  incolla un token creato su supabase.com/dashboard/account/tokens
set -eu
cd "$(dirname "$0")/.."
FILE=.env.supabase.local

if [ "${1:-}" = "--paste" ]; then
  printf "Incolla il token (non viene mostrato) e premi Invio: "
  stty -echo; read -r TOKEN; stty echo; echo
else
  RAW=$(security find-generic-password -s "Supabase CLI" -a supabase -w 2>/dev/null) || {
    echo "Nessun accesso della CLI nel Portachiavi. Usa: sh tools/supabase-token.sh --paste"; exit 1; }
  case "$RAW" in
    go-keyring-base64:*) TOKEN=$(printf %s "${RAW#go-keyring-base64:}" | base64 -D) ;;
    *) TOKEN=$RAW ;;
  esac
fi

case "$TOKEN" in
  sbp_*) ;;
  *) echo "Il valore non sembra un token Supabase (deve iniziare con sbp_). Nessun file modificato."; exit 1 ;;
esac

umask 077
printf 'SUPABASE_ACCESS_TOKEN=%s\n' "$TOKEN" > "$FILE"
echo "Fatto: token salvato in $FILE (solo per te, escluso da git)."
