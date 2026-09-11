import { AppLayout } from './components/AppLayout';
import { NasciTaraProvider, demoState } from './state/NasciTaraStore';

/**
 * Ogni sessione parte vuota. L'esempio si carica solo su richiesta esplicita:
 * con `#demo` nell'URL, oppure dal pulsante nello stato iniziale.
 */
const startWithDemo = /^#?(demo|esempio|example)$/i.test(window.location.hash);

export default function App() {
  return (
    <NasciTaraProvider initial={startWithDemo ? demoState() : undefined}>
      <AppLayout />
    </NasciTaraProvider>
  );
}
