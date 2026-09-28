import { useLayoutEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet } from 'react-native';

import { AppText } from '../components/AppText';
import { ChoiceRow } from '../components/ChoiceRow';
import { Screen } from '../components/Screen';
import { SearchField } from '../components/SearchField';
import { SheetHeader } from '../components/SheetHeader';
import { continents, countries } from '../countries/catalog';
import { t } from '../localization';
import { searchStaticPlaces, suggestStaticPlaces, type StaticPlace } from '../places/catalog';
import { anywhere, getLocationFilters, locationParam, type PlaceLocation } from '../places/location';
import type { PlacesMode } from '../places/PlaceKindControl';
import { rankEntries, searchEntry } from '../places/search';
import { theme } from '../theme';

type Option = { location: PlaceLocation; label: string; description?: string };
const continentOptions: Option[] = continents.map(({ id, name }) => ({ location: { kind: 'continent', id }, label: name }));
const countryOptions: Option[] = countries.map(({ id, name }) => ({ location: { kind: 'country', id }, label: name }));
const continentIndex = continentOptions.map((option) => searchEntry(option, option.label));

function placeOption(place: StaticPlace): Option {
  return {
    location: { kind: place.kind, id: place.id },
    label: place.name,
    description: place.kind === 'region' ? place.countryName : undefined,
  };
}

function locationOptions(mode: PlacesMode, location: PlaceLocation, query: string) {
  const all: Option = { location: anywhere, label: t('places.anywhere') };
  if (mode === 'countries') return { options: [all, ...continentOptions], similar: false };
  if (query.trim()) {
    const search = { query, scope: mode === 'cities' ? 'all' : 'country' } as const;
    const matches = [
      ...rankEntries(continentIndex, query).map(({ item }) => item),
      ...searchStaticPlaces(search).map(placeOption),
    ];
    if (matches.length) return { options: matches, similar: false };
    const suggestions = suggestStaticPlaces(search).map(placeOption);
    return { options: suggestions, similar: suggestions.length > 0 };
  }
  const countryId = mode === 'cities' ? getLocationFilters(location).countryId : undefined;
  const nearby = countryId ? searchStaticPlaces({ query: '', countryId }).map(placeOption) : [];
  const options = [...nearby, ...continentOptions, ...countryOptions.filter((option) => locationParam(option.location) !== countryId)];
  const selected = options.find((option) => locationParam(option.location) === locationParam(location));
  return {
    options: [all, ...(selected ? [selected] : []), ...options.filter((option) => option !== selected)],
    similar: false,
  };
}

export function PlaceLocationScreen({ mode, location, onSelect, onDismiss }: {
  mode: PlacesMode;
  location: PlaceLocation;
  onSelect: (location: PlaceLocation) => void;
  onDismiss: () => void;
}) {
  const [query, setQuery] = useState('');
  const list = useRef<FlatList<Option>>(null);
  const selectedLocation = locationParam(location);
  const searchLabel = t(mode === 'regions' ? 'countries.search' : 'places.searchLocation');
  useLayoutEffect(() => { list.current?.scrollToOffset({ offset: 0, animated: false }); }, [query]);
  const { options, similar } = locationOptions(mode, location, query);
  return (
    <Screen onAccessibilityEscape={onDismiss}>
      <SheetHeader title={t('places.location')} onDismiss={onDismiss} />
      {mode !== 'countries' && <SearchField autoFocus={location.kind === 'anywhere'} value={query} onChangeText={setQuery}
        placeholder={searchLabel} accessibilityLabel={searchLabel} />}
      <FlatList
        ref={list}
        data={options}
        keyExtractor={({ location }) => locationParam(location)}
        extraData={selectedLocation}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={similar ? <AppText variant="label" tone="muted" accessibilityRole="header" style={styles.similar}>{t('places.similarNames')}</AppText> : null}
        ListEmptyComponent={<AppText tone="muted" style={styles.empty}>{t('places.noSearchResults')}</AppText>}
        renderItem={({ item }) => <ChoiceRow label={item.label} description={item.description}
          selected={locationParam(item.location) === selectedLocation}
          onPress={() => { Keyboard.dismiss(); onSelect(item.location); }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: theme.space.md, paddingBottom: theme.space.xl },
  empty: { padding: theme.space.xl, textAlign: 'center' },
  similar: { padding: theme.space.md },
});
