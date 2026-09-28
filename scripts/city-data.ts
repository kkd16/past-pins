import { Database } from 'bun:sqlite';
import { geoContains } from 'd3-geo';

import type { City, CityParentIndex } from '../src/cities/types';
import type { SubdivisionFeature } from './subdivision-data';

export type CityRegionFeature = SubdivisionFeature & {
  properties: SubdivisionFeature['properties'] & { gn_id: number };
};

export type CityRecord = Omit<City, 'id'> & { geonameId: number; aliases: string };
type Admin = { geonameId: number; name: string };

export function parseAdminCodes(text: string) {
  const result = new Map<string, Admin>();
  for (const line of text.trim().split('\n')) {
    const [code, name, , id] = line.split('\t');
    if (!code || !name || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
      throw new Error('Invalid GeoNames administrative record.');
    if (result.has(code)) throw new Error('Duplicate GeoNames administrative code.');
    result.set(code, { geonameId: Number(id), name });
  }
  return result;
}

export function selectCities(
  text: string,
  admin1: ReadonlyMap<string, Admin>,
  admin2: ReadonlyMap<string, Admin>,
  features: readonly CityRegionFeature[],
  countryIds: ReadonlySet<string>,
) {
  const excluded = { feature: 0, country: 0 };
  const linked = { administrativeId: 0, geometry: 0, countryOnly: 0 };
  const omitted = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLS']);
  const byCountry = new Map<string, CityRegionFeature[]>();
  const byGeoName = new Map<string, CityRegionFeature[]>();
  for (const feature of features) {
    const country = feature.properties.iso_a2.toLowerCase();
    const sameCountry = byCountry.get(country) ?? [];
    sameCountry.push(feature);
    byCountry.set(country, sameCountry);
    const key = `${country}:${feature.properties.gn_id}`;
    const sameId = byGeoName.get(key) ?? [];
    sameId.push(feature);
    byGeoName.set(key, sameId);
  }
  const cities: CityRecord[] = [];
  const seen = new Set<number>();
  for (const line of text.trim().split('\n')) {
    const row = line.split('\t');
    if (row.length !== 19) throw new Error('Invalid GeoNames city columns.');
    if (row[6] !== 'P' || omitted.has(row[7])) {
      excluded.feature++;
      continue;
    }
    const countryId = row[8].toLowerCase();
    if (!countryIds.has(countryId)) {
      excluded.country++;
      continue;
    }
    const geonameId = Number(row[0]);
    const latitude = Number(row[4]);
    const longitude = Number(row[5]);
    const population = Number(row[14]);
    if (
      !Number.isSafeInteger(geonameId) || geonameId <= 0 || seen.has(geonameId) ||
      !row[1].trim() || !row[4] || !row[5] ||
      !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      !Number.isSafeInteger(population) || population < 0
    ) throw new Error('Invalid GeoNames city record.');
    seen.add(geonameId);
    const adminCode = `${row[8]}.${row[10]}`;
    const firstAdmin = admin1.get(adminCode);
    const secondAdmin = admin2.get(`${adminCode}.${row[11]}`);
    let region: CityRegionFeature | undefined;
    for (const admin of [secondAdmin, firstAdmin]) {
      if (!admin) continue;
      const candidates = byGeoName.get(`${countryId}:${admin.geonameId}`);
      if (candidates?.length === 1) {
        region = candidates[0];
        linked.administrativeId++;
        break;
      }
    }
    if (!region) {
      const candidates = (byCountry.get(countryId) ?? []).filter((feature) =>
        geoContains(feature, [longitude, latitude]),
      );
      if (candidates.length === 1) {
        region = candidates[0];
        linked.geometry++;
      } else linked.countryOnly++;
    }
    cities.push({
      geonameId,
      name: row[1],
      countryId,
      ...(region ? { regionId: `ne:${region.properties.ne_id}` } : {}),
      adminName: region?.properties.name ?? firstAdmin?.name ?? secondAdmin?.name ?? '',
      latitude,
      longitude,
      population,
      aliases: [...new Set([row[2], ...row[3].split(',')])].filter((name) => name && name !== row[1]).join(' '),
    });
  }
  cities.sort((a, b) => a.geonameId - b.geonameId);
  return { cities, excluded, linked };
}

export function createCityParentIndex(cities: readonly CityRecord[]): CityParentIndex {
  const result: CityParentIndex = { ids: [], parentIndexes: [], parents: [] };
  const parentIndexes = new Map<string, number>();
  for (const city of cities) {
    const key = `${city.countryId}:${city.regionId ?? ''}`;
    let parent = parentIndexes.get(key);
    if (parent === undefined) {
      parent = result.parents.length;
      parentIndexes.set(key, parent);
      result.parents.push([city.countryId, city.regionId ?? null]);
    }
    result.ids.push(city.geonameId);
    result.parentIndexes.push(parent);
  }
  return result;
}

export function createCityDatabase(cities: readonly CityRecord[], countryNames: ReadonlyMap<string, string> = new Map()) {
  const database = new Database(':memory:');
  database.exec(`
    CREATE TABLE cities (
      geonameId INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      countryId TEXT NOT NULL,
      regionId TEXT,
      adminName TEXT NOT NULL,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      population INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE city_search USING fts5(name, aliases, tokenize="unicode61 remove_diacritics 2 categories 'L* N* Co M*'", content='');
  `);
  const insertCity = database.prepare('INSERT INTO cities VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertSearch = database.prepare('INSERT INTO city_search(rowid, name, aliases) VALUES (?, ?, ?)');
  database.transaction(() => {
    for (const city of cities) {
      insertCity.run(city.geonameId, city.name, city.countryId, city.regionId ?? null, city.adminName, city.longitude, city.latitude, city.population);
      insertSearch.run(city.geonameId, city.name, `${city.aliases} ${city.adminName} ${countryNames.get(city.countryId) ?? ''} ${city.countryId}`);
    }
  })();
  database.exec(`
    CREATE INDEX cities_population ON cities(population DESC, name COLLATE NOCASE, geonameId);
    CREATE INDEX cities_country ON cities(countryId, population DESC, geonameId);
    CREATE INDEX cities_region ON cities(regionId, population DESC, geonameId);
    INSERT INTO city_search(city_search) VALUES ('optimize');
    VACUUM;
  `);
  const bytes = database.serialize();
  database.close();
  return bytes;
}
