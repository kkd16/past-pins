import { memo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { IconButton } from '../components/IconButton';
import { theme } from '../theme';
import { worldMap } from './catalog';
import type { Country, CountryId } from './types';

const [, , mapWidth, mapHeight] = worldMap.viewBox.split(' ').map(Number);

const CountryShape = memo(function CountryShape({
  country,
  visited,
  selected,
  onSelect,
}: {
  country: Country;
  visited: boolean;
  selected: boolean;
  onSelect: (id: CountryId) => void;
}) {
  return (
    <Path
      d={country.path}
      fill={visited ? theme.color.accent : theme.color.land}
      stroke={selected ? theme.color.text : theme.color.background}
      strokeWidth={selected ? 1.8 : 0.45}
      vectorEffect="non-scaling-stroke"
      onPress={() => onSelect(country.id)}
    />
  );
});

export function WorldMapViewport({
  visitedIds,
  selectedId,
  onSelect,
  compact,
}: {
  visitedIds: ReadonlySet<CountryId>;
  selectedId: CountryId | null;
  onSelect: (id: CountryId) => void;
  compact: boolean;
}) {
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const height = compact ? 108 : Math.min((width * mapHeight) / mapWidth, 300);
  const artWidth = Math.min(width, (height * mapWidth) / mapHeight);

  return (
    <View
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={[styles.viewport, { height }]}
    >
      {width > 0 && (
        <ScrollView
          key={`${width}-${height}`}
          ref={scroll}
          minimumZoomScale={1}
          maximumZoomScale={12}
          bouncesZoom={false}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollsToTop={false}
          accessibilityElementsHidden
        >
          <View style={[styles.art, { width, height }]}>
            <Svg
              width={artWidth}
              height={(artWidth * mapHeight) / mapWidth}
              viewBox={worldMap.viewBox}
              accessible={false}
            >
              {worldMap.locations.map((country) => (
                <CountryShape
                  key={country.id}
                  country={country}
                  visited={visitedIds.has(country.id)}
                  selected={country.id === selectedId}
                  onSelect={onSelect}
                />
              ))}
            </Svg>
          </View>
        </ScrollView>
      )}
      {!compact && (
        <IconButton
          name="reset"
          size={17}
          accessibilityLabel="Reset map zoom"
          onPress={() =>
            scroll.current?.scrollResponderZoomTo({
              x: 0,
              y: 0,
              width,
              height,
              animated: true,
            })
          }
          style={styles.reset}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  art: { justifyContent: 'center', alignItems: 'center' },
  reset: {
    position: 'absolute',
    right: theme.space.xs,
    top: theme.space.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
});
