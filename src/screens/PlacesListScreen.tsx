import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { matchesCountryScope, type CountryScope } from '../countries/filters';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import { showStatusPicker } from '../countries/StatusPicker';
import { appData } from '../data/app-data';
import { useAppData } from '../data/AppData';
import { t } from '../localization';
import { useActionGuard } from '../navigation/useActionGuard';
import { formatPlaceName, type Place } from '../places/catalog';
import { PlaceSearchFooter } from '../places/PlaceFeedback';
import { PlaceKindControl, type PlacesMode } from '../places/PlaceKindControl';
import { PlaceRow } from '../places/PlaceRow';
import { usePlaceSearch } from '../places/usePlaceSearch';
import { getLocationFilters, locationParam, type PlaceLocation } from '../places/location';
import { PlaceFilterBar } from '../places/PlaceFilterBar';
import { PlaceSuggestions } from '../places/PlaceSuggestions';
import { theme } from '../theme';

export function PlacesListScreen({ mode, location, query, scope, intent,
  onQueryChange, onScopeChange, onModeChange, onOpenLocation, onResetFilters, onSelect,
}: {
  mode: 'regions' | 'cities';
  location: PlaceLocation;
  query: string;
  scope: CountryScope;
  intent?: string;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: CountryScope) => void;
  onModeChange: (mode: PlacesMode) => void;
  onOpenLocation: () => void;
  onResetFilters: () => void;
  onSelect: (place: Place) => void;
}) {
  const data = useAppData((snapshot) => snapshot.data);
  const dataStatus = useAppData((snapshot) => snapshot.status);
  const busy = useAppData((snapshot) => snapshot.busy);
  const resetVersion = useAppData((snapshot) => snapshot.resetVersion);
  const guard = useActionGuard(resetVersion);
  const list = useRef<FlatList<Place>>(null);
  const kind = mode === 'cities' ? 'city' : 'region';
  const statusIds = useMemo(() => scope === 'all' ? undefined
    : Object.keys(data.places).filter((id) =>
      matchesCountryScope(data.places[id], scope === 'not-visited' ? 'visited' : scope),
    ), [data.places, scope]);
  const results = usePlaceSearch({
    query,
    ...getLocationFilters(location),
    scope: kind,
    ids: scope === 'not-visited' ? undefined : statusIds,
    excludedIds: scope === 'not-visited' ? statusIds : undefined,
  });
  const disabled = dataStatus !== 'ready' || busy;
  const searching = query.trim() !== '';
  const locationKey = locationParam(location);
  useLayoutEffect(() => { list.current?.scrollToOffset({ offset: 0, animated: false }); },
    [query, scope, locationKey, intent, mode]);
  const select = useCallback((place: Place) => { Keyboard.dismiss(); onSelect(place); }, [onSelect]);
  const changeStatus = useCallback((place: Place) => {
    Keyboard.dismiss();
    const isCurrent = guard();
    showStatusPicker(formatPlaceName(place), (status) => {
      if (isCurrent()) void appData.setStatus([place.id], status, { preserveLived: false, isCurrent });
    });
  }, [guard]);
  const renderPlace = (place: Place) => <PlaceRow place={place} status={data.places[place.id] ?? 'unvisited'}
    disabled={disabled} onPress={select} onChangeStatus={changeStatus} />;
  return (
    <Screen>
      <FlatList
        ref={list}
        data={dataStatus === 'ready' ? results.places : []}
        extraData={{ statuses: data.places, disabled }}
        keyExtractor={(place) => place.id}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ItemSeparatorComponent={Separator}
        onEndReached={results.loadMore}
        ListHeaderComponent={
          <>
            <ScreenHeader title={t('places.title')} />
            <View style={styles.controls}>
              <PlaceKindControl value={mode} onChange={onModeChange} />
              <SearchField value={query} onChangeText={onQueryChange}
                placeholder={t(mode === 'cities' ? 'places.searchCities' : 'places.searchRegions')}
                accessibilityLabel={t(mode === 'cities' ? 'places.searchCities' : 'places.searchRegions')} />
              <PlaceFilterBar location={location} onOpenLocation={onOpenLocation}>
                <CountryScopeControl value={scope} onChange={onScopeChange} />
              </PlaceFilterBar>
              <DataFeedback />
            </View>
            <PlaceSuggestions places={dataStatus === 'ready' ? results.suggestions : []} renderPlace={renderPlace} />
          </>
        }
        renderItem={({ item }) => renderPlace(item)}
        ListEmptyComponent={dataStatus === 'ready' && !results.loading && !results.error && !results.suggestions.length ? (
          <View style={styles.empty}>
            <AppText variant="heading">{t('places.noSearchResults')}</AppText>
            <Button label={t(searching ? 'common.clearSearch' : 'countries.resetFilters')} variant="quiet"
              onPress={() => { Keyboard.dismiss(); if (searching) onQueryChange(''); else onResetFilters(); }} />
          </View>
        ) : null}
        ListFooterComponent={<PlaceSearchFooter {...results} />}
      />
    </Screen>
  );
}
function Separator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  content: { paddingBottom: theme.space.xl }, controls: { gap: theme.space.md, paddingBottom: theme.space.md },
  separator: { height: theme.space.sm }, empty: { padding: theme.space.xl, gap: theme.space.md, alignItems: 'center' },
});
