import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';

import { createCityDatabase, createCityParentIndex, parseAdminCodes, selectCities, type CityRecord, type CityRegionFeature } from '../scripts/city-data';
import { countryIds } from '../src/countries/catalog';
import { cityCount, getCityParents, isCityId } from '../src/cities';
import manifest from '../src/cities/manifest.json';
import parents from '../src/cities/parents.json';
import { buildCitiesById, buildCitySearch, cityFromRow, getSearchPage, type CityRow } from '../src/cities/query';
import { subdivisionById } from '../src/subdivisions/catalog';

function region(id: number, geonameId: number, country = 'AA', left = 0): CityRegionFeature {
  return {
    type: 'Feature',
    properties: { ne_id: id, gn_id: geonameId, adm1_code: `${country}-${id}`, iso_a2: country, iso_3166_2: null, name: `Region ${id}`, name_en: null, name_local: null, name_alt: null, type_en: 'Region', type: 'Region', gadm_level: 1, longitude: left + 1, latitude: 1 },
    geometry: { type: 'Polygon', coordinates: [[[left, 0], [left, 2], [left + 2, 2], [left + 2, 0], [left, 0]]] },
  };
}

function cityLine(id: number, options: { country?: string; code?: string; feature?: string; longitude?: number } = {}) {
  return [id, `City ${id}`, `City ${id}`, '', 1, options.longitude ?? 1, 'P', options.feature ?? 'PPL', options.country ?? 'AA', '', options.code ?? '01', '001', '', '', 2000, '', '', 'Etc/UTC', '2026-01-01'].join('\t');
}

function record(id: number, overrides: Partial<CityRecord> = {}): CityRecord {
  return { geonameId: id, name: `City ${id}`, countryId: 'aa', regionId: 'ne:1', adminName: 'Region', longitude: 1, latitude: 1, population: 1000, aliases: '', ...overrides };
}

describe('city source pipeline', () => {
  test('joins administrative identities before using unique same-country geometry', () => {
    const admin1 = parseAdminCodes('AA.01\tFirst\tFirst\t101\nAA.02\tSecond\tSecond\t999');
    const admin2 = parseAdminCodes('AA.01.001\tDistrict\tDistrict\t102');
    const regions = [region(1, 101), region(2, 102, 'AA', 10), region(3, 103, 'BB')];
    const selected = selectCities([cityLine(1), cityLine(2, { code: '02' }), cityLine(3, { code: '03', longitude: 50 })].join('\n'), admin1, admin2, regions, new Set(['aa', 'bb']));
    expect(selected.cities.map((city) => city.regionId)).toEqual(['ne:2', 'ne:1', undefined]);
    expect(selected.linked).toEqual({ administrativeId: 1, geometry: 1, countryOnly: 1 });
  });

  test('does not guess between overlapping regions or reuse another country identity', () => {
    const admin1 = parseAdminCodes('AA.01\tFirst\tFirst\t101');
    const selected = selectCities(cityLine(1), admin1, new Map(), [region(1, 101, 'BB'), region(2, 102), region(3, 103)], new Set(['aa']));
    expect(selected.cities[0].regionId).toBeUndefined();
    expect(selected.cities[0].adminName).toBe('First');
  });

  test('excludes districts, aggregate and noncurrent places by source classification', () => {
    const codes = ['PPL', 'PPLA', 'PPLCH', 'PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLS'];
    const selected = selectCities(codes.map((feature, index) => cityLine(index + 1, { feature })).concat(cityLine(99, { country: 'ZZ' })).join('\n'), new Map(), new Map(), [], new Set(['aa']));
    expect(selected.cities.map((city) => city.geonameId)).toEqual([1, 2, 3]);
    expect(selected.excluded).toEqual({ feature: 5, country: 1 });
  });

  test('rejects malformed records and duplicate identities', () => {
    expect(() => parseAdminCodes('AA.01\tName\tName\tbroken')).toThrow();
    expect(() => selectCities('broken', new Map(), new Map(), [], new Set(['aa']))).toThrow();
    expect(() => selectCities([cityLine(1), cityLine(1)].join('\n'), new Map(), new Map(), [], new Set(['aa']))).toThrow();
    expect(() => selectCities(cityLine(1, { longitude: 190 }), new Map(), new Map(), [], new Set(['aa']))).toThrow();
  });

  test('generates shared parent groups without duplicating every parent name', () => {
    expect(createCityParentIndex([record(1), record(2), record(3, { regionId: undefined })])).toEqual({ ids: [1, 2, 3], parentIndexes: [0, 0, 1], parents: [['aa', 'ne:1'], ['aa', null]] });
  });
});

