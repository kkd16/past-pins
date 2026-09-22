import { memo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { theme } from '../../theme';
import { countryById, worldMap } from './catalog';
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

export function WorldMap({
  visitedIds,
  selectedId,
  onSelect,
  onVisitedChange,
  disabled,
  compact,
}: {
  visitedIds: ReadonlySet<CountryId>;
  selectedId: CountryId | null;
  onSelect: (id: CountryId | null) => void;
  onVisitedChange: (id: CountryId, visited: boolean) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const height = compact ? 108 : Math.min((width * mapHeight) / mapWidth, 300);
  const artWidth = Math.min(width, (height * mapWidth) / mapHeight);
  const selected = selectedId ? countryById.get(selectedId) : undefined;
  const selectedVisited = !!selectedId && visitedIds.has(selectedId);

  return (
    <View style={styles.card}>
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
            <View
              style={{
                width,
                height,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
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
          <Pressable
            accessibilityRole="button"
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
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          >
            <Icon name="reset" size={17} />
          </Pressable>
        )}
      </View>
      {!compact &&
        (selected ? (
          <View style={styles.callout}>
            <AppText variant="label" style={styles.countryName}>
              {selected.name}
            </AppText>
            <Button
              label={selectedVisited ? 'Remove visit' : 'Mark visited'}
              variant={selectedVisited ? 'quiet' : 'primary'}
              disabled={disabled}
              onPress={() => onVisitedChange(selected.id, !selectedVisited)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close country details"
              onPress={() => onSelect(null)}
              style={styles.close}
            >
              <Icon name="close" size={16} />
            </Pressable>
          </View>
        ) : (
          <View
            style={styles.hint}
            accessible
            accessibilityLabel={`World map. ${visitedIds.size} places visited. Use the checklist below to mark places.`}
          >
            <View style={styles.dot} />
            <AppText variant="caption" tone="muted">
              Pinch to explore · Tap a place
            </AppText>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  viewport: { overflow: 'hidden' },
  reset: {
    position: 'absolute',
    right: theme.space.xs,
    top: theme.space.xs,
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  pressed: { opacity: theme.opacity.pressed },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  callout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingLeft: theme.space.lg,
    paddingRight: theme.space.xs,
    paddingVertical: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
  },
  countryName: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 100,
    marginRight: theme.space.sm,
  },
  close: {
    minWidth: theme.size.touch,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
