/**
 * Traduzioni NasciTara.
 *
 * Chiavi piatte: il dizionario e' abbastanza piccolo da non giustificare
 * annidamenti, e piatto si vede a colpo d'occhio se manca una stringa.
 * Il tipo `Key` deriva dall'italiano, quindi l'inglese non puo' divergere:
 * se dimentichi una chiave, TypeScript lo dice.
 */

export type Lang = 'it' | 'en';

export const it = {
  // ---- comune ----
  'app.name': 'NasciTara',
  'app.tagline': 'Il peso del tuo bambino, da tutte le ecografie. Non da una sola.',
  'lang.it': 'Italiano',
  'lang.en': 'English',
  'lang.switch': 'Cambia lingua',
  'nav.back': 'Indietro',
  'nav.step': 'Passo {n} di 3',
  'unit.mm': 'mm',
  'unit.cm': 'cm',
  'unit.kg': 'kg',
  'unit.g': 'g',
  'unit.weeks': 'sett',
  'unit.days': 'gg',
  'unit.years': 'anni',
  'optional': 'facoltativo',

  // ---- footer ----
  'footer.credits': 'Un progetto di Matteo Bianco',
  'footer.fiscalCode': 'CF BNCMTT95B02F027P',
  'footer.instagram': 'Instagram',
  'footer.linkedin': 'LinkedIn',
  'footer.disclaimer':
    'NasciTara è uno strumento di calcolo, non un dispositivo medico. Il valore che conta resta quello del referto del ginecologo.',

  // ---- atterraggio ----
  'landing.title': 'Stima il peso e la lunghezza del tuo bebè fino a 45 settimane.',
  'landing.lead':
    'NasciTara riunisce le tue ecografie per stimare quanto pesa oggi il tuo bebè, la sua lunghezza e la proiezione alla nascita. Puoi esplorare anche oltre, fino a 45 settimane: dopo la 42ª è solo un prolungamento matematico, non una stima della crescita dopo la nascita.',
  'landing.how1.title': 'Racconti la gravidanza',
  'landing.how1.body': 'A che settimana sei, e qualche dato su mamma e papà.',
  'landing.how2.title': 'Inserisci le ecografie',
  'landing.how2.body': 'HC o CC - Circonferenza cranica, AC o CA - Circonferenza addominale, FL o LF - Lunghezza femore e BPD o DBP - Diametro biparietale.',
  'landing.how3.title': 'Scopri la curva',
  'landing.how3.body': 'Peso, lunghezza e percentile, con la proiezione fino alla nascita e il prolungamento della curva fino a 45 settimane.',
  'landing.emailLabel': 'E-mail obbligatoria',
  'landing.emailPlaceholder': 'E-mail',
  'landing.emailHelp': 'Ti scriviamo solo per aggiornarti su NasciTara. Niente altro.',
  'landing.gdpr':
    'Acconsento alla raccolta della mia e-mail per conteggiare gli utenti di NasciTara. Non verrà usata per marketing diretto. I dati della gravidanza e delle ecografie restano nel browser.',
  'landing.start': 'Inizia',
  'landing.emailInvalid': 'Controlla l’indirizzo: manca qualcosa.',
  'landing.gdprRequired': 'Per continuare serve il consenso sull’email.',
  'landing.skip': 'Prosegui senza lasciare l’email',

  // ---- pagina 2: gravidanza e genitori ----
  'preg.title': 'La tua gravidanza',
  'preg.lead': 'Per stimare peso e lunghezza bastano i dati della gravidanza e le misure ecografiche. Se vuoi personalizzare la curva di riferimento, puoi aggiungere anche i dati di Mamma e Papà.',
  'preg.section.pregnancy': 'A che punto sei',
  'preg.section.pregnancyHint':
    'L’epoca di oggi fissa il riferimento: la data di ogni ecografia viene poi riportata indietro su questa scala.',
  'preg.ga': 'Settimane di gravidanza',
  'preg.gaWeeks': 'Settimane',
  'preg.gaDays': 'Giorni',
  'preg.gaHint': 'Fra 12 e 42 settimane',
  'preg.refDate': 'Valide alla data del',
  'preg.refDateHint': 'Di solito oggi',
  'preg.dueDate': 'Data presunta del parto: {date}',
  'preg.section.parents': 'Mamma e papà',
  'preg.section.parentsHint':
    'Tutti facoltativi. Servono solo a personalizzare la curva sulla vostra corporatura: senza, il peso stimato e il percentile non cambiano.',
  'preg.motherWeight': 'Peso medio della mamma prima della gravidanza',
  'preg.motherWeightHint': 'Il peso abituale, non quello di adesso',
  'preg.motherHeight': 'Altezza della mamma',
  'preg.motherAge': 'Età della mamma',
  'preg.fatherWeight': 'Peso del papà',
  'preg.fatherHeight': 'Altezza del papà',
  'preg.fatherAge': 'Età del papà',
  'preg.bmi': 'BMI pre-gravidanza {value}',
  'preg.bmiHigh': 'BMI {value} — sopra 30 le misure ecografiche sono meno precise',
  'preg.ageNote': 'L’età non entra nel calcolo del peso: la teniamo solo come contesto.',
  'preg.continue': 'Continua',
  'preg.needGa': 'Inserisci le settimane per continuare',

  // ---- pagina 3: misure ----
  'meas.title': 'Le tue ecografie',
  'meas.lead':
    'Inserisci le quattro misure di ogni referto, in millimetri: HC o CC - Circonferenza cranica, AC o CA - Circonferenza addominale, FL o LF - Lunghezza femore e BPD o DBP - Diametro biparietale. Se hai effettuato più visite, premi “Aggiungi misurazione ecografia ostetrica”.',
  'meas.scan': 'Ecografia {n}',
  'meas.date': 'Data dell’esame',
  'meas.ga': '{ga} settimane',
  'meas.noDate': 'manca la data',
  'meas.remove': 'Rimuovi',
  'meas.hc': 'HC',
  'meas.ac': 'AC',
  'meas.fl': 'FL',
  'meas.bpd': 'BPD',
  'meas.hcFull': 'Circonferenza cranica',
  'meas.acFull': 'Circonferenza addominale',
  'meas.flFull': 'Lunghezza del femore',
  'meas.bpdFull': 'Diametro biparietale',
  'meas.expected': 'atteso ~{value} mm',
  'meas.check': 'atteso ~{value} mm — ricontrolla',
  'meas.efw': 'Peso stimato da questa ecografia',
  'meas.incomplete': 'Compila data e quattro misure',
  'meas.add': 'Aggiungi misurazione ecografia ostetrica',
  'meas.cta': 'Scopri peso e lunghezza del bebè',
  'meas.needOne': 'Serve almeno un’ecografia completa',
  'meas.ignored': '{done} di {total} complete — le altre verranno ignorate',

  // ---- pagina 4: dashboard ----
  'dash.title': 'Il tuo bambino',
  'dash.atWeek': 'Alla settimana',
  'dash.today': 'oggi',
  'dash.weight': 'Peso',
  'dash.length': 'Lunghezza',
  'dash.estimatedWeight': 'Peso stimato',
  'dash.range': 'fra {lo} e {hi}',
  'dash.percentile': 'Percentile',
  'dash.percentileHint': 'Su 100 bambini a questa settimana, {n} pesano meno del tuo',
  'dash.estimatedLength': 'Lunghezza stimata',
  'dash.lengthHint': 'Dalla testa ai piedi, circa {lo}–{hi} cm',
  'dash.atBirth': 'Alla nascita (40 settimane)',
  'dash.custom': 'Sulla vostra corporatura',
  'dash.customHint': 'Peso ideale a termine {value} g · dati usati: {coverage}',
  'dash.basedOn': 'Su {n} ecografie, dalla {from} alla {to}.',
  'dash.basedOnOne': 'Su una sola ecografia: è la fotografia di quel giorno, non un andamento.',
  'dash.trendFlat': 'Crescita regolare: resta sullo stesso percentile.',
  'dash.trendUp': 'In accelerazione rispetto alla sua curva.',
  'dash.trendDown': 'In rallentamento rispetto alla sua curva.',
  'dash.chartTitle': 'La curva di {metric}',
  'dash.chartSub': 'Qui sta la maggior parte dei bambini',
  'dash.legendScans': 'Le tue ecografie',
  'dash.legendCurve': 'La curva del tuo bambino',
  'dash.legendProjection': 'Proiezione',
  'dash.axisWeeks': 'Settimane di gravidanza',
  'dash.extrapolation': 'Zona di estrapolazione',
  'dash.extrapolationNote':
    'Oltre la 42ª settimana la curva di riferimento non ha più dati dietro: è un prolungamento matematico, non una previsione affidabile. Dopo la nascita la crescita segue curve completamente diverse.',
  'dash.tooltipWeek': '{ga} settimane',
  'dash.tooltipMedian': 'mediana {value}',
  'dash.details': 'Come funziona il calcolo',
  'dash.detailsSub': 'Quale misura pesa di più, e da dove vengono i numeri',
  'dash.weights': 'Quanto pesa ciascuna misura',
  'dash.weightsLead':
    'Calcolato sulle misure della tua ultima ecografia: quanto ogni misura sposta il risultato, moltiplicato per quanto quella misura varia davvero da bambino a bambino.',
  'dash.weightsFoot':
    '{key} domina. È lo stesso motivo per cui la formula dell’Organizzazione Mondiale della Sanità usa solo la circonferenza addominale e quella cranica: la pancia porta quasi tutta l’informazione sul peso.',
  'dash.method': 'Da dove vengono i numeri',
  'dash.download': 'Scarica il risultato',
  'dash.downloading': 'Preparo il PDF…',
  'dash.restart': 'Ricomincia',
  'dash.editScans': 'Modifica le ecografie',
  'dash.noData': 'Non c’è ancora abbastanza per calcolare.',
  'landing.startNote': 'Due minuti, non di più.',
  'preg.continueNote': 'Puoi tornare indietro quando vuoi.',
  'meas.ctaNote': 'Il calcolo avviene sul tuo dispositivo.',
  'meas.onReport': 'sul referto: {abbr}, {full}',
  'meas.hcSpoken': 'Il giro della testa',
  'meas.acSpoken': 'Quanto è larga la pancia',
  'meas.flSpoken': 'L’ossicino della coscia',
  'meas.bpdSpoken': 'La larghezza della testa',
  'meas.missingOne': 'Manca ancora un numero',
  'meas.missingMany': 'Mancano ancora {n} numeri',
  'meas.fromThis': 'Da questa ecografia: {value}',
  'summary.weeks': '{ga} settimane',
  'summary.scans': '{n} ecografie',
  'summary.scanOne': '1 ecografia',
  'summary.due': 'nascita prevista il {date}',
  'summary.empty': 'Qui compare quello che ci hai già detto.',
  'dash.emptyTitle': 'Qui comparirà la curva del tuo bambino.',
  'dash.emptyBody': 'Serve almeno un’ecografia completa: la data e i quattro numeri del referto.',
  'dash.emptyCta': 'Aggiungi la prima ecografia',
  'dash.pdfError': 'Non sono riuscito a creare il PDF. Riprova.',
  'landing.demo': 'Guarda un esempio',
  'meas.onReportShort': 'sul referto: {abbr}',
  'meas.hcShort': 'Giro della testa',
  'meas.acShort': 'Giro della pancia',
  'meas.flShort': 'Osso della coscia',
  'meas.bpdShort': 'Larghezza testa',
  'dash.percentileBefore': 'Su 100 bambini alla {ga}ª settimana,',
  'dash.percentileAfter': 'pesano meno del tuo.',
  'dash.showCurveFor': 'Mostra la curva di',
  'coverage.none': 'nessuno',
  'coverage.mother': 'solo la mamma',
  'coverage.father': 'solo il papà',
  'coverage.both': 'mamma e papà',
  'dash.customUnit': '° percentile',
} as const;

