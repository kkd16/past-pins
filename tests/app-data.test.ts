import { describe, expect, test } from 'bun:test';

import {
  changeHome,
  changePlaceStatus,
  defaultAppData,
  getPlaceStatus,
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
    data = changeHome(data, null);
    expect(data.homeCountryId).toBeNull();
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

  test('defaults and transitions do not share mutable preference objects', () => {
    const one = defaultAppData();
    one.preferences.haptics = false;
    expect(defaultAppData().preferences.haptics).toBe(true);
  });
});
