import type { SQLiteDatabase } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';

import { buildCitiesById, buildCitySearch, buildCitySuggestions, cityFromRow, type CityQuery, type CityRow, type CitySearchRow, type StaticSearchMatch } from './query';
import { isCityId } from './index';
import type { City, CitySearchOptions } from './types';

let database: SQLiteDatabase | null = null;
let retry = () => {};
let status = { ready: false, error: false, revision: 0, retry: () => retry() };
const listeners = new Set<() => void>();

export function setCityCatalogDatabase(value: SQLiteDatabase | null, error = false) {
  if (database === value && status.error === error) return;
  database = value;
  status = { ...status, ready: value !== null, error, revision: status.revision + 1 };
  listeners.forEach((listener) => listener());
}

export function clearCityCatalogDatabase(value: SQLiteDatabase) {
  if (database === value) setCityCatalogDatabase(null);
}

export function setCityCatalogRetry(callback: () => void) {
  retry = callback;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => status;
export function useCityCatalogStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

async function queryCities<T = CityRow>({ sql, params }: CityQuery) {
  const connection = database;
  if (!connection) throw new Error('City catalog unavailable.');
  try {
    return await connection.getAllAsync<T>(sql, params);
  } catch (error) {
    if (database === connection) setCityCatalogDatabase(null, true);
    throw error;
  }
}

export function searchCityMatches(options: CitySearchOptions, staticMatches: readonly StaticSearchMatch[] = []) {
  return queryCities<CitySearchRow>(buildCitySearch(options, staticMatches));
}

export async function getCitySuggestions(options: CitySearchOptions) {
  return (await queryCities(buildCitySuggestions(options))).map(cityFromRow);
}

export async function getCities(ids: readonly string[]): Promise<City[]> {
  const connection = database;
  if (!connection) throw new Error('City catalog unavailable.');
  if (!ids.length) return [];
  const cities = (await queryCities(buildCitiesById(ids))).map(cityFromRow);
  const found = new Set(cities.map((city) => city.id));
  if (ids.some((id) => isCityId(id) && !found.has(id))) {
    if (database === connection) setCityCatalogDatabase(null, true);
    throw new Error('City catalog is missing a place.');
  }
  return cities;
}
