import { useCallback, useMemo, useRef, useState } from 'react';
import { router, useIsFocused } from 'expo-router';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlatCamera } from '../atlas/FlatCamera';
import { MapSummary } from '../atlas/MapSummary';
import { MapToolbar } from '../atlas/MapToolbar';
import type { AtlasCommand } from '../atlas/types';
import { useScreenReaderEnabled } from '../accessibility/useScreenReaderEnabled';
import { WorldMapViewport } from '../atlas/WorldMapViewport';
import { DataFeedback } from '../components/DataFeedback';
import { countryById } from '../countries/catalog';
import { CountryMapSheet } from '../countries/CountryMapSheet';
import { appData as app } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { UserFacingError } from '../data/errors';
import { t } from '../localization';
import {
  getCurrentCountry,
  getCurrentLocation,
} from '../location/current-location';
import { useActionGuard } from '../navigation/useActionGuard';
import { GlobeCamera } from '../globe/camera';
import { GlobeViewport } from '../globe/GlobeViewport';
import { getStaticPlace, getPlaceSubtitle, type Place } from '../places/catalog';
import { PlaceFeedback } from '../places/PlaceFeedback';
import { PlaceSelectionCard } from '../places/PlaceSelectionCard';
import { usePlaces } from '../places/usePlaces';
import { theme } from '../theme';

