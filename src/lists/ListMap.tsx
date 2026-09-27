import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { flatCountries, flatMarkers, mapSize } from '../atlas/geography';
import { MapMarker, MapPaths } from '../atlas/MapShapes';
import { AppText } from '../components/AppText';
import { t } from '../localization';
import type { Place } from '../places/catalog';
import { theme } from '../theme';
import { getListRegionPreview } from './map-preview';

export const ListMap = memo(function ListMap({
  places,
}: {
  places: readonly Place[];
}) {
  const regional = getListRegionPreview(places);
  const countries = new Set<string>();
  const regionCountries = new Set<string>();
  for (const place of places)
    (place.kind === 'country' ? countries : regionCountries).add(
      place.countryId,
    );
  for (const id of countries) regionCountries.delete(id);

  if (!countries.size && !regionCountries.size) return null;

  const shapes = regional?.regions ?? flatCountries;
  const selected = regional?.ids ?? countries;
  const borderWidth = regional ? 0.7 : 0.4;
  const markers =
    regional?.markers ??
    flatMarkers.filter(
      ({ id }) => countries.has(id) || regionCountries.has(id),
    );

  return (
    <View style={styles.container}>
      <View style={styles.map} accessible={false} accessibilityElementsHidden>
        <Svg
          width="100%"
          height="100%"
          viewBox={
            regional?.viewBox.join(' ') ??
            `0 0 ${mapSize.width} ${mapSize.height}`
          }
          accessible={false}
          accessibilityElementsHidden
        >
          <MapPaths
            shapes={shapes}
            fillRule={regional ? 'evenodd' : 'nonzero'}
            appearance={(id) => {
              const outlined = !regional && regionCountries.has(id);
              return {
                fill: selected.has(id) ? theme.color.accent : theme.color.border,
                stroke: outlined ? theme.color.accent : theme.globe.border,
                strokeWidth: outlined ? 1.5 : borderWidth,
              };
            }}
          />
          {markers.map(({ id, point }) => (
            <MapMarker
              key={id}
              cx={point[0]}
              cy={point[1]}
              r={regional?.markerRadius ?? 6}
              fill={selected.has(id) ? theme.color.accent : theme.globe.ocean}
              stroke={regional ? theme.globe.border : theme.color.accent}
              strokeWidth={regional ? 0.7 : 1}
            />
          ))}
        </Svg>
      </View>
      <View style={styles.legend}>
        {(regional || countries.size > 0) && (
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.filled]} />
            <AppText variant="caption" tone="muted" style={styles.legendText}>
              {regional
                ? t('lists.mapCountryRegions', {
                    country: regional.countryName,
                  })
                : t('lists.mapCountries')}
            </AppText>
          </View>
        )}
        {!regional && regionCountries.size > 0 && (
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
    width: '100%',
    overflow: 'hidden',
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.border,
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
