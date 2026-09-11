# Prompt per generare il logo NasciTara

Tre prompt indipendenti, da incollare in un LLM che sappia produrre SVG
(Claude, GPT, Gemini). Ognuno è autosufficiente: contiene palette, tipografia e
vincoli, così puoi usarne uno senza gli altri.

Il logo attuale in `src/assets/logo-nascitara.svg` è un disegno a mano fatto
senza strumenti di design: consideralo un segnaposto da sostituire.

---

## Contesto comune

> NasciTara è un'app che stima peso, percentile e lunghezza del nascituro
> combinando tutte le ecografie di una gravidanza, non una sola. Il tono è
> caldo e rassicurante, non clinico: è uno strumento che due genitori aprono
> per curiosità e affetto, non un referto.

**Palette** (non inventarne altri):

| Ruolo | Hex |
|---|---|
| Principale, terracotta | `#E2725B` |
| Accento, terracotta chiaro | `#FFC8B0` |
| Verde salvia (usare con parsimonia) | `#7FBF9E` |
| Testo scuro | `#333333` |
| Fondo | `#FFFFFF` |

**Tipografia**: Nunito Sans. Wordmark in Bold (700), leggera crenatura
negativa (`letter-spacing: -0.4`). Il font non va incorporato: usa `<text>` con
stack di fallback `'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`.

---

## Prompt A — logo principale (SVG)

```
Disegna il logo di NasciTara come SVG puro, pronto per essere usato in
produzione.

CONTESTO
NasciTara è un'app che stima il peso e la crescita del nascituro combinando
più ecografie. Tono caldo e rassicurante, mai clinico.

CONCEPT
Un simbolo che unisca due idee: la maternità (pancia, grembo, culla, abbraccio)
e la crescita nel tempo (una curva che sale). Forme morbide e arrotondate,
tratti con estremità tonde (stroke-linecap="round"). Minimalista: al massimo
tre elementi grafici.

PALETTE — usa solo questi
  #E2725B  terracotta, colore principale: porta l'elemento focale
  #FFC8B0  terracotta chiaro, accento: porta la forma di supporto
  sfondo bianco, nessun riquadro colorato dietro il logo

TIPOGRAFIA
Il nome "NasciTara" accanto al simbolo, in un elemento <text>, font-family
'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif, font-weight
700, letter-spacing -0.4. Colore #E2725B. Niente testo convertito in tracciati.

REQUISITI TECNICI
- Un unico file SVG, viewBox="0 0 208 48", con width e height espliciti.
- Il simbolo occupa circa i primi 44 px di larghezza, il wordmark parte da x=58.
- Solo <path>, <circle>, <ellipse>, <text>. Niente <image>, niente base64,
  niente filtri, niente gradienti.
- Ogni forma ha fill o stroke espliciti: nessun colore ereditato.
- Accessibilità: role="img" più <title> e <desc> con id referenziati da
  aria-labelledby.
- Deve restare leggibile a 20 px di altezza: niente dettagli sotto i 2 px di
  spessore a quella scala.

DA EVITARE — errori già commessi su questo logo
1. NIENTE linea o curva diagonale che attraversa un cerchio o un anello
   chiuso: legge come il simbolo di divieto ⊘. Associazione pessima per un
   prodotto sulla gravidanza.
2. NIENTE curva quasi rettilinea che termina in un pallino sopra una forma
   tonda: legge come un lecca-lecca o un mestolo.
3. NIENTE archi il cui segmento fra i due estremi è lungo quanto il diametro
   (A rx ry 0 1 1 ...): la geometria degenera e il tratto si schiaccia.
   Se usi un arco, la corda deve essere sensibilmente più corta di 2×raggio.
4. Niente simboli medicali: siringhe, stetoscopi, croci, battiti cardiaci,
   ecografie riconoscibili come tali.
5. Niente cuori, niente cicogne, niente piedini: sono i cliché del settore.

CONSEGNA
Restituisci DUE SVG completi:
  1. il lockup orizzontale (simbolo + wordmark), viewBox="0 0 208 48"
  2. il solo simbolo, viewBox="0 0 48 48", centrato con margine uniforme
Sotto ogni SVG, due righe che spiegano quale idea porta ciascuna forma.
```

---

## Prompt B — favicon (SVG + PNG)

