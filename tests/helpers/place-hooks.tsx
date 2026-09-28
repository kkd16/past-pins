import { Database } from 'bun:sqlite';
import { expect, mock } from 'bun:test';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'test-renderer';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  setCityCatalogDatabase,
  setCityCatalogRetry,
} from '../../src/cities/database';
import type { CityRow } from '../../src/cities/query';
import { defaultAppData } from '../../src/data/model';
import type { DataSnapshot } from '../../src/data/store';
import type { Place, PlaceSearchOptions } from '../../src/places/catalog';
import { countries } from '../../src/countries/catalog';
import { getCountrySubdivisions } from '../../src/subdivisions/catalog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const data = defaultAppData();
let resetVersion = 0;
mock.module('../../src/data/AppData', () => ({
  useAppData: <T,>(select: (snapshot: DataSnapshot) => T) => select({
    data, status: 'ready', busy: false, saveError: false, resetVersion,
  }),
}));
const { usePlaces } = await import('../../src/places/usePlaces');
const { usePlaceSearch } = await import('../../src/places/usePlaceSearch');
const source = new Database(join(import.meta.dir, '../../src/cities/catalog.db'), { readonly: true });
const toronto = source.query<CityRow, []>('SELECT * FROM cities WHERE geonameId = 6167865').get()!;
const cityId = `city:${toronto.geonameId}`;
const root = createRoot({ isStrictMode: true });
type Request = ReturnType<typeof Promise.withResolvers<CityRow[]>> & {
  sql: string;
  params: (string | number)[];
};
const requests: Request[] = [];
const database = {
  getAllAsync(sql: string, params: (string | number)[]) {
    const request = { ...Promise.withResolvers<CityRow[]>(), sql, params };
    requests.push(request);
    return request.promise;
  },
} as unknown as SQLiteDatabase;
type Result = {
  places: Place[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  more?: boolean;
  loadMore?: () => void;
};

function ListProbe({ ids }: { ids: readonly string[] }) {
  return createElement('HookResult', usePlaces(ids));
}

function SearchProbe({ options }: { options: PlaceSearchOptions }) {
  return createElement('HookResult', usePlaceSearch(options));
}

function result(): Result {
  const [node] = root.container.queryAll((item) => item.type === 'HookResult');
  expect(node).toBeDefined();
  return node.props as Result;
}

async function list(ids: readonly string[]) {
  await act(async () => root.render(<ListProbe ids={ids} />));
}

async function search(options: PlaceSearchOptions) {
  await act(async () => root.render(<SearchProbe options={options} />));
}

async function finish(request = requests.at(-1)!) {
  expect(request).toBeDefined();
  const rows = source.query(request.sql).all(...request.params) as CityRow[];
  await act(async () => request.resolve(rows));
}

async function fail(request = requests.at(-1)!) {
  await act(async () => request.reject(new Error('Database query failed')));
}

async function coldList() {
  const ids = [cityId, 'ca', toronto.regionId!];
  await list(ids);
  expect(result()).toMatchObject({ loading: true, error: false, places: [] });
  expect(requests).toHaveLength(0);
  await act(async () => setCityCatalogDatabase(database));
  await finish();
  expect(result()).toMatchObject({ loading: false, error: false });
  expect(result().places.map(({ id }) => id)).toEqual(ids);
  expect(result().places.map(({ kind }) => kind)).toEqual(['city', 'country', 'region']);
  expect(result().places[0]).toMatchObject({
    name: toronto.name, countryName: 'Canada',
    coordinates: [toronto.longitude, toronto.latitude],
  });
  const previous = result().places;
  await list([...ids]);
  expect(result().places).toBe(previous);
}

async function staleQuery() {
  await search({ query: 'Toronto', scope: 'city' });
  const previous = [...requests];
  await search({ query: 'Tokyo', scope: 'city' });
  expect(result()).toMatchObject({ loading: true, error: false, places: [] });
  await finish();
  const current = result().places;
  expect(current[0].name).toBe('Tokyo');
  for (const request of previous) await finish(request);
  expect(result().places).toBe(current);
  expect(result().loading).toBe(false);
}

async function stalePage() {
  await search({ query: '', scope: 'city', countryId: 'ca' });
  await finish();
  expect(result().places).toHaveLength(50);
  await act(async () => result().loadMore!());
  const previous = requests.at(-1)!;
  await search({ query: '', scope: 'city', countryId: 'jp' });
  await finish();
  const current = result().places;
  expect(current).toHaveLength(50);
  expect(current.every(({ countryId }) => countryId === 'jp')).toBe(true);
  await finish(previous);
  expect(result().places).toBe(current);
}

async function pagination() {
  const candidates = source.query<CityRow, [string, string]>(
    'SELECT * FROM cities WHERE countryId = ? AND regionId = ? ORDER BY population DESC, name COLLATE NOCASE, geonameId',
  ).all('ca', toronto.regionId!);
  const selected = candidates.slice(25, 145);
  const excluded = selected.slice(0, 15);
  const expected = selected.slice(15).map(({ geonameId }) => `city:${geonameId}`);
  expect(expected).toHaveLength(105);
  await search({
    query: '', scope: 'city', countryId: 'ca', countryIds: ['ca', 'us'],
    regionId: toronto.regionId!,
    ids: selected.map(({ geonameId }) => `city:${geonameId}`),
    excludedIds: excluded.map(({ geonameId }) => `city:${geonameId}`),
  });
  await finish();
  expect(result().places.map(({ id }) => id)).toEqual(expected.slice(0, 50));
  expect(result().more).toBe(true);
  const before = requests.length;
  await act(async () => {
    result().loadMore!();
    result().loadMore!();
  });
  expect(requests).toHaveLength(before + 1);
  expect(result().loading).toBe(true);
  await finish();
  expect(result().places.map(({ id }) => id)).toEqual(expected.slice(0, 100));
  await act(async () => result().loadMore!());
  await finish();
  expect(result().places.map(({ id }) => id)).toEqual(expected);
  expect(result()).toMatchObject({ loading: false, more: false, error: false });
  const completed = requests.length;
  await act(async () => result().loadMore!());
  expect(requests).toHaveLength(completed);
}

async function reset(kind: 'list' | 'search') {
  const render = () => kind === 'list'
    ? list([cityId, 'ca'])
    : search({ query: 'Toronto', scope: 'city' });
  await render();
  const previous = [...requests];
  resetVersion++;
  await render();
  const current = requests.at(-1)!;
  for (const request of previous) await finish(request);
  expect(result()).toMatchObject({ loading: true, places: [], error: false });
  await finish(current);
  expect(result().loading).toBe(false);
  expect(result().places.some(({ id }) => id === cityId)).toBe(true);
}

async function resetPage() {
  const options = { query: '', scope: 'city' as const, countryId: 'ca' };
  await search(options);
  await finish();
  const originalIds = result().places.map(({ id }) => id);
  await act(async () => result().loadMore!());
  const previous = requests.at(-1)!;
  resetVersion++;
  await search(options);
  const current = requests.at(-1)!;
  await finish(previous);
  expect(result()).toMatchObject({ loading: true, places: [] });
  await finish(current);
  expect(result().places.map(({ id }) => id)).toEqual(originalIds);
}

async function retry(kind: 'list' | 'search') {
  if (kind === 'list') await list([cityId, 'ca']);
  else await search({ query: 'Toronto', scope: 'city' });
  await fail();
  expect(result()).toMatchObject({ loading: false, places: [], error: true });
  await act(async () => result().retry());
  expect(result()).toMatchObject({ loading: true, places: [], error: false });
  await finish();
  expect(result()).toMatchObject({ loading: false, error: false });
  expect(result().places.some(({ id }) => id === cityId)).toBe(true);
}

async function catalogRetry() {
  const reconnect = mock(() => setCityCatalogDatabase(database));
  setCityCatalogRetry(reconnect);
  setCityCatalogDatabase(null, true);
  await list([cityId]);
  expect(result()).toMatchObject({ loading: false, places: [], error: true });
  await act(async () => result().retry());
  expect(reconnect).toHaveBeenCalledTimes(1);
  await finish();
  expect(result()).toMatchObject({ loading: false, error: false });
  expect(result().places.map(({ id }) => id)).toEqual([cityId]);
}

async function catalogRecovery() {
  await search({ query: '', scope: 'city', countryId: 'ca' });
  await finish();
  const firstPage = result().places.map(({ id }) => id);
  expect(result().more).toBe(true);
  await act(async () => setCityCatalogDatabase(null, true));
  expect(result().error).toBe(true);
  expect(result().loading).toBe(false);
  expect(result().more).toBe(false);
  await act(async () => setCityCatalogDatabase(database));
  expect(result().error).toBe(false);
  expect(result().loading).toBe(true);
  expect(result().more).toBe(false);
  await finish();
  expect(result().places.map(({ id }) => id)).toEqual(firstPage);
  expect(result()).toMatchObject({ error: false, loading: false, more: true });
  await act(async () => result().loadMore!());
  await finish();
  expect(result().places).toHaveLength(100);
  expect(new Set(result().places.map(({ id }) => id)).size).toBe(100);
}

async function replaceConnection(kind: 'list' | 'search') {
  if (kind === 'list') await list([cityId, 'ca']);
  else await search({ query: 'Toronto', scope: 'city' });
  const previous = [...requests];
  const replacement = { getAllAsync: database.getAllAsync } as SQLiteDatabase;
  await act(async () => setCityCatalogDatabase(replacement));
  expect(requests.length).toBeGreaterThan(previous.length);
  const current = requests.at(-1)!;
  for (const request of previous) await finish(request);
  expect(result().loading).toBe(true);
  expect(result().places).toEqual([]);
  await finish(current);
  expect(result().loading).toBe(false);
  expect(result().places.some(({ id }) => id === cityId)).toBe(true);
  const places = result().places;
  const completed = requests.length;
  await act(async () => setCityCatalogDatabase(replacement));
  expect(result().places).toBe(places);
  expect(requests).toHaveLength(completed);
}

async function missingRow() {
  const reconnect = mock(() => setCityCatalogDatabase(database));
  setCityCatalogRetry(reconnect);
  const ids = [cityId, 'ca'];
  data.lists = [{ id: 'mixed', name: 'Mixed list', placeIds: ids }];
  await list(ids);
  await act(async () => requests.at(-1)!.resolve([]));
  expect(result()).toMatchObject({ loading: false, places: [], error: true });
  expect(data.lists[0].placeIds).toEqual(ids);
  await act(async () => result().retry());
  expect(reconnect).toHaveBeenCalledTimes(1);
  await finish();
  expect(result().places.map(({ id }) => id)).toEqual([cityId, 'ca']);
  expect(result().error).toBe(false);
}

async function regionFilters() {
  setCityCatalogDatabase(null, true);
  const canadian = getCountrySubdivisions('ca');
  const ontario = canadian.find(({ code }) => code === 'CA-ON')!;
  const quebec = canadian.find(({ code }) => code === 'CA-QC')!;
  const tokyo = getCountrySubdivisions('jp').find(({ code }) => code === 'JP-13')!;
  const ids = [ontario.id, quebec.id, tokyo.id];
  const continentId = countries.find(({ id }) => id === 'ca')!.continent.id;
  const countryIds = countries.filter(({ continent }) => continent.id === continentId).map(({ id }) => id);
  expect(countryIds).toContain('ca');
  await search({ query: '', ids, countryIds, excludedIds: [quebec.id] });
  expect(result().places.map(({ id }) => id)).toEqual([ontario.id]);
  expect(result()).toMatchObject({ loading: false, error: false, more: false });
  await search({ query: '', ids, countryId: 'jp' });
  expect(result().places.map(({ id }) => id)).toEqual([tokyo.id]);
  await search({ query: '', scope: 'region', countryId: 'ca', ids: [quebec.id] });
  expect(result().places.map(({ id }) => id)).toEqual([quebec.id]);
  await search({ query: 'Ontario', ids, countryId: 'ca' });
  expect(result().places.map(({ id }) => id)).toEqual([ontario.id]);
  const previous = result().places;
  await act(async () => setCityCatalogDatabase(database));
  expect(result().places).toBe(previous);
  expect(requests).toHaveLength(0);
}

async function routeContext() {
  let params: Record<string, unknown> = {};
  mock.module('expo-router', () => ({
    router: { setParams: mock(), push: mock(), navigate: mock() },
    useLocalSearchParams: () => params,
  }));
  mock.module('../../src/screens/CountriesScreen', () => ({ CountriesScreen: 'CountriesScreen' }));
  mock.module('../../src/screens/PlacesListScreen', () => ({ PlacesListScreen: 'PlacesListScreen' }));
  const { default: CountriesRoute } = await import('../../src/app/(tabs)/countries');
  const cases = [
    { countryId: 'ca', regionId: toronto.regionId, expectedCountry: 'ca', expectedRegion: toronto.regionId },
    { countryId: ['ca'], regionId: toronto.regionId },
    { countryId: 'ca', regionId: [toronto.regionId], expectedCountry: 'ca' },
    { countryId: 42, regionId: 'ca' },
    { regionId: 'unknown-region' },
    { countryId: 'us', regionId: toronto.regionId, expectedCountry: 'us' },
    { countryId: 'ca', regionId: cityId, expectedCountry: 'ca' },
  ];
  for (const item of cases) {
    params = { mode: 'cities', countryId: item.countryId, regionId: item.regionId };
    await act(async () => root.render(<CountriesRoute />));
    const [screen] = root.container.queryAll((node) => node.type === 'PlacesListScreen');
    expect(screen.props.countryId).toBe(item.expectedCountry);
    expect(screen.props.regionId).toBe(item.expectedRegion);
  }
}

try {
  const scenario = process.argv[2];
  setCityCatalogRetry(() => setCityCatalogDatabase(database));
  if (scenario !== 'cold-list') setCityCatalogDatabase(database);
  if (scenario === 'cold-list') await coldList();
  else if (scenario === 'stale-query') await staleQuery();
  else if (scenario === 'stale-page') await stalePage();
  else if (scenario === 'pagination') await pagination();
  else if (scenario === 'reset-list') await reset('list');
  else if (scenario === 'reset-search') await reset('search');
  else if (scenario === 'reset-page') await resetPage();
  else if (scenario === 'retry-list') await retry('list');
  else if (scenario === 'retry-search') await retry('search');
  else if (scenario === 'catalog-retry') await catalogRetry();
  else if (scenario === 'catalog-recovery') await catalogRecovery();
  else if (scenario === 'replace-list') await replaceConnection('list');
  else if (scenario === 'replace-search') await replaceConnection('search');
  else if (scenario === 'missing-row') await missingRow();
  else if (scenario === 'region-filters') await regionFilters();
  else if (scenario === 'route-context') await routeContext();
  else throw new Error('Unknown place hook scenario');
  process.stdout.write('passed');
} finally {
  await act(async () => root.unmount());
  setCityCatalogDatabase(null);
  setCityCatalogRetry(() => {});
  source.close();
}
