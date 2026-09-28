import { describe, expect, test } from 'bun:test';

import type { AppData } from '../src/data/model';
import { getCountryRegionProgress } from '../src/places/filter';
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
const statuses: AppData['places'] = {
  [ontario.id]: 'visited',
  [quebec.id]: 'lived',
  [alberta.id]: 'wishlist',
  [japaneseRegion.id]: 'visited',
  'not-a-region': 'lived',
};

describe('country region progress', () => {
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
