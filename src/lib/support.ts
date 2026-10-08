/**
 * Supporto mamma: una selezione di pagine di fonti ufficiali, scelta per settimana di gravidanza.
 * Selezione in italiano aggiornata il 3 ottobre 2026.
 */
export type SupportKind = 'formazione' | 'fisica' | 'ludica' | 'benessere';
export type SupportWho = 'mamma' | 'papa' | 'insieme';

export interface SupportItem {
  id: string;
  kind: SupportKind;
  who: SupportWho;
  title: string;
  titleEn: string;
  minutes: number;
  from: number;
  to: number;
  source: string;
  url: string;
  english?: boolean;
  /** Utile anche dopo la nascita (1.0): entra nelle letture di neo e già genitori. */
  after?: boolean;
}

const ISS = 'https://www.issalute.it/index.php/la-salute-dalla-a-alla-z-menu';

export const SUPPORT: SupportItem[] = [
  { id: 'controlli', kind: 'formazione', who: 'mamma', title: 'Gravidanza: controlli e disturbi più comuni', titleEn: 'Pregnancy: check-ups and common symptoms', minutes: 8, from: 4, to: 42, source: 'ISSalute · ISS', url: `${ISS}/g/gravidanza` },
  { id: 'caffeina', kind: 'formazione', who: 'mamma', title: 'Caffè e caffeina: quanta in gravidanza', titleEn: 'Coffee and caffeine in pregnancy', minutes: 4, from: 4, to: 42, source: 'EFSA', url: 'https://www.efsa.europa.eu/it/topics/topic/caffeine' },
  { id: 'toxo', kind: 'formazione', who: 'insieme', title: 'Toxoplasmosi: come evitarla a tavola e in giardino', titleEn: 'Toxoplasmosis: how to avoid it', minutes: 5, from: 4, to: 42, source: 'ISSalute · ISS', url: `${ISS}/t/toxoplasmosi` },
  { id: 'listeria', kind: 'formazione', who: 'insieme', title: 'Listeria: i cibi a cui fare attenzione', titleEn: 'Listeria: foods to be careful with', minutes: 5, from: 4, to: 42, source: 'ISSalute · ISS', url: `${ISS}/l/listeriosi` },
  { id: 'folati', kind: 'formazione', who: 'mamma', title: 'Acido folico e folati: perché contano', titleEn: 'Folic acid and folate', minutes: 6, from: 4, to: 20, source: 'ISSalute · ISS', url: `${ISS}/v/vitamina-b9-acido-folico-e-folati` },
  { id: 'ferro', kind: 'formazione', who: 'mamma', title: 'Ferro e stanchezza: l’anemia in breve', titleEn: 'Iron and tiredness: anaemia in short', minutes: 6, from: 12, to: 42, source: 'ISSalute · ISS', url: `${ISS}/a/anemia-da-carenza-di-ferro` },
  { id: 'influenza', kind: 'formazione', who: 'mamma', title: 'Vaccino antinfluenzale: perché farlo', titleEn: 'Flu vaccine: why it matters', minutes: 5, from: 12, to: 42, source: 'ISSalute · ISS', url: `${ISS}/v/vaccino-antinfluenzale` },
  { id: 'pertosse', after: true, kind: 'formazione', who: 'insieme', title: 'Pertosse: proteggere il bebe fin dai primi giorni', titleEn: 'Whooping cough: protecting your newborn', minutes: 6, from: 20, to: 36, source: 'ISSalute · ISS', url: `${ISS}/p/pertosse` },
  { id: 'gbs', kind: 'formazione', who: 'mamma', title: 'Streptococco B: il tampone di fine gravidanza', titleEn: 'Group B strep: the late-pregnancy swab', minutes: 5, from: 30, to: 40, source: 'ISSalute · ISS', url: `${ISS}/s/streptococco-di-gruppo-b-in-gravidanza` },
  { id: 'movimenti', kind: 'formazione', who: 'insieme', title: 'I movimenti nel pancione', titleEn: 'Movements in the womb', minutes: 4, from: 24, to: 42, source: 'Ospedale Niguarda', url: 'https://www.ospedaleniguarda.it/news/primo-piano/leggi/movimenti-nel-pancione-orecchio-sempre-teso' },
  { id: 'travaglio', kind: 'formazione', who: 'insieme', title: 'Travaglio, parto e nascita', titleEn: 'Labour and birth', minutes: 6, from: 34, to: 42, source: 'Ministero della Salute', url: 'https://www.salute.gov.it/new/it/tema/salute-del-bambino-e-delladolescente/travaglio-parto-nascita/' },
  { id: 'bagnetto', after: true, kind: 'formazione', who: 'papa', title: 'Il bagnetto: una guida pratica', titleEn: 'Bathing: a practical guide', minutes: 6, from: 30, to: 42, source: 'Ospedale Bambino Gesù', url: 'https://www.ospedalebambinogesu.it/bagnetto-una-guida-pratica-90414/' },
  { id: 'esercizio', kind: 'fisica', who: 'mamma', title: 'Attività fisica in gravidanza: dubbi e benefici', titleEn: 'Exercise in pregnancy: questions and benefits', minutes: 7, from: 12, to: 40, source: 'ISSalute · ISS', url: 'https://www.issalute.it/index.php/falsi-miti-e-bufale/attivita-fisica/e-pericoloso-fare-attivita-fisica-in-gravidanza' },
  { id: 'oms-attivita', kind: 'fisica', who: 'mamma', title: 'Donna e attività fisica, anche in gravidanza', titleEn: 'Women and physical activity, including pregnancy', minutes: 5, from: 4, to: 42, source: 'Ministero della Salute', url: 'https://www.salute.gov.it/new/it/tema/salute-della-donna/donna-e-attivita-fisica/' },
  { id: 'umore', after: true, kind: 'benessere', who: 'mamma', title: 'La salute mentale durante e dopo la gravidanza', titleEn: 'Mental health during and after pregnancy', minutes: 6, from: 4, to: 42, source: 'Istituto Superiore di Sanità', url: 'https://www.iss.it/salute-mentale-perinatale/-/categories/10602491' },
  { id: 'postpartum', after: true, kind: 'benessere', who: 'insieme', title: 'Depressione post-partum: riconoscerla e chiedere aiuto', titleEn: 'Postnatal depression: spotting it and asking for help', minutes: 7, from: 28, to: 42, source: 'ISSalute · ISS', url: `${ISS}/d/depressione-post-partum` },
  { id: 'leggere', after: true, kind: 'ludica', who: 'insieme', title: 'Leggetegli una storia: sente le vostre voci', titleEn: 'Read to your baby: they hear your voices', minutes: 10, from: 20, to: 42, source: 'Nati per Leggere', url: 'https://www.natiperleggere.it/' },
  { id: 'musica', after: true, kind: 'ludica', who: 'insieme', title: 'Musica in famiglia, già dalla pancia', titleEn: 'Music at home, from the bump onwards', minutes: 10, from: 16, to: 42, source: 'Nati per la Musica', url: 'https://www.natiperlamusica.org/' },
  { id: 'genitoripiu', after: true, kind: 'formazione', who: 'papa', title: 'Genitori Più: le azioni semplici per la salute del bebe', titleEn: 'Genitori Più: simple steps for your baby’s health', minutes: 8, from: 20, to: 42, source: 'Genitori Più', url: 'https://www.genitoripiu.it/' },
];

