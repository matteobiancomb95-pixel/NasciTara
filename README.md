# NasciTara

Stima il peso, il percentile e la lunghezza del nascituro combinando **tutte** le
ecografie, non una sola.

Nasce dal prototipo [`curva-di-matilde.html`](./curva-di-matilde.html), che resta
nel repo come riferimento: è la fonte di verità numerica di tutto ciò che sta in
`src/lib`.

---

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test di regressione
npm run build    # bundle di produzione in dist/
```

> **Serve Node 20+.** Sulla macchina dove il progetto è stato scritto Node non
> era installato, quindi `npm test` non è ancora stato eseguito qui. I valori
> attesi dei test sono stati verificati eseguendo il codice di `src/lib` in
> JavaScriptCore (`osascript -l JavaScript`): vedi *Verifica del refactor*.

---

## Struttura

```
src/
  lib/                       funzioni pure, senza DOM
    efwHadlock.ts            Hadlock 1985 — 4, 3 e 3 parametri
    efwWho.ts                WHO / Kiserud 2017, log-cubico su AC
    percentilesHadlock1991.ts curva di riferimento, z, percentili
    trajectory.ts            regressione sugli z + contrazione t²/(1+t²)
    customCurveGardosiLite.ts peso ottimale a termine personalizzato
    fetalLength.ts           lunghezza cranio-calcagno dal femore
    biometry.ts              biometria attesa + sensibilità alle misure
    gestationalAge.ts        epoca, date, data presunta parto
    analysis.ts              orchestrazione (nessuna formula propria)
  components/                i tre moduli + grafico e primitive UI
  state/NasciTaraStore.tsx   stato globale via context + reducer
  styles/                    token e foglio di stile
  __tests__/                 regressione
supabase/migrations/         schema
```

---

## I tre moduli

L'app **non è più un wizard**. I tre moduli sono indipendenti e sempre
compilabili: su desktop stanno tutti sullo stesso schermo, sotto gli 860 px
diventano tre schede. I moduli non attivi vengono nascosti ma **restano
montati**, quindi passando da una scheda all'altra non si perde né lo stato né
il fuoco.

| Modulo | Contenuto | Stato |
|---|---|---|
| 1 · Gravidanza & Genitori | epoca + data di riferimento (obbligatori), dati costituzionali di mamma e papà (facoltativi) | Completo / Parziale / In attesa |
| 2 · Misurazioni ecografiche | HC, AC, FL, BPD per ogni ecografia | idem |
| 3 · Risultati NasciTara | peso, percentile, lunghezza, curva e proiezione | idem |

Il peso stimato è anche un **readout in header**, aggiornato in tempo reale
mentre si compilano i moduli 1 e 2.

**Ogni sessione parte vuota.** L'esempio non si carica mai da solo: serve il
pulsante *Carica un esempio* nello stato iniziale, oppure `#demo` nell'URL.

Le ecografie incomplete non bloccano nulla: vengono ignorate, con il messaggio
*"2 di 3 ecografie complete — le incomplete verranno ignorate."*

---

## Verifica del refactor

`src/lib` è un'**estrazione**, non una riscrittura: coefficienti, ordine dei
termini e nomi dei parametri sono identici al prototipo. Eseguendo i moduli
estratti sul caso di riferimento (33+2 settimane, tre ecografie, mamma 167 cm /
64 kg):

| Grandezza | Prototipo | `src/lib` |
|---|---|---|
| Peso stimato | 2204 g | **2204,18 g** |
| Percentile | 47° | **47,36** |
| Lunghezza | 41,5 cm | **41,49 cm** |
| Proiezione a termine | 3,70 kg | **3,702 kg** |
| Intervallo 95 % | 1874 – 2534 g | **1874 – 2534 g** |
| Percentile personalizzato | 62° | **62,00** |

`src/__tests__/efwRegression.test.ts` blocca questi valori, più:

- la curva Hadlock 1991 riprodotta entro lo **0,03 %** sulla mediana e lo
  **0,42 %** sui centili fra la 20ª e la 40ª settimana;
- il limite di validità della formula WHO (a 20 settimane sovrastimerebbe del 32 %);
- la contrazione della pendenza (un trend netto sopravvive, una serie piatta e
  rumorosa non genera accelerazioni spurie);
- la garanzia che **i dati paterni non tocchino** peso stimato né percentile di
  popolazione.

---

## Dati dei genitori

