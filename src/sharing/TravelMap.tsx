import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { flatCountries, flatMarkers, mapSize } from '../atlas/geography';
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
        {flatCountries.map(({ id, path }) => (
          <Path
            key={id}
            d={path}
            fill={fill(id)}
            stroke={theme.globe.ocean}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {flatMarkers
          .filter(({ id }) => places[id])
          .map(({ id, point }) => (
            <Circle
              key={id}
              cx={point[0]}
              cy={point[1]}
              r={6}
              fill={fill(id)}
              stroke={theme.globe.ocean}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
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
