import type { Lang } from '../i18n';

/**
 * Corredino dei primi tre mesi (Claude Design "NasciTara App", Specifiche, 29/09/2026).
 *
 * Capi = cambi al giorno × giorni tra un lavaggio e l'altro (7 ÷ lavatrici a settimana,
 * +1 giorno senza asciugatrice) + 1 di scorta. Le taglie seguono la crescita attesa
 * (~0,95 cm a settimana dalla lunghezza alla nascita); una taglia usata meno di 3 settimane
 * nei primi 3 mesi riceve metà scorta. La stagione e' calcolata per ogni taglia, a meta'
 * del suo periodo d'uso; gli accessori sono in taglia unica. I pezzi gia' comprati si
 * segnano con + / −.
 */

export type Washes = 2 | 3 | 4;
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type GarmentIcon =
  | 'bodyLs' | 'bodySs' | 'tutina' | 'pagliaccetto' | 'ghettine' | 'completo' | 'cardigan' | 'calzine' | 'babbucce'
  | 'esterna' | 'sacco' | 'cuffia' | 'sole' | 'guantini' | 'bavaglino' | 'mussola' | 'copertina' | 'asciugamano';

type Text = [string, string];
/** Nome, materiale, cambi al giorno, minimo, icona. */
type Row = [Text, Text, number, number, GarmentIcon];