| Dato | Entra nel calcolo? |
|---|---|
| Altezza mamma | sì — nucleo Gardosi-lite validato, 9,0 g/cm |
| Peso mamma | sì — nucleo validato, 8,5 g/kg con termine quadratico |
| Altezza papà | sì — **estensione NasciTara**, 4,0 g/cm, vale 0 se assente |
| Peso papà | no — raccolto come contesto |
| Età mamma / papà | no — raccolte come contesto |

Il nucleo materno è invariato. L'estensione paterna è additiva e vale
esattamente zero senza dati paterni, quindi con la sola mamma il risultato
coincide col prototipo — il test lo verifica.

Le età non entrano nel peso di proposito: l'evidenza è debole e non lineare, e
inventare un coefficiente peggiorerebbe una stima clinica.

Quando i dati mancano, la curva personalizzata funziona lo stesso e dichiara su
cosa si regge: *nessun dato* / *solo mamma* / *solo papà* / *mamma e papà*.

---

## Design system

Palette di marca conservata per intero, ma separata per **ruolo**: tre colori
richiesti non possono portare testo su bianco.

| Token | Hex | Contrasto su bianco | Ruolo |
|---|---|---|---|
| `--color-terra` | `#E2725B` | 3,09:1 | grafica e icone. **Non testo** |
| `--color-terra-soft` | `#FFC8B0` | 1,49:1 | riempimenti e badge. **Mai testo** |
| `--color-primary` | `#7FBF9E` | 2,13:1 | riempimenti decorativi. **Mai testo né bordi** |
| `--color-terra-ink` | `#BC4A30` | **5,05:1** | testo e link terracotta (AA) |
| `--color-primary-btn` | `#3C7D5D` | **4,90:1** | bottoni primari, testo bianco (AA) |
| `--color-primary-ui` | `#52A47A` | **3,02:1** | bordi e focus (SC 1.4.11) |
| `--color-border` | `#8B9592` | **3,08:1** | bordo dei campi (SC 1.4.11) |
| `--color-text` | `#333333` | 12,63:1 | testo 15–16 px (AA) |
| `--color-text-muted` | `#5F5F5F` | 6,39:1 | testo secondario (AA) |

Il **wordmark** del logo usa `#E2725B`: WCAG 1.4.3 esenta esplicitamente i
logotipi dal requisito di contrasto.

Font **Nunito Sans** da Google Fonts, caricato in `index.html` con `preconnect`
su `fonts.googleapis.com` e `fonts.gstatic.com`. Titoli 20–24 px SemiBold/Bold,
testo 15–16 px Regular, bottoni 16 px SemiBold con `letter-spacing: 0.03em`.

---

## Supabase

`supabase/migrations/0001_init.sql` crea `pregnancies` e `ultrasounds` con
vincoli, indici e trigger `updated_at`.

```bash
supabase db push          # oppure: incolla il file nello SQL editor
```

L'auth non è implementata. Il blocco RLS in fondo al file è commentato di
proposito: accendere RLS senza policy renderebbe le tabelle inaccessibili alla
chiave anon. Va abilitato **insieme** all'auth.

---

## Netlify

`netlify.toml` è già configurato (`npm run build` → `dist`, redirect SPA, cache
degli asset). Su Netlify vanno impostate le variabili di `.env.example`:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

> Tutto ciò che inizia con `VITE_` finisce nel bundle ed è pubblico. La
> `service_role` key non va mai messa lì.

---

## Skill e plugin consigliati

Non installati automaticamente: sono pacchetti di terze parti che scaricano ed
eseguono codice, quindi la scelta resta tua.

```bash
npx -y skills add anthropics/skills --skill frontend-design --agent claude-code
npx -y skills add coreyhaines31/marketingskills --skill copywriting copy-editing --agent claude-code
npx -y skills add rknall/claude-skills --skill 'SVG Logo Designer' --agent claude-code
npx -y skills add leonxlnx/taste-skill --skill design-taste-frontend --agent claude-code
```

I plugin si installano da una sessione interattiva:

```
/plugin install superpowers
/plugin install context7
```

Il logo in `src/assets/logo-nascitara.svg` è stato disegnato a mano: la skill
*SVG Logo Designer* non era disponibile in questa sessione. Simbolo e wordmark
sono vettoriali puri, il testo è in `<text>` con stack di fallback.
Consideralo un segnaposto: [`docs/prompt-logo.md`](./docs/prompt-logo.md)
contiene i prompt pronti per rigenerarlo (logo, favicon, copertine LinkedIn).

---

## Avvertenza

NasciTara è uno strumento personale di calcolo, **non un dispositivo medico**.
Le stime ecografiche del peso hanno un errore intrinseco di circa ±10 % anche in
mani esperte.
