import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppData';
import { getPlaceStatus, isVisited } from '../data/model';
import { language, t } from '../localization';
import { CountryStamp } from '../stamps/CountryStamp';
import { theme } from '../theme';

export function StampDetailsScreen({
  id,
  onClose,
  onShare,
}: {
  id: string;
  onClose: () => void;
  onShare: () => void;
}) {
  const collected = useAppData((snapshot) => isVisited(getPlaceStatus(snapshot.data, id)));
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const country = countryById.get(id);
  const ready = dataStatus === 'ready';

  return (
    <Screen>
      <ScrollView
        onAccessibilityEscape={onClose}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
      >
        <ScreenHeader
          title={country?.name ?? t('countries.details.notFound')}
          compact
        >
          <Button label={t('common.done')} variant="quiet" onPress={onClose} />
        </ScreenHeader>
        <DataFeedback />
        {country ? (
          <>
            {ready && (
              <View
                accessible
                accessibilityRole="image"
                accessibilityLanguage={language}
                accessibilityLabel={t('stamps.artworkLabel', {
                  country: country.name,
                  status: t(
                    collected ? 'stamps.collected' : 'stamps.notCollected',
                  ),
                })}
                style={styles.art}
              >
                <View style={styles.stampArtwork}>
                  <CountryStamp
                    country={country}
                    collected={collected}
                    size="100%"
                  />
                </View>
              </View>
            )}
            <Button
              label={t('sharing.stampAction')}
              variant="quiet"
              disabled={!ready || busy}
              onPress={onShare}
            />
          </>
        ) : (
          <AppText tone="muted">{t('countries.details.notInCatalog')}</AppText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: theme.space.lg, paddingBottom: theme.space.xl },
  art: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  stampArtwork: { width: '100%', aspectRatio: 1 },
});
