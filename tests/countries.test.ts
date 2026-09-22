import { describe, expect, test } from 'bun:test';

import {
  countries,
  countryIds,
  worldMap,
} from '../src/countries/catalog';
import { searchCountries } from '../src/countries/search';

describe('single-source country catalog', () => {
  test('every checklist entry has a unique ID and a map shape', () => {
    expect(countryIds.size).toBe(countries.length);
    expect(countries.length).toBe(worldMap.locations.length);
    expect(countries.length).toBeGreaterThan(190);
    for (const country of countries) {
      expect(country.id.length).toBeGreaterThan(0);
      expect(country.name.length).toBeGreaterThan(0);
      expect(country.path.length).toBeGreaterThan(0);
      expect(country.path).not.toMatch(/NaN|Infinity/);
    }
  });

  test('search handles whitespace, case, accents, codes, and empty results', () => {
    expect(searchCountries('  CANADA  ').map(({ id }) => id)).toEqual(['ca']);
    expect(searchCountries('cote').map(({ id }) => id)).toContain('ci');
    expect(searchCountries('xk').map(({ name }) => name)).toEqual(['Kosovo']);
    expect(searchCountries('not-a-country')).toEqual([]);
    expect(searchCountries('')).toHaveLength(countries.length);
  });

  test('search preserves catalog order and returns the original country objects', () => {
    expect(searchCountries('   ')).toEqual([...countries]);
    const results = searchCountries('island');
    expect(results.length).toBeGreaterThan(1);
    expect(results).toEqual(
      [...results].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    );
    for (const result of results) {
      expect(countries.find(({ id }) => id === result.id)).toBe(result);
    }
  });
});
