import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatCamera } from '../atlas/FlatCamera';
import { CountryCallout } from '../atlas/CountryCallout';
import { MapSummary } from '../atlas/MapSummary';
import { MapToolbar } from '../atlas/MapToolbar';
import type { AtlasCommand } from '../atlas/types';
import { useScreenReaderEnabled } from '../accessibility/useScreenReaderEnabled';
import { WorldMapViewport } from '../atlas/WorldMapViewport';
import { DataFeedback } from '../components/DataFeedback';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { GlobeCamera } from '../globe/camera';
import { GlobeViewport } from '../globe/GlobeViewport';
import { theme } from '../theme';

export function MapScreen({
  onSelect,
  onOpenCountries,
  onSearch,
  focus,
  focusRequest,
  onFocusConsumed,
}: {
  onSelect: (id: string) => void;
  onOpenCountries: () => void;
  onSearch: () => void;
  focus?: string;
  focusRequest?: string;
  onFocusConsumed: () => void;
}) {
  const app = useAppData();
  const { data } = app;
  const ready = app.status === 'ready';
  const mode = data.preferences.mapView;
  const homeCountryId = data.homeCountryId;
  const [globe] = useState(() => new GlobeCamera());
  const [flat] = useState(() => new FlatCamera());
  const [selection, setSelection] = useState<{
    id: string;
    anchor: readonly number[] | null;
  } | null>(null);
  const [localCommand, setCommand] = useState<AtlasCommand | null>(null);
  const sequence = useRef(0);
  const [topHeight, setTopHeight] = useState(108);
  const [bottomHeight, setBottomHeight] = useState(120);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const screenReader = useScreenReaderEnabled();
  const dockSelection = largeText || screenReader;
  const focusCountry = useCallback((id: string) => {
    setSelection({ id, anchor: null });
    const key = ++sequence.current;
    setCommand({ type: 'focus', id, key });
  }, []);
  const incomingFocus = useMemo(
    () =>
      focus && ready && countryById.has(focus)
        ? {
            type: 'focus' as const,
            id: focus,
            key: `navigation:${focusRequest ?? focus}`,
          }
        : null,
    [focus, focusRequest, ready],
  );
  const command = incomingFocus ?? localCommand;
  const selectedId = incomingFocus?.id ?? selection?.id ?? null;
  const commandApplied = useCallback(
    (key: string | number) => {
      if (incomingFocus?.key === key) {
        setSelection({ id: incomingFocus.id, anchor: null });
        onFocusConsumed();
      } else setCommand((current) => (current?.key === key ? null : current));
    },
    [incomingFocus, onFocusConsumed],
  );
  const selectCountry = useCallback(
    (id: string | null, anchor?: readonly number[]) =>
      setSelection(id ? { id, anchor: anchor ?? null } : null),
    [],
  );
  const viewport = {
    places: data.places,
    homeCountryId: data.homeCountryId,
    selectedId,
    selectedAnchor: incomingFocus ? null : (selection?.anchor ?? null),
    labels: data.preferences.countryLabels,
    dockSelection,
    command,
    topInset: insets.top + topHeight + theme.space.md,
    bottomInset: insets.bottom + bottomHeight + theme.space.md,
    onSelect: selectCountry,
    onDetails: onSelect,
    onCommandApplied: commandApplied,
  };

  return (
    <View style={styles.screen}>
      {ready &&
        (mode === 'globe' ? (
          <GlobeViewport {...viewport} camera={globe} />
        ) : (
          <WorldMapViewport {...viewport} camera={flat} />
        ))}
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top + theme.space.sm }]}
      >
        <ScrollView
          style={styles.overlayScroll}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          onLayout={({ nativeEvent: { layout } }) =>
            setTopHeight(layout.height + theme.space.sm)
          }
        >
          <View style={styles.overlayContent}>
            <MapToolbar
              mode={mode}
              largeText={largeText}
              disabled={!ready || app.busy}
              onChangeMode={(mapView) => app.updatePreferences({ mapView })}
              onSearch={onSearch}
              onHome={homeCountryId ? () => focusCountry(homeCountryId) : undefined}
              onNorth={() => setCommand({ type: 'north', key: ++sequence.current })}
              onReset={() => setCommand({ type: 'reset', key: ++sequence.current })}
            />
          </View>
        </ScrollView>
      </View>
      <View
        pointerEvents="box-none"
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + theme.space.sm },
        ]}
      >
        <ScrollView
          style={styles.overlayScroll}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          onLayout={({ nativeEvent: { layout } }) =>
            setBottomHeight(layout.height + theme.space.sm)
          }
        >
          <View style={[styles.overlayContent, styles.footer]}>
            {ready && dockSelection && selectedId && (
              <CountryCallout
                key={selectedId}
                countryId={selectedId}
                status={data.places[selectedId]}
                home={data.homeCountryId === selectedId}
                onDetails={onSelect}
                onDismiss={() => selectCountry(null)}
                autofocus={screenReader}
              />
            )}
            <DataFeedback />
            {ready && data.preferences.mapSummary && (
              <MapSummary
                places={data.places}
                mode={mode}
                screenReader={screenReader}
                onOpenCountries={onOpenCountries}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    paddingHorizontal: theme.space.lg,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
    paddingHorizontal: theme.space.lg,
  },
  overlayScroll: { flexGrow: 0 },
  overlayContent: {
    maxWidth: theme.size.contentMax,
    width: '100%',
    alignSelf: 'center',
  },
  footer: { gap: theme.space.sm },
});