const MONTHS: Record<Lang, string[]> = {
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const mid = (tutina: Text, jacket: Text): Row[] => [
  [['Body manica lunga', 'Long-sleeve bodysuits'], ['Cotone interlock', 'Interlock cotton'], 2, 0, 'bodyLs'],
  [['Body manica corta', 'Short-sleeve bodysuits'], ['Cotone, da sottostrato', 'Cotton, as a base layer'], 0.5, 2, 'bodySs'],
  [['Tutine', 'Sleepsuits'], tutina, 1.5, 0, 'tutina'],
  [['Ghettine', 'Leggings'], ['Cotone', 'Cotton'], 0.6, 2, 'ghettine'],
  [['Completi 2 pezzi', 'Two-piece sets'], ['Felpa leggera', 'Light sweatshirt fabric'], 0.3, 2, 'completo'],
  [['Cardigan', 'Cardigans'], ['Maglia di cotone', 'Cotton knit'], 0.25, 2, 'cardigan'],
  [['Calzine', 'Socks'], ['Cotone', 'Cotton'], 0.8, 0, 'calzine'],
  [['Giacchina esterna', 'Outer jacket'], jacket, 0, 1, 'esterna'],
  [['Sacco nanna', 'Sleeping bag'], ['1 TOG', '1 TOG'], 0, 2, 'sacco'],
];

const SEASONS: Record<Season, { label: Text; materials: Text[]; advice: Text; items: Row[] }> = {
  winter: {
    label: ['Inverno', 'Winter'],
    materials: [['Ciniglia', 'Chenille'], ['Lana-seta', 'Wool-silk'], ['Cotone felpato', 'Brushed cotton'], ['Lana merino', 'Merino wool']],
    advice: ['Ciniglia e lana-seta scaldano senza irritare. Sacco nanna al posto delle coperte.', 'Chenille and wool-silk keep warm without irritating. A sleeping bag instead of blankets.'],
    items: [
      [['Body manica lunga', 'Long-sleeve bodysuits'], ['Lana-seta o interlock', 'Wool-silk or interlock'], 2, 0, 'bodyLs'],
      [['Tutine', 'Sleepsuits'], ['Ciniglia', 'Chenille'], 1.5, 0, 'tutina'],
      [['Ghettine', 'Leggings'], ['Cotone felpato', 'Brushed cotton'], 0.5, 2, 'ghettine'],
      [['Completi 2 pezzi', 'Two-piece sets'], ['Ciniglia', 'Chenille'], 0.3, 2, 'completo'],
      [['Cardigan', 'Cardigans'], ['Lana merino', 'Merino wool'], 0.25, 2, 'cardigan'],
      [['Calzine', 'Socks'], ['Lana-cotone', 'Wool-cotton'], 0.8, 0, 'calzine'],
      [['Babbucce', 'Booties'], ['Lana merino', 'Merino wool'], 0, 2, 'babbucce'],
      [['Tutina esterna', 'Snowsuit'], ['Imbottita, con cappuccio', 'Padded, with hood'], 0, 1, 'esterna'],
      [['Sacco nanna', 'Sleeping bag'], ['2,5 TOG', '2.5 TOG'], 0, 2, 'sacco'],
    ],
  },
  autumn: {
    label: ['Autunno', 'Autumn'],
    materials: [['Cotone', 'Cotton'], ['Interlock', 'Interlock'], ['Felpato leggero', 'Light fleece'], ['Maglia', 'Knit']],
    advice: ['Cotone a strati: si aggiunge o toglie un capo con gli sbalzi di temperatura.', 'Layered cotton: add or remove a piece as the temperature changes.'],
    items: mid(['Cotone felpato leggero', 'Light brushed cotton'], ['Trapuntata leggera', 'Light quilted']),
  },
  spring: {
    label: ['Primavera', 'Spring'],
    materials: [['Cotone', 'Cotton'], ['Interlock', 'Interlock'], ['Felpato leggero', 'Light fleece'], ['Maglia', 'Knit']],
    advice: ['Cotone traspirante a strati per le escursioni termiche.', 'Breathable layered cotton for changing temperatures.'],
    items: mid(['Cotone', 'Cotton'], ['Cotone felpato', 'Brushed cotton']),
  },
  summer: {
    label: ['Estate', 'Summer'],
    materials: [['Cotone leggero', 'Light cotton'], ['Mussola', 'Muslin'], ['Lino-cotone', 'Linen-cotton'], ['Jersey', 'Jersey']],
    advice: ['Pagliaccetti in cotone e mussola. Una tutina leggera per le sere fresche.', 'Cotton and muslin rompers. A light sleepsuit for cool evenings.'],
    items: [
      [['Body manica corta', 'Short-sleeve bodysuits'], ['Cotone leggero', 'Light cotton'], 2, 0, 'bodySs'],
      [['Pagliaccetti', 'Rompers'], ['Cotone o mussola', 'Cotton or muslin'], 1.5, 0, 'pagliaccetto'],
      [['Tutine leggere', 'Light sleepsuits'], ['Jersey, per la sera', 'Jersey, for the evening'], 0.4, 2, 'tutina'],
      [['Completi 2 pezzi', 'Two-piece sets'], ['Lino-cotone', 'Linen-cotton'], 0.3, 1, 'completo'],
      [['Cardigan leggero', 'Light cardigan'], ['Filo di cotone', 'Cotton yarn'], 0, 1, 'cardigan'],
      [['Calzine leggere', 'Light socks'], ['Cotone', 'Cotton'], 0.3, 2, 'calzine'],
      [['Sacco nanna', 'Sleeping bag'], ['0,5 TOG', '0.5 TOG'], 0, 2, 'sacco'],
    ],
  },
};

const RANGES: Record<number, Text> = {
  50: ['fino a 50 cm', 'up to 50 cm'],
  56: ['51–56 cm', '51–56 cm'],
  62: ['57–62 cm', '57–62 cm'],
  68: ['63–68 cm', '63–68 cm'],
  74: ['69–74 cm', '69–74 cm'],
};
const SIZES = [50, 56, 62, 68, 74];
/** Crescita attesa in cm a settimana e orizzonte dei primi 3 mesi in settimane. */
const GROWTH = 0.95;
const HORIZON = 13;

export function seasonOf(month: number): Season {
  return month === 11 || month <= 1 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'autumn';
}

/** Giorni tra un lavaggio e l'altro: 7 ÷ lavatrici, piu' un giorno per asciugare senza asciugatrice. */
export function cycleDays(washes: Washes, dryer: boolean): number {
  return 7 / washes + (dryer ? 0 : 1);
}

/** Pezzi per un capo: cambi al giorno × giorni di ciclo + 1 di scorta, mai sotto il minimo. */
export function garmentQty(perDay: number, min: number, days: number, factor = 1): number {
  let qty = Math.max(min, perDay > 0 ? Math.ceil(perDay * days + 1) : 0);
  if (factor < 1) qty = Math.max(1, Math.ceil(qty * factor));
  return qty;
}

/** Tre taglie consecutive a partire dalla prima che supera di 1 cm la lunghezza alla nascita. */
export function sizesFor(birthLengthCm: number): number[] {
  let i = SIZES.findIndex((s) => s >= birthLengthCm + 1);
  i = Math.min(Math.max(i, 0), 2);
  return SIZES.slice(i, i + 3);
}

export interface Garment { key: string; name: string; material: string; qty: number; have: number; icon: GarmentIcon }
export interface Group {
  /** Chiave stabile: la taglia oppure 'A' per gli accessori. */
  id: string;
  size: number | null;
  title: string;
  tab: string;
  tile: string;
  infoTop: string;
  infoSub: string;
  rowTitle: string;
  rowSub: string;
  season: Season | null;
  seasonLabel: string;
  items: Garment[];
  total: number;
  have: number;
}
export interface Corredino {
  sizes: number[];
  columns: Group[];
  accessories: Group;
  total: number;
  have: number;
  cycleDays: number;
  seasonHeadline: string;
  advice: string;
  materials: string[];
}

export function buildCorredino(input: { birthLengthCm: number; dueDate: Date; washes: Washes; dryer: boolean; bought: Record<string, number>; lang: Lang }): Corredino {
  const l = input.lang === 'it' ? 0 : 1;
  const it = l === 0;
  const days = cycleDays(input.washes, input.dryer);
  const len = input.birthLengthCm;
  const due = input.dueDate.getTime();
  const item = (group: string, [name, material, perDay, min, icon]: Row, factor: number): Garment => {
    const qty = garmentQty(perDay, min, days, factor);
    // Il nome italiano fa da chiave: i pezzi segnati sopravvivono al cambio di lingua.
    const key = `${group}|${name[0]}`;
    return { key, name: name[l], material: material[l], qty, have: Math.min(Math.max(0, input.bought[key] ?? 0), qty), icon };
  };
  const sum = (items: Garment[], f: (g: Garment) => number) => items.reduce((a, g) => a + f(g), 0);
  let prevEnd = 0;
  const columns: Group[] = sizesFor(len).map((size) => {
    const start = prevEnd;
    const end = Math.max(start, (size + 1 - len) / GROWTH);
    prevEnd = end;
    const inHorizon = Math.max(0, Math.min(end, HORIZON) - Math.min(start, HORIZON));
    const partial = inHorizon < 3;
    const midWeek = start >= HORIZON ? start + 1 : (start + Math.min(end, HORIZON)) / 2;
    const month = new Date(due + midWeek * 7 * 864e5).getUTCMonth();
    const season = seasonOf(month);
    const s = SEASONS[season];
    const a = Math.round(start);
    const b = Math.round(Math.min(end, HORIZON));
    const when = start >= HORIZON - 0.5 ? (it ? `Dalla ${a}ª sett.` : `From week ${a}`) : it ? `Sett. ${a}–${b}` : `Weeks ${a}–${b}`;
    const note = partial ? (it ? 'scorta ridotta' : 'reduced stock') : it ? `~${Math.round(inHorizon)} sett. d’uso` : `~${Math.round(inHorizon)} wk of use`;
    const items = s.items.map((r) => item(String(size), r, partial ? 0.5 : 1));
    const monthName = MONTHS[input.lang][month];
    return {
      id: String(size), size, title: `${it ? 'Taglia' : 'Size'} ${size}`, tab: `Tg ${size}`, tile: String(size),
      infoTop: `${when} · ${s.label[l]}`.toUpperCase(), infoSub: `${RANGES[size][l]} · ${note}`,
      rowTitle: `${when} · ${monthName}`, rowSub: `${s.label[l]} · ${note}`,
      season, seasonLabel: s.label[l], items, total: sum(items, (g) => g.qty), have: sum(items, (g) => g.have),
    };
  });
  const birthSeason = seasonOf(input.dueDate.getUTCMonth());
  const accRows: Row[] = [
    [['Bavaglini', 'Bibs'], ['Spugna di cotone', 'Cotton terry'], 2, 0, 'bavaglino'],
    [['Mussole', 'Muslins'], ['Mussola di cotone', 'Cotton muslin'], 2, 0, 'mussola'],
    [['Guantini antigraffio', 'Scratch mittens'], ['Cotone leggero', 'Light cotton'], 0, 3, 'guantini'],
    birthSeason === 'summer'
      ? [['Cappellini', 'Sun hats'], ['Cotone, per il sole', 'Cotton, for the sun'], 0, 2, 'sole']
      : [['Cuffiette', 'Hats'], birthSeason === 'winter' ? ['Lana-cotone', 'Wool-cotton'] : ['Cotone doppio', 'Double cotton'], 0, birthSeason === 'winter' ? 3 : 2, 'cuffia'],
    [['Copertine', 'Blankets'], birthSeason === 'winter' ? ['Ciniglia', 'Chenille'] : birthSeason === 'summer' ? ['Mussola', 'Muslin'] : ['Cotone', 'Cotton'], 0, 2, 'copertina'],
    [['Accappatoi con cappuccio', 'Hooded towels'], ['Spugna', 'Terry'], 0, 2, 'asciugamano'],
  ];
  const accItems = accRows.map((r) => item('A', r, 1));
  const accessories: Group = {
    id: 'A', size: null, title: it ? 'Accessori' : 'Accessories', tab: it ? 'Accessori' : 'Extras', tile: it ? 'TU' : 'OS',
    infoTop: `${it ? 'Taglia unica' : 'One size'} · ${SEASONS[birthSeason].label[l]}`.toUpperCase(),
    infoSub: it ? 'Per tutti i primi 3 mesi' : 'For the first 3 months',
    rowTitle: it ? 'Accessori' : 'Accessories', rowSub: it ? 'Taglia unica · 0–3 mesi' : 'One size · 0–3 months',
    season: null, seasonLabel: SEASONS[birthSeason].label[l], items: accItems, total: sum(accItems, (g) => g.qty), have: sum(accItems, (g) => g.have),
  };
  const seasons = [...new Set(columns.map((c) => c.season as Season))];
  const groups = [...columns, accessories];
  return {
    sizes: columns.map((c) => c.size as number),
    columns,
    accessories,
    total: groups.reduce((a, g) => a + g.total, 0),
    have: groups.reduce((a, g) => a + g.have, 0),
    cycleDays: days,
    seasonHeadline: seasons.map((k) => SEASONS[k].label[l]).join(' → '),
    advice: SEASONS[seasons[seasons.length - 1]].advice[l],
    materials: [...new Set(seasons.flatMap((k) => SEASONS[k].materials.map((m) => m[l])))].slice(0, 5),
  };
}

/** Testo semplice della lista, per condividerla o copiarla. */
export function corredinoText(c: Corredino, lang: Lang): string {
  const it = lang === 'it';
  return [
    it ? `Corredino NasciTara · ${c.have}/${c.total} capi pronti · ${c.seasonHeadline}` : `NasciTara layette · ${c.have}/${c.total} items ready · ${c.seasonHeadline}`,
    ...[...c.columns, c.accessories].flatMap((g) => [
      '',
      `${g.title} · ${g.infoTop.toLowerCase()} (${g.infoSub})`,
      ...g.items.map((i) => `${i.have >= i.qty ? '✓' : '•'} ${i.have}/${i.qty} ${i.name} — ${i.material}`),
    ]),
  ].join('\n');
}
