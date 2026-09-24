import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '../components/AppText';
import { Icon } from '../components/Icon';
import { countryById } from '../countries/catalog';
import { getStatusPresentation } from '../countries/status';
import { theme } from '../theme';
import { calloutRect, inBounds, placeLabels } from './annotations';
import { countryAnchors, labelCandidates } from './geography';
import type { AtlasViewportProps } from './types';

export function AtlasAnnotations({
  selectedId,
  selectedAnchor,
  homeCountryId,
  places,
  labels,
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
  const measurementKey = `${selectedId}:${width}:${height}:${fontScale}:${selectedId ? places[selectedId] : ''}:${homeCountryId}`;
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
  const callout = calloutRect(point, size, bounds);
  const status = country
    ? getStatusPresentation(places[country.id], country.id === homeCountryId)
    : null;
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
          callout,
        )
      : [];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {homeCountryId &&
        homeCountryId !== selectedId &&
        homePoint &&
        inBounds(homePoint, bounds) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Current home: ${countryById.get(homeCountryId)?.name}. Select country.`}
            hitSlop={8}
            onPress={() => propsSelect(homeCountryId, homeAnchor!)}
            style={[
              styles.home,
              { left: homePoint[0] - 14, top: homePoint[1] - 14 },
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
            { left: label.x, top: label.y, width: label.width },
          ]}
        >
          <AppText variant="caption" numberOfLines={1} style={styles.labelText}>
            {label.name}
          </AppText>
        </View>
      ))}
      {country && status && callout && point && (
        <>
          <View
            pointerEvents="none"
            style={[styles.pin, { left: point[0] - 4, top: point[1] - 4 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${country.name}. ${status.label}. Open country details.`}
            onPress={() => onDetails(country.id)}
            onLayout={({ nativeEvent: { layout } }) =>
              setMeasurement((current) =>
                current.key === measurementKey &&
                current.height === layout.height
                  ? current
                  : { key: measurementKey, height: layout.height },
              )
            }
            style={({ pressed }) => [
              styles.callout,
              { left: callout.x, top: callout.y, width: size.width },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.content}>
              <AppText variant="label">{country.name}</AppText>
              <View style={styles.status}>
                <Icon
                  name={status.icon}
                  color={status.color}
                  size={theme.size.iconSmall}
                />
                <AppText
                  variant="caption"
                  style={{ color: status.color, flexShrink: 1 }}
                >
                  {status.label}
                </AppText>
              </View>
            </View>
            <Icon name="chevronRight" />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  callout: {
    ...theme.surface.floating,
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    padding: theme.space.md,
    borderWidth: theme.stroke.subtle,
    borderColor: theme.color.controlBorder,
  },
  content: { flex: 1, gap: theme.space.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
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
  pressed: { opacity: theme.opacity.pressed },
});
