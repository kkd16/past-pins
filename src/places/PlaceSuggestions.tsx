import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { t } from '../localization';
import { theme } from '../theme';
import type { Place } from './catalog';

export function PlaceSuggestions({ places, renderPlace }: { places: readonly Place[]; renderPlace: (place: Place) => ReactNode }) {
  if (!places.length) return null;
  return <View style={styles.section}>
    <AppText variant="label" tone="muted" accessibilityRole="header">{t('places.similarNames')}</AppText>
    {places.map((place) => <View key={place.id}>{renderPlace(place)}</View>)}
  </View>;
}

const styles = StyleSheet.create({ section: { gap: theme.space.sm, paddingVertical: theme.space.md } });
