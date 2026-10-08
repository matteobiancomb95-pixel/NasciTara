import { useEffect, useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { useFamily } from '../state/AccountContext';
import { ROLE_SECTION, type Phase } from '../lib/family';
import { Avatar, Logo } from '../ui/kit';
import { NavIcon } from '../ui/art';
import { BabyTab, CorredinoTab, HomeTab } from './Bebe';
import { CalendarTab, NotebookTab, SupportTab } from './Mamma';
import { VoiceTab } from './Voce';

export type AreaTab = 'home' | 'baby' | 'corredino' | 'calendario' | 'notebook' | 'supporto' | 'voce';
type Section = 'bebe' | 'mamma' | 'voce';
const SUBTABS: Record<Section, AreaTab[]> = { bebe: ['home', 'baby', 'corredino'], mamma: ['calendario', 'notebook', 'supporto'], voce: ['voce'] };
/** Dopo la nascita: il corredino (primi 3 mesi) solo per i neogenitori, le ecografie solo se ce ne sono. */
const subtabs = (s: Section, phase: Phase, scans: number): AreaTab[] => {
  if (s !== 'bebe' || phase === 'attesa') return SUBTABS[s];
  const tabs: AreaTab[] = phase === 'neo' ? ['home', 'corredino'] : ['home'];
  return scans > 0 ? [...tabs, 'baby'] : tabs;
};
const sectionOf = (t: AreaTab): Section => (SUBTABS.mamma.includes(t) ? 'mamma' : t === 'voce' ? 'voce' : 'bebe');

/**
 * Area riservata 0.7: tre sezioni (Il tuo bebe, La mamma, La tua voce).
 * Telefono: sottosezioni in alto e barra in basso. Desktop: sezioni nell'header.
 */
export function Area({ firstName, fullName, onAccount, tab, onTab }: { firstName: string; fullName: string; onAccount: () => void; tab: AreaTab; onTab: (t: AreaTab) => void }) {
  const { lang, completeScans } = useNasciTara();
  const { role, born, phase } = useFamily();
  const it = lang === 'it';
  const [last, setLast] = useState<Record<Section, AreaTab>>(() => ({ bebe: 'home', mamma: 'calendario', voce: 'voce', [sectionOf(tab)]: tab }));
  const section = sectionOf(tab);
  const go = (t: AreaTab) => {
    onTab(t);
    setLast((l) => ({ ...l, [sectionOf(t)]: t }));
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  const tabName: Record<AreaTab, string> = {
    home: it ? 'Riepilogo' : 'Overview', baby: born ? (it ? 'Ecografie' : 'Scans') : it ? 'Crescita' : 'Growth', corredino: 'Corredino AI',
    calendario: it ? 'I tuoi appuntamenti' : 'Appointments', notebook: 'Notebook', supporto: it ? 'Supporto' : 'Support', voce: it ? 'La tua voce' : 'Your voice',
  };
  const sectionName: Record<Section, string> = { bebe: it ? 'Il tuo bebe' : 'Your baby', mamma: ROLE_SECTION[role][lang], voce: it ? 'La tua voce' : 'Your voice' };
  const sections = (cls: string) => (
    <nav className={cls} aria-label={it ? 'Sezioni' : 'Sections'}>
      {(Object.keys(SUBTABS) as Section[]).map((s) => (
        <button key={s} type="button" aria-current={section === s ? 'page' : undefined} onClick={() => go(last[s])}>
          <NavIcon name={s} />
          <span>{sectionName[s]}</span>
        </button>
      ))}
    </nav>
  );
  const label = it ? 'Area riservata' : 'Private area';
  return (
    <div className="nt-screen nt-area">
      <header className="nt-top">
        <Logo />
        <span className="nt-desk">{sections('nt-mainnav')}</span>
        <div className="nt-top__side">
          <span className="nt-mob"><Avatar name={firstName || fullName} onClick={onAccount} label={label} /></span>
          <span className="nt-desk"><Avatar name={firstName || fullName} onClick={onAccount} label={label} withName={fullName || firstName} /></span>
        </div>
      </header>
      {subtabs(section, phase, completeScans).length > 1 ? (
        <div className="nt-wrap nt-steps-wrap">
          <nav className="nt-steps nt-steps--area" aria-label={sectionName[section]}>
            {subtabs(section, phase, completeScans).map((k) => (
              <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>{tabName[k]}</button>
            ))}
          </nav>
        </div>
      ) : null}
      {tab === 'home' ? <HomeTab firstName={firstName} onGo={go} />
        : tab === 'baby' ? <BabyTab />
        : tab === 'corredino' ? <CorredinoTab />
        : tab === 'calendario' ? <CalendarTab />
        : tab === 'notebook' ? <NotebookTab onCalendar={() => go('calendario')} />
        : tab === 'supporto' ? <SupportTab />
        : <VoiceTab firstName={firstName} />}
      {sections('nt-bottomnav nt-mob')}
    </div>
  );
}
