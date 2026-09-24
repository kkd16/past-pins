import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import {
  defaultCountryFilters,
  readCountryFilters,
  readCountryScope,
  selectCountrySections,
  type CountrySection,
} from '../src/countries/filters';
import type { AppData } from '../src/data/model';

const places: AppData['places'] = {
  ca: 'lived',
  fr: 'visited',
  jp: 'wishlist',
  ci: 'visited',
};
const ids = (sections: CountrySection[]) =>
  sections.flatMap(({ data }) => data.map(({ id }) => id));

describe('country list filters', () => {
  test('defaults group every place once by continent with alphabetical headings and rows', () => {
    const sections = selectCountrySections(
      '',
      'all',
      defaultCountryFilters,
      places,
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

  test('visited includes lived; not visited includes wishlist and complements visited', () => {
    const yes = selectCountrySections(
      '',
      'visited',
      defaultCountryFilters,
      places,
    );
    const no = selectCountrySections(
      '',
      'not-visited',
      defaultCountryFilters,
      places,
    );
    expect(ids(yes).sort()).toEqual(['ca', 'ci', 'fr']);
    expect(ids(no)).toContain('jp');
    expect(ids(no).length + ids(yes).length).toBe(countries.length);
    expect(ids(no).some((id) => ids(yes).includes(id))).toBe(false);
    expect([...yes, ...no].every(({ data }) => data.length > 0)).toBe(true);
  });

  test('wishlist and lived scopes only include their own saved statuses', () => {
    expect(
      ids(selectCountrySections('', 'wishlist', defaultCountryFilters, places)),
    ).toEqual(['jp']);
    expect(
      ids(selectCountrySections('', 'lived', defaultCountryFilters, places)),
    ).toEqual(['ca']);
  });

  test('search, continent, and scope intersect', () => {
    const africa = { continent: 'AF', grouping: 'continent' } as const;
    expect(
      ids(selectCountrySections('  COTE ', 'visited', africa, places)),
    ).toEqual(['ci']);
    expect(
      ids(selectCountrySections('COTE', 'not-visited', africa, places)),
    ).toEqual([]);
    expect(ids(selectCountrySections('Canada', 'all', africa, places))).toEqual(
      [],
    );
    expect(
      ids(
        selectCountrySections(
          'japan',
          'wishlist',
          { ...africa, continent: 'AS' },
          places,
        ),
      ),
    ).toEqual(['jp']);
  });

  test('alphabetical mode is one globally sorted list', () => {
    const sections = selectCountrySections(
      '',
      'all',
      { continent: 'all', grouping: 'alphabetical' },
      places,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toEqual([...countries]);
  });

  test('removing a lived place immediately leaves visited and enters not visited', () => {
    const next = { ...places };
    delete next.ca;
    expect(
      ids(selectCountrySections('', 'visited', defaultCountryFilters, next)),
    ).not.toContain('ca');
    expect(
      ids(
        selectCountrySections('', 'not-visited', defaultCountryFilters, next),
      ),
    ).toContain('ca');
  });

  test('empty searches and empty scopes produce no empty sections', () => {
    expect(
      selectCountrySections(
        'no-such-place',
        'all',
        defaultCountryFilters,
        places,
      ),
    ).toEqual([]);
    expect(
      selectCountrySections('', 'visited', defaultCountryFilters, {}),
    ).toEqual([]);
    const allVisited = Object.fromEntries(
      countries.map(({ id }) => [id, 'visited' as const]),
    );
    expect(
      selectCountrySections(
        '',
        'not-visited',
        defaultCountryFilters,
        allVisited,
      ),
    ).toEqual([]);
  });

  test('route parameters support valid options and default invalid inputs', () => {
    expect(readCountryFilters({})).toEqual(defaultCountryFilters);
    expect(
      readCountryFilters({ continent: 'EU', grouping: 'alphabetical' }),
    ).toEqual({ continent: 'EU', grouping: 'alphabetical' });
    expect(
      readCountryFilters({ continent: 'invalid', grouping: ['continent'] }),
    ).toEqual(defaultCountryFilters);
    expect(readCountryScope('wishlist')).toBe('wishlist');
    expect(readCountryScope('lived')).toBe('lived');
    expect(readCountryScope(['visited'])).toBe('all');
    expect(readCountryScope('invalid')).toBe('all');
  });
});
