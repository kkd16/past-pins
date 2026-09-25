import { describe, expect, test } from 'bun:test';

import {
  changeHome,
  changePlaceStatus,
  changeSubdivisionStatus,
  defaultAppData,
  getPlaceStatus,
  getSubdivisionStatus,
  isVisited,
} from '../src/data/model';

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

  test('ordinary and bulk mark-visited actions preserve lived status', () => {
    let data = changePlaceStatus(defaultAppData(), ['ca'], 'lived');
    data = changePlaceStatus(data, ['ca', 'fr'], 'visited');
    expect(data.places).toEqual({ ca: 'lived', fr: 'visited' });
    expect(changePlaceStatus(data, ['ca'], 'visited', false).places.ca).toBe(
      'visited',
    );
  });

  test('home promotes a place to lived and keeps previous lived places', () => {
    let data = changePlaceStatus(defaultAppData(), ['ca'], 'wishlist');
    data = changeHome(data, 'ca');
    expect(data.places.ca).toBe('lived');
    data = changeHome(data, 'fr');
    expect(data.places).toEqual({ ca: 'lived', fr: 'lived' });
    expect(data.homeCountryId).toBe('fr');
    const places = data.places;
    data = changeHome(data, 'ca');
    expect(data.homeCountryId).toBe('ca');
    expect(data.places).toBe(places);
    data = changeHome(data, null);
    expect(data.homeCountryId).toBeNull();
    expect(data.places).toBe(places);
    expect(data.places).toEqual({ ca: 'lived', fr: 'lived' });
  });

  test('downgrading home clears it in the same state transition', () => {
    const data = changeHome(defaultAppData(), 'ca');
    expect(changePlaceStatus(data, ['ca'], 'visited')).toBe(data);
    const next = changePlaceStatus(data, ['ca'], 'visited', false);
    expect(next.homeCountryId).toBeNull();
    expect(next.places.ca).toBe('visited');
    expect(data.homeCountryId).toBe('ca');
    expect(data.places.ca).toBe('lived');
  });

  test('fresh app data has independent preferences and places', () => {
    const one = defaultAppData();
    const two = defaultAppData();
    one.preferences.haptics = false;
    one.places.ca = 'visited';
    one.subdivisions['region-a'] = 'visited';
    one.lists.push({ id: 'list-one', name: 'Next trip', placeIds: ['ca'] });
    expect(two.preferences.haptics).toBe(true);
    expect(two.places).toEqual({});
    expect(two.subdivisions).toEqual({});
    expect(two.lists).toEqual([]);
  });

  test('regions have exclusive statuses and preserve lived during mark-visited', () => {
    let data = changeSubdivisionStatus(
      defaultAppData(),
      ['region-a'],
      'wishlist',
    );
    expect(getSubdivisionStatus(data, 'region-a')).toBe('wishlist');
    expect(isVisited(data.subdivisions['region-a'])).toBe(false);
    data = changeSubdivisionStatus(data, ['region-a'], 'lived');
    expect(isVisited(data.subdivisions['region-a'])).toBe(true);
    expect(changeSubdivisionStatus(data, ['region-a'], 'visited')).toBe(data);
    data = changeSubdivisionStatus(data, ['region-a', 'region-b'], 'visited');
    expect(data.subdivisions).toEqual({
      'region-a': 'lived',
      'region-b': 'visited',
    });
    data = changeSubdivisionStatus(data, ['region-a'], 'visited', false);
    expect(data.subdivisions['region-a']).toBe('visited');
    data = changeSubdivisionStatus(data, ['region-a'], 'unvisited');
    expect(data.subdivisions).toEqual({ 'region-b': 'visited' });
    expect(getSubdivisionStatus(data, 'region-a')).toBe('unvisited');
    expect(changeSubdivisionStatus(data, [], 'visited')).toBe(data);
  });

  test('region changes and country changes leave one another independent', () => {
    const initial = changeHome(defaultAppData(), 'ca');
    const regions = changeSubdivisionStatus(initial, ['region-a'], 'lived');
    expect(regions.places).toBe(initial.places);
    expect(regions.homeCountryId).toBe('ca');
    expect(initial.subdivisions).toEqual({});
    const countries = changePlaceStatus(regions, ['ca'], 'unvisited');
    expect(countries.places).toEqual({});
    expect(countries.homeCountryId).toBeNull();
    expect(countries.subdivisions).toBe(regions.subdivisions);
  });
});
