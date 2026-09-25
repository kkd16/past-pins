import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAppData } from '../data/AppDataProvider';
import { parseArrival } from './arrivals';
import { arrivalTracker, checkCurrentArrival, syncArrivalMonitoring } from './arrival-notifications';

export function CountryArrivalNotifications() {
  const app = useAppData();
  const navigation = useRootNavigationState();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (app.status === 'loading') return;
    async function reconcile() {
      try {
        if (await syncArrivalMonitoring()) await checkCurrentArrival();
      } catch (error) {
        // Location failures must not interrupt opening or browsing the app.
        console.warn('Country arrival monitoring failed:', error);
      }
    }
    void reconcile();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcile();
    });
    return () => subscription.remove();
  }, [app.status, app.busy, app.saveError, app.resetVersion, app.data.preferences.countryArrivalAlerts]);

  useEffect(() => {
    if (!response || !navigation?.key || app.status !== 'ready' || app.busy) return;
    const { request } = response.notification;
    if (handled.current === request.identifier) return;
    const arrival = parseArrival(request.content.data);
    if (!arrival || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    let cancelled = false;
    void arrivalTracker.isCurrent(arrival).then((current) => {
      if (cancelled) return;
      handled.current = request.identifier;
      Notifications.clearLastNotificationResponse();
      if (current) router.push({
        pathname: '/country/[id]',
        params: { id: arrival.countryId, arrival: String(arrival.notifiedAt) },
      });
    }).catch((error) => console.warn('Could not open country arrival:', error));
    return () => { cancelled = true; };
  }, [response, navigation?.key, app.status, app.busy, app.data]);

  return null;
}
