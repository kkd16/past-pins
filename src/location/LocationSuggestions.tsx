import { useEffect, useEffectEvent, useRef } from 'react';
import { Alert, AppState } from 'react-native';

import type { Country } from '../countries/types';
import { useAppData } from '../data/AppDataProvider';
import { isVisited } from '../data/model';
import { t } from '../localization';
import { getCurrentCountry, getCurrentLocation } from './current-location';

export function LocationSuggestions() {
  const app = useAppData();
  const ready = app.status === 'ready';
  const suggested = useRef(new Set<string>());
  const suggest = useEffectEvent((country: Country) => {
    if (app.busy || AppState.currentState !== 'active') return;
    if (
      isVisited(app.data.places[country.id]) ||
      suggested.current.has(country.id)
    )
      return;
    suggested.current.add(country.id);
    Alert.alert(
      t('location.visitTitle', { country: country.name }),
      t('location.visitMessage', { country: country.name }),
      [
        { text: t('location.notNow'), style: 'cancel' },
        {
          text: t('location.markVisited'),
          onPress: () => {
            void app.setStatus([country.id], 'visited');
          },
        },
      ],
    );
  });

  useEffect(() => {
    if (!ready) return;
    let request = 0;
    async function check() {
      if (AppState.currentState !== 'active') return;
      const current = ++request;
      try {
        const point = await getCurrentLocation();
        if (current !== request || AppState.currentState !== 'active') return;
        const country = await getCurrentCountry(point);
        if (current === request && country) suggest(country);
      } catch {
        // Opening the app should stay quiet when location is unavailable.
      }
    }
    void check();
    let backgrounded = AppState.currentState !== 'active';
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgrounded = true;
        // Discard results from before this background/foreground cycle.
        request++;
      }
      if (state === 'active' && backgrounded) {
        backgrounded = false;
        void check();
      }
    });
    return () => {
      request++;
      subscription.remove();
    };
  }, [ready]);

  return null;
}