```
Partendo da questo simbolo SVG di NasciTara:

[INCOLLA QUI IL SOLO SIMBOLO, viewBox="0 0 48 48"]

Producine una versione favicon.

REQUISITI
- viewBox="0 0 32 32", ridisegnato per quella scala: non limitarti a scalare.
  Ispessisci i tratti e semplifica finché resta leggibile a 16x16.
- Al massimo due forme. Se il simbolo originale ne ha tre, fondine due o
  elimina la meno caratterizzante.
- Colori: #E2725B come principale. #FFC8B0 solo se resta distinguibile a
  16 px, altrimenti usa il solo terracotta.
- Nessun testo: a 16 px le lettere diventano fango.
- Il tracciato deve funzionare anche in monocromatico (un solo colore pieno):
  verifica che la silhouette resti riconoscibile.
- Aggiungi una variante con fondo tondo pieno #E2725B e simbolo in bianco,
  per le piattaforme che ritagliano l'icona in un cerchio (iOS, Android).

CONSEGNA
  1. favicon.svg — trasparente, viewBox="0 0 32 32"
  2. favicon-maskable.svg — fondo tondo pieno, viewBox="0 0 32 32"
  3. i tag <link> da mettere in <head>, compresi apple-touch-icon e
     il manifest web app
```

Per i PNG, dall'SVG:

```bash
# con cairosvg (pip install cairosvg)
for s in 16 32 48 180 192 512; do
  cairosvg favicon.svg -o favicon-${s}.png -W $s -H $s
done
```

---

## Prompt C — copertina LinkedIn (SVG → PNG)

I generatori di immagini sbagliano quasi sempre il testo. Conviene costruire la
copertina come SVG e rasterizzarla: colori esatti, testo corretto, ripetibile.

```
Disegna la copertina LinkedIn di NasciTara come SVG, poi dammi il comando per
esportarla in PNG.

FORMATI — producine due, stesso impianto grafico
  A) Profilo personale:  1584 x 396 px
  B) Pagina aziendale:   1128 x 191 px

ZONE DI RISPETTO — non metterci nulla di importante
  A) foto profilo circolare sovrapposta in basso a sinistra: lascia liberi i
     primi 260 px a sinistra e i 120 px in basso
  B) logo aziendale sovrapposto a sinistra: lascia liberi i primi 220 px

CONTENUTO
- Fondo bianco #FFFFFF, oppure un bianco appena caldo #FDF8F6.
- Il wordmark "NasciTara" in Nunito Sans Bold #E2725B, allineato nella metà
  destra, corpo proporzionato all'altezza (circa 1/5 dell'altezza totale).
- Sotto, una riga di payoff in Nunito Sans Regular #333333, corpo circa il 40 %
  del wordmark:
    "Il peso del tuo bambino, da tutte le ecografie. Non da una sola."
- Elemento grafico: una curva di crescita morbida in #E2725B che attraversa la
  composizione da sinistra verso destra salendo, con alcuni punti pieni lungo
  il percorso (le ecografie) e un punto finale più grande. Sotto la curva, una
  campitura #FFC8B0 con opacità 0.25, come l'area di una banda di percentili.
- La curva deve passare SOTTO il testo, senza mai intersecare le lettere.

VINCOLI
- Solo forme vettoriali e <text>. Niente <image>, niente gradienti, niente
  ombre.
- Contrasto: il payoff #333333 su bianco deve restare pienamente leggibile.
- Niente foto di neonati, niente stock photo, niente mani sulla pancia.

CONSEGNA
Due SVG completi più i comandi di esportazione in PNG a densità doppia.
```

Esportazione:

```bash
# con cairosvg
cairosvg linkedin-personale.svg -o linkedin-personale.png -W 1584 -H 396
cairosvg linkedin-azienda.svg  -o linkedin-azienda.png  -W 1128 -H 191

# in alternativa, con Chrome headless
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --screenshot=linkedin-personale.png \
  --window-size=1584,396 --default-background-color=0 \
  file://$PWD/linkedin-personale.svg
```

---

## Come verificare il risultato

Prima di adottare un logo generato, controlla:

- [ ] Rendilo a 96, 40, 32 e 20 px e guardalo. Quasi tutti i difetti di un
      simbolo si vedono solo alle dimensioni piccole.
- [ ] Riducilo a un solo colore pieno: la silhouette regge ancora?
- [ ] Guardalo socchiudendo gli occhi: che forma resta? Se è un cerchio
      barrato o un oggetto da cucina, è da rifare.
- [ ] Apri l'SVG in un editor di testo: nessun `<image>`, nessun base64,
      nessun `font-family` senza fallback.
- [ ] Il wordmark non ha requisiti di contrasto (WCAG 1.4.3 esenta i
      logotipi), ma un simbolo usato come elemento di interfaccia sì: almeno
      3:1 sul fondo. `#E2725B` su bianco è 3,09:1, appena sufficiente.
