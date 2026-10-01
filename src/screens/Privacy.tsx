import { useNasciTara } from '../state/NasciTaraStore';
import { Logo } from '../ui/kit';

/**
 * Privacy policy (dal mockup "Privacy Policy", 1 ottobre 2026), riscritta su come funziona davvero la 0.7.
 * Da far rivedere a un consulente privacy prima di considerarla definitiva.
 */
export function Privacy({ onBack }: { onBack: () => void }) {
  const { lang } = useNasciTara();
  const it = lang === 'it';
  const sections: Array<[string, string, string[]]> = it ? [
    ['chi', 'Chi siamo e cosa raccogliamo', [
      'Il titolare del trattamento è Matteo Bianco, persona fisica che ha ideato e gestisce NasciTara (CF BNCMTT95B02F027P). Per qualsiasi domanda sulla privacy scrivi a ciao@nascitara.tech.',
      'Raccogliamo: nome, email e password (o l’accesso con Google); i dati che inserisci su gravidanza, ecografie, corredino, calendario, integratori e notebook; i messaggi che ci mandi da La tua voce; pochi dati tecnici per sicurezza e funzionamento.',
      'Li usiamo per darti il servizio che chiedi. Non li vendiamo e non facciamo pubblicità.',
    ]],
    ['salute', 'Dati sulla salute', [
      'Settimana di gravidanza, misure delle ecografie, visite, integratori e note sono dati sulla salute. Li trattiamo solo con il tuo consenso esplicito, dato in registrazione, per stime, corredino e promemoria. Puoi revocarlo eliminando l’account.',
      'Sono conservati nel database del nostro fornitore (Supabase) in Europa, protetti in modo che ogni account veda solo i propri dati.',
      'Stime, insight e risposte dell’AI sono informazioni, non diagnosi. Per ogni decisione vale il tuo medico.',
    ]],
    ['ai', 'Intelligenza artificiale', [
      'Le funzioni AI (lettura del foglio illustrativo degli integratori, insight del notebook, assistente di Supporto) usano Claude di Anthropic, con sede negli Stati Uniti. Si attivano solo dopo un tuo consenso specifico, che puoi ritirare in ogni momento da Area riservata.',
      'All’AI inviamo solo il testo necessario (il testo del foglio illustrativo, le tue note, le tue domande e la settimana di gravidanza), mai nome o email. Anthropic non usa questi dati per addestrare i propri modelli. Il trasferimento fuori dall’Unione europea avviene con le garanzie previste dal GDPR (clausole contrattuali standard).',
      'L’assistente cerca le informazioni sui siti di enti sanitari ufficiali e ne cita le fonti. Non è un medico, un’ostetrica o una psicologa.',
    ]],
    ['foto', 'Foto di referti e fogli illustrativi', [
      'Le foto non lasciano il tuo dispositivo: il testo viene letto direttamente sul telefono o sul computer e la foto non viene salvata né caricata. Dei referti conserviamo solo le misure; dei fogli illustrativi solo la frase con la posologia, se la salvi.',
    ]],
    ['email', 'Email', [
      'Ti scriviamo per account, password e i promemoria che imposti tu (visite e integratori), tramite il fornitore Brevo in Europa. Nell’oggetto non scriviamo mai dati sulla salute. Puoi spegnere ogni promemoria dal calendario.',
    ]],
    ['cookie', 'Cookie e memoria del browser', [
      'NasciTara usa solo strumenti tecnici: la memoria del browser per tenerti collegata e per salvare il percorso su questo dispositivo. Non usiamo cookie statistici o di marketing e non facciamo profilazione. Se un giorno li introdurremo, te lo chiederemo prima.',
      'Per migliorare l’app registriamo in forma tecnica alcuni passaggi del percorso (per esempio percorso completato o PDF scaricato), senza misure né testi.',
    ]],
    ['voce', 'La tua voce', [
      'I messaggi di La tua voce finiscono in un foglio Google privato del team, con un codice al posto del tuo nome. L’email c’è solo se chiedi di essere ricontattata. Ti chiediamo di non scrivere dati sulla salute. Li conserviamo al massimo 24 mesi.',
    ]],
    ['diritti', 'I tuoi diritti e quanto teniamo i dati', [
      'Puoi vedere, correggere, scaricare o cancellare i tuoi dati e ritirare i consensi. Le azioni principali sono in Area riservata (Scarica i tuoi dati, Elimina account); per il resto scrivi a ciao@nascitara.tech e rispondiamo entro 30 giorni. Puoi anche rivolgerti al Garante per la protezione dei dati personali.',
      'Teniamo i dati finché hai l’account. Quando lo elimini cancelliamo subito account, screening, visite, integratori, note e promemoria; le copie di sicurezza del fornitore si sovrascrivono entro 30 giorni.',
      'Fornitori: Supabase (database e accesso, Europa), Vercel (pubblicazione del sito), Brevo (email, Europa), Anthropic (AI, Stati Uniti, solo con consenso), Google (accesso con Google, foglio di La tua voce). NasciTara è per persone maggiorenni.',
    ]],
  ] : [
    ['who', 'Who we are and what we collect', [
      'The data controller is Matteo Bianco, the individual who created and runs NasciTara. For any privacy question write to ciao@nascitara.tech.',
      'We collect: name, email and password (or Google sign-in); what you enter about pregnancy, scans, layette, calendar, supplements and notebook; messages you send from Your voice; a few technical data for security.',
      'We use them to provide the service you ask for. We do not sell them and we do not advertise.',
    ]],
    ['health', 'Health data', [
      'Pregnancy week, scan measurements, visits, supplements and notes are health data. We process them only with your explicit consent, for estimates, layette and reminders. They are stored by our provider (Supabase) in Europe, each account seeing only its own data. Estimates and AI answers are information, not a diagnosis.',
    ]],
    ['ai', 'Artificial intelligence', [
      'AI features use Claude by Anthropic (United States), only after your specific consent, which you can withdraw from the private area. We send only the text needed, never your name or email; Anthropic does not use it to train its models. Transfers outside the EU rely on GDPR safeguards (standard contractual clauses).',
    ]],
    ['photos', 'Photos', ['Photos never leave your device: text is read locally and the photo is neither stored nor uploaded.']],
    ['email', 'Email', ['We email you about your account and the reminders you set, through Brevo in Europe. Subjects never contain health data.']],
    ['cookies', 'Cookies', ['Only technical browser storage: no statistics or marketing cookies, no profiling.']],
    ['rights', 'Your rights', ['You can access, correct, download or delete your data and withdraw consent from the private area, or write to ciao@nascitara.tech. We keep data while you have an account and delete it when you delete the account (provider backups are overwritten within 30 days). NasciTara is for adults.']],
  ];
  return (
    <div className="nt-screen nt-privacy">
      <header className="nt-top">
        <div className="nt-editor-head">
          <button type="button" className="nt-round" aria-label={it ? 'Indietro' : 'Back'} onClick={onBack}>←</button>
          <Logo />
        </div>
      </header>
      <main className="nt-wrap nt-main nt-narrow">
        <h1 className="nt-title">{it ? 'Privacy, in parole semplici' : 'Privacy, in plain words'}</h1>
        <p className="nt-note">{it ? 'Aggiornata il 1 ottobre 2026 · versione 0.7' : 'Updated 1 October 2026 · version 0.7'}</p>
        <div className="nt-card nt-card--pink nt-stack6">
          <div className="nt-eyebrow">{it ? 'In breve' : 'In short'}</div>
          <p className="nt-body">{it ? 'Usiamo i tuoi dati solo per far funzionare NasciTara. Non li vendiamo. I dati sulla gravidanza restano in Europa; l’AI si usa solo se dici sì. Puoi scaricarli o cancellarli quando vuoi da Area riservata.' : 'We use your data only to run NasciTara. We never sell it. Pregnancy data stays in Europe; AI is used only if you say yes. Download or delete it any time from the private area.'}</p>
        </div>
        {sections.map(([id, title, paras]) => (
          <section key={id} className="nt-stack6 nt-policy">
            <h2 className="nt-h3">{title}</h2>
            {paras.map((p, i) => <p key={i} className="nt-body">{p}</p>)}
          </section>
        ))}
      </main>
    </div>
  );
}
