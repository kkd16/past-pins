import { Database } from 'bun:sqlite';
import { expect, mock } from 'bun:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { act, createElement, useImperativeHandle, type ReactNode, type Ref } from 'react';
import { createRoot } from 'test-renderer';

import { setCityCatalogDatabase } from '../../src/cities/database';
import { defaultAppData } from '../../src/data/model';
import type { CountryScope } from '../../src/countries/filters';
import type { DataSnapshot } from '../../src/data/store';
import { t } from '../../src/localization';
import { anywhere, readPlaceLocation, type PlaceLocation } from '../../src/places/location';
import type { Place } from '../../src/places/catalog';
import type { PlacesMode } from '../../src/places/PlaceKindControl';
import { getCountrySubdivisions } from '../../src/subdivisions/catalog';
import { native } from '../setup';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const data = defaultAppData();
data.lists = [{ id: 'trip', name: 'Trip', placeIds: [] }];
const setListPlaces = mock(() => true);
const scrollCountries = mock();
mock.module('react-native', () => ({
  ...native,
  ActionSheetIOS: { showActionSheetWithOptions: mock() },
  LayoutAnimation: { easeInEaseOut: mock() },
  SectionList: function SectionList({ ref, ...props }: {
    ref: Ref<unknown>;
    sections: { data: unknown[] }[];
    ListHeaderComponent?: ReactNode;
    ListEmptyComponent?: ReactNode;
  }) {
    useImperativeHandle(ref, () => ({ getScrollResponder: () => ({ scrollTo: scrollCountries }) }), []);
    return createElement('SectionList', props, props.ListHeaderComponent,
      props.sections.some(({ data }) => data.length) ? null : props.ListEmptyComponent);
  },
}));
mock.module('../../src/data/AppData', () => ({ useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select({ data, status: 'ready', busy: false, saveError: false, resetVersion: 0 }) }));
mock.module('../../src/data/app-data', () => ({ appData: { setListPlaces } }));
for (const name of ['AppPressable', 'AppText', 'Button', 'Checkmark', 'ChoiceControl', 'ChoiceMenu', 'DataFeedback', 'Icon', 'IconButton', 'Screen', 'SearchField']) {
  mock.module(`../../src/components/${name}`, () => ({ [name]: name }));
}
mock.module('../../src/support/ReportErrorButton', () => ({ ReportErrorButton: 'ReportErrorButton' }));

const { PlaceLocationScreen } = await import('../../src/screens/PlaceLocationScreen');
const { ListPlacesScreen } = await import('../../src/screens/ListPlacesScreen');
const { CountriesScreen } = await import('../../src/screens/CountriesScreen');
const { PlacesListScreen } = await import('../../src/screens/PlacesListScreen');
const { searchPlacesPage } = await import('../../src/places/catalog');
const { SheetHeader } = await import('../../src/components/SheetHeader');
const { CountryScopeControl } = await import('../../src/countries/CountryScopeControl');
const source = new Database(new URL('../../src/cities/catalog.db', import.meta.url).pathname, { readonly: true });
setCityCatalogDatabase({ getAllAsync: async (sql: string, params: (string | number)[]) => source.query(sql).all(...params) } as SQLiteDatabase);
const root = createRoot({ isStrictMode: true });
const washington = getCountrySubdivisions('us').find(({ code }) => code === 'US-WA')!;

