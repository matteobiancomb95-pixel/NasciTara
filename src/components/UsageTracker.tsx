import { useEffect } from 'react';
import { useNasciTara } from '../state/NasciTaraStore';
import { trackUsage, setUsageConsent } from '../lib/usageTracking';
export function UsageTracker() {
  const { state } = useNasciTara();
  useEffect(() => {
    setUsageConsent(state.emailConsent);
    if(state.emailConsent&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()))trackUsage('identify',state.email);
    trackUsage(state.page);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') trackUsage('heartbeat');
    }, 60000);
    return () => window.clearInterval(timer);
  }, [state.page,state.emailConsent,state.email]);
  return null;
}