describe('offline city search', () => {
  const database = Database.deserialize(createCityDatabase([
    record(1, { name: 'San Pedro', aliases: 'San Pedro', population: 100 }),
    record(2, { name: 'Megacity', aliases: 'San Alias', population: 1000000 }),
    record(3, { name: 'München', aliases: 'Munich München', countryId: 'bb', regionId: 'ne:2' }),
    record(4, { name: '東京', aliases: 'Tokyo 東京', countryId: 'cc', regionId: undefined }),
    record(5, { name: 'San Juan', aliases: 'San Juan', population: 200 }),
    record(6, { name: 'Bikaner', aliases: 'बीकानेर', population: 600000 }),
    record(7, { name: 'Brooklyn', aliases: 'ब्रुकलिन', population: 2700000 }),
    record(8, { name: 'Baikonur', aliases: 'बायकोनूर', population: 70000 }),
  ], new Map([['aa', 'Example Country']])), true);
  function search(options: Parameters<typeof buildCitySearch>[0]) {
    const { sql, params } = buildCitySearch(options);
    return database.query<CityRow, (string | number)[]>(sql).all(...params).map(cityFromRow);
  }

  test('prioritizes primary city names over highly populated alias matches', () => {
    expect(search({ query: 'san' }).map((city) => city.id)).toEqual(['city:5', 'city:1', 'city:2']);
    expect(search({ query: 'San Pedro' })[0].id).toBe('city:1');
  });

  test('supports accents, aliases and non-Latin names', () => {
    expect(search({ query: 'munchen' })[0].name).toBe('München');
    expect(search({ query: 'München'.normalize('NFD') })[0].name).toBe('München');
    expect(search({ query: 'munich' })[0].name).toBe('München');
    expect(search({ query: '東京' })[0].name).toBe('東京');
    expect(search({ query: 'tokyo' })[0].name).toBe('東京');
    expect(search({ query: 'san pedro region' })[0].id).toBe('city:1');
    expect(search({ query: 'san pedro example country' })[0].id).toBe('city:1');
    expect(search({ query: 'बीकानेर' }).map((city) => city.name)).toEqual(['Bikaner']);
    expect(search({ query: 'बायकोनूर' }).map((city) => city.name)).toEqual(['Baikonur']);
  });

  test('matches short name prefixes without expanding short aliases or country codes', () => {
    expect(search({ query: 'sa' }).map(({ id }) => id)).toEqual(['city:5', 'city:1']);
    expect(search({ query: 'San Pe AA' }).map(({ id }) => id)).toEqual(['city:1']);
    expect(search({ query: 'San Pedro Ex' })).toEqual([]);
    expect(search({ query: '東' }).map(({ id }) => id)).toEqual(['city:4']);
    expect(search({ query: 'बी' }).map(({ id }) => id)).toEqual(['city:6']);
  });

  test('applies country, region, membership and exclusions before pagination', () => {
    expect(search({ query: '', countryIds: ['bb', 'cc'], offset: 1, limit: 1 })[0].id).toBe('city:4');
    expect(search({ query: 'san', excludedIds: ['city:5', 'city:2'], limit: 1 })[0].id).toBe('city:1');
    expect(search({ query: '', ids: ['city:1', 'city:5'], offset: 1, limit: 1 })[0].id).toBe('city:1');
    expect(search({ query: '', regionId: 'ne:2' })[0].id).toBe('city:3');
    expect(search({ query: '', countryId: 'zz' })).toEqual([]);
    expect(search({ query: '', ids: [] })).toEqual([]);
  });

  test('treats syntax as user text and handles empty or malformed ID filters', () => {
    expect(search({ query: '" OR *' })).toEqual([]);
    expect(search({ query: '***' })).toEqual([]);
    expect(search({ query: '\u093e' })).toEqual([]);
    expect(search({ query: '', ids: ['city:1) OR 1=1', 'city:01'] })).toEqual([]);
    const { sql, params } = buildCitiesById(['city:1', 'city:4', 'unknown']);
    expect(database.query<CityRow, (string | number)[]>(sql).all(...params)).toHaveLength(2);
  });

  test('uses bounded integer pagination for malformed and oversized requests', () => {
    expect(getSearchPage({})).toEqual({ limit: 50, offset: 0 });
    expect(getSearchPage({ limit: Number.NaN, offset: Number.POSITIVE_INFINITY })).toEqual({ limit: 50, offset: 0 });
    expect(getSearchPage({ limit: 1.5, offset: 1.5 })).toEqual({ limit: 50, offset: 0 });
    expect(getSearchPage({ limit: -1, offset: -1 })).toEqual({ limit: 1, offset: 0 });
    expect(getSearchPage({ limit: 500, offset: 500 })).toEqual({ limit: 200, offset: 500 });
    expect(buildCitySearch({ query: '', limit: 500, offset: -1 }).params.slice(-2)).toEqual([200, 0]);
  });
});

