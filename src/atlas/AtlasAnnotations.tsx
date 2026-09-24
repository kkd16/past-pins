import {
  memo,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
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
import {
  annotationTranslation,
  calloutRect,
  inBounds,
  labelSize,
  placeLabels,
  projectLabels,
  type Rect,
} from './annotations';
import { CountryCallout } from './CountryCallout';
import { countryAnchors, labelCandidates } from './geography';
import type { AtlasViewportProps } from './types';

const homeSize = 28;

export type AtlasAnnotationsHandle = { draw: () => void };

export const AtlasAnnotations = memo(function AtlasAnnotations({
  ref,
  selectedId,
  selectedAnchor,
  homeCountryId,
  places,
  labels,
  dockSelection,
  onSelect,
  onDetails,
  topInset,
  bottomInset,
  project,
  width,
  height,
  camera,
}: Omit<AtlasViewportProps, 'active' | 'command' | 'onCommandApplied'> & {
  ref: Ref<AtlasAnnotationsHandle>;
  project: (point: readonly number[]) => number[] | null;
  width: number;
  height: number;
  camera: { zoom: number };
}) {
  const homeRef = useRef<View>(null);
  const pinRef = useRef<View>(null);
  const calloutRef = useRef<View>(null);
  const labelRefs = useRef(new Map<string, View>());
  const visibleLabels = useRef<string[]>([]);
  const { fontScale } = useWindowDimensions();
  const measurementKey = `${selectedId}:${width}:${fontScale}:${selectedId ? places[selectedId] : ''}:${selectedId === homeCountryId}`;
  const [measurement, setMeasurement] = useState<{
    key: string;
    height: number;
  }>({
    key: '',
    height: 0,
  });
  const size = {
    width: Math.min(260, Math.max(1, width - 16)),
    height: measurement.height,
  };
  const bounds = { width, height, top: topInset, bottom: bottomInset };
  const country = selectedId ? countryById.get(selectedId) : null;
  const anchor =
    selectedAnchor ??
    (selectedId ? countryAnchors.get(selectedId)?.anchor : null);
  const homeAnchor =
    homeCountryId && homeCountryId !== selectedId
      ? countryAnchors.get(homeCountryId)?.anchor
      : null;
  const names =
    labels && fontScale <= theme.accessibility.largeTextScale
      ? labelCandidates
          .filter(({ id }) => id !== selectedId && id !== homeCountryId)
          .map(({ id, area, anchor }) => ({
            id,
            area,
            anchor,
            name: countryById.get(id)!.name,
          }))
      : [];

  const draw = () => {
    const point = anchor ? project(anchor) : null;
    const homePoint = homeAnchor ? project(homeAnchor) : null;
    const home =
      homePoint && inBounds(homePoint, bounds)
        ? {
            x: homePoint[0] - homeSize / 2,
            y: homePoint[1] - homeSize / 2,
            width: homeSize,
            height: homeSize,
          }
        : null;
    const callout =
      dockSelection || measurement.key !== measurementKey
        ? null
        : calloutRect(point, size, bounds);
    // Keep label contents mounted, so newly visible countries appear during a
    // drag without React work. Only visible labels receive native frame updates.
    const position = (
      view: View | null | undefined,
      rect: Rect | null,
      interactive = false,
    ) => {
      const [translateX, translateY] = annotationTranslation(
        rect,
        width,
        I18nManager.isRTL,
      );
      view?.setNativeProps({
        style: {
          opacity: rect ? 1 : 0,
          transform: [{ translateX }, { translateY }],
        },
        pointerEvents: rect && interactive ? 'auto' : 'none',
        accessibilityElementsHidden: !rect || !interactive,
      });
    };
    position(homeRef.current, home, true);
    position(calloutRef.current, callout, true);
    position(
      pinRef.current,
      callout && point
        ? { x: point[0] - 4, y: point[1] - 4, width: 8, height: 8 }
        : null,
    );
    const visible = placeLabels(
      projectLabels(names, project, camera.zoom),
      bounds,
      [callout, home].filter((rect) => rect !== null),
      fontScale,
    );
    for (const id of visibleLabels.current)
      if (!visible.some((label) => label.id === id))
        position(labelRefs.current.get(id), null);
    for (const label of visible)
      position(labelRefs.current.get(label.id), label);
    visibleLabels.current = visible.map(({ id }) => id);
  };
  useImperativeHandle(ref, () => ({ draw }));
  useLayoutEffect(draw);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {homeCountryId && homeAnchor && (
        <Pressable
          ref={homeRef}
          accessibilityRole="button"
          accessibilityLanguage={language}
          accessibilityLabel={t('atlas.homeCountry', {
            country: countryById.get(homeCountryId)?.name ?? homeCountryId,
          })}
          accessibilityHint={t('atlas.selectCountry')}
          hitSlop={8}
          onPress={() => onSelect(homeCountryId, homeAnchor)}
          style={[styles.positioned, styles.home]}
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
          ref={(view) => {
            if (view) labelRefs.current.set(label.id, view);
            else labelRefs.current.delete(label.id);
          }}
          pointerEvents="none"
          accessibilityElementsHidden
          style={[
            styles.positioned,
            styles.label,
            { width: labelSize(label.name, fontScale).width },
          ]}
        >
          <AppText variant="caption" numberOfLines={1} style={styles.labelText}>
            {label.name}
          </AppText>
        </View>
      ))}
      {country && !dockSelection && (
        <>
          <View
            ref={pinRef}
            pointerEvents="none"
            accessibilityElementsHidden
            style={[styles.positioned, styles.pin]}
          />
          <View
            ref={calloutRef}
            collapsable={false}
            pointerEvents="none"
            accessibilityElementsHidden
            style={[styles.positioned, { width: size.width }]}
          >
            <CountryCallout
              key={measurementKey}
              countryId={country.id}
              status={places[country.id]}
              home={country.id === homeCountryId}
              onDetails={onDetails}
              onDismiss={() => onSelect(null)}
              onLayout={({ nativeEvent: { layout } }) =>
                setMeasurement((current) =>
                  current.key === measurementKey &&
                  current.height === layout.height
                    ? current
                    : { key: measurementKey, height: layout.height },
                )
              }
            />
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  positioned: { position: 'absolute', start: 0, top: 0, opacity: 0 },
  home: {
    width: homeSize,
    height: homeSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surface,
  },
  pin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.globe.selected,
  },
  label: {
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.background,
    paddingHorizontal: theme.space.xs,
  },
  labelText: { fontSize: 11 },
});
