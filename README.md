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

## Le quattro schermate

Navigazione sequenziale dentro la stessa finestra, con header e footer fissi.
L'unico indicatore di avanzamento è la barra alta 3 px sul bordo inferiore
dell'header.

| # | Schermata | Contenuto | Come si prosegue |
|---|---|---|---|
| 1 | Atterraggio | spiegazione, raccolta email + consenso, toggle IT/EN | **Inizia** |
| 2 | Gravidanza & Genitori | epoca e data (obbligatorie), dati costituzionali (facoltativi) | **Continua** |
| 3 | Misure ecografiche | una riga orizzontale per ecografia | **Scopri peso e lunghezza del bebè** |
| 4 | Dashboard | peso, percentile, lunghezza, curva, proiezione, PDF | — |

Dalla schermata 2 in poi compare una **striscia di riepilogo** che cresce:
*33+2 settimane · 3 ecografie · nascita prevista il 29 ottobre*.

**Ogni sessione parte vuota**, dalla pagina di atterraggio. L'esempio si carica
solo su richiesta: link *Guarda un esempio*, oppure `#demo` nell'URL.

La schermata 3 si apre con **una sola ecografia**: tre blocchi vuoti in apertura
sono ciò che fa sembrare la pagina un modulo clinico. Le incomplete non bloccano
nulla, vengono ignorate con un messaggio esplicito.

### Raccolta email e GDPR

Dalla pagina di atterraggio esce **solo l'indirizzo email**, e solo con consenso
esplicito (tabella `email_signups`, migrazione `0002`). I dati della gravidanza
e delle ecografie **non lasciano mai il dispositivo**: il calcolo è interamente
client-side, e il testo del consenso lo dichiara. Senza email si prosegue lo
stesso.

Il toggle di lingua sta sulla pagina di atterraggio, come da specifica: una
volta dentro il flusso la lingua resta quella scelta.

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

I numeri sono rimasti identici anche dopo il passaggio a quattro schermate e la
proiezione a 45 settimane.

`src/__tests__/efwRegression.test.ts` blocca questi valori, più:

- la curva Hadlock 1991 riprodotta entro lo **0,03 %** sulla mediana e lo
  **0,42 %** sui centili fra la 20ª e la 40ª settimana;
- il limite di validità della formula WHO (a 20 settimane sovrastimerebbe del 32 %);
- la contrazione della pendenza (un trend netto sopravvive, una serie piatta e
  rumorosa non genera accelerazioni spurie);
- la garanzia che **i dati paterni non tocchino** peso stimato né percentile di
  popolazione;
- la coerenza fra dashboard e grafico: `pointAt(oggi)` deve coincidere
  esattamente con la stima principale, altrimenti la stessa schermata
  mostrerebbe due numeri diversi per lo stesso istante;
- il formato del nome del PDF (`yyyy_mm_dd`), con date locali e non UTC.

### Proiezione oltre il termine

Il grafico arriva a **45 settimane** come richiesto, ma oltre la **42ª** i
numeri non hanno più dati dietro:

- la curva di Hadlock 1991 è adattata su dati fra la 20ª e la 40ª settimana.
  `exp(0,578 + 0,332·EG − 0,00354·EG²)` continua a salire fino alla 47ª, ma è il
  polinomio che prosegue, non la biologia;
- dopo la nascita la crescita cambia regime e segue curve completamente diverse
  (standard di crescita infantile OMS), non quella intrauterina.

Per questo `isExtrapolated` marca ogni punto oltre la soglia, il grafico mostra
la zona come campitura grigia etichettata, e la dashboard aggiunge la nota. È
un prolungamento matematico, non una previsione.

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

Palette di marca conservata per intero, ma **separata per ruolo**: tre dei sei
colori non reggono testo su bianco.

| Token | Hex | Su bianco | Ruolo |
|---|---|---|---|
| `--brand` | `#ff395c` | 3,50:1 | forma e campitura. Testo solo ≥ 24 px/400 o 19 px/600 |
| `--brand-soft` | `#ffa0ae` | 1,93:1 | solo decorazione. **Mai testo, mai bordo indispensabile** |
| `--fill` | `#ffd0d7` | 1,38:1 | solo campitura. Sopra ci va `#333333` (9,18:1) |
| `--ink` | `#333333` | 12,63:1 | tutto il testo, e il fondo dei bottoni |
| `--ink-2` | `rgba(51,51,51,.72)` | **5,25:1** | testo secondario |
| `--ink-on-fill` | `rgba(51,51,51,.75)` | **4,79:1** su rosa | testo sopra le campiture |
| `--hairline` | `#8e8e8e` | 3,28:1 | **declassato a non testuale**: griglie, divisori, disabilitati |
| `--btn-bg` / `--btn-ink` | `#333333` / `#ffffff` | 12,63:1 | bottoni primari |

Due decisioni che vale la pena conoscere:

- **`#8e8e8e` non è il grigio del testo secondario.** Su bianco fa 3,28:1 e
  sopra il rosa crolla a 2,38:1. Il testo secondario è lo stesso `#333333` con
  meno voce. Se in un CSS compare `color: #8e8e8e`, quasi certamente è un bug.
- **Il campo a riposo è campito di rosa, quello attivo diventa bianco** e si
  solleva. Un bordo in `#ffa0ae` a 1,93:1 per molti utenti non esisterebbe: se
  un controllo deve avere un perimetro percepibile va campito, non contornato.

`#ff395c` compare **una volta sola per schermata**: la barra di avanzamento
nelle schermate 1-3, il punto sulla settimana scelta nella 4.

Font **Nunito Sans** da Google Fonts con `preconnect`. Sei gradini
(64/32/20/17/15/13, ridotti a 44/26 su mobile) e due soli pesi, 400 e 600: il
700 resta al wordmark. Nessun maiuscoletto con letter-spacing positivo — è la
firma tipografica del referto, ed è ciò da cui il prodotto doveva allontanarsi.

### Brand kit

Gli originali stanno in `Brand Identity/`. I derivati usati dall'app sono
generati da lì:

```bash
python3 tools/png_tools.py trim "Brand Identity/wordmark-nascitara.png" src/assets/brand/wordmark.png
sips -Z 256 src/assets/brand/logo-mark.png --out src/assets/brand/logo-mark.png
for s in 32 180 192 512; do sips -Z $s "Brand Identity/Favicon.png" --out public/favicon-$s.png; done
```

`tools/png_tools.py` è un decoder PNG in Python puro: serve perché su questa
macchina non c'è Pillow e `sips` sa ridimensionare ma non ritagliare sul
contenuto.

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
