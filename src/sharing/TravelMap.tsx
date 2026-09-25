import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import { flatCountries, flatMarkers, mapSize } from '../atlas/geography';
import { MapMarker, MapPaths } from '../atlas/MapShapes';
import type { AppData } from '../data/model';
import { language } from '../localization';
import { theme } from '../theme';

export function TravelMap({
  places,
  accessibilityLabel,
}: {
  places: AppData['places'];
  accessibilityLabel: string;
}) {
  const fill = (id: string) => {
    const status = places[id];
    return status ? theme.globe[status] : theme.color.border;
  };
  return (
    <View
      style={styles.map}
      accessible
      accessibilityRole="image"
      accessibilityLanguage={language}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
        accessible={false}
        accessibilityElementsHidden
      >
        <MapPaths
          shapes={flatCountries}
          appearance={(id) => ({ fill: fill(id) })}
          stroke={theme.globe.ocean}
          strokeWidth={0.5}
        />
        {flatMarkers
          .filter(({ id }) => places[id])
          .map(({ id, point }) => (
            <MapMarker
              key={id}
              cx={point[0]}
              cy={point[1]}
              r={6}
              fill={fill(id)}
              stroke={theme.globe.ocean}
              strokeWidth={0.5}
            />
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    aspectRatio: 2,
    backgroundColor: theme.globe.ocean,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    direction: 'ltr',
  },
});
