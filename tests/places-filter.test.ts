import { describe, expect, test } from 'bun:test';

import { countryById } from '../src/countries/catalog';
import type { AppData } from '../src/data/model';
import { getCountryRegionProgress, selectRegions } from '../src/places/filter';
import {
  getCountrySubdivisions,
  subdivisions,
  subdivisionsByCountry,
} from '../src/subdivisions/catalog';

const canada = getCountrySubdivisions('ca');
const ontario = canada.find(({ code }) => code === 'CA-ON')!;
const quebec = canada.find(({ code }) => code === 'CA-QC')!;
const alberta = canada.find(({ code }) => code === 'CA-AB')!;
const japaneseRegion = getCountrySubdivisions('jp')[0];
const statuses: AppData['subdivisions'] = {
  [ontario.id]: 'visited',
  [quebec.id]: 'lived',
  [alberta.id]: 'wishlist',
  [japaneseRegion.id]: 'visited',
  'not-a-region': 'lived',
};

describe('global region browsing', () => {
  test('exposes every region once with parent context and alphabetical order', () => {
    const results = selectRegions('', 'all', 'all', {});
    expect(results.map(({ id }) => id)).toEqual(
      subdivisions.map(({ id }) => id),
    );
    expect(new Set(results.map(({ id }) => id)).size).toBe(subdivisions.length);
    expect(
      results.every(
        (region) =>
          region.kind === 'region' &&
          region.countryName === countryById.get(region.countryId)?.name,
      ),
    ).toBe(true);
  });

  test('intersects parent country or source code search with continent and status', () => {
    expect(
      selectRegions('Canada', 'visited', 'NA', statuses)
        .map(({ id }) => id)
        .sort(),
    ).toEqual([ontario.id, quebec.id].sort());
    expect(selectRegions('Canada', 'visited', 'AS', statuses)).toEqual([]);
    expect(
      selectRegions('ca-qc', 'lived', 'NA', statuses).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(
      selectRegions('  QUÉBEC ', 'lived', 'all', statuses).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(
      selectRegions('日本', 'visited', 'AS', statuses).map(({ id }) => id),
    ).toEqual([japaneseRegion.id]);
  });

  test('status filters include lived visits, wishlist remaining, and ignore unknown IDs', () => {
    const visited = selectRegions('', 'visited', 'all', statuses).map(
      ({ id }) => id,
    );
    const remaining = selectRegions('', 'not-visited', 'all', statuses).map(
      ({ id }) => id,
    );
    expect(visited.sort()).toEqual(
      [ontario.id, quebec.id, japaneseRegion.id].sort(),
    );
    expect(
      selectRegions('', 'wishlist', 'all', statuses).map(({ id }) => id),
    ).toEqual([alberta.id]);
    expect(remaining).toContain(alberta.id);
    expect([...visited, ...remaining].sort()).toEqual(
      subdivisions.map(({ id }) => id).sort(),
    );
    expect(selectRegions('', 'visited', 'all', {})).toEqual([]);
  });

  test('country row progress includes all supported countries and follows region changes', () => {
    const progress = getCountryRegionProgress(statuses);
    expect(progress.size).toBe(subdivisionsByCountry.size);
    expect(progress.get('ca')).toEqual({ total: canada.length, visited: 2 });
    expect(progress.get('jp')?.visited).toBe(1);
    expect(progress.has('not-a-region')).toBe(false);
    expect(
      [...progress.values()].reduce((total, item) => total + item.total, 0),
    ).toBe(subdivisions.length);
    const next = { ...statuses };
    delete next[quebec.id];
    expect(getCountryRegionProgress(next).get('ca')?.visited).toBe(1);
    expect(getCountryRegionProgress({}).get('ca')?.visited).toBe(0);
  });
});
