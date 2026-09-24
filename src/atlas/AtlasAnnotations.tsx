import { useState } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { countryById } from '../countries/catalog';
import { language, t } from '../localization';
import { theme } from '../theme';
import { calloutRect, inBounds, placeLabels } from './annotations';
import { CountryCallout } from './CountryCallout';
import { countryAnchors, labelCandidates } from './geography';
import type { AtlasViewportProps } from './types';

const homeSize = 28;

export function AtlasAnnotations({
  selectedId,
  selectedAnchor,
  homeCountryId,
  places,
  labels,
  dockSelection,
  onSelect: propsSelect,
  onDetails,
  topInset,
  bottomInset,
  project,
  width,
  height,
  zoom,
}: AtlasViewportProps & {
  project: (point: readonly number[]) => number[] | null;
  width: number;
  height: number;
  zoom: number;
}) {
  const { fontScale } = useWindowDimensions();
  const measurementKey = `${selectedId}:${width}:${fontScale}:${selectedId ? places[selectedId] : ''}:${selectedId === homeCountryId}`;
  const [measurement, setMeasurement] = useState<{
    key: string;
    height: number;
  }>({
    key: '',
    height: theme.size.touch,
  });
  const size = {
    width: Math.min(260, Math.max(1, width - 16)),
    height:
      measurement.key === measurementKey
        ? measurement.height
        : theme.size.touch,
  };
  const bounds = { width, height, top: topInset, bottom: bottomInset };
  const country = selectedId ? countryById.get(selectedId) : null;
  const anchor =
    selectedAnchor ??
    (selectedId ? countryAnchors.get(selectedId)?.anchor : null);
  const point = anchor ? project(anchor) : null;
  const homeAnchor = homeCountryId
    ? countryAnchors.get(homeCountryId)?.anchor
    : null;
  const homePoint = homeAnchor ? project(homeAnchor) : null;
  const homeMarker =
    homeCountryId !== selectedId && homePoint && inBounds(homePoint, bounds)
      ? {
          x: homePoint[0] - homeSize / 2,
          y: homePoint[1] - homeSize / 2,
          width: homeSize,
          height: homeSize,
        }
      : null;
  const callout = dockSelection ? null : calloutRect(point, size, bounds);
  const start = (x: number, itemWidth: number) =>
    I18nManager.isRTL ? width - x - itemWidth : x;
  const names =
    labels && zoom >= 1.6 && fontScale <= theme.accessibility.largeTextScale
      ? placeLabels(
          labelCandidates
            .filter(
              ({ id, area }) =>
                id !== selectedId &&
                id !== homeCountryId &&
                area * zoom * zoom > 0.008,
            )
            .map(({ id, anchor }) => ({
              id,
              name: countryById.get(id)!.name,
              point: project(anchor),
            })),
          bounds,
          [callout, homeMarker].filter((rect) => rect !== null),
        )
      : [];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {homeCountryId && homeMarker && (
        <Pressable
          accessibilityRole="button"
          accessibilityLanguage={language}
          accessibilityLabel={t('atlas.homeCountry', {
            country: countryById.get(homeCountryId)?.name ?? homeCountryId,
          })}
          accessibilityHint={t('atlas.selectCountry')}
          hitSlop={8}
          onPress={() => propsSelect(homeCountryId, homeAnchor!)}
          style={[
            styles.home,
            { start: start(homeMarker.x, homeSize), top: homeMarker.y },
          ]}
        >
          <Icon
            name="home"
            color={theme.color.lived}
            size={theme.size.iconSmall}
          />
        </Pressable>
      )}
      {names.map((label) => (
        <View
          key={label.id}
          pointerEvents="none"
          accessibilityElementsHidden
          style={[
            styles.label,
            {
              start: start(label.x, label.width),
              top: label.y,
              width: label.width,
            },
          ]}
        >
          <AppText variant="caption" numberOfLines={1} style={styles.labelText}>
            {label.name}
          </AppText>
        </View>
      ))}
      {country && callout && point && (
        <>
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={[
              styles.pin,
              { start: start(point[0] - 4, 8), top: point[1] - 4 },
            ]}
          />
          <CountryCallout
            key={measurementKey}
            countryId={country.id}
            status={places[country.id]}
            home={country.id === homeCountryId}
            onDetails={onDetails}
            onDismiss={() => propsSelect(null)}
            onLayout={({ nativeEvent: { layout } }) =>
              setMeasurement((current) =>
                current.key === measurementKey &&
                current.height === layout.height
                  ? current
                  : { key: measurementKey, height: layout.height },
              )
            }
            style={{
              position: 'absolute',
              start: start(callout.x, size.width),
              top: callout.y,
              width: size.width,
              ...(measurement.key !== measurementKey && { opacity: 0 }),
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    position: 'absolute',
    width: homeSize,
    height: homeSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  pin: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.globe.selected,
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.background,
    paddingHorizontal: theme.space.xs,
  },
  labelText: { fontSize: 11 },
});
