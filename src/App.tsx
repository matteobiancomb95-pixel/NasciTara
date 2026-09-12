import { AppShell } from './components/AppShell';
import { NasciTaraProvider, demoState } from './state/NasciTaraStore';

/**
 * Ogni sessione parte dalla pagina di atterraggio, vuota. L'esempio si carica
 * solo su richiesta esplicita: con `#demo` nell'URL oppure dal link in alto.
 */
const startWithDemo = /^#?(demo|esempio|example)$/i.test(window.location.hash);

export default function App() {
  return (
    <NasciTaraProvider initial={startWithDemo ? demoState() : undefined}>
      <AppShell />
    </NasciTaraProvider>
  );
}
