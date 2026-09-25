import { describe, expect, test } from 'bun:test';

import { countryIds } from '../src/countries/catalog';
import { decodeBackup, encodeBackup } from '../src/data/backup';
import { changeHome, defaultAppData } from '../src/data/model';
import { validateAppData } from '../src/data/validation';

describe('current backup format', () => {
  test('round trips every catalog place, current home, and all preferences', () => {
    const data = changeHome(defaultAppData(), 'ca');
    for (const id of countryIds) data.places[id] = 'lived';
    data.places.fr = 'wishlist';
    data.places.jp = 'visited';
    data.preferences = {
      mapView: 'map',
      countryLabels: false,
      mapSummary: false,
      haptics: false,
      countryGrouping: 'alphabetical',
    };
    const encoded = encodeBackup(data);
    expect(JSON.parse(encoded)).toEqual({ app: 'past-pins', version: 1, data });
    expect(decodeBackup(encoded)).toEqual(data);
  });

  test('returns independent data objects', () => {
    const data = defaultAppData();
    const parsed = validateAppData(data);
    parsed.preferences.haptics = false;
    parsed.places.ca = 'wishlist';
    expect(data).toEqual(defaultAppData());
  });

  test('rejects non-JSON input', () => {
    expect(() => decodeBackup('this is not JSON')).toThrow('valid JSON');
  });

  test('only accepts the exact current backup envelope', () => {
    const data = defaultAppData();
    for (const envelope of [
      { app: 'another-app', version: 1, data },
      { app: 'past-pins', version: 0, data },
      { app: 'past-pins', version: 2, data },
      { app: 'past-pins', version: 1, data, future: true },
      data,
      { visited: ['ca'] },
    ])
      expect(() => decodeBackup(JSON.stringify(envelope))).toThrow();
  });

  test('rejects unknown places, invalid statuses, and inconsistent home', () => {
    for (const patch of [
      { places: { unknown: 'visited' } },
      { places: { ca: 'unvisited' } },
      { places: { ca: null } },
      { places: ['ca'] },
      { places: { ca: 'visited' }, homeCountryId: 'ca' },
      { homeCountryId: 'fr' },
      { homeCountryId: false },
    ])
      expect(() =>
        validateAppData({ ...defaultAppData(), ...patch }),
      ).toThrow();
  });

  test('requires complete valid preferences without extra fields', () => {
    const data = defaultAppData();
    for (const patch of [
      { mapView: 'satellite' },
      { haptics: 1 },
      { countryLabels: undefined },
      { countryGrouping: 'recent' },
      { mapSummary: null },
      { extra: true },
    ])
      expect(() =>
        validateAppData({
          ...data,
          preferences: { ...data.preferences, ...patch },
        }),
      ).toThrow();
    expect(() => validateAppData({ ...data, extra: true })).toThrow();
  });
});