export function MapScreen({
  onOpenCountries,
  onSearch,
  onShare,
  focus,
  focusRequest,
  onFocusConsumed,
}: {
  onOpenCountries: () => void;
  onSearch: () => void;
  onShare: () => void;
  focus?: string;
  focusRequest?: string;
  onFocusConsumed: () => void;
}) {
  const places = useAppData((snapshot) => snapshot.data.places);
  const homeCountryId = useAppData((snapshot) => snapshot.data.homeCountryId);
  const preferences = useAppData((snapshot) => snapshot.data.preferences);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const focused = useIsFocused();
  const ready = dataStatus === 'ready';
  const mode = preferences.mapView;
  const [loaded, setLoaded] = useState({ globe: false, map: false });
  if (ready && !loaded[mode]) setLoaded({ ...loaded, [mode]: true });
  const [locating, setLocating] = useState(false);
  const [globe] = useState(() => new GlobeCamera());
  const [flat] = useState(() => new FlatCamera());
  const [selection, setSelection] = useState<{
    place: Place;
    anchor: readonly number[] | null;
  } | null>(null);
  const [localCommand, setCommand] = useState<AtlasCommand | null>(null);
  const sequence = useRef(0);
  const guard = useActionGuard(resetVersion);
  const [topHeight, setTopHeight] = useState(108);
  const [bottomHeight, setBottomHeight] = useState(120);
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const screenReader = useScreenReaderEnabled();
  const focusIds = useMemo(() => (focus && ready ? [focus] : []), [focus, ready]);
  const focusPlaces = usePlaces(focusIds);
  async function focusLocation() {
    if (locating) return;
    if (focus) onFocusConsumed();
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
      const place = country ? getStaticPlace(country.id) : undefined;
      if (isCurrent() && place) setSelection({ place, anchor: point });
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
    () => {
      const place =
        focus && ready
          ? focusPlaces.places.find(({ id }) => id === focus)
          : undefined;
      if (!place || place.kind === 'region') return null;
      const key = `navigation:${focusRequest ?? focus}`;
      const anchor = place.kind === 'city' ? place.coordinates : null;
      const command: AtlasCommand = anchor
        ? { type: 'location', point: anchor, key }
        : { type: 'focus', id: place.id, key };
      return { place, anchor, command, key };
    },
    [focus, focusRequest, ready, focusPlaces.places],
  );
  const command = incomingFocus?.command ?? localCommand;
  const focusPending = focusPlaces.loading || focusPlaces.error;
  const selectedPlace =
    incomingFocus?.place ?? (focusPending ? null : selection?.place);
  const selectedId = selectedPlace?.id ?? null;
  const selectedCountry = selectedId ? countryById.get(selectedId) : undefined;
  const selectedCity = selectedPlace?.kind === 'city' ? selectedPlace : undefined;

  const commandApplied = useCallback(
    (key: string | number) => {
      if (incomingFocus?.command.key === key) {
        ++sequence.current;
        setCommand(null);
        setSelection({
          place: incomingFocus.place,
          anchor: incomingFocus.anchor,
        });
        onFocusConsumed();
      } else setCommand((current) => (current?.key === key ? null : current));
    },
    [incomingFocus, onFocusConsumed],
  );
  const selectCountry = useCallback(
    (id: string | null, anchor?: readonly number[]) => {
      ++sequence.current;
      if (focus) onFocusConsumed();
      const place = id ? getStaticPlace(id) : undefined;
      setSelection(place ? { place, anchor: anchor ?? null } : null);
    },
    [focus, onFocusConsumed],
  );
  function move(type: 'north' | 'reset') {
    if (focus) onFocusConsumed();
    setCommand({ type, key: ++sequence.current });
  }
  const viewport = {
    places,
    homeCountryId,
    selectedId,
    selectedAnchor: incomingFocus
      ? incomingFocus.anchor
      : selection?.anchor ?? null,
    labels: preferences.countryLabels,
    command,
    topInset: insets.top + topHeight + theme.space.md,
    bottomInset: insets.bottom + bottomHeight + theme.space.md,
    onSelect: selectCountry,
    onCommandApplied: commandApplied,
  };

  return (
    <View
      style={styles.screen}
      onLayout={({ nativeEvent: { layout } }) => setHeight(layout.height)}
    >
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
            active={focused && mode === 'globe'}
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
            active={focused && mode === 'map'}
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
            disabled={!ready || busy}
            onChangeMode={(mapView) => {
              if (mapView === mode) return;
              app.updatePreferences({ mapView });
              if (selectedCity)
                setCommand({
                  type: 'location',
                  point: selectedCity.coordinates,
                  key: ++sequence.current,
                });
            }}
            onSearch={onSearch}
            onShare={onShare}
            onLocation={focusLocation}
            locating={locating}
            onNorth={() => move('north')}
            onReset={() => move('reset')}
          />
        </ScrollView>
      </View>
      {!selectedCountry && (
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
            <DataFeedback />
            <PlaceFeedback
              loading={focusPlaces.loading}
              error={focusPlaces.error}
              onRetry={focusPlaces.retry}
            />
            {ready && selectedCity ? (
              <PlaceSelectionCard
                key={`${selectedCity.id}:${resetVersion}`}
                title={selectedCity.name}
                subtitle={getPlaceSubtitle(selectedCity)}
                status={places[selectedCity.id] ?? 'unvisited'}
                disabled={busy}
                autofocus={focused && screenReader}
                onChangeStatus={(status) => {
                  void app.setStatus([selectedCity.id], status, {
                    preserveLived: false,
                    isCurrent: guard(),
                  });
                }}
                onSaveToLists={() =>
                  router.push({
                    pathname: '/lists/add',
                    params: { placeId: selectedCity.id },
                  })
                }
                onDismiss={() => selectCountry(null)}
              />
            ) : ready && preferences.mapSummary && (
              <MapSummary
                places={places}
                onOpenCountries={onOpenCountries}
              />
            )}
          </ScrollView>
        </View>
      )}
      {ready && selectedCountry && height > 0 && (
        <CountryMapSheet
          key={`${selectedCountry.id}:${resetVersion}`}
          id={selectedCountry.id}
          containerHeight={height}
          topInset={insets.top + theme.space.sm}
          bottomInset={insets.bottom + theme.space.sm}
          autofocus={focused && screenReader}
          focusRequest={incomingFocus?.key}
          onDismiss={() => selectCountry(null)}
          onPreviewHeightChange={setBottomHeight}
        />
      )}
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
    maxHeight: '40%',
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
