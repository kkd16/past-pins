import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { countries } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { formatNumber, t } from '../localization';
import { theme } from '../theme';
import { CountryStamp } from './CountryStamp';
import { selectStampCountries } from './collection';

export function StampCollectionLink({ onPress }: { onPress: () => void }) {
  const app = useAppData();
  const { fontScale } = useWindowDimensions();
  const collected = selectStampCountries(app.data.places, '', 'collected');
  const ready = app.status === 'ready';
  const unavailableMessage = t(
    app.status === 'load-error'
      ? 'countries.loadError'
      : 'countries.loadingPlaces',
  );
  const count = t('stamps.count', {
    count: collected.length,
    amount: formatNumber(collected.length),
  });
  return (
    <AppPressable
      style={styles.card}
      disabled={!ready}
      onPress={onPress}
      accessibilityLabel={
        ready
          ? t('stamps.collectionLabel', {
              collected: formatNumber(collected.length),
              total: formatNumber(countries.length),
            })
          : unavailableMessage
      }
      accessibilityHint={t('stamps.openCollection')}
    >
      <View style={styles.heading}>
        <AppText variant="heading" style={styles.grow}>
          {t('stamps.title')}
        </AppText>
        <Icon name="chevronRight" />
      </View>
      {ready &&
        collected.length > 0 &&
        fontScale <= theme.accessibility.largeTextScale && (
          <View style={styles.preview}>
            {collected.slice(0, 3).map((country) => (
              <CountryStamp
                key={country.id}
                country={country}
                collected
                size={72}
              />
            ))}
          </View>
        )}
      <AppText tone={collected.length ? 'accent' : 'muted'}>
        {ready ? count : unavailableMessage}
      </AppText>
      <AppText variant="caption" tone="muted">
        {t('stamps.description')}
      </AppText>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...theme.surface.panel,
    backgroundColor: theme.color.surfaceWarm,
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  grow: { flex: 1 },
  preview: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
});
