import { AccountProvider } from './state/AccountContext';
import { MammaProvider } from './state/MammaStore';
import { FeedbackProvider } from './ui/feedback';
import { AppShell } from './components/AppShell';
import { NasciTaraProvider, demoState } from './state/NasciTaraStore';

/**
 * Restore a saved device session, or start empty. Demo is explicit and never saved.
 */
const startWithDemo = /^#?(demo|esempio|example)$/i.test(window.location.hash);

export default function App() {
  return (
    <FeedbackProvider>
    <NasciTaraProvider initial={startWithDemo ? demoState() : undefined}>
      <AccountProvider><MammaProvider><AppShell demo={startWithDemo} /></MammaProvider></AccountProvider>
    </NasciTaraProvider>
    </FeedbackProvider>
  );
}
