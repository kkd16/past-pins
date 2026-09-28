import { describe, expect, test } from 'bun:test';

import {
  defaultAppData,
  MAX_LIST_NAME_LENGTH,
  type AppData,
} from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { t } from '../src/localization';
import { getCountrySubdivisions } from '../src/subdivisions/catalog';
import {
  createDocumentStorage,
  type AppStorage,
} from '../src/storage/document-storage';

const [regionOne, regionTwo] = getCountrySubdivisions('ca').map(({ id }) => id);

function fixture() {
  const values = new Map<string, string>();
  let writeFailure = false;
  let confirm = true;
  let confirmations = 0;
  let writes = 0;
  const feedback: boolean[] = [];
  const storage = createDocumentStorage({
    async clear() {
      if (writeFailure) throw new Error('Write failed');
      values.clear();
    },
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      writes++;
      if (writeFailure) throw new Error('Write failed');
      values.set(key, value);
    },
  });
  const store = createAppDataStore(storage, {
    async confirmStatusChange() {
      confirmations++;
      return confirm;
    },
    feedback: (enabled) => feedback.push(enabled),
  });
  return {
    store,
    storage,
    feedback,
    failWrites: (value: boolean) => {
      writeFailure = value;
    },
    confirmHome: (value: boolean) => {
      confirm = value;
    },
    confirmations: () => confirmations,
    writes: () => writes,
  };
}

async function settle(storage: AppStorage) {
  await storage.load();
  await Promise.resolve();
}

