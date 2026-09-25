import {
  ActionSheetIOS,
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
import { useAppData } from '../data/AppDataProvider';
import { getPlaceStatus, isVisited } from '../data/model';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { PlaceStatusControl } from '../places/PlaceStatusControl';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';

export function StampDetailsScreen({
  id,
  onBrowse,
  onShowMap,
  onShare,
}: {
  id: string;
  onBrowse: () => void;
  onShowMap: (id: string) => void;
  onShare: () => void;
}) {
  const app = useAppData();
  const { width } = useWindowDimensions();
  const country = countryById.get(id);
  const status = getPlaceStatus(app.data, id);
  const collected = isVisited(status);
  const home = app.data.homeCountryId === id;
  const ready = app.status === 'ready';
  const disabled = !ready || app.busy;
  const guard = useActionGuard(`${id}:${app.resetVersion}`);

  function more() {
    if (!country) return;
    const isCurrent = guard();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: country.name,
        options: [
          t('common.markLived'),
          t('countries.details.showMap'),
          t('common.cancel'),
        ],
        disabledButtonIndices: disabled ? [0] : [],
        cancelButtonIndex: 2,
        userInterfaceStyle: theme.appearance.colorScheme,
      },
      (index) => {
        if (!isCurrent()) return;
        if (index === 0 && !disabled)
          void app.setStatus([id], 'lived', { preserveLived: false });
        if (index === 1) onShowMap(id);
      },
    );
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
                <View style={styles.status}>
                  <AppText variant="caption" tone="muted">
                    {t('stamps.status', {
                      status: getStatusPresentation(status).label,
                    })}
                  </AppText>
                  {home && (
                    <AppText variant="caption" tone="accent">
                      {t('common.currentHome')}
                    </AppText>
                  )}
                  <PlaceStatusControl
                    status={status}
                    disabled={disabled}
                    onChange={(nextStatus) => {
                      void app.setStatus([id], nextStatus, {
                        preserveLived: false,
                      });
                    }}
                  />
                </View>
                <View style={styles.art}>
                  <CountryStamp
                    country={country}
                    collected={collected}
                    size={Math.min(
                      240,
                      Math.max(120, width - theme.space.xl * 2),
                    )}
                  />
                  <AppText
                    variant="caption"
                    tone={collected ? 'accent' : 'muted'}
                  >
                    {t(collected ? 'stamps.collected' : 'stamps.notCollected')}
                  </AppText>
                </View>
              </>
            )}
            <View style={styles.actions}>
              <Button
                label={t('sharing.stampAction')}
                variant="quiet"
                disabled={disabled}
                onPress={onShare}
              />
              <Button
                label={t('common.more')}
                variant="quiet"
                onPress={more}
              />
            </View>
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
  status: { gap: theme.space.sm },
  art: { alignItems: 'center', gap: theme.space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
});
