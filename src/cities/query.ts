import type { City, CitySearchOptions } from './types';
import { isShortCode, searchWords } from '../places/search';

export type CityRow = Omit<City, 'id' | 'regionId'> & { geonameId: number; regionId: string | null };
export type CityQuery = { sql: string; params: (string | number)[] };
export type StaticSearchMatch = { id: string; name: string; rank: number; kind: 'country' | 'region' };
export type CitySearchRow = { searchRank: number } & (CityRow & { staticId: null } | { staticId: string });

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

function cityConditions(options: CitySearchOptions) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
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
  return { conditions, params };
}

function matchTerms(terms: readonly string[], secondary: string) {
  return terms.map((term) => `(name : "${term}"* OR {${secondary}} : "${term}"${isShortCode(term) ? '' : '*'})`).join(' AND ');
}

export function buildCitySearch(options: CitySearchOptions, staticMatches: readonly StaticSearchMatch[] = []): CityQuery {
  const terms = searchWords(options.query);
  const fts = matchTerms(terms, 'aliases context');
  const filters = cityConditions(options);
  const params: (string | number)[] = [];
  let rank = '0';
  if (fts) {
    rank = 'CASE WHEN c.searchName = ? THEN 0 WHEN c.geonameId IN (SELECT rowid FROM city_search WHERE city_search MATCH ?) THEN 1 WHEN c.geonameId IN (SELECT rowid FROM city_search WHERE city_search MATCH ?) THEN 2 ELSE 3 END';
    const nameTerms = terms.map((term) => `"${term}"*`).join(' OR ');
    params.push(terms.join(' '), `(name : (${nameTerms})) AND (${matchTerms(terms, 'context')})`, matchTerms(terms, 'aliases'));
    filters.conditions.push('c.geonameId IN (SELECT rowid FROM city_search WHERE city_search MATCH ?)');
    filters.params.push(fts);
  } else if (options.query.trim()) filters.conditions.push('0');
  params.push(...filters.params);
  let sql = `SELECT ${columns}, ${rank} AS searchRank, NULL AS staticId, 2 AS placeOrder FROM cities c ${filters.conditions.length ? `WHERE ${filters.conditions.join(' AND ')}` : ''}`;
  if (staticMatches.length) {
    sql += ` UNION ALL SELECT NULL, json_extract(value, '$.name'), NULL, NULL, NULL, NULL, NULL, 0,
      json_extract(value, '$.rank'), json_extract(value, '$.id'),
      CASE json_extract(value, '$.kind') WHEN 'country' THEN 0 ELSE 1 END FROM json_each(?)`;
    params.push(JSON.stringify(staticMatches));
  }
  const { limit, offset } = getSearchPage(options);
  params.push(limit, offset);
  return {
    sql: `${sql} ORDER BY ${fts ? 'searchRank, ' : ''}${staticMatches.length ? 'placeOrder, ' : ''}population DESC, name COLLATE NOCASE, geonameId${staticMatches.length ? ', staticId' : ''} LIMIT ? OFFSET ?`,
    params,
  };
}

export function buildCitySuggestions(options: CitySearchOptions): CityQuery {
  const words = searchWords(options.query);
  const trigrams = [...new Set(words.flatMap((word) => {
    const characters = Array.from(word);
    return characters.slice(0, -2).map((_, index) => characters.slice(index, index + 3).join(''));
  }))];
  const { conditions, params } = cityConditions(options);
  conditions.push(trigrams.length ? 'city_suggestions MATCH ?' : '0');
  if (trigrams.length) params.push(trigrams.map((word) => `"${word}"`).join(' OR '));
  return {
    sql: `SELECT ${columns} FROM city_suggestions JOIN cities c ON c.geonameId = city_suggestions.rowid WHERE ${conditions.join(' AND ')} ORDER BY rank, c.population DESC, c.geonameId LIMIT 100`,
    params,
  };
}

export function buildCitiesById(ids: readonly string[]): CityQuery {
  return { sql: `SELECT ${columns} FROM cities c WHERE c.geonameId IN (SELECT value FROM json_each(?))`, params: [JSON.stringify(numericCityIds(ids))] };
}
