import { describe, expect, test } from 'bun:test';

import { countryIds } from '../src/countries/catalog';
import { decodeDocument, encodeDocument } from '../src/data/document';
import {
  changeHome,
  defaultAppData,
  MAX_LIST_NAME_LENGTH,
} from '../src/data/model';
import { validateAppData } from '../src/data/validation';
import { subdivisionIds } from '../src/subdivisions/catalog';
import empty from './fixtures/data/v1-empty.json';
import populated from './fixtures/data/v1-populated.json';

describe('current backup format', () => {
  test('current fixtures round trip through the shared storage and import format', () => {
    expect<unknown>(defaultAppData()).toEqual(empty.data);
    for (const fixture of [empty, populated]) {
      const original = JSON.stringify(fixture);
      const data = decodeDocument(original);
      expect<unknown>(data).toEqual(fixture.data);
      expect(decodeDocument(encodeDocument(data))).toEqual(data);
      expect(decodeDocument(encodeDocument(data, true))).toEqual(data);
      expect(JSON.stringify(fixture)).toBe(original);
    }
  });

  test('round trips every catalog country and region, home, and all preferences', () => {
    const data = changeHome(defaultAppData(), 'ca');
    data.onboardingCompleted = true;
    for (const id of countryIds) data.places[id] = 'lived';
    for (const id of subdivisionIds) data.places[id] = 'visited';
    data.places['city:6167865'] = 'visited';
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
    const encoded = encodeDocument(data);
    expect(JSON.parse(encoded)).toEqual({ app: 'past-pins', schemaVersion: 1, data });
    expect(decodeDocument(encoded)).toEqual(data);
  });

  test('returns independent data objects', () => {
    const data = defaultAppData();
    data.lists.push({ id: 'list-one', name: 'Next trip', placeIds: ['ca'] });
    const parsed = validateAppData(data);
    parsed.preferences.haptics = false;
    parsed.places.ca = 'wishlist';
    parsed.places[[...subdivisionIds][0]] = 'visited';
    parsed.lists[0].name = 'Changed';
    parsed.lists[0].placeIds.push('fr');
    parsed.lists.push({ id: 'list-two', name: 'New', placeIds: [] });
    expect(data).toEqual({
      ...defaultAppData(),
      lists: [{ id: 'list-one', name: 'Next trip', placeIds: ['ca'] }],
    });
  });

  test('rejects non-JSON input', () => {
    expect(() => decodeDocument('this is not JSON')).toThrow('invalid-document');
  });

  test('requires a boolean onboarding flag in the current snapshot and backup', () => {
    const { onboardingCompleted: _completed, ...data } = defaultAppData();
    expect(() => validateAppData(data)).toThrow();
    for (const onboardingCompleted of [undefined, null, 0, 'true']) {
      expect(() => decodeDocument(JSON.stringify({
        app: 'past-pins', schemaVersion: 1, data: { ...data, onboardingCompleted },
      }))).toThrow();
    }
    for (const onboardingCompleted of [false, true]) {
      const snapshot = { ...data, onboardingCompleted };
      expect(decodeDocument(encodeDocument(snapshot))).toEqual(snapshot);
    }
  });

  test('requires one unified status map without separate region state', () => {
    const data = defaultAppData();
    expect(() => validateAppData({ ...data, subdivisions: {} })).toThrow();
    const { places: _places, ...missing } = data;
    expect(() => validateAppData(missing)).toThrow();
  });

  test('requires lists in a v1 document', () => {
    const { lists: _lists, ...data } = defaultAppData();
    expect(() =>
      decodeDocument(JSON.stringify({ app: 'past-pins', schemaVersion: 1, data })),
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
      { app: 'another-app', schemaVersion: 1, data },
      { app: 'past-pins', schemaVersion: 0, data },
      { app: 'past-pins', schemaVersion: 2, data },
      { app: 'past-pins', schemaVersion: 3, data },
      { app: 'past-pins', schemaVersion: 1, data, future: true },
      data,
      { visited: ['ca'] },
    ])
      expect(() => decodeDocument(JSON.stringify(envelope))).toThrow();
  });

  test('rejects unknown places, invalid statuses, and inconsistent home', () => {
    for (const patch of [
      { places: { unknown: 'visited' } },
      { places: { ca: 'unvisited' } },
      { places: { ca: null } },
      { places: ['ca'] },
      { places: { ca: 'visited' }, homePlaceId: 'ca' },
      { homePlaceId: 'fr' },
      { homePlaceId: false },
    ])
      expect(() =>
        validateAppData({ ...defaultAppData(), ...patch }),
      ).toThrow();
  });

  test('rejects unknown cities and inconsistent parent status without repairing the document', () => {
    for (const places of [
      { 'city:999999999': 'visited' },
      { 'city:6167865': 'visited' },
      { 'city:6167865': 'lived', 'ne:1159309687': 'visited', ca: 'lived' },
      { 'ne:1159309687': 'visited' },
      { 'ne:1159309687': 'lived', ca: 'visited' },
    ]) expect(() => validateAppData({ ...defaultAppData(), places })).toThrow();
    const places = { 'city:6167865': 'visited', 'ne:1159309687': 'visited', ca: 'lived' } as const;
    expect(validateAppData({ ...defaultAppData(), places }).places).toEqual(places);
    expect(() => validateAppData({ ...defaultAppData(), places, homePlaceId: 'city:6167865' })).toThrow();
  });

  test('defaults omitted preference fields', () => {
    const preferences = populated.data.preferences;
    for (const key of Object.keys(preferences)) {
      const partial: Record<string, unknown> = { ...preferences };
      delete partial[key];
      expect<unknown>(decodeDocument(JSON.stringify({
        ...populated, data: { ...populated.data, preferences: partial },
      }))).toEqual({
        ...populated.data,
        preferences: { ...defaultAppData().preferences, ...partial },
      });
    }
    expect<unknown>(decodeDocument(JSON.stringify({
      ...populated, data: { ...populated.data, preferences: {} },
    }))).toEqual({ ...populated.data, preferences: defaultAppData().preferences });
  });

  test('requires a preferences object', () => {
    for (const preferences of [undefined, null, false, [], 'defaults']) {
      expect(() => decodeDocument(JSON.stringify({
        ...populated, data: { ...populated.data, preferences },
      }))).toThrow('invalid-document');
    }
  });

  test('rejects invalid preference values and extra fields', () => {
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

test.each(['ca', 'ne:1159309687', 'city:6167865'])('backup and saved-file decoder round trip home %s', (id) => {
  const data = changeHome(defaultAppData(), id);
  expect(decodeDocument(encodeDocument(data))).toEqual(data);
  expect(() => encodeDocument({ ...data, homePlaceId: 'city:999999999' })).toThrow();
  expect(() => encodeDocument({ ...data, places: { ...data.places, [id]: 'visited' } })).toThrow();
});
