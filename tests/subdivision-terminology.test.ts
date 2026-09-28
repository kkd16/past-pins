import { describe, expect, test } from 'bun:test';

import { t } from '../src/localization';
import {
  getCountrySubdivisions,
  subdivisionsByCountry,
} from '../src/subdivisions/catalog';
import {
  getCountrySubdivisionTerminology,
  getSubdivisionKindLabel,
  getSubdivisionTerminology,
} from '../src/subdivisions/terminology';

describe('source-derived subdivision terminology', () => {
  test.each([
    ['ca', 'Provinces and territories', 'provinces and territories'],
    ['us', 'States and federal districts', 'states and federal districts'],
    ['au', 'States and territories', 'states and territories'],
    ['de', 'States', 'states'],
    ['ch', 'Cantons', 'cantons'],
    ['it', 'Provinces', 'provinces'],
    [
      'fr',
      'Metropolitan departments and overseas departments',
      'metropolitan departments and overseas departments',
    ],
  ])('uses the bundled types for %s', (countryId, title, plural) => {
    expect(getCountrySubdivisionTerminology(countryId)).toMatchObject({
      title,
      plural,
    });
  });

  test('mixed systems never label one item as two different types', () => {
    const terms = getCountrySubdivisionTerminology('ca');
    expect(t('subdivisions.count', { ...terms, count: 1, amount: '1' })).toBe(
      '1 region',
    );
    expect(t('subdivisions.count', { ...terms, count: 2, amount: '2' })).toBe(
      '2 regions',
    );
    expect(t('subdivisions.explore', terms)).toBe(
      'Explore provinces and territories',
    );
    expect(getSubdivisionKindLabel('Province')).toBe('province');
    expect(getSubdivisionKindLabel('Territory')).toBe('territory');
  });

  test('homogeneous systems use localized singulars and irregular plurals', () => {
    const terms = getCountrySubdivisionTerminology('se');
    expect(
      t('subdivisions.selectedCount', { ...terms, count: 1, amount: '1' }),
    ).toBe('1 county selected');
    expect(
      t('subdivisions.updateCount', { ...terms, count: 2, amount: '2' }),
    ).toBe('Update 2 counties');
    expect(t('subdivisions.count', { ...terms, count: 0, amount: '0' })).toBe(
      '0 counties',
    );
  });

  test.each([undefined, 'unknown', 'sg', 'in', 'gb', 'jp', 'pl'])(
    'uses regions for global, missing, ambiguous, or complex data: %s',
    (countryId) => {
      expect(getCountrySubdivisionTerminology(countryId)).toEqual({
        singular: 'region',
        countPlural: 'regions',
        plural: 'regions',
        title: 'Regions',
      });
    },
  );

  test('missing or new types prevent majority-based guesses', () => {
    for (const kind of [
      '',
      'Unknown type',
      'Province|State',
      'Captial District',
    ]) {
      const regions = [{ kind: 'State' }, { kind: 'State' }, { kind }];
      expect(getSubdivisionTerminology(regions).plural).toBe('regions');
      expect(getSubdivisionKindLabel(kind)).toBe('region');
    }
    expect(getSubdivisionTerminology([]).plural).toBe('regions');
  });

  test('source capitalization and record ordering do not change terminology', () => {
    expect(
      getSubdivisionTerminology([
        { kind: 'Autonomous Region' },
        { kind: 'Autonomous region' },
      ]).plural,
    ).toBe('autonomous regions');
    for (const regions of subdivisionsByCountry.values()) {
      expect(getSubdivisionTerminology([...regions].reverse())).toEqual(
        getSubdivisionTerminology(regions),
      );
    }
  });

  test('search and visit status cannot change a country’s collective name', () => {
    const provinces = getCountrySubdivisions('ca').filter(
      ({ kind }) => kind === 'Province',
    );
    expect(getSubdivisionTerminology(provinces).plural).toBe('provinces');
    expect(getCountrySubdivisionTerminology('ca').plural).toBe(
      'provinces and territories',
    );
  });

  test('every country label renders the updated whole messages completely', () => {
    for (const countryId of subdivisionsByCountry.keys()) {
      const terms = getCountrySubdivisionTerminology(countryId);
      for (const key of [
        'explore',
        'countryTitle',
        'browseList',
        'visitedSummary',
        'visited',
        'progress',
        'progressValue',
        'countryProgress',
        'openCountry',
        'select',
        'noResults',
        'noResultsHint',
        'showAll',
        'search',
        'count',
        'selectedCount',
        'updateCount',
      ] as const) {
        const text = t(`subdivisions.${key}`, {
          ...terms,
          country: countryId,
          visited: '1',
          total: '2',
          percent: '50%',
          count: 1,
          amount: '1',
        });
        expect(text).not.toMatch(/missing|%\{|undefined|\|/i);
      }
    }
  });
});
