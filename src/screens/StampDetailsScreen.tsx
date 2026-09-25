import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import { showStatusPicker } from '../countries/StatusPicker';
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus, isVisited } from '../data/model';
import { t } from '../localization';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';

export function StampDetailsScreen({
  id,
  onBrowse,
  onShowMap,
}: {
  id: string;
  onBrowse: () => void;
  onShowMap: (id: string) => void;
}) {
  const app = useAppData();
  const { width } = useWindowDimensions();
  const country = countryById.get(id);
  const status = getPlaceStatus(app.data, id);
  const collected = isVisited(status);
  const ready = app.status === 'ready';
  const disabled = !ready || app.busy;
  const session = useRef<object | null>(null);
  useFocusEffect(
    useCallback(() => {
      session.current = { id, resetVersion: app.resetVersion };
      return () => {
        session.current = null;
      };
    }, [id, app.resetVersion]),
  );

  function editStatus() {
    if (!country) return;
    const current = session.current;
    showStatusPicker(country.name, (nextStatus) => {
      if (current && session.current === current)
        void app.setStatus([id], nextStatus, { preserveLived: false });
    });
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <DataFeedback />
        {country ? (
          <>
            <View style={styles.heading}>
              <AppText variant="title" accessibilityRole="header">
                {country.name}
              </AppText>
              <AppText tone="muted">{country.continent.name}</AppText>
            </View>
            {ready && (
              <>
                <View style={styles.art}>
                  <CountryStamp
                    country={country}
                    collected={collected}
                    size={Math.min(
                      300,
                      Math.max(120, width - theme.space.xl * 2),
                    )}
                  />
                </View>
                <AppText
                  variant="heading"
                  tone={collected ? 'accent' : 'muted'}
                >
                  {t(collected ? 'stamps.collected' : 'stamps.notCollected')}
                </AppText>
                <AppText tone="muted">
                  {t(
                    collected
                      ? 'stamps.collectedHint'
                      : 'stamps.notCollectedHint',
                  )}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {t('stamps.status', {
                    status: getStatusPresentation(status).label,
                  })}
                </AppText>
                <Button
                  label={t(
                    collected ? 'stamps.changeStatus' : 'stamps.markVisited',
                  )}
                  disabled={disabled}
                  onPress={
                    collected
                      ? editStatus
                      : () => {
                          void app.setStatus([id], 'visited');
                        }
                  }
                />
              </>
            )}
            <Button
              label={t('countries.details.showMap')}
              variant="quiet"
              onPress={() => onShowMap(id)}
            />
            <AppText variant="caption" tone="muted">
              {t('stamps.artworkNote')}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="heading">{t('stamps.unavailable')}</AppText>
            <Button label={t('stamps.browseCollection')} onPress={onBrowse} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: theme.space.lg, gap: theme.space.lg },
  heading: { gap: theme.space.xs },
  art: { alignItems: 'center', paddingVertical: theme.space.md },
});
