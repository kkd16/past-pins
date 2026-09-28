import { describe, expect, test } from 'bun:test';

import { continents, countries, countryIds } from '../src/countries/catalog';
import { countryFeatures } from '../src/countries/geography';
import { searchCountries } from '../src/countries/search';
import { normalizeSearch } from '../src/places/search';

describe('published country catalog', () => {
  test('every checklist entry has a unique ID and a map shape', () => {
    expect(countryIds.size).toBe(countries.length);
    expect(countries.length).toBe(countryFeatures.length);
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
    expect(continents.map(({ id }) => id).sort()).toEqual([
      'AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA',
    ]);
    expect(
      continents.every(({ id, name }) => id.length > 0 && name.length > 0),
    ).toBe(true);
  });

  test('search handles whitespace, case, accents, codes, and empty results', () => {
    expect(searchCountries('  CANADA  ').map(({ id }) => id)).toEqual(['ca']);
    expect(searchCountries('cote').map(({ id }) => id)).toContain('ci');
    expect(searchCountries('xk').map(({ name }) => name)).toEqual(['Kosovo']);
    expect(searchCountries('not-a-country')).toEqual([]);
    expect(searchCountries('Côte').map(({ id }) => id)).toContain('ci');
    expect(searchCountries('Co\u0302te').map(({ id }) => id)).toContain('ci');
  });

  test('blank browsing is alphabetical and search ranks primary names before aliases', () => {
    expect(searchCountries('')).toEqual([...countries]);
    expect(searchCountries('   ')).toEqual([...countries]);
    const results = searchCountries('island');
    expect(results.length).toBeGreaterThan(1);
    expect(results.slice(-2).map(({ id }) => id)).toEqual(['is', 'pn']);
    const primary = results.slice(0, -2);
    expect(primary).toEqual([...primary].sort((a, b) => a.name.localeCompare(b.name, 'en')));
  });

  test('search includes the authoritative and native country names', () => {
    expect(searchCountries('Deutschland').map(({ id }) => id)).toContain('de');
    expect(searchCountries('日本').map(({ id }) => id)).toContain('jp');
    for (const country of countries) {
      expect(searchCountries(country.name)).toContain(country);
    }
  });

  test('search normalizes case before removing accent marks', () => {
    expect(normalizeSearch('  İSTANBUL ')).toBe('istanbul');
    expect(normalizeSearch('CÔTE')).toBe('cote');
  });
});
