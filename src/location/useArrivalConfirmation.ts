import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';

import { countryById } from '../countries/catalog';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { isVisited } from '../data/model';
import { t } from '../localization';
import { diagnostics } from '../recovery/diagnostics-file';
import { ARRIVAL_TYPE, arrivalDataReady, parseArrival } from './arrivals';
import { arrivalTracker } from './arrival-notifications';

export function useArrivalConfirmation(countryId: string, token: string | undefined) {
  const { setStatus } = appData;
  const data = useAppData((snapshot) => snapshot.data);
  const ready = useAppData(arrivalDataReady);
  const handled = useRef<string | null>(null);
  useFocusEffect(useCallback(() => {
    const key = `${countryId}:${token}`;
    if (!token || handled.current === key || !ready) return;
    const arrival = parseArrival({ type: ARRIVAL_TYPE, countryId, notifiedAt: Number(token) });
    if (!arrival) return;
    let cancelled = false;
    void arrivalTracker.isCurrent(arrival).then((current) => {
      if (cancelled || !current) return;
      handled.current = key;
      if (isVisited(data.places[countryId])) return;
      Alert.alert(
        t('location.visitTitle', { country: countryById.get(countryId)!.name }),
        t('location.visitMessage'),
        [
          { text: t('location.notNow'), style: 'cancel' },
          { text: t('location.markVisited'), onPress: () => {
            void setStatus([countryId], 'visited', { isCurrent: () => !cancelled });
          } },
        ],
      );
    }).catch((error) => diagnostics.record('reminders', error));
    return () => { cancelled = true; };
  }, [ready, data, setStatus, countryId, token]));
}
