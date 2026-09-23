import { AccountProvider } from './state/AccountContext';
import { AppShell } from './components/AppShell';
import { NasciTaraProvider, demoState } from './state/NasciTaraStore';

/**
 * Restore a saved device session, or start empty. Demo is explicit and never saved.
 */
const startWithDemo = /^#?(demo|esempio|example)$/i.test(window.location.hash);

export default function App() {
  return (
    <NasciTaraProvider initial={startWithDemo ? demoState() : undefined}>
      <AccountProvider><AppShell /></AccountProvider>
    </NasciTaraProvider>
  );
}
