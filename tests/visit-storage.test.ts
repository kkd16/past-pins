import { describe, expect, test } from 'bun:test';

import {
  createVisitStorage,
  decodeVisits,
  InvalidVisitsError,
  visitsKey,
} from '../src/features/countries/visit-storage';

const ids = new Set(['ca', 'fr', 'jp']);

describe('saved visits', () => {
  test('starts empty and restores saved IDs', () => {
    expect(decodeVisits(null, ids).size).toBe(0);
    expect(decodeVisits('{"version":1,"visitedIds":["ca","jp"]}', ids)).toEqual(
      new Set(['ca', 'jp']),
    );
  });

  test('rejects unreadable, unknown, and duplicate data instead of erasing it', () => {
    for (const value of [
      'not JSON',
      '{}',
      '{"version":2,"visitedIds":[]}',
      '{"version":1,"visitedIds":["xx"]}',
      '{"version":1,"visitedIds":["ca","ca"]}',
    ]) {
      expect(() => decodeVisits(value, ids)).toThrow(InvalidVisitsError);
    }
  });

  test('serializes rapid changes and persists a snapshot, including unchecking', async () => {
    const writes: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const storage = createVisitStorage(
      {
        getItem: async () => null,
        setItem: async (key, value) => {
          expect(key).toBe(visitsKey);
          if (!writes.length) await gate;
          writes.push(value);
        },
      },
      ids,
    );
    const selection = new Set(['ca']);
    const first = storage.save(selection);
    selection.add('fr');
    const second = storage.save(selection);
    selection.delete('ca');
    const third = storage.save(selection);
    expect(writes).toHaveLength(0);
    release();
    await Promise.all([first, second, third]);
    expect(writes.map((value) => JSON.parse(value).visitedIds)).toEqual([
      ['ca'],
      ['ca', 'fr'],
      ['fr'],
    ]);
  });

  test('exposes failures and lets the next save retry the latest selection', async () => {
    let attempts = 0;
    let saved: string | null = null;
    const storage = createVisitStorage(
      {
        getItem: async () => saved,
        setItem: async (_, value) => {
          if (++attempts === 1) throw new Error('Storage unavailable');
          saved = value;
        },
      },
      ids,
    );
    await expect(storage.save(new Set(['ca']))).rejects.toThrow(
      'Storage unavailable',
    );
    await storage.save(new Set(['ca', 'fr']));
    expect(await storage.load()).toEqual(new Set(['ca', 'fr']));
  });
});
