import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { defaultAppData } from '../src/data/model';
import { createAppDataStore } from '../src/data/store';
import { encodeDocument } from '../src/data/document';
import { createDocumentStorage } from '../src/storage/document-storage';
import { createArrivalTracker, parseArrival, type Arrival, type ArrivalLocation } from '../src/location/arrivals';

const day = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 8, 25);
let now = start;
let clock: ReturnType<typeof spyOn>;
beforeEach(() => {
  now = start;
  clock = spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => clock.mockRestore());

function fix(country: 'ca' | 'fr' | 'jp' | 'ocean', timestamp = now): ArrivalLocation {
  const points = { ca: [-75.69, 45.42], fr: [2.35, 48.86], jp: [139.69, 35.68], ocean: [-30, 0] };
  const [longitude, latitude] = points[country];
  return { timestamp, coords: { longitude, latitude } };
}

async function fixture() {
  const values = new Map<string, string>();
  const getItem = mock(async (key: string) => values.get(key) ?? null);
  const setItem = mock(async (key: string, value: string) => { values.set(key, value); });
  const storage = createDocumentStorage({ getItem, setItem, clear: async () => { values.clear(); } });
  const app = createAppDataStore(storage, { confirmStatusChange: async () => true });
  await app.load();
  await app.completeOnboarding(true);
  await storage.load();
  const send = mock(async (_arrival: Arrival): Promise<string | null> => 'native-notification');
  const remove = mock(async (_id: string) => {});
  const makeTracker = () => createArrivalTracker(storage, app.getSnapshot, { send, remove });
  return { values, app, storage, getItem, setItem, send, remove, tracker: makeTracker(), makeTracker };
}

describe('country arrivals', () => {
  test('first detection sends one reminder without editing travel data', async () => {
    const f = await fixture();
    await f.tracker.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledWith({ countryId: 'ca', notifiedAt: start });
    expect(f.app.getSnapshot().data.places).toEqual({});
    now += 8 * day;
    await f.tracker.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(encodeDocument(f.app.getSnapshot().data)).not.toContain('notifiedAt');
    expect(f.values.get('country-arrivals')).not.toContain('longitude');
  });

  test.each(['visited', 'lived', 'wishlist'] as const)('respects %s status and home', async (status) => {
    const f = await fixture();
    await f.app.setStatus(['ca'], status);
    await f.tracker.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(status === 'wishlist' ? 1 : 0);
    expect(f.app.getSnapshot().data.places.ca).toBe(status);
    f.app.setHome('fr');
    now++;
    await f.tracker.process([fix('fr')]);
    expect(f.send).toHaveBeenCalledTimes(status === 'wishlist' ? 1 : 0);
  });

  test('requires a later arrival and seven days, surviving a tracker restart', async () => {
    const f = await fixture();
    await f.app.setStatus(['fr'], 'visited');
    await f.tracker.process([fix('ca')]);
    now += day;
    await f.tracker.process([fix('fr')]);
    now += day;
    await f.tracker.process([fix('ca')]);
    now = start + 7 * day;
    const restarted = f.makeTracker();
    await restarted.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(1);
    now++;
    await restarted.process([fix('fr')]);
    now++;
    await restarted.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(2);
  });

  test('uses only the newest fix; ocean, invalid and older fixes do not invent arrivals', async () => {
    const f = await fixture();
    await f.tracker.process([fix('fr', now - 100), fix('ca'), fix('jp', now - 50)]);
    expect(f.send.mock.calls.map(([arrival]) => arrival.countryId)).toEqual(['ca']);
    now += 8 * day;
    await f.tracker.process([fix('ocean')]);
    await f.tracker.process([fix('jp', start + day)]);
    await f.tracker.process([{ timestamp: now, coords: { longitude: NaN, latitude: 200 } }]);
    await f.tracker.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(1);
  });

  test('serializes overlapping foreground and background observations', async () => {
    const f = await fixture();
    await Promise.all([f.tracker.process([fix('ca')]), f.tracker.process([fix('ca', now + 1)])]);
    expect(f.send).toHaveBeenCalledTimes(1);
  });

  test('failed scheduling or bookkeeping can retry without consuming the reminder', async () => {
    const f = await fixture();
    f.send.mockRejectedValueOnce(new Error('Schedule failed'));
    await expect(f.tracker.process([fix('ca')])).rejects.toThrow('Schedule failed');
    expect(f.values.has('country-arrivals')).toBe(false);
    f.setItem.mockRejectedValueOnce(new Error('Disk full'));
    await expect(f.tracker.process([fix('ca')])).rejects.toThrow('storage-write');
    expect(f.remove.mock.calls).toEqual([['native-notification']]);
    expect(f.values.has('country-arrivals')).toBe(false);
    await f.tracker.process([fix('ca')]);
    expect(await f.tracker.isCurrent({ countryId: 'ca', notifiedAt: start })).toBe(true);
  });

  test('an IO failure preserves reminder bookkeeping and sends nothing', async () => {
    const f = await fixture();
    f.values.set('country-arrivals', '{}');
    f.getItem.mockRejectedValueOnce(new Error('Read failed'));
    await expect(f.tracker.process([fix('ca')])).rejects.toThrow('storage-read');

    expect(f.send).not.toHaveBeenCalled();
    expect(f.values.get('country-arrivals')).toBe('{}');
  });

  test.each(['{}', '{broken', '{"schemaVersion":2}'])('corrupt metadata %s rebuilds without a duplicate reminder', async (text) => {
    const f = await fixture();
    f.values.set('country-arrivals', text);
    await f.tracker.process([fix('ocean')]);
    expect(f.values.get('country-arrivals')).toBe(text);
    await f.tracker.process([fix('ca')]);
    expect(f.send).not.toHaveBeenCalled();
    expect(JSON.parse(f.values.get('country-arrivals')!)).toEqual({
      schemaVersion: 1, countryId: 'ca', observedAt: now, notifiedAt: {},
    });
    now++;
    await f.makeTracker().process([fix('ca')]);
    expect(f.send).not.toHaveBeenCalled();
    now++;
    await f.tracker.process([fix('fr')]);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.send.mock.calls[0][0].countryId).toBe('fr');
  });

  test.each(['disable', 'reset', 'visit'] as const)('a pending send cannot survive %s', async (action) => {
    const f = await fixture();
    const sending = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    f.send.mockImplementationOnce(async () => {
      started.resolve();
      await sending.promise;
      return 'native-notification';
    });
    const checking = f.tracker.process([fix('ca')]);
    await started.promise;
    if (action === 'disable') f.app.updatePreferences({ countryArrivalAlerts: false });
    if (action === 'reset') await f.app.resetApp();
    if (action === 'visit') await f.app.setStatus(['ca'], 'visited');
    sending.resolve();
    await checking;
    expect(f.remove).toHaveBeenCalledTimes(1);
    expect(f.values.has('country-arrivals')).toBe(false);
  });

  test('turning off and resetting preferences stop checks; only full reset erases history', async () => {
    const f = await fixture();
    await f.tracker.process([fix('ca')]);
    const history = f.values.get('country-arrivals');
    await f.app.resetPreferences();
    now++;
    await f.tracker.process([fix('fr')]);
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(await f.tracker.isCurrent({ countryId: 'ca', notifiedAt: start })).toBe(false);
    await f.app.clearTravel();
    await f.app.restore(defaultAppData());
    expect(f.values.get('country-arrivals')).toBe(history);
    await f.app.resetApp();
    expect(f.values.has('country-arrivals')).toBe(false);
    await f.app.completeOnboarding(true);
    expect(await f.tracker.isCurrent({ countryId: 'ca', notifiedAt: start })).toBe(false);
  });

  test.each(['loading', 'load-error'] as const)('%s travel data cannot be treated as an empty visited list', async (status) => {
    const f = await fixture();
    const app = createAppDataStore({
      ...f.storage, load: async () => { throw new Error('Corrupt data'); },
    }, { confirmStatusChange: async () => true });
    if (status === 'load-error') await app.load();
    const tracker = createArrivalTracker(f.storage, app.getSnapshot, { send: f.send, remove: f.remove });
    await tracker.process([fix('ca')]);
    expect(f.send).not.toHaveBeenCalled();
  });

  test('a skipped native notification does not consume an arrival reminder', async () => {
    const f = await fixture();
    f.send.mockResolvedValueOnce(null);
    await f.tracker.process([fix('ca')]);
    expect(f.values.has('country-arrivals')).toBe(false);
    expect(f.remove).not.toHaveBeenCalled();
    await f.tracker.process([fix('ca')]);
    expect(f.send).toHaveBeenCalledTimes(2);
  });

  test('an unrelated preference edit during bookkeeping keeps its delivered reminder', async () => {
    const f = await fixture();
    const saved = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    f.setItem.mockImplementationOnce(async (key, value) => {
      f.values.set(key, value);
      saved.resolve();
      await finish.promise;
    });
    const checking = f.tracker.process([fix('ca')]);
    await saved.promise;
    f.app.updatePreferences({ haptics: false });
    finish.resolve();
    await checking;
    expect(f.send).toHaveBeenCalledTimes(1);
    expect(f.remove).not.toHaveBeenCalled();
    expect(await f.tracker.isCurrent({ countryId: 'ca', notifiedAt: start })).toBe(true);
  });

  test('accepts only recognized notification data', () => {
    expect(parseArrival({ type: 'country-arrival', countryId: 'ca', notifiedAt: start }))
      .toEqual({ countryId: 'ca', notifiedAt: start });
    for (const data of [undefined, {}, { type: 'other' },
      { type: 'country-arrival', countryId: 'zz', notifiedAt: start },
      { type: 'country-arrival', countryId: 'ca', notifiedAt: '123' },
    ]) expect(parseArrival(data)).toBeNull();
  });
});
