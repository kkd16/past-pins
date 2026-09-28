import type { City, CitySearchOptions } from './types';

export type CityRow = Omit<City, 'id' | 'regionId'> & { geonameId: number; regionId: string | null };
export type CityQuery = { sql: string; params: (string | number)[] };

export function cityFromRow(row: CityRow): City {
  return {
    id: `city:${row.geonameId}`,
    name: row.name,
    countryId: row.countryId,
    ...(row.regionId ? { regionId: row.regionId } : {}),
    adminName: row.adminName,
    longitude: row.longitude,
    latitude: row.latitude,
    population: row.population,
  };
}

export function numericCityIds(ids: readonly string[]) {
  return ids.filter((id) => /^city:[1-9]\d*$/u.test(id))
    .map((id) => Number(id.slice(5)))
    .filter(Number.isSafeInteger);
}

const columns = 'c.geonameId, c.name, c.countryId, c.regionId, c.adminName, c.longitude, c.latitude, c.population';

export function getSearchPage(options: Pick<CitySearchOptions, 'offset' | 'limit'>) {
  return {
    limit: Number.isSafeInteger(options.limit) ? Math.max(1, Math.min(200, options.limit!)) : 50,
    offset: Number.isSafeInteger(options.offset) ? Math.max(0, options.offset!) : 0,
  };
}

export function buildCitySearch(options: CitySearchOptions): CityQuery {
  const terms = options.query.normalize('NFC').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) ?? [];
  const fts = terms.map((term) => `"${term}"*`).join(' AND ');
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let rank = '';
  if (fts) {
    rank = ', CASE WHEN c.name = ? COLLATE NOCASE THEN 0 WHEN c.geonameId IN (SELECT rowid FROM city_search WHERE city_search MATCH ?) THEN 1 ELSE 2 END AS searchRank';
    params.push(options.query.trim(), `name : (${fts})`);
    conditions.push('c.geonameId IN (SELECT rowid FROM city_search WHERE city_search MATCH ?)');
    params.push(fts);
  } else if (options.query.trim()) conditions.push('0');
  if (options.countryId) {
    conditions.push('c.countryId = ?');
    params.push(options.countryId);
  }
  if (options.countryIds) {
    conditions.push('c.countryId IN (SELECT value FROM json_each(?))');
    params.push(JSON.stringify(options.countryIds));
  }
  if (options.regionId) {
    conditions.push('c.regionId = ?');
    params.push(options.regionId);
  }
  if (options.ids) {
    conditions.push('c.geonameId IN (SELECT value FROM json_each(?))');
    params.push(JSON.stringify(numericCityIds(options.ids)));
  }
  if (options.excludedIds?.length) {
    conditions.push('c.geonameId NOT IN (SELECT value FROM json_each(?))');
    params.push(JSON.stringify(numericCityIds(options.excludedIds)));
  }
  const { limit, offset } = getSearchPage(options);
  params.push(limit, offset);
  return {
    sql: `SELECT ${columns}${rank} FROM cities c ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY ${fts ? 'searchRank, ' : ''}c.population DESC, c.name COLLATE NOCASE, c.geonameId LIMIT ? OFFSET ?`,
    params,
  };
}

export function buildCitiesById(ids: readonly string[]): CityQuery {
  return { sql: `SELECT ${columns} FROM cities c WHERE c.geonameId IN (SELECT value FROM json_each(?))`, params: [JSON.stringify(numericCityIds(ids))] };
}