/** Quattro contenuti per la settimana, che cambiano ogni giorno. */
export function dailyFor(week: number | 'born', dayIndex: number, count = 4, who: 'mamma' | 'papa' = 'mamma'): SupportItem[] {
  const inPhase = SUPPORT.filter((s) => (week === 'born' ? s.after : week >= s.from && week <= s.to));
  // Il papà vede prima le letture per lui e per entrambi; quelle solo per la mamma restano in fondo.
  const mine = who === 'papa' ? inPhase.filter((s) => s.who !== 'mamma') : inPhase;
  const pool = mine.length >= count ? mine : inPhase;
  if (pool.length <= count) return pool;
  const start = ((dayIndex % pool.length) + pool.length) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  // Prima un contenuto per tipo (formazione, attivita' fisica, ludica, benessere), poi il resto.
  const varied = rotated.filter((s, i) => rotated.findIndex((x) => x.kind === s.kind) === i);
  return [...varied, ...rotated.filter((s) => !varied.includes(s))].slice(0, count);
}

export function searchSupport(query: string): SupportItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return SUPPORT.filter((s) => `${s.title} ${s.titleEn} ${s.source}`.toLowerCase().includes(q));
}


/** Official favicons cached locally; no browsing data sent to external icon services. */
const SOURCE_LOGOS: Record<string, string> = {"iss.it":"/source-logos/iss.ico","issalute.it": "/source-logos/issalute.ico", "efsa.europa.eu": "/source-logos/efsa.ico", "ospedaleniguarda.it": "/source-logos/niguarda.ico", "ospedalebambinogesu.it": "/source-logos/bambinogesu.ico", "natiperleggere.it": "/source-logos/leggere.png", "natiperlamusica.org": "/source-logos/musica.png", "genitoripiu.it": "/source-logos/genitoripiu.ico"};
export function sourceLogo(url: string): string { return SOURCE_LOGOS[new URL(url).hostname.replace(/^www\./, "")] ?? "/favicon.svg"; }
