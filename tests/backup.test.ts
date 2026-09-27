import { describe, expect, test } from 'bun:test';

import { countryIds } from '../src/countries/catalog';
import { decodeBackup, encodeBackup } from '../src/data/backup';
import {
  changeHome,
  defaultAppData,
  MAX_LIST_NAME_LENGTH,
} from '../src/data/model';
import { validateAppData } from '../src/data/validation';
import { t } from '../src/localization';
import { subdivisionIds } from '../src/subdivisions/catalog';

function countryOnlyData() {
  const { places, homeCountryId, preferences } = changeHome(
    defaultAppData(),
    'ca',
  );
  return { places, homeCountryId, preferences };
}

describe('current backup format', () => {
  test('round trips every catalog country and region, home, and all preferences', () => {
    const data = changeHome(defaultAppData(), 'ca');
    data.onboardingCompleted = true;
    for (const id of countryIds) data.places[id] = 'lived';
    for (const id of subdivisionIds) data.subdivisions[id] = 'visited';
    data.places.fr = 'wishlist';
    data.places.jp = 'visited';
    data.lists = [
      {
        id: 'list-one',
        name: 'Everywhere',
        placeIds: [...countryIds, ...subdivisionIds],
      },
      { id: 'list-two', name: 'Some day', placeIds: [] },
    ];
    data.preferences = {
      mapView: 'map',
      countryLabels: false,
      mapSummary: false,
      haptics: false,
      countryArrivalAlerts: true,
      countryGrouping: 'alphabetical',
    };
    const encoded = encodeBackup(data);
    expect(JSON.parse(encoded)).toEqual({ app: 'past-pins', version: 1, data });
    expect(decodeBackup(encoded)).toEqual(data);
  });

  test('returns independent data objects', () => {
    const data = defaultAppData();
    data.lists.push({ id: 'list-one', name: 'Next trip', placeIds: ['ca'] });
    const parsed = validateAppData(data);
    parsed.preferences.haptics = false;
    parsed.places.ca = 'wishlist';
    parsed.subdivisions[[...subdivisionIds][0]] = 'visited';
    parsed.lists[0].name = 'Changed';
    parsed.lists[0].placeIds.push('fr');
    parsed.lists.push({ id: 'list-two', name: 'New', placeIds: [] });
    expect(data).toEqual({
      ...defaultAppData(),
      lists: [{ id: 'list-one', name: 'Next trip', placeIds: ['ca'] }],
    });
  });

  test('rejects non-JSON input', () => {
    expect(() => decodeBackup('this is not JSON')).toThrow(t('common.errors.invalidJson'));
  });

  test('requires a boolean onboarding flag in the current snapshot and backup', () => {
    const { onboardingCompleted: _completed, ...data } = defaultAppData();
    expect(() => validateAppData(data)).toThrow();
    for (const onboardingCompleted of [undefined, null, 0, 'true']) {
      expect(() => decodeBackup(JSON.stringify({
        app: 'past-pins', version: 1, data: { ...data, onboardingCompleted },
      }))).toThrow();
    }
    for (const onboardingCompleted of [false, true]) {
      const snapshot = { ...data, onboardingCompleted };
      expect(decodeBackup(encodeBackup(snapshot))).toEqual(snapshot);
    }
  });

  test('requires region data even when the backup version matches', () => {
    const data = countryOnlyData();
    expect(() =>
      decodeBackup(JSON.stringify({ app: 'past-pins', version: 1, data })),
    ).toThrow();
  });

  test('requires lists even when a country and region backup version matches', () => {
    const { lists: _lists, ...data } = defaultAppData();
    expect(() =>
      decodeBackup(JSON.stringify({ app: 'past-pins', version: 1, data })),
    ).toThrow();
  });

  test('rejects malformed lists, duplicate IDs or members, and unknown references', () => {
    const valid = { id: 'list-one', name: 'Next trip', placeIds: ['ca'] };
    for (const lists of [
      undefined,
      null,
      {},
      [null],
      [{ ...valid, extra: true }],
      [{ ...valid, id: '' }],
      [{ ...valid, id: 'with space' }],
      [valid, { ...valid, name: 'Another' }],
      [{ ...valid, name: '' }],
      [{ ...valid, name: '   ' }],
      [{ ...valid, name: ' Next trip ' }],
      [{ ...valid, name: 'Two\nlines' }],
      [{ ...valid, name: 'x'.repeat(MAX_LIST_NAME_LENGTH + 1) }],
      [{ ...valid, placeIds: null }],
      [{ ...valid, placeIds: ['ca', 'ca'] }],
      [{ ...valid, placeIds: ['ca', 'unknown'] }],
      [{ ...valid, placeIds: ['ca', null] }],
    ])
      expect(() => validateAppData({ ...defaultAppData(), lists })).toThrow();
  });

  test('only accepts the exact current backup envelope and schema', () => {
    const data = defaultAppData();
    for (const envelope of [
      { app: 'another-app', version: 1, data },
      { app: 'past-pins', version: 0, data },
      { app: 'past-pins', version: 2, data },
      { app: 'past-pins', version: 3, data },
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

  test('rejects unknown regions, invalid statuses, and malformed region records', () => {
    const id = [...subdivisionIds][0];
    for (const subdivisions of [
      { unknown: 'visited' },
      { ca: 'visited' },
      { [id]: 'unvisited' },
      { [id]: null },
      { [id]: true },
      [id],
      null,
      undefined,
    ])
      expect(() =>
        validateAppData({ ...defaultAppData(), subdivisions }),
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
      { countryArrivalAlerts: undefined },
      { countryArrivalAlerts: 'true' },
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
