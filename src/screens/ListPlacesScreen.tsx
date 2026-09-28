import { Stack } from 'expo-router';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  View,
} from 'react-native';

import { AppPressable } from '../components/AppPressable';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Checkmark } from '../components/Checkmark';
import { DataFeedback } from '../components/DataFeedback';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import type { TravelList } from '../data/model';
import { formatNumber, t } from '../localization';
import { getPlaceSubtitle, type Place } from '../places/catalog';
import { usePlaceSearch } from '../places/usePlaceSearch';
import { PlaceSearchFooter } from '../places/PlaceFeedback';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { getLocationFilters, locationParam, type PlaceLocation } from '../places/location';
import { PlaceFilterBar } from '../places/PlaceFilterBar';
import { PlaceSuggestions } from '../places/PlaceSuggestions';
import { theme } from '../theme';

type Props = {
  id: string;
  onDone: () => void;
  onCancel: () => void;
  mode: PlacesMode;
  location: PlaceLocation;
  onModeChange: (mode: PlacesMode) => void;
  onBrowseCountry: (id: string) => void;
  onOpenLocation: () => void;
};

export function ListPlacesScreen(props: Props) {
  const list = useAppData((snapshot) => snapshot.data.lists.find(({ id }) => id === props.id));
  const status = useAppData((snapshot) => snapshot.status);
  if (list && status === 'ready')
    return <ListPlacesEditor {...props} list={list} />;

  return (
    <Screen onAccessibilityEscape={props.onCancel}>
      <Stack.Screen
        options={{
          title: t('lists.editPlaces'),
          headerLeft: () => (
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={props.onCancel}
            />
          ),
          headerRight: () => null,
        }}
      />
      <DataFeedback />
      {status === 'ready' && (
        <AppText tone="muted" style={styles.empty}>
          {t('lists.unavailable')}
        </AppText>
      )}
    </Screen>
  );
}

function ListPlacesEditor({
  id,
  list,
  onDone,
  onCancel,
  mode,
  location,
  onModeChange,
  onBrowseCountry,
  onOpenLocation,
}: Props & { list: TravelList }) {
  const { setListPlaces } = appData;
  const busy = useAppData((snapshot) => snapshot.busy);
  const status = useAppData((snapshot) => snapshot.status);
  const [originalPlaces] = useState(list.placeIds);
  const [selected, setSelected] = useState(() => new Set(originalPlaces));
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(true);
  const results = useRef<FlatList<Place>>(null);
  const exited = useRef(false);
  const stale = list.placeIds !== originalPlaces;
  const disabled = stale || busy || status !== 'ready';
  const changed =
    selected.size !== originalPlaces.length ||
    originalPlaces.some((placeId) => !selected.has(placeId));
  const found = usePlaceSearch(browsing ? {
    query,
    ...getLocationFilters(location),
    scope: mode === 'cities' ? 'city' : mode === 'regions' ? 'region' : 'country',
  } : { query: '', scope: 'all', ids: [...selected] });
  const locationKey = locationParam(location);
  useLayoutEffect(() => {
    results.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, browsing, locationKey, mode]);

  const toggle = useCallback((placeId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }, []);

  const browseCountry = useCallback((nextCountryId: string) => {
    onBrowseCountry(nextCountryId);
    setQuery('');
    setBrowsing(true);
    Keyboard.dismiss();
  }, [onBrowseCountry]);

  function cancel() {
    if (exited.current) return;
    exited.current = true;
    Keyboard.dismiss();
    onCancel();
  }

  function save() {
    if (disabled || !changed || exited.current) return;
    if (setListPlaces(id, [...selected])) {
      exited.current = true;
      Keyboard.dismiss();
      onDone();
    }
  }

  const renderPlace = (place: Place) => <PlaceRow place={place} selected={selected.has(place.id)}
    disabled={disabled} onToggle={toggle} onBrowseCountry={browseCountry} />;
  const scopeControl = <Button label={t(browsing ? 'lists.selected' : 'lists.allPlaces')} variant="quiet"
    style={styles.scopeControl} onPress={() => { Keyboard.dismiss(); setBrowsing(!browsing); }} />;

  return (
    <Screen onAccessibilityEscape={cancel}>
      <Stack.Screen
        options={{
          title: t('lists.editPlaces'),
          headerLeft: () => (
            <Button
              label={t('common.cancel')}
              variant="quiet"
              onPress={cancel}
            />
          ),
          headerRight: () => (
            <Button
              label={t('lists.save')}
              variant="quiet"
              disabled={disabled || !changed}
              onPress={save}
            />
          ),
        }}
      />
      <FlatList
        ref={results}
        data={found.places}
        extraData={selected}
        keyExtractor={(place) => place.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.summary}>
              <AppText variant="heading" accessibilityRole="header">
                {list.name}
              </AppText>
              <AppText tone="muted">
                {t('lists.selectedCount', {
                  count: selected.size,
                  amount: formatNumber(selected.size),
                })}
              </AppText>
            </View>
            <DataFeedback />
            {stale && (
              <AppText tone="muted">{t('lists.changedElsewhere')}</AppText>
            )}
            {browsing && <>
              <PlaceKindControl value={mode} onChange={onModeChange} />
              <SearchField value={query} onChangeText={setQuery}
                placeholder={t('lists.searchPlaces')} accessibilityLabel={t('lists.searchPlaces')} />
            </>}
            {browsing ? <PlaceFilterBar location={location} onOpenLocation={onOpenLocation}>
              {scopeControl}
            </PlaceFilterBar> : scopeControl}
            <PlaceSuggestions places={found.suggestions} renderPlace={renderPlace} />
          </View>
        }
        ListEmptyComponent={!found.loading && !found.error && !found.suggestions.length ?
          <View style={styles.empty}>
            {!browsing && selected.size === 0 ? (
              <AppText tone="muted">{t('lists.noSelectedPlaces')}</AppText>
            ) : (
              <>
                <AppText>{t('lists.noPlacesFound')}</AppText>
                <AppText tone="muted">{t('lists.noPlacesFoundHint')}</AppText>
                {browsing && query.trim() !== '' && <Button label={t('common.clearSearch')} variant="quiet"
                  onPress={() => { Keyboard.dismiss(); setQuery(''); }} />}
              </>
            )}
          </View> : null
        }
        onEndReached={found.loadMore}
        ListFooterComponent={<PlaceSearchFooter {...found} />}
        renderItem={({ item }) => renderPlace(item)}
      />
    </Screen>
  );
}

