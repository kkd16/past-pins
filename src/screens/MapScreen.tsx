import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
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
import { Button } from '../components/Button';
import { countryById } from '../countries/catalog';
import { useAppData } from '../data/AppDataProvider';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import { getCurrentCountry, getCurrentLocation } from '../location/current-location';
import { useActionGuard } from '../navigation/useActionGuard';
import { GlobeCamera } from '../globe/camera';
import { GlobeViewport } from '../globe/GlobeViewport';
import { theme } from '../theme';
import { getCountrySubdivisions } from '../subdivisions/catalog';

export function MapScreen({
  onSelect,
  onOpenCountries,
  onOpenRegions,
  onSearch,
  onShare,
  focus,
  focusRequest,
  onFocusConsumed,
}: {
  onSelect: (id: string) => void;
  onOpenCountries: () => void;
  onOpenRegions: (countryId: string) => void;
  onSearch: () => void;
  onShare: () => void;
  focus?: string;
  focusRequest?: string;
  onFocusConsumed: () => void;
}) {
  const app = useAppData();
  const { data } = app;
  const ready = app.status === 'ready';
  const mode = data.preferences.mapView;
  // Reuse each renderer after its first visit; inactive views do no frame work.
  const [loaded, setLoaded] = useState({ globe: false, map: false });
  if (ready && !loaded[mode]) setLoaded({ ...loaded, [mode]: true });
  const [locating, setLocating] = useState(false);
  const [globe] = useState(() => new GlobeCamera());
  const [flat] = useState(() => new FlatCamera());
  const [selection, setSelection] = useState<{
    id: string;
    anchor: readonly number[] | null;
  } | null>(null);
  const [localCommand, setCommand] = useState<AtlasCommand | null>(null);
  const sequence = useRef(0);
  const guard = useActionGuard(app.resetVersion);
  const [topHeight, setTopHeight] = useState(108);
  const [bottomHeight, setBottomHeight] = useState(120);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > theme.accessibility.largeTextScale;
  const screenReader = useScreenReaderEnabled();
  const dockSelection = largeText || screenReader;
  async function focusLocation() {
    if (locating) return;
    const isCurrentScreen = guard();
    const request = ++sequence.current;
    const isCurrent = () =>
      isCurrentScreen() &&
      request === sequence.current &&
      AppState.currentState !== 'background';
    setLocating(true);
    try {
      const point = await getCurrentLocation();
      if (!isCurrent()) return;
      setSelection(null);
      setCommand({ type: 'location', point, key: request });
      const country = await getCurrentCountry(point);
      if (isCurrent() && country)
        setSelection({ id: country.id, anchor: point });
    } catch (error) {
      if (isCurrent())
        Alert.alert(
          t('location.unavailableTitle'),
          error instanceof UserFacingError
            ? error.message
            : t('location.unavailableMessage'),
        );
    } finally {
      setLocating(false);
    }
  }
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
        ++sequence.current;
        setCommand(null);
        setSelection({ id: incomingFocus.id, anchor: null });
        onFocusConsumed();
      } else setCommand((current) => (current?.key === key ? null : current));
    },
    [incomingFocus, onFocusConsumed],
  );
  const selectCountry = useCallback(
    (id: string | null, anchor?: readonly number[]) => {
      ++sequence.current;
      setSelection(id ? { id, anchor: anchor ?? null } : null);
    },
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
      {ready && loaded.globe && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { opacity: mode === 'globe' ? 1 : 0 },
          ]}
          pointerEvents={mode === 'globe' ? 'auto' : 'none'}
          accessibilityElementsHidden={mode !== 'globe'}
        >
          <GlobeViewport
            {...viewport}
            camera={globe}
            active={mode === 'globe'}
          />
        </View>
      )}
      {ready && loaded.map && (
        <View
          style={[StyleSheet.absoluteFill, { opacity: mode === 'map' ? 1 : 0 }]}
          pointerEvents={mode === 'map' ? 'auto' : 'none'}
          accessibilityElementsHidden={mode !== 'map'}
        >
          <WorldMapViewport
            {...viewport}
            camera={flat}
            active={mode === 'map'}
          />
        </View>
      )}
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
          <MapToolbar
            mode={mode}
            largeText={largeText}
            disabled={!ready || app.busy}
            onChangeMode={(mapView) => app.updatePreferences({ mapView })}
            onSearch={onSearch}
            onShare={onShare}
            onLocation={focusLocation}
            locating={locating}
            onNorth={() =>
              setCommand({ type: 'north', key: ++sequence.current })
            }
            onReset={() =>
              setCommand({ type: 'reset', key: ++sequence.current })
            }
          />
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
          contentContainerStyle={styles.footer}
        >
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
          {ready &&
            selectedId &&
            getCountrySubdivisions(selectedId).length > 0 && (
              <Button
                label={t('places.countryRegions', {
                  country: countryById.get(selectedId)!.name,
                })}
                variant="quiet"
                onPress={() => onOpenRegions(selectedId)}
              />
            )}
          {ready && data.preferences.mapSummary && (
            <MapSummary
              places={data.places}
              mode={mode}
              screenReader={screenReader}
              onOpenCountries={onOpenCountries}
            />
          )}
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
  footer: { gap: theme.space.sm },
});
