import { memo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { IconButton } from '../components/IconButton';
import { theme } from '../theme';
import { worldMap } from './catalog';
import type { Country, CountryId } from './types';

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
}: {
  visitedIds: ReadonlySet<CountryId>;
  selectedId: CountryId | null;
  onSelect: (id: CountryId) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scroll = useRef<ScrollView>(null);
  const { width, height } = size;
  const artWidth = Math.min(width, (height * worldMap.width) / worldMap.height);
  const artHeight = (artWidth * worldMap.height) / worldMap.width;

  return (
    <View
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((previous) =>
          previous.width === layout.width && previous.height === layout.height
            ? previous
            : { width: layout.width, height: layout.height },
        )
      }
      style={styles.viewport}
    >
      {width > 0 && height > 0 && (
        <ScrollView
          key={`${width}-${height}`}
          ref={scroll}
          style={styles.viewport}
          minimumZoomScale={1}
          maximumZoomScale={12}
          bouncesZoom={false}
          centerContent
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollsToTop={false}
          accessibilityElementsHidden
        >
          <View
            style={{ width: artWidth, height: artHeight }}
            collapsable={false}
          >
            <Svg
              width={artWidth}
              height={artHeight}
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
      <IconButton
        name="reset"
        accessibilityLabel="Show whole world"
        onPress={() => {
          if (artWidth > 0)
            scroll.current?.scrollResponderZoomTo({
              x: 0,
              y: 0,
              width: artWidth,
              height: artHeight,
              animated: false,
            });
        }}
        style={styles.reset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  reset: {
    position: 'absolute',
    right: theme.space.lg,
    top: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
});