const PlaceRow = memo(function PlaceRow({
  place,
  selected,
  disabled,
  onToggle,
  onBrowseCountry,
}: {
  place: Place;
  selected: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  onBrowseCountry: (id: string) => void;
}) {
  return (
    <View style={[styles.card, selected && styles.selectedRow]}>
      <AppPressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        disabled={disabled}
        onPress={() => onToggle(place.id)}
        style={styles.row}
      >
        <View style={styles.name}>
          <AppText>{place.name}</AppText>
          {place.kind !== 'country' && (
            <AppText variant="caption" tone="muted">
              {getPlaceSubtitle(place)}
            </AppText>
          )}
        </View>
        <Checkmark checked={selected} />
      </AppPressable>
      {place.kind === 'country' && (
        <AppPressable
          style={styles.regions}
          accessibilityLabel={t('lists.exploreCountryPlaces', {
            country: place.name,
          })}
          onPress={() => onBrowseCountry(place.id)}
        >
          <AppText tone="accent" variant="caption" style={styles.name}>
            {t('lists.explorePlaces')}
          </AppText>
          <Icon name="chevronRight" color={theme.color.accent} />
        </AppPressable>
      )}
    </View>
  );
});

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingVertical: theme.space.md, paddingBottom: theme.space.xl },
  header: { gap: theme.space.md, paddingBottom: theme.space.lg },
  summary: { gap: theme.space.xs },
  scopeControl: { alignSelf: 'flex-start' },
  card: { borderRadius: theme.radius.sm, backgroundColor: theme.color.surface },
  row: {
    minHeight: theme.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    gap: theme.space.lg,
  },
  regions: {
    minHeight: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    gap: theme.space.md,
    borderTopWidth: theme.stroke.subtle,
    borderTopColor: theme.color.border,
  },
  selectedRow: { backgroundColor: theme.color.selectedSurface },
  name: { flex: 1, gap: theme.space.xs },
  separator: { height: theme.space.sm },
  empty: { padding: theme.space.xl, gap: theme.space.sm },
});
