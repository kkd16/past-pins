import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';

import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { t } from '../localization';
import { ARRIVAL_TYPE, parseArrival } from './arrivals';
import { arrivalTracker } from './arrival-notifications';

export function useArrivalConfirmation(countryId: string, token: string | undefined) {
  const { data, status, busy, setStatus } = useAppData();
  const handled = useRef<string | null>(null);
  useFocusEffect(useCallback(() => {
    const key = `${countryId}:${token}`;
    if (!token || handled.current === key || status !== 'ready' || busy) return;
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
            if (!cancelled) void setStatus([countryId], 'visited');
          } },
        ],
      );
    }).catch((error) => console.warn('Could not confirm country arrival:', error));
    return () => { cancelled = true; };
  }, [status, busy, data, setStatus, countryId, token]));
}