function element(type: string) {
  const matches = root.container.queryAll((node) => node.type === type);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function button(label: string) {
  const matches = root.container.queryAll((node) => node.type === 'Button' && node.props.label === label);
  expect(matches).toHaveLength(1);
  return matches[0];
}

async function locationPicker() {
  const onSelect = mock();
  const onDismiss = mock();
  let mode: PlacesMode = 'cities';
  let location = anywhere;
  const render = () => act(async () => root.render(<PlaceLocationScreen mode={mode} location={location} onSelect={onSelect} onDismiss={onDismiss} />));
  await render();
  expect(element('SearchField').props.placeholder).toBe(t('places.searchLocation'));
  expect(element('SearchField').props.autoFocus).toBe(true);
  await act(async () => element('SearchField').props.onChangeText('Canada'));
  const canada = element('FlatList').props.data[0];
  expect(canada).toMatchObject({ label: 'Canada', location: { kind: 'country', id: 'ca' } });
  const row = element('FlatList').props.renderItem({ item: canada });
  await act(async () => row.props.onPress());
  expect(onSelect).toHaveBeenCalledWith({ kind: 'country', id: 'ca' });

  await act(async () => element('SearchField').props.onChangeText('Washington'));
  expect(element('FlatList').props.data[0]).toMatchObject({ label: 'Washington', description: 'United States', location: { kind: 'region', id: washington.id } });
  await act(async () => element('SearchField').props.onChangeText('Washigton'));
  expect(element('FlatList').props.data[0]).toMatchObject({ label: 'Washington' });
  expect(element('FlatList').props.ListHeaderComponent.props.children).toBe(t('places.similarNames'));

  location = readPlaceLocation('ca');
  await act(async () => element('SearchField').props.onChangeText(''));
  await render();
  const options = element('FlatList').props.data as { location: PlaceLocation; label: string }[];
  expect(options[0].location).toEqual(anywhere);
  expect(options[1].label).toBe('Canada');
  expect(options.some(({ label }) => label === 'Ontario')).toBe(true);
  expect(options.filter(({ label }) => label === 'Canada')).toHaveLength(1);
  expect(element('SearchField').props.autoFocus).toBe(false);
  location = readPlaceLocation(washington.id);
  await render();
  const current = element('FlatList').props.data;
  expect(current.slice(0, 3).map(({ label }: { label: string }) => label)).toEqual([t('places.anywhere'), 'Washington', 'United States']);
  expect(current.filter(({ label }: { label: string }) => label === 'Washington')).toHaveLength(1);
  const parentRow = element('FlatList').props.renderItem({ item: current[2] });
  await act(async () => parentRow.props.onPress());
  expect(onSelect).toHaveBeenLastCalledWith({ kind: 'country', id: 'us' });
  mode = 'regions';
  location = readPlaceLocation('ca');
  await render();
  expect(element('SearchField').props.placeholder).toBe(t('countries.search'));
  expect(element('FlatList').props.data[1].label).toBe('Canada');
  expect(element('FlatList').props.data.some((option: { location: PlaceLocation }) => option.location.kind === 'region')).toBe(false);
  await act(async () => element('Screen').props.onAccessibilityEscape());
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(root.container.queryAll((node) => node.type === 'Button' && node.props.label === t('common.cancel'))).toHaveLength(0);
}

async function listDraft() {
  let mode: PlacesMode = 'countries';
  let location = anywhere;
  const onDone = mock();
  const onCancel = mock();
  const render = () => act(async () => root.render(<ListPlacesScreen id="trip" mode={mode} location={location}
    onModeChange={mock()} onBrowseCountry={mock()} onOpenLocation={mock()} onDone={onDone} onCancel={onCancel} />));
  const toggle = async (place: Place) => {
    const row = element('FlatList').props.renderItem({ item: place });
    await act(async () => row.props.onToggle(place.id));
  };
  await render();
  await toggle(element('FlatList').props.data.find(({ id }: Place) => id === 'ca'));
  mode = 'cities';
  location = readPlaceLocation(washington.id);
  await render();
  const seattle = element('FlatList').props.data[0];
  expect(seattle.name).toBe('Seattle');
  await toggle(seattle);
  await act(async () => element('SearchField').props.onChangeText('Seattle'));
  await act(async () => button(t('lists.selected')).props.onPress());
  expect(element('FlatList').props.data.map(({ id }: Place) => id)).toEqual(['ca', seattle.id]);
  expect(root.container.queryAll((node) => node.type === 'SearchField')).toHaveLength(0);
  expect(setListPlaces).not.toHaveBeenCalled();
  await act(async () => button(t('lists.allPlaces')).props.onPress());
  expect(element('SearchField').props.value).toBe('Seattle');
  expect(element('FlatList').props.data[0].id).toBe(seattle.id);
  await act(async () => element('SearchField').props.onChangeText('zzzzzzzzzz'));
  expect(element('FlatList').props.data).toEqual([]);
  await act(async () => button(t('common.clearSearch')).props.onPress());
  expect(element('SearchField').props.value).toBe('');
  expect(element('FlatList').props.data[0].id).toBe(seattle.id);
  const header = element('Stack.Screen').props.options.headerRight();
  await act(async () => header.props.onPress());
  expect(setListPlaces).toHaveBeenCalledWith('trip', ['ca', seattle.id]);
  expect(onDone).toHaveBeenCalledTimes(1);
}

async function searchRecovery() {
  let query = 'zzzzzzzzzz';
  let scope: CountryScope = 'visited';
  const onQueryChange = mock((value: string) => { query = value; });
  const onResetFilters = mock();
  data.places.ca = 'visited';
  data.places.fr = 'visited';
  data.preferences.countryGrouping = 'alphabetical';
  const callbacks = { onQueryChange, onResetFilters, onScopeChange: mock(), onModeChange: mock(), onOpenLocation: mock(), onSelect: mock() };
  const renderCountries = () => act(async () => root.render(<CountriesScreen {...callbacks}
    query={query} scope={scope}
    location={readPlaceLocation('continent:NA')} onOpenRegions={mock()} />));
  await renderCountries();
  scrollCountries.mockClear();
  await act(async () => button(t('common.clearSearch')).props.onPress());
  expect(onQueryChange).toHaveBeenLastCalledWith('');
  expect(onResetFilters).not.toHaveBeenCalled();
  await renderCountries();
  expect(element('SectionList').props.sections.flatMap(({ data }: { data: Place[] }) => data.map(({ id }) => id))).toEqual(['ca']);
  expect(scrollCountries).toHaveBeenCalledWith({ y: 0, animated: false });

  const [seattle] = await searchPlacesPage({ query: 'Seattle', scope: 'city', regionId: washington.id });
  data.places[seattle.id] = 'wishlist';
  scope = 'wishlist';
  query = 'zzzzzzzzzz';
  const renderCities = () => act(async () => root.render(<PlacesListScreen {...callbacks}
    mode="cities" location={readPlaceLocation(washington.id)} query={query} scope={scope} />));
  await renderCities();
  await act(async () => button(t('common.clearSearch')).props.onPress());
  expect(onResetFilters).not.toHaveBeenCalled();
  await renderCities();
  expect(element('FlatList').props.data.map(({ id }: Place) => id)).toEqual([seattle.id]);
  scope = 'lived';
  await renderCities();
  await act(async () => button(t('countries.resetFilters')).props.onPress());
  expect(onResetFilters).toHaveBeenCalledTimes(1);
}

async function sheetDismissal() {
  const dismiss = mock();
  native.AccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(false);
  await act(async () => root.render(<SheetHeader title={t('places.location')} onDismiss={dismiss} />));
  expect(root.container.queryAll((node) => node.type === 'IconButton')).toHaveLength(0);
  await act(async () => element('AppText').props.onAccessibilityAction({ nativeEvent: { actionName: 'dismiss' } }));
  expect(dismiss).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
  native.AccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(true);
  const accessibleRoot = createRoot();
  await act(async () => accessibleRoot.render(<SheetHeader title={t('places.location')} onDismiss={dismiss} />));
  const [close] = accessibleRoot.container.queryAll((node) => node.type === 'IconButton');
  expect(close.props.accessibilityLabel).toBe(t('common.done'));
  await act(async () => close.props.onPress());
  expect(dismiss).toHaveBeenCalledTimes(2);
  await act(async () => accessibleRoot.unmount());
}

async function statusChips() {
  let value: CountryScope = 'all';
  const onChange = mock((next: CountryScope) => { value = next; });
  const render = () => act(async () => root.render(<CountryScopeControl value={value} onChange={onChange} />));
  const chip = (label: string) => root.container.queryAll((node) => node.type === 'AppText' && node.props.children === label)[0].parent!;
  await render();
  expect(root.container.queryAll((node) => node.type === 'AppPressable')).toHaveLength(5);
  expect(root.container.queryAll((node) => node.type === 'ChoiceMenu')).toHaveLength(0);
  for (const status of ['visited', 'wishlist'] as const) {
    await act(async () => chip(t(`countries.status.${status}`)).props.onPress());
    expect(onChange).toHaveBeenLastCalledWith(status);
    await render();
    expect(chip(t(`countries.status.${status}`)).props.accessibilityState).toEqual({ checked: true });
    expect(chip(t('countries.scopes.all')).props.accessibilityState).toEqual({ checked: false });
    expect(root.container.queryAll((node) => node.type === 'AppPressable')).toHaveLength(5);
  }
}

try {
  const scenario = process.argv[2];
  if (scenario === 'location-picker') await locationPicker();
  else if (scenario === 'list-draft') await listDraft();
  else if (scenario === 'sheet-dismissal') await sheetDismissal();
  else if (scenario === 'status-chips') await statusChips();
  else if (scenario === 'search-recovery') await searchRecovery();
  else throw new Error('Unknown browsing scenario');
  process.stdout.write('passed');
} finally {
  await act(async () => root.unmount());
  setCityCatalogDatabase(null);
  source.close();
}
