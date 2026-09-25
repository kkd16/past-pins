import { describe, expect, test } from 'bun:test';

import { countries } from '../src/countries/catalog';
import type { Country } from '../src/countries/types';
import { defaultAppData, type AppData } from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { selectStampCountries } from '../src/stamps/collection';
import { subdivisionIds } from '../src/subdivisions/catalog';

const ids = (members: readonly Country[]) => members.map(({ id }) => id);
const places: AppData['places'] = {
  ca: 'lived',
  ci: 'visited',
  de: 'visited',
  jp: 'wishlist',
};

describe('stamp collection', () => {
  test('visited and lived collect one stamp each; wishlist and unmarked remain', () => {
    const collected = selectStampCountries(places, '', 'collected');
    const remaining = selectStampCountries(places, '', 'remaining');
    expect(ids(collected)).toEqual(['ca', 'ci', 'de']);
    expect(ids(remaining)).toContain('jp');
    expect(ids(remaining)).toContain('us');
    expect([...ids(collected), ...ids(remaining)].sort()).toEqual(
      ids(countries).sort(),
    );
    expect(selectStampCountries(places, '', 'all')).toEqual([...countries]);
  });

  test('country name, native name, accent and code search intersect collection scope', () => {
    expect(ids(selectStampCountries(places, ' COTE ', 'collected'))).toEqual([
      'ci',
    ]);
    expect(selectStampCountries(places, 'Côte', 'remaining')).toEqual([]);
    expect(
      ids(selectStampCountries(places, 'Deutschland', 'collected')),
    ).toEqual(['de']);
    expect(ids(selectStampCountries(places, '日本', 'remaining'))).toEqual([
      'jp',
    ]);
    expect(ids(selectStampCountries(places, 'xk', 'all'))).toEqual(['xk']);
    expect(selectStampCountries(places, 'no-such-country', 'all')).toEqual([]);
  });

  test('unknown country or region IDs cannot add stamps', () => {
    const collected = selectStampCountries(
      { ...places, unknown: 'visited', 'ne:unknown-region': 'lived' },
      '',
      'collected',
    );
    expect(ids(collected)).toEqual(['ca', 'ci', 'de']);
  });

  test('empty and complete collections keep all catalog entries reachable', () => {
    expect(selectStampCountries({}, '', 'collected')).toEqual([]);
    expect(selectStampCountries({}, '', 'remaining')).toEqual([...countries]);
    const complete = Object.fromEntries(
      countries.map(({ id }) => [id, 'visited' as const]),
    );
    expect(selectStampCountries(complete, '', 'collected')).toEqual([
      ...countries,
    ]);
    expect(selectStampCountries(complete, '', 'remaining')).toEqual([]);
  });

  test('existing visits, edits, Undo, home, restore and clear derive stamps from country statuses', async () => {
    const saved: AppData = { ...defaultAppData(), places: { fr: 'visited' } };
    const store = createAppDataStore(
      {
        async load() {
          return saved;
        },
        async save() {},
        async clear() {},
      },
      {
        async confirmHomeChange() {
          return true;
        },
      },
    );
    const collected = () =>
      ids(
        selectStampCountries(store.getSnapshot().data.places, '', 'collected'),
      );
    await store.load();
    expect(collected()).toEqual(['fr']);
    await store.setStatus(['jp'], 'visited');
    expect(collected()).toEqual(['fr', 'jp']);
    await store.setStatus(['jp'], 'wishlist');
    expect(collected()).toEqual(['fr']);
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(collected()).toEqual(['fr', 'jp']);
    await store.setSubdivisionStatus([[...subdivisionIds][0]], 'visited');
    expect(collected()).toEqual(['fr', 'jp']);
    store.setHome('ca');
    expect(collected()).toEqual(['ca', 'fr', 'jp']);
    await store.restore({ ...defaultAppData(), places: { de: 'lived' } });
    expect(collected()).toEqual(['de']);
    await store.clearTravel();
    expect(collected()).toEqual([]);
  });
});
