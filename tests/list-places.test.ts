import { getPlaceStatus } from '../src/data/model';
import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import { defaultAppData, type TravelList } from '../src/data/model';
import { getListStatistics } from '../src/lists/places';
import { getStaticPlace, searchStaticPlaces } from '../src/places/catalog';
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
    expect(searchStaticPlaces({ query: '', scope: 'country' })).toHaveLength(countries.length);
    expect(searchStaticPlaces({ query: '', scope: 'region' })).toHaveLength(subdivisions.length);
    expect(searchStaticPlaces({ query: '', scope: 'all' })).toHaveLength(
      countries.length + subdivisions.length,
    );
    expect(getStaticPlace('ca')).toEqual({
      id: 'ca',
      name: 'Canada',
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'country',
    });
    expect(getStaticPlace(ontario.id)).toEqual({
      id: ontario.id,
      name: ontario.name,
      countryId: 'ca',
      countryName: 'Canada',
      kind: 'region',
    });
    expect(getStaticPlace('unknown')).toBeUndefined();
  });

  test('ranks the exact country before regional aliases and parent-country matches', () => {
    const matches = searchStaticPlaces({ query: 'Canada', scope: 'all' });
    expect(matches[0]?.id).toBe('ca');
    expect(matches.slice(1).map(({ id }) => id)).toEqual([
      ontario.id,
      quebec.id,
      ...getCountrySubdivisions('ca').filter(({ id }) => id !== ontario.id && id !== quebec.id).map(({ id }) => id),
    ]);
    expect(
      searchStaticPlaces({ query: '  QUÉBEC   Canada ', scope: 'all' }).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchStaticPlaces({ query: 'Upper Canada', scope: 'all' }).map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
  });

  test('country browsing narrows any scope without changing a selection', () => {
    const selected = ['jp', 'ca', ontario.id, quebec.id];
    expect(searchStaticPlaces({ query: '', scope: 'all', countryId: 'ca' }).map(({ id }) => id)).toEqual([
      'ca',
      ...getCountrySubdivisions('ca').map(({ id }) => id),
    ]);
    expect(searchStaticPlaces({ query: '', scope: 'region', countryId: 'ca' })).toHaveLength(13);
    expect(searchStaticPlaces({ query: 'Ontario', scope: 'all', countryId: 'jp' })).toEqual([]);
    expect(searchStaticPlaces({ query: '', scope: 'all', countryId: 'unknown' })).toEqual([]);
    expect(searchStaticPlaces({ query: '', ids: selected, countryId: 'ca' }).map(({ id }) => id)).toEqual([
      'ca',
      ontario.id,
      quebec.id,
    ]);
    expect([...selected]).toEqual(['jp', 'ca', ontario.id, quebec.id]);
  });

  test('searches native names, accents, codes, and a region’s parent country', () => {
    expect(searchStaticPlaces({ query: '  CANADA ', scope: 'country' }).map(({ id }) => id)).toEqual([
      'ca',
    ]);
    expect(searchStaticPlaces({ query: '日本', scope: 'country' }).map(({ id }) => id)).toEqual(['jp']);
    expect(searchStaticPlaces({ query: 'ca-on', scope: 'region' }).map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(searchStaticPlaces({ query: 'Upper Canada', scope: 'region' }).map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(
      searchStaticPlaces({ query: '  QUÉBEC   Canada ', scope: 'region' }).map(({ id }) => id),
    ).toEqual([quebec.id]);
    expect(searchStaticPlaces({ query: 'Canada', scope: 'region' })).toHaveLength(13);
    expect(searchStaticPlaces({ query: 'no-such-place', scope: 'region' })).toEqual([]);
  });

  test('mixed progress follows country and region statuses independently', () => {
    const data = defaultAppData();
    data.places.ca = 'lived';
    data.places.jp = 'wishlist';
    data.places[ontario.id] = 'visited';
    const list: TravelList = {
      id: 'test',
      name: 'Places to explore',
      placeIds: ['ca', 'jp', ontario.id, quebec.id],
    };
    expect(getListStatistics(list, data)).toEqual({ visited: 2, total: 4 });
    expect(getPlaceStatus(data, quebec.id)).toBe('unvisited');
    delete data.places.ca;
    expect(getListStatistics(list, data)).toEqual({ visited: 1, total: 4 });
    expect(getListStatistics({ ...list, placeIds: [] }, data)).toEqual({
      visited: 0,
      total: 0,
    });
  });

  test('selected search keeps country and region queries consistent and sorts mixed results', () => {
    const selected = ['jp', quebec.id, 'ca', ontario.id, 'unknown'];
    expect(searchStaticPlaces({ query: '', ids: selected }).map(({ id }) => id)).toEqual([
      'ca',
      'jp',
      ontario.id,
      quebec.id,
    ]);
    expect(searchStaticPlaces({ query: 'Canada', ids: selected }).map(({ id }) => id)).toEqual([
      'ca',
      ontario.id,
      quebec.id,
    ]);
    expect(searchStaticPlaces({ query: 'Upper Canada', ids: selected }).map(({ id }) => id)).toEqual([
      ontario.id,
    ]);
    expect(searchStaticPlaces({ query: '  QUÉBEC  CA', ids: selected }).map(({ id }) => id)).toEqual([
      quebec.id,
    ]);
    expect(searchStaticPlaces({ query: '', ids: [] })).toEqual([]);
  });
});