describe('app data owner', () => {
  test('onboarding publishes completion and the reminder choice only after one saved snapshot', async () => {
    const f = fixture();
    await f.store.load();
    const gate = Promise.withResolvers<void>();
    const save = f.storage.save;
    f.storage.save = async (data) => { await gate.promise; await save(data); };
    const finishing = f.store.completeOnboarding(true);
    expect(f.store.getSnapshot()).toMatchObject({
      busy: true,
      data: { onboardingCompleted: false, preferences: { countryArrivalAlerts: false } },
    });
    await expect(f.store.completeOnboarding(false)).rejects.toThrow('not ready');
    gate.resolve();
    await finishing;
    expect(f.writes()).toBe(1);
    expect(f.store.getSnapshot()).toMatchObject({
      busy: false,
      data: { onboardingCompleted: true, preferences: { countryArrivalAlerts: true } },
    });
    const reopened = createAppDataStore(f.storage, { confirmStatusChange: async () => true });
    await reopened.load();
    expect(reopened.getSnapshot().data.onboardingCompleted).toBe(true);
    await f.store.completeOnboarding(false);
    expect(f.writes()).toBe(1);
    expect(f.store.getSnapshot().data.preferences.countryArrivalAlerts).toBe(true);
  });

  test.each([false, true])('failed onboarding save preserves state and retries the %s reminder choice', async (alerts) => {
    const f = fixture();
    await f.store.load();
    f.failWrites(true);
    await expect(f.store.completeOnboarding(alerts)).rejects.toThrow('storage-write');
    expect(f.store.getSnapshot()).toMatchObject({ busy: false, data: defaultAppData() });
    expect(await f.storage.load()).toEqual(defaultAppData());
    f.failWrites(false);
    await f.store.completeOnboarding(alerts);
    expect(await f.storage.load()).toMatchObject({
      onboardingCompleted: true, preferences: { countryArrivalAlerts: alerts },
    });
  });

  test('only full reset clears a completed welcome', async () => {
    const f = fixture();
    await expect(f.store.completeOnboarding(false)).rejects.toThrow('not ready');
    await f.store.load();
    await f.store.completeOnboarding(false);
    await f.store.setStatus(['ca'], 'visited');
    expect(f.store.getSnapshot().data.onboardingCompleted).toBe(true);
    await f.store.resetPreferences();
    await f.store.clearTravel();
    await f.store.restore(defaultAppData());
    expect((await f.storage.load()).onboardingCompleted).toBe(true);
    await f.store.resetApp();
    expect(f.store.getSnapshot().data.onboardingCompleted).toBe(false);
    expect((await f.storage.load()).onboardingCompleted).toBe(false);
  });

  test('restore validates the incoming welcome flag before preserving completion', async () => {
    const f = fixture();
    await f.store.load();
    await f.store.completeOnboarding(false);
    const before = f.store.getSnapshot();
    const writes = f.writes();
    for (const onboardingCompleted of [undefined, null, 0, 'true']) {
      const invalid = { ...defaultAppData(), onboardingCompleted } as unknown as AppData;
      await expect(f.store.restore(invalid)).rejects.toThrow();
      expect(f.store.getSnapshot()).toBe(before);
    }
    expect(f.writes()).toBe(writes);
  });

  test('complete reset waits for writes, blocks edits, and starts fresh', async () => {
    const f = fixture();
    await f.store.load();
    const gate = Promise.withResolvers<void>();
    const save = f.storage.save;
    f.storage.save = async (data) => {
      await gate.promise;
      await save(data);
    };
    f.store.setHome('ca');
    const listId = f.store.createList('Next trip', ['ca', regionOne])!;
    await f.store.setStatus([regionOne], 'visited');
    f.store.updatePreferences({ mapView: 'map', haptics: false });
    const resetting = f.store.resetApp();
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(await f.store.setStatus(['fr'], 'visited')).toBe(false);
    expect(await f.store.setStatus([regionTwo], 'visited')).toBe(
      false,
    );
    expect(f.store.createList('Blocked')).toBeNull();
    expect(f.store.renameList(listId, 'Blocked')).toBe(false);
    expect(f.store.setListPlaces(listId, ['fr'])).toBe(false);
    expect(f.store.toggleListPlace(listId, 'fr')).toBe(false);
    expect(f.store.deleteList(listId)).toBe(false);
    await expect(f.store.resetApp()).rejects.toThrow('not ready');
    gate.resolve();
    await resetting;
    expect(f.store.getSnapshot()).toMatchObject({
      data: defaultAppData(),
      status: 'ready',
      busy: false,
      saveError: false,
      resetVersion: 1,
    });
    expect(await f.storage.load()).toEqual(defaultAppData());
    f.store.setHome('jp');
    await settle(f.storage);
    expect((await f.storage.load()).homeCountryId).toBe('jp');
  });

  test('failed reset retains live data, and can be retried', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    await settle(f.storage);
    const before = f.store.getSnapshot();
    f.failWrites(true);
    await expect(f.store.resetApp()).rejects.toThrow('reset-failed');
    expect(f.store.getSnapshot()).toEqual(before);
    expect(await f.storage.load()).toEqual(before.data);
    f.failWrites(false);
    await f.store.resetApp();
    expect(await f.storage.load()).toEqual(defaultAppData());
  });

  test('complete reset recovers from unreadable saved data without loading it', async () => {
    const f = fixture();
    await expect(f.store.resetApp()).rejects.toThrow('not ready');
    f.storage.load = async () => {
      throw new Error('Corrupt data');
    };
    await f.store.load();
    expect(f.store.getSnapshot().status).toBe('load-error');
    await f.store.resetApp();
    expect(f.store.getSnapshot()).toMatchObject({
      data: defaultAppData(),
      status: 'ready',
      resetVersion: 1,
    });
  });

  test('gates edits while loading and deduplicates loading', async () => {
    const gate = Promise.withResolvers<AppData>();
    let loads = 0;
    const store = createAppDataStore(
      {
        load: () => {
          loads++;
          return gate.promise;
        },
        async clear() {},
        async save() {},
      },
      {
        async confirmStatusChange() {
          return true;
        },
      },
    );
    const first = store.load();
    const second = store.load();
    expect(loads).toBe(1);
    expect(await store.setStatus(['ca'], 'visited')).toBe(false);
    expect(await store.setStatus([regionOne], 'visited')).toBe(
      false,
    );
    expect(store.createList('Blocked')).toBeNull();
    expect(store.renameList('missing', 'Blocked')).toBe(false);
    expect(store.setListPlaces('missing', ['ca'])).toBe(false);
    expect(store.toggleListPlace('missing', 'ca')).toBe(false);
    expect(store.deleteList('missing')).toBe(false);
    store.setHome('ca');
    store.updatePreferences({ haptics: false });
    expect(store.getSnapshot().data).toEqual(defaultAppData());
    gate.resolve(defaultAppData());
    await Promise.all([first, second]);
    expect(store.getSnapshot().status).toBe('ready');
  });

  test('lists retain country and region membership independently from travel statuses', async () => {
    const { store, storage } = fixture();
    await store.load();
    store.setHome('ca');
    await store.setStatus([regionOne], 'lived');
    const original = store.getSnapshot().data;
    const input = ['ca', regionOne, 'ca'];
    const id = store.createList('  Next trip  ', input)!;
    input.push('fr');
    expect(store.getSnapshot().data.lists).toEqual([
      { id, name: 'Next trip', placeIds: ['ca', regionOne] },
    ]);
    expect(store.getSnapshot().data.places).toBe(original.places);
    const secondId = store.createList('Next trip')!;
    expect(secondId).not.toBe(id);
    expect(store.renameList(id, '  Summer  ')).toBe(true);
    const nextMembers = ['fr', regionTwo];
    expect(store.setListPlaces(id, nextMembers)).toBe(true);
    nextMembers.push('jp');
    expect(store.getSnapshot().data.lists).toEqual([
      { id, name: 'Summer', placeIds: ['fr', regionTwo] },
      { id: secondId, name: 'Next trip', placeIds: [] },
    ]);
    expect(store.getSnapshot().data.places).toBe(original.places);
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    await settle(storage);
    expect(await storage.load()).toEqual(store.getSnapshot().data);
  });

  test('list edits validate atomically and stale actions or no-ops preserve state', async () => {
    const { store, storage } = fixture();
    await store.load();
    const id = store.createList('Next trip', ['ca', regionOne])!;
    await settle(storage);
    const before = store.getSnapshot();
    expect(store.renameList(id, ' Next trip ')).toBe(true);
    expect(store.setListPlaces(id, ['ca', regionOne, 'ca'])).toBe(true);
    expect(store.renameList('missing', '')).toBe(false);
    expect(store.setListPlaces('missing', ['unknown'])).toBe(false);
    expect(store.deleteList('missing')).toBe(false);
    const invalidName = t('common.errors.invalidListName', { count: MAX_LIST_NAME_LENGTH });
    for (const name of [
      '',
      '   ',
      'Two\nlines',
      'x'.repeat(MAX_LIST_NAME_LENGTH + 1),
    ]) {
      expect(() => store.createList(name)).toThrow(invalidName);
      expect(() => store.renameList(id, name)).toThrow(invalidName);
    }
    expect(() => store.createList('Invalid', ['ca', 'unknown'])).toThrow(
      'unknown',
    );
    expect(() => store.setListPlaces(id, ['fr', 'unknown'])).toThrow('unknown');
    expect(store.getSnapshot()).toBe(before);
    expect(await storage.load()).toEqual(before.data);
    store.deleteList(id);
    const deleted = store.getSnapshot();
    expect(store.renameList(id, 'Stale')).toBe(false);
    expect(store.setListPlaces(id, ['ca'])).toBe(false);
    expect(store.getSnapshot()).toBe(deleted);
  });

  test('list save failures keep optimistic data and retry persists the latest list', async () => {
    const f = fixture();
    await f.store.load();
    f.failWrites(true);
    const id = f.store.createList('Next trip', ['ca'])!;
    await settle(f.storage);
    expect(f.store.getSnapshot().saveError).toBe(true);
    expect(f.store.getSnapshot().data.lists[0].id).toBe(id);
    f.store.setListPlaces(id, [regionOne, 'fr']);
    await settle(f.storage);
    f.failWrites(false);
    f.store.retry();
    await settle(f.storage);
    expect(f.store.getSnapshot().saveError).toBe(false);
    expect((await f.storage.load()).lists).toEqual([
      { id, name: 'Next trip', placeIds: [regionOne, 'fr'] },
    ]);
  });

  test('only notifies subscribers when saves change the error state', async () => {
    const f = fixture();
    await f.store.load();
    let notifications = 0;
    f.store.subscribe(() => notifications++);

    await f.store.setStatus(['ca'], 'visited');
    await settle(f.storage);
    expect(notifications).toBe(1);
    f.store.updatePreferences({ mapView: 'globe' });
    expect(notifications).toBe(1);

    f.failWrites(true);
    f.store.retry();
    await settle(f.storage);
    expect(notifications).toBe(2);
    expect(f.store.getSnapshot().saveError).toBe(true);
    f.store.retry();
    await settle(f.storage);
    expect(notifications).toBe(2);

    f.failWrites(false);
    f.store.retry();
    await settle(f.storage);
    expect(notifications).toBe(3);
    expect(f.store.getSnapshot().saveError).toBe(false);
  });

  test('home downgrade requires confirmation and cancelling leaves all state unchanged', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    const prior = f.store.getSnapshot().data;
    f.confirmHome(false);
    expect(await f.store.setStatus(['ca', 'fr'], 'wishlist')).toBe(false);
    expect(f.store.getSnapshot().data).toBe(prior);
    f.confirmHome(true);
    expect(
      await f.store.setStatus(['ca'], 'visited', { preserveLived: false }),
    ).toBe(true);
    expect(f.store.getSnapshot().data).toMatchObject({
      homeCountryId: null,
      places: { ca: 'visited' },
    });
    expect(f.confirmations()).toBe(2);
    expect(f.store.getSnapshot().data.homeCountryId).toBeNull();
  });

  test('confirmation locks concurrent writes and default mark-visited skips confirmation', async () => {
    const confirmation = Promise.withResolvers<boolean>();
    const f = fixture();
    const store = createAppDataStore(f.storage, {
      confirmStatusChange: () => confirmation.promise,
    });
    await store.load();
    store.setHome('ca');
    expect(await store.setStatus(['ca'], 'visited')).toBe(true);
    const change = store.setStatus(['ca'], 'unvisited');
    expect(store.getSnapshot().busy).toBe(true);
    store.setHome('fr');
    store.updatePreferences({ haptics: false });
    expect(await store.setStatus(['fr'], 'visited')).toBe(false);
    await expect(store.resetApp()).rejects.toThrow('not ready');
    confirmation.resolve(true);
    expect(await change).toBe(true);
    expect(store.getSnapshot().data).toEqual(defaultAppData());
  });

  test('an expired status action cannot prompt or change data, or persistence', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    await settle(f.storage);
    const before = f.store.getSnapshot();
    const writes = f.writes();
    for (const ids of [['ca'], ['fr']]) {
      expect(await f.store.setStatus(ids, 'wishlist', { isCurrent: () => false })).toBe(false);
      expect(f.store.getSnapshot()).toBe(before);
    }
    await settle(f.storage);
    expect(f.confirmations()).toBe(0);
    expect(f.writes()).toBe(writes);
    expect(await f.storage.load()).toEqual(before.data);
  });

  test('a stale home confirmation releases its lock without writing and a new action can proceed', async () => {
    const f = fixture();
    const confirmation = Promise.withResolvers<boolean>();
    const store = createAppDataStore(f.storage, { confirmStatusChange: () => confirmation.promise });
    await store.load();
    store.setHome('ca');
    await settle(f.storage);
    const before = store.getSnapshot();
    const writes = f.writes();
    let current = true;
    const changing = store.setStatus(['ca', 'fr'], 'wishlist', { isCurrent: () => current });
    expect(store.getSnapshot().busy).toBe(true);
    current = false;
    confirmation.resolve(true);
    expect(await changing).toBe(false);
    expect(store.getSnapshot()).toEqual(before);
    await settle(f.storage);
    expect(f.writes()).toBe(writes);
    expect(await f.storage.load()).toEqual(before.data);
    expect(await store.setStatus(['ca'], 'unvisited', { isCurrent: () => true })).toBe(true);
    await settle(f.storage);
    expect(await f.storage.load()).toEqual(defaultAppData());
  });

  test('failed home confirmation releases the write lock without losing data', async () => {
    const confirmation = Promise.withResolvers<boolean>();
    const f = fixture();
    const store = createAppDataStore(f.storage, {
      confirmStatusChange: () => confirmation.promise,
    });
    await store.load();
    store.setHome('ca');
    await settle(f.storage);
    const before = store.getSnapshot();
    const writes = f.writes();
    const change = store.setStatus(['ca'], 'visited', { preserveLived: false });
    expect(store.getSnapshot().busy).toBe(true);
    confirmation.reject(new Error('Confirmation failed'));
    await expect(change).rejects.toThrow('Confirmation failed');
    expect(store.getSnapshot()).toEqual(before);
    expect(f.writes()).toBe(writes);
    expect(await f.storage.load()).toEqual(before.data);
    expect(store.getSnapshot().data).toEqual(before.data);
  });

  test('restores atomically: publishes only after save; failure preserves live data', async () => {
    const f = fixture();
    await f.store.load();
    await f.store.setStatus(['ca'], 'visited');
    await settle(f.storage);
    const prior = f.store.getSnapshot();
    const started = Promise.withResolvers<void>();
    const gate = Promise.withResolvers<void>();
    const save = f.storage.save;
    f.storage.save = async (data) => {
      started.resolve();
      await gate.promise;
      await save(data);
    };
    f.failWrites(true);
    const restoring = f.store.restore(defaultAppData());
    await started.promise;
    expect(f.store.getSnapshot()).toEqual({ ...prior, busy: true });
    gate.resolve();
    await expect(restoring).rejects.toThrow('storage-write');
    expect(f.store.getSnapshot()).toEqual(prior);
    expect(await f.storage.load()).toEqual(prior.data);
    f.failWrites(false);
    await f.store.restore(defaultAppData());
    expect(f.store.getSnapshot().data).toEqual(defaultAppData());
  });

  test('restore waits for pending writes, gates edits, and cannot be overtaken', async () => {
    const gate = Promise.withResolvers<void>();
    const f = fixture();
    const save = f.storage.save;
    let writes = 0;
    f.storage.save = async (data) => {
      if (++writes === 1) await gate.promise;
      await save(data);
    };
    await f.store.load();
    await f.store.setStatus(['ca'], 'visited');
    const replacement = defaultAppData();
    replacement.places.fr = 'wishlist';
    replacement.places[regionOne] = 'lived';
    replacement.places.ca = 'lived';
    replacement.lists.push({
      id: 'list-restored',
      name: 'Restored',
      placeIds: ['fr', regionOne],
    });
    const restore = f.store.restore(replacement);
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(f.store.getSnapshot().data.places).toEqual({ ca: 'visited' });
    expect(await f.store.setStatus(['jp'], 'visited')).toBe(false);
    expect(await f.store.setStatus([regionTwo], 'visited')).toBe(
      false,
    );
    gate.resolve();
    await restore;
    expect(f.store.getSnapshot().data.places).toEqual(replacement.places);
    expect(await f.storage.load()).toEqual(replacement);
  });

  test('restore clones incoming data before awaiting storage without changing its source', async () => {
    const f = fixture();
    await f.store.load();
    await f.store.completeOnboarding(false);
    const replacement = defaultAppData();
    replacement.places.ca = 'visited';
    const restoring = f.store.restore(replacement);
    expect(replacement.onboardingCompleted).toBe(false);
    replacement.places.ca = 'wishlist';
    replacement.preferences.countryArrivalAlerts = true;
    await restoring;
    expect(f.store.getSnapshot().data).toMatchObject({
      onboardingCompleted: true,
      places: { ca: 'visited' },
      preferences: { countryArrivalAlerts: false },
    });
    expect(await f.storage.load()).toEqual(f.store.getSnapshot().data);
  });

  test('latest write controls errors; retry saves current state', async () => {
    const f = fixture();
    await f.store.load();
    f.failWrites(true);
    await f.store.setStatus(['ca'], 'visited');
    await settle(f.storage);
    expect(f.store.getSnapshot().saveError).toBe(true);
    f.failWrites(false);
    f.store.updatePreferences({ mapView: 'map' });
    await settle(f.storage);
    expect(f.store.getSnapshot().saveError).toBe(false);
    expect((await f.storage.load()).places.ca).toBe('visited');
    f.failWrites(true);
    await f.store.setStatus(['fr'], 'wishlist');
    await settle(f.storage);
    f.failWrites(false);
    f.store.retry();
    await settle(f.storage);
    expect(f.store.getSnapshot().saveError).toBe(false);
    expect(await f.storage.load()).toEqual(f.store.getSnapshot().data);
  });

  test.each(['success', 'failure'])(
    'stale saves cannot replace the latest %s',
    async (result) => {
      const latestFailed = result === 'failure';
      const first = Promise.withResolvers<void>();
      const second = Promise.withResolvers<void>();
      let writes = 0;
      const store = createAppDataStore(
        {
          async load() {
            return defaultAppData();
          },
          async clear() {},
          save: () => (++writes === 1 ? first.promise : second.promise),
        },
        {
          async confirmStatusChange() {
            return true;
          },
        },
      );
      await store.load();
      await store.setStatus(['ca'], 'visited');
      await store.setStatus(['fr'], 'wishlist');
      if (latestFailed) second.reject(new Error('The latest save failed'));
      else second.resolve();
      await second.promise.catch(() => undefined);
      if (latestFailed) first.resolve();
      else first.reject(new Error('An earlier save failed'));
      await first.promise.catch(() => undefined);
      expect(store.getSnapshot().saveError).toBe(latestFailed);
      expect(store.getSnapshot().data.places).toEqual({
        ca: 'visited',
        fr: 'wishlist',
      });
    },
  );

  test('failed replacement preserves an earlier unsaved-change warning', async () => {
    const f = fixture();
    await f.store.load();
    f.failWrites(true);
    await f.store.setStatus(['ca'], 'visited');
    const replacement = f.store.restore(defaultAppData());
    await expect(replacement).rejects.toThrow('storage-write');
    expect(f.store.getSnapshot().saveError).toBe(true);
    expect(f.store.getSnapshot().data.places.ca).toBe('visited');
  });

  test('clear travel and reset preferences preserve their separate domains ', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    await f.store.setStatus([regionOne], 'visited');
    const listId = f.store.createList('Next trip', ['ca'])!;
    f.store.updatePreferences({ haptics: false });
    await f.store.resetPreferences();
    expect(f.store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(f.store.getSnapshot().data.places).toEqual({
      ca: 'lived',
      [regionOne]: 'visited',
    });
    expect(f.store.getSnapshot().data.lists).toEqual([
      { id: listId, name: 'Next trip', placeIds: ['ca'] },
    ]);
    expect(f.store.getSnapshot().data.preferences).toEqual(
      defaultAppData().preferences,
    );
    f.store.updatePreferences({ mapView: 'map' });
    await f.store.clearTravel();
    expect(f.store.getSnapshot().data.places).toEqual({});
    expect(f.store.getSnapshot().data.lists).toEqual([]);
    expect(f.store.getSnapshot().data.homeCountryId).toBeNull();
    expect(f.store.getSnapshot().data.preferences.mapView).toBe('map');
  });

  test('load errors retain storage and support retry', async () => {
    const f = fixture();
    const read = f.storage.load;
    f.storage.load = async () => {
      throw new Error('Read failed');
    };
    await f.store.load();
    expect(f.store.getSnapshot().status).toBe('load-error');
    f.storage.load = read;
    f.store.retry();
    await f.store.load();
    expect(f.store.getSnapshot().status).toBe('ready');
  });

  test('restore can recover a failed load; a failed recovery leaves the error intact', async () => {
    const f = fixture();
    f.storage.load = async () => {
      throw new Error('Corrupt stored data');
    };
    await f.store.load();
    const replacement = defaultAppData();
    replacement.places.ca = 'lived';
    replacement.homeCountryId = 'ca';
    f.failWrites(true);
    await expect(f.store.restore(replacement)).rejects.toThrow('storage-write');
    expect(f.store.getSnapshot().status).toBe('load-error');
    expect(f.store.getSnapshot().data).toEqual(defaultAppData());
    await expect(f.store.clearTravel()).rejects.toThrow('not ready');
    f.failWrites(false);
    await f.store.restore(replacement);
    expect(f.store.getSnapshot().status).toBe('ready');
    expect(f.store.getSnapshot().data).toEqual(replacement);
  });

  test('retry cannot reload data while a backup is replacing a failed load', async () => {
    const write = Promise.withResolvers<void>();
    let reads = 0;
    const store = createAppDataStore(
      {
        async load() {
          if (++reads === 1) throw new Error('Corrupt stored data');
          return defaultAppData();
        },
        async clear() {},
        save: () => write.promise,
      },
      { confirmStatusChange: async () => true },
    );
    await store.load();
    const replacement = defaultAppData();
    replacement.places.ca = 'visited';
    const restoring = store.restore(replacement);
    store.retry();
    await store.load();
    expect(reads).toBe(1);
    expect(store.getSnapshot().status).toBe('load-error');
    write.resolve();
    await restoring;
    expect(store.getSnapshot().status).toBe('ready');
    expect(store.getSnapshot().data).toEqual(replacement);
  });
});

