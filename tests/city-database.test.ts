import { afterEach, expect, mock, test } from 'bun:test';
import type { SQLiteDatabase } from 'expo-sqlite';

import { clearCityCatalogDatabase, getCities, searchCityMatches, setCityCatalogDatabase } from '../src/cities/database';

afterEach(() => setCityCatalogDatabase(null));

function database(getAllAsync: (...args: unknown[]) => Promise<unknown[]>) {
  return { getAllAsync } as unknown as SQLiteDatabase;
}

test('queries fail before the catalog opens and propagate database failures', async () => {
  setCityCatalogDatabase(null);
  await expect(searchCityMatches({ query: 'Toronto' })).rejects.toThrow();
  await expect(getCities(['city:6167865'])).rejects.toThrow();
  setCityCatalogDatabase(database(async () => { throw new Error('query failed'); }));
  await expect(searchCityMatches({ query: 'Toronto' })).rejects.toThrow('query failed');
  await expect(searchCityMatches({ query: 'Toronto' })).rejects.toThrow('City catalog unavailable');
});

test('batch details query once and leave requested ordering to the place catalog', async () => {
  const getAllAsync = mock(async () => [
    { geonameId: 2, name: 'Second', countryId: 'ca', regionId: null, adminName: '', longitude: 1, latitude: 1, population: 100 },
    { geonameId: 1, name: 'First', countryId: 'ca', regionId: 'ne:1', adminName: 'Region', longitude: 2, latitude: 2, population: 200 },
  ]);
  setCityCatalogDatabase(database(getAllAsync));
  expect((await getCities(['city:1', 'city:2', 'city:1', 'unknown'])).map((city) => city.id)).toEqual(['city:2', 'city:1']);
  expect(getAllAsync).toHaveBeenCalledTimes(1);
});

test('cleanup of an old provider cannot clear its replacement connection', async () => {
  const oldDatabase = database(async () => []);
  const replacement = database(async () => []);
  setCityCatalogDatabase(oldDatabase);
  setCityCatalogDatabase(replacement);
  clearCityCatalogDatabase(oldDatabase);
  expect(await searchCityMatches({ query: '' })).toEqual([]);
  clearCityCatalogDatabase(replacement);
  await expect(searchCityMatches({ query: '' })).rejects.toThrow();
});

test('late failures from an earlier connection do not poison a replacement', async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<unknown[]>((_, fail) => { reject = fail; });
  setCityCatalogDatabase(database(() => pending));
  const earlier = searchCityMatches({ query: 'first' });
  setCityCatalogDatabase(database(async () => []));
  reject(new Error('old connection closed'));
  await expect(earlier).rejects.toThrow('old connection closed');
  expect(await searchCityMatches({ query: 'replacement' })).toEqual([]);
});

test('missing known cities invalidate the connection and work after catalog replacement', async () => {
  setCityCatalogDatabase(database(async () => []));
  expect(await getCities(['unknown', 'city:1', 'city:01'])).toEqual([]);
  await expect(getCities(['city:6167865'])).rejects.toThrow('City catalog is missing a place');
  await expect(searchCityMatches({ query: 'Toronto' })).rejects.toThrow('City catalog unavailable');
  setCityCatalogDatabase(database(async () => [
    { geonameId: 6167865, name: 'Toronto', countryId: 'ca', regionId: null, adminName: 'Ontario', longitude: -79.4163, latitude: 43.70011, population: 2731571 },
  ]));
  expect((await getCities(['city:6167865']))[0].name).toBe('Toronto');
});

test('missing rows from an earlier connection cannot invalidate its replacement', async () => {
  let resolve!: (rows: unknown[]) => void;
  const pending = new Promise<unknown[]>((finish) => { resolve = finish; });
  setCityCatalogDatabase(database(() => pending));
  const earlier = getCities(['city:6167865']);
  setCityCatalogDatabase(database(async () => []));
  resolve([]);
  await expect(earlier).rejects.toThrow('City catalog is missing a place');
  expect(await searchCityMatches({ query: 'replacement' })).toEqual([]);
});
