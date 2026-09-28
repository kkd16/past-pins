import { describe, expect, test } from 'bun:test';

import { anywhere, getLocationFilters, getLocationLabel, locationForMode, locationParam, readPlaceLocation } from '../src/places/location';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

const washington = getCountrySubdivisions('us').find(({ code }) => code === 'US-WA')!;

describe('place locations', () => {
  test('a state resolves its actual country and all modes keep the nearest usable parent', () => {
    const location = readPlaceLocation(washington.id);
    expect(getLocationLabel(location)).toBe('Washington');
    expect(getLocationFilters(location)).toEqual({ countryId: 'us', regionId: washington.id });
    expect(locationForMode(location, 'cities')).toEqual(location);
    expect(locationForMode(location, 'regions')).toEqual({ kind: 'country', id: 'us' });
    expect(locationForMode(location, 'countries')).toEqual({ kind: 'continent', id: 'NA' });
    expect(locationForMode(readPlaceLocation('ca'), 'regions')).toEqual({ kind: 'country', id: 'ca' });
  });

  test('locations round-trip through one route parameter without conflicting filters', () => {
    for (const value of ['anywhere', 'ca', washington.id, 'continent:NA']) {
      expect(locationParam(readPlaceLocation(value))).toBe(value);
    }
    expect(getLocationFilters(readPlaceLocation('continent:NA')).countryIds).toContain('ca');
    expect(getLocationFilters(readPlaceLocation('continent:NA')).countryIds).not.toContain('jp');
    expect(getLocationFilters(readPlaceLocation('ca'))).toEqual({ countryId: 'ca' });
    expect(getLocationFilters(anywhere)).toEqual({});
    for (const value of [undefined, ['ca'], 42, 'city:6167865', 'continent:unknown']) {
      expect(readPlaceLocation(value)).toEqual(anywhere);
    }
  });
});
