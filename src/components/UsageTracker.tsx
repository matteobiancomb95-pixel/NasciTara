import { useEffect } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { trackUsage } from '../lib/usageTracking';
export function UsageTracker() {
  const { state } = useNasciTara();
  useEffect(() => {
    trackUsage(state.page);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') trackUsage('heartbeat');
    }, 60000);
    return () => window.clearInterval(timer);
  }, [state.page]);
  return null;
}
