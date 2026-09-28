import { describe, expect, test } from 'bun:test';

import {
  changeHome,
  changePlaceStatus,
  defaultAppData,
  getPlaceStatus,
  isVisited,
} from '../src/data/model';
import { getCityParents } from '../src/cities';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';

const toronto = 'city:6167865';
const ontario = getCountrySubdivisions('ca').find((region) => region.code === 'CA-ON')!.id;
const quebec = getCountrySubdivisions('ca').find((region) => region.code === 'CA-QC')!.id;

describe('travel statuses', () => {
  test('wishlist, visited, and lived are exclusive; lived counts as visited', () => {
    let data = changePlaceStatus(defaultAppData(), ['ca'], 'wishlist');
    expect(isVisited(data.places.ca)).toBe(false);
    data = changePlaceStatus(data, ['ca'], 'visited');
    expect(data.places.ca).toBe('visited');
    data = changePlaceStatus(data, ['ca'], 'lived');
    expect(isVisited(data.places.ca)).toBe(true);
    data = changePlaceStatus(data, ['ca'], 'unvisited');
    expect(data.places).toEqual({});
    expect(getPlaceStatus(data, 'ca')).toBe('unvisited');
  });

  test('bulk mark-visited preserves lived while an explicit change downgrades it', () => {
    const lived = changePlaceStatus(defaultAppData(), [toronto], 'lived');
    expect(changePlaceStatus(lived, ['ca', ontario, toronto], 'visited')).toBe(lived);
    const visited = changePlaceStatus(lived, ['ca'], 'visited', false);
    expect(visited.places).toEqual({ ca: 'visited', [ontario]: 'visited', [toronto]: 'visited' });
  });

  test('city visits and residency promote every linked ancestor without lowering existing statuses', () => {
    expect(getCityParents(toronto)).toEqual({ countryId: 'ca', regionId: ontario });
    let data = changePlaceStatus(defaultAppData(), [toronto], 'visited');
    expect(data.places).toEqual({ ca: 'visited', [ontario]: 'visited', [toronto]: 'visited' });
    data = changePlaceStatus(data, [toronto], 'lived');
    expect(data.places).toEqual({ ca: 'lived', [ontario]: 'lived', [toronto]: 'lived' });
    data = changePlaceStatus(data, [quebec], 'visited');
    expect(data.places.ca).toBe('lived');
    expect(data.places[quebec]).toBe('visited');
  });

  test('cities without a region still promote and clear with their country', () => {
    const city = 'city:4568127';
    expect(getCityParents(city)).toEqual({ countryId: 'pr' });
    const data = changePlaceStatus(defaultAppData(), [city], 'visited');
    expect(data.places).toEqual({ [city]: 'visited', pr: 'visited' });
    expect(changePlaceStatus(data, ['pr'], 'unvisited').places).toEqual({});
  });

  test('wishlist and removing a city leave ancestors unchanged', () => {
    expect(changePlaceStatus(defaultAppData(), [toronto], 'wishlist').places).toEqual({ [toronto]: 'wishlist' });
    const lived = changePlaceStatus(defaultAppData(), [toronto], 'lived');
    const removed = changePlaceStatus(lived, [toronto], 'unvisited');
    expect(removed.places).toEqual({ ca: 'lived', [ontario]: 'lived' });
    const downgraded = changePlaceStatus(lived, [toronto], 'visited', false);
    expect(downgraded.places).toEqual({ ca: 'lived', [ontario]: 'lived', [toronto]: 'visited' });
  });

  test.each(['unvisited', 'wishlist'] as const)('changing a parent to %s clears visits but preserves wishlists and list membership', (status) => {
    const data = changePlaceStatus(defaultAppData(), [toronto], 'lived');
    data.places[quebec] = 'wishlist';
    data.lists.push({ id: 'trip', name: 'Canada', placeIds: [toronto, quebec] });
    const next = changePlaceStatus(data, ['ca'], status);
    expect(next.places).toEqual({ [quebec]: 'wishlist', ...(status === 'wishlist' ? { ca: 'wishlist' } : {}) });
    expect(next.lists).toBe(data.lists);
    expect(data.places[toronto]).toBe('lived');
  });

  test('clearing a region leaves country history and other region visits intact', () => {
    const data = changePlaceStatus(defaultAppData(), [toronto, quebec], 'visited');
    expect(changePlaceStatus(data, [ontario], 'unvisited').places).toEqual({ ca: 'visited', [quebec]: 'visited' });
  });

  test('mixed bulk updates are independent of target order', () => {
    const data = changePlaceStatus(defaultAppData(), [toronto], 'lived');
    for (const status of ['visited', 'wishlist', 'unvisited'] as const)
      expect(changePlaceStatus(data, [toronto, 'ca', ontario], status, false))
        .toEqual(changePlaceStatus(data, [ontario, 'ca', toronto], status, false));
  });

  test('home requires lived status and clearing home keeps travel history', () => {
    let data = changeHome(defaultAppData(), 'ca');
    data = changeHome(data, 'fr');
    expect(data.places).toEqual({ ca: 'lived', fr: 'lived' });
    const places = data.places;
    data = changeHome(data, null);
    expect(data.homeCountryId).toBeNull();
    expect(data.places).toBe(places);
    data = changeHome(data, 'ca');
    expect(changePlaceStatus(data, ['ca'], 'visited')).toBe(data);
    const next = changePlaceStatus(data, ['ca'], 'visited', false);
    expect(next.homeCountryId).toBeNull();
    expect(data.homeCountryId).toBe('ca');
  });

  test('fresh app data has independent preferences, places and lists; no-op edits preserve identity', () => {
    const one = defaultAppData();
    const two = defaultAppData();
    one.preferences.haptics = false;
    one.places.ca = 'visited';
    one.lists.push({ id: 'trip', name: 'Canada', placeIds: ['ca'] });
    expect(two).toEqual(defaultAppData());
    expect(changePlaceStatus(two, [], 'visited')).toBe(two);
    expect(changePlaceStatus(one, ['ca'], 'visited')).toBe(one);
  });
});
