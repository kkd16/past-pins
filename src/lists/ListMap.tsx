import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { flatCountries, flatMarkers, mapSize } from '../atlas/geography';
import { AppText } from '../components/AppText';
import { t } from '../localization';
import { theme } from '../theme';
import type { ListPlace } from './places';

/** The rows below the map provide the precise, accessible list of places. */
export const ListMap = memo(function ListMap({
  places,
}: {
  places: readonly ListPlace[];
}) {
  const countries = new Set<string>();
  const regionCountries = new Set<string>();
  for (const place of places)
    (place.kind === 'country' ? countries : regionCountries).add(
      place.countryId,
    );
  for (const id of countries) regionCountries.delete(id);

  if (!countries.size && !regionCountries.size) return null;

  return (
    <View style={styles.container}>
      <View style={styles.map} accessible={false} accessibilityElementsHidden>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
          accessible={false}
          accessibilityElementsHidden
        >
          {flatCountries.map(({ id, path }) => {
            const included = countries.has(id);
            const outlined = regionCountries.has(id);
            return (
              <Path
                key={id}
                d={path}
                fill={included ? theme.color.accent : theme.color.border}
                stroke={outlined ? theme.color.accent : theme.globe.border}
                strokeWidth={outlined ? 1.5 : 0.4}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {flatMarkers
            .filter(({ id }) => countries.has(id) || regionCountries.has(id))
            .map(({ id, point }) => (
              <Circle
                key={id}
                cx={point[0]}
                cy={point[1]}
                r={6}
                fill={
                  countries.has(id) ? theme.color.accent : theme.globe.ocean
                }
                stroke={theme.color.accent}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </Svg>
      </View>
      <View style={styles.legend}>
        {countries.size > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.filled]} />
            <AppText variant="caption" tone="muted" style={styles.legendText}>
              {t('lists.mapCountries')}
            </AppText>
          </View>
        )}
        {regionCountries.size > 0 && (
          <View style={styles.legendItem}>
            <View style={styles.swatch} />
            <AppText variant="caption" tone="muted" style={styles.legendText}>
              {t('lists.mapRegions')}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: theme.space.sm },
  map: {
    ...theme.surface.panel,
    aspectRatio: 2,
    maxHeight: 260,
    width: '100%',
    overflow: 'hidden',
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.border,
    // Geographic coordinates never mirror with the surrounding layout.
    direction: 'ltr',
  },
  legend: { gap: theme.space.xs, paddingHorizontal: theme.space.xs },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: theme.stroke.control,
    borderColor: theme.color.accent,
  },
  filled: { backgroundColor: theme.color.accent },
  legendText: { flex: 1 },
});
