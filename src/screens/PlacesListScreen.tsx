import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { DataFeedback } from '../components/DataFeedback';
import { IconButton } from '../components/IconButton';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/SearchField';
import { countries, countryById } from '../countries/catalog';
import { CountryScopeControl } from '../countries/CountryScopeControl';
import { matchesCountryScope, type CountryScope } from '../countries/filters';
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
import { subdivisionById } from '../subdivisions/catalog';
import { theme } from '../theme';

export function PlacesListScreen({ mode, continent, query, scope, intent, countryId, regionId,
  onQueryChange, onScopeChange, onModeChange, onOpenFilters, onResetFilters, onSelect,
}: {
  mode: 'regions' | 'cities';
  continent: string;
  query: string;
  scope: CountryScope;
  intent?: string;
  countryId?: string;
  regionId?: string;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: CountryScope) => void;
  onModeChange: (mode: PlacesMode) => void;
  onOpenFilters: () => void;
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
  const countryIds = useMemo(() => continent === 'all' ? undefined
    : countries.filter((country) => country.continent.id === continent).map(({ id }) => id), [continent]);
  const results = usePlaceSearch({
    query, countryId, regionId, countryIds,
    scope: kind,
    ids: scope === 'not-visited' ? undefined : statusIds,
    excludedIds: scope === 'not-visited' ? statusIds : undefined,
  });
  const disabled = dataStatus !== 'ready' || busy;
  const narrowed = continent !== 'all' || !!countryId;
  const parentName = regionId ? subdivisionById.get(regionId)?.name : countryId ? countryById.get(countryId)?.name : undefined;
  useLayoutEffect(() => { list.current?.scrollToOffset({ offset: 0, animated: false }); },
    [query, scope, continent, countryId, regionId, intent, mode]);
  const select = useCallback((place: Place) => { Keyboard.dismiss(); onSelect(place); }, [onSelect]);
  const changeStatus = useCallback((place: Place) => {
    Keyboard.dismiss();
    const isCurrent = guard();
    showStatusPicker(formatPlaceName(place), (status) => {
      if (isCurrent()) void appData.setStatus([place.id], status, { preserveLived: false, isCurrent });
    });
  }, [guard]);
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
            <ScreenHeader title={t('places.title')} subtitle={parentName}>
              <IconButton name="filter" color={narrowed ? theme.color.accent : theme.color.textMuted}
                accessibilityLabel={t(narrowed ? 'countries.filtersApplied' : 'countries.filters')}
                disabled={disabled} onPress={() => { Keyboard.dismiss(); onOpenFilters(); }} />
            </ScreenHeader>
            <View style={styles.controls}>
              <PlaceKindControl value={mode} onChange={onModeChange} />
              <SearchField value={query} onChangeText={onQueryChange}
                placeholder={t(mode === 'cities' ? 'places.searchCities' : 'places.searchRegions')}
                accessibilityLabel={t(mode === 'cities' ? 'places.searchCities' : 'places.searchRegions')} />
              <CountryScopeControl value={scope} onChange={onScopeChange} />
              {parentName && <Button label={t('lists.allPlaces')} variant="quiet" onPress={onResetFilters} />}
              <DataFeedback />
            </View>
          </>
        }
        renderItem={({ item }) => <PlaceRow place={item} status={data.places[item.id] ?? 'unvisited'}
          disabled={disabled} onPress={select} onChangeStatus={changeStatus} />}
        ListEmptyComponent={dataStatus === 'ready' && !results.loading && !results.error ? (
          <View style={styles.empty}>
            <AppText variant="heading">{t('places.noSearchResults')}</AppText>
            <Button label={t('countries.resetFilters')} variant="quiet" onPress={onResetFilters} />
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
