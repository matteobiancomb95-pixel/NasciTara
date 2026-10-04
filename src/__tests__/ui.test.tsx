import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';

// Nessuna rete nei test: senza Supabase l'app usa l'account di anteprima e i dati in memoria.
vi.mock('../lib/supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }));

import { NasciTaraProvider, demoState, emptyState, reducer, rollToToday, type NasciTaraState } from '../state/NasciTaraStore';
import { AccountProvider } from '../state/AccountContext';
import { MammaProvider } from '../state/MammaStore';
import { ScanEditor } from '../screens/ScanEditor';
import { BabyTab, CorredinoTab, HomeTab } from '../screens/Bebe';
import { CalendarTab, NotebookTab } from '../screens/Mamma';
import { Area } from '../screens/Area';
import { addDays, toISO, todayUTC } from '../lib/gestationalAge';
import { FeedbackProvider } from '../ui/feedback';

const today = toISO(todayUTC());
const daysAgo = (n: number) => toISO(addDays(todayUTC(), -n));

const it_ = (s: NasciTaraState): NasciTaraState => ({ ...s, lang: 'it' });
function wrap(ui: ReactNode, state: NasciTaraState = demoState()) {
  return render(
    <FeedbackProvider>
      <NasciTaraProvider initial={it_(state)}>
        <AccountProvider>
          <MammaProvider>{ui}</MammaProvider>
        </AccountProvider>
      </NasciTaraProvider>
    </FeedbackProvider>,
  );
}
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

afterEach(cleanup);

describe('data dell’ecografia (bug 0.7)', () => {
  it('la settimana dichiarata giorni fa avanza fino a oggi', () => {
    const s = rollToToday({ ...emptyState(), gaWeeks: 32, gaDays: 0, referenceDate: daysAgo(6) });
    expect(s).toMatchObject({ gaWeeks: 32, gaDays: 6, referenceDate: today });
    expect(rollToToday({ ...emptyState(), gaWeeks: 42, gaDays: 5, referenceDate: daysAgo(20) }).gaWeeks).toBe(42);
  });

  it('accetta un’ecografia di oggi anche se la settimana è stata impostata giorni fa, rifiuta il futuro', () => {
    const onSave = vi.fn();
    const state = { ...demoState(), gaWeeks: 32 as const, gaDays: 0 as const, referenceDate: daysAgo(6) };
    wrap(<ScanEditor compact number={4} onSave={onSave} />, state);
    type(screen.getByLabelText('Data'), today);
    for (const [label, v] of [['BPD', '83'], ['HC', '308'], ['AC', '290'], ['FL', '59']]) type(screen.getByLabelText(new RegExp(`^${label}`)), v);
    const save = screen.getByRole('button', { name: 'Salva ecografia' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ date: today, bpdMm: 83 }));

    type(screen.getByLabelText('Data'), toISO(addDays(todayUTC(), 1)));
    expect(screen.getByRole('button', { name: 'Salva ecografia' })).toBeDisabled();
  });

  it('salvare un’ecografia allinea il riferimento a oggi', () => {
    const s = reducer({ ...demoState(), gaWeeks: 30, gaDays: 0, referenceDate: daysAgo(3) }, { type: 'saveScan', scan: { ...demoState().scans[0], id: 'x', date: today } });
    expect(s.referenceDate).toBe(today);
    expect(s.gaDays).toBe(3);
  });
});

describe('Il tuo bebe', () => {
  it('Riepilogo: toccando il bebe cambia il fumetto', () => {
    wrap(<HomeTab firstName="Giulia" onGo={() => {}} />);
    const stage = screen.getByRole('button', { name: 'Tocca il bebe' });
    const first = within(stage).getByRole('status').textContent;
    fireEvent.click(stage);
    expect(within(stage).getByRole('status').textContent).not.toBe(first);
  });

  it('Crescita: le ecografie sono chiuse e si aprono al tocco', () => {
    wrap(<BabyTab />);
    expect(screen.queryByText('BPD')).toBeNull();
    const head = screen.getAllByRole('button', { expanded: false })[0];
    fireEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('BPD')).toBeInTheDocument();
  });

  it('Corredino: con + si segna un capo già preso', () => {
    wrap(<CorredinoTab />);
    const plus = screen.getAllByRole('button', { name: /in più$/ })[0];
    const group = plus.closest('[role="group"]') as HTMLElement;
    expect(within(group).getByText('0')).toBeInTheDocument();
    fireEvent.click(plus);
    expect(within(group).getByText('1')).toBeInTheDocument();
  });
});

