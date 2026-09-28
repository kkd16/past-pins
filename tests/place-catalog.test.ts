import { Database } from 'bun:sqlite';
import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { join } from 'node:path';

import { setCityCatalogDatabase } from '../src/cities/database';
import { searchPlacesPage, searchPlaceSuggestions, searchStaticPlaces } from '../src/places/catalog';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

const source = new Database(join(import.meta.dir, '../src/cities/catalog.db'), { readonly: true });
const connection = {
  async getAllAsync(sql: string, params: (string | number)[]) {
    return source.query(sql).all(...params);
  },
} as unknown as SQLiteDatabase;
const ontario = getCountrySubdivisions('ca').find(({ code }) => code === 'CA-ON')!;
const toronto = 'city:6167865';
const vancouver = 'city:6173331';

beforeEach(() => setCityCatalogDatabase(connection));
afterEach(() => setCityCatalogDatabase(null));
afterAll(() => source.close());

test('included IDs and exclusions apply to cities and static places', async () => {
  const options = { query: '', ids: ['ca', toronto], excludedIds: ['ca'] };
  expect((await searchPlacesPage(options)).map(({ id }) => id)).toEqual([toronto]);
  expect(await searchPlacesPage({ ...options, ids: [] })).toEqual([]);
  expect(await searchPlacesPage({ ...options, countryId: 'jp' })).toEqual([]);
});

test('mixed catalog pages cross the region and city boundary without gaps or duplicates', async () => {
  const ids = ['ca', ontario.id, toronto, vancouver];
  const options = { query: '', ids, countryId: 'ca' };
  const all = await searchPlacesPage(options);
  const pages = await Promise.all([0, 1, 2, 3, 4].map((offset) =>
    searchPlacesPage({ ...options, offset, limit: 1 }),
  ));
  expect(all.map(({ id }) => id)).toEqual(['ca', ontario.id, toronto, vancouver]);
  expect(pages.flat()).toEqual(all);
});

test('region filters apply before paginating a mixed selection', async () => {
  const result = await searchPlacesPage({
    query: '', ids: ['ca', ontario.id, toronto, vancouver], regionId: ontario.id,
  });
  expect(result.map(({ id }) => id)).toEqual([ontario.id, toronto]);
});

test('pagination bounds are consistent across static and city catalogs', async () => {
  for (const scope of ['country', 'city', 'all'] as const) {
    const first = await searchPlacesPage({ query: '', scope, limit: 1 });
    expect(await searchPlacesPage({ query: '', scope, offset: -1, limit: 0 })).toEqual(first);
    expect(await searchPlacesPage({ query: '', scope, offset: NaN, limit: NaN })).toHaveLength(50);
    expect(await searchPlacesPage({ query: '', scope, limit: 1000 })).toHaveLength(200);
  }
});

test('accent-equivalent names rank by population and mixed searches rank names before parent context', async () => {
  for (const query of ['Montreal', 'Montréal', 'Montre\u0301al']) {
    const places = await searchPlacesPage({ query });
    expect(places[0]).toMatchObject({ name: 'Montréal', countryId: 'ca', kind: 'city' });
  }
  const places = await searchPlacesPage({ query: 'New York' });
  expect(places[0]).toMatchObject({ name: 'New York', kind: 'region' });
  expect(places[1]).toMatchObject({ name: 'New York City', kind: 'city' });
  const washington = searchStaticPlaces({ query: 'Washington', scope: 'region' });
  expect(washington[0].name).toBe('Washington');
  expect(searchStaticPlaces({ query: 'Washington state', scope: 'region' })[0].name).toBe('Washington');
});

test('country and state abbreviations qualify cities without substring noise', async () => {
  const options = { query: 'Vancouver BC' };
  const places = await searchPlacesPage(options);
  expect(places[0]).toMatchObject({ id: vancouver, countryId: 'ca', regionName: 'British Columbia' });
  expect(places.every(({ countryId }) => countryId === 'ca')).toBe(true);
  expect(await searchPlaceSuggestions(options, places)).toEqual([]);
  expect((await searchPlacesPage({ query: 'Seattle WA' }))[0]).toMatchObject({ name: 'Seattle', regionName: 'Washington' });
  expect(searchStaticPlaces({ query: 'WA', scope: 'country' }).every(({ name }) => name.startsWith('Wa'))).toBe(true);
  expect(await searchPlacesPage({ query: 'Seattle W' })).toEqual([]);
  expect(searchStaticPlaces({ query: 'BC', scope: 'region' }).some(({ name }) => name === 'British Columbia')).toBe(true);
});

test('short prefixes find primary and native names consistently across catalogs', async () => {
  expect((await searchPlacesPage({ query: 'To', scope: 'city', countryId: 'ca' }))[0].id).toBe(toronto);
  expect(searchStaticPlaces({ query: 'Ca', scope: 'country' }).map(({ id }) => id)).toContain('ca');
  expect(searchStaticPlaces({ query: '日', scope: 'country' }).map(({ id }) => id)).toContain('jp');
  expect(searchStaticPlaces({ query: 'Wa', scope: 'region', countryId: 'us' })[0].name).toBe('Washington');
});

test('geographic city filters include the whole country and only source-linked cities in a state', async () => {
  const washington = getCountrySubdivisions('us').find(({ code }) => code === 'US-WA')!;
  const canada = await searchPlacesPage({ query: '', scope: 'city', countryId: 'ca' });
  expect(canada).toHaveLength(50);
  expect(canada.every(({ countryId }) => countryId === 'ca')).toBe(true);
  const cities = await searchPlacesPage({ query: '', scope: 'city', countryId: 'us', regionId: washington.id });
  expect(cities[0].name).toBe('Seattle');
  expect(cities.every((place) => place.kind === 'city' && place.regionId === washington.id)).toBe(true);
});

test('ranked mixed pagination stays complete and stable across page boundaries', async () => {
  const options = { query: 'Washington' };
  const all = await searchPlacesPage({ ...options, limit: 30 });
  const pages = await Promise.all([0, 5, 10, 15, 20, 25].map((offset) => searchPlacesPage({ ...options, offset, limit: 5 })));
  expect(pages.flat()).toEqual(all);
  expect(new Set(all.map(({ id }) => id)).size).toBe(all.length);
});

test('typo suggestions respect location and membership and never replace exact results', async () => {
  const options = { query: 'Tornto', scope: 'city' as const, countryId: 'ca' };
  const matches = await searchPlacesPage(options);
  expect((await searchPlaceSuggestions(options, matches))[0].id).toBe(toronto);
  expect(await searchPlaceSuggestions({ ...options, ids: [vancouver] }, [])).toEqual([]);
  expect(await searchPlaceSuggestions({ ...options, excludedIds: [toronto] }, [])).toEqual([]);
  expect(await searchPlaceSuggestions({ ...options, countryId: 'jp' }, [])).toEqual([]);
  expect(await searchPlaceSuggestions({ query: 'Toronto' }, await searchPlacesPage({ query: 'Toronto' }))).toEqual([]);
  expect(await searchPlaceSuggestions({ query: 'WA' }, [])).toEqual([]);
});
