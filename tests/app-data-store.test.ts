import { describe, expect, test } from 'bun:test';

import { defaultAppData, type AppData } from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import {
  createSnapshotStorage,
  type AppStorage,
} from '../src/storage/snapshot-storage';

function fixture() {
  let serialized: string | null = null;
  let writeFailure = false;
  let confirm = true;
  let confirmations = 0;
  const feedback: boolean[] = [];
  const storage = createSnapshotStorage({
    async getItem() {
      return serialized;
    },
    async setItem(_key, value) {
      if (writeFailure) throw new Error('Write failed');
      serialized = value;
    },
  });
  const store = createAppDataStore(storage, {
    async confirmHomeChange() {
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
  };
}

async function settle(storage: AppStorage) {
  await storage.load();
  await Promise.resolve();
}

describe('app data owner', () => {
  test('gates edits while loading and deduplicates loading', async () => {
    const gate = Promise.withResolvers<AppData>();
    let loads = 0;
    const store = createAppDataStore(
      {
        load: () => {
          loads++;
          return gate.promise;
        },
        async save() {},
      },
      {
        async confirmHomeChange() {
          return true;
        },
      },
    );
    const first = store.load();
    const second = store.load();
    expect(loads).toBe(1);
    expect(await store.setStatus(['ca'], 'visited')).toBe(false);
    store.setHome('ca');
    store.updatePreferences({ haptics: false });
    expect(store.getSnapshot().data).toEqual(defaultAppData());
    gate.resolve(defaultAppData());
    await Promise.all([first, second]);
    expect(store.getSnapshot().status).toBe('ready');
  });

  test('bulk changes create a one-shot Undo that preserves subsequent preference edits', async () => {
    const { store, storage, feedback } = fixture();
    await store.load();
    store.setHome('ca');
    await store.setStatus(['ca', 'fr', 'jp'], 'visited');
    expect(store.getSnapshot().data.places).toEqual({
      ca: 'lived',
      fr: 'visited',
      jp: 'visited',
    });
    store.updatePreferences({ mapView: 'map', haptics: false });
    store.undo();
    store.undo();
    expect(store.getSnapshot().data.places).toEqual({ ca: 'lived' });
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(store.getSnapshot().data.preferences.mapView).toBe('map');
    expect(store.getSnapshot().undoLabel).toBeNull();
    expect(feedback).toEqual([true, true, false]);
    await settle(storage);
    expect(await storage.load()).toEqual(store.getSnapshot().data);
  });

  test('bulk Undo counts changed countries and survives no-op updates', async () => {
    const { store } = fixture();
    await store.load();
    store.setHome('ca');
    await store.setStatus(['fr'], 'visited');
    await store.setStatus(['ca', 'fr', 'jp', 'jp'], 'visited');
    expect(store.getSnapshot().undoLabel).toBe('Place updated');
    await store.setStatus(['ca', 'fr', 'jp'], 'visited');
    store.undo();
    expect(store.getSnapshot().data.places).toEqual({
      ca: 'lived',
      fr: 'visited',
    });
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
    f.store.undo();
    expect(f.store.getSnapshot().data.homeCountryId).toBe('ca');
  });

  test('confirmation locks concurrent writes and default mark-visited skips confirmation', async () => {
    const confirmation = Promise.withResolvers<boolean>();
    const f = fixture();
    const store = createAppDataStore(f.storage, {
      confirmHomeChange: () => confirmation.promise,
    });
    await store.load();
    store.setHome('ca');
    expect(await store.setStatus(['ca'], 'visited')).toBe(true);
    const change = store.setStatus(['ca'], 'unvisited');
    expect(store.getSnapshot().busy).toBe(true);
    store.setHome('fr');
    store.updatePreferences({ haptics: false });
    expect(await store.setStatus(['fr'], 'visited')).toBe(false);
    confirmation.resolve(true);
    expect(await change).toBe(true);
    expect(store.getSnapshot().data).toEqual(defaultAppData());
  });

  test('restores atomically: publishes only after save; failure preserves live data and Undo', async () => {
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
    await expect(restoring).rejects.toThrow('Write failed');
    expect(f.store.getSnapshot()).toEqual(prior);
    expect(await f.storage.load()).toEqual(prior.data);
    f.failWrites(false);
    await f.store.restore(defaultAppData());
    expect(f.store.getSnapshot().data).toEqual(defaultAppData());
    expect(f.store.getSnapshot().undoLabel).toBeNull();
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
    const restore = f.store.restore(replacement);
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(f.store.getSnapshot().data.places).toEqual({ ca: 'visited' });
    expect(await f.store.setStatus(['jp'], 'visited')).toBe(false);
    gate.resolve();
    await restore;
    expect(f.store.getSnapshot().data.places).toEqual({ fr: 'wishlist' });
    expect(await f.storage.load()).toEqual(replacement);
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
          save: () => (++writes === 1 ? first.promise : second.promise),
        },
        {
          async confirmHomeChange() {
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
    await expect(replacement).rejects.toThrow('Write failed');
    expect(f.store.getSnapshot().saveError).toBe(true);
    expect(f.store.getSnapshot().data.places.ca).toBe('visited');
    expect(f.store.getSnapshot().undoLabel).not.toBeNull();
  });

  test('clear travel and reset preferences preserve their separate domains and clear Undo', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    f.store.updatePreferences({ haptics: false });
    f.store.resetPreferences();
    expect(f.store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(f.store.getSnapshot().data.preferences).toEqual(
      defaultAppData().preferences,
    );
    expect(f.store.getSnapshot().undoLabel).toBeNull();
    f.store.updatePreferences({ mapView: 'map' });
    await f.store.clearTravel();
    expect(f.store.getSnapshot().data.places).toEqual({});
    expect(f.store.getSnapshot().data.homeCountryId).toBeNull();
    expect(f.store.getSnapshot().data.preferences.mapView).toBe('map');
    expect(f.store.getSnapshot().undoLabel).toBeNull();
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
    await expect(f.store.restore(replacement)).rejects.toThrow('Write failed');
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
        save: () => write.promise,
      },
      { confirmHomeChange: async () => true },
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
