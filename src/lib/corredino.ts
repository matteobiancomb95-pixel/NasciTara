import type { Lang } from '../i18n';

/**
 * Corredino dei primi tre mesi.
 *
 * Regole del progetto (Claude Design, "Specifiche"): tre taglie dalla lunghezza
 * stimata alla nascita (< 52 cm -> 50/56/62, altrimenti 56/62/68), una per mese;
 * la stagione di ogni taglia dipende dal mese in cui verra' indossata, a partire
 * dal mese del parto. Le quantita' scalano con le lavatrici a settimana; il primo
 * mese ne serve un po' meno perche' si cresce in fretta.
 */

export type Washes = 2 | 3 | 4;
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

type Text = [string, string];
type Item = [Text, Text, number];

const MONTHS: Record<Lang, string[]> = {
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MID: Item[] = [
  [['Body manica lunga', 'Long-sleeve bodysuits'], ['Cotone interlock', 'Interlock cotton'], 5],
  [['Tutine', 'Sleepsuits'], ['Cotone', 'Cotton'], 4],
  [['Ghettine', 'Leggings'], ['Cotone', 'Cotton'], 2],
  [['Completi 2 pezzi', 'Two-piece sets'], ['Cotone felpato', 'Brushed cotton'], 1],
  [['Cardigan', 'Cardigans'], ['Maglia di cotone', 'Cotton knit'], 1],
  [['Babbucce', 'Booties'], ['Cotone', 'Cotton'], 2],
  [['Cuffiette', 'Hats'], ['Cotone', 'Cotton'], 1],
];

const SEASONS: Record<Season, { label: Text; materials: Text[]; advice: Text; items: Item[] }> = {
  winter: {
    label: ['Inverno', 'Winter'],
    materials: [['Ciniglia', 'Chenille'], ['Lana-seta', 'Wool-silk'], ['Cotone felpato', 'Brushed cotton'], ['Lana merino', 'Merino wool']],
    advice: ['Ciniglia e lana-seta scaldano senza irritare. Sacco nanna al posto delle coperte.', 'Chenille and wool-silk keep warm without irritating. A sleeping bag instead of blankets.'],
    items: [
      [['Tutine', 'Sleepsuits'], ['Ciniglia', 'Chenille'], 4],
      [['Body manica lunga', 'Long-sleeve bodysuits'], ['Lana-seta', 'Wool-silk'], 5],
      [['Ghettine', 'Leggings'], ['Cotone felpato', 'Brushed cotton'], 2],
      [['Completi 2 pezzi', 'Two-piece sets'], ['Ciniglia', 'Chenille'], 2],
      [['Babbucce', 'Booties'], ['Lana merino', 'Merino wool'], 2],
      [['Cuffiette', 'Hats'], ['Cotone doppio', 'Double cotton'], 2],
      [['Sacco nanna', 'Sleeping bag'], ['Imbottito 2,5 TOG', 'Padded 2.5 TOG'], 1],
    ],
  },
  autumn: {
    label: ['Autunno', 'Autumn'],
    materials: [['Cotone', 'Cotton'], ['Interlock', 'Interlock'], ['Felpato leggero', 'Light fleece'], ['Maglia', 'Knit']],
    advice: ['Cotone a strati: si aggiunge o toglie un capo con gli sbalzi di temperatura.', 'Layered cotton: add or remove a piece as the temperature changes.'],
    items: MID,
  },
  spring: {
    label: ['Primavera', 'Spring'],
    materials: [['Cotone', 'Cotton'], ['Interlock', 'Interlock'], ['Felpato leggero', 'Light fleece'], ['Maglia', 'Knit']],
    advice: ['Cotone traspirante a strati per le escursioni termiche.', 'Breathable layered cotton for changing temperatures.'],
    items: MID,
  },
  summer: {
    label: ['Estate', 'Summer'],
    materials: [['Cotone leggero', 'Light cotton'], ['Mussola', 'Muslin'], ['Lino-cotone', 'Linen-cotton'], ['Jersey', 'Jersey']],
    advice: ['Pagliaccetti in cotone e mussola. Una tutina leggera per le sere fresche.', 'Cotton and muslin rompers. A light sleepsuit for cool evenings.'],
    items: [
      [['Pagliaccetti', 'Rompers'], ['Cotone / mussola', 'Cotton / muslin'], 5],
      [['Body manica corta', 'Short-sleeve bodysuits'], ['Cotone leggero', 'Light cotton'], 5],
      [['Tutine leggere', 'Light sleepsuits'], ['Jersey di cotone', 'Cotton jersey'], 2],
      [['Completi 2 pezzi', 'Two-piece sets'], ['Lino-cotone', 'Linen-cotton'], 1],
      [['Mussole', 'Muslins'], ['Mussola di cotone', 'Cotton muslin'], 3],
      [['Babbucce', 'Booties'], ['Cotone traforato', 'Open-knit cotton'], 1],
      [['Cuffiette', 'Hats'], ['Jersey leggero', 'Light jersey'], 1],
    ],
  },
};

const RANGES: Record<number, Text> = {
  50: ['fino a 50 cm', 'up to 50 cm'],
  56: ['51–56 cm', '51–56 cm'],
  62: ['57–62 cm', '57–62 cm'],
  68: ['63–68 cm', '63–68 cm'],
};

const WASH_FACTOR: Record<Washes, number> = { 2: 1.3, 3: 1, 4: 0.8 };

export function seasonOf(month: number): Season {
  return month === 11 || month <= 1 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
}

export function sizesFor(birthLengthCm: number): number[] {
  return birthLengthCm >= 52 ? [56, 62, 68] : [50, 56, 62];
}

export interface Garment { key: string; name: string; material: string; qty: number; done: boolean }
export interface SizeColumn {
  size: number;
  range: string;
  /** 0, 1, 2: mese di vita in cui si usa questa taglia. */
  index: number;
  monthName: string;
  season: Season;
  seasonLabel: string;
  items: Garment[];
  total: number;
  done: number;
}
export interface Corredino {
  sizes: number[];
  columns: SizeColumn[];
  total: number;
  seasonHeadline: string;
  advice: string;
  materials: string[];
}

export function buildCorredino(input: { birthLengthCm: number; dueDate: Date; washes: Washes; checked: string[]; lang: Lang }): Corredino {
  const l = input.lang === 'it' ? 0 : 1;
  const m0 = input.dueDate.getUTCMonth();
  const factor = WASH_FACTOR[input.washes];
  const sizes = sizesFor(input.birthLengthCm);
  const columns = sizes.map((size, index) => {
    const month = (m0 + index) % 12;
    const season = seasonOf(month);
    const s = SEASONS[season];
    const items = s.items.map(([name, material, base]) => {
      // La chiave resta in italiano: la spunta sopravvive al cambio di lingua.
      const key = `${size}:${name[0]}`;
      return {
        key,
        name: name[l],
        material: material[l],
        qty: Math.max(1, Math.round(base * factor * (index === 0 ? 0.7 : 1))),
        done: input.checked.includes(key),
      };
    });
    return {
      size,
      range: RANGES[size][l],
      index,
      monthName: MONTHS[input.lang][month],
      season,
      seasonLabel: s.label[l],
      items,
      total: items.reduce((a, b) => a + b.qty, 0),
      done: items.filter((x) => x.done).reduce((a, b) => a + b.qty, 0),
    };
  });
  const seasons = [...new Set(columns.map((c) => c.season))];
  return {
    sizes,
    columns,
    total: columns.reduce((a, c) => a + c.total, 0),
    seasonHeadline: seasons.map((k) => SEASONS[k].label[l]).join(' → '),
    advice: SEASONS[seasons[seasons.length - 1]].advice[l],
    materials: [...new Set(seasons.flatMap((k) => SEASONS[k].materials.map((m) => m[l])))].slice(0, 5),
  };
}

/** Testo semplice della lista, per condividerla o copiarla. */
export function corredinoText(c: Corredino, lang: Lang): string {
  const it = lang === 'it';
  return [
    it ? `Corredino NasciTara · ${c.total} capi · ${c.seasonHeadline}` : `NasciTara layette · ${c.total} items · ${c.seasonHeadline}`,
    ...c.columns.flatMap((col) => [
      '',
      `${it ? 'Taglia' : 'Size'} ${col.size} · ${col.monthName} · ${col.seasonLabel} (${col.range})`,
      ...col.items.map((i) => `${i.done ? '✓' : '•'} ${i.qty} × ${i.name} — ${i.material}`),
    ]),
  ].join('\n');
}
