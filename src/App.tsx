import { AppLayout } from './components/AppLayout';
import { NasciTaraProvider, emptyState } from './state/NasciTaraStore';

/** `#vuoto` nell'URL apre l'app senza i dati di esempio. */
const startEmpty = /^#?(vuoto|empty|reset)$/i.test(window.location.hash);

export default function App() {
  return (
    <NasciTaraProvider initial={startEmpty ? emptyState() : undefined}>
      <AppLayout />
    </NasciTaraProvider>
  );
}
