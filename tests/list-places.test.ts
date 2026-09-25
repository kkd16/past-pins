import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import { defaultAppData, type TravelList } from '../src/data/model';
import {
  getListPlace,
  getListPlaceStatus,
  getListStatistics,
  searchListPlaces,
} from '../src/lists/places';
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
    expect(searchListPlaces('', 'country')).toHaveLength(countries.length);
    expect(searchListPlaces('', 'region')).toHaveLength(subdivisions.length);
    expect(getListPlace('ca')).toEqual({
      id: 'ca',
      name: 'Canada',
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'country',
    });
    expect(getListPlace(ontario.id)).toEqual({
      id: ontario.id,
      name: ontario.name,
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'region',
    });
    expect(getListPlace('unknown')).toBeUndefined();
  });

  test('searches native names, accents, codes, and a region’s parent country', () => {
    expect(
      searchListPlaces('  CANADA ', 'country').map(({ id }) => id),
    ).toEqual(['ca']);
    expect(searchListPlaces('日本', 'country').map(({ id }) => id)).toEqual([
      'jp',
    ]);
    expect(searchListPlaces('ca-on', 'region').map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(
      searchListPlaces('Upper Canada', 'region').map(({ id }) => id),
    ).toEqual([ontario.id]);
    expect(
      searchListPlaces('  QUÉBEC   Canada ', 'region').map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchListPlaces('Canada', 'region')).toHaveLength(13);
    expect(searchListPlaces('no-such-place', 'region')).toEqual([]);
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
    expect(getListPlaceStatus(data, getListPlace(quebec.id)!)).toBe(
      'unvisited',
    );
    delete data.places.ca;
    expect(getListStatistics(list, data)).toEqual({ visited: 1, total: 4 });
    expect(getListStatistics({ ...list, placeIds: [] }, data)).toEqual({
      visited: 0,
      total: 0,
    });
  });

  test('selected search keeps country and region queries consistent and sorts mixed results', () => {
    const selected = new Set(['jp', quebec.id, 'ca', ontario.id, 'unknown']);
    expect(searchListPlaces('', selected).map(({ id }) => id)).toEqual([
      'ca',
      'jp',
      ontario.id,
      quebec.id,
    ]);
    expect(searchListPlaces('Canada', selected).map(({ id }) => id)).toEqual([
      'ca',
      ontario.id,
      quebec.id,
    ]);
    expect(
      searchListPlaces('Upper Canada', selected).map(({ id }) => id),
    ).toEqual([ontario.id]);
    expect(
      searchListPlaces('  QUÉBEC  CA', selected).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchListPlaces('', new Set())).toEqual([]);
  });
});
