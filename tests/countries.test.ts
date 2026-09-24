import { describe, expect, test } from 'bun:test';

import { continents, countries, countryIds } from '../src/countries/catalog';
import { countryFeatures } from '../src/countries/geography';
import { normalizeSearch, searchCountries } from '../src/countries/search';

describe('published country catalog', () => {
  test('every checklist entry has a unique ID and a map shape', () => {
    expect(countryIds.size).toBe(countries.length);
    expect(countries.length).toBe(countryFeatures.length);
    expect(countries.length).toBeGreaterThan(190);
    for (const country of countries) {
      expect(country.id.length).toBeGreaterThan(0);
      expect(country.name.length).toBeGreaterThan(0);
      expect(continents).toContain(country.continent);
    }
  });

  test('every upstream polygon is included and joins to a continent without exceptions', async () => {
    const { default: topology } =
      await import('@rembish/iso-topojson/iso-a2.json');
    const upstreamIds = topology.objects.merged.geometries.map(
      ({ properties }) => properties.iso_a2.toLowerCase(),
    );
    expect([...countryIds].sort()).toEqual(upstreamIds.sort());
    expect(continents).toHaveLength(7);
    expect(
      continents.every(({ id, name }) => id.length > 0 && name.length > 0),
    ).toBe(true);
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

  test('search includes the authoritative and native country names', () => {
    expect(searchCountries('Deutschland').map(({ id }) => id)).toContain('de');
    expect(searchCountries('日本').map(({ id }) => id)).toContain('jp');
    for (const country of countries) {
      expect(searchCountries(country.name)).toContain(country);
    }
  });

  test('search normalizes case before removing accent marks', () => {
    expect(normalizeSearch('  İSTANBUL ', 'tr')).toBe('istanbul');
    expect(normalizeSearch('CÔTE', 'fr')).toBe('cote');
  });
});