describe('bundled city integrity', () => {
  test('all source IDs have valid, matching parents and the catalog remains compact', () => {
    expect(cityCount).toBe(manifest.cities);
    expect(cityCount).toBeGreaterThan(200000);
    expect(parents.ids).toHaveLength(parents.parentIndexes.length);
    for (let index = 0; index < parents.ids.length; index++) {
      if (index && parents.ids[index] <= parents.ids[index - 1]) throw new Error('City IDs must be unique and sorted.');
      const parent = getCityParents(`city:${parents.ids[index]}`)!;
      if (!countryIds.has(parent.countryId)) throw new Error('Unknown city country.');
      if (parent.regionId && subdivisionById.get(parent.regionId)?.countryId !== parent.countryId) throw new Error('Invalid city region.');
    }
    expect(Bun.file(new URL('../src/cities/parents.json', import.meta.url)).size).toBeLessThan(3.5 * 1024 * 1024);
    expect(Bun.file(new URL('../src/cities/catalog.db', import.meta.url)).size).toBeLessThan(68 * 1024 * 1024);
    expect(isCityId('city:01')).toBe(false);
    expect(isCityId('city:99999999999999999999')).toBe(false);
    expect(isCityId('city:1')).toBe(false);
  });

  test('real city searches and parent lookups agree with generated database rows', () => {
    const database = new Database(new URL('../src/cities/catalog.db', import.meta.url).pathname, { readonly: true });
    const { sql, params } = buildCitySearch({ query: 'Toronto', countryId: 'ca' });
    const city = cityFromRow(database.query<CityRow, (string | number)[]>(sql).all(...params)[0]);
    expect(city.name).toBe('Toronto');
    expect(getCityParents(city.id)).toEqual({ countryId: city.countryId, regionId: city.regionId });
    expect(subdivisionById.get(city.regionId!)?.name).toBe('Ontario');
    expect(database.query('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    database.close();
  });

  test('every catalog row and full-text entry matches the bundled parent index', () => {
    const database = new Database(new URL('../src/cities/catalog.db', import.meta.url).pathname, { readonly: true });
    try {
      const rows = database.query<Pick<CityRow, 'geonameId' | 'countryId' | 'regionId'>, []>('SELECT geonameId, countryId, regionId FROM cities ORDER BY geonameId').all();
      expect(rows).toHaveLength(cityCount);
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const parent = parents.parents[parents.parentIndexes[index]];
        if (row.geonameId !== parents.ids[index] || row.countryId !== parent[0] || row.regionId !== parent[1])
          throw new Error(`City database and parent index disagree: ${row.geonameId}`);
      }
      expect(database.query('SELECT COUNT(*) AS count FROM city_search').get()).toEqual({ count: cityCount });
      expect(database.query('SELECT COUNT(*) AS count FROM city_search WHERE rowid NOT IN (SELECT geonameId FROM cities)').get()).toEqual({ count: 0 });
      const { sql, params } = buildCitySearch({ query: '' });
      const plan = database.query<{ detail: string }, (string | number)[]>(`EXPLAIN QUERY PLAN ${sql}`).all(...params);
      expect(plan.some(({ detail }) => detail.includes('USING INDEX'))).toBe(true);
      expect(plan.some(({ detail }) => detail.includes('TEMP B-TREE'))).toBe(false);
    } finally {
      database.close();
    }
  });
});