test('preference reset only publishes success after persistence and retains unsaved warnings on failure', async () => {
  const f = fixture();
  await f.store.load();
  f.store.updatePreferences({ haptics: false });
  await settle(f.storage);
  const before = f.store.getSnapshot().data;
  f.failWrites(true);
  await expect(f.store.resetPreferences()).rejects.toThrow('storage-write');
  expect(f.store.getSnapshot()).toMatchObject({ data: before, busy: false });
  expect((await f.storage.load()).preferences.haptics).toBe(false);
  f.failWrites(false);
  await f.store.resetPreferences();
  expect((await f.storage.load()).preferences.haptics).toBe(true);
});

test('reset removes every owned database key', async () => {
  const f = fixture();
  await f.store.load();
  await f.store.setStatus(['ca'], 'visited');
  await f.storage.setItem('country-arrivals', '{}');
  await f.store.resetApp();
  expect(await f.storage.getItem('country-arrivals')).toBeNull();
  expect(await f.storage.readRaw()).toBeNull();
});

test('recovery blocks edits, including an already-open home confirmation, but permits explicit restore', async () => {
  const f = fixture();
  const confirmation = Promise.withResolvers<boolean>();
  const store = createAppDataStore(f.storage, { confirmStatusChange: () => confirmation.promise });
  await store.load();
  store.setHome('ca');
  const pending = store.setStatus(['ca'], 'unvisited');
  store.enterRecovery();
  confirmation.resolve(true);
  expect(await pending).toBe(false);
  expect(await store.setStatus(['fr'], 'visited')).toBe(false);
  store.updatePreferences({ haptics: false });
  expect(store.getSnapshot().data).toMatchObject({ homeCountryId: 'ca', preferences: { haptics: true } });
  await store.restore(defaultAppData());
  expect(store.getSnapshot().recovery).toBe(true);
  store.leaveRecovery();
  expect(await store.setStatus(['fr'], 'visited')).toBe(true);
});

