import { useEffect, useState } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { Avatar, Logo } from '../ui/kit';
import { NavIcon } from '../ui/art';
import { BabyTab, CorredinoTab, HomeTab } from './Bebe';
import { CalendarTab, NotebookTab, SupportTab } from './Mamma';
import { VoiceTab } from './Voce';

export type AreaTab = 'home' | 'baby' | 'corredino' | 'calendario' | 'notebook' | 'supporto' | 'voce';
type Section = 'bebe' | 'mamma' | 'voce';
const SUBTABS: Record<Section, AreaTab[]> = { bebe: ['home', 'baby', 'corredino'], mamma: ['calendario', 'notebook', 'supporto'], voce: ['voce'] };
const sectionOf = (t: AreaTab): Section => (SUBTABS.mamma.includes(t) ? 'mamma' : t === 'voce' ? 'voce' : 'bebe');

/**
 * Area riservata 0.7: tre sezioni (Il tuo bebe, La mamma, La tua voce).
 * Telefono: sottosezioni in alto e barra in basso. Desktop: sezioni nell'header.
 */
export function Area({ firstName, fullName, onAccount, tab, onTab }: { firstName: string; fullName: string; onAccount: () => void; tab: AreaTab; onTab: (t: AreaTab) => void }) {
  const { lang } = useNasciTara();
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
    home: it ? 'Riepilogo' : 'Overview', baby: it ? 'Crescita' : 'Growth', corredino: 'Corredino AI',
    calendario: it ? 'I tuoi appuntamenti' : 'Appointments', notebook: 'Notebook', supporto: it ? 'Supporto' : 'Support', voce: it ? 'La tua voce' : 'Your voice',
  };
  const sectionName: Record<Section, string> = { bebe: it ? 'Il tuo bebe' : 'Your baby', mamma: it ? 'La mamma' : 'Mum', voce: it ? 'La tua voce' : 'Your voice' };
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
      {SUBTABS[section].length > 1 ? (
        <div className="nt-wrap nt-steps-wrap">
          <nav className="nt-steps nt-steps--area" aria-label={sectionName[section]}>
            {SUBTABS[section].map((k) => (
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
