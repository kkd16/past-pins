import { describe, expect, test } from 'bun:test';

import type { AppData } from '../src/data/model';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';
import {
  getSubdivisionStatistics,
  searchSubdivisionCountries,
  selectSubdivisions,
} from '../src/subdivisions/tracking';

const canada = getCountrySubdivisions('ca');
const ontario = canada.find((region) => region.code === 'CA-ON')!;
const quebec = canada.find((region) => region.code === 'CA-QC')!;
const alberta = canada.find((region) => region.code === 'CA-AB')!;

describe('region browsing and progress', () => {
  const statuses: AppData['subdivisions'] = {
    [ontario.id]: 'visited',
    [quebec.id]: 'lived',
    [alberta.id]: 'wishlist',
    'unknown-region': 'visited',
  };

  test('counts lived as visited, wishlist as remaining, and ignores unknown regions', () => {
    expect(getSubdivisionStatistics(statuses, 'ca')).toEqual({
      total: 13,
      visited: 2,
      lived: 1,
      wishlist: 1,
      remaining: 11,
    });
    expect(getSubdivisionStatistics(statuses, 'jp').visited).toBe(0);
    expect(getSubdivisionStatistics(statuses).visited).toBe(2);
  });

  test('filters regions by status within their own country', () => {
    expect(
      selectSubdivisions('ca', '', 'visited', statuses)
        .map(({ id }) => id)
        .sort(),
    ).toEqual([ontario.id, quebec.id].sort());
    expect(
      selectSubdivisions('ca', '', 'wishlist', statuses).map(({ id }) => id),
    ).toEqual([alberta.id]);
    expect(
      selectSubdivisions('ca', '', 'lived', statuses).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(selectSubdivisions('ca', '', 'not-visited', statuses)).toHaveLength(
      11,
    );
    expect(selectSubdivisions('jp', '', 'visited', statuses)).toEqual([]);
  });

  test('searches names, accents, aliases, and source codes', () => {
    expect(
      selectSubdivisions('ca', '  QUÉBEC ', 'all', {}).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(
      selectSubdivisions('ca', 'quebec', 'all', {}).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(
      selectSubdivisions('ca', 'ca-on', 'all', {}).map(({ id }) => id),
    ).toEqual([ontario.id]);
    expect(selectSubdivisions('ca', 'no-such-region', 'all', {})).toEqual([]);
  });

  test('unsupported countries have no fabricated region or progress', () => {
    expect(selectSubdivisions('unknown', '', 'all', {})).toEqual([]);
    expect(getSubdivisionStatistics({}, 'unknown')).toEqual({
      total: 0,
      visited: 0,
      lived: 0,
      wishlist: 0,
      remaining: 0,
    });
    expect(searchSubdivisionCountries('Canada').map(({ id }) => id)).toEqual([
      'ca',
    ]);
    expect(searchSubdivisionCountries('no-such-country')).toEqual([]);
  });
});
