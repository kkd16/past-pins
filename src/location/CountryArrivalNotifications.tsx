import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAppData } from '../data/AppData';
import { appData } from '../data/app-data';
import { useToast } from '../feedback/ToastProvider';
import { diagnostics } from '../recovery/diagnostics-file';
import { t } from '../localization';
import { arrivalDataReady, parseArrival } from './arrivals';
import { arrivalTracker, checkCurrentArrival, syncArrivalMonitoring } from './arrival-notifications';

export function CountryArrivalNotifications() {
  const app = useAppData((snapshot) => snapshot);
  const { showToast } = useToast();
  const navigation = useRootNavigationState();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  const ready = arrivalDataReady(app);

  useEffect(() => {
    if (app.status === 'loading') return;
    let active = true;
    async function reconcile() {
      const expected = appData.getSnapshot();
      let enabled: boolean;
      try {
        enabled = await syncArrivalMonitoring();
      } catch (error) {
        const current = appData.getSnapshot();
        if (active && current.status === 'ready' && !current.busy &&
          current.resetVersion === expected.resetVersion &&
          current.data.preferences === expected.data.preferences &&
          current.data.preferences.countryArrivalAlerts
        ) {
          appData.updatePreferences({ countryArrivalAlerts: false });
          showToast({ message: t('location.arrivalStartFailed') });
        }
        diagnostics.record('reminders', error);
        return;
      }
      try {
        if (active && enabled) await checkCurrentArrival();
      } catch (error) {
        diagnostics.record('reminders', error);
      }
    }
    void reconcile();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcile();
    });
    return () => { active = false; subscription.remove(); };
  }, [app.status, app.busy, app.recovery, app.saveError, app.resetVersion,
    app.data.onboardingCompleted, app.data.preferences, showToast]);

  useEffect(() => {
    if (!response || !navigation?.key || !ready) return;
    const { request } = response.notification;
    if (handled.current === request.identifier) return;
    const arrival = parseArrival(request.content.data);
    if (!arrival || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    let cancelled = false;
    let opening = false;
    const openArrival = async () => {
      if (cancelled || opening || handled.current === request.identifier) return;
      opening = true;
      try {
        const current = await arrivalTracker.isCurrent(arrival);
        if (cancelled || !arrivalDataReady(appData.getSnapshot())) return;
        handled.current = request.identifier;
        Notifications.clearLastNotificationResponse();
        if (current) router.push({
          pathname: '/country/[id]',
          params: { id: arrival.countryId, arrival: String(arrival.notifiedAt) },
        });
      } catch (error) {
        diagnostics.record('reminders', error);
      } finally {
        opening = false;
      }
    };
    void openArrival();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void openArrival();
    });
    return () => { cancelled = true; subscription.remove(); };
  }, [response, navigation?.key, ready, app.data]);

  return null;
}
