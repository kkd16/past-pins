import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import { defaultAppData, type TravelList } from '../src/data/model';
import { getListStatistics } from '../src/lists/places';
import { getPlace, getPlaceStatus, searchPlaces } from '../src/places/catalog';
import {
  getCountrySubdivisions,
  subdivisions,
} from '../src/subdivisions/catalog';

const ontario = getCountrySubdivisions('ca').find(
  (region) => region.code === 'CA-ON',
)!;
const quebec = getCountrySubdivisions('ca').find(
  (region) => region.code === 'CA-QC',
)!;

describe('custom list places', () => {
  test('resolves countries and regions from the full generated catalogs', () => {
    expect(searchPlaces('', 'country')).toHaveLength(countries.length);
    expect(searchPlaces('', 'region')).toHaveLength(subdivisions.length);
    expect(searchPlaces('', 'all')).toHaveLength(
      countries.length + subdivisions.length,
    );
    expect(getPlace('ca')).toEqual({
      id: 'ca',
      name: 'Canada',
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'country',
    });
    expect(getPlace(ontario.id)).toEqual({
      id: ontario.id,
      name: ontario.name,
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'region',
    });
    expect(getPlace('unknown')).toBeUndefined();
  });

  test('finds a country and its regions together, with countries first', () => {
    const matches = searchPlaces('Canada', 'all');
    expect(matches[0]?.id).toBe('ca');
    expect(matches.slice(1).map(({ id }) => id)).toEqual(
      getCountrySubdivisions('ca').map(({ id }) => id),
    );
    expect(
      searchPlaces('  QUÉBEC   Canada ', 'all').map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchPlaces('Upper Canada', 'all').map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
  });

  test('country browsing narrows any scope without changing a selection', () => {
    const selected = new Set(['jp', 'ca', ontario.id, quebec.id]);
    expect(searchPlaces('', 'all', 'ca').map(({ id }) => id)).toEqual([
      'ca',
      ...getCountrySubdivisions('ca').map(({ id }) => id),
    ]);
    expect(searchPlaces('', 'region', 'ca')).toHaveLength(13);
    expect(searchPlaces('Ontario', 'all', 'jp')).toEqual([]);
    expect(searchPlaces('', 'all', 'unknown')).toEqual([]);
    expect(searchPlaces('', selected, 'ca').map(({ id }) => id)).toEqual([
      'ca',
      ontario.id,
      quebec.id,
    ]);
    expect([...selected]).toEqual(['jp', 'ca', ontario.id, quebec.id]);
  });

  test('searches native names, accents, codes, and a region’s parent country', () => {
    expect(searchPlaces('  CANADA ', 'country').map(({ id }) => id)).toEqual([
      'ca',
    ]);
    expect(searchPlaces('日本', 'country').map(({ id }) => id)).toEqual(['jp']);
    expect(searchPlaces('ca-on', 'region').map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(searchPlaces('Upper Canada', 'region').map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(
      searchPlaces('  QUÉBEC   Canada ', 'region').map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchPlaces('Canada', 'region')).toHaveLength(13);
    expect(searchPlaces('no-such-place', 'region')).toEqual([]);
  });

  test('mixed progress follows country and region statuses independently', () => {
    const data = defaultAppData();
    data.places.ca = 'lived';
    data.places.jp = 'wishlist';
    data.subdivisions[ontario.id] = 'visited';
    const list: TravelList = {
      id: 'test',
      name: 'Places to explore',
      placeIds: ['ca', 'jp', ontario.id, quebec.id],
    };
    expect(getListStatistics(list, data)).toEqual({ visited: 2, total: 4 });
    expect(getPlaceStatus(data, getPlace(quebec.id)!)).toBe('unvisited');
    delete data.places.ca;
    expect(getListStatistics(list, data)).toEqual({ visited: 1, total: 4 });
    expect(getListStatistics({ ...list, placeIds: [] }, data)).toEqual({
      visited: 0,
      total: 0,
    });
  });

  test('selected search keeps country and region queries consistent and sorts mixed results', () => {
    const selected = new Set(['jp', quebec.id, 'ca', ontario.id, 'unknown']);
    expect(searchPlaces('', selected).map(({ id }) => id)).toEqual([
      'ca',
      'jp',
      ontario.id,
      quebec.id,
    ]);
    expect(searchPlaces('Canada', selected).map(({ id }) => id)).toEqual([
      'ca',
      ontario.id,
      quebec.id,
    ]);
    expect(searchPlaces('Upper Canada', selected).map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(searchPlaces('  QUÉBEC  CA', selected).map(({ id }) => id)).toEqual([
      quebec.id,
    ]);
    expect(searchPlaces('', new Set())).toEqual([]);
  });
});
