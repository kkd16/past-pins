import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import {
  defaultCountryFilters,
  readCountryFilters,
  selectCountrySections,
  type CountrySection,
} from '../src/countries/filters';

const visited = new Set(['ca', 'fr', 'jp', 'ci']);
const ids = (sections: CountrySection[]) =>
  sections.flatMap(({ data }) => data.map(({ id }) => id));

describe('country list filters', () => {
  test('defaults group every place once by continent with alphabetical headings and rows', () => {
    const sections = selectCountrySections(
      '',
      'all',
      defaultCountryFilters,
      visited,
    );
    expect(new Set(ids(sections)).size).toBe(countries.length);
    expect(ids(sections)).toHaveLength(countries.length);
    expect(sections.map(({ title }) => title)).toEqual(
      sections
        .map(({ title }) => title)
        .sort((a, b) => a.localeCompare(b, 'en')),
    );
    for (const section of sections) {
      expect(
        section.data.every((country) => country.continent.id === section.key),
      ).toBe(true);
      expect(section.data.map(({ name }) => name)).toEqual(
        section.data
          .map(({ name }) => name)
          .sort((a, b) => a.localeCompare(b, 'en')),
      );
    }
  });

  test('visited and not visited are complementary and never produce empty headings', () => {
    const yes = selectCountrySections(
      '',
      'visited',
      defaultCountryFilters,
      visited,
    );
    const no = selectCountrySections(
      '',
      'not-visited',
      defaultCountryFilters,
      visited,
    );
    expect(ids(yes).sort()).toEqual([...visited].sort());
    expect(ids(no).length + ids(yes).length).toBe(countries.length);
    expect(ids(no).some((id) => visited.has(id))).toBe(false);
    expect([...yes, ...no].every(({ data }) => data.length > 0)).toBe(true);
  });

  test('search, continent, and visit status intersect', () => {
    const africa = { continent: 'AF', grouping: 'continent' } as const;
    expect(
      ids(selectCountrySections('  COTE ', 'visited', africa, visited)),
    ).toEqual(['ci']);
    expect(
      ids(selectCountrySections('COTE', 'not-visited', africa, visited)),
    ).toEqual([]);
    expect(
      ids(selectCountrySections('Canada', 'all', africa, visited)),
    ).toEqual([]);
  });

  test('alphabetical mode is one globally sorted list', () => {
    const sections = selectCountrySections(
      '',
      'all',
      { continent: 'all', grouping: 'alphabetical' },
      visited,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toEqual([...countries]);
  });

  test('a toggled visit immediately leaves a filtered list and enters its complement', () => {
    const next = new Set(visited);
    next.delete('ca');
    expect(
      ids(selectCountrySections('', 'visited', defaultCountryFilters, next)),
    ).not.toContain('ca');
    expect(
      ids(
        selectCountrySections('', 'not-visited', defaultCountryFilters, next),
      ),
    ).toContain('ca');
  });

  test('empty searches and empty visit sets produce no empty sections', () => {
    expect(
      selectCountrySections(
        'no-such-place',
        'all',
        defaultCountryFilters,
        visited,
      ),
    ).toEqual([]);
    expect(
      selectCountrySections('', 'visited', defaultCountryFilters, new Set()),
    ).toEqual([]);
    expect(
      selectCountrySections(
        '',
        'not-visited',
        defaultCountryFilters,
        new Set(countries.map(({ id }) => id)),
      ),
    ).toEqual([]);
  });

  test('current route parameters support valid options and default invalid inputs', () => {
    expect(readCountryFilters({})).toEqual(defaultCountryFilters);
    expect(
      readCountryFilters({ continent: 'EU', grouping: 'alphabetical' }),
    ).toEqual({ continent: 'EU', grouping: 'alphabetical' });
    expect(
      readCountryFilters({ continent: 'invalid', grouping: ['continent'] }),
    ).toEqual(defaultCountryFilters);
  });
});
