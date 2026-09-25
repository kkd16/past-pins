import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';

import { defaultAppData, type AppData } from '../src/data/model';
import { subdivisionIds } from '../src/subdivisions/catalog';
import {
  createSnapshotStorage,
  type KeyValueStorage,
} from '../src/storage/snapshot-storage';

const databases: Database[] = [];
afterEach(() => {
  databases.splice(0).forEach((database) => database.close());
});

function fixture() {
  const database = new Database(':memory:');
  databases.push(database);
  database.exec(
    'CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
  );
  const keyValue: KeyValueStorage = {
    async clear() {
      database.exec('DELETE FROM kv');
    },
    async getItem(key) {
      return (
        database
          .query<{ value: string }, [string]>(
            'SELECT value FROM kv WHERE key = ?',
          )
          .get(key)?.value ?? null
      );
    },
    async setItem(key, value) {
      database
        .query(
          'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(key, value);
    },
  };
  return { database, keyValue, storage: createSnapshotStorage(keyValue) };
}

describe('atomic snapshot storage', () => {
  test('reset waits for queued saves and removes every key, including corrupt data', async () => {
    const { storage, keyValue, database } = fixture();
    await keyValue.setItem('old-setting', 'legacy');
    const save = storage.save(defaultAppData());
    const clear = storage.clear();
    await Promise.all([save, clear]);
    expect(database.query('SELECT COUNT(*) AS count FROM kv').get()).toEqual({
      count: 0,
    });
    expect(await storage.load()).toEqual(defaultAppData());
    await keyValue.setItem('app-data', '{broken');
    await storage.clear();
    expect(await createSnapshotStorage(keyValue).load()).toEqual(
      defaultAppData(),
    );
  });

  test('failed reset preserves stored data and does not poison later operations', async () => {
    const { storage, database } = fixture();
    const data = defaultAppData();
    data.places.ca = 'visited';
    await storage.save(data);
    database.exec(
      "CREATE TRIGGER fail_delete BEFORE DELETE ON kv BEGIN SELECT RAISE(ABORT, 'delete failed'); END",
    );
    await expect(storage.clear()).rejects.toThrow('delete failed');
    expect(await storage.load()).toEqual(data);
    database.exec('DROP TRIGGER fail_delete');
    await storage.clear();
    expect(await storage.load()).toEqual(defaultAppData());
    data.places.fr = 'wishlist';
    await storage.save(data);
    expect(await storage.load()).toEqual(data);
  });

  test('starts fresh and stores travel plus preferences in one record', async () => {
    const { database, storage, keyValue } = fixture();
    expect(await storage.load()).toEqual(defaultAppData());
    const data = defaultAppData();
    data.places.ca = 'lived';
    data.homeCountryId = 'ca';
    data.subdivisions[[...subdivisionIds][0]] = 'visited';
    data.lists.push({
      id: 'list-one',
      name: 'Next trip',
      placeIds: ['ca', [...subdivisionIds][0]],
    });
    data.preferences.mapView = 'map';
    await storage.save(data);
    expect(await createSnapshotStorage(keyValue).load()).toEqual(data);
    expect(database.query('SELECT COUNT(*) AS count FROM kv').get()).toEqual({
      count: 1,
    });
  });

  test('rejects country-only snapshots without silently resetting them', async () => {
    const { storage, keyValue } = fixture();
    const legacy: Omit<AppData, 'subdivisions' | 'lists'> = {
      onboardingCompleted: false,
      places: { ca: 'lived', fr: 'wishlist' },
      homeCountryId: 'ca',
      preferences: { ...defaultAppData().preferences, haptics: false },
    };
    const original = JSON.stringify(legacy);
    await keyValue.setItem('app-data', original);
    await expect(storage.load()).rejects.toThrow();
    expect(await keyValue.getItem('app-data')).toBe(original);
    await storage.clear();
    expect(await storage.load()).toEqual(defaultAppData());
  });

  test('rejects snapshots without lists and preserves the stored record until reset', async () => {
    const { storage, keyValue } = fixture();
    const { lists: _lists, ...data } = defaultAppData();
    const original = JSON.stringify(data);
    await keyValue.setItem('app-data', original);
    await expect(storage.load()).rejects.toThrow();
    expect(await keyValue.getItem('app-data')).toBe(original);
  });

  test('rejects malformed snapshots without overwriting them', async () => {
    const { storage, keyValue } = fixture();
    const data = defaultAppData();
    data.places.ca = 'lived';
    data.homeCountryId = 'ca';
    for (const invalid of [
      { ...data, extra: true },
      { ...data, preferences: {} },
      { ...data, places: { ca: 'visited' } },
      { ...data, subdivisions: null },
      { ...data, subdivisions: { unknown: 'visited' } },
      { ...data, lists: null },
    ]) {
      const original = JSON.stringify(invalid);
      await keyValue.setItem('app-data', original);
      await expect(storage.load()).rejects.toThrow();
      expect(await keyValue.getItem('app-data')).toBe(original);
    }
  });

  test('serializes saves and reads, snapshotting data before queueing', async () => {
    const { keyValue } = fixture();
    const gate = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    const write = keyValue.setItem;
    let calls = 0;
    keyValue.setItem = async (key, value) => {
      if (++calls === 1) {
        started.resolve();
        await gate.promise;
      }
      await write(key, value);
    };
    const storage = createSnapshotStorage(keyValue);
    const data = defaultAppData();
    data.places.ca = 'visited';
    data.lists.push({ id: 'list-one', name: 'Next trip', placeIds: ['ca'] });
    const first = storage.save(data);
    const firstRead = storage.load();
    data.places.fr = 'wishlist';
    data.lists[0].placeIds.push('fr');
    const second = storage.save(data);
    const secondRead = storage.load();
    delete data.places.ca;
    data.lists[0].name = 'Later edit';
    await started.promise;
    expect(calls).toBe(1);
    gate.resolve();
    await Promise.all([first, second]);
    expect((await firstRead).places).toEqual({ ca: 'visited' });
    expect((await firstRead).lists).toEqual([
      { id: 'list-one', name: 'Next trip', placeIds: ['ca'] },
    ]);
    expect((await secondRead).lists).toEqual([
      { id: 'list-one', name: 'Next trip', placeIds: ['ca', 'fr'] },
    ]);
    expect((await secondRead).places).toEqual({
      ca: 'visited',
      fr: 'wishlist',
    });
  });

  test('failed writes preserve the prior entire snapshot and permit retry', async () => {
    const { database, storage } = fixture();
    const initial = defaultAppData();
    initial.places.ca = 'visited';
    await storage.save(initial);
    database.exec(
      "CREATE TRIGGER fail_update BEFORE UPDATE ON kv BEGIN SELECT RAISE(ABORT, 'write failed'); END",
    );
    const replacement = defaultAppData();
    replacement.preferences.haptics = false;
    await expect(storage.save(replacement)).rejects.toThrow('write failed');
    expect(await storage.load()).toEqual(initial);
    database.exec('DROP TRIGGER fail_update');
    await storage.save(replacement);
    expect(await storage.load()).toEqual(replacement);
  });

  test('invalid saves cannot replace existing state and do not poison the queue', async () => {
    const { storage } = fixture();
    const initial = defaultAppData();
    initial.places.fr = 'wishlist';
    initial.preferences.haptics = false;
    await storage.save(initial);
    await expect(
      storage.save({ ...defaultAppData(), homeCountryId: 'ca' }),
    ).rejects.toThrow();
    expect(await storage.load()).toEqual(initial);
    await storage.save(defaultAppData());
    expect(await storage.load()).toEqual(defaultAppData());
  });

  test('corrupt reads fail without rewriting data and can be retried', async () => {
    const { storage, keyValue } = fixture();
    await keyValue.setItem('app-data', '{broken');
    await expect(storage.load()).rejects.toThrow();
    expect(await keyValue.getItem('app-data')).toBe('{broken');
    await keyValue.setItem('app-data', JSON.stringify(defaultAppData()));
    expect(await storage.load()).toEqual(defaultAppData());
  });
});