export type Key = keyof typeof it;

export const en: Record<Key, string> = {
  'app.name': 'NasciTara',
  'app.tagline': 'Your baby’s weight, from every scan. Not just one.',
  'lang.it': 'Italiano',
  'lang.en': 'English',
  'lang.switch': 'Change language',
  'nav.back': 'Back',
  'nav.step': 'Step {n} of 3',
  'unit.mm': 'mm',
  'unit.cm': 'cm',
  'unit.kg': 'kg',
  'unit.g': 'g',
  'unit.weeks': 'wks',
  'unit.days': 'd',
  'unit.years': 'yrs',
  'optional': 'optional',

  'footer.credits': 'A project by Matteo Bianco',
  'footer.fiscalCode': 'Tax ID BNCMTT95B02F027P',
  'footer.instagram': 'Instagram',
  'footer.linkedin': 'LinkedIn',
  'footer.disclaimer':
    'NasciTara is a calculation tool, not a medical device. The number that counts is the one on your doctor’s report.',

  'landing.title': 'Estimate your baby’s weight and length up to 45 weeks.',
  'landing.lead':
    'Explore estimated weight, length and the projection at birth, with a mathematical extension up to week 45. This extension does not predict growth after birth.',
  'landing.how1.title': 'Tell us about the pregnancy',
  'landing.how1.body': 'How far along you are, plus a little about mum and dad.',
  'landing.how2.title': 'Add your scans',
  'landing.how2.body': 'The four measurements on the report. One or ten, it works either way.',
  'landing.how3.title': 'See the curve',
  'landing.how3.body': 'Weight, length and percentile, projected all the way to birth.',
  'landing.emailLabel': 'Required e-mail',
  'landing.emailPlaceholder': 'E-mail',
  'landing.emailHelp': 'We’ll only write to you about NasciTara. Nothing else.',
  'landing.gdpr':
    'I consent to my email being collected to count NasciTara users, not for direct marketing. Pregnancy and scan data stay in the browser.',
  'landing.start': 'Start',
  'landing.emailInvalid': 'Check the address — something’s missing.',
  'landing.gdprRequired': 'We need your consent on the email to continue.',
  'landing.skip': 'Continue without leaving your email',

  'preg.title': 'Your pregnancy',
  'preg.lead': 'Pregnancy details and scan measurements are enough to estimate weight and length. Add optional parent details to personalize the reference curve.',
  'preg.section.pregnancy': 'How far along you are',
  'preg.section.pregnancyHint':
    'Today’s week sets the reference: each scan date is then mapped back onto this scale.',
  'preg.ga': 'Weeks of pregnancy',
  'preg.gaWeeks': 'Weeks',
  'preg.gaDays': 'Days',
  'preg.gaHint': 'Between 12 and 42 weeks',
  'preg.refDate': 'As of',
  'preg.refDateHint': 'Usually today',
  'preg.dueDate': 'Estimated due date: {date}',
  'preg.section.parents': 'Mum and dad',
  'preg.section.parentsHint':
    'All optional. They only tailor the curve to your build: without them, the estimated weight and percentile are unchanged.',
  'preg.motherWeight': 'Mum’s average weight before pregnancy',
  'preg.motherWeightHint': 'The usual weight, not the current one',
  'preg.motherHeight': 'Mum’s height',
  'preg.motherAge': 'Mum’s age',
  'preg.fatherWeight': 'Dad’s weight',
  'preg.fatherHeight': 'Dad’s height',
  'preg.fatherAge': 'Dad’s age',
  'preg.bmi': 'Pre-pregnancy BMI {value}',
  'preg.bmiHigh': 'BMI {value} — above 30 scan measurements are less precise',
  'preg.ageNote': 'Age doesn’t enter the weight calculation: we keep it as context only.',
  'preg.continue': 'Continue',
  'preg.needGa': 'Enter the weeks to continue',

  'meas.title': 'Your scans',
  'meas.lead':
    'Copy the four measurements from the report, in millimetres. If you have more than one scan, add them all — that’s what the curve is built from.',
  'meas.scan': 'Scan {n}',
  'meas.date': 'Scan date',
  'meas.ga': '{ga} weeks',
  'meas.noDate': 'date missing',
  'meas.remove': 'Remove',
  'meas.hc': 'HC',
  'meas.ac': 'AC',
  'meas.fl': 'FL',
  'meas.bpd': 'BPD',
  'meas.hcFull': 'Head circumference',
  'meas.acFull': 'Abdominal circumference',
  'meas.flFull': 'Femur length',
  'meas.bpdFull': 'Biparietal diameter',
  'meas.expected': 'expected ~{value} mm',
  'meas.check': 'expected ~{value} mm — double-check',
  'meas.efw': 'Weight estimated from this scan',
  'meas.incomplete': 'Fill in the date and all four measurements',
  'meas.add': 'Add obstetric ultrasound measurement',
  'meas.cta': 'See your baby’s weight and length',
  'meas.needOne': 'At least one complete scan is needed',
  'meas.ignored': '{done} of {total} complete — the rest will be ignored',

  'dash.title': 'Your baby',
  'dash.atWeek': 'At week',
  'dash.today': 'today',
  'dash.weight': 'Weight',
  'dash.length': 'Length',
  'dash.estimatedWeight': 'Estimated weight',
  'dash.range': 'between {lo} and {hi}',
  'dash.percentile': 'Percentile',
  'dash.percentileHint': 'Out of 100 babies at this week, {n} weigh less than yours',
  'dash.estimatedLength': 'Estimated length',
  'dash.lengthHint': 'Head to heel, about {lo}–{hi} cm',
  'dash.atBirth': 'At birth (40 weeks)',
  'dash.custom': 'Tailored to your build',
  'dash.customHint': 'Ideal weight at term {value} g · data used: {coverage}',
  'dash.basedOn': 'From {n} scans, week {from} to {to}.',
  'dash.basedOnOne': 'From a single scan: a snapshot of that day, not a trend.',
  'dash.trendFlat': 'Steady growth: staying on the same percentile.',
  'dash.trendUp': 'Speeding up relative to their own curve.',
  'dash.trendDown': 'Slowing down relative to their own curve.',
  'dash.chartTitle': 'The {metric} curve',
  'dash.chartSub': 'Where most babies sit',
  'dash.legendScans': 'Your scans',
  'dash.legendCurve': 'Your baby’s curve',
  'dash.legendProjection': 'Projection',
  'dash.axisWeeks': 'Weeks of pregnancy',
  'dash.extrapolation': 'Extrapolated zone',
  'dash.extrapolationNote':
    'Beyond week 42 the reference curve has no data behind it: this is a mathematical extension, not a reliable prediction. After birth, growth follows entirely different curves.',
  'dash.tooltipWeek': '{ga} weeks',
  'dash.tooltipMedian': 'median {value}',
  'dash.details': 'How the calculation works',
  'dash.detailsSub': 'Which measurement matters most, and where the numbers come from',
  'dash.weights': 'How much each measurement counts',
  'dash.weightsLead':
    'Computed on your latest scan: how much each measurement moves the result, multiplied by how much that measurement actually varies from baby to baby.',
  'dash.weightsFoot':
    '{key} dominates. It’s the same reason the World Health Organization formula uses only the abdominal and head circumference: the belly carries almost all the information about weight.',
  'dash.method': 'Where the numbers come from',
  'dash.download': 'Download the result',
  'dash.downloading': 'Preparing the PDF…',
  'dash.restart': 'Start over',
  'dash.editScans': 'Edit the scans',
  'dash.noData': 'Not enough to calculate yet.',
  'landing.startNote': 'Two minutes, no more.',
  'preg.continueNote': 'You can go back whenever you like.',
  'meas.ctaNote': 'The maths happens on your device.',
  'meas.onReport': 'on the report: {abbr}, {full}',
  'meas.hcSpoken': 'Around the head',
  'meas.acSpoken': 'How wide the tummy is',
  'meas.flSpoken': 'The thigh bone',
  'meas.bpdSpoken': 'How wide the head is',
  'meas.missingOne': 'One number still missing',
  'meas.missingMany': '{n} numbers still missing',
  'meas.fromThis': 'From this scan: {value}',
  'summary.weeks': '{ga} weeks',
  'summary.scans': '{n} scans',
  'summary.scanOne': '1 scan',
  'summary.due': 'due on {date}',
  'summary.empty': 'What you’ve told us so far will appear here.',
  'dash.emptyTitle': 'Your baby’s curve will appear here.',
  'dash.emptyBody': 'One complete scan is enough: the date and the four numbers from the report.',
  'dash.emptyCta': 'Add the first scan',
  'dash.pdfError': 'Couldn’t create the PDF. Please try again.',
  'landing.demo': 'See an example',
  'meas.onReportShort': 'on the report: {abbr}',
  'meas.hcShort': 'Around the head',
  'meas.acShort': 'Around the tummy',
  'meas.flShort': 'Thigh bone',
  'meas.bpdShort': 'Head width',
  'dash.percentileBefore': 'Out of 100 babies at week {ga},',
  'dash.percentileAfter': 'weigh less than yours.',
  'dash.showCurveFor': 'Show the curve for',
  'coverage.none': 'none',
  'coverage.mother': 'mum only',
  'coverage.father': 'dad only',
  'coverage.both': 'mum and dad',
  'dash.customUnit': 'th percentile',
};

const DICTS: Record<Lang, Record<Key, string>> = { it, en };

/** Sostituisce i segnaposto {nome} con i valori passati. */
export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang][key] ?? DICTS.it[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Locale per toLocaleString: cambia separatori e formato data con la lingua. */
export function localeOf(lang: Lang): string {
  return lang === 'it' ? 'it-IT' : 'en-GB';
}

/** Numero decimale con il separatore giusto per la lingua. */
export function formatDecimal(value: number, digits: number, lang: Lang): string {
  return value.toLocaleString(localeOf(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Etichetta leggibile della copertura della curva personalizzata. */
export function coverageKey(coverage: string): Key {
  if (coverage === 'mamma e papa') return 'coverage.both';
  if (coverage === 'solo mamma') return 'coverage.mother';
  if (coverage === 'solo papa') return 'coverage.father';
  return 'coverage.none';
}