describe('hierarchy edits', () => {
  test('city changes persist ancestors once and parent clearing combines home and descendants in one confirmation', async () => {
    const f = fixture();
    const confirmations: unknown[] = [];
    const store = createAppDataStore(f.storage, {
      confirmStatusChange: async (change) => { confirmations.push(change); return true; },
    });
    await store.load();
    store.setHome('ca');
    await store.setStatus(['city:6167865'], 'lived');
    const listId = store.createList('Cities', ['city:6167865'])!;
    await settle(f.storage);
    const writes = f.writes();
    expect(await store.setStatus(['ca'], 'wishlist')).toBe(true);
    await settle(f.storage);
    expect(confirmations).toEqual([{ descendants: 2, homeCountryId: 'ca', status: 'wishlist' }]);
    expect(f.writes()).toBe(writes + 1);
    expect(store.getSnapshot().data.places).toEqual({ ca: 'wishlist' });
    expect(store.getSnapshot().data.homeCountryId).toBeNull();
    expect(store.getSnapshot().data.lists).toEqual([{ id: listId, name: 'Cities', placeIds: ['city:6167865'] }]);
    expect(await f.storage.load()).toEqual(store.getSnapshot().data);
  });

  test('cancelled or stale descendant confirmation applies no part of a bulk change', async () => {
    for (const cancelled of [false, true]) {
      const f = fixture();
      const gate = Promise.withResolvers<boolean>();
      const store = createAppDataStore(f.storage, { confirmStatusChange: () => gate.promise });
      await store.load();
      await store.setStatus(['city:6167865'], 'lived');
      await settle(f.storage);
      const before = store.getSnapshot();
      const writes = f.writes();
      let current = true;
      const changing = store.setStatus(['ca', 'fr'], 'visited', { preserveLived: false, isCurrent: () => current });
      expect(store.getSnapshot().busy).toBe(true);
      expect(await store.setStatus(['jp'], 'wishlist')).toBe(false);
      if (!cancelled) current = false;
      gate.resolve(!cancelled);
      expect(await changing).toBe(false);
      expect(store.getSnapshot()).toEqual(before);
      await settle(f.storage);
      expect(f.writes()).toBe(writes);
    }
  });

  test('unknown city and region IDs reject an entire change before confirmation or persistence', async () => {
    const f = fixture();
    await f.store.load();
    await f.store.setStatus(['city:6167865'], 'visited');
    await settle(f.storage);
    const before = f.store.getSnapshot();
    const writes = f.writes();
    for (const unknown of ['city:999999999', 'ne:0', 'unknown']) {
      await expect(f.store.setStatus(['ca', unknown], 'unvisited')).rejects.toThrow('Unknown place');
      expect(f.store.getSnapshot()).toBe(before);
    }
    expect(f.confirmations()).toBe(0);
    expect(f.writes()).toBe(writes);
  });

  test('list edits persist directly and preference changes remain independent', async () => {
    const f = fixture();
    await f.store.load();
    const id = f.store.createList('Cities', ['city:6167865', 'ca'])!;
    f.store.updatePreferences({ haptics: false });
    expect(f.store.renameList(id, 'Canada')).toBe(true);
    expect(f.store.toggleListPlace(id, 'ca')).toBe(true);
    expect(f.store.getSnapshot().data.lists).toEqual([{ id, name: 'Canada', placeIds: ['city:6167865'] }]);
    expect(f.store.deleteList(id)).toBe(true);
    expect(f.store.getSnapshot().data.lists).toEqual([]);
    expect(f.store.getSnapshot().data.preferences.haptics).toBe(false);
    await settle(f.storage);
    expect(await f.storage.load()).toEqual(f.store.getSnapshot().data);
  });

});
