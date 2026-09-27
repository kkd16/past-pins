import { describe, expect, test } from 'bun:test';

import {
  defaultAppData,
  MAX_LIST_NAME_LENGTH,
  type AppData,
} from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { t } from '../src/localization';
import { subdivisionIds } from '../src/subdivisions/catalog';
import {
  createSnapshotStorage,
  type AppStorage,
} from '../src/storage/snapshot-storage';

const [regionOne, regionTwo, regionThree] = [...subdivisionIds];

function fixture() {
  let serialized: string | null = null;
  let writeFailure = false;
  let confirm = true;
  let confirmations = 0;
  let writes = 0;
  const feedback: boolean[] = [];
  const storage = createSnapshotStorage({
    async clear() {
      if (writeFailure) throw new Error('Write failed');
      serialized = null;
    },
    async getItem() {
      return serialized;
    },
    async setItem(_key, value) {
      writes++;
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
    const reopened = createAppDataStore(f.storage, { confirmHomeChange: async () => true });
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
    await expect(f.store.completeOnboarding(alerts)).rejects.toThrow('Write failed');
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
    f.store.undo(f.store.getSnapshot().pendingUndo!.id);
    expect(f.store.getSnapshot().data.onboardingCompleted).toBe(true);
    f.store.resetPreferences();
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

  test('complete reset waits for writes, blocks edits, clears Undo and starts fresh', async () => {
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
    await f.store.setSubdivisionStatus([regionOne], 'visited');
    f.store.updatePreferences({ mapView: 'map', haptics: false });
    const undo = f.store.getSnapshot().pendingUndo!;
    const resetting = f.store.resetApp();
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(await f.store.setStatus(['fr'], 'visited')).toBe(false);
    expect(await f.store.setSubdivisionStatus([regionTwo], 'visited')).toBe(
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
      pendingUndo: null,
      resetVersion: 1,
    });
    expect(f.store.undo(undo.id)).toBe(false);
    expect(await f.storage.load()).toEqual(defaultAppData());
    f.store.setHome('jp');
    await settle(f.storage);
    expect((await f.storage.load()).homeCountryId).toBe('jp');
  });

  test('failed reset retains live data and Undo, and can be retried', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    await settle(f.storage);
    const before = f.store.getSnapshot();
    f.failWrites(true);
    await expect(f.store.resetApp()).rejects.toThrow('Write failed');
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
        async confirmHomeChange() {
          return true;
        },
      },
    );
    const first = store.load();
    const second = store.load();
    expect(loads).toBe(1);
    expect(await store.setStatus(['ca'], 'visited')).toBe(false);
    expect(await store.setSubdivisionStatus([regionOne], 'visited')).toBe(
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
    await store.setSubdivisionStatus([regionOne], 'lived');
    const original = store.getSnapshot().data;
    const input = ['ca', regionOne, 'ca'];
    const id = store.createList('  Next trip  ', input)!;
    input.push('fr');
    expect(store.getSnapshot().data.lists).toEqual([
      { id, name: 'Next trip', placeIds: ['ca', regionOne] },
    ]);
    expect(store.getSnapshot().data.places).toBe(original.places);
    expect(store.getSnapshot().data.subdivisions).toBe(original.subdivisions);
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
    expect(store.getSnapshot().data.subdivisions).toBe(original.subdivisions);
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    await settle(storage);
    expect(await storage.load()).toEqual(store.getSnapshot().data);
  });

  test('every list edit uses shared Undo and leaves preference changes intact', async () => {
    const { store, storage } = fixture();
    await store.load();
    const id = store.createList('Next trip', ['ca'])!;
    const createdUndo = store.getSnapshot().pendingUndo!;
    expect(createdUndo.label).toBe('List created');
    store.updatePreferences({ haptics: false });
    expect(store.undo(createdUndo.id)).toBe(true);
    expect(store.getSnapshot().data.lists).toEqual([]);
    expect(store.getSnapshot().data.preferences.haptics).toBe(false);
    const nextId = store.createList('Next trip', ['ca'])!;
    expect(nextId).not.toBe(id);
    store.renameList(nextId, 'Summer');
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.lists[0].name).toBe('Next trip');
    store.setListPlaces(nextId, ['fr', regionOne]);
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.lists[0].placeIds).toEqual(['ca']);
    expect(store.deleteList(nextId)).toBe(true);
    expect(store.getSnapshot().data.lists).toEqual([]);
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.lists).toEqual([
      { id: nextId, name: 'Next trip', placeIds: ['ca'] },
    ]);
    await store.setStatus(['ca'], 'visited');
    const statusUndo = store.getSnapshot().pendingUndo!;
    expect(store.undo(statusUndo.id)).toBe(true);
    expect(store.getSnapshot().data.lists[0].id).toBe(nextId);
    expect(store.getSnapshot().data.places).toEqual({});
    await settle(storage);
    expect(await storage.load()).toEqual(store.getSnapshot().data);
  });

  test('membership toggles use the latest list and Undo restores only the last change', async () => {
    const { store, storage } = fixture();
    await store.load();
    const id = store.createList('Next trip', ['ca', regionOne])!;
    expect(store.toggleListPlace(id, 'fr')).toBe(true);
    expect(store.toggleListPlace(id, regionOne)).toBe(true);
    expect(store.getSnapshot().data.lists[0].placeIds).toEqual(['ca', 'fr']);
    expect(store.toggleListPlace(id, 'fr')).toBe(true);
    expect(store.getSnapshot().data.lists[0].placeIds).toEqual(['ca']);
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.lists[0].placeIds).toEqual(['ca', 'fr']);
    const before = store.getSnapshot();
    expect(() => store.toggleListPlace(id, 'unknown')).toThrow('unknown');
    expect(store.toggleListPlace('missing', 'unknown')).toBe(false);
    expect(store.getSnapshot()).toBe(before);
    await settle(storage);
    expect(await storage.load()).toEqual(before.data);
  });

  test('list edits validate atomically and stale actions or no-ops preserve Undo', async () => {
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

  test('region changes persist, preserve country and home data, and undo with preferences intact', async () => {
    const { store, storage } = fixture();
    await store.load();
    store.setHome('ca');
    await store.setSubdivisionStatus([regionOne], 'lived');
    const initial = store.getSnapshot().data;
    await store.setSubdivisionStatus(
      [regionOne, regionTwo, regionThree],
      'visited',
    );
    expect(store.getSnapshot().data.subdivisions).toEqual({
      [regionOne]: 'lived',
      [regionTwo]: 'visited',
      [regionThree]: 'visited',
    });
    expect(store.getSnapshot().data.places).toBe(initial.places);
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    const undo = store.getSnapshot().pendingUndo!;
    expect(undo.label).toBe('Regions updated');
    store.updatePreferences({ haptics: false });
    expect(store.undo(undo.id)).toBe(true);
    expect(store.getSnapshot().data.subdivisions).toEqual({
      [regionOne]: 'lived',
    });
    expect(store.getSnapshot().data.places).toBe(initial.places);
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(store.getSnapshot().data.preferences.haptics).toBe(false);
    await settle(storage);
    expect(await storage.load()).toEqual(store.getSnapshot().data);
  });

  test('region no-ops preserve Undo and labels count changed unique regions', async () => {
    const { store } = fixture();
    await store.load();
    await store.setSubdivisionStatus([regionOne], 'lived');
    await store.setSubdivisionStatus(
      [regionOne, regionTwo, regionTwo],
      'visited',
    );
    const undo = store.getSnapshot().pendingUndo!;
    expect(undo.label).toBe('Region updated');
    await store.setSubdivisionStatus([regionOne, regionTwo], 'visited');
    expect(store.getSnapshot().pendingUndo).toBe(undo);
    await store.setSubdivisionStatus([regionOne], 'visited', {
      preserveLived: false,
    });
    expect(store.getSnapshot().data.subdivisions[regionOne]).toBe('visited');
    expect(store.undo(undo.id)).toBe(false);
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.subdivisions[regionOne]).toBe('lived');
  });

  test('country Undo preserves region progress and region IDs are validated atomically', async () => {
    const { store, storage } = fixture();
    await store.load();
    await store.setSubdivisionStatus([regionOne], 'wishlist');
    await store.setStatus(['ca'], 'visited');
    expect(store.undo(store.getSnapshot().pendingUndo!.id)).toBe(true);
    expect(store.getSnapshot().data.places).toEqual({});
    expect(store.getSnapshot().data.subdivisions).toEqual({
      [regionOne]: 'wishlist',
    });
    await settle(storage);
    const before = store.getSnapshot();
    await expect(
      store.setSubdivisionStatus([regionTwo, 'unknown'], 'visited'),
    ).rejects.toThrow('Unknown region');
    expect(store.getSnapshot()).toBe(before);
    expect(await storage.load()).toEqual(before.data);
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
    const pendingUndo = store.getSnapshot().pendingUndo!;
    store.updatePreferences({ mapView: 'map', haptics: false });
    expect(store.getSnapshot().pendingUndo).toBe(pendingUndo);
    expect(store.undo(pendingUndo.id)).toBe(true);
    expect(store.undo(pendingUndo.id)).toBe(false);
    expect(store.getSnapshot().data.places).toEqual({ ca: 'lived' });
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(store.getSnapshot().data.preferences.mapView).toBe('map');
    expect(store.getSnapshot().pendingUndo).toBeNull();
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
    const pendingUndo = store.getSnapshot().pendingUndo!;
    expect(pendingUndo.label).toBe('Place updated');
    await store.setStatus(['ca', 'fr', 'jp'], 'visited');
    expect(store.getSnapshot().pendingUndo).toBe(pendingUndo);
    store.undo(pendingUndo.id);
    expect(store.getSnapshot().data.places).toEqual({
      ca: 'lived',
      fr: 'visited',
    });
  });

  test('identical Undo labels have distinct IDs and reject stale actions or dismissal', async () => {
    const { store } = fixture();
    await store.load();
    await store.setStatus(['ca'], 'visited');
    const first = store.getSnapshot().pendingUndo!;
    await store.setStatus(['fr'], 'visited');
    const second = store.getSnapshot().pendingUndo!;
    expect(second.label).toBe(first.label);
    expect(second.id).not.toBe(first.id);
    const current = store.getSnapshot();
    expect(store.undo(first.id)).toBe(false);
    store.discardUndo(first.id);
    expect(store.getSnapshot()).toBe(current);
    expect(store.undo(second.id)).toBe(true);
    expect(store.getSnapshot().data.places).toEqual({ ca: 'visited' });
  });

  test('expiring Undo leaves saved data and feedback untouched', async () => {
    const f = fixture();
    await f.store.load();
    await f.store.setStatus(['ca'], 'visited');
    await settle(f.storage);
    const prior = f.store.getSnapshot();
    const writes = f.writes();
    f.store.discardUndo(prior.pendingUndo!.id);
    expect(f.store.getSnapshot()).toEqual({ ...prior, pendingUndo: null });
    expect(f.store.getSnapshot().data).toBe(prior.data);
    expect(f.store.undo(prior.pendingUndo!.id)).toBe(false);
    const expired = f.store.getSnapshot();
    f.store.discardUndo(prior.pendingUndo!.id);
    expect(f.store.getSnapshot()).toBe(expired);
    await settle(f.storage);
    expect(f.writes()).toBe(writes);
    expect(f.feedback).toEqual([true]);
    expect(await f.storage.load()).toEqual(prior.data);
  });

  test('Undo is blocked while busy but can expire before a new confirmed change', async () => {
    const confirmation = Promise.withResolvers<boolean>();
    const f = fixture();
    const store = createAppDataStore(f.storage, {
      confirmHomeChange: () => confirmation.promise,
    });
    await store.load();
    store.setHome('ca');
    const prior = store.getSnapshot();
    const changing = store.setStatus(['ca'], 'unvisited');
    expect(store.getSnapshot().busy).toBe(true);
    expect(store.undo(prior.pendingUndo!.id)).toBe(false);
    store.discardUndo(prior.pendingUndo!.id);
    expect(store.getSnapshot()).toEqual({
      ...prior,
      busy: true,
      pendingUndo: null,
    });
    confirmation.resolve(true);
    expect(await changing).toBe(true);
    const next = store.getSnapshot().pendingUndo!;
    expect(next.id).not.toBe(prior.pendingUndo!.id);
    expect(store.undo(prior.pendingUndo!.id)).toBe(false);
    expect(store.undo(next.id)).toBe(true);
    expect(store.getSnapshot().data.homeCountryId).toBe('ca');
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
    f.store.undo(f.store.getSnapshot().pendingUndo!.id);
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
    await expect(store.resetApp()).rejects.toThrow('not ready');
    confirmation.resolve(true);
    expect(await change).toBe(true);
    expect(store.getSnapshot().data).toEqual(defaultAppData());
  });

  test('failed home confirmation releases the write lock without losing data or Undo', async () => {
    const confirmation = Promise.withResolvers<boolean>();
    const f = fixture();
    const store = createAppDataStore(f.storage, {
      confirmHomeChange: () => confirmation.promise,
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
    expect(store.undo(before.pendingUndo!.id)).toBe(true);
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
    expect(f.store.getSnapshot().pendingUndo).toBeNull();
    expect(f.store.undo(prior.pendingUndo!.id)).toBe(false);
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
    replacement.subdivisions[regionOne] = 'lived';
    replacement.lists.push({
      id: 'list-restored',
      name: 'Restored',
      placeIds: ['fr', regionOne],
    });
    const restore = f.store.restore(replacement);
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(f.store.getSnapshot().data.places).toEqual({ ca: 'visited' });
    expect(await f.store.setStatus(['jp'], 'visited')).toBe(false);
    expect(await f.store.setSubdivisionStatus([regionTwo], 'visited')).toBe(
      false,
    );
    gate.resolve();
    await restore;
    expect(f.store.getSnapshot().data.places).toEqual({ fr: 'wishlist' });
    expect(await f.storage.load()).toEqual(replacement);
  });

  test('restore copies incoming data before awaiting storage without changing its source', async () => {
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
    expect(f.store.getSnapshot().pendingUndo).not.toBeNull();
  });

  test('clear travel and reset preferences preserve their separate domains and clear Undo', async () => {
    const f = fixture();
    await f.store.load();
    f.store.setHome('ca');
    await f.store.setSubdivisionStatus([regionOne], 'visited');
    const listId = f.store.createList('Next trip', ['ca'])!;
    f.store.updatePreferences({ haptics: false });
    f.store.resetPreferences();
    expect(f.store.getSnapshot().data.homeCountryId).toBe('ca');
    expect(f.store.getSnapshot().data.subdivisions).toEqual({
      [regionOne]: 'visited',
    });
    expect(f.store.getSnapshot().data.lists).toEqual([
      { id: listId, name: 'Next trip', placeIds: ['ca'] },
    ]);
    expect(f.store.getSnapshot().data.preferences).toEqual(
      defaultAppData().preferences,
    );
    expect(f.store.getSnapshot().pendingUndo).toBeNull();
    f.store.updatePreferences({ mapView: 'map' });
    await f.store.clearTravel();
    expect(f.store.getSnapshot().data.places).toEqual({});
    expect(f.store.getSnapshot().data.subdivisions).toEqual({});
    expect(f.store.getSnapshot().data.lists).toEqual([]);
    expect(f.store.getSnapshot().data.homeCountryId).toBeNull();
    expect(f.store.getSnapshot().data.preferences.mapView).toBe('map');
    expect(f.store.getSnapshot().pendingUndo).toBeNull();
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
        async clear() {},
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
