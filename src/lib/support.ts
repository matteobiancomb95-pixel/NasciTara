/**
 * Supporto mamma: una selezione di pagine di fonti ufficiali, scelta per settimana di gravidanza.
 * Link verificati il 1 ottobre 2026. Le pagine NHS sono in inglese e lo diciamo.
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
  { id: 'pertosse', kind: 'formazione', who: 'insieme', title: 'Pertosse: proteggere il bebe fin dai primi giorni', titleEn: 'Whooping cough: protecting your newborn', minutes: 6, from: 20, to: 36, source: 'ISSalute · ISS', url: `${ISS}/p/pertosse` },
  { id: 'gbs', kind: 'formazione', who: 'mamma', title: 'Streptococco B: il tampone di fine gravidanza', titleEn: 'Group B strep: the late-pregnancy swab', minutes: 5, from: 30, to: 40, source: 'ISSalute · ISS', url: `${ISS}/s/streptococco-di-gruppo-b-in-gravidanza` },
  { id: 'movimenti', kind: 'formazione', who: 'insieme', title: 'I movimenti del bebe: cosa osservare', titleEn: 'Your baby’s movements: what to notice', minutes: 4, from: 24, to: 42, source: 'NHS', url: 'https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/', english: true },
  { id: 'travaglio', kind: 'formazione', who: 'insieme', title: 'I segnali che il travaglio è iniziato', titleEn: 'Signs that labour has begun', minutes: 6, from: 34, to: 42, source: 'NHS', url: 'https://www.nhs.uk/pregnancy/labour-and-birth/signs-of-labour/', english: true },
  { id: 'bagnetto', kind: 'formazione', who: 'papa', title: 'Il primo bagnetto, passo passo', titleEn: 'Baby’s first bath, step by step', minutes: 6, from: 30, to: 42, source: 'NHS', url: 'https://www.nhs.uk/baby/caring-for-a-newborn/washing-and-bathing-your-baby/', english: true },
  { id: 'esercizio', kind: 'fisica', who: 'mamma', title: 'Muoversi in gravidanza: cosa è sicuro', titleEn: 'Exercise in pregnancy: what is safe', minutes: 7, from: 12, to: 40, source: 'NHS', url: 'https://www.nhs.uk/pregnancy/keeping-well/exercise/', english: true },
  { id: 'oms-attivita', kind: 'fisica', who: 'mamma', title: 'Attività fisica: quanta ne serve, anche in gravidanza', titleEn: 'Physical activity: how much, pregnancy included', minutes: 5, from: 4, to: 42, source: 'OMS', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity', english: true },
  { id: 'umore', kind: 'benessere', who: 'mamma', title: 'Come stai? La salute mentale in gravidanza', titleEn: 'How are you? Mental health in pregnancy', minutes: 6, from: 4, to: 42, source: 'NHS', url: 'https://www.nhs.uk/pregnancy/keeping-well/mental-health/', english: true },
  { id: 'postpartum', kind: 'benessere', who: 'insieme', title: 'Depressione post-partum: riconoscerla e chiedere aiuto', titleEn: 'Postnatal depression: spotting it and asking for help', minutes: 7, from: 28, to: 42, source: 'ISSalute · ISS', url: `${ISS}/d/depressione-post-partum` },
  { id: 'leggere', kind: 'ludica', who: 'insieme', title: 'Leggetegli una storia: sente le vostre voci', titleEn: 'Read to your baby: they hear your voices', minutes: 10, from: 20, to: 42, source: 'Nati per Leggere', url: 'https://www.natiperleggere.it/' },
  { id: 'musica', kind: 'ludica', who: 'insieme', title: 'Musica in famiglia, già dalla pancia', titleEn: 'Music at home, from the bump onwards', minutes: 10, from: 16, to: 42, source: 'Nati per la Musica', url: 'https://www.natiperlamusica.org/' },
  { id: 'genitoripiu', kind: 'formazione', who: 'papa', title: 'Genitori Più: le azioni semplici per la salute del bebe', titleEn: 'Genitori Più: simple steps for your baby’s health', minutes: 8, from: 20, to: 42, source: 'Genitori Più', url: 'https://www.genitoripiu.it/' },
];

/** Quattro contenuti per la settimana, che cambiano ogni giorno. */
export function dailyFor(week: number, dayIndex: number, count = 4): SupportItem[] {
  const pool = SUPPORT.filter((s) => week >= s.from && week <= s.to);
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