describe('La mamma', () => {
  it('Appuntamenti: una visita aggiunta compare nell’agenda di oggi', async () => {
    wrap(<CalendarTab />);
    expect(screen.getByRole('heading', { name: 'I tuoi appuntamenti' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visita' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salva visita' }));
    expect(await screen.findByText('1 impegno')).toBeInTheDocument();
    expect(screen.getAllByText('Visita ginecologica').length).toBeGreaterThan(0);
  });

  it('Notebook: salva una nota e filtra per categoria, senza consensi da accettare', async () => {
    wrap(<NotebookTab onCalendar={() => {}} />);
    expect(screen.queryByText(/Anthropic/)).toBeNull();
    type(screen.getByLabelText('Nuova nota'), 'Calci fortissimi dopo cena');
    fireEvent.click(screen.getByRole('button', { name: 'Movimenti' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva nota' }));
    expect(await screen.findByText('Calci fortissimi dopo cena')).toBeInTheDocument();
    const filters = screen.getByRole('group', { name: 'Filtra' });
    expect(within(filters).getByRole('button', { name: /Movimenti/ })).toBeInTheDocument();
  });
});

describe('Navigazione', () => {
  it('la barra porta a La mamma e i nomi usano "bebe"', () => {
    let current: Parameters<typeof Area>[0]['tab'] = 'home';
    const { rerender } = wrap(<Area tab={current} onTab={(t) => { current = t; }} firstName="Giulia" fullName="Giulia Rossi" onAccount={() => {}} />);
    expect(document.body.textContent).not.toMatch(/bebè/);
    const bars = screen.getAllByRole('navigation', { name: 'Sezioni' });
    fireEvent.click(within(bars[bars.length - 1]).getByRole('button', { name: /La mamma/ }));
    expect(current).toBe('calendario');
    rerender(
      <NasciTaraProvider initial={it_(demoState())}><AccountProvider><MammaProvider>
        <Area tab={current} onTab={() => {}} firstName="Giulia" fullName="Giulia Rossi" onAccount={() => {}} />
      </MammaProvider></AccountProvider></NasciTaraProvider>,
    );
    expect(screen.getByRole('button', { name: 'I tuoi appuntamenti' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('Riscontri (0.9.1)', () => {
  it('salvare una nota mostra una notifica, eliminarla chiede conferma in stile app', async () => {
    const native = vi.spyOn(window, 'confirm');
    wrap(<NotebookTab onCalendar={() => {}} />);
    type(screen.getByLabelText('Nuova nota'), 'Bruciore di stomaco');
    fireEvent.click(screen.getByRole('button', { name: 'Salva nota' }));
    expect(await screen.findByText('Nota salvata.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Elimina nota' }));
    const ask = await screen.findByRole('dialog', { name: 'Eliminare questa nota?' });
    fireEvent.click(within(ask).getByRole('button', { name: 'Annulla' }));
    expect(screen.getByText('Bruciore di stomaco')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Elimina nota' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Eliminare questa nota?' })).getByRole('button', { name: 'Elimina' }));
    expect(await screen.findByText('Nota eliminata.')).toBeInTheDocument();
    expect(screen.queryByText('Bruciore di stomaco')).toBeNull();
    expect(native).not.toHaveBeenCalled();
  });

  it('salvare una visita annuncia quando arriverà il promemoria', async () => {
    wrap(<CalendarTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Visita' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salva visita' }));
    expect(await screen.findByText(/^Visita salvata/)).toBeInTheDocument();
  });
});

describe('Robustezza visibile (0.9.3)', () => {
  it('Crescita: una misura incoerente viene segnalata come esclusa', () => {
    const s = demoState();
    const scans = s.scans.map((sc, i) => (i === s.scans.length - 1 ? { ...sc, bpdMm: 38 } : sc));
    wrap(<BabyTab />, { ...s, scans });
    fireEvent.click(screen.getAllByRole('button', { expanded: false })[0]);
    expect(screen.getByText('esclusa')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('BPD non torna con le altre misure');
  });
});

describe('Versione dell’app solo in Info', () => {
  it('il piede e la privacy non mostrano la versione; l’Area riservata la mostra in Info', async () => {
    const { AppShell } = await import('../components/AppShell');
    const { PrivateArea } = await import('../screens/PrivateArea');
    const { Privacy } = await import('../screens/Privacy');
    const { APP_VERSION } = await import('../version');
    const shell = wrap(<AppShell demo />);
    expect(document.body.textContent).not.toMatch(/v?\d+\.\d+\.\d+|versione \d/);
    shell.unmount();
    const privacy = wrap(<Privacy onBack={() => {}} />);
    expect(document.body.textContent).not.toMatch(/versione \d/);
    privacy.unmount();
    wrap(<PrivateArea onBack={() => {}} onPrivacy={() => {}} onScans={() => {}} onJourney={() => {}} />);
    const info = screen.getByRole('heading', { name: 'Info' }).parentElement as HTMLElement;
    expect(within(info).getByText(APP_VERSION)).toBeInTheDocument();
  });
});
