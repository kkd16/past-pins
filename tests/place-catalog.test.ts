import { Database } from 'bun:sqlite';
import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { join } from 'node:path';

import { setCityCatalogDatabase } from '../src/cities/database';
import { searchPlacesPage } from '../src/places/catalog';
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
